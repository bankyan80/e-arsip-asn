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

-- ============================================================
-- MASTER DOKUMEN e-ARSIP ASN (Rule Engine)
-- ============================================================

-- 1) Master jenis dokumen tambahan
INSERT INTO jenis_dokumen (kode, nama, deskripsi, kategori, wajib, berlaku_pns, berlaku_pppk, urutan) VALUES
  -- Identitas
  ('KARTU_ASN',                   'Kartu ASN',                        'Kartu ASN / identitas kepegawaian',            'Identitas',    false, true, true,  40),
  ('DOK_PERUBAHAN_NAMA',          'Dok. Perubahan Nama',              'Dokumen perubahan nama jika ada',              'Identitas',    false, true, true,  41),
  ('DOK_PERUBAHAN_TTL',           'Dok. Perubahan TTL',               'Dokumen perubahan tempat/tanggal lahir',       'Identitas',    false, true, true,  42),
  ('DOK_PERUBAHAN_DATA',          'Dok. Perubahan Data Pribadi',      'Dokumen perubahan data pribadi lainnya',       'Identitas',    false, true, true,  43),
  -- Pendidikan
  ('IJAZAH_SEBELUMNYA',           'Ijazah Sebelumnya',                'Ijazah pendidikan sebelumnya yang relevan',    'Pendidikan',   false, true, true,  44),
  ('TRANSKRIP_SEBELUMNYA',        'Transkrip Sebelumnya',             'Transkrip pendidikan sebelumnya',              'Pendidikan',   false, true, true,  45),
  ('SERTIFIKAT_PROFESI',          'Sertifikat Profesi',               'Sertifikat profesi jika ada',                  'Pendidikan',   false, true, true,  46),
  ('SERTIFIKAT_KOMPETENSI',       'Sertifikat Kompetensi',            'Sertifikat kompetensi jika ada',               'Pendidikan',   false, true, true,  47),
  ('PENYETARAAN_IJAZAH',          'Penyetaraan Ijazah',               'Surat penyetaraan ijazah luar negeri',         'Pendidikan',   false, true, true,  48),
  ('KONVERSI_NILAI',              'Konversi Nilai',                   'Dokumen konversi nilai jika ada',              'Pendidikan',   false, true, true,  49),
  -- Keluarga
  ('KIA_ANAK',                    'KIA Anak',                         'Kartu Identitas Anak jika ada',                'Keluarga',     false, true, true,  50),
  ('AKTA_PERCERAIAN',             'Akta Perceraian',                  'Akta perceraian jika pernah bercerai',         'Keluarga',     false, true, true,  51),
  ('AKTA_KEMATIAN_PASANGAN',      'Akta Kematian Pasangan',           'Akta kematian pasangan jika relevan',          'Keluarga',     false, true, true,  52),
  ('PERUBAHAN_SUSUNAN_KELUARGA',  'Perubahan Susunan Keluarga',       'Dokumen perubahan susunan keluarga',           'Keluarga',     false, true, true,  53),
  ('SK_TANGGUNGAN_KELUARGA',      'SK Tanggungan Keluarga',           'Surat keterangan tanggungan keluarga',         'Keluarga',     false, true, true,  54),
  -- Kesehatan
  ('SURAT_SEHAT',                 'Surat Keterangan Sehat',           'Surat keterangan sehat dari dokter/faskes',    'Kesehatan',    false, true, true,  55),
  ('DOK_PEMERIKSAAN_KESEHATAN',   'Dok. Pemeriksaan Kesehatan',       'Dokumen pemeriksaan kesehatan tertentu',       'Kesehatan',    false, true, true,  56),
  -- PNS: pengangkatan
  ('KARTU_PESERTA_SELEKSI',       'Kartu Peserta Seleksi',            'Kartu peserta seleksi CPNS/PPPK',              'Kepegawaian',  false, true, true,  57),
  ('PETIKAN_SK_CPNS',             'Petikan SK CPNS',                  'Petikan SK CPNS',                              'Kepegawaian',  false, true, false, 58),
  ('SPMT_CPNS',                   'SPMT CPNS',                        'Surat Pernyataan Masuk Tugas CPNS',            'Kepegawaian',  false, true, false, 59),
  ('SURAT_PERNYATAAN_TUGAS',      'Surat Pernyataan Melaksanakan Tugas','Surat pernyataan melaksanakan tugas',        'Kepegawaian',  false, true, true,  60),
  ('BA_SUMPAH_CPNS',              'BA Sumpah/Janji CPNS',             'Berita Acara Sumpah/Janji CPNS',               'Kepegawaian',  false, true, false, 61),
  ('PETIKAN_SK_PNS',              'Petikan SK PNS',                   'Petikan SK Pengangkatan PNS',                  'Kepegawaian',  false, true, false, 62),
  ('SPMT_PNS',                    'SPMT PNS',                         'SPMT PNS',                                     'Kepegawaian',  false, true, false, 63),
  ('BA_SUMPAH_PNS',               'BA Sumpah/Janji PNS',              'Berita Acara Sumpah/Janji PNS',                'Kepegawaian',  false, true, false, 64),
  -- PNS: pangkat & golongan
  ('SK_PANGKAT_PERTAMA',          'SK Pangkat Pertama',               'SK Pangkat/golongan pertama',                  'Kepegawaian',  false, true, false, 65),
  ('SK_PANGKAT_TERAKHIR',         'SK Pangkat Terakhir',              'SK Pangkat/golongan terakhir',                 'Kepegawaian',  false, true, false, 66),
  ('PETIKAN_SK_PANGKAT',          'Petikan SK Pangkat',               'Petikan SK pangkat',                           'Kepegawaian',  false, true, false, 67),
  ('ANGKA_KREDIT',                'Penetapan Angka Kredit',           'Penetapan angka kredit jika relevan',          'Kinerja',      false, true, false, 68),
  ('KONVERSI_ANGKA_KREDIT',       'Konversi Angka Kredit',            'Dokumen konversi angka kredit',                'Kinerja',      false, true, true,  69),
  ('INTEGRASI_ANGKA_KREDIT',      'Integrasi Angka Kredit',           'Dokumen integrasi angka kredit',               'Kinerja',      false, true, false, 70),
  ('PENINJAUAN_MASA_KERJA',       'Peninjauan Masa Kerja',            'Dokumen peninjauan masa kerja jika ada',       'Kepegawaian',  false, true, false, 71),
  -- PNS: gaji
  ('SK_GAJI',                     'SK Gaji',                          'SK penetapan gaji',                            'Kepegawaian',  false, true, false, 72),
  ('SK_GAJI_BERKALA',             'SK Gaji Berkala',                  'SK kenaikan gaji berkala',                     'Kepegawaian',  false, true, false, 73),
  ('KGB_SEBELUMNYA',              'KGB Sebelumnya',                   'KGB periode sebelumnya',                       'Kepegawaian',  false, true, false, 74),
  ('DOK_PERUBAHAN_GAJI',          'Dok. Perubahan Gaji',              'Dokumen perubahan/penetapan gaji lainnya',     'Kepegawaian',  false, true, false, 75),
  -- PNS: jabatan
  ('SK_JABATAN_PELAKSANA',        'SK Jabatan Pelaksana',             'SK jabatan pelaksana jika relevan',            'Kepegawaian',  false, true, false, 76),
  ('SK_JABATAN_MANAJERIAL',       'SK Jabatan Manajerial',            'SK jabatan manajerial jika relevan',           'Kepegawaian',  false, true, false, 77),
  ('BA_PELANTIKAN',               'Berita Acara Pelantikan',          'Berita acara pelantikan jika ada',             'Kepegawaian',  false, true, false, 78),
  ('SPMJ',                        'SPMJ',                             'Surat Pernyataan Menduduki Jabatan',           'Kepegawaian',  false, true, false, 79),
  ('SURAT_PERNYATAAN_JABATAN',    'Surat Pernyataan Jabatan',         'Surat pernyataan menduduki jabatan',           'Kepegawaian',  false, true, false, 80),
  ('SK_PROMOSI',                  'SK Promosi',                       'SK promosi jabatan',                           'Kepegawaian',  false, true, true,  81),
  ('SK_ROTASI',                   'SK Rotasi',                        'SK rotasi',                                    'Kepegawaian',  false, true, true,  82),
  ('SK_PENUGASAN',                'SK Penugasan',                     'SK penugasan',                                 'Kepegawaian',  false, true, true,  83),
  ('SK_PEMBERHENTIAN_JABATAN',    'SK Pemberhentian dari Jabatan',    'SK pemberhentian dari jabatan jika pernah',    'Kepegawaian',  false, true, true,  84),
  ('SK_PENGANGKATAN_KEMBALI',     'SK Pengangkatan Kembali',          'SK pengangkatan kembali jika ada',             'Kepegawaian',  false, true, false, 85),
  -- Kinerja
  ('EVALUASI_KINERJA',            'Evaluasi Kinerja',                 'Dokumen evaluasi kinerja',                     'Kinerja',      false, true, true,  86),
  ('PENILAIAN_KINERJA',           'Penilaian Kinerja',                'Dokumen penilaian kinerja',                    'Kinerja',      false, true, true,  87),
  ('PREDIKAT_KINERJA',            'Predikat Kinerja',                 'Dokumen predikat kinerja',                     'Kinerja',      false, true, true,  88),
  ('CAPAIAN_KINERJA',             'Capaian Kinerja',                  'Dokumen capaian kinerja',                      'Kinerja',      false, true, true,  89),
  ('PERJANJIAN_KINERJA',          'Perjanjian Kinerja',               'Perjanjian kinerja jika relevan',              'Kinerja',      false, true, true,  90),
  -- Kompetensi
  ('SERT_DIKLAT',                 'Sertifikat Diklat',                'Sertifikat pendidikan & pelatihan',            'Kompetensi',   false, true, true,  91),
  ('SERT_PELATIHAN',              'Sertifikat Pelatihan',             'Sertifikat pelatihan',                         'Kompetensi',   false, true, true,  92),
  ('SERT_BIMTEK',                 'Sertifikat Bimtek',                'Sertifikat bimbingan teknis',                  'Kompetensi',   false, true, true,  93),
  ('SERT_WORKSHOP',               'Sertifikat Workshop',              'Sertifikat workshop',                          'Kompetensi',   false, true, true,  94),
  ('SERT_SEMINAR',                'Sertifikat Seminar',               'Sertifikat seminar',                           'Kompetensi',   false, true, true,  95),
  ('SERT_KURSUS',                 'Sertifikat Kursus',                'Sertifikat kursus',                            'Kompetensi',   false, true, true,  96),
  ('SERT_KEAHLIAN',               'Sertifikat Keahlian',              'Sertifikat keahlian',                          'Kompetensi',   false, true, true,  97),
  ('DOK_PENGEMBANGAN_KOMPETENSI', 'Dok. Pengembangan Kompetensi',     'Dokumen pengembangan kompetensi lainnya',      'Kompetensi',   false, true, true,  98),
  -- Mutasi
  ('SK_MUTASI',                   'SK Mutasi',                        'SK mutasi',                                    'Kepegawaian',  false, true, true,  99),
  ('SK_PINDAH_INSTANSI',          'SK Pindah Instansi',               'SK pindah instansi',                           'Kepegawaian',  false, true, false, 100),
  ('SK_PINDAH_UNIT_KERJA',        'SK Pindah Unit Kerja',             'SK pindah unit kerja',                         'Kepegawaian',  false, true, true,  101),
  ('SK_PENEMPATAN',               'SK Penempatan',                    'SK penempatan',                                'Kepegawaian',  false, true, true,  102),
  ('SURAT_SETUJU_MUTASI',         'Surat Persetujuan Mutasi',         'Surat persetujuan mutasi',                     'Kepegawaian',  false, true, true,  103),
  ('SURAT_REKOM_MUTASI',          'Surat Rekomendasi Mutasi',         'Surat rekomendasi mutasi',                     'Kepegawaian',  false, true, true,  104),
  ('SPMT_UNIT_BARU',              'SPMT Unit Kerja Baru',             'SPMT pada unit kerja baru',                    'Kepegawaian',  false, true, true,  105),
  ('BA_SERAH_TERIMA',             'Berita Acara Serah Terima',        'Berita acara serah terima jabatan/posisi',     'Kepegawaian',  false, true, true,  106),
  -- Cuti
  ('CUTI_TAHUNAN',                'Cuti Tahunan',                     'SK/surat cuti tahunan',                        'Cuti',         false, true, true,  107),
  ('CUTI_SAKIT',                  'Cuti Sakit',                       'Dokumen cuti sakit',                           'Cuti',         false, true, true,  108),
  ('CUTI_MELAHIRKAN',             'Cuti Melahirkan',                  'Dokumen cuti melahirkan',                      'Cuti',         false, true, true,  109),
  ('CUTI_ALASAN_PENTING',         'Cuti Alasan Penting',              'Dokumen cuti alasan penting',                  'Cuti',         false, true, true,  110),
  ('CUTI_BESAR',                  'Cuti Besar',                       'Dokumen cuti besar',                           'Cuti',         false, true, true,  111),
  ('CUTI_CLTN',                   'Cuti CLTN',                        'Cuti di Luar Tanggungan Negara',               'Cuti',         false, true, true,  112),
  ('PERSETUJUAN_CUTI',            'Persetujuan Cuti',                 'Dokumen persetujuan cuti',                     'Cuti',         false, true, true,  113),
  ('REKAP_CUTI',                  'Rekap Cuti',                       'Rekap cuti jika tersedia',                     'Cuti',         false, true, true,  114),
  -- Penghargaan
  ('PIAGAM_PENGHARGAAN',          'Piagam Penghargaan',               'Piagam penghargaan',                           'Penghargaan',  false, true, true,  115),
  ('SERT_PENGHARGAAN',            'Sertifikat Penghargaan',           'Sertifikat penghargaan',                       'Penghargaan',  false, true, true,  116),
  ('SATYALANCANA',                'Satyalancana',                     'Satyalancana karya satya jika ada',            'Penghargaan',  false, true, false, 117),
  ('PENGHARGAAN_PROFESI',         'Penghargaan Profesi',              'Penghargaan bidang profesi',                   'Penghargaan',  false, true, true,  118),
  ('PENGHARGAAN_KINERJA',         'Penghargaan Kinerja',              'Penghargaan kinerja',                          'Penghargaan',  false, true, true,  119),
  -- Disiplin
  ('SURAT_PERNYATAAN_NON_HUKDIS', 'Surat Pernyataan Non Hukdis',      'Surat pernyataan tidak pernah dijatuhi hukdis','Disiplin',     false, true, false, 120),
  ('SK_HUKUMAN_DISIPLIN',         'SK Hukuman Disiplin',              'SK hukuman disiplin jika pernah',              'Disiplin',     false, true, true,  121),
  ('BA_PEMERIKSAAN',              'Berita Acara Pemeriksaan',         'Berita acara pemeriksaan jika ada',            'Disiplin',     false, true, true,  122),
  ('DOK_KEBERATAN_BANDING',       'Dok. Keberatan/Banding',           'Dokumen keberatan/banding jika ada',           'Disiplin',     false, true, true,  123),
  ('DOK_PENCABUTAN_HUKDIS',       'Dok. Pencabutan Hukdis',           'Dokumen pencabutan hukuman jika ada',          'Disiplin',     false, true, true,  124),
  -- Integritas
  ('PAKTA_INTEGRITAS',            'Pakta Integritas',                 'Pakta integritas',                             'Integritas',   false, true, true,  125),
  ('SUMPAH_JANJI_PNS',            'Sumpah/Janji PNS',                 'Sumpah/janji PNS',                             'Integritas',   false, true, false, 126),
  ('SUMPAH_JANJI_JABATAN',        'Sumpah/Janji Jabatan',             'Sumpah/janji jabatan jika relevan',            'Integritas',   false, true, true,  127),
  -- LHKPN/LHKASN
  ('LHKPN',                       'LHKPN',                            'Laporan Harta Kekayaan PN jika wajib',         'Integritas',   false, true, true,  128),
  ('LHKASN',                      'LHKASN',                           'Laporan Harta Kekayaan ASN jika wajib',        'Integritas',   false, true, true,  129),
  ('BUKTI_PELAPORAN_LHKPN',       'Bukti Pelaporan LHKPN',            'Bukti pelaporan LHKPN/LHKASN',                 'Integritas',   false, true, true,  130),
  ('TANDA_TERIMA_LHKPN',          'Tanda Terima LHKPN',               'Tanda terima pelaporan',                       'Integritas',   false, true, true,  131),
  ('DOK_KLARIFIKASI_LHKPN',       'Dok. Klarifikasi LHKPN',           'Dokumen klarifikasi jika ada',                 'Integritas',   false, true, true,  132),
  -- Pensiun
  ('DOK_PERSIAPAN_PENSIUN',       'Dok. Persiapan Pensiun',           'Dokumen persiapan pensiun mendekati BUP',      'Pensiun',      false, true, false, 133),
  ('USULAN_PENSIUN',              'Usulan Pensiun',                   'Usulan pensiun',                               'Pensiun',      false, true, false, 134),
  ('SK_PENSIUN',                  'SK Pensiun',                       'SK pensiun',                                   'Pensiun',      false, true, false, 135),
  ('PETIKAN_SK_PENSIUN',          'Petikan SK Pensiun',               'Petikan SK pensiun',                           'Pensiun',      false, true, false, 136),
  ('SK_PEMBERHENTIAN',            'SK Pemberhentian',                 'SK pemberhentian dengan hormat/tidak hormat',  'Pensiun',      false, true, false, 137),
  ('DOK_HAK_PENSIUN',             'Dok. Hak Pensiun',                 'Dokumen hak pensiun',                          'Pensiun',      false, true, false, 138),
  ('DOK_TASPEN',                  'Dok. Taspen',                      'Dokumen Taspen/administrasi pensiun',          'Pensiun',      false, true, false, 139),
  ('SK_TUGAS_BELAJAR',            'SK Tugas Belajar',                 'SK tugas belajar jika ada',                    'Kepegawaian',  false, true, true,  140),
  -- PPPK umum
  ('DOK_KELULUSAN_SELEKSI_PPPK',  'Dok. Kelulusan Seleksi PPPK',      'Dokumen kelulusan seleksi PPPK',               'Kepegawaian',  false, false, true, 141),
  ('NI_PPPK',                     'Penetapan NI PPPK',                'Penetapan Nomor Induk PPPK',                   'Kepegawaian',  false, false, true, 142),
  ('PERTEK_NI_PPPK',              'Pertek NI PPPK',                   'Pertek NI PPPK jika tersedia',                 'Kepegawaian',  false, false, true, 143),
  ('PETIKAN_SK_PPPK',             'Petikan SK PPPK',                  'Petikan SK pengangkatan PPPK',                 'Kepegawaian',  false, false, true, 144),
  ('SPMT_PPPK',                   'SPMT PPPK',                        'SPMT PPPK',                                    'Kepegawaian',  false, false, true, 145),
  ('PK_PERPANJANGAN',             'Perpanjangan Perjanjian Kerja',    'Dokumen perpanjangan perjanjian kerja',        'Kepegawaian',  false, false, true, 146),
  ('PK_PERUBAHAN',                'Perubahan Perjanjian Kerja',       'Dokumen perubahan perjanjian kerja',           'Kepegawaian',  false, false, true, 147),
  ('EVALUASI_PK',                 'Evaluasi Perjanjian Kerja',        'Dokumen evaluasi perjanjian kerja',            'Kepegawaian',  false, false, true, 148),
  ('SK_PERPANJANGAN_PK',          'SK Perpanjangan PK',               'SK perpanjangan jika diterbitkan',             'Kepegawaian',  false, false, true, 149),
  ('DOK_PERUBAHAN_UNIT_PK',       'Perubahan Unit/Jabatan PK',        'Dokumen perubahan unit/jabatan dalam PK',      'Kepegawaian',  false, false, true, 150),
  -- Guru
  ('SERT_PENDIDIK',               'Sertifikat Pendidik',              'Sertifikat pendidik jika sudah memiliki',      'Pendidikan',   false, true, true, 151),
  ('NRG',                         'NRG',                              'Nomor Registrasi Guru jika sudah memiliki',    'Pendidikan',   false, true, true, 152),
  ('SK_PEMBAGIAN_TUGAS',          'SK Pembagian Tugas',               'SK pembagian tugas mengajar',                  'Kepegawaian',  false, true, true, 153),
  ('SK_MENGAJAR',                 'SK Mengajar',                      'SK mengajar',                                  'Kepegawaian',  false, true, true, 154),
  ('SURAT_PENUGASAN_GURU',        'Surat Penugasan Guru',             'Surat penugasan guru',                         'Kepegawaian',  false, true, true, 155),
  ('JADWAL_MENGAJAR',             'Jadwal Mengajar',                  'Jadwal mengajar jika tersedia',                'Kepegawaian',  false, true, true, 156),
  ('SK_WALI_KELAS',               'SK Wali Kelas',                    'SK wali kelas jika ada',                       'Kepegawaian',  false, true, true, 157),
  ('SK_KOORDINATOR',              'SK Koordinator',                   'SK koordinator jika ada',                      'Kepegawaian',  false, true, true, 158),
  ('SK_KALAB',                    'SK Kepala Laboratorium',           'SK kepala laboratorium jika ada',              'Kepegawaian',  false, true, true, 159),
  ('SK_PERPUS',                   'SK Kepala Perpustakaan',           'SK kepala perpustakaan jika ada',              'Kepegawaian',  false, true, true, 160),
  ('DOK_PENGEMBANGAN_GURU',       'Dok. Pengembangan Guru',           'Dokumen pengembangan kompetensi guru',         'Kompetensi',   false, true, true, 161),
  ('SK_TUGAS_TAMBAHAN',           'SK Tugas Tambahan',                'SK tugas tambahan jika ada',                   'Kepegawaian',  false, true, true, 162),
  -- PPPK Paruh Waktu
  ('DOK_ALOKASI_PW',              'Dok. Alokasi PPPK PW',             'Dokumen alokasi PPPK paruh waktu',             'Kepegawaian',  false, false, true, 163),
  ('HASIL_PENGUSULAN_PW',         'Hasil Pengusulan PW',              'Dokumen penetapan/hasil pengusulan',           'Kepegawaian',  false, false, true, 164),
  ('DRH',                         'Daftar Riwayat Hidup',             'DRH jika tersedia',                            'Kepegawaian',  false, false, true, 165),
  ('SP5_POIN',                    'Surat Pernyataan 5 Poin',          'Surat pernyataan 5 poin (ketentuan BKN)',      'Integritas',   false, false, true, 166),
  ('SKCK',                        'SKCK',                             'Surat Ket Catatan Kepolisian',                 'Identitas',    false, false, true, 167),
  ('NI_PPPK_PW',                  'Penetapan NI PPPK PW',             'Penetapan NI PPPK paruh waktu',                'Kepegawaian',  false, false, true, 168),
  ('PERTEK_NI_PPPK_PW',           'Pertek NI PPPK PW',                'Pertek NI PPPK paruh waktu jika tersedia',     'Kepegawaian',  false, false, true, 169),
  ('SK_PENGANGKATAN_PW',          'SK Pengangkatan PPPK PW',          'SK pengangkatan PPPK paruh waktu',             'Kepegawaian',  false, false, true, 170),
  ('PETIKAN_SK_PW',               'Petikan SK Pengangkatan PW',       'Petikan SK pengangkatan paruh waktu',          'Kepegawaian',  false, false, true, 171),
  ('PK_PARUH_WAKTU',              'Perjanjian Kerja Paruh Waktu',     'PK memuat jabatan, ekspektasi kinerja, unit kerja, skema kerja, masa PK, hak/kewajiban, sanksi', 'Kepegawaian', false, false, true, 172),
  ('SPMT_PW',                     'SPMT Paruh Waktu',                 'SPMT PPPK paruh waktu',                        'Kepegawaian',  false, false, true, 173),
  ('EKSPEKTASI_KINERJA',          'Ekspektasi Kinerja',               'Dokumen ekspektasi kinerja',                   'Kinerja',      false, false, true, 174),
  ('PK_PERUBAHAN_SKEMA',          'Perubahan Skema Kerja',            'Dokumen perubahan skema kerja jika ada',       'Kepegawaian',  false, false, true, 175)
