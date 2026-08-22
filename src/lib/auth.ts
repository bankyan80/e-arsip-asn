import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "e-arsip-auth";

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET belum diset");
  return new TextEncoder().encode(s);
}

export interface SessionPayload {
  userId: number;
  username: string;
  role: string;
  nama: string;
  unitKerja?: string | null;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as import("jose").JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    // Tolak token ASN dan payload tak valid agar tidak lolos sebagai sesi admin
    if ((payload as Record<string, unknown>).scope === "ASN") return null;
    const p = payload as unknown as SessionPayload & { userId?: unknown };
    // pg mengembalikan id sebagai string — terima angka maupun digit-string lalu normalkan
    const uid =
      typeof p.userId === "number"
        ? p.userId
        : typeof p.userId === "string" && /^\d+$/.test(p.userId)
          ? Number(p.userId)
          : NaN;
    if (!Number.isInteger(uid) || typeof p.username !== "string" || typeof p.role !== "string") {
      return null;
    }
    return { ...p, userId: uid };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySession(token);
}

export function isSchoolAdmin(session: SessionPayload): boolean {
  return session.role === "ADMIN SEKOLAH";
}

export async function setSession(payload: SessionPayload) {
  const store = cookies();
  const token = await signSession(payload);
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export function clearSession() {
  const store = cookies();
  store.delete(COOKIE_NAME);
}