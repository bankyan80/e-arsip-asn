# PRD — Sistem Arsip Dokumen ASN (Telegram Bot + Web Dashboard Admin)

Dokumen ini adalah panduan acuan pembangunan aplikasi. Salinan dari prompt yang diberikan user.

## 1. KONSEP UTAMA
Aplikasi untuk mengumpulkan, mengelola, memvalidasi, dan menyimpan dokumen arsip ASN.
- ASN tidak login ke website. Interaksi utama via Telegram Bot.
- Alur: buka Telegram → identifikasi NIP → pilih jenis dokumen → kirim dokumen (foto/PDF) → sistem otomatis ubah foto menjadi PDF / gabungkan beberapa foto jadi satu PDF → simpan berdasarkan NIP & jenis dokumen → konfirmasi.
- Website khusus admin/operator untuk memantau dan mengelola arsip.

## 2. TELEGRAM BOT
- `/start` → minta NIP. Cocokkan dengan database. Jika ditemukan tampilkan Nama/NIP/Unit Kerja + menu. Jika tidak: pesan NIP tidak ditemukan.

## 3. IDENTITAS TELEGRAM
- Simpan telegram_user_id, telegram_chat_id, NIP, nama, tanggal_verifikasi.
- Satu NIP hanya terkait satu akun Telegram terverifikasi. Ada mekanisme reset/verifikasi ulang oleh admin.

## 4. MENU UTAMA ASN (Inline Keyboard)
👤 Data Saya | 📁 Upload Arsip | 📂 Arsip Saya | 📊 Kelengkapan Arsip | 🔄 Perbarui Dokumen | ❓ Bantuan

## 5. MENU DATA SAYA
Tampilkan Nama, NIP, Pangkat/Golongan, Jabatan, Unit Kerja, Status (PNS/PPPK/Lainnya). Tombol Perbarui Data (terbatas) & Kembali.

## 6. MENU UPLOAD ARSIP
Daftar jenis dokumen (SK Pengangkatan, SK Pangkat, SK Jabatan, SK PPPK, Perjanjian Kerja, Ijazah, Sertifikat, KTP, Kartu Keluarga, Dokumen lainnya, dll).
Jenis dokumen dikelola admin: tambah/ubah/hapus, wajib/tidak, berlaku PNS/PPPK.

## 7. INSTRUKSI UPLOAD
Setelah pilih jenis dokumen: pesan instruksi (PDF disarankan, foto tetap bisa). Tombol Batal.

## 8. JIKA PDF
Validasi file → ukuran → simpan → hubungkan NIP → metadata → tandai tersedia. Nama file: `NIP_JENIS_TANGGAL.pdf`. Jangan pakai nama file asli.

## 9. JIKA FOTO (fitur utama)
Deteksi JPG/JPEG/PNG/WEBP. Pesan konfirmasi. Pipeline: download dari Telegram → validasi gambar → perbaikan orientasi → crop → perbaikan perspektif → optimasi → konversi ke PDF → simpan.

## 10. BEBERAPA FOTO SATU PDF
Session upload. Foto 1 = halaman 1, dst. Setiap foto: pesan "Foto halaman N diterima". Tombol: ➕ Tambah Halaman, ✅ Selesai, ❌ Batalkan. Jangan langsung buat PDF setelah foto pertama.

## 11. URUTAN HALAMAN
Pertahankan urutan. Tampilkan "📑 N halaman telah diterima." Sebelum finalisasi: 👁️ Pratinjau | 🔄 Ulangi | ✅ Simpan PDF.

## 12. PEMROSESAN FOTO
Pertahankan kualitas, orientasi mengikuti dokumen, ukuran halaman sesuai (A4 jika bisa), teks terbaca, tanpa watermark kecuali diaktifkan admin. Gunakan library stabil (Sharp, PDFKit, pdf-lib, dll).

## 13. OCR OPSIONAL
Fitur tambahan, bisa diaktifkan/nonaktifkan admin. Baca NIP/Nama/Nomor SK/Tanggal. Hanya untuk validasi, jangan mengubah isi dokumen. Jika NIP berbeda → peringatan + tombol Tetap Simpan / Batalkan.

## 14. VALIDASI DOKUMEN
PDF benar-benar PDF, tidak rusak, ukuran wajar, halaman > 0, MIME benar, terhubung NIP benar. Jika gagal: pesan gagal diproses.

## 15. PENAMAAN FILE
`[NIP]_[JENIS_DOKUMEN]_[TIMESTAMP].pdf`. Versi: `_v2_`. Jangan hapus dokumen lama otomatis. Gunakan versioning.

## 16. UPDATE DOKUMEN
Jika sudah ada dokumen: tampilkan info lama + tombol Ganti / Pertahankan / Batal. Dokumen lama tetap tersimpan sebagai versi sebelumnya.

## 17. MENU ARSIP SAYA
Daftar dokumen dengan status ✅/❌. Klik dokumen: status, upload, versi + tombol Lihat/Unduh/Perbarui.

## 18. STATUS KELENGKAPAN
Progress bar % + daftar dokumen ada/kurang + tombol Lengkapi Arsip.

