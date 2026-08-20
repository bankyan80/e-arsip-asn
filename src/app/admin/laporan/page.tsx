"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Card, Button, Select } from "@/components/ui";

export default function LaporanPage() {
  const [type, setType] = useState("asn");
  const [format, setFormat] = useState("csv");
  const [msg, setMsg] = useState("");

  const types = [
    { value: "asn", label: "Daftar ASN" },
    { value: "dokumen", label: "Daftar Dokumen" },
    { value: "kelengkapan", label: "Status Kelengkapan" },
  ];

  const formats = [
    { value: "csv", label: "CSV" },
    { value: "pdf", label: "PDF" },
    { value: "json", label: "JSON" },
  ];

  function download() {
    const url = `/api/laporan?type=${type}&format=${format}`;
    window.open(url, "_blank");
    setMsg(`Laporan ${types.find((t) => t.value === type)?.label} (${format.toUpperCase()}) sedang diunduh.`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Laporan & Ekspor</h1>
        <p className="text-slate-500">Unduh data dalam format CSV, PDF, atau JSON</p>
      </div>

      {msg && <p className="text-sm text-emerald-600">{msg}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Jenis Laporan</h2>
          <div className="space-y-2">
            {types.map((t) => (
              <label key={t.value} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                <input type="radio" name="type" value={t.value} checked={type === t.value} onChange={() => setType(t.value)} />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Format</h2>
          <div className="space-y-2">
            {formats.map((f) => (
              <label key={f.value} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                <input type="radio" name="format" value={f.value} checked={format === f.value} onChange={() => setFormat(f.value)} />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
        </Card>
      </div>

      <Button onClick={download}>
        <FileDown className="mr-1 h-4 w-4" /> Unduh Laporan
      </Button>
    </div>
  );
}