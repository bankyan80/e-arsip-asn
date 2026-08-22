"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { apiFetch } from "@/lib/fetch";
import { Card, Input, ProgressBar, Badge } from "@/components/ui";

interface KelengkapanRow {
  id: number;
  nip: string;
  nama: string;
  status: string;
  unit_kerja: string | null;
  jenis_asn_resolved?: string;
  total_wajib: number;
  total_kondisional: number;
  terverifikasi: number;
  menunggu: number;
  belum: number;
  pct_kelengkapan: number;
}

export default function KelengkapanPage() {
  const [rows, setRows] = useState<KelengkapanRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const data = await apiFetch<{ data: KelengkapanRow[] }>(`/api/kelengkapan${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    setRows(data.data);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kelengkapan Arsip</h1>
          <p className="text-slate-500">Status kelengkapan dokumen per ASN</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input className="pl-9" placeholder="Cari NIP / Nama" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-slate-500">Memuat...</p>
        ) : rows.length === 0 ? (
          <p className="text-slate-500">Tidak ada data</p>
        ) : (
          rows.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{r.nama}</p>
                  <p className="font-mono text-xs text-slate-500">{r.nip}</p>
                </div>
                <Badge tone={r.status === "PNS" ? "blue" : r.status === "PPPK" ? "green" : "gray"}>{r.status}</Badge>
              </div>
              <p className="mb-2 text-xs text-slate-500">{r.unit_kerja || "-"}</p>
              <ProgressBar value={r.pct_kelengkapan} />
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{r.terverifikasi} disetujui</span>
                <span>
                  {r.terverifikasi + r.menunggu} terunggah / {r.total_wajib + r.total_kondisional} harus ada
                  {r.belum > 0 && <span className="text-rose-500"> · {r.belum} belum</span>}
                </span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}