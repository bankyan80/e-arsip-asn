// ===== E-Arsip ASN Types =====

export interface Pegawai {
  id: number;
  nip: string;
  nama: string;
  jenisASN: string;
  jabatan: string;
  golongan: string;
  kecamatan: string;
  unitKerja: string;
  email: string;
  hp: string;
  tanggalLahir: string;
  status: 'Aktif' | 'Nonaktif';
  // Field tambahan untuk share link page
  tempatLahir?: string;
  jenisKelamin?: string;
  agama?: string;
  alamat?: string;
  pendidikanTerakhir?: string;
}

export interface Dokumen {
  id: number;
  pegawaiId: number;
  pegawaiNama: string;
  nip: string;
  jenisASN: string;
  jenisDokumen: string;
  tanggal: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  url: string;
  expiry: string;
  fileName: string;
  keterangan: string;
  periode?: string;
  tmtAwal?: string;
  tmtAkhir?: string;
}

export interface Notifikasi {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  read: boolean;
  createdAt: string;
}

export interface AppConfig {
  appsScriptURL: string;
  telegramBotToken: string;
  telegramChatId: string;
}

export interface CurrentUser {
  role: 'admin' | 'pegawai';
  nip: string;
  nama: string;
  pegawaiId?: number;
}

export type ASNType = 'PNS' | 'PPPK_PENUH' | 'PPPK_PARUH' | 'OTHER';

export interface DokumenConfig {
  required: string;
  options: string[];
  hint: string;
  showPPPKPeriod?: boolean;
  periodNote?: string;
  contractDuration?: number; // years
}

export type PageType = 'dashboard' | 'pegawai' | 'dokumen' | 'arsip' | 'approval' | 'laporan' | 'bup' | 'profil' | 'pengaturan';