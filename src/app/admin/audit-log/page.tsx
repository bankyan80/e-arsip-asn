"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { apiFetch } from "@/lib/fetch";
import { Card, Input, Badge, formatDate } from "@/components/ui";

interface AuditRow {
  id: number;
  aksi: string;
  admin_username: string | null;
  nip: string | null;
  nama_asn: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

const toneFor = (a: string) =>
  a === "LOGIN" ? "blue" : a === "VERIFY" || a === "CREATE" ? "green" : a === "REJECT" || a === "DELETE" ? "red" : a === "DOWNLOAD" || a === "VIEW" ? "yellow" : "gray";

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

  async function load() {
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set("q", q);
    const data = await apiFetch<{ data: AuditRow[]; total: number }>(`/api/audit?${params}`);
    setRows(data.data);
    setTotal(data.total);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const perPage = 50;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-slate-500">{total} catatan aktivitas</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input className="pl-9" placeholder="Cari aksi / NIP / admin" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Aksi</th>
              <th className="px-4 py-3">NIP / ASN</th>
              <th className="px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Tidak ada data</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 whitespace-nowrap text-xs">{formatDate(r.created_at)}</td>
                <td className="px-4 py-3">{r.admin_username || "system"}</td>
                <td className="px-4 py-3"><Badge tone={toneFor(r.aksi)}>{r.aksi}</Badge></td>
                <td className="px-4 py-3 font-mono text-xs">{r.nip || ""}{r.nip && r.nama_asn ? " - " : ""}{r.nama_asn || ""}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{r.detail ? JSON.stringify(r.detail).slice(0, 120) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50">Sebelumnya</button>
          <span className="text-sm text-slate-500">Halaman {page} dari {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50">Berikutnya</button>
        </div>
      )}
    </div>
  );
}