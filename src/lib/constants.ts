import type { ASNType, DokumenConfig } from './types';

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
export const GOLONGAN_OPTIONS = [
  'I/a', 'I/b', 'I/c', 'I/d',
  'II/a', 'II/b', 'II/c', 'II/d',
  'III/a', 'III/b', 'III/c', 'III/d',
  'IV/a', 'IV/b', 'IV/c', 'IV/d', 'IV/e',
];

// ===== Kecamatan Options (40 Kecamatan Kabupaten Cirebon) =====
export const KECAMATAN_OPTIONS = [
  'Kec. Arjawinangun', 'Kec. Astanajapura', 'Kec. Babakan', 'Kec. Beber',
  'Kec. Ciledug', 'Kec. Ciwaringin', 'Kec. Depok', 'Kec. Dukupuntang',
  'Kec. Gebang', 'Kec. Gegesik', 'Kec. Gempol', 'Kec. Greged',
  'Kec. Gunungjati', 'Kec. Jamblang', 'Kec. Kaliwedi', 'Kec. Kapetakan',
  'Kec. Karangsembung', 'Kec. Karangwareng', 'Kec. Kedawung', 'Kec. Klangenan',
  'Kec. Lemahabang', 'Kec. Losari', 'Kec. Mundu', 'Kec. Pabedilan',
  'Kec. Pabuaran', 'Kec. Palimanan', 'Kec. Pangenan', 'Kec. Panguragan',
  'Kec. Pasaleman', 'Kec. Plered', 'Kec. Plumbon', 'Kec. Sedong',
  'Kec. Sumber', 'Kec. Suranenggala', 'Kec. Susukan', 'Kec. Susukanlebak',
  'Kec. Talun', 'Kec. Tengahtani', 'Kec. Waled', 'Kec. Weru',
];

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
      options: ['SK CPNS', 'SK PNS', 'SK Kenaikan Pangkat', 'SK Kenaikan Gaji Berkala', 'SK Jabatan', '---', 'Dokumen Umum'].concat(umum),
      hint: 'SK CPNS wajib diisi. Upload riwayat SK Kenaikan Pangkat dan SK Kenaikan Gaji Berkala dari awal sampai akhir karir.',
    };
  } else if (asnType === 'PPPK_PENUH') {
    return {
      required: 'SK PPPK',
      options: ['SK PPPK', 'SK Kenaikan Gaji Berkala', 'SK Jabatan', '---', 'Dokumen Umum'].concat(umum),
      hint: 'SK PPPK berlaku 5 tahun per periode (TMT awal s/d akhir). Lanjut ke periode berikutnya. Upload juga riwayat SK Kenaikan Gaji Berkala.',
      showPPPKPeriod: true,
      periodNote: 'PPPK Penuh Waktu: Setiap periode kontrak berlaku 5 tahun.',
      contractDuration: 5,
    };
  } else if (asnType === 'PPPK_PARUH') {
    return {
      required: 'SK PPPK',
      options: ['SK PPPK', 'SK Jabatan', '---', 'Dokumen Umum'].concat(umum.filter(x => x !== 'Taspen')),
      hint: 'SK PPPK Paruh Waktu berlaku 1 tahun. Selanjutnya bisa menjadi PPPK Penuh Waktu atau diperpanjang 1 tahun.',
      showPPPKPeriod: true,
      periodNote: 'PPPK Paruh Waktu: Setiap kontrak berlaku 1 tahun. Selanjutnya bisa naik ke PPPK Penuh Waktu atau diperpanjang.',
      contractDuration: 1,
    };
  }
  return {
    required: '',
    options: ['SK CPNS', 'SK PNS', 'SK PPPK', 'SK Kenaikan Pangkat', 'SK Kenaikan Gaji Berkala', 'SK Jabatan', '---', 'Dokumen Umum'].concat(umum),
    hint: '',
  };
}

// ===== BUP (Batas Usia Pensiun) =====
export function getBUPAge(jabatan: string, golongan: string): number {
  const j = (jabatan || '').toLowerCase();
  const g = (golongan || '').toLowerCase();
  if (j.includes('kepala dinas') || j.includes('sekretaris') || g.startsWith('iv/')) return 58;
  if (j.includes('kepala sekolah') || j.includes('kepala upt') || j.includes('kepala bidang') || j.includes('kepala seksi') || j.includes('kepala sub')) return 59;
  if (g.startsWith('iii/') || g.startsWith('iv/')) return 60;
  return 62;
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
export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
export const ALLOWED_FILE_TYPES = '.pdf,.jpg,.jpeg,.png';
export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

// ===== Golongan Options (dynamic based on jenisASN) =====
export const GOLONGAN_PPPK_OPTIONS: { value: string; label: string }[] = [
  { value: 'I', label: 'Golongan I - SD hingga SMP sederajat' },
  { value: 'II', label: 'Golongan II - SD hingga SMP sederajat' },
  { value: 'III', label: 'Golongan III - SD hingga SMP sederajat' },
  { value: 'IV', label: 'Golongan IV - SD hingga SMP sederajat' },
  { value: 'V', label: 'Golongan V - SLTA/Diploma I sederajat' },
  { value: 'VI', label: 'Golongan VI - Diploma II' },
  { value: 'VII', label: 'Golongan VII - Diploma III' },
  { value: 'IX', label: 'Golongan IX - Sarjana (S1)/Diploma IV (D4)' },
  { value: 'X', label: 'Golongan X - Magister (S2)' },
  { value: 'XI', label: 'Golongan XI - Tingkat Ahli Muda' },
  { value: 'XII', label: 'Golongan XII - Tingkat Ahli Muda' },
  { value: 'XIII', label: 'Golongan XIII - Tingkat Ahli Madya' },
  { value: 'XIV', label: 'Golongan XIV - Tingkat Ahli Madya' },
  { value: 'XV', label: 'Golongan XV - Tingkat Ahli Utama' },
  { value: 'XVI', label: 'Golongan XVI - Tingkat Ahli Utama' },
  { value: 'XVII', label: 'Golongan XVII - Tingkat Ahli Utama' },
];

export function getGolonganOptions(jenisASN: string): { value: string; label: string }[] {
  // For PPPK (Penuh Waktu & Paruh Waktu) - golongan PPPK khusus
  if (jenisASN && jenisASN.includes('PPPK')) {
    return GOLONGAN_PPPK_OPTIONS;
  }
  // Default (PNS & lainnya): golongan I/a s/d IV/e
  return GOLONGAN_OPTIONS.map((g) => ({ value: g, label: g }));
}