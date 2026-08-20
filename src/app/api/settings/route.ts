import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await query<{ kunci: string; nilai: string; deskripsi: string | null }>(
    `SELECT * FROM settings ORDER BY kunci`
  );
  const notifikasi = await query<{ id: number; kunci: string; nama: string; aktif: boolean; deskripsi: string | null }>(
    `SELECT * FROM notifikasi_config ORDER BY nama`
  );
  return NextResponse.json({ settings, notifikasi });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPER ADMIN", "ADMIN"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const { kunci, nilai } = body;
  if (!kunci) return NextResponse.json({ error: "kunci wajib" }, { status: 400 });

  await query(
    `INSERT INTO settings (kunci, nilai) VALUES ($1,$2)
     ON CONFLICT (kunci) DO UPDATE SET nilai = EXCLUDED.nilai, updated_at = now()`,
    [kunci, String(nilai)]
  );

  await auditLog({
    aksi: "SETTINGS",
    adminUserId: session.userId,
    adminUsername: session.username,
    detail: { kunci },
  });

  return NextResponse.json({ ok: true });
}