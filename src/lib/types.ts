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
  tempatLahir?: string;
  jenisKelamin?: string;
  agama?: string;
  alamat?: string;
  pendidikanTerakhir?: string;
  tglPensiun?: string;
  fotoUrl?: string;
}