ON CONFLICT (kode) DO NOTHING;

-- 2) Rules umum (semua jenis ASN)
INSERT INTO document_rules (jenis_asn, jenis_dokumen_kode, sifat, kondisi, masa_berlaku_tahun, urutan)
SELECT t.jenis_asn, v.kode, v.sifat, v.kondisi, v.masa, v.urutan
FROM (VALUES
  ('PNS',1),('PPPK_GURU',2),('PPPK_TENDIK',3),('PPPK_GURU_PARUH_WAKTU',4),('PPPK_TENDIK_PARUH_WAKTU',5)
) AS t(jenis_asn, prio)
CROSS JOIN (VALUES
  ('KTP',                      'WAJIB',       NULL, NULL::int, 10),
  ('KARTU_KELUARGA',           'WAJIB',       NULL, NULL::int, 11),
  ('NPWP',                     'WAJIB',       NULL, NULL::int, 12),
  ('FOTO',                     'WAJIB',       NULL, 2,         13),
  ('KARTU_ASN',                'OPSIONAL',    NULL, NULL::int, 14),
  ('DOK_PERUBAHAN_NAMA',       'OPSIONAL',    NULL, NULL::int, 15),
  ('DOK_PERUBAHAN_TTL',        'OPSIONAL',    NULL, NULL::int, 16),
  ('DOK_PERUBAHAN_DATA',       'OPSIONAL',    NULL, NULL::int, 17),
  ('IJAZAH',                   'WAJIB',       NULL, NULL::int, 20),
  ('TRANSKRIP',                'WAJIB',       NULL, NULL::int, 21),
  ('IJAZAH_SEBELUMNYA',        'OPSIONAL',    NULL, NULL::int, 22),
  ('TRANSKRIP_SEBELUMNYA',     'OPSIONAL',    NULL, NULL::int, 23),
  ('SERTIFIKAT_PROFESI',       'OPSIONAL',    NULL, NULL::int, 24),
  ('SERTIFIKAT_KOMPETENSI',    'OPSIONAL',    NULL, NULL::int, 25),
  ('PENYETARAAN_IJAZAH',       'OPSIONAL',    NULL, NULL::int, 26),
  ('KONVERSI_NILAI',           'OPSIONAL',    NULL, NULL::int, 27),
  ('AKTA_NIKAH',               'KONDISIONAL', 'menikah',         NULL::int, 30),
  ('AKTA_KELAHIRAN',           'KONDISIONAL', 'punya_anak',      NULL::int, 31),
  ('KIA_ANAK',                 'KONDISIONAL', 'punya_anak',      NULL::int, 32),
  ('AKTA_PERCERAIAN',          'OPSIONAL',    NULL, NULL::int, 33),
  ('AKTA_KEMATIAN_PASANGAN',   'OPSIONAL',    NULL, NULL::int, 34),
  ('PERUBAHAN_SUSUNAN_KELUARGA','OPSIONAL',   NULL, NULL::int, 35),
  ('SK_TANGGUNGAN_KELUARGA',   'OPSIONAL',    NULL, NULL::int, 36),
  ('SURAT_SEHAT',              'OPSIONAL',    NULL, NULL::int, 40),
  ('DOK_PEMERIKSAAN_KESEHATAN','OPSIONAL',    NULL, NULL::int, 41),
  ('BPJS',                     'OPSIONAL',    NULL, NULL::int, 42),
  ('DOKUMEN_LAINNYA',          'OPSIONAL',    NULL, NULL::int, 998)
) AS v(kode, sifat, kondisi, masa, urutan)
JOIN jenis_dokumen j ON j.kode = v.kode
ON CONFLICT (jenis_asn, jenis_dokumen_kode) DO NOTHING;

