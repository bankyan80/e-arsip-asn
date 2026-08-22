"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ClipboardCheck,
  MessageCircle,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  FileWarning,
} from "lucide-react";
import type { MeResponse } from "./layout";

export default function AsnBerandaPage() {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    fetch("/api/asn/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setMe(d))
      .catch(() => (window.location.href = "/asn/login"));
  }, []);

  if (!me) {
    return <p className="mt-10 text-center text-sm text-slate-400">Memuat data...</p>;
  }

  const s = me.summary;
  const pct = Math.min(100, Math.max(0, s.pct));
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  const stats = [
    { label: "Terverifikasi", value: s.terverifikasi, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
    { label: "Menunggu", value: s.menunggu, icon: Clock3, color: "text-amber-600 bg-amber-50" },
    { label: "Belum ada", value: s.belum, icon: FileWarning, color: "text-rose-600 bg-rose-50" },
    { label: "Perlu diperbarui", value: s.perlu_diperbarui + s.ditolak, icon: AlertTriangle, color: "text-orange-600 bg-orange-50" },
  ];

  return (
    <div className="space-y-4">
      {/* Kartu progres */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-5">
          <svg width="128" height="128" viewBox="0 0 128 128" className="shrink-0">
            <circle cx="64" cy="64" r={radius} fill="none" stroke="#eef2f7" strokeWidth="12" />
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke="url(#grad)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              transform="rotate(-90 64 64)"
            />
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4338ca" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>
            <text x="64" y="60" textAnchor="middle" fontSize="26" fontWeight="700" fill="#1e293b">
              {pct}%
            </text>
            <text x="64" y="80" textAnchor="middle" fontSize="11" fill="#94a3b8">
              lengkap
            </text>
          </svg>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-800">Kelengkapan Arsip</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Jenis ASN: <span className="font-medium text-slate-700">{me.user.jenis_asn_resolved}</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {pct >= 100
                ? "Semua dokumen wajib Anda sudah lengkap. Terima kasih!"
                : "Lengkapi dokumen yang masih kurang melalui Telegram Bot atau hubungi admin."}
            </p>
          </div>
        </div>
      </section>

      {/* Statistik */}
      <section className="grid grid-cols-2 gap-3">
        {stats.map((st) => {
          const Icon = st.icon;
          return (
            <div key={st.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${st.color}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-tight text-slate-800">{st.value}</p>
                <p className="truncate text-xs text-slate-500">{st.label}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* Aksi cepat */}
      <section className="grid grid-cols-1 gap-3">
        <Link
          href="/asn/kelengkapan"
          className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 transition active:bg-indigo-100"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <ClipboardCheck className="h-6 w-6" />
          </span>
          <div>
            <p className="font-semibold text-indigo-900">Lihat Checklist Kelengkapan</p>
            <p className="text-xs text-indigo-700/70">Dokumen wajib & kondisional yang belum tersedia</p>
          </div>
        </Link>
        <a
          href="https://t.me/ArsipASN_bot"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-4 transition active:bg-sky-100"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#229ed9] text-white">
            <MessageCircle className="h-6 w-6" />
          </span>
          <div>
            <p className="font-semibold text-sky-900">Kirim Dokumen via Telegram</p>
            <p className="text-xs text-sky-700/70">Foto/PDF langsung ke bot e-ARSIP ASN</p>
          </div>
        </a>
      </section>
    </div>
  );
}
