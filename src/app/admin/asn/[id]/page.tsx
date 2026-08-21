"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/fetch";
import { Card, Badge, Button, Input, Select, ProgressBar, Modal, formatDate, formatBytes } from "@/components/ui";

interface ASNData {
  id: number;
  nip: string;
  nama: string;
  pangkat: string | null;
  golongan: string | null;
  jabatan: string | null;
  unit_kerja: string | null;
  status: string;
  jenis_asn: string | null;
  menikah: boolean;
  punya_anak: boolean;
  sertifikat_pendidik: boolean;
  jabatan_tambahan: boolean;
  pernah_mutasi: boolean;
  pernah_naik_pangkat: boolean;
  pernah_diklat: boolean;
  pernah_penghargaan: boolean;
  pernah_hukdis: boolean;
  mendekati_pensiun: boolean;
  pernah_tugas_belajar: boolean;
  pernah_cerai: boolean;
  wajib_lhkpn: boolean;
  email: string | null;
  no_hp: string | null;
  alamat: string | null;
  telegram_username: string | null;
  telegram_verified_at: string | null;
}

interface ChecklistItemRow {
  kode: string;
  nama: string;
  kategori: string | null;
  sifat: "WAJIB" | "KONDISIONAL" | "OPSIONAL" | "LAINNYA";
  kondisi_label: string | null;
  status: string;
  dokumen_id: number | null;
  versi: number | null;
}

interface ChecklistSummaryRow {
  total_wajib: number;
  total_kondisional: number;
  total_opsional: number;
  total_lainnya: number;
  tidak_relevan: number;
  terverifikasi: number;
  menunggu: number;
  belum: number;
  pct: number;
}

const JENIS_OPTIONS = [
  { value: "", label: "(Otomatis dari status)" },
  { value: "PNS", label: "PNS" },
  { value: "PPPK_GURU", label: "PPPK Guru" },
  { value: "PPPK_TENDIK", label: "PPPK Tendik" },
  { value: "PPPK_GURU_PARUH_WAKTU", label: "PPPK Guru Paruh Waktu" },
  { value: "PPPK_TENDIK_PARUH_WAKTU", label: "PPPK Tendik Paruh Waktu" },
];

const KONDISI_FIELDS: Array<{ key: keyof ASNData; label: string }> = [
  { key: "menikah", label: "Menikah" },
  { key: "punya_anak", label: "Punya anak" },
  { key: "sertifikat_pendidik", label: "Sertifikat pendidik" },
  { key: "jabatan_tambahan", label: "Jabatan/tugas tambahan" },
  { key: "pernah_mutasi", label: "Pernah mutasi" },
  { key: "pernah_naik_pangkat", label: "Pernah naik pangkat" },
  { key: "pernah_diklat", label: "Pernah diklat" },
  { key: "pernah_penghargaan", label: "Pernah penghargaan" },
  { key: "pernah_hukdis", label: "Pernah hukuman disiplin" },
  { key: "mendekati_pensiun", label: "Mendekati pensiun" },
  { key: "pernah_tugas_belajar", label: "Pernah tugas belajar" },
  { key: "pernah_cerai", label: "Pernah bercerai" },
  { key: "wajib_lhkpn", label: "Wajib LHKPN" },
];

interface DokumenRow {
  id: number;
  jenis_nama: string;
  jenis_dokumen_kode: string;
  status: string;
  versi: number;
  tanggal_upload: string;
  tanggal_verifikasi: string | null;
  catatan_verifikasi: string | null;
  nama_file: string;
  ukuran_file: number;
  jumlah_halaman: number;
}