## 19. DASHBOARD ADMIN WEB
Next.js/React + Tailwind + Node.js API + SQL DB + Telegram API. Responsive. Menu: Dashboard, Data ASN, Arsip Dokumen, Kelengkapan, Jenis Dokumen, Notifikasi, Admin, Pengaturan.

## 20. DASHBOARD UTAMA
Kartu statistik: Total ASN, Total Dokumen, ASN Lengkap, ASN Belum Lengkap, Dokumen Hari Ini, Dokumen Menunggu Verifikasi. Grafik: kelengkapan, upload per bulan, ASN per status, jenis dokumen terbanyak.

## 21. DATA ASN
Tabel: No, NIP, Nama, Status, Jabatan, Unit Kerja, Telegram, Kelengkapan, Aksi. Search + filter status/unit/kelengkapan. Modal detail.

## 22. DETAIL ASN
Profil, Nama, NIP, Status, Pangkat, Jabatan, Unit Kerja, Telegram status + Daftar arsip dengan status.

## 23. VERIFIKASI ADMIN
Status dokumen: Menunggu Verifikasi / Disetujui / Ditolak. Penolakan wajib ada alasan → bot kirim pesan + tombol Upload Ulang.

## 24. NOTIFIKASI OTOMATIS
Dokumen diterima/terkonversi/disetujui/ditolak/kurang/pengingat/pengumuman. Bisa diaktifkan/nonaktifkan per jenis.

## 25. PENGINGAT OTOMATIS
Scheduler (misal Senin 08.00): cari ASN belum lengkap → kirim daftar dokumen kurang.

## 26. PENYIMPANAN
Database (metadata) terpisah dari Storage (file). Metadata: id, nip, jenis_dokumen, nama_file, storage_path, mime_type, ukuran_file, jumlah_halaman, versi, status, tanggal_upload, tanggal_verifikasi, verified_by, catatan, telegram_file_id, created_at, updated_at. Telegram hanya jalur penerimaan, bukan penyimpanan utama.

## 27. STRUKTUR FOLDER STORAGE
`/arsip-asn/[NIP]/[jenis-dokumen]/[tahun]/NIP_JENIS_TANGGAL.pdf`

## 28. KEAMANAN
HTTPS, auth admin, role-based authorization, validasi Telegram User ID & NIP, dokumen tidak publik, signed URL / private storage, audit log, pembatasan ukuran, validasi MIME & ekstensi, sanitasi nama file, rate limiting, proteksi webhook, token hanya di server, backup DB & dokumen.

## 29. ROLE ADMIN
SUPER ADMIN (semua), ADMIN (data, dokumen, verifikasi, laporan), OPERATOR (lihat & proses dokumen, tidak ubah konfigurasi).

## 30. AUDIT LOG
Catat: LOGIN, UPLOAD, UPDATE, DELETE, DOWNLOAD, VIEW, VERIFY, REJECT, CHANGE DATA. Contoh: tanggal, admin, aksi, NIP, dokumen, status.

## 31. DOWNLOAD DOKUMEN
Single dokumen, semua dokumen satu ASN, per jenis, per unit kerja. Opsi ZIP. Storage tidak publik.

## 32. EXPORT DATA
Excel/CSV/PDF: daftar ASN, status kelengkapan, daftar dokumen, laporan upload, laporan verifikasi.

## 33. BOT COMMAND
/start /menu /profil /arsip /upload /status /bantuan. Prioritaskan tombol.

## 34. SESSION UPLOAD
upload_session_id berisi telegram_user_id, NIP, jenis_dokumen, jumlah_foto, daftar_file_id, status. Semua foto masuk ke session yang sama, "Selesai" → semua jadi satu PDF → session ditutup.

## 35. PENANGANAN ERROR
File terlalu besar, gambar tidak jelas, PDF rusak, koneksi storage gagal → pesan ramah. Admin dapat notifikasi error.

## 36. PENGALAMAN PENGGUNA
Minim form. Prioritas: Pilih menu → Pilih jenis → Kirim foto/PDF → Selesai. Metadata diambil otomatis dari DB.

## 37. FITUR TAMBAHAN
Scan Dokumen, Multi-page PDF, OCR, Progress kelengkapan, Reminder otomatis, Versioning, Private storage, Catatan verifikasi, Audit log, ZIP download, Statistik. Modular & bisa dinonaktifkan.

## 38. ARSITEKTUR
ASN → Telegram → Bot API → Webhook → Backend Node.js → Database + Document Processor (Image→PDF) + Private Storage + Admin Dashboard. Admin → Web Dashboard → Backend API → DB + Storage.

## 39. HAL YANG DIHINDARI
Meminta login website, data berulang, token di frontend, Telegram sebagai DB utama, storage publik, hapus dokumen tanpa versioning, menolak foto, memaksa ASN membuat PDF, menu berlebihan, command manual, mengubah isi dokumen dari OCR.

## 40. HASIL AKHIR
Alur lengkap: Telegram → NIP sekali → Upload Arsip → pilih jenis → kirim foto → halaman berikutnya → Selesai → gabung → PDF → simpan aman → metadata → konfirmasi → admin verifikasi di dashboard → ASN terima hasil via Telegram.

Prioritas: Kemudahan ASN, Keamanan, Keandalan upload, Otomatisasi foto→PDF, Kemudahan admin, Performa, Mobile-friendly.