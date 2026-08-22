import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import type { Sekolah } from "@/lib/types";

export const runtime = "nodejs";

function validNpsn(npsn: unknown): string | null | "invalid" {
  if (npsn === undefined || npsn === null || npsn === "") return null;
  const s = String(npsn).trim();
  return /^\d{8}$/.test(s) ? s : "invalid";
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await query<Sekolah>(`SELECT * FROM sekolah ORDER BY nama ASC`);
  return NextResponse.json({ data: rows });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPER ADMIN", "ADMIN"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { nama, npsn } = await request.json().catch(() => ({}));
  if (!nama || !String(nama).trim()) return NextResponse.json({ error: "Nama sekolah wajib diisi" }, { status: 400 });
  const n = validNpsn(npsn);
  if (n === "invalid") return NextResponse.json({ error: "NPSN harus 8 digit angka" }, { status: 400 });

  try {
    const rows = await query<Sekolah>(
      `INSERT INTO sekolah (nama, npsn) VALUES ($1, $2) RETURNING *`,
      [String(nama).trim(), n]
    );
    await auditLog({ aksi: "CREATE", adminUserId: session.userId, adminUsername: session.username, detail: { sekolah: nama } });
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (e: any) {
    if (e.code === "23505") return NextResponse.json({ error: "Nama sekolah atau NPSN sudah terdaftar" }, { status: 409 });
    throw e;
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPER ADMIN", "ADMIN"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, nama, npsn } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  const n = validNpsn(npsn);
  if (n === "invalid") return NextResponse.json({ error: "NPSN harus 8 digit angka" }, { status: 400 });

  const sets: string[] = [];
  const vals: any[] = [];
  let i = 1;
  if (nama !== undefined) {
    sets.push(`nama = $${i++}`);
    vals.push(String(nama).trim());
  }
  if (npsn !== undefined) {
    sets.push(`npsn = $${i++}`);
    vals.push(n);
  }
  if (sets.length === 0) return NextResponse.json({ error: "Tidak ada data yang diubah" }, { status: 400 });

  try {
    const rows = await query<Sekolah>(
      `UPDATE sekolah SET ${sets.join(", ")}, updated_at = now() WHERE id = $${i} RETURNING *`,
      [...vals, id]
    );
    if (!rows[0]) return NextResponse.json({ error: "Sekolah tidak ditemukan" }, { status: 404 });
    await auditLog({ aksi: "CHANGE_DATA", adminUserId: session.userId, adminUsername: session.username, detail: { sekolah: rows[0].nama, npsn: rows[0].npsn } });
    return NextResponse.json({ data: rows[0] });
  } catch (e: any) {
    if (e.code === "23505") return NextResponse.json({ error: "Nama sekolah atau NPSN sudah terdaftar" }, { status: 409 });
    throw e;
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPER ADMIN", "ADMIN"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await request.json().catch(() => ({}));
  const row = await queryOne<Sekolah>(`SELECT * FROM sekolah WHERE id = $1`, [Number(id)]);
  if (!row) return NextResponse.json({ error: "Sekolah tidak ditemukan" }, { status: 404 });

  await query(`DELETE FROM sekolah WHERE id = $1`, [row.id]);
  await auditLog({ aksi: "DELETE", adminUserId: session.userId, adminUsername: session.username, detail: { sekolah: row.nama } });
  return NextResponse.json({ ok: true });
}