-- Override umum:
-- Surat sehat WAJIB untuk PPPK Paruh Waktu (ketentuan BKN), berlaku 1 tahun
UPDATE document_rules SET sifat = 'WAJIB', masa_berlaku_tahun = 1
WHERE jenis_dokumen_kode = 'SURAT_SEHAT'
  AND jenis_asn IN ('PPPK_GURU_PARUH_WAKTU','PPPK_TENDIK_PARUH_WAKTU');
-- Kartu ASN WAJIB untuk PNS
UPDATE document_rules SET sifat = 'WAJIB'
WHERE jenis_dokumen_kode = 'KARTU_ASN' AND jenis_asn = 'PNS';

-- 3) Rules PNS
INSERT INTO document_rules (jenis_asn, jenis_dokumen_kode, sifat, kondisi, urutan)
SELECT v.jenis_asn, v.kode, v.sifat, v.kondisi, v.urutan
FROM (VALUES
  ('PNS','SK_CPNS',                  'WAJIB',       NULL, 50),
  ('PNS','SPMT_CPNS',                'WAJIB',       NULL, 51),
  ('PNS','BA_SUMPAH_CPNS',           'WAJIB',       NULL, 52),
  ('PNS','SK_PNS',                   'WAJIB',       NULL, 53),
  ('PNS','SPMT_PNS',                 'WAJIB',       NULL, 54),
  ('PNS','BA_SUMPAH_PNS',            'WAJIB',       NULL, 55),
  ('PNS','SK_PANGKAT_PERTAMA',       'WAJIB',       NULL, 56),
  ('PNS','SK_PANGKAT_TERAKHIR',      'WAJIB',       NULL, 57),
  ('PNS','SK_KGB',                   'WAJIB',       NULL, 58),
  ('PNS','SK_JABATAN',               'WAJIB',       NULL, 59),
  ('PNS','SKP',                      'WAJIB',       NULL, 60),
  ('PNS','PAKTA_INTEGRITAS',         'WAJIB',       NULL, 61),
  ('PNS','SUMPAH_JANJI_PNS',         'WAJIB',       NULL, 62),
  ('PNS','SURAT_PERNYATAAN_NON_HUKDIS','WAJIB',     NULL, 63),
  ('PNS','SK_PANGKAT',               'KONDISIONAL', 'pernah_naik_pangkat', 70),
  ('PNS','PETIKAN_SK_PANGKAT',       'KONDISIONAL', 'pernah_naik_pangkat', 71),
  ('PNS','SK_MUTASI',                'KONDISIONAL', 'pernah_mutasi',       72),
  ('PNS','SPMT_UNIT_BARU',           'KONDISIONAL', 'pernah_mutasi',       73),
  ('PNS','BA_SERAH_TERIMA',          'KONDISIONAL', 'pernah_mutasi',       74),
  ('PNS','SERT_DIKLAT',              'KONDISIONAL', 'pernah_diklat',       75),
  ('PNS','PIAGAM_PENGHARGAAN',       'KONDISIONAL', 'pernah_penghargaan',  76),
  ('PNS','SATYALANCANA',             'KONDISIONAL', 'pernah_penghargaan',  77),
  ('PNS','SK_HUKUMAN_DISIPLIN',      'KONDISIONAL', 'pernah_hukdis',       78),
  ('PNS','DOK_PERSIAPAN_PENSIUN',    'KONDISIONAL', 'mendekati_pensiun',   79),
  ('PNS','SK_TUGAS_BELAJAR',         'KONDISIONAL', 'pernah_tugas_belajar',80),
  ('PNS','SERT_PENDIDIK',            'KONDISIONAL', 'sertifikat_pendidik', 81),
  ('PNS','NRG',                      'KONDISIONAL', 'sertifikat_pendidik', 82),
  ('PNS','LHKPN',                    'KONDISIONAL', 'wajib_lhkpn',         83),
  ('PNS','BUKTI_PELAPORAN_LHKPN',    'KONDISIONAL', 'wajib_lhkpn',         84),
  ('PNS','KARTU_PESERTA_SELEKSI',    'OPSIONAL',    NULL, 90),
  ('PNS','PETIKAN_SK_CPNS',          'OPSIONAL',    NULL, 91),
  ('PNS','SURAT_PERNYATAAN_TUGAS',   'OPSIONAL',    NULL, 92),
  ('PNS','PETIKAN_SK_PNS',           'OPSIONAL',    NULL, 93),
  ('PNS','ANGKA_KREDIT',             'OPSIONAL',    NULL, 94),
  ('PNS','PAK',                      'OPSIONAL',    NULL, 95),
  ('PNS','KONVERSI_ANGKA_KREDIT',    'OPSIONAL',    NULL, 96),
  ('PNS','INTEGRASI_ANGKA_KREDIT',   'OPSIONAL',    NULL, 97),
  ('PNS','PENINJAUAN_MASA_KERJA',    'OPSIONAL',    NULL, 98),
  ('PNS','SK_GAJI',                  'OPSIONAL',    NULL, 100),
  ('PNS','SK_GAJI_BERKALA',          'OPSIONAL',    NULL, 101),
  ('PNS','KGB_SEBELUMNYA',           'OPSIONAL',    NULL, 102),
  ('PNS','DOK_PERUBAHAN_GAJI',       'OPSIONAL',    NULL, 103),
  ('PNS','JABFUNG',                  'OPSIONAL',    NULL, 104),
  ('PNS','SK_JABATAN_PELAKSANA',     'OPSIONAL',    NULL, 105),
  ('PNS','SK_JABATAN_MANAJERIAL',    'OPSIONAL',    NULL, 106),
  ('PNS','BA_PELANTIKAN',            'OPSIONAL',    NULL, 107),
  ('PNS','SPMJ',                     'OPSIONAL',    NULL, 108),
  ('PNS','SURAT_PERNYATAAN_JABATAN', 'OPSIONAL',    NULL, 109),
  ('PNS','SK_PROMOSI',               'OPSIONAL',    NULL, 110),
  ('PNS','SK_ROTASI',                'OPSIONAL',    NULL, 111),
  ('PNS','SK_PENUGASAN',             'OPSIONAL',    NULL, 112),
  ('PNS','SK_PEMBERHENTIAN_JABATAN', 'OPSIONAL',    NULL, 113),
  ('PNS','SK_PENGANGKATAN_KEMBALI',  'OPSIONAL',    NULL, 114),
  ('PNS','EVALUASI_KINERJA',         'OPSIONAL',    NULL, 115),
  ('PNS','PENILAIAN_KINERJA',        'OPSIONAL',    NULL, 116),
  ('PNS','PREDIKAT_KINERJA',         'OPSIONAL',    NULL, 117),
  ('PNS','CAPAIAN_KINERJA',          'OPSIONAL',    NULL, 118),
  ('PNS','PERJANJIAN_KINERJA',       'OPSIONAL',    NULL, 119),
  ('PNS','SERT_PELATIHAN',           'OPSIONAL',    NULL, 120),
  ('PNS','SERT_BIMTEK',              'OPSIONAL',    NULL, 121),
  ('PNS','SERT_WORKSHOP',            'OPSIONAL',    NULL, 122),
  ('PNS','SERT_SEMINAR',             'OPSIONAL',    NULL, 123),
  ('PNS','SERT_KURSUS',              'OPSIONAL',    NULL, 124),
  ('PNS','SERT_KEAHLIAN',            'OPSIONAL',    NULL, 125),
  ('PNS','DOK_PENGEMBANGAN_KOMPETENSI','OPSIONAL',  NULL, 126),
  ('PNS','SK_PINDAH_INSTANSI',       'OPSIONAL',    NULL, 127),
  ('PNS','SK_PINDAH_UNIT_KERJA',     'OPSIONAL',    NULL, 128),
  ('PNS','SK_PENEMPATAN',            'OPSIONAL',    NULL, 129),
  ('PNS','SURAT_SETUJU_MUTASI',      'OPSIONAL',    NULL, 130),
  ('PNS','SURAT_REKOM_MUTASI',       'OPSIONAL',    NULL, 131),
  ('PNS','CUTI_TAHUNAN',             'OPSIONAL',    NULL, 132),
  ('PNS','CUTI_SAKIT',               'OPSIONAL',    NULL, 133),
  ('PNS','CUTI_MELAHIRKAN',          'OPSIONAL',    NULL, 134),
  ('PNS','CUTI_ALASAN_PENTING',      'OPSIONAL',    NULL, 135),
  ('PNS','CUTI_BESAR',               'OPSIONAL',    NULL, 136),
  ('PNS','CUTI_CLTN',                'OPSIONAL',    NULL, 137),
  ('PNS','PERSETUJUAN_CUTI',         'OPSIONAL',    NULL, 138),
  ('PNS','REKAP_CUTI',               'OPSIONAL',    NULL, 139),
  ('PNS','SERT_PENGHARGAAN',         'OPSIONAL',    NULL, 140),
  ('PNS','PENGHARGAAN_PROFESI',      'OPSIONAL',    NULL, 141),
  ('PNS','PENGHARGAAN_KINERJA',      'OPSIONAL',    NULL, 142),
  ('PNS','BA_PEMERIKSAAN',           'OPSIONAL',    NULL, 143),
  ('PNS','DOK_KEBERATAN_BANDING',    'OPSIONAL',    NULL, 144),
  ('PNS','DOK_PENCABUTAN_HUKDIS',    'OPSIONAL',    NULL, 145),
  ('PNS','SUMPAH_JANJI_JABATAN',     'OPSIONAL',    NULL, 146),
  ('PNS','LHKASN',                   'OPSIONAL',    NULL, 147),
  ('PNS','TANDA_TERIMA_LHKPN',       'OPSIONAL',    NULL, 148),
  ('PNS','DOK_KLARIFIKASI_LHKPN',    'OPSIONAL',    NULL, 149),
  ('PNS','USULAN_PENSIUN',           'OPSIONAL',    NULL, 150),
  ('PNS','SK_PENSIUN',               'OPSIONAL',    NULL, 151),
  ('PNS','PETIKAN_SK_PENSIUN',       'OPSIONAL',    NULL, 152),
  ('PNS','SK_PEMBERHENTIAN',         'OPSIONAL',    NULL, 153),
  ('PNS','DOK_HAK_PENSIUN',          'OPSIONAL',    NULL, 154),
  ('PNS','DOK_TASPEN',               'OPSIONAL',    NULL, 155),
  ('PNS','SERDIK',                   'OPSIONAL',    NULL, 156),
  ('PNS','KARPEG',                   'OPSIONAL',    NULL, 157),
  ('PNS','KARIS_KARSU',              'OPSIONAL',    NULL, 158),
  ('PNS','NIP_BARU',                 'OPSIONAL',    NULL, 159),
  ('PNS','REKENING',                 'OPSIONAL',    NULL, 160),
  ('PNS','SK_TASJEN',                'OPSIONAL',    NULL, 161)
) AS v(jenis_asn, kode, sifat, kondisi, urutan)
JOIN jenis_dokumen j ON j.kode = v.kode
ON CONFLICT (jenis_asn, jenis_dokumen_kode) DO NOTHING;

