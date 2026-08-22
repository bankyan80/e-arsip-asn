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

function baseLayout(body: string): string {
  const appName = escapeHtml(env.appName);
  return `
<!DOCTYPE html>
<html lang="id">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#263238;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6fb;">
      <tr>
        <td align="center" style="padding:30px 10px;">
          <table width="650" cellpadding="0" cellspacing="0" style="max-width:650px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 5px 25px rgba(0,0,0,0.06);">
            <tr>
              <td align="center" style="background:linear-gradient(135deg,#4338ca,#2563eb);padding:35px 30px;color:#ffffff;">
                <div style="width:70px;height:70px;line-height:70px;background:rgba(255,255,255,0.15);border-radius:18px;margin:0 auto 15px;font-size:34px;text-align:center;">&#128193;</div>
                <h1 style="margin:0;font-size:26px;font-weight:700;">${appName}</h1>
                <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">Sistem Pengelolaan Arsip Kepegawaian ASN</p>
              </td>
            </tr>
            <tr>
              <td style="padding:35px 35px 20px;font-size:15px;line-height:1.6;">${body}</td>
            </tr>
            <tr>
              <td align="center" style="background:#f8fafc;padding:25px 30px;color:#64748b;font-size:12px;line-height:1.6;">
                <strong style="color:#334155;">${appName}</strong><br>
                Sistem Pengelolaan Arsip Kepegawaian ASN
                <br><br>
                Mohon tidak membalas email ini. Email ini dikirim sebagai pemberitahuan kepada ASN terkait kelengkapan arsip kepegawaian.
                <br><br>
                &copy; 2026 ${appName}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
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
  const botUrl = "https://t.me/ArsipASN_bot";
  const appUrl = `${env.appBaseUrl.replace(/\/$/, "")}/asn/login`;
  const daftarKurangBox =
    daftarKurang.length > 0
      ? `<div style="background:#eef4ff;border-left:5px solid #2563eb;border-radius:8px;padding:18px 20px;margin:25px 0;">
          <strong style="color:#1d4ed8;">&#128203; Dokumen yang belum dilengkapi:</strong>
          <ul style="margin:10px 0 0;padding-left:20px;font-size:14px;line-height:1.7;">${list}</ul>
        </div>`
      : "";
  const body = `
    <div style="font-size:16px;line-height:1.7;">
      Yth. Bapak/Ibu ${escapeHtml(nama)},
      <br><br>
      Dalam rangka meningkatkan tertib administrasi dan kelengkapan arsip kepegawaian, kami menghimbau
      Bapak/Ibu untuk melakukan pengecekan dan melengkapi arsip kepegawaian melalui <strong>${escapeHtml(env.appName)}</strong>.
    </div>

    <div style="background:#eef4ff;border-left:5px solid #2563eb;border-radius:8px;padding:18px 20px;margin:25px 0;">
      <strong style="color:#1d4ed8;">&#128204; Tidak perlu menunggu pengumpulan berkas secara manual.</strong>
      <br><br>
      Bapak/Ibu dapat melengkapi arsip secara mandiri menggunakan komputer maupun HP.
    </div>

    ${daftarKurangBox}

    <div style="font-size:19px;font-weight:700;margin:28px 0 12px;color:#172554;">
      &#10024; Lebih Mudah dan Praktis
    </div>

    <div style="padding:12px 0;border-bottom:1px solid #edf0f5;">
      <span style="font-size:20px;width:35px;display:inline-block;vertical-align:middle;">&#128241;</span>
      <span style="display:inline-block;vertical-align:middle;width:82%;font-size:14px;line-height:1.5;">
        <strong>Dapat diakses melalui HP</strong><br>Tidak harus menggunakan komputer.
      </span>
    </div>

    <div style="padding:12px 0;border-bottom:1px solid #edf0f5;">
      <span style="font-size:20px;width:35px;display:inline-block;vertical-align:middle;">&#128247;</span>
      <span style="display:inline-block;vertical-align:middle;width:82%;font-size:14px;line-height:1.5;">
        <strong>Scan atau foto dokumen</strong><br>Dokumen dapat dikirim dalam bentuk PDF maupun foto.
      </span>
    </div>

    <div style="padding:12px 0;border-bottom:1px solid #edf0f5;">
      <span style="font-size:20px;width:35px;display:inline-block;vertical-align:middle;">&#129302;</span>
      <span style="display:inline-block;vertical-align:middle;width:82%;font-size:14px;line-height:1.5;">
        <strong>Dokumen dibantu dikenali oleh sistem</strong><br>Sistem membantu mengenali jenis dokumen secara otomatis.
      </span>
    </div>

    <div style="padding:12px 0;border-bottom:1px solid #edf0f5;">
      <span style="font-size:20px;width:35px;display:inline-block;vertical-align:middle;">&#128203;</span>
      <span style="display:inline-block;vertical-align:middle;width:82%;font-size:14px;line-height:1.5;">
        <strong>Mengetahui dokumen yang masih kurang</strong><br>Sistem menampilkan daftar arsip yang belum dilengkapi.
      </span>
    </div>

    <div style="padding:12px 0;">
      <span style="font-size:20px;width:35px;display:inline-block;vertical-align:middle;">&#128172;</span>
      <span style="display:inline-block;vertical-align:middle;width:82%;font-size:14px;line-height:1.5;">
        <strong>Dapat melalui Telegram</strong><br>Dokumen dapat dikirim melalui Telegram Bot e-ARSIP ASN.
      </span>
    </div>

    <div align="center" style="text-align:center;background:#f8fafc;border-radius:12px;padding:25px 20px;margin:25px 0;">
      <strong>&#128193; Lengkapi Arsip Kepegawaian Anda</strong><br>
      Pastikan arsip Anda lengkap dan tersimpan dengan baik.<br>
      <a href="${appUrl}" target="_blank" style="display:inline-block;background:#2563eb;color:#ffffff !important;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:bold;margin-top:12px;">BUKA ${escapeHtml(env.appName).toUpperCase()}</a>
    </div>

    <div align="center" style="text-align:center;background:#f8fafc;border-radius:12px;padding:25px 20px;margin:25px 0;">
      <strong>&#128172; Lebih Praktis melalui Telegram?</strong><br>
      Kirim dokumen langsung melalui Telegram Bot e-ARSIP ASN.<br>
      <a href="${botUrl}" target="_blank" style="display:inline-block;background:#229ed9;color:#ffffff !important;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:bold;margin-top:12px;">BUKA TELEGRAM BOT</a>
    </div>

    <div style="font-size:13px;color:#64748b;line-height:1.6;margin-top:20px;">
      <strong>Perhatian:</strong><br>
      Mohon mengunggah dokumen yang benar, jelas, terbaca, dan sesuai dengan jenis dokumen yang diminta.
      Pastikan data pada dokumen sesuai dengan data kepegawaian Bapak/Ibu.
      <br><br>
      Apabila terdapat dokumen yang belum tersedia atau terdapat kendala dalam proses pengunggahan,
      silakan menghubungi admin/pengelola e-ARSIP ASN.
    </div>`;
  return sendEmail({
    to: email,
    asnId,
    nip,
    tipe: "PENGINGAT_EMAIL",
    judul: "Himbauan Melengkapi Arsip ASN",
    subject: `Himbauan Melengkapi Arsip ASN - ${env.appName}`,
    html: baseLayout(body),
  });
}