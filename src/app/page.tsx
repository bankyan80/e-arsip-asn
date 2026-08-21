import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <img src="/logokab.png" alt="Logo Kabupaten" className="mx-auto mb-6 h-20 w-auto object-contain" />
        <h1 className="text-3xl font-bold text-slate-900">e-ARSIP ASN</h1>
        <p className="mt-2 text-slate-600">
          Sistem Arsip Dokumen ASN berbasis Telegram Bot + Web Dashboard Admin
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-indigo-600 px-6 py-3 text-center font-medium text-white transition hover:bg-indigo-700"
          >
            Masuk Admin
          </Link>
        </div>
        <p className="mt-6 text-sm text-slate-500">
          ASN dapat mengunggah dokumen langsung melalui Telegram Bot
        </p>
      </div>
    </main>
  );
}