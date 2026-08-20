"use client";

import { useEffect, useState } from "react";
import {
  Users,
  FileText,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  Clock,
} from "lucide-react";
import { apiFetch } from "@/lib/fetch";
import { StatCard, Card, Badge, ProgressBar } from "@/components/ui";

interface Stats {
  total_asn: number;
  total_dokumen: number;
  asn_lengkap: number;
  asn_belum_lengkap: number;
  dokumen_hari_ini: number;
  menunggu: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [uploadsPerMonth, setUploadsPerMonth] = useState<{ bulan: string; total: number }[]>([]);
  const [asnByStatus, setAsnByStatus] = useState<{ status: string; total: number }[]>([]);
  const [topJenis, setTopJenis] = useState<{ nama: string; total: number }[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/dashboard")
      .then((data) => {
        setStats(data.stats);
        setUploadsPerMonth(data.uploads_per_month);
        setAsnByStatus(data.asn_by_status);
        setTopJenis(data.top_jenis);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!stats) return <p className="text-slate-500">Memuat data...</p>;

  const maxUpload = Math.max(1, ...uploadsPerMonth.map((m) => m.total));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-500">Ringkasan arsip dokumen ASN</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Total ASN" value={stats.total_asn} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Total Dokumen" value={stats.total_dokumen} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="ASN Lengkap" value={stats.asn_lengkap} icon={<CheckCircle2 className="h-5 w-5" />} color="bg-emerald-50 text-emerald-700" />
        <StatCard label="ASN Belum Lengkap" value={stats.asn_belum_lengkap} icon={<AlertCircle className="h-5 w-5" />} color="bg-amber-50 text-amber-700" />
        <StatCard label="Dokumen Hari Ini" value={stats.dokumen_hari_ini} icon={<CalendarDays className="h-5 w-5" />} color="bg-sky-50 text-sky-700" />
        <StatCard label="Menunggu Verifikasi" value={stats.menunggu} icon={<Clock className="h-5 w-5" />} color="bg-rose-50 text-rose-700" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Upload per Bulan</h2>
          {uploadsPerMonth.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data</p>
          ) : (
            <div className="flex h-40 items-end gap-2">
              {uploadsPerMonth.map((m) => (
                <div key={m.bulan} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs text-slate-500">{m.total}</span>
                  <div
                    className="w-full rounded-t bg-indigo-500"
                    style={{ height: `${Math.max(4, (m.total / maxUpload) * 100)}%` }}
                    title={`${m.bulan}: ${m.total} dokumen`}
                  />
                  <span className="text-[10px] text-slate-400">{m.bulan.slice(2)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold">ASN berdasarkan Status</h2>
          {asnByStatus.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data</p>
          ) : (
            <div className="space-y-2">
              {asnByStatus.map((s) => (
                <div key={s.status} className="flex items-center justify-between text-sm">
                  <span>{s.status}</span>
                  <Badge tone="indigo">{s.total} ASN</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Jenis Dokumen Terbanyak</h2>
          {topJenis.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {topJenis.map((j) => (
                <div key={j.nama} className="flex items-center justify-between gap-4 text-sm">
                  <span className="truncate">{j.nama}</span>
                  <ProgressBar value={j.total} max={Math.max(1, topJenis[0].total)} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Kelengkapan Arsip</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>ASN Lengkap</span>
              <span className="font-semibold">{stats.asn_lengkap} / {stats.total_asn}</span>
            </div>
            <ProgressBar value={stats.asn_lengkap} max={Math.max(1, stats.total_asn)} />
            <p className="text-xs text-slate-500">
              {stats.total_asn === 0 ? "Belum ada ASN" : `${Math.round((stats.asn_lengkap / stats.total_asn) * 100)}% ASN melengkapi seluruh dokumen wajib`}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}