-- 4) Rules PPPK Guru
INSERT INTO document_rules (jenis_asn, jenis_dokumen_kode, sifat, kondisi, urutan)
SELECT v.jenis_asn, v.kode, v.sifat, v.kondisi, v.urutan
FROM (VALUES
  ('PPPK_GURU','DOK_KELULUSAN_SELEKSI_PPPK','WAJIB',       NULL, 50),
  ('PPPK_GURU','NI_PPPK',                   'WAJIB',       NULL, 51),
  ('PPPK_GURU','SK_PPPK',                   'WAJIB',       NULL, 52),
  ('PPPK_GURU','SPMT_PPPK',                 'WAJIB',       NULL, 53),
  ('PPPK_GURU','PERJANJIAN_KERJA',          'WAJIB',       NULL, 54),
  ('PPPK_GURU','SURAT_PERNYATAAN_TUGAS',    'WAJIB',       NULL, 55),
  ('PPPK_GURU','SK_PEMBAGIAN_TUGAS',        'WAJIB',       NULL, 56),
  ('PPPK_GURU','SK_MENGAJAR',               'WAJIB',       NULL, 57),
  ('PPPK_GURU','SKP',                       'WAJIB',       NULL, 58),
  ('PPPK_GURU','SERT_PENDIDIK',             'KONDISIONAL', 'sertifikat_pendidik', 70),
  ('PPPK_GURU','NRG',                       'KONDISIONAL', 'sertifikat_pendidik', 71),
  ('PPPK_GURU','SK_TUGAS_TAMBAHAN',         'KONDISIONAL', 'jabatan_tambahan',    72),
  ('PPPK_GURU','SK_WALI_KELAS',             'KONDISIONAL', 'jabatan_tambahan',    73),
  ('PPPK_GURU','SK_KOORDINATOR',            'KONDISIONAL', 'jabatan_tambahan',    74),
  ('PPPK_GURU','SK_KALAB',                  'KONDISIONAL', 'jabatan_tambahan',    75),
  ('PPPK_GURU','SK_PERPUS',                 'KONDISIONAL', 'jabatan_tambahan',    76),
  ('PPPK_GURU','KARTU_PESERTA_SELEKSI',     'OPSIONAL',    NULL, 90),
  ('PPPK_GURU','PERTEK_NI_PPPK',            'OPSIONAL',    NULL, 91),
  ('PPPK_GURU','PETIKAN_SK_PPPK',           'OPSIONAL',    NULL, 92),
  ('PPPK_GURU','PK_PERPANJANGAN',           'OPSIONAL',    NULL, 93),
  ('PPPK_GURU','PK_PERUBAHAN',              'OPSIONAL',    NULL, 94),
  ('PPPK_GURU','EVALUASI_PK',               'OPSIONAL',    NULL, 95),
  ('PPPK_GURU','SK_PERPANJANGAN_PK',        'OPSIONAL',    NULL, 96),
  ('PPPK_GURU','DOK_PERUBAHAN_UNIT_PK',     'OPSIONAL',    NULL, 97),
  ('PPPK_GURU','SURAT_PENUGASAN_GURU',      'OPSIONAL',    NULL, 98),
  ('PPPK_GURU','JADWAL_MENGAJAR',           'OPSIONAL',    NULL, 100),
  ('PPPK_GURU','DOK_PENGEMBANGAN_GURU',     'OPSIONAL',    NULL, 101),
  ('PPPK_GURU','PAK',                       'OPSIONAL',    NULL, 102),
  ('PPPK_GURU','KONVERSI_ANGKA_KREDIT',     'OPSIONAL',    NULL, 103),
  ('PPPK_GURU','PKG',                       'OPSIONAL',    NULL, 104),
  ('PPPK_GURU','EVALUASI_KINERJA',          'OPSIONAL',    NULL, 105),
  ('PPPK_GURU','PENILAIAN_KINERJA',         'OPSIONAL',    NULL, 106),
  ('PPPK_GURU','PREDIKAT_KINERJA',          'OPSIONAL',    NULL, 107),
  ('PPPK_GURU','CAPAIAN_KINERJA',           'OPSIONAL',    NULL, 108),
  ('PPPK_GURU','SERT_DIKLAT',               'OPSIONAL',    NULL, 109),
  ('PPPK_GURU','SERT_PELATIHAN',            'OPSIONAL',    NULL, 110),
  ('PPPK_GURU','SERT_BIMTEK',               'OPSIONAL',    NULL, 111),
  ('PPPK_GURU','SERTIFIKAT',                'OPSIONAL',    NULL, 112),
  ('PPPK_GURU','SERDIK',                    'OPSIONAL',    NULL, 113)
) AS v(jenis_asn, kode, sifat, kondisi, urutan)
JOIN jenis_dokumen j ON j.kode = v.kode
ON CONFLICT (jenis_asn, jenis_dokumen_kode) DO NOTHING;

