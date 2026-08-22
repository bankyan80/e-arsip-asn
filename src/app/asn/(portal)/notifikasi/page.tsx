"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import clsx from "clsx";

interface Notif {
  id: number;
  tipe: string;
  judul: string | null;
  pesan: string | null;
  status: string;
  created_at: string;
}

export default function AsnNotifikasiPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/asn/notifikasi")
      .then((r) => r.json())
      .then((d) => setItems(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <p className="mt-10 flex items-center justify-center gap-2 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat notifikasi...
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="px-1 text-base font-bold text-slate-800">Notifikasi</h1>

      {items.length === 0 && (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-sm">
          Belum ada notifikasi.
        </p>
      )}

      {items.map((n) => (
        <div key={n.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">
              {n.judul || n.tipe.replaceAll("_", " ")}
            </p>
            <span
              className={clsx(
                "shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-semibold",
                n.status === "SENT"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              )}
            >
              {n.status}
            </span>
          </div>
          {n.pesan && (
            <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-500">
              {n.pesan}
            </p>
          )}
          <p className="mt-2 text-[11px] text-slate-400">
            {new Date(n.created_at).toLocaleString("id-ID", {
              day: "numeric", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
      ))}
    </div>
  );
}
