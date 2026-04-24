import type { ASNType, DokumenConfig, Pegawai } from './types';

// ===== Jenis ASN Options =====
export const JENIS_ASN_OPTIONS = [
  { group: 'PNS', items: ['PNS Guru', 'PNS Tendik', 'PNS Struktural'] },
  { group: 'PPPK Penuh Waktu', items: ['PPPK Penuh Waktu - Guru', 'PPPK Penuh Waktu - Tendik', 'PPPK Penuh Waktu - Struktural'] },
  { group: 'PPPK Paruh Waktu', items: ['PPPK Paruh Waktu - Guru', 'PPPK Paruh Waktu - Tendik', 'PPPK Paruh Waktu - Struktural'] },
];

export const ALL_JENIS_ASN = JENIS_ASN_OPTIONS.flatMap(g => g.items);

// ===== Jabatan Options =====
export const JABATAN_OPTIONS = [
  { group: 'Jabatan Fungsional Guru', items: ['Guru Kelas', 'Guru Mata Pelajaran', 'Guru BK', 'Guru Penjaskes', 'Guru Besar / Profesor'] },
  { group: 'Jabatan Fungsional Tendik', items: ['Pengawas Sekolah', 'Pustakawan', 'Laboran', 'Tata Usaha', 'Akuntan', 'Arsiparis', 'Pengelola IT'] },
  { group: 'Jabatan Struktural / Pimpinan', items: ['Kepala Dinas', 'Sekretaris Dinas', 'Kepala Bidang', 'Kepala UPT', 'Kepala Sekolah', 'Kepala Sub Bagian', 'Kepala Seksi'] },
  { group: 'Staff / Pelaksana', items: ['Staff', 'Pelaksana', 'Analis Kebijakan', 'Perencana', 'Pranata Komputer'] },
];

// ===== Golongan Options =====
export const GOLONGAN_PNS_OPTIONS = [
  'I/a', 'I/b', 'I/c', 'I/d',
  'II/a', 'II/b', 'II/c', 'II/d',
  'III/a', 'III/b', 'III/c', 'III/d',
  'IV/a', 'IV/b', 'IV/c', 'IV/d', 'IV/e',
];

export const GOLONGAN_PPPK_OPTIONS = [
  { value: 'I', label: 'Golongan I — SD Sederajat' },
  { value: 'IV', label: 'Golongan IV — SMP Sederajat' },
  { value: 'V', label: 'Golongan V — SMA/SLTA/Diploma I Sederajat' },
  { value: 'VI', label: 'Golongan VI — Diploma II' },
  { value: 'VII', label: 'Golongan VII — Diploma III' },
  { value: 'IX', label: 'Golongan IX — Sarjana (S1)/Diploma IV' },
  { value: 'X', label: 'Golongan X — Magister (S2)' },
  { value: 'XI', label: 'Golongan XI — Doktor (S3)' },
];

export const GOLONGAN_OPTIONS = [
  ...GOLONGAN_PNS_OPTIONS,
  ...GOLONGAN_PPPK_OPTIONS.map(g => g.value),
];

export function getGolonganOptions(jenisASN: string): { value: string; label: string }[] {
  const asnType = getASNType(jenisASN);
  if (asnType === 'PNS') {
    return GOLONGAN_PNS_OPTIONS.map(g => ({ value: g, label: g }));
  } else if (asnType === 'PPPK_PENUH' || asnType === 'PPPK_PARUH') {
    return GOLONGAN_PPPK_OPTIONS;
  }
  return [
    ...GOLONGAN_PNS_OPTIONS.map(g => ({ value: g, label: 'PNS — ' + g })),
    ...GOLONGAN_PPPK_OPTIONS,
  ];
}

export function isValidGolongan(jenisASN: string, golongan: string): boolean {
  const options = getGolonganOptions(jenisASN);
  return options.some(o => o.value === golongan);
}

// ===== Unit Kerja Options =====
export const UNIT_KERJA_OPTIONS = [
  'SD Negeri 1', 'SD Negeri 2', 'SMP Negeri 1', 'SMP Negeri 2',
  'SMA Negeri 1', 'SMK Negeri 1', 'UPT Pendidikan',
  'Bidang PAUD', 'Bidang Dikdas', 'Bagian Umum', 'Sub Bagian Kepegawaian',
];

// ===== Dokumen Umum =====
export const DOKUMEN_UMUM = ['Ijazah', 'Sertifikat', 'KTP', 'KK', 'NPWP', 'BPJS', 'Penilaian Kinerja', 'Lainnya'];

// ===== ASN Type Detection =====
export function getASNType(jenisASN: string): ASNType {
  if (!jenisASN) return 'OTHER';
  if (jenisASN.startsWith('PNS')) return 'PNS';
  if (jenisASN.includes('Penuh Waktu')) return 'PPPK_PENUH';
  if (jenisASN.includes('Paruh Waktu')) return 'PPPK_PARUH';
  return 'OTHER';
}

