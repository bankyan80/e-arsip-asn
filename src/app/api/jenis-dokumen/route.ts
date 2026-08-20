import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { roleRank } from "@/lib/guard";
import { auditLog } from "@/lib/audit";
import type { JenisDokumen } from "@/lib/types";

export const runtime = "nodejs";

async function guard(request: NextRequest, allowedRoles = ["SUPER ADMIN", "ADMIN"]) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!allowedRoles.includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return session;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await query<JenisDokumen>(`SELECT * FROM jenis_dokumen ORDER BY urutan ASC, nama ASC`);
  return NextResponse.json({ data: rows });
}

export async function POST(request: NextRequest) {
  const session = await guard(request);
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => ({}));
  const { kode, nama, deskripsi, kategori, wajib, berlaku_pns, berlaku_pppk, urutan } = body;

  if (!kode || !nama) return NextResponse.json({ error: "Kode dan nama wajib diisi" }, { status: 400 });

  try {
    const rows = await query<JenisDokumen>(
      `INSERT INTO jenis_dokumen (kode, nama, deskripsi, kategori, wajib, berlaku_pns, berlaku_pppk, urutan)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [kode, nama, deskripsi ?? null, kategori ?? null, wajib ?? false, berlaku_pns ?? true, berlaku_pppk ?? true, urutan ?? 0]
    );
    await auditLog({
      aksi: "CREATE",
      adminUserId: session.userId,
      adminUsername: session.username,
      detail: { kode, nama },
    });
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: "Kode jenis dokumen sudah digunakan" }, { status: 409 });
  }
}

