import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db";
import bcrypt from "bcryptjs";
import * as tg from "@/lib/telegram";
import { env } from "@/lib/env";
import { generateOtp, maskEmail } from "@/lib/asn-auth";
import type { ASN } from "@/lib/types";

export const runtime = "nodejs";

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 60_000;

export async function POST(request: NextRequest) {
  const { nip, kanal } = await request.json().catch(() => ({}));
  if (!nip) {
    return NextResponse.json({ error: "NIP wajib diisi" }, { status: 400 });
  }
  const kanalReq =
    kanal === "TELEGRAM" || kanal === "EMAIL" ? kanal : "AUTO";

  const last = cooldowns.get(String(nip));
  if (last && Date.now() - last < COOLDOWN_MS) {
    return NextResponse.json(
      { error: "Tunggu sebentar sebelum meminta kode baru." },
      { status: 429 }
    );
  }
  cooldowns.set(String(nip), Date.now());

  const asn = await queryOne<ASN>(`SELECT * FROM asn WHERE nip = $1 LIMIT 1`, [String(nip)]);
  if (!asn) {
    // Respons generik: jangan bocorkan NIP yang terdaftar
    return NextResponse.json(
      { error: "NIP tidak ditemukan. Pastikan NIP sesuai data kepegawaian atau hubungi admin." },
      { status: 404 }
    );
  }

  const kode = generateOtp();
  const kodeHash = await bcrypt.hash(kode, 10);
  await query(`DELETE FROM asn_login_otp WHERE nip = $1 AND terpakai = false`, [asn.nip]);

  let viaTelegram = false;
  let viaEmail: string | null = null;
  const errors: string[] = [];

  const kirimTelegram = async (): Promise<boolean> => {
    if (!asn.telegram_chat_id) {
      errors.push("telegram: belum terhubung");
      return false;
    }
    try {
      await tg.sendMessage(
        asn.telegram_chat_id,
        `🔐 <b>Kode Login ${env.appName}</b>\n\n` +
          `Kode Anda: <code>${kode}</code>\n\n` +
          `Berlaku 10 menit. Jangan bagikan kode ini kepada siapa pun.`,
        { disable_notification: false }
      );
      return true;
    } catch (e: any) {
      errors.push(`telegram: ${e.message}`);
      return false;
    }
  };

  const kirimEmail = async (): Promise<boolean> => {
    if (!asn.email) {
      errors.push("email: tidak terdaftar");
      return false;
    }
    if (!env.resendApiKey) {
      errors.push("email: layanan email belum tersedia");
      return false;
    }
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(env.resendApiKey);
      const { error } = await resend.emails.send({
        from: env.emailFrom,
        to: asn.email,
        subject: `Kode Login - ${env.appName}`,
        html: `
<!DOCTYPE html>
<html lang="id">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#263238;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6fb;">
      <tr><td align="center" style="padding:30px 10px;">
        <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 5px 25px rgba(0,0,0,0.06);">
          <tr><td align="center" style="background:linear-gradient(135deg,#4338ca,#2563eb);padding:30px;color:#ffffff;">
            <h1 style="margin:0;font-size:22px;">&#128274; Kode Login</h1>
            <p style="margin:6px 0 0;font-size:13px;opacity:.9;">${env.appName}</p>
          </td></tr>
          <tr><td align="center" style="padding:35px 30px;">
            <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">Gunakan kode berikut untuk masuk ke portal ASN:</p>
            <div style="font-size:38px;font-weight:700;letter-spacing:10px;color:#1d4ed8;background:#eef4ff;border-radius:12px;padding:18px 10px;">${kode}</div>
            <p style="margin:18px 0 0;font-size:13px;color:#64748b;">Berlaku 10 menit.<br>Jangan bagikan kode ini kepada siapa pun.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
      });
      if (error) throw new Error(error.message);
      viaEmail = maskEmail(asn.email);
      return true;
    } catch (e: any) {
      errors.push(`email: ${e.message}`);
      return false;
    }
  };

  // Simpan OTP hanya bila minimal satu kanal berhasil dipakai.
  // Untuk kanal eksplisit, validasi ketersediaan lebih dulu sebelum insert.
  if (kanalReq === "TELEGRAM") {
    if (!asn.telegram_chat_id) {
      return NextResponse.json(
        { error: "Telegram belum terhubung untuk NIP ini. Silakan pilih Email atau hubungi admin." },
        { status: 400 }
      );
    }
  } else if (kanalReq === "EMAIL") {
    if (!asn.email || !env.resendApiKey) {
      return NextResponse.json(
        { error: "Email tidak terdaftar atau layanan email belum tersedia. Silakan pilih Telegram atau hubungi admin." },
        { status: 400 }
      );
    }
  }

  await query(
    `INSERT INTO asn_login_otp (nip, kode_hash, kanal, kadaluarsa_at)
     VALUES ($1, $2, $3, now() + interval '10 minutes')`,
    [asn.nip, kodeHash, kanalReq === "AUTO" ? (asn.telegram_chat_id ? "TELEGRAM" : "EMAIL") : kanalReq]
  );

  if (kanalReq === "TELEGRAM") {
    viaTelegram = await kirimTelegram();
  } else if (kanalReq === "EMAIL") {
    await kirimEmail();
  } else {
    // AUTO: Telegram dulu, email sebagai cadangan
    if (!(await kirimTelegram())) {
      await kirimEmail();
    }
  }

  if (!viaTelegram && !viaEmail) {
    return NextResponse.json(
      {
        error:
          "Gagal mengirim kode melalui kanal yang tersedia. Silakan hubungkan akun Telegram melalui bot e-ARSIP ASN atau hubungi admin/pengelola.",
        detail: errors.join("; ") || undefined,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    telegram: viaTelegram,
    email: viaEmail,
    nama: asn.nama,
  });
}
