"use client";

import { useEffect, useState } from "react";
import {
  MessageCircle,
  BadgeCheck,
  AlertCircle,
  LogOut,
  Loader2,
  Mail,
  X,
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
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Ganti email
  const [showGantiEmail, setShowGantiEmail] = useState(false);
  const [emailBaru, setEmailBaru] = useState("");
  const [kodeEmail, setKodeEmail] = useState("");
  const [emailMasked, setEmailMasked] = useState("");
  const [emailKanal, setEmailKanal] = useState<"EMAIL" | "TELEGRAM">("EMAIL");
  const [emailStep, setEmailStep] = useState<"input" | "kode">("input");
  const [emailError, setEmailError] = useState("");
  const [emailInfo, setEmailInfo] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

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

  function resetGantiEmail() {
    setShowGantiEmail(false);
    setEmailStep("input");
    setEmailBaru("");
    setKodeEmail("");
    setEmailError("");
    setEmailInfo("");
  }

  async function requestEmailChange(kanal: "EMAIL" | "TELEGRAM") {
    setEmailLoading(true);
    setEmailError("");
    setEmailInfo("");
    try {
      const res = await fetch("/api/asn/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailBaru, kanal }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailError(data.error || "Gagal mengirim kode");
        return;
      }
      setEmailMasked(data.email_masked ?? "");
      setEmailKanal(data.kanal === "TELEGRAM" ? "TELEGRAM" : "EMAIL");
      setEmailStep("kode");
      setEmailInfo(
        data.kanal === "TELEGRAM"
          ? "Kode verifikasi dikirim ke Telegram Anda. Berlaku 10 menit."
          : "Kode verifikasi dikirim ke email baru. Berlaku 10 menit."
      );
    } catch {
      setEmailError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setEmailLoading(false);
    }
  }

  async function verifyEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    setEmailError("");
    try {
      const res = await fetch("/api/asn/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kode: kodeEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailError(data.error || "Verifikasi gagal");
        return;
      }
      // Muat ulang profil agar masked email diperbarui
      const meRes = await fetch("/api/asn/me");
      if (meRes.ok) setMe(await meRes.json());
      resetGantiEmail();
      setEmailInfo("Email berhasil diganti.");
      setTimeout(() => setEmailInfo(""), 5000);
    } catch {
      setEmailError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setEmailLoading(false);
    }
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

      {/* Ganti Email */}
      {emailInfo && (
        <div className="-mt-1 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
          {emailInfo}
        </div>
      )}
      {!showGantiEmail ? (
        <button
          onClick={() => setShowGantiEmail(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white py-3 text-sm font-semibold text-indigo-700 transition active:bg-indigo-50"
        >
          <Mail className="h-4 w-4" /> Ganti Email
        </button>
      ) : (
        <section className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Ganti Email</p>
            <button
              onClick={resetGantiEmail}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {emailStep === "input" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                requestEmailChange("EMAIL");
              }}
            >
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Alamat email baru (aktif dan dapat diakses)
              </label>
              <input
                value={emailBaru}
                onChange={(e) => setEmailBaru(e.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="nama@email.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                Kode verifikasi dikirim ke email baru untuk memastikan email benar milik Anda.
              </p>
              {emailError && <p className="mb-2 mt-2 text-sm text-rose-600">{emailError}</p>}
              <button
                type="submit"
                disabled={emailLoading || !emailBaru}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition active:bg-indigo-800 disabled:opacity-50"
              >
                {emailLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Kirim Kode ke Email Baru
              </button>
            </form>
          ) : (
            <form onSubmit={verifyEmailChange}>
              <p className="mb-2 text-xs leading-relaxed text-slate-500">
                {emailKanal === "TELEGRAM" ? (
                  <>
                    Masukkan 6 digit kode yang dikirim ke{" "}
                    <span className="font-semibold text-slate-700">Telegram Anda</span>
                  </>
                ) : (
                  <>
                    Masukkan 6 digit kode yang dikirim ke{" "}
                    <span className="font-semibold text-slate-700">{emailMasked}</span>
                  </>
                )}
              </p>
              <input
                value={kodeEmail}
                onChange={(e) => setKodeEmail(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="- - - - - -"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-xl font-bold tracking-[0.4em] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              {emailError && <p className="mb-2 mt-2 text-sm text-rose-600">{emailError}</p>}
              {emailInfo && !emailError && (
                <p className="mt-2 text-sm text-emerald-600">{emailInfo}</p>
              )}
              <button
                type="submit"
                disabled={emailLoading || kodeEmail.length !== 6}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition active:bg-indigo-800 disabled:opacity-50"
              >
                {emailLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Verifikasi &amp; Simpan
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailStep("input");
                  setKodeEmail("");
                  setEmailError("");
                  setEmailInfo("");
                }}
                className="mt-2 w-full py-2 text-xs text-slate-400 hover:text-slate-600"
              >
                Ubah alamat email / kirim ulang
              </button>
            </form>
          )}
          {emailStep === "input" && me.user.telegram_verified_at && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="mb-2 text-[11px] text-slate-400">
                Email baru bermasalah? Verifikasi bisa lewat Telegram:
              </p>
              <button
                onClick={() => requestEmailChange("TELEGRAM")}
                disabled={emailLoading || !emailBaru}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#229ed9] py-3 text-sm font-semibold text-white transition active:brightness-90 disabled:opacity-50"
              >
                {emailLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
                Kirim Kode via Telegram
              </button>
            </div>
          )}
        </section>
      )}

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
