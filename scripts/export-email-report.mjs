import fs from "fs";
import { neon } from "@neondatabase/serverless";

const envFile = fs.readFileSync(".env.local", "utf8");
for (const line of envFile.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const sql = neon(process.env.DATABASE_URL);

function fmtWaktu(iso) {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "full", timeStyle: "medium" });
}

async function main() {
  const rows = await sql(
    `SELECT n.id, n.nip, n.email_to, n.judul, n.status, n.error, n.created_at, a.nama
     FROM notifications n LEFT JOIN asn a ON a.id = n.asn_id
     WHERE n.tipe = 'PENGINGAT_EMAIL'
     ORDER BY n.created_at ASC`
  );

  const sent = rows.filter((r) => r.status === "SENT");
  const failed = rows.filter((r) => r.status === "FAILED");

  const lines = [];
  lines.push("=================================================================");
  lines.push("           LAPORAN ISI EMAIL PENGINGAT - e-ARSIP ASN");
  lines.push("           Dibuat: " + fmtWaktu(new Date().toISOString()));
  lines.push("=================================================================");
  lines.push("");
  lines.push("1. ISI EMAIL YANG DIKIRIM");
  lines.push("-----------------------------------------------------------------");
  lines.push("Subjek  : Himbauan Melengkapi Arsip Dokumen - e-ARSIP ASN");
  lines.push("Pengirim: " + (process.env.EMAIL_FROM || "(sesuai konfigurasi Resend)"));
  lines.push("");
  lines.push("--- Isi Email ---");
  lines.push("");
  lines.push("Halo [Nama ASN],");
  lines.push("");
  lines.push("Kami mengimbau Anda untuk segera melengkapi arsip dokumen");
  lines.push("kepegawaian Anda melalui sistem e-ARSIP ASN.");
  lines.push("Dokumen yang belum tersedia:");
  lines.push("  - [daftar dokumen yang belum diunggah, disesuaikan per pegawai]");
  lines.push("");
  lines.push("Silakan lengkapi dokumen dengan mengupload ke https://t.me/ArsipASN_bot");
  lines.push("dengan cara");
  lines.push("");
  lines.push("1. Verifikasi Awal (sekali saja)");
  lines.push("   1. Buka https://t.me/ArsipASN_bot -> tekan START");
  lines.push("   2. Bot minta NIP -> ketik NIP Anda (contoh: 198007212014062003)");
  lines.push("   3. Jika NIP terdaftar di database, akun Telegram langsung tertaut dan menu utama muncul");
  lines.push("");
  lines.push("2. Menu Utama (tombol inline)");
  lines.push("   Menu                    Fungsi");
  lines.push("   👤 Data Saya            Lihat data kepegawaian (nama, pangkat, jabatan, unit kerja)");
  lines.push("   📁 Upload Arsip         Unggah dokumen baru — pilih jenis dokumen (⭐ = wajib)");
  lines.push("   📂 Arsip Saya           Lihat daftar dokumen + unduh PDF / buka di Drive");
  lines.push("   📊 Kelengkapan Arsip    Progress bar % kelengkapan dokumen");
  lines.push("   🔄 Perbarui Dokumen     Ganti dokumen lama dengan versi baru");
  lines.push("   ❓ Bantuan              Panduan singkat");
  lines.push("");
  lines.push("3. Cara Upload Dokumen");
  lines.push("   1. Pilih 📁 Upload Arsip -> pilih jenis dokumen");
  lines.push("   2. Kirim file PDF (langsung tersimpan), atau foto halaman demi halaman");
  lines.push("   3. Untuk multi-halaman: kirim foto berurutan -> tekan ➕ Tambah Halaman atau ✅ Selesai");
  lines.push("   4. Foto otomatis digabung jadi 1 PDF -> tekan ✅ Simpan PDF");
  lines.push("   5. Dokumen masuk status ⏳ Menunggu verifikasi admin");
  lines.push("");
  lines.push("4. Perintah Teks");
  lines.push("   /menu /profil /upload /arsip /status /bantuan /batal");
  lines.push("   Batas ukuran file: 15 MB. Format: PDF, JPG, PNG, WEBP.");
  lines.push("");
  lines.push("Terima kasih.");
  lines.push("");
  lines.push("--- Footer Email ---");
  lines.push("e-ARSIP ASN -- Sistem Arsip Digital ASN");
  lines.push("");

  lines.push("");
  lines.push("2. RINGKASAN PENGIRIMAN");
  lines.push("-----------------------------------------------------------------");
  lines.push(`Total percobaan kirim : ${rows.length}`);
  lines.push(`Berhasil terkirim     : ${sent.length}`);
  lines.push(`Gagal                 : ${failed.length}`);
  if (failed.length > 0) {
    const quotaFail = failed.filter((r) => (r.error || "").includes("quota")).length;
    lines.push(`  - Gagal kuota harian Resend : ${quotaFail}`);
    lines.push(`  - Gagal lainnya             : ${failed.length - quotaFail}`);
  }
  lines.push(`Waktu pengiriman      : ${fmtWaktu(rows[0].created_at)} s/d ${fmtWaktu(rows[rows.length - 1].created_at)} (WIB)`);
  lines.push("");

  lines.push("");
  lines.push("3. DAFTAR EMAIL BERHASIL TERKIRIM (" + sent.length + " penerima)");
  lines.push("-----------------------------------------------------------------");
  sent.forEach((r, i) => {
    lines.push(`${String(i + 1).padStart(3)}. ${r.nama || "-"} | NIP: ${r.nip} | ${r.email_to} | ${fmtWaktu(r.created_at)}`);
  });
  lines.push("");

  lines.push("");
  lines.push("4. DAFTAR EMAIL GAGAL TERKIRIM (" + failed.length + " penerima)");
  lines.push("-----------------------------------------------------------------");
  failed.forEach((r, i) => {
    lines.push(`${String(i + 1).padStart(3)}. ${r.nama || "-"} | NIP: ${r.nip} | ${r.email_to}`);
    lines.push(`     Alasan: ${r.error || "-"}`);
    lines.push(`     Waktu : ${fmtWaktu(r.created_at)}`);
  });
  lines.push("");
  lines.push("=================================================================");
  lines.push("AKHIR LAPORAN");
  lines.push("=================================================================");

  fs.writeFileSync("laporan-email-pengingat.txt", lines.join("\n"), "utf8");
  console.log("OK: laporan-email-pengingat.txt dibuat. SENT=" + sent.length + ", FAILED=" + failed.length);
}

main().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
