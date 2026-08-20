import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { notifyAsn } from "@/lib/notifications";
import { deleteBlob } from "@/lib/storage";
import { escapeHtml } from "@/lib/telegram";
import type { ASN, Dokumen } from "@/lib/types";

export const runtime = "nodejs";

async function guard(request: NextRequest, allowedRoles?: string[]) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await guard(_req);
  if (session instanceof Response) return session;

  const id = Number(params.id);
  const doc = await queryOne<Dokumen>(`SELECT * FROM dokumen WHERE id = $1`, [id]);
  if (!doc) return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });

  const asn = await queryOne<ASN>(`SELECT * FROM asn WHERE nip = $1`, [doc.nip]);

  await auditLog({
    aksi: "VIEW",
    adminUserId: session.userId,
    adminUsername: session.username,
    nip: doc.nip,
    namaAsn: asn?.nama,
    dokumenId: doc.id,
  });

  return NextResponse.json({ dokumen: doc, asn });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await guard(request, ["SUPER ADMIN", "ADMIN"]);
  if (session instanceof Response) return session;

  const id = Number(params.id);
  const body = await request.json().catch(() => ({}));
  const { action, catatan } = body;

  const doc = await queryOne<Dokumen>(`SELECT * FROM dokumen WHERE id = $1`, [id]);
  if (!doc) return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
  const asn = await queryOne<ASN>(`SELECT * FROM asn WHERE nip = $1`, [doc.nip]);

  if (action === "approve") {
    await query(
      `UPDATE dokumen SET status = 'DISETUJUI', tanggal_verifikasi = now(), verified_by = $1, catatan_verifikasi = $2, updated_at = now() WHERE id = $3`,
      [session.userId, catatan ?? null, id]
    );
    await auditLog({
      aksi: "VERIFY",
      adminUserId: session.userId,
      adminUsername: session.username,
      nip: doc.nip,
      namaAsn: asn?.nama,
      dokumenId: id,
      detail: { catatan },
    });
    if (asn?.telegram_chat_id) {
      await notifyAsn({
        chatId: asn.telegram_chat_id,
        asnId: asn.id,
        nip: asn.nip,
        tipe: "DOKUMEN_DISETUJUI",
        judul: "Dokumen Disetujui",
        pesan: `✅ <b>Dokumen disetujui.</b>\n\n📄 ${escapeHtml(doc.jenis_dokumen_kode)}\n` + (catatan ? `Catatan: ${escapeHtml(catatan)}\n` : ""),
      });
    }
    return NextResponse.json({ ok: true, status: "DISETUJUI" });
  }

  if (action === "reject") {
    if (!catatan) return NextResponse.json({ error: "Alasan penolakan wajib diisi" }, { status: 400 });
    await query(
      `UPDATE dokumen SET status = 'DITOLAK', tanggal_verifikasi = now(), verified_by = $1, catatan_verifikasi = $2, updated_at = now() WHERE id = $3`,
      [session.userId, catatan, id]
    );
    await auditLog({
      aksi: "REJECT",
      adminUserId: session.userId,
      adminUsername: session.username,
      nip: doc.nip,
      namaAsn: asn?.nama,
      dokumenId: id,
      detail: { catatan },
    });
    if (asn?.telegram_chat_id) {
      await notifyAsn({
        chatId: asn.telegram_chat_id,
        asnId: asn.id,
        nip: asn.nip,
        tipe: "DOKUMEN_DITOLAK",
        judul: "Dokumen Ditolak",
        pesan: `⚠️ <b>Dokumen ${escapeHtml(doc.jenis_dokumen_kode)} perlu diperbaiki.</b>\n\nAlasan:\n${escapeHtml(catatan)}\n\nSilakan upload ulang dokumen.`,
      });
    }
    return NextResponse.json({ ok: true, status: "DITOLAK" });
  }

  return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await guard(request, ["SUPER ADMIN", "ADMIN"]);
  if (session instanceof Response) return session;

  const id = Number(params.id);
  const doc = await queryOne<Dokumen>(`SELECT * FROM dokumen WHERE id = $1`, [id]);
  if (!doc) return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });

  await deleteBlob(doc.blob_url);
  await query(`DELETE FROM dokumen WHERE id = $1`, [id]);

  await auditLog({
    aksi: "DELETE",
    adminUserId: session.userId,
    adminUsername: session.username,
    nip: doc.nip,
    dokumenId: id,
  });

  return NextResponse.json({ ok: true });
}