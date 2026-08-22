import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession, isSchoolAdmin } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { buildChecklist, resolveJenisAsn } from "@/lib/rule-engine";
import { labelJenisAsn } from "@/lib/types";
import type { ASN, Dokumen } from "@/lib/types";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scoped = isSchoolAdmin(session);
  const unit = session.unitKerja ?? "";

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "asn";
  const format = url.searchParams.get("format") ?? "csv";

  let headers: string[] = [];
  let rows: (string | number)[][] = [];

  if (type === "asn") {
    const data = await query<any>(
      `SELECT a.nip, a.nama, a.status, a.pangkat, a.golongan, a.jabatan, a.unit_kerja,
              a.telegram_username, a.telegram_verified_at,
              (SELECT COUNT(*)::int FROM dokumen d WHERE d.nip = a.nip AND d.is_latest = true) AS jumlah_dokumen
       FROM asn a
       ${scoped ? "WHERE a.unit_kerja = $1" : ""}
       ORDER BY a.nama ASC`,
      scoped ? [unit] : []
    );
    headers = ["NIP", "Nama", "Status", "Pangkat", "Golongan", "Jabatan", "Unit Kerja", "Telegram", "Terverifikasi", "Jml Dokumen"];
    rows = data.map((r) => [r.nip, r.nama, r.status, r.pangkat, r.golongan, r.jabatan, r.unit_kerja, r.telegram_username, r.telegram_verified_at ?? "", r.jumlah_dokumen]);
  } else if (type === "dokumen") {
    const data = await query<any>(
      `SELECT d.nip, a.nama AS nama_asn, j.nama AS jenis_nama, d.nama_file, d.status,
              d.versi, d.jumlah_halaman, d.tanggal_upload, d.tanggal_verifikasi
       FROM dokumen d
       JOIN asn a ON a.nip = d.nip
       JOIN jenis_dokumen j ON j.id = d.jenis_dokumen_id
       ${scoped ? "WHERE a.unit_kerja = $1" : ""}
       ORDER BY d.tanggal_upload DESC`,
      scoped ? [unit] : []
    );
    headers = ["NIP", "Nama", "Jenis Dokumen", "Nama File", "Status", "Versi", "Halaman", "Tgl Upload", "Tgl Verifikasi"];
    rows = data.map((r) => [r.nip, r.nama_asn, r.jenis_nama, r.nama_file, r.status, r.versi, r.jumlah_halaman, r.tanggal_upload, r.tanggal_verifikasi ?? ""]);
  } else if (type === "kelengkapan") {
    const asnRows = await query<ASN>(
      `SELECT * FROM asn ${scoped ? "WHERE unit_kerja = $1" : ""} ORDER BY nama ASC`,
      scoped ? [unit] : []
    );
    const nips = asnRows.map((a) => a.nip);
    const allDocs = nips.length
      ? await query<Pick<Dokumen, "id" | "nip" | "jenis_dokumen_id" | "jenis_dokumen_kode" | "status" | "tanggal_upload" | "versi">>(
          `SELECT id, nip, jenis_dokumen_id, jenis_dokumen_kode, status, tanggal_upload, versi FROM dokumen WHERE is_latest = true AND nip = ANY($1)`,
          [nips]
        )
      : [];
    const docsByNip = new Map<string, typeof allDocs>();
    for (const d of allDocs) {
      const arr = docsByNip.get(d.nip) ?? [];
      arr.push(d);
      docsByNip.set(d.nip, arr);
    }
    headers = ["NIP", "Nama", "Jenis ASN", "Status", "Unit Kerja", "Terverifikasi", "Wajib+Kondisional", "Persentase"];
    rows = [];
    for (const a of asnRows) {
      const { summary } = await buildChecklist(a, docsByNip.get(a.nip) ?? []);
      rows.push([
        a.nip, a.nama, labelJenisAsn(resolveJenisAsn(a)), a.status, a.unit_kerja ?? "",
        summary.terverifikasi,
        summary.total_wajib + summary.total_kondisional,
        `${summary.pct}%`,
      ]);
    }
  } else {
    return NextResponse.json({ error: "Jenis laporan tidak dikenal" }, { status: 400 });
  }

  await auditLog({
    aksi: "EXPORT",
    adminUserId: session.userId,
    adminUsername: session.username,
    detail: { type, format },
  });

  if (format === "json") {
    return NextResponse.json({ headers, rows });
  }

  if (format === "pdf") {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(10);
    doc.text(`Laporan ${type} - e-ARSIP ASN`, 14, 14);
    autoTable(doc, { head: [headers], body: rows, startY: 20, styles: { fontSize: 8 } });
    const buffer = Buffer.from(doc.output("arraybuffer"));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="laporan-${type}.pdf"`,
      },
    });
  }

  // CSV (default)
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(";"), ...rows.map((r) => r.map(escape).join(";"))].join("\r\n");
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-${type}.csv"`,
    },
  });
}