'use client';

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Hourglass,
  AlertTriangle,
  Clock,
  Calendar,
  Download,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { useArsipStore } from '@/lib/store';
import {
  JENIS_ASN_OPTIONS,
  JENIS_ASN_BADGE,
  getBUPAge,
  hasBUP,
  getASNType,
} from '@/lib/constants';
import {
  formatDate,
  calculateAge,
  calculateRemainingDays,
  calculateBMPPensiun,
} from '@/lib/utils-arsip';

// ===== Constants =====

const ITEMS_PER_PAGE = 10;

const STAT_CARDS = [
  {
    key: 'mendekati' as const,
    label: 'Mendekati BUP',
    sub: '< 1 tahun',
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    borderAccent: 'border-l-red-500',
  },
  {
    key: 'satuTiga' as const,
    label: '1-3 Tahun Menuju BUP',
    sub: 'Perlu perhatian',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    borderAccent: 'border-l-amber-500',
  },
  {
    key: 'tigaLima' as const,
    label: '3-5 Tahun Menuju BUP',
    sub: 'Masih aman',
    icon: Calendar,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-100 dark:bg-sky-900/30',
    borderAccent: 'border-l-sky-500',
  },
  {
    key: 'melewati' as const,
    label: 'Sudah Melewati BUP',
    sub: 'Harus pensiun',
    icon: Hourglass,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    borderAccent: 'border-l-red-500',
  },
] as const;

type BUPCategory = 'mendekati' | 'satuTiga' | 'tigaLima' | 'melewati' | 'aman';

// ===== Helpers =====

function categorizeBUP(remainingDays: number): BUPCategory {
  if (remainingDays === 0) return 'melewati';
  if (remainingDays <= 365) return 'mendekati';
  if (remainingDays <= 365 * 3) return 'satuTiga';
  if (remainingDays <= 365 * 5) return 'tigaLima';
  return 'aman';
}

function formatRemainingTime(days: number): string {
  if (days === 0) return 'Sudah BUP';
  if (days < 30) return `${days} hari`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} bulan`;
  }
  const years = Math.floor(days / 365);
  const remainingMonths = Math.floor((days % 365) / 30);
  if (remainingMonths === 0) return `${years} tahun`;
  return `${years} tahun ${remainingMonths} bulan`;
}

function getStatusBadge(category: BUPCategory): { label: string; className: string } {
  switch (category) {
    case 'melewati':
      return {
        label: 'Sudah BUP',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      };
    case 'mendekati':
      return {
        label: 'Mendekati BUP',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      };
    case 'satuTiga':
      return {
        label: 'Perlu Perhatian',
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      };
    case 'tigaLima':
      return {
        label: 'Perlu Perhatian',
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      };
    case 'aman':
      return {
        label: 'Aman',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      };
  }
}

function getRowHighlight(category: BUPCategory): string {
  switch (category) {
    case 'melewati':
      return 'bg-red-50/60 dark:bg-red-950/20';
    case 'mendekati':
      return 'bg-red-50/40 dark:bg-red-950/10';
    case 'satuTiga':
      return 'bg-amber-50/40 dark:bg-amber-950/10';
    default:
      return '';
  }
}

// ===== Stat Card Component =====

function BUPStatCard({
  card,
  value,
  delay,
}: {
  card: (typeof STAT_CARDS)[number];
  value: number;
  delay: number;
}) {
  const Icon = card.icon;

  return (
    <Card
      className="dashboard-animate border border-border/60 bg-white dark:bg-zinc-950 transition-shadow duration-200 hover:shadow-md"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.bg}`}
        >
          <Icon className={`h-5 w-5 ${card.color}`} strokeWidth={2} />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-medium leading-tight text-muted-foreground">
            {card.label}
          </span>
          <span className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
            {value.toLocaleString('id-ID')}
          </span>
          <span className="text-[11px] text-muted-foreground/70">{card.sub}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== Main BUP Page =====

