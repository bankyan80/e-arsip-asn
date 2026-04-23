export interface Pegawai {
  id: number;
  nip: string;
  nama: string;
  jenisASN: string;
  golongan: string;
  jabatan: string;
  unitKerja: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  agama: string;
  email: string;
  hp: string;
  alamat: string;
  pendidikanTerakhir: string;
  status: string;
  masaBerlaku: string;
}

export interface Dokumen {
  id: number;
  pegawaiId: number;
  pegawaiNama: string;
  nip: string;
  jenisASN: string;
  jenisDokumen: string;
  tanggal: string;
  status: string;
  url: string;
  fileName: string;
  expiry: string;
  keterangan: string;
  periode: string;
  tmtAwal: string;
  tmtAkhir: string;
  filePath: string;
  fileSize: number;
}

export interface Notifikasi {
  id: number;
  pesan: string;
  tipe: string;
  dibaca: boolean;
  tanggal: string;
}

export interface AppConfig {
  namaInstansi: string;
  alamatInstansi: string;
  teleponInstansi: string;
  emailInstansi: string;
  maxFileUpload: number;
  blurThreshold: number;
  autoApprove: boolean;
  retentionDays: number;
}

export interface CurrentUser {
  nip: string;
  nama: string;
  role: 'admin' | 'pegawai';
  jenisASN?: string;
}

export type PageType = 'dashboard' | 'pegawai' | 'dokumen' | 'arsip' | 'approval' | 'laporan' | 'bup';

export interface PDFQualityResult {
  score: number;
  isBlurry: boolean;
  error?: string;
}