"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/fetch";
import { Card, Button, Modal, Input, Select, Badge } from "@/components/ui";

interface JenisRow {
  id: number;
  kode: string;
  nama: string;
  deskripsi: string | null;
  kategori: string | null;
  wajib: boolean;
  berlaku_pns: boolean;
  berlaku_pppk: boolean;
  urutan: number;
  aktif: boolean;
}

export default function JenisDokumenPage() {
  const [rows, setRows] = useState<JenisRow[]>([]);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<Partial<JenisRow>>({});
  const [msg, setMsg] = useState("");

  async function load() {
    const data = await apiFetch<{ data: JenisRow[] }>("/api/jenis-dokumen");
    setRows(data.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    const isEdit = !!form.id;
    await apiFetch(isEdit ? `/api/jenis-dokumen/${form.id}` : "/api/jenis-dokumen", {
      method: isEdit ? "PUT" : "POST",
      body: JSON.stringify(form),
    });
    setMsg(isEdit ? "Jenis dokumen diperbarui" : "Jenis dokumen ditambahkan");
    setModal(null);
    load();
  }

  async function remove(row: JenisRow) {
    if (!confirm(`Hapus jenis dokumen ${row.nama}?`)) return;
    try {
      await apiFetch(`/api/jenis-dokumen/${row.id}`, { method: "DELETE" });
      setMsg("Jenis dokumen dihapus");
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jenis Dokumen</h1>
          <p className="text-slate-500">Daftar jenis dokumen yang dapat diunggah ASN</p>
        </div>
        <Button onClick={() => { setForm({ wajib: false, berlaku_pns: true, berlaku_pppk: true, urutan: 99 }); setModal("create"); }}>
          <Plus className="mr-1 h-4 w-4" /> Tambah
        </Button>
      </div>

      {msg && <p className="text-sm text-emerald-600">{msg}</p>}

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Kode</th>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Wajib</th>
              <th className="px-4 py-3">Berlaku</th>
              <th className="px-4 py-3">Urutan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">{r.kode}</td>
                <td className="px-4 py-3 font-medium">{r.nama}</td>
                <td className="px-4 py-3">{r.kategori || "-"}</td>
                <td className="px-4 py-3">{r.wajib ? "✅" : "—"}</td>
                <td className="px-4 py-3 text-xs">{r.berlaku_pns ? "PNS" : ""}{r.berlaku_pns && r.berlaku_pppk ? " + " : ""}{r.berlaku_pppk ? "PPPK" : ""}</td>
                <td className="px-4 py-3">{r.urutan}</td>
                <td className="px-4 py-3"><Badge tone={r.aktif ? "green" : "gray"}>{r.aktif ? "Aktif" : "Nonaktif"}</Badge></td>
                <td className="px-4 py-3">
                  <button onClick={() => { setForm(r); setModal("edit"); }} className="mr-2 text-indigo-600 hover:underline"><Pencil className="inline h-4 w-4" /></button>
                  <button onClick={() => remove(r)} className="text-rose-600 hover:underline"><Trash2 className="inline h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === "edit" ? "Edit Jenis Dokumen" : "Tambah Jenis Dokumen"}>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-600">Kode</label>
            <Input value={form.kode || ""} onChange={(e) => setForm({ ...form, kode: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Nama</label>
            <Input value={form.nama || ""} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Kategori</label>
            <Input value={form.kategori || ""} onChange={(e) => setForm({ ...form, kategori: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Urutan</label>
            <Input type="number" value={form.urutan ?? 0} onChange={(e) => setForm({ ...form, urutan: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-4 md:col-span-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.wajib} onChange={(e) => setForm({ ...form, wajib: e.target.checked })} /> Wajib</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.berlaku_pns} onChange={(e) => setForm({ ...form, berlaku_pns: e.target.checked })} /> Berlaku PNS</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.berlaku_pppk} onChange={(e) => setForm({ ...form, berlaku_pppk: e.target.checked })} /> Berlaku PPPK</label>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-600">Deskripsi</label>
            <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={form.deskripsi || ""} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setModal(null)}>Batal</Button>
          <Button onClick={save}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}