export default function BUPPage() {
  const { pegawaiList } = useArsipStore();

  // State
  const [search, setSearch] = useState('');
  const [filterJenisASN, setFilterJenisASN] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // ===== Compute BUP data for PNS only (PPPK tidak memiliki BUP) =====
  const bupData = useMemo(() => {
    return pegawaiList
      .filter((pg) => hasBUP(pg.jenisASN))
      .map((pg) => {
      const bupAge = getBUPAge(pg.jabatan, pg.golongan);
      const remainingDays = calculateRemainingDays(pg.tanggalLahir, bupAge);
      const tmtPensiun = calculateBMPPensiun(pg.tanggalLahir, bupAge);
      const currentAge = calculateAge(pg.tanggalLahir);
      const category = categorizeBUP(remainingDays);

      return {
        ...pg,
        bupAge,
        remainingDays,
        tmtPensiun,
        currentAge,
        category,
      };
    });
  }, [pegawaiList]);

  // ===== Stat counts =====
  const stats = useMemo(() => {
    const counts: Record<string, number> = {
      mendekati: 0,
      satuTiga: 0,
      tigaLima: 0,
      melewati: 0,
    };
    for (const item of bupData) {
      if (item.category in counts) {
        counts[item.category]++;
      }
    }
    return counts;
  }, [bupData]);

  // ===== Filtered data =====
  const filteredData = useMemo(() => {
    let data = [...bupData];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          p.nama.toLowerCase().includes(q) || p.nip.toLowerCase().includes(q)
      );
    }

    // Jenis ASN filter
    if (filterJenisASN) {
      data = data.filter((p) => p.jenisASN === filterJenisASN);
    }

    // Sort by remaining days ascending (closest BUP first)
    data.sort((a, b) => a.remainingDays - b.remainingDays);

    return data;
  }, [bupData, search, filterJenisASN]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  // ===== Reset page when filters change =====
  const updateSearch = useCallback((v: string) => { setSearch(v); setCurrentPage(1); }, []);
  const updateJenisASN = useCallback((v: string) => { setFilterJenisASN(v); setCurrentPage(1); }, []);

  // ===== Export CSV =====
  const handleExport = useCallback(() => {
    const headers = [
      'No',
      'NIP',
      'Nama',
      'Jenis ASN',
      'Jabatan',
      'Golongan',
      'Tanggal Lahir',
      'Usia',
      'Usia BUP',
      'TMT Pensiun',
      'Sisa Waktu (Hari)',
      'Status',
    ];

    const rows = filteredData.map((item, idx) => [
      idx + 1,
      item.nip,
      `"${item.nama}"`,
      `"${item.jenisASN}"`,
      `"${item.jabatan}"`,
      item.golongan,
      item.tanggalLahir,
      item.currentAge,
      item.bupAge,
      item.tmtPensiun,
      item.remainingDays,
      getStatusBadge(item.category).label,
    ]);

    const csvContent =
      '\uFEFF' +
      headers.join(',') +
      '\n' +
      rows.map((row) => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data_bup_pensiun_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Data BUP berhasil diekspor ke CSV');
  }, [filteredData]);

  // ===== Render =====

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <section aria-label="Header BUP Pensiun">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                BUP Pensiun
              </h2>
              {stats.mendekati > 0 && (
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 text-xs font-semibold px-2.5 py-1">
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                  {stats.mendekati} pegawai mendekati BUP
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Pemantauan batas usia pensiun pegawai ASN
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleExport}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30 gap-2"
          >
            <Download className="h-4 w-4" />
            Export Data BUP
          </Button>
        </div>
      </section>

      {/* ===== Stat Cards ===== */}
      <section aria-label="Ringkasan statistik BUP">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STAT_CARDS.map((card, idx) => (
            <BUPStatCard
              key={card.key}
              card={card}
              value={stats[card.key]}
              delay={idx * 80}
            />
          ))}
        </div>
      </section>

      {/* ===== Filter Bar ===== */}
      <Card className="border-border/60 bg-white dark:bg-zinc-950">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Cari nama atau NIP..."
                value={search}
                onChange={(e) => updateSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filter Jenis ASN */}
            <select
              value={filterJenisASN}
              onChange={(e) => updateJenisASN(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Semua Jenis ASN</option>
              {JENIS_ASN_OPTIONS.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.items.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* ===== BUP Table ===== */}
      <Card className="border-border/60 bg-white dark:bg-zinc-950">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-10">
                    No
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    NIP
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nama
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Jenis ASN
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                    Jabatan
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                    Golongan
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden xl:table-cell">
                    Tgl Lahir
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                    Usia BUP
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                    TMT Pensiun
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Sisa Waktu
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="px-4 py-12 text-center"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Hourglass className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-muted-foreground">
                          Tidak ada data BUP ditemukan
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          Coba ubah filter pencarian Anda
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item, idx) => {
                    const rowNum = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                    const asnBadgeClass =
                      JENIS_ASN_BADGE[item.jenisASN] ??
                      'bg-muted text-muted-foreground';
                    const statusBadge = getStatusBadge(item.category);
                    const rowHighlight = getRowHighlight(item.category);

                    return (
                      <TableRow
                        key={item.id}
                        className={`border-border/40 transition-colors hover:bg-muted/40 ${rowHighlight}`}
                      >
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                          {rowNum}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm font-mono text-foreground whitespace-nowrap">
                          {item.nip}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <span className="text-sm font-medium text-foreground">
                            {item.nama}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge
                            variant="secondary"
                            className={`text-[11px] font-medium px-2 py-0.5 ${asnBadgeClass}`}
                          >
                            {item.jenisASN}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-foreground hidden lg:table-cell">
                          {item.jabatan || '-'}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-foreground hidden md:table-cell">
                          {item.golongan || '-'}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground hidden xl:table-cell whitespace-nowrap">
                          {formatDate(item.tanggalLahir)}
                        </TableCell>
                        <TableCell className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm font-medium text-foreground">
                            {item.bupAge} tahun
                          </span>
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            ({item.currentAge} thn)
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-foreground hidden md:table-cell whitespace-nowrap">
                          {item.tmtPensiun}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <span
                            className={`text-sm font-semibold ${
                              item.category === 'melewati'
                                ? 'text-red-600 dark:text-red-400'
                                : item.category === 'mendekati'
                                  ? 'text-red-600 dark:text-red-400'
                                  : item.category === 'satuTiga'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-foreground'
                            }`}
                          >
                            {formatRemainingTime(item.remainingDays)}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge
                            variant="secondary"
                            className={`text-[11px] font-semibold px-2 py-0.5 ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* ===== Pagination ===== */}
          {filteredData.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Menampilkan{' '}
                <span className="font-medium text-foreground">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                </span>
                {' - '}
                <span className="font-medium text-foreground">
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}
                </span>
                {' dari '}
                <span className="font-medium text-foreground">
                  {filteredData.length}
                </span>{' '}
                pegawai
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Sebelumnya
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Selanjutnya
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}