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
  email: string | null;
  no_hp: string | null;
  alamat: string | null;
  telegram_username: string | null;
  telegram_verified_at: string | null;
}

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
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>({});

  async function load() {
    const data = await apiFetch<{ asn: ASNData; dokumen: DokumenRow[]; audit: any[] }>(`/api/asn/${id}`);
    setAsn(data.asn);
    setDocs(data.dokumen);
    setAudit(data.audit);
    setForm(data.asn);
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

  if (!asn) return <p className="text-slate-500">Memuat...</p>;

  const statusTone = (s: string) => (s === "DISETUJUI" ? "green" : s === "DITOLAK" ? "red" : "yellow");

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

      <Modal open={edit} onClose={() => setEdit(false)} title="Edit Data ASN">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-600">Nama</label>
            <Input value={form.nama || ""} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
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
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEdit(false)}>Batal</Button>
          <Button onClick={save}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}