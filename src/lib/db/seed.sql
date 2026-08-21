-- ============================================================
-- e-ARSIP ASN — Master Data Seed
-- Idempotent: INSERT ... ON CONFLICT DO NOTHING
-- ============================================================

INSERT INTO jenis_dokumen (kode, nama, deskripsi, kategori, wajib, berlaku_pns, berlaku_pppk, urutan) VALUES
  ('SK_PENGANGKATAN',   'SK Pengangkatan',   'Surat Keputusan Pengangkatan',            'Kepegawaian', true,  true,  true,  1),
  ('SK_PANGKAT',        'SK Pangkat',        'Surat Keputusan Kenaikan Pangkat',        'Kepegawaian', true,  true,  false, 2),
  ('SK_JABATAN',        'SK Jabatan',        'Surat Keputusan Pengangkatan Jabatan',    'Kepegawaian', true,  true,  true,  3),
  ('SK_PPPK',           'SK PPPK',           'Surat Keputusan Pengangkatan PPPK',       'Kepegawaian', false, false, true,  4),
  ('PERJANJIAN_KERJA',  'Perjanjian Kerja',  'Perjanjian Kerja',                        'Kepegawaian', false, false, true,  5),
  ('IJAZAH',            'Ijazah',            'Ijazah pendidikan terakhir',              'Pendidikan',  true,  true,  true,  6),
  ('IJAZAH_S1',         'Ijazah S1',         'Ijazah Sarjana (S1)',                     'Pendidikan',  false, true,  true,  7),
  ('IJAZAH_S2',         'Ijazah S2',         'Ijazah Magister (S2)',                    'Pendidikan',  false, true,  true,  8),
  ('IJAZAH_S3',         'Ijazah S3',         'Ijazah Doktor (S3)',                      'Pendidikan',  false, true,  true,  9),
  ('SERTIFIKAT',        'Sertifikat',        'Sertifikat pendukung (diklat, profesi, dsb.)', 'Pendidikan', false, true, true, 10),
  ('KTP',               'KTP',               'Kartu Tanda Penduduk',                    'Kependudukan', true,  true,  true,  11),
  ('KARTU_KELUARGA',    'Kartu Keluarga',    'Kartu Keluarga',                          'Kependudukan', true,  true,  true,  12),
  ('KARPEG',            'Kartu Pegawai',     'Kartu Pegawai (KARPEG)',                  'Kepegawaian', false, true,  false, 13),
  ('KARIS_KARSU',       'KARIS/KARSU',       'Kartu Istri/Suami Pegawai',               'Kepegawaian', false, true,  false, 14),
  ('NPWP',              'NPWP',              'Nomor Pokok Wajib Pajak',                  'Kependudukan', false, true,  true,  15),
  ('BPJS',              'BPJS',              'Kartu BPJS Kesehatan/Ketenagakerjaan',     'Kependudukan', false, true,  true,  16),
  ('SK_CPNS',           'SK CPNS',           'Surat Keputusan CPNS',                     'Kepegawaian', false, true,  false, 17),
  ('SK_KGB',            'SK KGB',            'SK Kenaikan Gaji Berkala',                 'Kepegawaian', false, true,  false, 18),
  ('SK_TASJEN',         'SK TASJEN',         'SK Tunjangan Struktural/Jabatan',          'Kepegawaian', false, true,  false, 19),
  ('DOKUMEN_LAINNYA',   'Dokumen Lainnya',   'Dokumen kepegawaian lainnya',              'Lainnya',     false, true,  true,  99),
  ('SKP',               'SKP',               'Sasaran Kinerja Pegawai / RHK',            'Kinerja',     false, true,  true,  20),
  ('PKG',               'PKG',               'Penilaian Kinerja Guru',                   'Kinerja',     false, true,  false, 21),
  ('PKKS',              'PKKS',              'Penilaian Kinerja Kepala Sekolah',         'Kinerja',     false, true,  false, 22),
  ('PAK',               'PAK',               'Penilaian Angka Kredit',                   'Kinerja',     false, true,  false, 23),
  ('JABFUNG',           'Jabatan Fungsional','SK Jabatan Fungsional',                    'Kepegawaian', false, true,  false, 24),
  ('SK_PNS',            'SK PNS',            'SK Kepegawaian PNS (lainnya)',             'Kepegawaian', false, true,  false, 25),
  ('AKTA_NIKAH',        'Akta Nikah',        'Akta/Buku Nikah',                          'Kependudukan', false, true, true,  26),
  ('AKTA_KELAHIRAN',    'Akta Kelahiran',    'Akta Kelahiran (sendiri/keluarga)',        'Kependudukan', false, true, true,  27),
  ('TRANSKRIP',         'Transkrip Nilai',   'Transkrip nilai pendidikan',               'Pendidikan',  false, true,  true,  28),
  ('FOTO',              'Foto',              'Foto pegawai / pas foto',                  'Lainnya',     false, true,  true,  29),
  ('NIP_BARU',          'Kartu NIP Baru',    'Kartu NIP baru',                           'Kepegawaian', false, true,  false, 30),
  ('REKENING',          'Rekening Bank',     'Buku/surat rekening bank',                 'Kependudukan', false, true, true,  31),
  ('SERDIK',            'Serdik',            'Surat tugas/pengesahan pendidikan & pelatihan', 'Lainnya', false, true, false, 32)
