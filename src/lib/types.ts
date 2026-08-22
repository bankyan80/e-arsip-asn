export type Role = "SUPER ADMIN" | "ADMIN" | "OPERATOR" | "ADMIN SEKOLAH";

export type ASNStatus = "PNS" | "PPPK" | "LAINNYA";

export type JenisAsn =
  | "PNS"
  | "PPPK_GURU"
  | "PPPK_TENDIK"
  | "PPPK_GURU_PARUH_WAKTU"
  | "PPPK_TENDIK_PARUH_WAKTU";

export const JENIS_ASN_LIST: JenisAsn[] = [
  "PNS",
  "PPPK_GURU",
  "PPPK_TENDIK",
  "PPPK_GURU_PARUH_WAKTU",
  "PPPK_TENDIK_PARUH_WAKTU",
];

export function labelJenisAsn(j: string | null | undefined): string {
  switch (j) {
    case "PNS": return "PNS";
    case "PPPK_GURU": return "PPPK Guru";
    case "PPPK_TENDIK": return "PPPK Tendik";
    case "PPPK_GURU_PARUH_WAKTU": return "PPPK Guru Paruh Waktu";
    case "PPPK_TENDIK_PARUH_WAKTU": return "PPPK Tendik Paruh Waktu";
    default: return "-";
  }
}

export type SifatDokumen = "WAJIB" | "KONDISIONAL" | "OPSIONAL" | "LAINNYA";

export type ItemStatusArsip =
  | "BELUM TERSEDIA"
  | "SUDAH TERUPLOAD"
  | "MENUNGGU VERIFIKASI"
  | "TERVERIFIKASI"
  | "DITOLAK"
  | "PERLU DIPERBARUI"
  | "OPSIONAL";

export interface DocumentRule {
  id: number;
  jenis_asn: JenisAsn;
  jenis_dokumen_kode: string;
  sifat: SifatDokumen;
  kondisi: string | null;
  masa_berlaku_tahun: number | null;
  urutan: number;
  aktif: boolean;
}

export interface ChecklistItem {
  jenis_dokumen_id: number;
  kode: string;
  nama: string;
  kategori: string | null;
  sifat: SifatDokumen;
  kondisi: string | null;
  status: ItemStatusArsip;
  urutan: number;
  dokumen_id: number | null;
  versi: number | null;
  tanggal_upload: string | null;
}

export interface ChecklistSummary {
  total_wajib: number;
  total_kondisional: number;
  total_opsional: number;
  total_lainnya: number;
  tidak_relevan: number;
  terverifikasi: number;
  menunggu: number;
  belum: number;
  perlu_diperbarui: number;
  ditolak: number;
  pct: number;
}

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
  jenis_asn: JenisAsn | null;
  menikah: boolean;
  punya_anak: boolean;
  sertifikat_pendidik: boolean;
  jabatan_tambahan: boolean;
  pernah_mutasi: boolean;
  pernah_naik_pangkat: boolean;
  pernah_diklat: boolean;
  pernah_penghargaan: boolean;
  pernah_hukdis: boolean;
  mendekati_pensiun: boolean;
  pernah_tugas_belajar: boolean;
  pernah_cerai: boolean;
  wajib_lhkpn: boolean;
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
  unit_kerja?: string | null;
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