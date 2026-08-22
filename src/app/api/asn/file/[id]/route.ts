import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db";
import { getAsnSession } from "@/lib/asn-auth";
import { auditLog } from "@/lib/audit";
import { readBlob } from "@/lib/storage";
import type { Dokumen } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAsnSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  const doc = await queryOne<Dokumen>(`SELECT * FROM dokumen WHERE id = $1`, [id]);
  if (!doc) return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });

  // Ownership ketat: hanya dokumen milik sendiri
  if (doc.nip !== session.nip) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "local";

  // Dokumen hasil import Drive: arahkan langsung ke file asli di Google Drive
  if (doc.sumber === "drive" && doc.blob_url) {
    await auditLog({
      aksi: "DOWNLOAD_ASN",
      adminUsername: `ASN:${session.nip}`,
      nip: session.nip,
      namaAsn: session.nama,
      dokumenId: doc.id,
      ipAddress: ip,
    });
    return NextResponse.redirect(doc.blob_url, 302);
  }

  const file = await readBlob(doc.blob_pathname);
  if (!file) return NextResponse.json({ error: "File tidak ditemukan di storage" }, { status: 404 });

  await query(
    `INSERT INTO download_log (dokumen_id, admin_user_id, admin_username, nip, aksi, ip_address)
     VALUES ($1, NULL, $2, $3, 'DOWNLOAD', $4)`,
    [doc.id, `ASN:${session.nip}`, doc.nip, ip]
  );

  await auditLog({
    aksi: "DOWNLOAD_ASN",
    adminUsername: `ASN:${session.nip}`,
    nip: session.nip,
    namaAsn: session.nama,
    dokumenId: doc.id,
    ipAddress: ip,
  });

  const safeName = (doc.nama_file || `dokumen-${doc.id}.pdf`).replace(/["\\]/g, "");
  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Content-Length": String(file.size),
    },
  });
}
