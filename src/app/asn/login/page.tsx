"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Smartphone,
  Mail,
  MessageCircle,
  ArrowLeft,
  Loader2,
  ShieldCheck,
} from "lucide-react";

export default function AsnLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [nip, setNip] = useState("");
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [viaTelegram, setViaTelegram] = useState(false);
  const [viaEmail, setViaEmail] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/asn/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nip }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal mengirim kode");
        return;
      }
      setNama(data.nama || "");
      setViaTelegram(Boolean(data.telegram));
      setViaEmail(data.email ?? null);
      setStep(2);
      setInfo("Kode login telah dikirim. Berlaku 10 menit.");
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/asn/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nip, kode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Verifikasi gagal");
        return;
      }
      router.push("/asn");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  function backToNip() {
    setStep(1);
    setKode("");
    setError("");
    setInfo("");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header brand */}
      <div className="bg-gradient-to-br from-indigo-700 to-blue-600 px-6 pb-16 pt-12 text-center text-white">
        <img src="/logokab.png" alt="Logo" className="mx-auto mb-4 h-28 w-auto object-contain" />
        <h1 className="text-xl font-bold">e-ARSIP ASN</h1>
        <p className="mt-1 text-sm opacity-90">
          {step === 1 ? "Masuk ke arsip kepegawaian Anda" : `Halo${nama ? `, ${nama}` : ""}`}
        </p>
      </div>

      <div className="mx-auto -mt-8 max-w-md px-5 pb-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
          {step === 1 ? (
            <form onSubmit={requestOtp}>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nomor Induk Pegawai (NIP)
              </label>
              <input
                value={nip}
                onChange={(e) => setNip(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                autoComplete="username"
                placeholder="18 digit NIP"
                className="w-full rounded-xl border border-slate-300 px-4 py-3.5 text-base tracking-wide outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              {error && <p className="mb-3 mt-2 text-sm text-rose-600">{error}</p>}
              <button
                type="submit"
                disabled={loading || !nip}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-base font-semibold text-white transition active:bg-indigo-800 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                Kirim Kode Login
              </button>
            </form>
          ) : (
            <>
              <div className="mb-4 space-y-2 rounded-xl bg-indigo-50 p-4 text-sm text-slate-600">
                {viaTelegram && (
                  <p className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 shrink-0 text-sky-500" />
                    Kode dikirim via Telegram Bot
                  </p>
                )}
                {viaEmail && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-indigo-500" />
                    Kode dikirim ke email {viaEmail}
                  </p>
                )}
              </div>
              <form onSubmit={verifyOtp}>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Masukkan 6 digit kode
                </label>
                <input
                  value={kode}
                  onChange={(e) => setKode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="-  -  -  -  -  -"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3.5 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                {error && <p className="mb-3 mt-2 text-sm text-rose-600">{error}</p>}
                {info && !error && <p className="mb-3 mt-2 text-sm text-emerald-600">{info}</p>}
                <button
                  type="submit"
                  disabled={loading || kode.length !== 6}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-base font-semibold text-white transition active:bg-indigo-800 disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                  Masuk
                </button>
              </form>
              <button
                onClick={backToNip}
                className="mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-sm text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="h-4 w-4" /> Gunakan NIP lain / kirim ulang
              </button>
            </>
          )}
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-500">
          <p className="mb-1 flex items-center gap-1.5 font-medium text-slate-600">
            <ShieldCheck className="h-4 w-4 text-indigo-500" /> Tanpa password
          </p>
          Login memakai kode sekali pakai yang dikirim ke Telegram/email resmi Anda.
          Belum punya Telegram terhubung? Hubungi admin atau mulai dari{" "}
          <a
            href="https://t.me/ArsipASN_bot"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-indigo-600 underline"
          >
            bot e-ARSIP ASN
          </a>
          .
        </div>

        <div className="mt-4 flex items-start justify-center gap-2 px-2 text-center text-xs text-slate-400">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Di Android: buka menu browser lalu pilih <b>Tambahkan ke layar utama</b> agar aplikasi
            seperti asli.
          </span>
        </div>
      </div>
    </main>
  );
}
