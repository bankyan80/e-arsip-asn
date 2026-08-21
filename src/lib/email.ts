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
  const botUrl = "https://t.me/ArsipASN_bot";
  const body = `
    <p>Halo <b>${escapeHtml(nama)}</b>,</p>
    <p>Kami mengimbau Anda untuk segera melengkapi arsip dokumen kepegawaian Anda melalui sistem
    <b>${escapeHtml(env.appName)}</b>.</p>
    <p><b>Dokumen yang belum tersedia:</b></p>
    <ul style="margin-top:4px;padding-left:20px;">${list}</ul>
    <p>Silakan lengkapi dokumen dengan mengupload ke
    <a href="${botUrl}" style="color:#2563eb;font-weight:bold;">${botUrl}</a> dengan cara:</p>

    <div style="text-align:center;margin:24px 0;">
      <a href="${botUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:bold;font-size:16px;">📁 Buka Bot e-ARSIP ASN</a>
    </div>

    <h3 style="margin:20px 0 8px;font-size:15px;color:#111827;">1. Verifikasi Awal (sekali saja)</h3>
    <ol style="margin:0;padding-left:20px;">
      <li>Buka <a href="${botUrl}" style="color:#2563eb;">${botUrl}</a> &rarr; tekan <b>START</b></li>
      <li>Bot minta NIP &rarr; ketik NIP Anda</li>
      <li>Jika NIP terdaftar di database, akun Telegram langsung tertaut dan menu utama muncul</li>
    </ol>

    <h3 style="margin:20px 0 8px;font-size:15px;color:#111827;">2. Menu Utama (tombol inline)</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr style="background:#f3f4f6;">
        <th style="border:1px solid #e5e7eb;padding:8px;text-align:left;width:45%;">Menu</th>
        <th style="border:1px solid #e5e7eb;padding:8px;text-align:left;">Fungsi</th>
      </tr>
      <tr><td style="border:1px solid #e5e7eb;padding:8px;">👤 Data Saya</td><td style="border:1px solid #e5e7eb;padding:8px;">Lihat data kepegawaian (nama, pangkat, jabatan, unit kerja)</td></tr>
      <tr><td style="border:1px solid #e5e7eb;padding:8px;">📁 Upload Arsip</td><td style="border:1px solid #e5e7eb;padding:8px;">Unggah dokumen baru &mdash; pilih jenis dokumen (&#11088; = wajib)</td></tr>
      <tr><td style="border:1px solid #e5e7eb;padding:8px;">📂 Arsip Saya</td><td style="border:1px solid #e5e7eb;padding:8px;">Lihat daftar dokumen + unduh PDF / buka di Drive</td></tr>
      <tr><td style="border:1px solid #e5e7eb;padding:8px;">📊 Kelengkapan Arsip</td><td style="border:1px solid #e5e7eb;padding:8px;">Progress bar % kelengkapan dokumen</td></tr>
      <tr><td style="border:1px solid #e5e7eb;padding:8px;">🔄 Perbarui Dokumen</td><td style="border:1px solid #e5e7eb;padding:8px;">Ganti dokumen lama dengan versi baru</td></tr>
      <tr><td style="border:1px solid #e5e7eb;padding:8px;">❓ Bantuan</td><td style="border:1px solid #e5e7eb;padding:8px;">Panduan singkat</td></tr>
    </table>

    <h3 style="margin:20px 0 8px;font-size:15px;color:#111827;">3. Cara Upload Dokumen</h3>
    <ol style="margin:0;padding-left:20px;">
      <li>Pilih 📁 <b>Upload Arsip</b> &rarr; pilih jenis dokumen</li>
      <li>Kirim file PDF (langsung tersimpan), atau foto halaman demi halaman</li>
      <li>Untuk multi-halaman: kirim foto berurutan &rarr; tekan ➕ Tambah Halaman atau ✅ Selesai</li>
      <li>Foto otomatis digabung jadi 1 PDF &rarr; tekan ✅ Simpan PDF</li>
      <li>Dokumen masuk status ⏳ Menunggu verifikasi admin</li>
    </ol>

    <h3 style="margin:20px 0 8px;font-size:15px;color:#111827;">4. Perintah Teks</h3>
    <p style="margin:0;"><code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">/menu</code>
    <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">/profil</code>
    <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">/upload</code>
    <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">/arsip</code>
    <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">/status</code>
    <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">/bantuan</code>
    <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">/batal</code></p>
    <p style="font-size:13px;color:#6b7280;margin-top:8px;">Batas ukuran file: 15 MB. Format: PDF, JPG, PNG, WEBP.</p>

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