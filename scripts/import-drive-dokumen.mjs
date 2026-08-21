// Import dokumen dari Google Drive (hasil scan-drive) ke tabel dokumen.
// - Matching pemilik file ke ASN (sekolah dulu, lalu global)
// - Klasifikasi jenis dokumen dari nama file
// - status=TERVERIFIKASI, sumber='drive' (file asli TIDAK disentuh aplikasi)
// Idempoten: baris dengan nip+storage_path yang sama dilewati.
import fs from "fs";
const root = process.cwd();
for (const line of fs.readFileSync(root + "/.env.local", "utf8").split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i > 0 && !line.trim().startsWith("#")) {
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim().replace(/^"|"$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
const { neon } = await import("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

const DRY_RUN = process.argv.includes("--dry");

function normSchool(s) {
  let x = (s || "").trim().toUpperCase();
  x = x.replace(/^\d+[.\s-]*/, "");
  x = x.replace(/\bSDN\b/g, "SD NEGERI");
  x = x.replace(/\bSD\s+NEGERI\b/g, "SD NEGERI");
  x = x.replace(/\bTKN\b/g, "TK NEGERI");
  x = x.replace(/\bTK\s+NEGERI\b/g, "TK NEGERI");
  x = x.replace(/\bTK\b(?!\s+NEGERI)/g, "TK");
  x = x.replace(/[^A-Z0-9]/g, "");
  return x;
}

function normName(s) {
  let x = (s || "").toUpperCase();
  x = x.replace(/-\d{8}T\d{6}Z(-\d+)+/g, "");
  x = x.replace(/_\d[\d\s.]+$/, "");
  x = x.replace(/^\d+[.\s-]+/, "");
  x = x.replace(/^\d{4}_/, "");
  x = x.replace(/,\s*$/, "");
  x = x.replace(/_/g, "'");
  x = x.replace(/(^|[.,\s])+((H\.?)|(HJ\.?))?\s*((S\.PD\.?(SD|I|AUD)?)|(S\.PD\.?I\.?M\.?M)|(M\.PD\.?I?)|(M\.M)|(S\.SI)|(S\.AG)|(S\.KOM)|(S\.H\.?I?)|(S\.E)|(S\.H)|(S\.IP)|(A\.MA\.?PD)|(A\.MD)|(DRA)|(DRS?))\b/g, "");
  x = x.replace(/^(H\.?|HJ\.?|BAPAK|IBU|DRS?\.?|DRA\.?)\s+/, "");
  x = x.replace(/'/g, "");
  x = x.replace(/\bMOHA?MM?AD\b/g, "MOHAMAD");
  x = x.replace(/[^A-Z0-9]/g, "");
  return x;
}

function stripSchoolFromName(s, schoolNorm) {
  let x = (s || "").toUpperCase();
  const raws = rawSchoolByNorm[schoolNorm] || new Set();
  for (const raw of raws) {
    const esc = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    x = x.replace(new RegExp(esc, "g"), "");
    const alt = raw
      .replace(/\bSDN\b/g, "SD NEGERI")
      .replace(/\bTKN\b/g, "TK NEGERI")
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\s+/g, "\\s+");
    x = x.replace(new RegExp(alt, "g"), "");
    x = x.replace(new RegExp(raw.replace(/[^A-Z0-9]/g, ""), "g"), "");
  }
  return x;
}

// ---- klasifikasi jenis dokumen dari nama file ----
const rules = [
  ["SK_PANGKAT", /PANGKAT/i],
  ["SK_CPNS", /CPNS|CALON\s*PEGAWAI/i],
  ["SK_KGB", /BERKALA|KGB|GAJI\s*BERKALA/i],
  ["SK_TASJEN", /TASJEN|TUNJANGAN|TUNKIN/i],
  ["SK_PPPK", /PPPK/i],
  ["PERJANJIAN_KERJA", /PERJANJIAN/i],
  ["SK_JABATAN", /JABATAN(?!.*FUNGSI)/i],
  ["JABFUNG", /JABFUNG|JAFUNG|JABATAN\s*FUNGSI/i],
  ["SK_PNS", /\bPNS\b(?!.*\bSK\b)|SK[_\s]*PNS/i],
  ["SK_PENGANGKATAN", /PENGANGKATAN|\bSK\b|(^|[^A-Z])SPK([^A-Z]|$)/i],
  ["IJAZAH_S3", /IJAZAH.*\bS3\b|DOKTOR/i],
  ["IJAZAH_S2", /IJAZAH.*\bS2\b|MAGISTER|\bS2\b/i],
  ["IJAZAH_S1", /IJAZAH.*\bS1\b|\bS1\b|SARJANA|STRATA/i],
  ["TRANSKRIP", /TRANSKR?I?P|TRANSLITE/i],
  ["IJAZAH", /I[JZ]AZ?AH|I[JZ]ASAH|STTB|AKTA\s*[IV4]\b|AKTA\s*4/i],
  ["SKP", /SKP|RHK|PENGELOLAAN\s*KINERJA/i],
  ["PAK", /(^|[^A-Z])PAK([^A-Z]|$)|ANGKA\s*KREDIT/i],
  ["PKG", /PKG/i],
  ["PKKS", /PKKS/i],
  ["SERDIK", /SERDIK/i],
  ["SERTIFIKAT", /SERTI?FIKAT|DIKLAT|PELATIHAN|PEMBINAAN|WIDYASWARNA|NUPLAKSAKA|AKTEP|BIMBINGAN|PAKERTI|SELEKTIF|MANAJEMEN|KEPALA\s*SEKOLAH|EKG/i],
  ["KARPEG", /KARPEG|KARTU\s*PEGAWAI|KARTU\s*ASN/i],
  ["KARIS_KARSU", /KARIS|KARSU|KARTU\s*ISTRI|KARTU\s*SUAMI/i],
  ["KTP", /KTP/i],
  ["KARTU_KELUARGA", /(^|[^A-Z])KK([^A-Z]|$)|KARTU\s*KER?LUARGA/i],
  ["NPWP", /NPWP/i],
  ["BPJS", /BPJS/i],
  ["AKTA_NIKAH", /NIKAH/i],
  ["AKTA_KELAHIRAN", /AKTE?\s*LAHIR|AKTA\s*LAHIR|^AKT[EA]\b|^AKTE\s|^AKTA\s|AKTA\s*ANAK|AKTE\s*ANAK/i],
  ["FOTO", /FOTO|FHOTO|PHOTO/i],
  ["NIP_BARU", /NIP\s*BARU/i],
  ["REKENING", /REKENING/i],
];
function classify(name) {
  for (const [kode, re] of rules) if (re.test(name)) return kode;
  return "DOKUMEN_LAINNYA";
}

// ---- data ----
const files = JSON.parse(fs.readFileSync(root + "/drive-arsip-list.json", "utf8"));
const R = "DOKUMEN SIMPEG KECAMATAN LEMAHABANG/";

const asn = await sql("SELECT id, nip, nama, unit_kerja FROM asn");
const jenisRows = await sql("SELECT id, kode FROM jenis_dokumen");
const jenisMap = new Map(jenisRows.map((j) => [j.kode, j.id]));

const existing = new Set();
for (const r of await sql("SELECT nip, storage_path FROM dokumen WHERE sumber = 'drive'")) {
  existing.add(r.nip + "|" + r.storage_path);
}

// grup per sekolah+orang
const groups = {}; // school -> person -> files[]
const rawSchoolByNorm = {};
for (const f of files) {
  const rel = f.path.slice(R.length);
  const seg = rel.split("/");
  if (seg.length < 3) continue;
  const school = normSchool(seg[0]);
  if (!rawSchoolByNorm[school]) rawSchoolByNorm[school] = new Set();
  rawSchoolByNorm[school].add(seg[0].replace(/^\d+[.\s-]*/, ""));
  if (!groups[school]) groups[school] = {};
  if (!groups[school][seg[1]]) groups[school][seg[1]] = [];
  groups[school][seg[1]].push(f);
}

// resolve pemilik: cocokkan dalam sekolah dulu, lalu global
const dbBySchool = {};
const globalMap = new Map();
for (const a of asn) {
  const s = normSchool(a.unit_kerja);
  if (!dbBySchool[s]) dbBySchool[s] = new Map();
  dbBySchool[s].set(normName(a.nama), a);
  globalMap.set(normName(a.nama), a);
}

const rows = [];
let orphanFiles = 0;
for (const school of Object.keys(groups)) {
  for (const person of Object.keys(groups[school])) {
    const pn = normName(stripSchoolFromName(person, school));
    const hit = (dbBySchool[school] && dbBySchool[school].get(pn)) || globalMap.get(pn);
    if (!hit) { orphanFiles += groups[school][person].length; continue; }
    for (const f of groups[school][person]) {
      const rel = f.path.slice(R.length);
      const fname = rel.split("/").slice(2).join("/");
      const kode = classify(fname);
      const jenisId = jenisMap.get(kode);
      if (!jenisId) { console.error("jenis tidak dikenal:", kode); continue; }
      if (existing.has(hit.nip + "|" + rel)) continue;
      rows.push({
        asn_id: hit.id,
        nip: hit.nip,
        jenis_id: jenisId,
        kode,
        nama_file: fname,
        path: rel,
        url: f.url,
        mime: f.mimeType || "application/octet-stream",
        size: Number(f.size || 0),
      });
    }
  }
}

console.log("Baris baru untuk diinsert:", rows.length, "| file yatim (tanpa pemilik):", orphanFiles);
if (DRY_RUN) {
  const tally = {};
  for (const r of rows) tally[r.kode] = (tally[r.kode] || 0) + 1;
  console.log("--- dry run, distribusi jenis ---");
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(k.padEnd(18), v);
  process.exit(0);
}

// insert batch
const COLS = 9;
let inserted = 0;
for (let i = 0; i < rows.length; i += 100) {
  const chunk = rows.slice(i, i + 100);
  const values = [];
  const params = [];
  chunk.forEach((r, j) => {
    const b = j * COLS;
    values.push(`($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9})`);
    params.push(r.asn_id, r.nip, r.jenis_id, r.kode, r.nama_file, r.path, r.url, r.mime, r.size);
  });
  const res = await sql(
    `INSERT INTO dokumen (asn_id, nip, jenis_dokumen_id, jenis_dokumen_kode, nama_file, storage_path, blob_url, blob_pathname, mime_type, ukuran_file, jumlah_halaman, versi, status, tanggal_upload, sumber, is_latest)
     SELECT x.asn_id::bigint, x.nip, x.jenis_id::bigint, x.kode, x.nama_file, x.path, x.url, x.path, x.mime, x.size::bigint, 1, 1, 'TERVERIFIKASI', now(), 'drive', true
     FROM (VALUES ${values.join(",")}) AS x(asn_id,nip,jenis_id,kode,nama_file,path,url,mime,size)
     LEFT JOIN dokumen d ON d.sumber='drive' AND d.nip = x.nip AND d.storage_path = x.path
     WHERE d.id IS NULL`,
    params
  );
  inserted += res.length;
}
console.log("Inserted:", inserted);

const stat = await sql(`SELECT COUNT(*)::int AS n FROM dokumen WHERE sumber='drive'`);
const byAsn = await sql(`SELECT COUNT(DISTINCT nip)::int AS n FROM dokumen WHERE sumber='drive'`);
console.log("Total dokumen drive di DB:", stat[0].n, "| ASN terdampak:", byAsn[0].n);