ON CONFLICT (kode) DO NOTHING;

INSERT INTO notifikasi_config (kunci, nama, aktif, deskripsi) VALUES
  ('DOKUMEN_DITERIMA',   'Dokumen Diterima',      true,  'Notifikasi saat dokumen berhasil diterima sistem'),
  ('DOKUMEN_KONVERSI',   'Dokumen Terkonversi',   true,  'Notifikasi saat foto berhasil dikonversi menjadi PDF'),
  ('DOKUMEN_DISETUJUI',  'Dokumen Disetujui',     true,  'Notifikasi saat dokumen disetujui admin'),
  ('DOKUMEN_DITOLAK',    'Dokumen Ditolak',       true,  'Notifikasi saat dokumen ditolak admin (dengan alasan)'),
  ('PENGINGAT',          'Pengingat Kelengkapan', true,  'Pengingat otomatis untuk melengkapi arsip'),
  ('PENGINGAT_EMAIL',    'Pengingat Email',       true,  'Himbauan otomatis via email untuk melengkapi arsip'),
  ('PENGUMUMAN',         'Pengumuman',            true,  'Pengumuman/admin broadcast ke ASN'),
  ('ERROR',              'Notifikasi Error',      true,  'Notifikasi error sistem ke admin')
ON CONFLICT (kunci) DO NOTHING;

INSERT INTO settings (kunci, nilai, deskripsi) VALUES
  ('app_name', 'e-ARSIP ASN', 'Nama aplikasi'),
  ('max_file_size_mb', '15', 'Batas ukuran file (MB)'),
  ('ocr_enabled', 'false', 'Aktifkan OCR (0/1)'),
  ('watermark_enabled', 'false', 'Aktifkan watermark pada dokumen (0/1)'),
  ('auto_approve', 'false', 'Setujui otomatis dokumen masuk (0/1)'),
  ('reminder_day', '1', 'Hari pengingat mingguan (0=Senin)'),
  ('reminder_hour', '8', 'Jam pengingat (waktu lokal server)'),
  ('email_daily_limit', '90', 'Batas maksimal email himbauan per hari (kuota Resend 100/hari)'),
  ('reminder_interval_days', '7', 'Jarak minimal hari antar pengingat ke ASN yang sama'),
  ('drive_enabled', 'false', 'Gunakan Google Drive sebagai cadangan (0/1)')
ON CONFLICT (kunci) DO NOTHING;

-- Default admin user (password: admin123). Hash di-generate oleh script migrasi (bukan statis).
-- Script migrate-db.mjs akan mengisi baris berikut jika belum ada.
INSERT INTO users (username, password_hash, nama, role) VALUES
  ('admin', '$2a$10$placeholder', 'Administrator', 'SUPER ADMIN')
ON CONFLICT (username) DO NOTHING;