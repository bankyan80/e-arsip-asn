export interface Instansi {
  id: string;
  namaInstansi: string;
  alamat?: string;
  kecamatan?: string;
  kabupaten?: string;
  statusAktif: boolean;
}

export interface User {
  id: string;
  pegawaiId: string;
  nip: string;
  nik: string;
  nama: string;
  role: 'pegawai' | 'admin_instansi' | 'super_admin';
  instansiId: string;
  statusAktif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Pegawai {
  id: string;
  instansiId: string;
  namaInstansi: string;
  namaPegawai: string;
  nip: string;
  nik: string;
  tanggalLahir: string; // Format: YYYY-MM-DD
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  jabatan: string;
  statusPegawai: 'PNS' | 'PPPK' | 'PPPK Paruh Waktu' | 'CPNS' | 'Lainnya';
  pangkatGolongan: string;
  pendidikanTerakhir: string;
  nomorHp: string;
  email: string;
  alamat: string;
  password?: string;
  role: 'pegawai' | 'admin_instansi' | 'super_admin';
  statusAktif: boolean;
  loginTerakhir?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KategoriArsip {
  id: string;
  namaKategori: string;
  urutan: number;
  statusAktif: boolean;
}

export interface JenisDokumen {
  id: string;
  kategoriId: string; // References KategoriArsip.id
  namaKategori: string;
  namaDokumen: string;
  wajib: boolean;
  berlakuUntuk: 'Semua' | 'PNS' | 'PPPK' | 'CPNS';
  keterangan?: string;
  statusAktif: boolean;
}

export interface Arsip {
  id: string;
  pegawaiId: string;
  nip: string;
  nik: string;
  namaPegawai: string;
  instansiId: string;
  namaInstansi: string;
  kelompokArsip: string; // namaKategori (e.g., 'Riwayat Karier')
  jenisDokumen: string;  // namaDokumen (e.g., 'SK CPNS/PNS')
  namaDokumen: string;   // Keterangan khusus dari user
  nomorDokumen: string;
  tanggalDokumen: string; // Format: YYYY-MM-DD
  tahun: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  downloadUrl: string;
  statusValidasi: 'Menunggu Validasi' | 'Valid' | 'Perlu Perbaikan' | 'Ditolak';
  catatanAdmin?: string;
  deleted: boolean;
  uploadedAt: string;
  updatedAt: string;
  uploadedBy: string;
  updatedBy: string;
  versionHistory?: DocumentVersion[];
}

export interface DocumentVersion {
  versionId: string;
  fileName: string;
  fileSize: number;
  downloadUrl: string;
  updatedAt: string;
  updatedByNama: string; // e.g. "Ahmad Hidayat (Pegawai)" or "Administrator (Admin)"
  statusValidasi: 'Menunggu Validasi' | 'Valid' | 'Perlu Perbaikan' | 'Ditolak';
  nomorDokumen: string;
  tanggalDokumen: string;
  tahun: string;
  catatanAdmin?: string;
  changeSummary: string; // e.g. "Unggah berkas pertama", "Sunting dokumen oleh pegawai", "Verifikasi berkas oleh admin"
}

export interface Log {
  id: string;
  tanggal: string;
  userId: string;
  pegawaiId: string;
  nip: string;
  namaPegawai: string;
  role: string;
  aksi: string;
  detail: string;
  arsipId?: string;
  namaDokumen?: string;
}

export interface Setting {
  key: string;
  value: string;
  keterangan: string;
}

export interface SessionData {
  id: string;
  pegawaiId: string;
  nip: string;
  nik: string;
  nama: string;
  role: 'pegawai' | 'admin_instansi' | 'super_admin';
  instansiId: string;
  namaInstansi: string;
}
