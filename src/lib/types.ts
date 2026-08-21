export type Role = "SUPER ADMIN" | "ADMIN" | "OPERATOR";

export type ASNStatus = "PNS" | "PPPK" | "LAINNYA";

export type DokumenStatus = "MENUNGGU" | "DISETUJUI" | "DITOLAK" | "TERVERIFIKASI";

export type DokumenSumber = "foto" | "pdf" | "scan" | "drive";

export interface ASN {
  id: number;
  nip: string;
  nama: string;
  pangkat: string | null;
  golongan: string | null;
  jabatan: string | null;
  unit_kerja: string | null;
  status: ASNStatus;
  email: string | null;
  no_hp: string | null;
  alamat: string | null;
  foto_url: string | null;
  telegram_user_id: number | null;
  telegram_chat_id: number | null;
  telegram_username: string | null;
  telegram_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  password_hash: string;
  nama: string;
  role: Role;
  aktif: boolean;
  last_login_at: string | null;
}

export interface JenisDokumen {
  id: number;
  kode: string;
  nama: string;
  deskripsi: string | null;
  kategori: string | null;
  wajib: boolean;
  berlaku_pns: boolean;
  berlaku_pppk: boolean;
  urutan: number;
  aktif: boolean;
}

export interface Dokumen {
  id: number;
  asn_id: number | null;
  nip: string;
  jenis_dokumen_id: number;
  jenis_dokumen_kode: string;
  nama_file: string;
  storage_path: string;
  blob_url: string;
  blob_pathname: string;
  mime_type: string;
  ukuran_file: number;
  jumlah_halaman: number;
  versi: number;
  status: DokumenStatus;
  tanggal_upload: string;
  tanggal_verifikasi: string | null;
  verified_by: number | null;
  catatan_verifikasi: string | null;
  sumber: DokumenSumber;
  telegram_file_id: string | null;
  is_latest: boolean;
  created_at: string;
  updated_at: string;
}

export interface UploadSession {
  id: number;
  telegram_user_id: number;
  telegram_chat_id: number;
  asn_id: number | null;
  nip: string;
  jenis_dokumen_id: number;
  status: "AKTIF" | "SELESAI" | "DIBATALKAN";
  foto_file_ids: string[];
  jumlah_foto: number;
  sumber: DokumenSumber;
  created_at: string;
}

export interface AuditLog {
  id: number;
  admin_user_id: number | null;
  admin_username: string | null;
  aksi: string;
  nip: string | null;
  nama_asn: string | null;
  dokumen_id: number | null;
  detail: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface NotificationRecord {
  id: number;
  tipe: string;
  asn_id: number | null;
  nip: string | null;
  telegram_chat_id: number | null;
  judul: string | null;
  pesan: string | null;
  status: string;
  telegram_message_id: number | null;
  error: string | null;
  created_at: string;
}

export interface SettingsRecord {
  kunci: string;
  nilai: string;
  deskripsi: string | null;
}