import { NextRequest, NextResponse } from "next/server";
import { queryOne, query, timestamp } from "@/lib/db";
import { setSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";
import type { User } from "@/lib/types";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function recordAttempt(key: string): number {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now > rec.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return 1;
  }
  rec.count++;
  return rec.count;
}

export async function POST(request: NextRequest) {
  const { username, password } = await request.json().catch(() => ({}));
  if (!username || !password) {
    return NextResponse.json({ error: "Username dan password wajib diisi" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const key = `${ip}|${String(username).toLowerCase()}`;
  const count = recordAttempt(key);
  if (count > MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Silakan coba lagi beberapa saat." }, { status: 429 });
  }

  const user = await queryOne<User>(`SELECT * FROM users WHERE username = $1 LIMIT 1`, [username]);
  if (!user || !user.aktif) {
    return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
  }

  attempts.delete(key);

  await query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [user.id]);

  await setSession({
    userId: user.id,
    username: user.username,
    role: user.role,
    nama: user.nama,
    unitKerja: user.unit_kerja ?? null,
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