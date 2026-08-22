"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  BadgeCheck,
  AlertCircle,
  LogOut,
  Loader2,
} from "lucide-react";
import type { MeResponse } from "../layout";

function labelJenis(j: string): string {
  switch (j) {
    case "PNS": return "PNS";
    case "PPPK_GURU": return "PPPK Guru";
    case "PPPK_TENDIK": return "PPPK Tendik";
    case "PPPK_GURU_PARUH_WAKTU": return "PPPK Guru Paruh Waktu";
    case "PPPK_TENDIK_PARUH_WAKTU": return "PPPK Tendik Paruh Waktu";
    default: return j;
  }
}

export default function AsnProfilPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/asn/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setMe(d))
      .catch(() => (window.location.href = "/asn/login"));
  }, []);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/asn/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/asn/login";
  }

  if (!me) {
    return (
      <p className="mt-10 flex items-center justify-center gap-2 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat profil...
      </p>
    );
  }

  const u = me.user;
  const tgVerified = Boolean(u.telegram_verified_at);

  const rows: Array<[string, string]> = [
    ["NIP", u.nip],
    ["Nama", u.nama],
    ["Pangkat / Golongan", u.pangkat ? `${u.pangkat}${u.golongan ? ` (${u.golongan})` : ""}` : "-"],
    ["Jabatan", u.jabatan ?? "-"],
    ["Unit Kerja", u.unit_kerja ?? "-"],
    ["Status", labelJenis(u.jenis_asn_resolved)],
    ["Email", u.email_masked ?? "-"],
    ["No. HP", u.no_hp ?? "-"],
  ];

  return (
    <div className="space-y-4">
      <h1 className="px-1 text-base font-bold text-slate-800">Profil Saya</h1>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.map(([label, value], i) => (
          <div
            key={label}
            className={`flex items-start justify-between gap-4 px-4 py-3 ${i > 0 ? "border-t border-slate-100" : ""}`}
          >
            <span className="shrink-0 text-xs font-medium text-slate-400">{label}</span>
            <span className="text-right text-sm font-medium text-slate-700">{value}</span>
          </div>
        ))}
      </section>
      <p className="-mt-2 px-2 text-[11px] leading-relaxed text-slate-400">
        Data kepegawaian dikelola oleh admin/pengelola. Apabila ada ketidaksesuaian data, silakan
        hubungi admin.
      </p>

      {/* Status Telegram */}
      <section
        className={`rounded-2xl border p-4 shadow-sm ${
          tgVerified ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"
        }`}
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          {tgVerified ? (
            <BadgeCheck className="h-5 w-5 text-emerald-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-600" />
          )}
          Telegram {tgVerified ? "terhubung" : "belum terhubung"}
        </p>
        {tgVerified && (
          <p className="mt-1 text-xs text-slate-600">
            Akun: {u.telegram_username ? `@${u.telegram_username}` : "-"} · terverifikasi{" "}
            {new Date(u.telegram_verified_at!).toLocaleDateString("id-ID", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        )}
        {!tgVerified && (
          <>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Hubungkan akun Telegram agar dapat menerima kode login dan mengirim dokumen langsung
              dari HP.
            </p>
            <a
              href="https://t.me/ArsipASN_bot"
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#229ed9] py-2.5 text-sm font-semibold text-white transition active:brightness-90"
            >
              <MessageCircle className="h-4 w-4" /> Mulai Bot Telegram
            </a>
          </>
        )}
      </section>

      {/* Keluar */}
      <button
        onClick={logout}
        disabled={loggingOut}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white py-3 text-sm font-semibold text-rose-600 transition active:bg-rose-50 disabled:opacity-50"
      >
        {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Keluar
      </button>

      <p className="pb-2 text-center text-[11px] text-slate-400">e-ARSIP ASN &copy; 2026</p>
    </div>
  );
}