-- 5) Rules PPPK Tendik
INSERT INTO document_rules (jenis_asn, jenis_dokumen_kode, sifat, kondisi, urutan)
SELECT v.jenis_asn, v.kode, v.sifat, v.kondisi, v.urutan
FROM (VALUES
  ('PPPK_TENDIK','DOK_KELULUSAN_SELEKSI_PPPK','WAJIB',    NULL, 50),
  ('PPPK_TENDIK','NI_PPPK',                   'WAJIB',    NULL, 51),
  ('PPPK_TENDIK','SK_PPPK',                   'WAJIB',    NULL, 52),
  ('PPPK_TENDIK','SPMT_PPPK',                 'WAJIB',    NULL, 53),
  ('PPPK_TENDIK','PERJANJIAN_KERJA',          'WAJIB',    NULL, 54),
  ('PPPK_TENDIK','SURAT_PERNYATAAN_TUGAS',    'WAJIB',    NULL, 55),
  ('PPPK_TENDIK','SK_PENEMPATAN',             'WAJIB',    NULL, 56),
  ('PPPK_TENDIK','SK_PENUGASAN',              'WAJIB',    NULL, 57),
  ('PPPK_TENDIK','SKP',                       'WAJIB',    NULL, 58),
  ('PPPK_TENDIK','SK_TUGAS_TAMBAHAN',         'KONDISIONAL', 'jabatan_tambahan', 70),
  ('PPPK_TENDIK','KARTU_PESERTA_SELEKSI',     'OPSIONAL', NULL, 90),
  ('PPPK_TENDIK','PERTEK_NI_PPPK',            'OPSIONAL', NULL, 91),
  ('PPPK_TENDIK','PETIKAN_SK_PPPK',           'OPSIONAL', NULL, 92),
  ('PPPK_TENDIK','PK_PERPANJANGAN',           'OPSIONAL', NULL, 93),
  ('PPPK_TENDIK','PK_PERUBAHAN',              'OPSIONAL', NULL, 94),
  ('PPPK_TENDIK','EVALUASI_PK',               'OPSIONAL', NULL, 95),
  ('PPPK_TENDIK','SK_PERPANJANGAN_PK',        'OPSIONAL', NULL, 96),
  ('PPPK_TENDIK','DOK_PERUBAHAN_UNIT_PK',     'OPSIONAL', NULL, 97),
  ('PPPK_TENDIK','SERT_DIKLAT',               'OPSIONAL', NULL, 100),
  ('PPPK_TENDIK','SERT_PELATIHAN',            'OPSIONAL', NULL, 101),
  ('PPPK_TENDIK','SERT_BIMTEK',               'OPSIONAL', NULL, 102),
  ('PPPK_TENDIK','DOK_PENGEMBANGAN_KOMPETENSI','OPSIONAL',NULL, 103),
  ('PPPK_TENDIK','EVALUASI_KINERJA',          'OPSIONAL', NULL, 104),
  ('PPPK_TENDIK','PENILAIAN_KINERJA',         'OPSIONAL', NULL, 105),
  ('PPPK_TENDIK','PREDIKAT_KINERJA',          'OPSIONAL', NULL, 106),
  ('PPPK_TENDIK','CAPAIAN_KINERJA',           'OPSIONAL', NULL, 107)
) AS v(jenis_asn, kode, sifat, kondisi, urutan)
JOIN jenis_dokumen j ON j.kode = v.kode
ON CONFLICT (jenis_asn, jenis_dokumen_kode) DO NOTHING;

