import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { maskEmail } from "@/lib/asn-auth";
import type { ASN } from "@/lib/types";

export const runtime = "nodejs";

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 15_000;

export async function POST(request: NextRequest) {
  const { nip } = await request.json().catch(() => ({}));
  if (!nip) {
    return NextResponse.json({ error: "NIP wajib diisi" }, { status: 400 });
  }

  const key = String(nip);
  const last = cooldowns.get(key);
  if (last && Date.now() - last < COOLDOWN_MS) {
    return NextResponse.json(
      { error: "Terlalu sering. Tunggu sebentar." },
      { status: 429 }
    );
  }
  cooldowns.set(key, Date.now());

  const asn = await queryOne<ASN>(`SELECT * FROM asn WHERE nip = $1 LIMIT 1`, [key]);
  if (!asn) {
    return NextResponse.json(
      { error: "NIP tidak ditemukan. Pastikan NIP sesuai data kepegawaian atau hubungi admin." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    telegram: Boolean(asn.telegram_chat_id),
    telegram_username: asn.telegram_username,
    email_masked: asn.email ? maskEmail(asn.email) : null,
  });
}
