import { query } from "./db";
import type {
  ASN,
  Dokumen,
  JenisAsn,
  SifatDokumen,
  ItemStatusArsip,
  DocumentRule,
  ChecklistItem,
  ChecklistSummary,
} from "./types";
import { JENIS_ASN_LIST } from "./types";

// ---------- jenis ASN ----------

export function resolveJenisAsn(
  asn: Pick<ASN, "jenis_asn" | "status" | "jabatan">
): JenisAsn {
  if (asn.jenis_asn && (JENIS_ASN_LIST as string[]).includes(asn.jenis_asn)) {
    return asn.jenis_asn;
  }
  if (asn.status === "PPPK") {
    const j = (asn.jabatan ?? "").toUpperCase();
    if (j.includes("TENAGA KEPENDIDIKAN")) return "PPPK_TENDIK";
    if (j.includes("GURU")) return "PPPK_GURU";
    return "PPPK_TENDIK";
  }
  return "PNS";
}

// ---------- kondisi profil ----------

const KONDISI_KEYS = [
  "menikah",
  "punya_anak",
  "sertifikat_pendidik",
  "jabatan_tambahan",
  "pernah_mutasi",
  "pernah_naik_pangkat",
  "pernah_diklat",
  "pernah_penghargaan",
  "pernah_hukdis",
  "mendekati_pensiun",
  "pernah_tugas_belajar",
  "pernah_cerai",
  "wajib_lhkpn",
] as const;

export type KondisiKey = (typeof KONDISI_KEYS)[number];

export function isKondisiKey(k: string | null | undefined): k is KondisiKey {
  return !!k && (KONDISI_KEYS as readonly string[]).includes(k);
}

export function evaluateCondition(kondisi: string | null, asn: ASN): boolean {
  if (!kondisi) return true;
  if (!isKondisiKey(kondisi)) return false;
  return Boolean((asn as unknown as Record<string, unknown>)[kondisi]);
}

export function conditionLabel(kondisi: string | null): string {
  switch (kondisi) {
    case "menikah": return "Jika menikah";
    case "punya_anak": return "Jika memiliki anak";
    case "sertifikat_pendidik": return "Jika memiliki sertifikat pendidik";
    case "jabatan_tambahan": return "Jika ada jabatan/tugas tambahan";
    case "pernah_mutasi": return "Jika pernah mutasi";
    case "pernah_naik_pangkat": return "Jika pernah naik pangkat";
    case "pernah_diklat": return "Jika pernah mengikuti diklat";
    case "pernah_penghargaan": return "Jika pernah mendapat penghargaan";
    case "pernah_hukdis": return "Jika pernah hukuman disiplin";
    case "mendekati_pensiun": return "Jika mendekati pensiun";
    case "pernah_tugas_belajar": return "Jika pernah tugas belajar";
    case "pernah_cerai": return "Jika pernah bercerai";
    case "wajib_lhkpn": return "Jika wajib LHKPN";
    default: return "";
  }
}

// ---------- rules cache ----------

interface CacheEntry {
  rules: DocumentRule[];
  at: number;
}
const rulesCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

export async function getRules(jenis: JenisAsn): Promise<DocumentRule[]> {
  const cached = rulesCache.get(jenis);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.rules;

  const rows = await query<DocumentRule>(
    `SELECT * FROM document_rules
     WHERE jenis_asn = $1 AND aktif = true
     ORDER BY urutan ASC, id ASC`,
    [jenis]
  );
  rulesCache.set(jenis, { rules: rows, at: Date.now() });
  return rows;
}

export function invalidateRulesCache() {
  rulesCache.clear();
}

// ---------- checklist ----------

function docExpired(doc: Pick<Dokumen, "tanggal_upload">, masaTahun: number | null): boolean {
  if (!masaTahun) return false;
  const t = new Date(doc.tanggal_upload).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t > masaTahun * 365.25 * 24 * 60 * 60 * 1000;
}

function statusForDoc(
  doc: Pick<Dokumen, "status" | "tanggal_upload">,
  masaTahun: number | null
): ItemStatusArsip {
  if (docExpired(doc, masaTahun)) return "PERLU DIPERBARUI";
  switch (doc.status) {
    case "TERVERIFIKASI": return "TERVERIFIKASI";
    case "DISETUJUI": return "SUDAH TERUPLOAD";
    case "DITOLAK": return "DITOLAK";
    default: return "MENUNGGU VERIFIKASI";
  }
}

/**
 * Susun checklist arsip untuk satu ASN berdasarkan rule engine.
 * Dokumen yang sudah terupload tetapi tidak masuk kategori manapun
 * otomatis dikelompokkan sebagai LAINNYA.
 */
