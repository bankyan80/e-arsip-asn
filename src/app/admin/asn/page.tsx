"use client";

import { useEffect, useRef, useState } from "react";
import { Search, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/fetch";
import { Card, Input, Select, Badge, ProgressBar, Button } from "@/components/ui";

interface ASNRow {
  id: number;
  nip: string;
  nama: string;
  status: string;
  jabatan: string;
  unit_kerja: string;
  telegram_username: string | null;
  pct_kelengkapan: number;
}

export default function AsnListPage() {
  // Pulihkan posisi halaman/pencarian setelah kembali dari halaman detail
  const saved = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("asnListState") || "{}");
    } catch {
      return {};
    }
  })();
  const [rows, setRows] = useState<ASNRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState<number>(saved.page ?? 1);
  const [q, setQ] = useState<string>(saved.q ?? "");
  const [dq, setDq] = useState<string>(saved.q ?? ""); // query yang sudah di-debounce
  const [status, setStatus] = useState<string>(saved.status ?? "");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ASNRow | null>(null);
  const perPage = 20;

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (dq) params.set("q", dq);
    if (status) params.set("status", status);
    const data = await apiFetch<{ data: ASNRow[]; total: number }>(`/api/asn?${params}`);
    setRows(data.data);
    setTotal(data.total);
    setLoading(false);
  }

  // Live search: tunggu 400ms setelah berhenti mengetik
  useEffect(() => {
    const t = setTimeout(() => setDq(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  // Kembali ke halaman 1 saat kata kunci berubah
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setPage(1);
  }, [dq]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, dq]);

  // Simpan posisi list untuk dipulihkan saat kembali dari detail
  useEffect(() => {
    sessionStorage.setItem("asnListState", JSON.stringify({ page, q: dq, status }));
  }, [page, dq, status]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const offset = (page - 1) * perPage;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Data ASN</h1>
          <p className="text-slate-500">{total} ASN terdaftar</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Cari NIP / Nama / Jabatan"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setDq(q)}
            />
          </div>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Semua Status</option>
            <option value="PNS">PNS</option>
            <option value="PPPK">PPPK</option>
            <option value="LAINNYA">Lainnya</option>
          </Select>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">NIP</th>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Jabatan</th>
              <th className="px-4 py-3">Unit Kerja</th>
              <th className="px-4 py-3">Telegram</th>
              <th className="px-4 py-3">Kelengkapan</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Memuat...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Tidak ada data</td></tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-50" onClick={() => setSelected(r)}>
                  <td className="px-4 py-3 text-slate-500">{offset + idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.nip}</td>
                  <td className="px-4 py-3 font-medium">{r.nama}</td>
                  <td className="px-4 py-3">
                    <Badge tone={r.status === "PNS" ? "blue" : r.status === "PPPK" ? "green" : "gray"}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3">{r.jabatan || "-"}</td>
                  <td className="px-4 py-3">{r.unit_kerja || "-"}</td>
                  <td className="px-4 py-3">{r.telegram_username ? "✅" : "—"}</td>
                  <td className="px-4 py-3 w-40"><ProgressBar value={r.pct_kelengkapan} /></td>
                  <td className="px-4 py-3">
                    <a href={`/admin/asn/${r.id}`} className="text-indigo-600 hover:underline">Detail</a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" /> Sebelumnya
          </Button>
          <span className="text-sm text-slate-500">Halaman {page} dari {totalPages}</span>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Berikutnya <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}