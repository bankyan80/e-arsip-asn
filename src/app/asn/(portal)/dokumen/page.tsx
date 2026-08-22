"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import clsx from "clsx";

interface OwnDok {
  id: number;
  jenis_dokumen_kode: string;
  jenis_nama: string;
  nama_file: string;
  mime_type: string;
  ukuran_file: number;
  versi: number;
  status: string;
  catatan_verifikasi: string | null;
  tanggal_upload: string;
  tanggal_verifikasi: string | null;
}

const statusChip: Record<string, string> = {
  TERVERIFIKASI: "bg-emerald-100 text-emerald-700",
  DISETUJUI: "bg-emerald-100 text-emerald-700",
  MENUNGGU: "bg-amber-100 text-amber-700",
  DITOLAK: "bg-rose-100 text-rose-700",
};

function fmtSize(bytes: number): string {
  if (!bytes) return "-";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AsnDokumenPage() {
  const [docs, setDocs] = useState<OwnDok[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const url = filter ? `/api/asn/dokumen?status=${filter}` : "/api/asn/dokumen";
    fetch(url)
      .then((r) => r.json())
      .then((d) => setDocs(d.data ?? []))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-3">
      <h1 className="px-1 text-base font-bold text-slate-800">Dokumen Saya</h1>

      {/* Filter status */}
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
        {[
          { v: "", l: "Semua" },
          { v: "TERVERIFIKASI", l: "Terverifikasi" },
          { v: "DISETUJUI", l: "Disetujui" },
          { v: "MENUNGGU", l: "Menunggu" },
          { v: "DITOLAK", l: "Ditolak" },
        ].map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={clsx(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
              filter === f.v
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-200 bg-white text-slate-600"
            )}
          >
            {f.l}
          </button>
        ))}
      </div>

      {loading && (
        <p className="mt-10 flex items-center justify-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat dokumen...
        </p>
      )}

      {!loading && docs.length === 0 && (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-sm">
          Belum ada dokumen pada filter ini.
        </p>
      )}

      {docs.map((d) => (
        <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-slate-800">{d.jenis_nama}</p>
              <p className="mt-0.5 truncate text-xs text-slate-400">{d.nama_file}</p>
              <p className="mt-1 text-xs text-slate-500">
                v{d.versi} · {fmtSize(d.ukuran_file)} ·{" "}
                {new Date(d.tanggal_upload).toLocaleDateString("id-ID", {
                  day: "numeric", month: "short", year: "numeric",
                })}
                {d.tanggal_verifikasi &&
                  ` · diverifikasi ${new Date(d.tanggal_verifikasi).toLocaleDateString("id-ID", {
                    day: "numeric", month: "short", year: "numeric",
                  })}`}
              </p>
            </div>
            <span
              className={clsx(
                "shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold",
                statusChip[d.status] ?? "bg-slate-100 text-slate-500"
              )}
            >
              {d.status}
            </span>
          </div>

          {d.status === "DITOLAK" && d.catatan_verifikasi && (
            <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs leading-relaxed text-rose-700">
              <span className="font-semibold">Catatan verifikator:</span> {d.catatan_verifikasi}
            </div>
          )}

          <a
            href={`/api/asn/file/${d.id}`}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 py-2.5 text-sm font-medium text-indigo-700 transition active:bg-indigo-100"
          >
            <Download className="h-4 w-4" /> Lihat / Unduh
          </a>
        </div>
      ))}
    </div>
  );
}
