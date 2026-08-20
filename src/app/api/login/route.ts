import { NextRequest, NextResponse } from "next/server";
import { queryOne, query, timestamp } from "@/lib/db";
import { setSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";
import type { User } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json().catch(() => ({}));
  if (!username || !password) {
    return NextResponse.json({ error: "Username dan password wajib diisi" }, { status: 400 });
  }

  const user = await queryOne<User>(`SELECT * FROM users WHERE username = $1 LIMIT 1`, [username]);
  if (!user || !user.aktif) {
    return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
  }

  await query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [user.id]);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";

  await setSession({
    userId: user.id,
    username: user.username,
    role: user.role,
    nama: user.nama,
  });

  await auditLog({
    aksi: "LOGIN",
    adminUserId: user.id,
    adminUsername: user.username,
    ipAddress: ip,
  });

  return NextResponse.json({
    user: { id: user.id, username: user.username, nama: user.nama, role: user.role },
  });
}