// ===== Dokumen Options per ASN Type =====
export function getDokumenOptions(asnType: ASNType): DokumenConfig {
  const umum = DOKUMEN_UMUM;
  if (asnType === 'PNS') {
    return {
      required: 'SK CPNS',
      options: ['SK CPNS', 'SK PNS', 'SK Kenaikan Pangkat', 'SK Kenaikan Gaji Berkala', 'SK Jabatan', '---', 'Dokumen Umum'],
      hint: 'SK CPNS wajib diisi. Upload riwayat SK Kenaikan Pangkat dan SK Kenaikan Gaji Berkala dari awal sampai akhir karir.',
    };
  } else if (asnType === 'PPPK_PENUH') {
    return {
      required: 'SK PPPK',
      options: ['SK PPPK', 'SK Kenaikan Gaji Berkala', 'SK Jabatan', '---', 'Dokumen Umum'],
      hint: 'SK PPPK berlaku 5 tahun per periode (TMT awal s/d akhir). Lanjut ke periode berikutnya. Upload juga riwayat SK Kenaikan Gaji Berkala.',
      showPPPKPeriod: true,
      periodNote: 'PPPK Penuh Waktu: Setiap periode kontrak berlaku 5 tahun.',
      contractDuration: 5,
    };
  } else if (asnType === 'PPPK_PARUH') {
    return {
      required: 'SK PPPK',
      options: ['SK PPPK', 'SK Jabatan', '---', 'Dokumen Umum'],
      hint: 'SK PPPK Paruh Waktu berlaku 1 tahun. Selanjutnya bisa menjadi PPPK Penuh Waktu atau diperpanjang 1 tahun.',
      showPPPKPeriod: true,
      periodNote: 'PPPK Paruh Waktu: Setiap kontrak berlaku 1 tahun. Selanjutnya bisa naik ke PPPK Penuh Waktu atau diperpanjang.',
      contractDuration: 1,
    };
  }
  return {
    required: '',
    options: ['SK CPNS', 'SK PNS', 'SK PPPK', 'SK Kenaikan Pangkat', 'SK Kenaikan Gaji Berkala', 'SK Jabatan', '---', 'Dokumen Umum'],
    hint: '',
  };
}

// ===== BUP (Batas Usia Pensiun) =====
export function getBUPAge(jabatan: string, golongan: string): number {
  const j = (jabatan || '').toLowerCase();
  const g = (golongan || '').toLowerCase();
  // Pejabat pimpinan tinggi / jabatan administratif tinggi
  if (j.includes('kepala dinas') || j.includes('sekretaris')) return 58;
  // Kepala Sekolah dan Guru → 60 tahun
  if (j.includes('kepala sekolah') || j.includes('guru')) return 60;
  // Kepala UPT, Kepala Bidang, Kepala Seksi, Kepala Sub Bagian → 59 tahun
  if (j.includes('kepala upt') || j.includes('kepala bidang') || j.includes('kepala seksi') || j.includes('kepala sub')) return 59;
  // Golongan III/IV → 60 tahun
  if (g.startsWith('iii/') || g.startsWith('iv/')) return 60;
  // Default
  return 62;
}

export function hasBUP(jenisASN: string): boolean {
  return getASNType(jenisASN) === 'PNS';
}

// ===== Badge Color Map =====
export const JENIS_ASN_BADGE: Record<string, string> = {
  'PNS Guru': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'PNS Tendik': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'PNS Struktural': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'PPPK Penuh Waktu - Guru': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  'PPPK Penuh Waktu - Tendik': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  'PPPK Penuh Waktu - Struktural': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  'PPPK Paruh Waktu - Guru': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'PPPK Paruh Waktu - Tendik': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  'PPPK Paruh Waktu - Struktural': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

// ===== File Upload =====
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const ALLOWED_FILE_TYPES = '.pdf';
export const ALLOWED_MIME_TYPES = ['application/pdf'];

// ===== Dummy Data Generator =====
export function generateDummyPegawai(): Pegawai[] {
  const namaList = [
    'Ahmad Fauzi', 'Siti Nurhaliza', 'Budi Santoso', 'Dewi Sartika', 'Eko Prasetyo',
    'Fitri Handayani', 'Gunawan Wibowo', 'Herlina Putri', 'Irfan Hakim', 'Joko Widodo',
    'Kartini Rahayu', 'Lukman Hakim', 'Mega Wati', 'Nur Hidayah', 'Oscar Pratama',
  ];
  const jenisList = ALL_JENIS_ASN;
  const jabatanList = JABATAN_OPTIONS.flatMap(g => g.items);
  const golonganPNSList = GOLONGAN_PNS_OPTIONS;
  const golonganPPPKList = GOLONGAN_PPPK_OPTIONS.map(g => g.value);
  const unitList = UNIT_KERJA_OPTIONS;

  return namaList.map((nama, i) => {
    const currentJenisASN = jenisList[i % jenisList.length];
    return {
      id: Date.now() + i,
      nip: '19850' + String(i + 1).padStart(4, '0') + '2020011' + String(Math.floor(Math.random() * 4)),
      nama,
      jenisASN: currentJenisASN,
      jabatan: jabatanList[i % jabatanList.length],
      golongan: currentJenisASN.startsWith('PNS')
        ? golonganPNSList[i % golonganPNSList.length]
        : golonganPPPKList[i % golonganPPPKList.length],
      unitKerja: unitList[i % unitList.length],
      email: nama.toLowerCase().replace(' ', '.') + '@dinaspendidikan.go.id',
      hp: '0812' + String(Math.floor(Math.random() * 90000000 + 10000000)),
      tanggalLahir: `19${80 + (i % 10)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      status: (i < 13 ? 'Aktif' : 'Nonaktif') as 'Aktif' | 'Nonaktif',
    };
  });
}