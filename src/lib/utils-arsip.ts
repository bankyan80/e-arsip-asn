import type { Dokumen, Pegawai } from './types';

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
}

export function formatDateShort(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function calculateAge(birthDate: string): number {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function calculateRemainingDays(birthDate: string, bupAge: number): number {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  // TMT Pensiun = 1 bulan setelah bulan lahir di tahun BUP
  const bupYear = birth.getFullYear() + bupAge;
  const tmtMonth = birth.getMonth() + 1;
  const tmtYear = tmtMonth > 11 ? bupYear + 1 : bupYear;
  const tmtMonthActual = tmtMonth > 11 ? 0 : tmtMonth;
  const tmtDate = new Date(tmtYear, tmtMonthActual, 1);
  const diff = tmtDate.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function calculateBMPPensiun(birthDate: string, bupAge: number): string {
  if (!birthDate) return '-';
  const birth = new Date(birthDate);
  // TMT Pensiun = tanggal 1, bulan berikutnya setelah bulan lahir, di tahun BUP
  const bupYear = birth.getFullYear() + bupAge;
  const tmtMonth = birth.getMonth() + 1;
  const tmtYear = tmtMonth > 11 ? bupYear + 1 : bupYear;
  const tmtMonthActual = tmtMonth > 11 ? 0 : tmtMonth;
  const tmtDate = new Date(tmtYear, tmtMonthActual, 1);
  const dd = String(tmtDate.getDate()).padStart(2, '0');
  const mm = String(tmtDate.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${tmtDate.getFullYear()}`;
}

export function isExpired(expiry: string): boolean {
  if (!expiry) return false;
  return new Date(expiry) < new Date();
}

export function groupDocsByType(docs: Dokumen[]): { label: string; items: Dokumen[] }[] {
  const groups: Record<string, Dokumen[]> = {};
  const categoryOrder = ['SK CPNS', 'SK PNS', 'SK PPPK', 'SK Kenaikan Pangkat', 'SK Kenaikan Gaji Berkala', 'SK Jabatan', 'Dokumen Umum'];
  const asnDocs = ['SK CPNS', 'SK PNS', 'SK PPPK', 'SK Kenaikan Pangkat', 'SK Kenaikan Gaji Berkala', 'SK Jabatan'];
  const umumDocs = ['Ijazah', 'Sertifikat', 'KTP', 'KK', 'NPWP', 'BPJS', 'Taspen', 'Penilaian Kinerja', 'Lainnya'];

  docs.sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));
  asnDocs.forEach((cat) => { const items = docs.filter((d) => d.jenisDokumen === cat); if (items.length > 0) groups[cat] = items; });
  const umumItems = docs.filter((d) => umumDocs.includes(d.jenisDokumen));
  if (umumItems.length > 0) groups['Dokumen Umum'] = umumItems;
  const remaining = docs.filter((d) => !asnDocs.includes(d.jenisDokumen) && !umumDocs.includes(d.jenisDokumen));
  if (remaining.length > 0) groups['Lainnya'] = remaining;

  const result: { label: string; items: Dokumen[] }[] = [];
  categoryOrder.forEach((key) => { if (groups[key]) result.push({ label: key, items: groups[key] }); });
  if (groups['Lainnya']) result.push({ label: 'Lainnya', items: groups['Lainnya'] });
  return result.length > 0 ? result : [{ label: 'Semua Dokumen', items: docs }];
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Approved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'Rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    case 'Pending': default: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
  }
}

export function getMonthLabels(): string[] {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
}

export function getUploadPerMonth(docs: Dokumen[]): number[] {
  const currentYear = new Date().getFullYear();
  const counts = new Array(12).fill(0);
  docs.forEach((d) => {
    if (d.tanggal) {
      const parts = d.tanggal.split('-');
      if (parseInt(parts[0]) === currentYear) {
        const month = parseInt(parts[1]) - 1;
        if (month >= 0 && month < 12) counts[month]++;
      }
    }
  });
  return counts;
}

import * as XLSX from 'xlsx';

const TEMPLATE_COLUMNS = [
  { header: 'NIP', key: 'NIP', width: 22 },
  { header: 'Nama', key: 'Nama', width: 30 },
  { header: 'Jenis ASN', key: 'Jenis ASN', width: 32 },
  { header: 'Jabatan', key: 'Jabatan', width: 28 },
  { header: 'Golongan', key: 'Golongan', width: 14 },
  { header: 'Unit Kerja', key: 'Unit Kerja', width: 28 },
  { header: 'Email', key: 'Email', width: 30 },
  { header: 'No HP', key: 'No HP', width: 18 },
  { header: 'Tanggal Lahir', key: 'Tanggal Lahir', width: 16 },
  { header: 'Status', key: 'Status', width: 14 },
] as const;

const TEMPLATE_EXAMPLE: Record<string, string> = {
  'NIP': '198501012020011001', 'Nama': 'Contoh Nama', 'Jenis ASN': 'PNS Guru',
  'Jabatan': 'Guru Kelas', 'Golongan': 'III/a', 'Unit Kerja': 'SD Negeri 1',
  'Email': 'contoh@email.com', 'No HP': '081234567890', 'Tanggal Lahir': '1985-01-01', 'Status': 'Aktif',
};

export function downloadTemplateXLS(): void {
  const wb = XLSX.utils.book_new();
  const headers = TEMPLATE_COLUMNS.map((c) => c.header);
  const wsData = [headers, Object.values(TEMPLATE_EXAMPLE)];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = TEMPLATE_COLUMNS.map((c) => ({ wch: c.width }));

  const guideData = [
    ['PANDUAN PENGISIAN TEMPLATE PEGAWAI'], [''],
    ['KOLOM', 'KETERANGAN'],
    ['NIP', 'Wajib diisi. Nomor Induk Pegawai (18 digit) atau NIK (16 digit).'],
    ['Nama', 'Wajib diisi. Nama lengkap pegawai.'],
    ['Jenis ASN', 'Pilih: PNS Guru, PNS Tendik, PNS Struktural, PPPK Penuh Waktu - Guru/Tendik/Struktural, PPPK Paruh Waktu - Guru/Tendik/Struktural'],
    ['Golongan', 'PNS: I/a - IV/e. PPPK: I, IV, V, VI, VII, IX, X, XI'],
    ['Tanggal Lahir', 'Format: YYYY-MM-DD'],
    ['Status', 'Aktif atau Nonaktif'],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
  wsGuide['!cols'] = [{ wch: 20 }, { wch: 80 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Template Pegawai');
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Panduan');
  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'Template_Pegawai_Arsip.xlsx'; link.click();
  URL.revokeObjectURL(url);
}

export function parseXLSXTemplate(data: ArrayBuffer): Record<string, string>[] {
  const wb = XLSX.read(data, { type: 'array' });
  const wsName = wb.SheetNames[0];
  if (!wsName) return [];
  const ws = wb.Sheets[wsName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (rows.length < 2) return [];
  const headers = (rows[0] as unknown[]).map((h) => String(h || '').trim());
  return rows.slice(1)
    .filter((row) => row.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== ''))
    .map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { const val = row[i]; obj[h] = val !== undefined && val !== null ? String(val).trim() : ''; });
      return obj;
    });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}