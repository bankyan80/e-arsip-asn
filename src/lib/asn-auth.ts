import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "e-arsip-asn-auth";

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET belum diset");
  return new TextEncoder().encode(s);
}

export interface AsnSessionPayload {
  scope: "ASN";
  asnId: number;
  nip: string;
  nama: string;
}

export async function setAsnSession(payload: AsnSessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  const store = cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getAsnSession(): Promise<AsnSessionPayload | null> {
  const store = cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.scope !== "ASN") return null;
    return payload as unknown as AsnSessionPayload;
  } catch {
    return null;
  }
}

export async function clearAsnSession() {
  const store = cookies();
  store.delete(COOKIE_NAME);
}

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const user = email.slice(0, at);
  const domain = email.slice(at);
  const head = user.slice(0, Math.min(2, user.length));
  return `${head}${"*".repeat(Math.max(3, user.length - head.length))}${domain}`;
}

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
