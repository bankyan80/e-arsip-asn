import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import * as tg from "@/lib/telegram";
import type { ASN } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await query<{ id: number; kunci: string; nama: string; aktif: boolean; deskripsi: string | null }>(
    `SELECT * FROM notifikasi_config ORDER BY nama`
  );
  const history = await query(`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50`);
  return NextResponse.json({ data: rows, history });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPER ADMIN", "ADMIN"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, aktif } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });

  await query(`UPDATE notifikasi_config SET aktif = $2, updated_at = now() WHERE id = $1`, [id, !!aktif]);
  await auditLog({
    aksi: "SETTINGS",
    adminUserId: session.userId,
    adminUsername: session.username,
    detail: { notifikasi: id, aktif: !!aktif },
  });
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPER ADMIN", "ADMIN"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { pesan, nip } = await request.json().catch(() => ({}));
  if (!pesan) return NextResponse.json({ error: "Pesan wajib diisi" }, { status: 400 });

  const asnList = nip
    ? await query<ASN>(`SELECT * FROM asn WHERE nip = $1 AND telegram_chat_id IS NOT NULL`, [nip])
    : await query<ASN>(`SELECT * FROM asn WHERE telegram_chat_id IS NOT NULL`);

  let terkirim = 0;
  for (const asn of asnList) {
    try {
      await tg.sendMessage(asn.telegram_chat_id!, `🔔 <b>PENGUMUMAN</b>\n\n${tg.escapeHtml(pesan)}`);
      await query(
        `INSERT INTO notifications (tipe, asn_id, nip, telegram_chat_id, judul, pesan, status)
         VALUES ('PENGUMUMAN', $1, $2, $3, 'Pengumuman', $4, 'SENT')`,
        [asn.id, asn.nip, asn.telegram_chat_id, pesan]
      );
      terkirim++;
    } catch (e: any) {
      await query(
        `INSERT INTO notifications (tipe, asn_id, nip, telegram_chat_id, judul, pesan, status, error)
         VALUES ('PENGUMUMAN', $1, $2, $3, 'Pengumuman', $4, 'FAILED', $5)`,
        [asn.id, asn.nip, asn.telegram_chat_id, pesan, e.message]
      );
    }
  }

  await auditLog({
    aksi: "SEND",
    adminUserId: session.userId,
    adminUsername: session.username,
    detail: { terkirim, target: nip ?? "semua" },
  });

  return NextResponse.json({ ok: true, terkirim });
}