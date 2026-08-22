import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db";
import bcrypt from "bcryptjs";
import * as tg from "@/lib/telegram";
import { env } from "@/lib/env";
import { getAsnSession, generateOtp, maskEmail } from "@/lib/asn-auth";
import type { ASN } from "@/lib/types";

export const runtime = "nodejs";

const cooldowns = new Map<number, number>();
const COOLDOWN_MS = 60_000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const session = await getAsnSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, kanal } = await request.json().catch(() => ({}));
  const kanalReq = kanal === "TELEGRAM" ? "TELEGRAM" : "EMAIL";
  const emailBaru = String(email ?? "").trim().toLowerCase();
  if (!emailBaru || !EMAIL_RE.test(emailBaru) || emailBaru.length > 200) {
    return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
  }

  const last = cooldowns.get(session.asnId);
  if (last && Date.now() - last < COOLDOWN_MS) {
    return NextResponse.json(
      { error: "Tunggu sebentar sebelum meminta kode baru." },
      { status: 429 }
    );
  }
  cooldowns.set(session.asnId, Date.now());

  const asn = await queryOne<ASN>(`SELECT * FROM asn WHERE id = $1 LIMIT 1`, [session.asnId]);
  if (!asn) return NextResponse.json({ error: "Data ASN tidak ditemukan" }, { status: 404 });

  if (asn.email && asn.email.trim().toLowerCase() === emailBaru && kanalReq === "EMAIL") {
    // Kirim ke email yang sama masih diizinkan untuk TELEGRAM,
    // tapi untuk EMAIL tidak ada gunanya.
    return NextResponse.json({ error: "Email baru sama dengan email saat ini" }, { status: 400 });
  }

  if (kanalReq === "TELEGRAM" && !asn.telegram_chat_id) {
    return NextResponse.json(
      { error: "Telegram belum terhubung. Verifikasi hanya bisa melalui email baru atau hubungi admin." },
      { status: 400 }
    );
  }
  if (kanalReq === "EMAIL" && !env.resendApiKey) {
    return NextResponse.json(
      { error: "Layanan email belum tersedia. Silakan verifikasi via Telegram atau hubungi admin." },
      { status: 503 }
    );
  }

  const kode = generateOtp();
  const kodeHash = await bcrypt.hash(kode, 10);
  await query(`DELETE FROM asn_email_change WHERE asn_id = $1 AND terpakai = false`, [asn.id]);
  await query(
    `INSERT INTO asn_email_change (asn_id, nip, email_baru, kode_hash, kanal, kadaluarsa_at)
     VALUES ($1, $2, $3, $4, $5, now() + interval '10 minutes')`,
    [asn.id, asn.nip, emailBaru, kodeHash, kanalReq]
  );

  if (kanalReq === "TELEGRAM") {
    try {
      await tg.sendMessage(
        asn.telegram_chat_id!,
        `✉️ <b>Verifikasi Ganti Email ${env.appName}</b>\n\n` +
          `Email baru Anda: <b>${tg.escapeHtml(emailBaru)}</b>\n\n` +
          `Kode verifikasi: <code>${kode}</code>\n\n` +
          `Berlaku 10 menit. Jika Bapak/Ibu tidak merasa meminta ini, abaikan pesan ini.`,
        { disable_notification: false }
      );
      return NextResponse.json({ ok: true, kanal: "TELEGRAM", email_masked: maskEmail(emailBaru) });
    } catch (e: any) {
      return NextResponse.json(
        { error: `Gagal mengirim kode ke Telegram: ${e.message}` },
        { status: 502 }
      );
    }
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(env.resendApiKey);
    const nama = asn.nama;
    const { error } = await resend.emails.send({
      from: env.emailFrom,
      to: emailBaru,
      subject: `Verifikasi Email Baru - ${env.appName}`,
      html: `
<!DOCTYPE html>
<html lang="id">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#263238;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6fb;">
      <tr><td align="center" style="padding:30px 10px;">
        <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 5px 25px rgba(0,0,0,0.06);">
          <tr><td align="center" style="background:linear-gradient(135deg,#4338ca,#2563eb);padding:30px;color:#ffffff;">
            <h1 style="margin:0;font-size:22px;">&#9993;&#65039; Verifikasi Email Baru</h1>
            <p style="margin:6px 0 0;font-size:13px;opacity:.9;">${env.appName}</p>
          </td></tr>
          <tr><td align="center" style="padding:35px 30px;">
            <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">
              Yth. Bapak/Ibu ${nama},<br>
              Gunakan kode berikut untuk memverifikasi pergantian email akun Anda:
            </p>
            <div style="font-size:38px;font-weight:700;letter-spacing:10px;color:#1d4ed8;background:#eef4ff;border-radius:12px;padding:18px 10px;">${kode}</div>
            <p style="margin:18px 0 0;font-size:13px;color:#64748b;">Berlaku 10 menit.<br>
            Jika Bapak/Ibu tidak merasa melakukan permintaan ini, abaikan email ini dan hubungi admin.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
    });
    if (error) throw new Error(error.message);
  } catch (e: any) {
    return NextResponse.json(
      { error: `Gagal mengirim kode ke email baru: ${e.message}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, kanal: "EMAIL", email_masked: maskEmail(emailBaru) });
}
