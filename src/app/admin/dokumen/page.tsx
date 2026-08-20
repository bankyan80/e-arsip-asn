"use client";

import { useEffect, useState } from "react";
import { Search, CheckCircle2, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/fetch";
import { Card, Input, Select, Badge, Button, Modal, formatDate, formatBytes } from "@/components/ui";

interface DocRow {
  id: number;
  nip: string;
  nama_asn: string;
  jenis_nama: string;
  jenis_dokumen_kode: string;
  status: string;
  versi: number;
  tanggal_upload: string;
  jumlah_halaman: number;
  ukuran_file: number;
  catatan_verifikasi: string | null;
}

export default function DokumenPage() {
  const [rows, setRows] = useState<DocRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<DocRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [modal, setModal] = useState<"detail" | "reject" | null>(null);

  async function load() {
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    const data = await apiFetch<{ data: DocRow[]; total: number }>(`/api/dokumen?${params}`);
    setRows(data.data);
    setTotal(data.total);
  }

  useEffect(() => {
    load();
  }, [page, status]);

  async function verify(doc: DocRow, action: "approve" | "reject", catatan = "") {
    const res = await apiFetch(`/api/dokumen/${doc.id}`, {
      method: "PUT",
      body: JSON.stringify({ action, catatan }),
    });
    setModal(null);
    setSelected(null);
    load();
  }

  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Arsip Dokumen</h1>
          <p className="text-slate-500">{total} dokumen</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input className="pl-9" placeholder="Cari NIP / Nama" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
          </div>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Semua Status</option>
            <option value="MENUNGGU">Menunggu</option>
            <option value="DISETUJUI">Disetujui</option>
            <option value="DITOLAK">Ditolak</option>
          </Select>
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">NIP</th>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Dokumen</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Versi</th>
              <th className="px-4 py-3">Halaman</th>
              <th className="px-4 py-3">Ukuran</th>
              <th className="px-4 py-3">Upload</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">Tidak ada dokumen</td></tr>
            )}
            {rows.map((r, idx) => (
              <tr key={r.id} className="hover:bg-slate-50" onClick={() => { setSelected(r); setModal("detail"); }}>
                <td className="px-4 py-3 text-slate-500">{(page - 1) * perPage + idx + 1}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.nip}</td>
                <td className="px-4 py-3 font-medium">{r.nama_asn}</td>
                <td className="px-4 py-3">{r.jenis_nama}</td>
                <td className="px-4 py-3"><Badge tone={r.status === "DISETUJUI" ? "green" : r.status === "DITOLAK" ? "red" : "yellow"}>{r.status}</Badge></td>
                <td className="px-4 py-3">v{r.versi}</td>
                <td className="px-4 py-3">{r.jumlah_halaman}</td>
                <td className="px-4 py-3 text-xs">{formatBytes(r.ukuran_file)}</td>
                <td className="px-4 py-3">{formatDate(r.tanggal_upload)}</td>
                <td className="px-4 py-3">
                  <a href={`/api/file/${r.id}`} className="text-indigo-600 hover:underline">Unduh</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
          <span className="text-sm text-slate-500">Halaman {page} dari {totalPages}</span>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Berikutnya</Button>
        </div>
      )}

      {selected && (
        <Modal open={modal === "detail"} onClose={() => setModal(null)} title="Detail Dokumen">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Dokumen</span><span className="font-medium">{selected.jenis_nama}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">NIP / Nama</span><span>{selected.nip} - {selected.nama_asn}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status</span><Badge tone={selected.status === "DISETUJUI" ? "green" : selected.status === "DITOLAK" ? "red" : "yellow"}>{selected.status}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Versi / Halaman</span><span>v{selected.versi} / {selected.jumlah_halaman} hal</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Upload</span><span>{formatDate(selected.tanggal_upload)}</span>
            </div>
            {selected.catatan_verifikasi && (
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Catatan Verifikasi</p>
                <p>{selected.catatan_verifikasi}</p>
              </div>
            )}
            <div className="flex gap-2 pt-4">
              <a href={`/api/file/${selected.id}`} className="flex-1"><Button className="w-full" variant="outline">📥 Unduh</Button></a>
              {selected.status === "MENUNGGU" && (
                <>
                  <Button className="flex-1" onClick={() => { setModal("reject"); setRejectReason(""); }}>Tolak</Button>
                  <Button className="flex-1" onClick={() => verify(selected, "approve")}><CheckCircle2 className="mr-1 h-4 w-4" /> Setujui</Button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}

      {selected && (
        <Modal open={modal === "reject"} onClose={() => setModal("detail")} title="Tolak Dokumen">
          <p className="mb-3 text-sm text-slate-600">Alasan penolakan wajib diisi. ASN akan menerima notifikasi melalui Telegram.</p>
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            rows={4}
            placeholder="Contoh: Dokumen kurang jelas"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModal("detail")}>Batal</Button>
            <Button variant="danger" disabled={!rejectReason.trim()} onClick={() => verify(selected, "reject", rejectReason)}>
              <XCircle className="mr-1 h-4 w-4" /> Tolak
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}