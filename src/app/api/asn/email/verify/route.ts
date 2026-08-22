import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getAsnSession } from "@/lib/asn-auth";
import { auditLog } from "@/lib/audit";
import { env } from "@/lib/env";

export const runtime = "nodejs";

interface EmailChangeRow {
  id: number;
  nip: string;
  email_baru: string;
  kode_hash: string;
  percobaan: number;
}

const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  const session = await getAsnSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { kode } = await request.json().catch(() => ({}));
  if (!kode) return NextResponse.json({ error: "Kode wajib diisi" }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";

  const row = await queryOne<EmailChangeRow>(
    `SELECT id, nip, email_baru, kode_hash, percobaan
     FROM asn_email_change
     WHERE asn_id = $1 AND terpakai = false AND kadaluarsa_at > now()
     ORDER BY id DESC LIMIT 1`,
    [session.asnId]
  );
  if (!row || row.nip !== session.nip) {
    return NextResponse.json(
      { error: "Kode tidak ditemukan atau sudah kedaluwarsa. Silakan minta kode baru." },
      { status: 400 }
    );
  }
  if (row.percobaan >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Percobaan melebihi batas. Silakan minta kode baru." },
      { status: 429 }
    );
  }

  const ok = await bcrypt.compare(String(kode), row.kode_hash);
  if (!ok) {
    await query(`UPDATE asn_email_change SET percobaan = percobaan + 1 WHERE id = $1`, [row.id]);
    return NextResponse.json(
      { error: `Kode salah. Sisa percobaan: ${Math.max(0, MAX_ATTEMPTS - (row.percobaan + 1))}.` },
      { status: 401 }
    );
  }

  await query(`UPDATE asn_email_change SET terpakai = true WHERE id = $1`, [row.id]);

  // Ambil email lama sebelum ditimpa, lalu kirim pemberitahuan best-effort
  const current = await queryOne<{ email: string | null }>(
    `SELECT email FROM asn WHERE id = $1 LIMIT 1`,
    [session.asnId]
  );
  const emailLama = current?.email?.trim().toLowerCase();
  if (emailLama && env.resendApiKey && emailLama !== row.email_baru) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(env.resendApiKey);
      await resend.emails.send({
        from: env.emailFrom,
        to: emailLama,
        subject: `Email Akun Diubah - ${env.appName}`,
        html: `
<!DOCTYPE html>
<html lang="id">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#263238;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6fb;">
      <tr><td align="center" style="padding:30px 10px;">
        <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 5px 25px rgba(0,0,0,0.06);">
          <tr><td align="center" style="background:linear-gradient(135deg,#4338ca,#2563eb);padding:30px;color:#ffffff;">
            <h1 style="margin:0;font-size:22px;">&#128274; Email Akun Diubah</h1>
            <p style="margin:6px 0 0;font-size:13px;opacity:.9;">${env.appName}</p>
          </td></tr>
          <tr><td style="padding:30px;font-size:14px;line-height:1.7;">
            <p style="margin:0;">Akun dengan NIP <b>${session.nip}</b> (${session.nama}) telah mengubah alamat email menjadi <b>${row.email_baru}</b>.</p>
            <p style="margin:14px 0 0;color:#64748b;">Jika Bapak/Ibu tidak merasa melakukan perubahan ini, segera hubungi admin/pengelola e-ARSIP ASN.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
      });
    } catch {
      // Best-effort: jangan gagalkan pergantian email bila notifikasi gagal
    }
  }

  await query(`DELETE FROM asn_email_change WHERE asn_id = $1`, [session.asnId]);
  await query(`UPDATE asn SET email = $1, updated_at = now() WHERE id = $2`, [
    row.email_baru,
    session.asnId,
  ]);

  await auditLog({
    aksi: "CHANGE_DATA",
    adminUsername: `ASN:${session.nip}`,
    nip: session.nip,
    namaAsn: session.nama,
    ipAddress: ip,
    detail: { portal: "ASN", aksi: "GANTI_EMAIL", email_lama: emailLama ?? null, email_baru: row.email_baru },
  });

  return NextResponse.json({ ok: true, email_baru: row.email_baru });
}