-- 6) Rules PPPK Guru Paruh Waktu
INSERT INTO document_rules (jenis_asn, jenis_dokumen_kode, sifat, kondisi, masa_berlaku_tahun, urutan)
SELECT v.jenis_asn, v.kode, v.sifat, v.kondisi, v.masa, v.urutan
FROM (VALUES
  ('PPPK_GURU_PARUH_WAKTU','DRH',                  'WAJIB',       NULL, NULL::int, 50),
  ('PPPK_GURU_PARUH_WAKTU','SP5_POIN',             'WAJIB',       NULL, NULL::int, 51),
  ('PPPK_GURU_PARUH_WAKTU','SKCK',                 'WAJIB',       NULL, 1,         52),
  ('PPPK_GURU_PARUH_WAKTU','NI_PPPK_PW',           'WAJIB',       NULL, NULL::int, 53),
  ('PPPK_GURU_PARUH_WAKTU','SK_PENGANGKATAN_PW',   'WAJIB',       NULL, NULL::int, 54),
  ('PPPK_GURU_PARUH_WAKTU','PK_PARUH_WAKTU',       'WAJIB',       NULL, NULL::int, 55),
  ('PPPK_GURU_PARUH_WAKTU','SPMT_PW',              'WAJIB',       NULL, NULL::int, 56),
  ('PPPK_GURU_PARUH_WAKTU','SURAT_PERNYATAAN_TUGAS','WAJIB',      NULL, NULL::int, 57),
  ('PPPK_GURU_PARUH_WAKTU','SK_PEMBAGIAN_TUGAS',   'WAJIB',       NULL, NULL::int, 58),
  ('PPPK_GURU_PARUH_WAKTU','SK_MENGAJAR',          'WAJIB',       NULL, NULL::int, 59),
  ('PPPK_GURU_PARUH_WAKTU','SKP',                  'WAJIB',       NULL, NULL::int, 60),
  ('PPPK_GURU_PARUH_WAKTU','SERT_PENDIDIK',        'KONDISIONAL', 'sertifikat_pendidik', NULL::int, 70),
  ('PPPK_GURU_PARUH_WAKTU','NRG',                  'KONDISIONAL', 'sertifikat_pendidik', NULL::int, 71),
  ('PPPK_GURU_PARUH_WAKTU','SK_TUGAS_TAMBAHAN',    'KONDISIONAL', 'jabatan_tambahan',    NULL::int, 72),
  ('PPPK_GURU_PARUH_WAKTU','SK_WALI_KELAS',        'KONDISIONAL', 'jabatan_tambahan',    NULL::int, 73),
  ('PPPK_GURU_PARUH_WAKTU','SK_KOORDINATOR',       'KONDISIONAL', 'jabatan_tambahan',    NULL::int, 74),
  ('PPPK_GURU_PARUH_WAKTU','DOK_ALOKASI_PW',       'OPSIONAL',    NULL, NULL::int, 90),
  ('PPPK_GURU_PARUH_WAKTU','HASIL_PENGUSULAN_PW',  'OPSIONAL',    NULL, NULL::int, 91),
  ('PPPK_GURU_PARUH_WAKTU','PERTEK_NI_PPPK_PW',    'OPSIONAL',    NULL, NULL::int, 92),
  ('PPPK_GURU_PARUH_WAKTU','PETIKAN_SK_PW',        'OPSIONAL',    NULL, NULL::int, 93),
  ('PPPK_GURU_PARUH_WAKTU','EKSPEKTASI_KINERJA',   'OPSIONAL',    NULL, NULL::int, 94),
  ('PPPK_GURU_PARUH_WAKTU','PK_PERPANJANGAN',      'OPSIONAL',    NULL, NULL::int, 95),
  ('PPPK_GURU_PARUH_WAKTU','PK_PERUBAHAN',         'OPSIONAL',    NULL, NULL::int, 96),
  ('PPPK_GURU_PARUH_WAKTU','PK_PERUBAHAN_SKEMA',   'OPSIONAL',    NULL, NULL::int, 97),
  ('PPPK_GURU_PARUH_WAKTU','EVALUASI_PK',          'OPSIONAL',    NULL, NULL::int, 98),
  ('PPPK_GURU_PARUH_WAKTU','DOK_PERUBAHAN_UNIT_PK','OPSIONAL',    NULL, NULL::int, 100),
  ('PPPK_GURU_PARUH_WAKTU','EVALUASI_KINERJA',     'OPSIONAL',    NULL, NULL::int, 101),
  ('PPPK_GURU_PARUH_WAKTU','CAPAIAN_KINERJA',      'OPSIONAL',    NULL, NULL::int, 102),
  ('PPPK_GURU_PARUH_WAKTU','SERT_DIKLAT',          'OPSIONAL',    NULL, NULL::int, 103),
  ('PPPK_GURU_PARUH_WAKTU','SERT_PELATIHAN',       'OPSIONAL',    NULL, NULL::int, 104),
  ('PPPK_GURU_PARUH_WAKTU','DOK_PENGEMBANGAN_GURU','OPSIONAL',    NULL, NULL::int, 105),
  ('PPPK_GURU_PARUH_WAKTU','JADWAL_MENGAJAR',      'OPSIONAL',    NULL, NULL::int, 106),
  ('PPPK_GURU_PARUH_WAKTU','SURAT_PENUGASAN_GURU', 'OPSIONAL',    NULL, NULL::int, 107)
) AS v(jenis_asn, kode, sifat, kondisi, masa, urutan)
JOIN jenis_dokumen j ON j.kode = v.kode
ON CONFLICT (jenis_asn, jenis_dokumen_kode) DO NOTHING;

