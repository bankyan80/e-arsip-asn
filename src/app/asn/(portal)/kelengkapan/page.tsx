"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import clsx from "clsx";
import type { ChecklistItem, ChecklistSummary, ItemStatusArsip } from "@/lib/types";

const statusStyle: Record<string, string> = {
  TERVERIFIKASI: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "SUDAH TERUPLOAD": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "MENUNGGU VERIFIKASI": "bg-amber-50 text-amber-700 border-amber-200",
  DITOLAK: "bg-rose-50 text-rose-700 border-rose-200",
  "PERLU DIPERBARUI": "bg-orange-50 text-orange-700 border-orange-200",
  "BELUM TERSEDIA": "bg-slate-100 text-slate-500 border-slate-200",
  OPSIONAL: "bg-sky-50 text-sky-700 border-sky-200",
};

function sifatLabel(sifat: string): string {
  switch (sifat) {
    case "WAJIB": return "Wajib";
    case "KONDISIONAL": return "Kondisional";
    case "OPSIONAL": return "Opsional";
    default: return "Lainnya";
  }
}

export default function AsnKelengkapanPage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [summary, setSummary] = useState<ChecklistSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/asn/checklist")
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items ?? []);
        setSummary(d.summary ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <p className="mt-10 flex items-center justify-center gap-2 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat checklist...
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-base font-bold text-slate-800">Checklist Kelengkapan</h1>
        {summary && (
          <p className="text-xs text-slate-500">
            {summary.pct}% lengkap · {summary.belum} belum ada
          </p>
        )}
      </div>

      {items.map((it) => {
        const hasDoc = Boolean(it.dokumen_id);
        const clickable = hasDoc && it.status !== "BELUM TERSEDIA";
        const inner = (
          <>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-semibold leading-snug text-slate-800">{it.nama}</p>
                <span
                  className={clsx(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    it.sifat === "WAJIB"
                      ? "bg-indigo-100 text-indigo-700"
                      : it.sifat === "KONDISIONAL"
                        ? "bg-violet-100 text-violet-700"
                        : "bg-slate-100 text-slate-500"
                  )}
                >
                  {sifatLabel(it.sifat)}
                </span>
              </div>
              {it.kondisi && (
                <p className="mt-0.5 text-xs italic text-slate-400">syarat profil</p>
              )}
              {hasDoc ? (
                <p className="mt-0.5 text-xs text-slate-400">
                  v{it.versi} ·{" "}
                  {it.tanggal_upload &&
                    new Date(it.tanggal_upload).toLocaleDateString("id-ID", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-slate-400">Belum ada dokumen terunggah</p>
              )}
            </div>
            <span
              className={clsx(
                "shrink-0 rounded-lg border px-2 py-1 text-[11px] font-semibold",
                statusStyle[it.status as ItemStatusArsip] ?? statusStyle["BELUM TERSEDIA"]
              )}
            >
              {it.status}
            </span>
          </>
        );

        return clickable ? (
          <Link
            key={`${it.kode}-${it.dokumen_id}`}
            href="/asn/dokumen"
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition active:bg-slate-50"
          >
            {inner}
          </Link>
        ) : (
          <div key={it.kode} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            {inner}
          </div>
        );
      })}

      {items.length === 0 && (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-sm">
          Belum ada aturan dokumen untuk jenis ASN Anda.
        </p>
      )}

      <p className="px-2 pb-2 pt-1 text-center text-xs leading-relaxed text-slate-400">
        Unggah dokumen melalui Telegram Bot{" "}
        <a href="https://t.me/ArsipASN_bot" target="_blank" rel="noreferrer" className="font-medium text-sky-600 underline">
          @ArsipASN_bot
        </a>{" "}
        atau hubungi admin/pengelola.
      </p>
    </div>
  );
}
