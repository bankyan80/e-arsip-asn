"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, School } from "lucide-react";
import { apiFetch } from "@/lib/fetch";
import { Card, Button, Input } from "@/components/ui";
import type { Sekolah } from "@/lib/types";

export default function SekolahPage() {
  const [rows, setRows] = useState<Sekolah[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [baru, setBaru] = useState({ nama: "", npsn: "" });
  const [savingId, setSavingId] = useState<number | null>(null);

  async function load() {
    const data = await apiFetch<{ data: Sekolah[] }>("/api/sekolah");
    setRows(data.data);
    setDrafts(Object.fromEntries(data.data.map((r) => [r.id, r.npsn ?? ""])));
  }

  useEffect(() => {
    load();
  }, []);

  async function simpan(row: Sekolah) {
    setSavingId(row.id);
    setErr("");
    try {
      const res = await apiFetch<{ data?: Sekolah }>("/api/sekolah", {
        method: "PUT",
        body: JSON.stringify({ id: row.id, npsn: drafts[row.id] ?? "" }),
      });
      setMsg(`NPSN ${res.data?.nama} disimpan`);
      load();
    } catch (e: any) {
      setErr(e.message || "Gagal menyimpan");
    } finally {
      setSavingId(null);
    }
  }

  async function hapus(row: Sekolah) {
    if (!confirm(`Hapus sekolah ${row.nama} dari daftar?`)) return;
    await apiFetch("/api/sekolah", { method: "DELETE", body: JSON.stringify({ id: row.id }) });
    setMsg(`${row.nama} dihapus`);
    load();
  }

  async function tambah() {
    if (!baru.nama.trim()) return;
    setErr("");
    try {
      await apiFetch("/api/sekolah", { method: "POST", body: JSON.stringify(baru) });
      setMsg(`${baru.nama} ditambahkan`);
      setBaru({ nama: "", npsn: "" });
      load();
    } catch (e: any) {
      setErr(e.message || "Gagal menambahkan");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Data Sekolah</h1>
        <p className="text-slate-500">Daftar sekolah dan nomor NPSN (8 digit)</p>
      </div>

      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
      {err && <p className="text-sm text-rose-600">{err}</p>}

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label className="mb-1 block text-sm text-slate-600">Nama Sekolah</label>
            <Input value={baru.nama} onChange={(e) => setBaru({ ...baru, nama: e.target.value })} placeholder="Contoh: SD NEGERI 1 CONTOH" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">NPSN</label>
            <Input value={baru.npsn} onChange={(e) => setBaru({ ...baru, npsn: e.target.value.replace(/\D/g, "").slice(0, 8) })} placeholder="8 digit" inputMode="numeric" />
          </div>
          <Button onClick={tambah} disabled={!baru.nama.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Tambah
          </Button>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nama Sekolah</th>
              <th className="px-4 py-3">NPSN</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <span className="flex items-center gap-2 font-medium">
                    <School className="h-4 w-4 text-slate-400" /> {r.nama}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <Input
                    value={drafts[r.id] ?? ""}
                    onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                    placeholder="Belum diisi"
                    inputMode="numeric"
                    className="w-36"
                  />
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {(drafts[r.id] ?? "") !== (r.npsn ?? "") && (
                    <button onClick={() => simpan(r)} disabled={savingId === r.id} className="mr-3 text-indigo-600 hover:underline">
                      {savingId === r.id ? "..." : "Simpan"}
                    </button>
                  )}
                  <button onClick={() => hapus(r)} className="text-rose-600 hover:underline">
                    <Trash2 className="inline h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Belum ada data sekolah</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