-- 7) Rules PPPK Tendik Paruh Waktu
INSERT INTO document_rules (jenis_asn, jenis_dokumen_kode, sifat, kondisi, masa_berlaku_tahun, urutan)
SELECT v.jenis_asn, v.kode, v.sifat, v.kondisi, v.masa, v.urutan
FROM (VALUES
  ('PPPK_TENDIK_PARUH_WAKTU','DRH',                  'WAJIB',       NULL, NULL::int, 50),
  ('PPPK_TENDIK_PARUH_WAKTU','SP5_POIN',             'WAJIB',       NULL, NULL::int, 51),
  ('PPPK_TENDIK_PARUH_WAKTU','SKCK',                 'WAJIB',       NULL, 1,         52),
  ('PPPK_TENDIK_PARUH_WAKTU','NI_PPPK_PW',           'WAJIB',       NULL, NULL::int, 53),
  ('PPPK_TENDIK_PARUH_WAKTU','SK_PENGANGKATAN_PW',   'WAJIB',       NULL, NULL::int, 54),
  ('PPPK_TENDIK_PARUH_WAKTU','PK_PARUH_WAKTU',       'WAJIB',       NULL, NULL::int, 55),
  ('PPPK_TENDIK_PARUH_WAKTU','SPMT_PW',              'WAJIB',       NULL, NULL::int, 56),
  ('PPPK_TENDIK_PARUH_WAKTU','SURAT_PERNYATAAN_TUGAS','WAJIB',      NULL, NULL::int, 57),
  ('PPPK_TENDIK_PARUH_WAKTU','SK_PENEMPATAN',        'WAJIB',       NULL, NULL::int, 58),
  ('PPPK_TENDIK_PARUH_WAKTU','SK_PENUGASAN',         'WAJIB',       NULL, NULL::int, 59),
  ('PPPK_TENDIK_PARUH_WAKTU','SKP',                  'WAJIB',       NULL, NULL::int, 60),
  ('PPPK_TENDIK_PARUH_WAKTU','SK_TUGAS_TAMBAHAN',    'KONDISIONAL', 'jabatan_tambahan', NULL::int, 70),
  ('PPPK_TENDIK_PARUH_WAKTU','DOK_ALOKASI_PW',       'OPSIONAL',    NULL, NULL::int, 90),
  ('PPPK_TENDIK_PARUH_WAKTU','HASIL_PENGUSULAN_PW',  'OPSIONAL',    NULL, NULL::int, 91),
  ('PPPK_TENDIK_PARUH_WAKTU','PERTEK_NI_PPPK_PW',    'OPSIONAL',    NULL, NULL::int, 92),
  ('PPPK_TENDIK_PARUH_WAKTU','PETIKAN_SK_PW',        'OPSIONAL',    NULL, NULL::int, 93),
  ('PPPK_TENDIK_PARUH_WAKTU','EKSPEKTASI_KINERJA',   'OPSIONAL',    NULL, NULL::int, 94),
  ('PPPK_TENDIK_PARUH_WAKTU','PK_PERPANJANGAN',      'OPSIONAL',    NULL, NULL::int, 95),
  ('PPPK_TENDIK_PARUH_WAKTU','PK_PERUBAHAN',         'OPSIONAL',    NULL, NULL::int, 96),
  ('PPPK_TENDIK_PARUH_WAKTU','PK_PERUBAHAN_SKEMA',   'OPSIONAL',    NULL, NULL::int, 97),
  ('PPPK_TENDIK_PARUH_WAKTU','EVALUASI_PK',          'OPSIONAL',    NULL, NULL::int, 98),
  ('PPPK_TENDIK_PARUH_WAKTU','DOK_PERUBAHAN_UNIT_PK','OPSIONAL',    NULL, NULL::int, 100),
  ('PPPK_TENDIK_PARUH_WAKTU','EVALUASI_KINERJA',     'OPSIONAL',    NULL, NULL::int, 101),
  ('PPPK_TENDIK_PARUH_WAKTU','CAPAIAN_KINERJA',      'OPSIONAL',    NULL, NULL::int, 102),
  ('PPPK_TENDIK_PARUH_WAKTU','SERT_DIKLAT',          'OPSIONAL',    NULL, NULL::int, 103),
  ('PPPK_TENDIK_PARUH_WAKTU','SERT_PELATIHAN',       'OPSIONAL',    NULL, NULL::int, 104),
  ('PPPK_TENDIK_PARUH_WAKTU','SERT_BIMTEK',          'OPSIONAL',    NULL, NULL::int, 105),
  ('PPPK_TENDIK_PARUH_WAKTU','DOK_PENGEMBANGAN_KOMPETENSI','OPSIONAL', NULL, NULL::int, 106)
) AS v(jenis_asn, kode, sifat, kondisi, masa, urutan)
JOIN jenis_dokumen j ON j.kode = v.kode
ON CONFLICT (jenis_asn, jenis_dokumen_kode) DO NOTHING;