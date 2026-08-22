import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAsnSession } from "@/lib/asn-auth";

export const runtime = "nodejs";

interface OwnDokumen {
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

export async function GET(request: NextRequest) {
  const session = await getAsnSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";

  const rows = await query<OwnDokumen>(
    `SELECT d.id, d.jenis_dokumen_kode, j.nama AS jenis_nama, d.nama_file,
            d.mime_type, d.ukuran_file, d.versi, d.status,
            d.catatan_verifikasi, d.tanggal_upload, d.tanggal_verifikasi
     FROM dokumen d
     JOIN jenis_dokumen j ON j.id = d.jenis_dokumen_id
     WHERE d.nip = $1 AND d.is_latest = true
     ${status ? `AND d.status = $2` : ""}
     ORDER BY d.created_at DESC
     LIMIT 200`,
    status ? [session.nip, status] : [session.nip]
  );

  return NextResponse.json({ data: rows });
}
