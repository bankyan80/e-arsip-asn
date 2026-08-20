"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/fetch";
import { Card, Button, Badge, formatDate } from "@/components/ui";

interface NotifConfig {
  id: number;
  kunci: string;
  nama: string;
  aktif: boolean;
  deskripsi: string | null;
}

interface NotifRecord {
  id: number;
  tipe: string;
  nip: string | null;
  judul: string | null;
  status: string;
  error: string | null;
  created_at: string;
}

export default function NotifikasiPage() {
  const [configs, setConfigs] = useState<NotifConfig[]>([]);
  const [history, setHistory] = useState<NotifRecord[]>([]);
  const [pesan, setPesan] = useState("");
  const [nip, setNip] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const data = await apiFetch<{ data: NotifConfig[]; history: NotifRecord[] }>("/api/notifikasi");
    setConfigs(data.data);
    setHistory(data.history);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(c: NotifConfig) {
    await apiFetch("/api/notifikasi", { method: "PUT", body: JSON.stringify({ id: c.id, aktif: !c.aktif }) });
    load();
  }

  async function broadcast() {
    const res = await apiFetch<{ terkirim: number }>("/api/notifikasi", {
      method: "POST",
      body: JSON.stringify({ pesan, nip: nip || undefined }),
    });
    setMsg(`Pesan terkirim ke ${res.terkirim} ASN`);
    setPesan("");
    setNip("");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifikasi</h1>
        <p className="text-slate-500">Konfigurasi notifikasi otomatis Telegram</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Pengaturan Notifikasi</h2>
          <div className="space-y-3">
            {configs.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="font-medium">{c.nama}</p>
                  <p className="text-xs text-slate-500">{c.deskripsi || c.kunci}</p>
                </div>
                <button
                  onClick={() => toggle(c)}
                  className={`relative h-6 w-11 rounded-full transition ${c.aktif ? "bg-emerald-500" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${c.aktif ? "left-5" : "left-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Kirim Pengumuman</h2>
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            rows={4}
            placeholder="Isi pesan pengumuman..."
            value={pesan}
            onChange={(e) => setPesan(e.target.value)}
          />
          <input
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="NIP spesifik (kosongkan untuk semua)"
            value={nip}
            onChange={(e) => setNip(e.target.value)}
          />
          <Button className="mt-3 w-full" disabled={!pesan.trim()} onClick={broadcast}>Kirim ke Telegram</Button>
          {msg && <p className="mt-2 text-sm text-emerald-600">{msg}</p>}
        </Card>
      </div>

      <Card className="overflow-x-auto p-0">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold">Riwayat Notifikasi</div>
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Waktu</th>
              <th className="px-4 py-2">Tipe</th>
              <th className="px-4 py-2">NIP</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Belum ada notifikasi terkirim</td></tr>}
            {history.map((h) => (
              <tr key={h.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">{formatDate(h.created_at)}</td>
                <td className="px-4 py-2">{h.tipe}</td>
                <td className="px-4 py-2 font-mono text-xs">{h.nip || "-"}</td>
                <td className="px-4 py-2"><Badge tone={h.status === "SENT" ? "green" : "red"}>{h.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}