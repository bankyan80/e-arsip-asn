import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAsnSession } from "@/lib/asn-auth";
import type { NotificationRecord } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAsnSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await query<NotificationRecord>(
    `SELECT id, tipe, judul, pesan, status, created_at
     FROM notifications
     WHERE asn_id = $1 OR nip = $2
     ORDER BY created_at DESC
     LIMIT 50`,
    [session.asnId, session.nip]
  );

  return NextResponse.json({ data: rows });
}
