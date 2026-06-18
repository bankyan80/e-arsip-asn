import { KategoriArsip, JenisDokumen } from '../src/types';

export const STATIC_KATEGORI: KategoriArsip[] = [
  { id: 'KAT1', namaKategori: 'Riwayat Karier', urutan: 1, statusAktif: true },
  { id: 'KAT2', namaKategori: 'Pendidikan', urutan: 2, statusAktif: true },
  { id: 'KAT3', namaKategori: 'Kinerja', urutan: 3, statusAktif: true },
  { id: 'KAT4', namaKategori: 'Data Pribadi', urutan: 4, statusAktif: true },
  { id: 'KAT5', namaKategori: 'Kesehatan dan Disiplin', urutan: 5, statusAktif: true },
];

export const STATIC_JENIS_DOKUMEN: JenisDokumen[] = [
  // Riwayat Karier
  { id: 'JD1_1', kategoriId: 'KAT1', namaKategori: 'Riwayat Karier', namaDokumen: 'SK CPNS/PNS', wajib: false, berlakuUntuk: 'PNS', statusAktif: true },
  { id: 'JD1_2', kategoriId: 'KAT1', namaKategori: 'Riwayat Karier', namaDokumen: 'SK PPPK', wajib: false, berlakuUntuk: 'PPPK', statusAktif: true },
  { id: 'JD1_3', kategoriId: 'KAT1', namaKategori: 'Riwayat Karier', namaDokumen: 'SK Kenaikan Pangkat', wajib: true, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD1_4', kategoriId: 'KAT1', namaKategori: 'Riwayat Karier', namaDokumen: 'SK Jabatan', wajib: true, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD1_5', kategoriId: 'KAT1', namaKategori: 'Riwayat Karier', namaDokumen: 'SK Mutasi', wajib: false, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD1_6', kategoriId: 'KAT1', namaKategori: 'Riwayat Karier', namaDokumen: 'SK Penempatan', wajib: true, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD1_7', kategoriId: 'KAT1', namaKategori: 'Riwayat Karier', namaDokumen: 'SK Pembagian Tugas', wajib: false, berlakuUntuk: 'Semua', statusAktif: true },

  // Pendidikan
  { id: 'JD2_1', kategoriId: 'KAT2', namaKategori: 'Pendidikan', namaDokumen: 'Ijazah', wajib: true, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD2_2', kategoriId: 'KAT2', namaKategori: 'Pendidikan', namaDokumen: 'Transkrip Nilai', wajib: true, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD2_3', kategoriId: 'KAT2', namaKategori: 'Pendidikan', namaDokumen: 'Sertifikat Pendidik', wajib: false, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD2_4', kategoriId: 'KAT2', namaKategori: 'Pendidikan', namaDokumen: 'Sertifikat Pelatihan/Diklat', wajib: false, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD2_5', kategoriId: 'KAT2', namaKategori: 'Pendidikan', namaDokumen: 'Sertifikat Workshop/Seminar', wajib: false, berlakuUntuk: 'Semua', statusAktif: true },

  // Kinerja
  { id: 'JD3_1', kategoriId: 'KAT3', namaKategori: 'Kinerja', namaDokumen: 'SKP', wajib: true, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD3_2', kategoriId: 'KAT3', namaKategori: 'Kinerja', namaDokumen: 'Rekap Absensi', wajib: false, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD3_3', kategoriId: 'KAT3', namaKategori: 'Kinerja', namaDokumen: 'Penilaian Kinerja', wajib: true, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD3_4', kategoriId: 'KAT3', namaKategori: 'Kinerja', namaDokumen: 'Laporan Kinerja', wajib: false, berlakuUntuk: 'Semua', statusAktif: true },

  // Data Pribadi
  { id: 'JD4_1', kategoriId: 'KAT4', namaKategori: 'Data Pribadi', namaDokumen: 'KTP', wajib: true, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD4_2', kategoriId: 'KAT4', namaKategori: 'Data Pribadi', namaDokumen: 'Kartu Keluarga', wajib: true, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD4_3', kategoriId: 'KAT4', namaKategori: 'Data Pribadi', namaDokumen: 'NPWP', wajib: true, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD4_4', kategoriId: 'KAT4', namaKategori: 'Data Pribadi', namaDokumen: 'BPJS', wajib: true, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD4_5', kategoriId: 'KAT4', namaKategori: 'Data Pribadi', namaDokumen: 'Surat Nikah', wajib: false, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD4_6', kategoriId: 'KAT4', namaKategori: 'Data Pribadi', namaDokumen: 'Akta Anak', wajib: false, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD4_7', kategoriId: 'KAT4', namaKategori: 'Data Pribadi', namaDokumen: 'Buku Rekening', wajib: false, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD4_8', kategoriId: 'KAT4', namaKategori: 'Data Pribadi', namaDokumen: 'Daftar Riwayat Hidup', wajib: true, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD4_9', kategoriId: 'KAT4', namaKategori: 'Data Pribadi', namaDokumen: 'Karpeg', wajib: false, berlakuUntuk: 'PNS', statusAktif: true },
  { id: 'JD4_10', kategoriId: 'KAT4', namaKategori: 'Data Pribadi', namaDokumen: 'Taspen', wajib: false, berlakuUntuk: 'PNS', statusAktif: true },
  { id: 'JD4_11', kategoriId: 'KAT4', namaKategori: 'Data Pribadi', namaDokumen: 'KARIS/KARSU', wajib: false, berlakuUntuk: 'PNS', statusAktif: true },

  // Kesehatan dan Disiplin
  { id: 'JD5_1', kategoriId: 'KAT5', namaKategori: 'Kesehatan dan Disiplin', namaDokumen: 'Surat Cuti', wajib: false, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD5_2', kategoriId: 'KAT5', namaKategori: 'Kesehatan dan Disiplin', namaDokumen: 'Riwayat Kesehatan', wajib: false, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD5_3', kategoriId: 'KAT5', namaKategori: 'Kesehatan dan Disiplin', namaDokumen: 'Surat Sakit', wajib: false, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD5_4', kategoriId: 'KAT5', namaKategori: 'Kesehatan dan Disiplin', namaDokumen: 'SK Hukuman Disiplin', wajib: false, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD5_5', kategoriId: 'KAT5', namaKategori: 'Kesehatan dan Disiplin', namaDokumen: 'Surat Teguran', wajib: false, berlakuUntuk: 'Semua', statusAktif: true },
  { id: 'JD5_6', kategoriId: 'KAT5', namaKategori: 'Kesehatan dan Disiplin', namaDokumen: 'Berita Acara Pemeriksaan', wajib: false, berlakuUntuk: 'Semua', statusAktif: true },
];
