import { Resend } from "resend";
import { env } from "./env";
import { query } from "./db";
import { isNotifEnabled } from "./notifications";

export interface EmailOptions {
  to: string;
  asnId?: number;
  nip?: string;
  tipe: string;
  judul?: string;
  subject: string;
  html: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function baseLayout(judul: string, body: string): string {
  const appName = escapeHtml(env.appName);
  return `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#2563eb;padding:20px 28px;color:#ffffff;">
        <h1 style="margin:0;font-size:18px;font-weight:700;">${escapeHtml(judul)}</h1>
      </div>
      <div style="padding:28px;color:#374151;font-size:15px;line-height:1.6;">${body}</div>
      <div style="background:#f9fafb;padding:16px 28px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;">
        ${appName} &mdash; Sistem Arsip Digital ASN
      </div>
    </div>
  </body>
</html>`;
}

export async function sendEmail(opts: EmailOptions): Promise<boolean> {
  const enabled = await isNotifEnabled(opts.tipe);
  if (!enabled) return false;

  const apiKey = env.resendApiKey;
  if (!apiKey) {
    await query(
      `INSERT INTO notifications (tipe, asn_id, nip, email_to, judul, pesan, status, error)
       VALUES ($1,$2,$3,$4,$5,$6,'FAILED',$7)`,
      [opts.tipe, opts.asnId ?? null, opts.nip ?? null, opts.to, opts.judul ?? null, opts.subject, "RESEND_API_KEY belum diset"]
    );
    return false;
  }

  const resend = new Resend(apiKey);
  try {
    const { data, error } = await resend.emails.send({
      from: env.emailFrom,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) throw new Error(error.message);
    await query(
      `INSERT INTO notifications (tipe, asn_id, nip, email_to, judul, pesan, status)
       VALUES ($1,$2,$3,$4,$5,$6,'SENT')`,
      [opts.tipe, opts.asnId ?? null, opts.nip ?? null, opts.to, opts.judul ?? null, opts.subject]
    );
    return true;
  } catch (e: any) {
    await query(
      `INSERT INTO notifications (tipe, asn_id, nip, email_to, judul, pesan, status, error)
       VALUES ($1,$2,$3,$4,$5,$6,'FAILED',$7)`,
      [opts.tipe, opts.asnId ?? null, opts.nip ?? null, opts.to, opts.judul ?? null, opts.subject, e.message]
    );
    return false;
  }
}

export async function sendReminderEmail(
  nama: string,
  email: string,
  asnId: number,
  nip: string,
  daftarKurang: string[]
): Promise<boolean> {
  const list = daftarKurang.map((x) => `<li>${escapeHtml(x)}</li>`).join("");
  const body = `
    <p>Halo <b>${escapeHtml(nama)}</b>,</p>
    <p>Kami mengimbau Anda untuk segera melengkapi arsip dokumen kepegawaian Anda melalui sistem
    <b>${escapeHtml(env.appName)}</b>.</p>
    <p>Dokumen yang belum tersedia:</p>
    <ul>${list}</ul>
    <p>Silakan hubungi operator sekolah atau admin untuk melengkapi berkas tersebut.</p>
    <p>Terima kasih.</p>`;
  return sendEmail({
    to: email,
    asnId,
    nip,
    tipe: "PENGINGAT_EMAIL",
    judul: "Himbauan Melengkapi Arsip Dokumen",
    subject: `Himbauan Melengkapi Arsip Dokumen - ${env.appName}`,
    html: baseLayout("Himbauan Melengkapi Arsip Dokumen", body),
  });
}