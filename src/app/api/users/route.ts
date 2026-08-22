import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";
import type { User } from "@/lib/types";

export const runtime = "nodejs";

async function guard(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPER ADMIN", "ADMIN"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return session;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPER ADMIN", "ADMIN"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await query<User>(`SELECT id, username, nama, role, unit_kerja, aktif, last_login_at, created_at FROM users ORDER BY created_at ASC`);
  return NextResponse.json({ data: rows });
}

export async function POST(request: NextRequest) {
  const session = await guard(request);
  if (session instanceof NextResponse) return session;

  const { username, password, nama, role, unit_kerja } = await request.json().catch(() => ({}));
  if (!username || !password || !nama || !role) {
    return NextResponse.json({ error: "Username, password, nama, dan role wajib diisi" }, { status: 400 });
  }
  if (role === "ADMIN SEKOLAH" && !unit_kerja) {
    return NextResponse.json({ error: "Unit kerja sekolah wajib diisi untuk Admin Sekolah" }, { status: 400 });
  }
  if (session.role !== "SUPER ADMIN" && role === "SUPER ADMIN") {
    return NextResponse.json({ error: "Hanya Super Admin yang dapat membuat akun Super Admin" }, { status: 403 });
  }
  const hash = await bcrypt.hash(password, 10);
  let rows: User[];
  try {
    rows = await query<User>(
      `INSERT INTO users (username, password_hash, nama, role, unit_kerja) VALUES ($1,$2,$3,$4,$5) RETURNING id, username, nama, role, unit_kerja, aktif`,
      [username.trim(), hash, nama, role, role === "ADMIN SEKOLAH" ? unit_kerja : null]
    );
  } catch (e: any) {
    if (e.code === "23505") return NextResponse.json({ error: "Username sudah digunakan, pakai yang lain" }, { status: 409 });
    throw e;
  }
  await auditLog({
    aksi: "CREATE",
    adminUserId: session.userId,
    adminUsername: session.username,
    detail: { user: username, role },
  });
  return NextResponse.json({ data: rows[0] }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await guard(request);
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => ({}));
  const { id, username, nama, role, aktif, password, unit_kerja } = body;
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });

  if (role === "ADMIN SEKOLAH" && !unit_kerja) {
    return NextResponse.json({ error: "Unit kerja sekolah wajib diisi untuk Admin Sekolah" }, { status: 400 });
  }

  if (session.role !== "SUPER ADMIN") {
    if (role === "SUPER ADMIN") {
      return NextResponse.json({ error: "Hanya Super Admin yang dapat menetapkan peran Super Admin" }, { status: 403 });
    }
    const target = await query<User>(`SELECT role FROM users WHERE id = $1`, [Number(id)]);
    if (!target[0]) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    if (target[0].role === "SUPER ADMIN") {
      return NextResponse.json({ error: "Hanya Super Admin yang dapat mengubah akun Super Admin" }, { status: 403 });
    }
  }

  const sets: string[] = [];
  const vals: any[] = [];
  let i = 1;
  const allowed: Record<string, unknown> = { username, nama, role, aktif, unit_kerja: role === "ADMIN SEKOLAH" ? unit_kerja : role !== undefined ? null : undefined };
  for (const k of Object.keys(allowed)) {
    if (allowed[k] !== undefined) {
      sets.push(`${k} = $${i}`);
      vals.push(allowed[k]);
      i++;
    }
  }
  if (password) {
    sets.push(`password_hash = $${i}`);
    vals.push(await bcrypt.hash(password, 10));
    i++;
  }
  if (sets.length === 0) return NextResponse.json({ error: "Tidak ada data yang diubah" }, { status: 400 });
  vals.push(id);
  const rows = await query<User>(
    `UPDATE users SET ${sets.join(", ")}, updated_at = now() WHERE id = $${i} RETURNING id, username, nama, role, unit_kerja, aktif`,
    vals
  );
  await auditLog({
    aksi: "CHANGE_DATA",
    adminUserId: session.userId,
    adminUsername: session.username,
    detail: { user: username, role },
  });
  return NextResponse.json({ data: rows[0] });
}

export async function DELETE(request: NextRequest) {
  const session = await guard(request);
  if (session instanceof NextResponse) return session;
  const { id } = await request.json().catch(() => ({}));
  await query(`DELETE FROM users WHERE id = $1`, [id]);
  await auditLog({
    aksi: "DELETE",
    adminUserId: session.userId,
    adminUsername: session.username,
    detail: { user: id },
  });
  return NextResponse.json({ ok: true });
}