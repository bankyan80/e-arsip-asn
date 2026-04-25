import type { Dokumen, Pegawai } from './types';

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function randomBirthDate(): string {
  const year = 1975 + Math.floor(Math.random() * 25);
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
  const bupDate = new Date(birth.getFullYear() + bupAge, birth.getMonth(), birth.getDate());
  const diff = bupDate.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function calculateBMPPensiun(birthDate: string, bupAge: number): string {
  if (!birthDate) return '-';
  const birth = new Date(birthDate);
  const bupDate = new Date(birth.getFullYear() + bupAge, birth.getMonth(), birth.getDate());
  return formatDateShort(bupDate.toISOString().split('T')[0]);
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

  asnDocs.forEach((cat) => {
    const items = docs.filter((d) => d.jenisDokumen === cat);
    if (items.length > 0) groups[cat] = items;
  });

  const umumItems = docs.filter((d) => umumDocs.includes(d.jenisDokumen));
  if (umumItems.length > 0) groups['Dokumen Umum'] = umumItems;

  const remaining = docs.filter((d) => !asnDocs.includes(d.jenisDokumen) && !umumDocs.includes(d.jenisDokumen));
  if (remaining.length > 0) groups['Lainnya'] = remaining;

  const result: { label: string; items: Dokumen[] }[] = [];
  categoryOrder.forEach((key) => {
    if (groups[key]) result.push({ label: key, items: groups[key] });
  });
  if (groups['Lainnya']) result.push({ label: 'Lainnya', items: groups['Lainnya'] });

  return result.length > 0 ? result : [{ label: 'Semua Dokumen', items: docs }];
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Approved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'Rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    case 'Pending':
    default: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
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

// Template generation for bulk import
export function downloadTemplateXLS(): void {
  const headers = ['NIP', 'Nama', 'Jenis ASN', 'Jabatan', 'Golongan', 'Kecamatan', 'Unit Kerja', 'Email', 'No HP', 'Tanggal Lahir', 'Status'];
  const csvContent = headers.join(',') + '\n' + '198501012020011001,Contoh Nama,PNS Guru,Guru Kelas,III/a,Kec. Lemahabang,SD Negeri 1,contoh@email.com,081234567890,1985-01-01,Aktif';
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'template_pegawai.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function parseCSVTemplate(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}