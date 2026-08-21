"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { apiFetch } from "@/lib/fetch";
import { Card, Button } from "@/components/ui";

interface SettingRow {
  kunci: string;
  nilai: string;
  deskripsi: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [notifikasi, setNotifikasi] = useState<{ id: number; kunci: string; nama: string; aktif: boolean; deskripsi: string | null }[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    const data = await apiFetch<{ settings: SettingRow[]; notifikasi: any[] }>("/api/settings");
    setSettings(data.settings);
    setNotifikasi(data.notifikasi);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(key: string, value: string) {
    await apiFetch("/api/settings", { method: "PUT", body: JSON.stringify({ kunci: key, nilai: value }) });
    setMsg(`Pengaturan ${key} disimpan`);
    load();
  }

  const formValue = (k: string) => settings.find((s) => s.kunci === k)?.nilai ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        <p className="text-slate-500">Konfigurasi sistem e-ARSIP ASN</p>
      </div>

      {msg && <p className="text-sm text-emerald-600">{msg}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Pengaturan Aplikasi</h2>
          <div className="space-y-4">
            {[
              { k: "app_name", label: "Nama Aplikasi", type: "text", desc: "Nama yang ditampilkan" },
              { k: "max_file_size_mb", label: "Batas Ukuran File (MB)", type: "number", desc: "Batas maksimal ukuran file upload" },
              { k: "reminder_day", label: "Hari Pengingat (0=Senin)", type: "number", desc: "Hari pengingat mingguan" },
              { k: "reminder_hour", label: "Jam Pengingat", type: "number", desc: "Jam pengingat (waktu server)" },
              { k: "email_daily_limit", label: "Batas Email per Hari", type: "number", desc: "Maksimal email himbauan per hari (kuota Resend 100/hari, disarankan 90)" },
              { k: "reminder_interval_days", label: "Jarak Antar Pengingat (hari)", type: "number", desc: "ASN yang sama tidak diingatkan lagi sebelum selang ini" },
            ].map((item) => (
              <div key={item.k} className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm text-slate-600">{item.label}</label>
                  <input
                    type={item.type}
                    defaultValue={formValue(item.k)}
                    id={`s-${item.k}`}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="mt-0.5 text-xs text-slate-400">{item.desc}</p>
                </div>
                <Button variant="outline" onClick={() => save(item.k, (document.getElementById(`s-${item.k}`) as HTMLInputElement).value)}>
                  <Save className="mr-1 h-4 w-4" /> Simpan
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Fitur</h2>
          <div className="space-y-4">
            {[
              { k: "ocr_enabled", label: "OCR", desc: "Baca teks dokumen untuk validasi (0/1)" },
              { k: "watermark_enabled", label: "Watermark Dokumen", desc: "Tambahkan watermark pada dokumen (0/1)" },
              { k: "auto_approve", label: "Setujui Otomatis", desc: "Setujui otomatis dokumen masuk (0/1)" },
            ].map((item) => (
              <div key={item.k} className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm text-slate-600">{item.label}</label>
                  <select
                    defaultValue={formValue(item.k)}
                    id={`f-${item.k}`}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                  <p className="mt-0.5 text-xs text-slate-400">{item.desc}</p>
                </div>
                <Button variant="outline" onClick={() => save(item.k, (document.getElementById(`f-${item.k}`) as HTMLSelectElement).value)}>
                  <Save className="mr-1 h-4 w-4" /> Simpan
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}