export default function AsnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [asn, setAsn] = useState<ASNData | null>(null);
  const [docs, setDocs] = useState<DokumenRow[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<{ items: ChecklistItemRow[]; summary: ChecklistSummaryRow; jenis_asn_label: string } | null>(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>({});
  const [delOpen, setDelOpen] = useState(false);
  const [delText, setDelText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const data = await apiFetch<{ asn: ASNData; dokumen: DokumenRow[]; audit: any[] }>(`/api/asn/${id}`);
    setAsn(data.asn);
    setDocs(data.dokumen);
    setAudit(data.audit);
    setForm(data.asn);
    try {
      const cl = await apiFetch<{ items: ChecklistItemRow[]; summary: ChecklistSummaryRow; jenis_asn_label: string }>(
        `/api/checklist?nip=${encodeURIComponent(data.asn.nip)}`
      );
      setChecklist(cl);
    } catch {
      setChecklist(null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save() {
    await apiFetch(`/api/asn/${id}`, {
      method: "PUT",
      body: JSON.stringify(form),
    });
    setEdit(false);
    load();
  }

  async function hapus() {
    setDeleting(true);
    try {
      await apiFetch(`/api/asn/${id}`, { method: "DELETE" });
      router.push("/admin/asn");
    } finally {
      setDeleting(false);
    }
  }

  if (!asn) return <p className="text-slate-500">Memuat...</p>;

  const statusTone = (s: string) => (s === "DISETUJUI" || s === "TERVERIFIKASI" ? "green" : s === "DITOLAK" ? "red" : "yellow");

  const itemStatusTone = (s: string) =>
    s === "TERVERIFIKASI" || s === "SUDAH TERUPLOAD"
      ? "green"
      : s === "DITOLAK" || s === "BELUM TERSEDIA"
        ? "red"
        : s === "PERLU DIPERBARUI"
          ? "yellow"
          : s === "MENUNGGU VERIFIKASI"
            ? "yellow"
            : "blue";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/admin/asn")} className="rounded-lg p-2 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{asn.nama}</h1>
          <p className="font-mono text-sm text-slate-500">{asn.nip}</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Pangkat/Golongan</p>
            <p className="font-medium">{asn.pangkat || "-"} / {asn.golongan || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Jabatan</p>
            <p className="font-medium">{asn.jabatan || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Unit Kerja</p>
            <p className="font-medium">{asn.unit_kerja || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Status</p>
            <Badge tone={asn.status === "PNS" ? "blue" : asn.status === "PPPK" ? "green" : "gray"}>{asn.status}</Badge>
            {checklist && (
              <p className="mt-1 font-medium">{checklist.jenis_asn_label}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500">Telegram</p>
            <p className="font-medium">{asn.telegram_username ? `@${asn.telegram_username}` : "Belum terhubung"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Terverifikasi</p>
            <p className="font-medium">{asn.telegram_verified_at ? formatDate(asn.telegram_verified_at) : "-"}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => setEdit(true)}>✏️ Edit Data</Button>
          <Button variant="danger" onClick={() => { setDelOpen(true); setDelText(""); }}>🗑 Hapus ASN</Button>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-x-auto p-0">
          <div className="border-b border-slate-200 px-5 py-3 font-semibold">📂 Daftar Arsip</div>
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Dokumen</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Upload</th>
                <th className="px-4 py-2">Verifikasi</th>
                <th className="px-4 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Belum ada dokumen</td></tr>
              )}
              {docs.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{d.jenis_dokumen_kode} <span className="text-xs text-slate-400">v{d.versi}</span></td>
                  <td className="px-4 py-3"><Badge tone={statusTone(d.status)}>{d.status}</Badge></td>
                  <td className="px-4 py-3">{formatDate(d.tanggal_upload)}</td>
                  <td className="px-4 py-3">{formatDate(d.tanggal_verifikasi)}</td>
                  <td className="px-4 py-3">
                    <a href={`/api/file/${d.id}`} className="text-indigo-600 hover:underline">Unduh</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Audit Log</h2>
          <div className="space-y-3">
            {audit.length === 0 && <p className="text-sm text-slate-500">Belum ada aktivitas</p>}
            {audit.map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <Badge>{a.aksi}</Badge>
                <div>
                  <p className="text-slate-700">{a.nama_asn || a.nip || "-"}</p>
                  <p className="text-xs text-slate-400">{formatDate(a.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {checklist && (
        <Card className="overflow-x-auto p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
            <span className="font-semibold">✅ Checklist Arsip (Rule Engine) — {checklist.jenis_asn_label}</span>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge tone="green">{checklist.summary.pct}% lengkap</Badge>
              <Badge tone="blue">⭐ Wajib: {checklist.summary.total_wajib}</Badge>
              <Badge tone="yellow">🟡 Kondisional: {checklist.summary.total_kondisional}</Badge>
              <Badge>🔵 Opsional: {checklist.summary.total_opsional}</Badge>
              {checklist.summary.total_lainnya > 0 && <Badge tone="gray">📦 Lainnya: {checklist.summary.total_lainnya}</Badge>}
              {checklist.summary.tidak_relevan > 0 && <Badge tone="gray">⚪ Tidak relevan: {checklist.summary.tidak_relevan}</Badge>}
            </div>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Dokumen</th>
                <th className="px-4 py-2">Sifat</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Versi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {checklist.items.map((it, idx) => (
                <tr key={`${it.kode}-${idx}`} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">
                    {it.nama}
                    {it.kondisi_label && (
                      <span className="ml-1 text-xs text-slate-400">({it.kondisi_label})</span>
                    )}
                    {it.sifat === "LAINNYA" && <span className="ml-1 text-xs text-slate-400">📦 di luar kategori</span>}
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={it.sifat === "WAJIB" ? "red" : it.sifat === "KONDISIONAL" ? "yellow" : it.sifat === "LAINNYA" ? "gray" : "blue"}>
                      {it.sifat}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={itemStatusTone(it.status)}>{it.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{it.versi ? `v${it.versi}` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Hapus ASN">
        <p className="text-sm text-slate-600">
          ASN <b>{asn.nama}</b> ({asn.nip}) beserta <b>{docs.length} dokumen</b> arsipnya akan dihapus permanen.
          Gunakan untuk ASN yang meninggal atau mutasi keluar.
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Ketik <span className="rounded bg-slate-100 px-1 font-mono font-semibold">HAPUS</span> untuk konfirmasi:
        </p>
        <Input className="mt-2" value={delText} onChange={(e) => setDelText(e.target.value)} placeholder="HAPUS" />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDelOpen(false)}>Batal</Button>
          <Button variant="danger" disabled={delText !== "HAPUS" || deleting} onClick={hapus}>
            {deleting ? "Menghapus..." : "Hapus Permanen"}
          </Button>
        </div>
      </Modal>

      <Modal open={edit} onClose={() => setEdit(false)} title="Edit Data ASN">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-600">Nama</label>
            <Input value={form.nama || ""} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Jenis Kepegawaian (Rule Engine)</label>
            <Select value={form.jenis_asn || ""} onChange={(e) => setForm({ ...form, jenis_asn: e.target.value || null })}>
              {JENIS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Status</label>
            <Select value={form.status || ""} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="PNS">PNS</option>
              <option value="PPPK">PPPK</option>
              <option value="LAINNYA">Lainnya</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Pangkat</label>
            <Input value={form.pangkat || ""} onChange={(e) => setForm({ ...form, pangkat: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Golongan</label>
            <Input value={form.golongan || ""} onChange={(e) => setForm({ ...form, golongan: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Jabatan</label>
            <Input value={form.jabatan || ""} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Unit Kerja</label>
            <Input value={form.unit_kerja || ""} onChange={(e) => setForm({ ...form, unit_kerja: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Email</label>
            <Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">No HP</label>
            <Input value={form.no_hp || ""} onChange={(e) => setForm({ ...form, no_hp: e.target.value })} />
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-slate-600">Kondisi Profil (menentukan dokumen kondisional)</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {KONDISI_FIELDS.map((f) => (
              <label key={f.key as string} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEdit(false)}>Batal</Button>
          <Button onClick={save}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}