export async function buildChecklist(
  asn: ASN,
  docs?: Pick<Dokumen, "id" | "jenis_dokumen_id" | "jenis_dokumen_kode" | "status" | "tanggal_upload" | "versi">[]
): Promise<{ items: ChecklistItem[]; summary: ChecklistSummary }> {
  const jenis = resolveJenisAsn(asn);
  const [rules, allDocs] = await Promise.all([
    getRules(jenis),
    docs
      ? Promise.resolve(docs)
      : query<Pick<Dokumen, "id" | "jenis_dokumen_id" | "jenis_dokumen_kode" | "status" | "tanggal_upload" | "versi">>(
          `SELECT id, jenis_dokumen_id, jenis_dokumen_kode, status, tanggal_upload, versi
           FROM dokumen WHERE nip = $1 AND is_latest = true`,
          [asn.nip]
        ),
  ]);

  // Peta dokumen terbaru per kode jenis dokumen
  const docByKode = new Map<string, (typeof allDocs)[number]>();
  for (const d of allDocs) {
    const prev = docByKode.get(d.jenis_dokumen_kode);
    if (!prev || new Date(d.tanggal_upload) > new Date(prev.tanggal_upload)) {
      docByKode.set(d.jenis_dokumen_kode, d);
    }
  }

  const items: ChecklistItem[] = [];
  const coveredIds = new Set<number>();
  let skippedKondisional = 0;

  for (const r of rules) {
    const doc = docByKode.get(r.jenis_dokumen_kode);
    let sifat: SifatDokumen = r.sifat;
    if (sifat === "KONDISIONAL" && !evaluateCondition(r.kondisi, asn)) {
      skippedKondisional++; // kondisi tidak terpenuhi → tidak relevan
      continue;
    }
    let status: ItemStatusArsip;
    if (!doc) {
      status = sifat === "OPSIONAL" ? "OPSIONAL" : "BELUM TERSEDIA";
    } else {
      status = statusForDoc(doc, r.masa_berlaku_tahun);
      coveredIds.add(doc.id);
    }
    items.push({
      jenis_dokumen_id: doc?.jenis_dokumen_id ?? 0,
      kode: r.jenis_dokumen_kode,
      nama: r.jenis_dokumen_kode,
      kategori: null,
      sifat,
      kondisi: r.kondisi,
      status,
      urutan: r.urutan,
      dokumen_id: doc?.id ?? null,
      versi: doc?.versi ?? null,
      tanggal_upload: doc?.tanggal_upload ?? null,
    });
  }

  // Dokumen terupload di luar kategori → LAINNYA
  for (const d of allDocs) {
    if (coveredIds.has(d.id)) continue;
    if (rules.some((r) => r.jenis_dokumen_kode === d.jenis_dokumen_kode)) continue;
    items.push({
      jenis_dokumen_id: d.jenis_dokumen_id,
      kode: d.jenis_dokumen_kode,
      nama: d.jenis_dokumen_kode,
      kategori: "Lainnya",
      sifat: "LAINNYA",
      kondisi: null,
      status: statusForDoc(d, null),
      urutan: 999,
      dokumen_id: d.id,
      versi: d.versi,
      tanggal_upload: d.tanggal_upload,
    });
  }

  // Isi nama & kategori dari master jenis_dokumen bila tersedia
  if (items.length > 0) {
    const masters = await query<{ id: number; kode: string; nama: string; kategori: string | null }>(
      `SELECT id, kode, nama, kategori FROM jenis_dokumen WHERE kode = ANY($1)`,
      [Array.from(new Set(items.map((i) => i.kode)))]
    );
    const mById = new Map(masters.map((m) => [m.kode, m]));
    for (const it of items) {
      const m = mById.get(it.kode);
      if (m) {
        it.nama = m.nama;
        it.kategori = it.kategori ?? m.kategori;
        if (!it.jenis_dokumen_id) it.jenis_dokumen_id = m.id;
      }
    }
  }

  items.sort((a, b) =>
    a.urutan - b.urutan || a.nama.localeCompare(b.nama, "id")
  );

  return { items, summary: { ...summarize(items), tidak_relevan: skippedKondisional } };
}

export function summarize(items: ChecklistItem[]): ChecklistSummary {
  const summary: ChecklistSummary = {
    total_wajib: 0,
    total_kondisional: 0,
    total_opsional: 0,
    total_lainnya: 0,
    tidak_relevan: 0,
    terverifikasi: 0,
    menunggu: 0,
    belum: 0,
    perlu_diperbarui: 0,
    ditolak: 0,
    pct: 0,
  };
  let required = 0;
  let done = 0;

  for (const it of items) {
    switch (it.sifat) {
      case "WAJIB":
        summary.total_wajib++;
        break;
      case "KONDISIONAL":
        summary.total_kondisional++;
        break;
      case "OPSIONAL":
        summary.total_opsional++;
        break;
      case "LAINNYA":
        summary.total_lainnya++;
        break;
    }
    if (it.sifat === "WAJIB" || it.sifat === "KONDISIONAL") {
      required++;
      switch (it.status) {
        case "TERVERIFIKASI":
        case "SUDAH TERUPLOAD":
          summary.terverifikasi++;
          done++;
          break;
        case "MENUNGGU VERIFIKASI":
          summary.menunggu++;
          break;
        case "PERLU DIPERBARUI":
          summary.perlu_diperbarui++;
          summary.belum++;
          break;
        case "DITOLAK":
          summary.ditolak++;
          summary.belum++;
          break;
        default:
          summary.belum++;
          break;
      }
    }
  }

  summary.pct = required === 0 ? 100 : Math.round((done / required) * 100);
  return summary;
}
