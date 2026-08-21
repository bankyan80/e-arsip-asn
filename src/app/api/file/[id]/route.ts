import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { readBlob } from "@/lib/storage";
import type { Dokumen, ASN } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPER ADMIN", "ADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = Number(params.id);
  const doc = await queryOne<Dokumen>(`SELECT * FROM dokumen WHERE id = $1`, [id]);
  if (!doc) return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });

  const asn = await queryOne<ASN>(`SELECT * FROM asn WHERE nip = $1`, [doc.nip]);

  // Dokumen hasil import Drive: arahkan langsung ke file asli di Google Drive
  if (doc.sumber === "drive" && doc.blob_url) {
    await auditLog({
      aksi: "DOWNLOAD",
      adminUserId: session.userId,
      adminUsername: session.username,
      nip: doc.nip,
      namaAsn: asn?.nama,
      dokumenId: doc.id,
    });
    return NextResponse.redirect(doc.blob_url, 302);
  }

  // Ambil file dari Google Drive (private storage, streaming langsung)
  const file = await readBlob(doc.blob_pathname);
  if (!file) return NextResponse.json({ error: "File tidak ditemukan di storage" }, { status: 404 });

  await query(
    `INSERT INTO download_log (dokumen_id, admin_user_id, admin_username, nip, aksi, ip_address)
     VALUES ($1, $2, $3, $4, 'DOWNLOAD', $5)`,
    [doc.id, session.userId, session.username, doc.nip, request.headers.get("x-forwarded-for") ?? "local"]
  );

  await auditLog({
    aksi: "DOWNLOAD",
    adminUserId: session.userId,
    adminUsername: session.username,
    nip: doc.nip,
    namaAsn: asn?.nama,
    dokumenId: doc.id,
  });

  // Kirim file langsung (stream dari Google Drive, tidak publik)
  const safeName = (doc.nama_file || `dokumen-${doc.id}.pdf`).replace(/["\\]/g, "");
  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Content-Length": String(file.size),
    },
  });
}