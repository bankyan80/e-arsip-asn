-- ============================================================
-- e-ARSIP ASN — Database Schema (PostgreSQL / Neon)
-- Idempotent: aman dijalankan berulang kali.
-- ============================================================

CREATE TABLE IF NOT EXISTS asn (
  id BIGSERIAL PRIMARY KEY,
  nip VARCHAR(30) NOT NULL UNIQUE,
  nama VARCHAR(200) NOT NULL,
  pangkat VARCHAR(100),
  golongan VARCHAR(20),
  jabatan VARCHAR(200),
  unit_kerja VARCHAR(200),
  status VARCHAR(20) NOT NULL DEFAULT 'PNS',
  email VARCHAR(200),
  no_hp VARCHAR(30),
  alamat TEXT,
  foto_url TEXT,
  telegram_user_id BIGINT,
  telegram_chat_id BIGINT,
  telegram_username VARCHAR(100),
  telegram_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nama VARCHAR(200) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'OPERATOR',
  aktif BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jenis_dokumen (
  id BIGSERIAL PRIMARY KEY,
  kode VARCHAR(60) NOT NULL UNIQUE,
  nama VARCHAR(200) NOT NULL,
  deskripsi TEXT,
  kategori VARCHAR(60),
  wajib BOOLEAN NOT NULL DEFAULT false,
  berlaku_pns BOOLEAN NOT NULL DEFAULT true,
  berlaku_pppk BOOLEAN NOT NULL DEFAULT true,
  urutan INTEGER NOT NULL DEFAULT 0,
  aktif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dokumen (
  id BIGSERIAL PRIMARY KEY,
  asn_id BIGINT REFERENCES asn(id) ON DELETE CASCADE,
  nip VARCHAR(30) NOT NULL,
  jenis_dokumen_id BIGINT REFERENCES jenis_dokumen(id) ON DELETE RESTRICT,
  jenis_dokumen_kode VARCHAR(60) NOT NULL,
  nama_file TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  blob_url TEXT NOT NULL,
  blob_pathname TEXT NOT NULL,
  mime_type VARCHAR(120) NOT NULL DEFAULT 'application/pdf',
  ukuran_file BIGINT NOT NULL DEFAULT 0,
  jumlah_halaman INTEGER NOT NULL DEFAULT 1,
  versi INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'MENUNGGU',
  tanggal_upload TIMESTAMPTZ NOT NULL DEFAULT now(),
  tanggal_verifikasi TIMESTAMPTZ,
  verified_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  catatan_verifikasi TEXT,
  sumber VARCHAR(20) NOT NULL DEFAULT 'foto',
  telegram_file_id TEXT,
  is_latest BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dokumen_nip ON dokumen(nip);
CREATE INDEX IF NOT EXISTS idx_dokumen_jenis ON dokumen(jenis_dokumen_id);
CREATE INDEX IF NOT EXISTS idx_dokumen_status ON dokumen(status);
CREATE INDEX IF NOT EXISTS idx_dokumen_is_latest ON dokumen(is_latest);

CREATE TABLE IF NOT EXISTS upload_session (
  id BIGSERIAL PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  telegram_chat_id BIGINT NOT NULL,
  asn_id BIGINT REFERENCES asn(id) ON DELETE CASCADE,
  nip VARCHAR(30) NOT NULL,
  jenis_dokumen_id BIGINT NOT NULL REFERENCES jenis_dokumen(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'AKTIF',
  foto_file_ids JSONB NOT NULL DEFAULT '[]',
  jumlah_foto INTEGER NOT NULL DEFAULT 0,
  sumber VARCHAR(20) NOT NULL DEFAULT 'foto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_upload_session_telegram ON upload_session(telegram_user_id, status);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  admin_username VARCHAR(100),
  aksi VARCHAR(30) NOT NULL,
  nip VARCHAR(30),
  nama_asn VARCHAR(200),
  dokumen_id BIGINT,
  detail JSONB,
  ip_address VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_nip ON audit_log(nip);

CREATE TABLE IF NOT EXISTS download_log (
  id BIGSERIAL PRIMARY KEY,
  dokumen_id BIGINT REFERENCES dokumen(id) ON DELETE CASCADE,
  admin_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  admin_username VARCHAR(100),
  nip VARCHAR(30),
  aksi VARCHAR(20) NOT NULL DEFAULT 'DOWNLOAD',
  ip_address VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifikasi_config (
  id BIGSERIAL PRIMARY KEY,
  kunci VARCHAR(60) NOT NULL UNIQUE,
  nama VARCHAR(200) NOT NULL,
  aktif BOOLEAN NOT NULL DEFAULT true,
  deskripsi TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  tipe VARCHAR(60) NOT NULL,
  asn_id BIGINT REFERENCES asn(id) ON DELETE CASCADE,
  nip VARCHAR(30),
  telegram_chat_id BIGINT,
  judul VARCHAR(200),
  pesan TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'SENT',
  telegram_message_id BIGINT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_chat ON notifications(telegram_chat_id);

CREATE TABLE IF NOT EXISTS settings (
  kunci VARCHAR(100) PRIMARY KEY,
  nilai TEXT,
  deskripsi TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);