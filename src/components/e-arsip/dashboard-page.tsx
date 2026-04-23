'use client';

import { useMemo } from 'react';
import { Users, FileText, Clock, AlertTriangle, TrendingUp, History } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { useArsipStore } from '@/lib/store';
import {
  formatDate,
  getMonthLabels,
  getUploadPerMonth,
  getStatusBadgeClass,
  isExpired,
} from '@/lib/utils-arsip';
import { JENIS_ASN_BADGE, getASNType } from '@/lib/constants';

// ===== Constants =====

const PIE_COLORS = ['#3c6eff', '#22c55e', '#f59e0b'];

const STAT_CARDS = [
  {
    key: 'asn',
    label: 'Total ASN Terdaftar',
    icon: Users,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    borderAccent: 'border-l-blue-500',
  },
  {
    key: 'docs',
    label: 'Total Dokumen',
    icon: FileText,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    borderAccent: 'border-l-green-500',
  },
  {
    key: 'pending',
    label: 'Pending Approval',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    borderAccent: 'border-l-amber-500',
  },
  {
    key: 'expired',
    label: 'Dokumen Kadaluarsa',
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    borderAccent: 'border-l-red-500',
  },
] as const;

// ===== Helper: Pie data builder =====

function buildPieData(pegawaiList: ReturnType<typeof useArsipStore.getState>['pegawaiList']) {
  const counts: Record<string, number> = {
    PNS: 0,
    'PPPK Penuh Waktu': 0,
    'PPPK Paruh Waktu': 0,
  };

  for (const pg of pegawaiList) {
    const t = getASNType(pg.jenisASN);
    if (t === 'PNS') counts['PNS']++;
    else if (t === 'PPPK_PENUH') counts['PPPK Penuh Waktu']++;
    else if (t === 'PPPK_PARUH') counts['PPPK Paruh Waktu']++;
  }

  return Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));
}

// ===== Stat Card Component =====

