'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  FileDown,
  Printer,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  Filter,
  Users,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useArsipStore } from '@/lib/store';
import { JENIS_ASN_OPTIONS, JENIS_ASN_BADGE, getASNType } from '@/lib/constants';
import { formatDate, getStatusBadgeClass } from '@/lib/utils-arsip';

// ===== Constants =====

const ITEMS_PER_PAGE = 15;

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
];

const CHART_COLORS = {
  PNS: '#3b82f6',
  'PPPK Penuh Waktu': '#10b981',
  'PPPK Paruh Waktu': '#f59e0b',
  Pending: '#eab308',
  Approved: '#22c55e',
  Rejected: '#ef4444',
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

// ===== Helper: Get short ASN category =====

function getASNCategory(jenisASN: string): string {
  if (!jenisASN) return '';
  if (jenisASN.startsWith('PNS')) return 'PNS';
  if (jenisASN.includes('Penuh Waktu')) return 'PPPK Penuh Waktu';
  if (jenisASN.includes('Paruh Waktu')) return 'PPPK Paruh Waktu';
  return jenisASN;
}

// ===== Custom Tooltip for Charts =====

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; fill?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      {label && (
        <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      )}
      {payload.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 text-xs">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: item.fill || CHART_COLORS[item.name as keyof typeof CHART_COLORS] || '#888' }}
          />
          <span className="text-muted-foreground">{item.name}:</span>
          <span className="font-semibold text-foreground">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// ===== Helper: Generate page numbers =====

function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [1];

  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push('...');

  pages.push(total);

  return pages;
}

// ===== Laporan Page Component =====

export default function LaporanPage() {
  const { pegawaiList, dokumenList } = useArsipStore();

  // ===== Filter state =====
  const [filterJenisASN, setFilterJenisASN] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // ===== Print ref =====
  const printRef = useRef<HTMLDivElement>(null);

  // ===== Filtered documents =====
  const filteredDocs = useMemo(() => {
    let result = [...dokumenList];

    // Filter by Jenis ASN
    if (filterJenisASN) {
      const target = filterJenisASN;
      result = result.filter((d) => {
        const asnType = getASNType(d.jenisASN);
        if (target === 'PNS') return asnType === 'PNS';
        if (target === 'PPPK Penuh Waktu') return asnType === 'PPPK_PENUH';
        if (target === 'PPPK Paruh Waktu') return asnType === 'PPPK_PARUH';
        return false;
      });
    }

    // Filter by Status
    if (filterStatus && filterStatus !== 'Semua') {
      result = result.filter((d) => d.status === filterStatus);
    }

    // Sort by tanggal descending
    result.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));

    return result;
  }, [dokumenList, filterJenisASN, filterStatus]);

  // ===== Pagination =====
  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / ITEMS_PER_PAGE));
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDocs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDocs, currentPage]);

  // ===== Handle filter changes with page reset =====
  const handleFilterJenisASN = useCallback((value: string) => {
    setFilterJenisASN(value);
    setCurrentPage(1);
  }, []);

  const handleFilterStatus = useCallback((value: string) => {
    setFilterStatus(value);
    setCurrentPage(1);
  }, []);

  // ===== Stat calculations =====
  const stats = useMemo(() => {
    const activePegawai = pegawaiList.filter((p) => p.status === 'Aktif').length;
    const approvedDocs = dokumenList.filter((d) => d.status === 'Approved').length;
    const rejectedDocs = dokumenList.filter((d) => d.status === 'Rejected').length;
    return { activePegawai, approvedDocs, rejectedDocs };
  }, [pegawaiList, dokumenList]);

  // ===== Chart data: ASN Distribution =====
  const asnDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      PNS: 0,
      'PPPK Penuh Waktu': 0,
      'PPPK Paruh Waktu': 0,
    };

    pegawaiList.forEach((pg) => {
      const cat = getASNCategory(pg.jenisASN);
      if (cat && counts[cat] !== undefined) {
        counts[cat]++;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [pegawaiList]);

  // ===== Chart data: Document Status =====
  const statusDistribution = useMemo(() => {
    const counts = { Pending: 0, Approved: 0, Rejected: 0 };
    dokumenList.forEach((d) => {
      if (counts[d.status] !== undefined) {
        counts[d.status]++;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      fill: CHART_COLORS[name as keyof typeof CHART_COLORS],
    }));
  }, [dokumenList]);

  // ===== CSV Export =====
  const exportCSV = useCallback(() => {
    if (filteredDocs.length === 0) {
      toast.error('Tidak ada data untuk diekspor.');
      return;
    }

    const headers = [
      'No',
      'Nama',
      'NIP',
      'Jenis ASN',
      'Jabatan',
      'Unit Kerja',
      'Jenis Dokumen',
      'Tanggal',
      'Status',
    ];

    const rows = filteredDocs.map((doc, idx) => {
      const pg = pegawaiList.find((p) => p.id === doc.pegawaiId);
      return [
        idx + 1,
        `"${doc.pegawaiNama}"`,
        doc.nip,
        `"${doc.jenisASN}"`,
        pg ? `"${pg.jabatan}"` : '-',
        pg ? `"${pg.unitKerja}"` : '-',
        `"${doc.jenisDokumen}"`,
        doc.tanggal || '-',
        doc.status,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-arsip-asn-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('File CSV berhasil diunduh.');
  }, [filteredDocs, pegawaiList]);

  // ===== PDF Export (via window.print) =====
  const exportPDF = useCallback(() => {
    if (filteredDocs.length === 0) {
      toast.error('Tidak ada data untuk diekspor.');
      return;
    }
    window.print();
  }, [filteredDocs]);

  // ===== Render =====

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <div className="print:hidden">
        <h2 className="text-xl font-bold text-foreground tracking-tight">
          Laporan &amp; Statistik
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Analisis data arsip pegawai ASN
        </p>
      </div>

      {/* ===== Print Header (visible only when printing) ===== */}
      <div className="hidden print:block print:mb-6">
        <h1 className="text-xl font-bold text-black">Laporan Arsip ASN</h1>
        <p className="text-sm text-gray-600">
          Tanggal cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <p className="text-sm text-gray-600">
          Total dokumen: {filteredDocs.length} | Total pegawai aktif: {stats.activePegawai}
        </p>
      </div>

      {/* ===== Stat Cards ===== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 print:hidden">
        {/* Total Pegawai Aktif */}
        <Card className="bg-white dark:bg-zinc-950 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Total Pegawai Aktif
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {stats.activePegawai}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dokumen Disetujui */}
        <Card className="bg-white dark:bg-zinc-950 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Dokumen Disetujui
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {stats.approvedDocs}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dokumen Ditolak */}
        <Card className="bg-white dark:bg-zinc-950 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Dokumen Ditolak
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {stats.rejectedDocs}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== Charts Section ===== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 print:hidden">
        {/* ASN Distribution Pie Chart */}
        <Card className="bg-white dark:bg-zinc-950 shadow-sm">
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <PieChartIcon className="h-4 w-4 text-muted-foreground" />
              Distribusi Jenis ASN
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={asnDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  >
                    {asnDistribution.map((entry, idx) => (
                      <Cell
                        key={entry.name}
                        fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span className="text-xs text-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Document Status Bar Chart */}
        <Card className="bg-white dark:bg-zinc-950 shadow-sm">
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Status Dokumen
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusDistribution}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="value"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={60}
                  >
                    {statusDistribution.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.fill}
                        stroke="none"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== Export Section ===== */}
      <div className="flex items-center gap-3 flex-wrap print:hidden">
        <Button
          variant="outline"
          className="h-9 text-sm"
          onClick={exportCSV}
        >
          <FileDown className="h-4 w-4 mr-2 text-emerald-600" />
          Export ke CSV
        </Button>
        <Button
          variant="outline"
          className="h-9 text-sm"
          onClick={exportPDF}
        >
          <Printer className="h-4 w-4 mr-2 text-blue-600" />
          Export ke PDF
        </Button>
      </div>

      {/* ===== Data Table Section ===== */}
      <div ref={printRef}>
        {/* Filters (hidden when printing) */}
        <Card className="bg-white dark:bg-zinc-950 shadow-sm print:hidden mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Filter Data</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Filter Jenis ASN */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Jenis ASN
                </Label>
                <Select value={filterJenisASN} onValueChange={handleFilterJenisASN}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Semua Jenis ASN" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">Semua Jenis ASN</SelectItem>
                    {JENIS_ASN_OPTIONS.map((group) => (
                      <SelectGroup key={group.group}>
                        <SelectLabel className="font-semibold text-xs text-muted-foreground">
                          {group.group}
                        </SelectLabel>
                        <SelectItem value={group.group}>
                          Semua {group.group}
                        </SelectItem>
                        {group.items.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                        <SelectSeparator />
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filter Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Status
                </Label>
                <Select value={filterStatus} onValueChange={handleFilterStatus}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table Card */}
        <Card className="bg-white dark:bg-zinc-950 shadow-sm overflow-hidden print:shadow-none print:border-0">
          <CardContent className="p-0">
            {/* Results count (hidden when printing) */}
            <div className="hidden print:block px-4 pt-4 pb-2">
              <p className="text-sm text-black font-medium">
                Data Laporan Arsip ASN ({filteredDocs.length} dokumen)
              </p>
            </div>
            <div className="print:hidden px-4 pt-4 pb-2">
              <p className="text-sm text-muted-foreground">
                Menampilkan{' '}
                <span className="font-semibold text-foreground">{filteredDocs.length}</span>{' '}
                dokumen
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-12">
                      No
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Nama
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                      NIP
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                      Jenis ASN
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden xl:table-cell">
                      Jabatan
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden xl:table-cell">
                      Unit Kerja
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Jenis Dokumen
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                      Tanggal
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(typeof window !== 'undefined' && window.matchMedia('print').matches
                    ? filteredDocs
                    : paginatedDocs
                  ).map((doc, index) => {
                    const pg = pegawaiList.find((p) => p.id === doc.pegawaiId);
                    const globalIndex =
                      typeof window !== 'undefined' && window.matchMedia('print').matches
                        ? index + 1
                        : (currentPage - 1) * ITEMS_PER_PAGE + index + 1;

                    return (
                      <TableRow
                        key={doc.id}
                        className="border-border/40 transition-colors hover:bg-muted/40 print:hover:bg-transparent"
                      >
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground print:text-black">
                          {globalIndex}
                        </TableCell>
                        <TableCell className="px-4 py-3 print:text-black">
                          <span className="text-sm font-medium text-foreground print:text-black leading-tight">
                            {doc.pegawaiNama}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap hidden md:table-cell print:table-cell print:text-black">
                          {doc.nip}
                        </TableCell>
                        <TableCell className="px-4 py-3 hidden lg:table-cell print:table-cell">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-medium px-1.5 py-0 print:bg-gray-200 print:text-gray-800 ${
                              JENIS_ASN_BADGE[doc.jenisASN] ?? 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {getASNCategory(doc.jenisASN)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground hidden xl:table-cell print:table-cell print:text-black">
                          {pg?.jabatan || '-'}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground hidden xl:table-cell print:table-cell print:text-black">
                          {pg?.unitKerja || '-'}
                        </TableCell>
                        <TableCell className="px-4 py-3 print:text-black">
                          <span className="text-sm text-foreground print:text-black leading-tight">
                            {doc.jenisDokumen}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap hidden sm:table-cell print:table-cell print:text-black">
                          {formatDate(doc.tanggal)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center print:text-black">
                          <Badge
                            variant="secondary"
                            className={`text-[11px] font-semibold px-2 py-0.5 print:bg-gray-200 print:text-gray-800 ${getStatusBadgeClass(doc.status)}`}
                          >
                            {doc.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination (hidden when printing) */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3 print:hidden">
                <p className="text-xs text-muted-foreground">
                  Halaman {currentPage} dari {totalPages}
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    aria-label="Halaman sebelumnya"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {generatePageNumbers(currentPage, totalPages).map((page, idx) =>
                    page === '...' ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="flex h-8 w-8 items-center justify-center text-xs text-muted-foreground"
                      >
                        ...
                      </span>
                    ) : (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="icon"
                        className="h-8 w-8 text-xs"
                        onClick={() => setCurrentPage(page as number)}
                        aria-label={`Halaman ${page}`}
                      >
                        {page}
                      </Button>
                    )
                  )}

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Halaman berikutnya"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Empty state */}
            {filteredDocs.length === 0 && (
              <div className="py-16 text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-3">
                    <Download className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Tidak ada data dokumen
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {pegawaiList.length === 0
                      ? 'Belum ada data pegawai tersedia.'
                      : 'Belum ada dokumen arsip.'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}