function StatCard({
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
      className={`dashboard-animate border border-border/60 bg-white dark:bg-zinc-950 transition-shadow duration-200 hover:shadow-md`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="flex items-center gap-4 p-5">
        {/* Icon square */}
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.bg}`}
        >
          <Icon className={`h-5 w-5 ${card.color}`} strokeWidth={2} />
        </div>

        {/* Text */}
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-medium leading-tight text-muted-foreground">
            {card.label}
          </span>
          <span className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
            {value.toLocaleString('id-ID')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== Custom Tooltip for BarChart =====

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-sm dark:bg-zinc-900">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">
        {payload[0].value} dokumen
      </p>
    </div>
  );
}

// ===== Custom Tooltip for PieChart =====

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number } }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-sm dark:bg-zinc-900">
      <p className="font-medium text-foreground">{payload[0].payload.name}</p>
      <p className="text-muted-foreground">
        {payload[0].payload.value} pegawai
      </p>
    </div>
  );
}

// ===== Main Dashboard Page =====

export default function DashboardPage() {
  const { pegawaiList, dokumenList, setActivePage } = useArsipStore();

  // ===== Computed values =====

  const stats = useMemo(() => {
    const totalASN = pegawaiList.length;
    const totalDocs = dokumenList.length;
    const pendingCount = dokumenList.filter((d) => d.status === 'Pending').length;
    const expiredCount = dokumenList.filter((d) => isExpired(d.expiry)).length;
    return { totalASN, totalDocs, pendingCount, expiredCount };
  }, [pegawaiList.length, dokumenList]);

  const barData = useMemo(() => {
    const months = getMonthLabels();
    const counts = getUploadPerMonth(dokumenList);
    return months.map((name, i) => ({ name, value: counts[i] }));
  }, [dokumenList]);

  const pieData = useMemo(() => buildPieData(pegawaiList), [pegawaiList]);

  const recentDocs = useMemo(() => {
    return [...dokumenList]
      .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''))
      .slice(0, 5);
  }, [dokumenList]);

  // ===== Stat values mapped by key =====

  const statValues: Record<string, number> = {
    asn: stats.totalASN,
    docs: stats.totalDocs,
    pending: stats.pendingCount,
    expired: stats.expiredCount,
  };

  return (
    <div className="space-y-6">
        {/* ===== Stat Cards ===== */}
        <section aria-label="Ringkasan statistik">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {STAT_CARDS.map((card, idx) => (
              <StatCard
                key={card.key}
                card={card}
                value={statValues[card.key]}
                delay={idx * 80}
              />
            ))}
          </div>
        </section>

        {/* ===== Charts ===== */}
        <section aria-label="Grafik statistik">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Bar Chart: Upload per Month */}
            <Card
              className="dashboard-animate border border-border/60 bg-white dark:bg-zinc-950 transition-shadow duration-200 hover:shadow-md"
              style={{ animationDelay: '320ms' }}
            >
              <CardHeader className="pb-2 pt-5 px-5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold">
                    Upload Dokumen Bulanan
                  </CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tahun {new Date().getFullYear()}
                </p>
              </CardHeader>
              <CardContent className="px-3 pb-4 pt-0">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barData}
                      margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        width={32}
                      />
                      <Tooltip content={<BarTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
                      <Bar
                        dataKey="value"
                        fill="#3c6eff"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pie Chart: Pegawai per Kategori */}
            <Card
              className="dashboard-animate border border-border/60 bg-white dark:bg-zinc-950 transition-shadow duration-200 hover:shadow-md"
              style={{ animationDelay: '400ms' }}
            >
              <CardHeader className="pb-2 pt-5 px-5">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold">
                    Statistik Pegawai per Kategori
                  </CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">
                  Berdasarkan jenis ASN
                </p>
              </CardHeader>
              <CardContent className="pb-4 pt-0">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        strokeWidth={0}
                      >
                        {pieData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                {pieData.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 px-2">
                    {pieData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="text-muted-foreground">{entry.name}</span>
                        <span className="font-semibold text-foreground">({entry.value})</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ===== Recent Documents Table ===== */}
        <section aria-label="Dokumen terbaru">
          <Card
            className="dashboard-animate border border-border/60 bg-white dark:bg-zinc-950 transition-shadow duration-200 hover:shadow-md"
            style={{ animationDelay: '480ms' }}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3 pt-5 px-5">
              <div className="flex items-center gap-2 min-w-0">
                <History className="h-4 w-4 shrink-0 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">
                  Dokumen Terbaru
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => setActivePage('arsip')}
              >
                Lihat Semua
                <span className="ml-1">&rarr;</span>
              </Button>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="px-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Pegawai
                      </TableHead>
                      <TableHead className="px-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Jenis Dokumen
                      </TableHead>
                      <TableHead className="px-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Tanggal
                      </TableHead>
                      <TableHead className="px-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDocs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="px-5 py-10 text-center text-sm text-muted-foreground"
                        >
                          Belum ada dokumen yang diunggah.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentDocs.map((doc) => (
                        <TableRow
                          key={doc.id}
                          className="border-border/40 transition-colors hover:bg-muted/40"
                        >
                          {/* Pegawai */}
                          <TableCell className="px-5 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-medium text-foreground leading-tight">
                                {doc.pegawaiNama}
                              </span>
                              <Badge
                                variant="secondary"
                                className={`w-fit mt-0.5 text-[10px] font-medium px-1.5 py-0 ${
                                  JENIS_ASN_BADGE[doc.jenisASN] ?? 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {doc.jenisASN}
                              </Badge>
                            </div>
                          </TableCell>

                          {/* Jenis Dokumen */}
                          <TableCell className="px-5 py-3 text-sm text-foreground">
                            {doc.jenisDokumen}
                          </TableCell>

                          {/* Tanggal */}
                          <TableCell className="px-5 py-3 text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate(doc.tanggal)}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="px-5 py-3 text-right">
                            <Badge
                              variant="secondary"
                              className={`text-[11px] font-semibold px-2 py-0.5 ${getStatusBadgeClass(doc.status)}`}
                            >
                              {doc.status === 'Pending' && '⏳ '}
                              {doc.status === 'Approved' && '✅ '}
                              {doc.status === 'Rejected' && '❌ '}
                              {doc.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
    </section>
    </div>
  );
}