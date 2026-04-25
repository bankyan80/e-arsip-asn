'use client';

import { useMemo } from 'react';
import { Users, FileText, Clock, AlertTriangle, TrendingUp, History, ClipboardCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { useArsipStore } from '@/lib/store';
import { formatDate, getMonthLabels, getUploadPerMonth, getStatusBadgeClass, isExpired } from '@/lib/utils-arsip';
import { JENIS_ASN_BADGE, getASNType, getDokumenOptions } from '@/lib/constants';

const PIE_COLORS = ['#3c6eff', '#22c55e', '#f59e0b'];

const STAT_CARDS = [
  { key: 'asn', label: 'Total ASN Terdaftar', icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', borderAccent: 'border-l-blue-500' },
  { key: 'docs', label: 'Total Dokumen', icon: FileText, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', borderAccent: 'border-l-green-500' },
  { key: 'pending', label: 'Pending Approval', icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', borderAccent: 'border-l-amber-500' },
  { key: 'expired', label: 'Dokumen Kadaluarsa', icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', borderAccent: 'border-l-red-500' },
] as const;

function getRequiredDocTypes(jenisASN: string): string[] {
  const asnType = getASNType(jenisASN);
  const config = getDokumenOptions(asnType);
  const separatorIdx = config.options.indexOf('---');
  if (separatorIdx > -1) return config.options.slice(0, separatorIdx);
  return config.options;
}

function getKelengkapanDokumen(
  pegawaiId: number, jenisASN: string,
  dokumenList: { pegawaiId: number; jenisDokumen: string; status: string }[]
): { required: number; uploaded: number; percentage: number; missing: string[] } {
  const requiredDocs = getRequiredDocTypes(jenisASN);
  if (requiredDocs.length === 0) return { required: 0, uploaded: 0, percentage: 100, missing: [] };
  const pegawaiDocs = dokumenList.filter((d) => d.pegawaiId === pegawaiId && d.status === 'Approved');
  const uploadedTypes = new Set(pegawaiDocs.map((d) => d.jenisDokumen));
  const uploaded = requiredDocs.filter((t) => uploadedTypes.has(t)).length;
  const missing = requiredDocs.filter((t) => !uploadedTypes.has(t));
  const percentage = Math.round((uploaded / requiredDocs.length) * 100);
  return { required: requiredDocs.length, uploaded, percentage, missing };
}

function buildPieData(pegawaiList: ReturnType<typeof useArsipStore.getState>['pegawaiList']) {
  const counts: Record<string, number> = { PNS: 0, 'PPPK Penuh Waktu': 0, 'PPPK Paruh Waktu': 0 };
  for (const pg of pegawaiList) {
    const t = getASNType(pg.jenisASN);
    if (t === 'PNS') counts['PNS']++;
    else if (t === 'PPPK_PENUH') counts['PPPK Penuh Waktu']++;
    else if (t === 'PPPK_PARUH') counts['PPPK Paruh Waktu']++;
  }
  return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
}

function StatCard({ card, value, delay }: { card: (typeof STAT_CARDS)[number]; value: number; delay: number }) {
  const Icon = card.icon;
  return (
    <Card className={`dashboard-animate border border-border/60 bg-white dark:bg-zinc-950 transition-shadow duration-200 hover:shadow-md`} style={{ animationDelay: `${delay}ms` }}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.bg}`}>
          <Icon className={`h-5 w-5 ${card.color}`} strokeWidth={2} />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-medium leading-tight text-muted-foreground">{card.label}</span>
          <span className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">{value.toLocaleString('id-ID')}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-sm dark:bg-zinc-900">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">{payload[0].value} dokumen</p>
    </div>
  );
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number } }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-sm dark:bg-zinc-900">
      <p className="font-medium text-foreground">{payload[0].payload.name}</p>
      <p className="text-muted-foreground">{payload[0].payload.value} pegawai</p>
    </div>
  );
}

export default function DashboardPage() {
  const { currentUser, pegawaiList, dokumenList, setActivePage } = useArsipStore();

  const isPegawaiRole = currentUser?.role === 'pegawai';
  const pegawaiId = currentUser?.pegawaiId;

  const myPegawai = useMemo(() => {
    if (!isPegawaiRole || !pegawaiId) return null;
    return pegawaiList.find((p) => p.id === pegawaiId) || null;
  }, [isPegawaiRole, pegawaiId, pegawaiList]);

  const myUnitKerja = myPegawai?.unitKerja || '';
  const myKecamatan = myPegawai?.kecamatan || '';

  const unitPegawai = useMemo(() => {
    if (!isPegawaiRole || !myUnitKerja) return pegawaiList;
    return pegawaiList.filter((p) => p.unitKerja === myUnitKerja);
  }, [isPegawaiRole, myUnitKerja, pegawaiList]);

  const unitPegawaiIds = useMemo(() => unitPegawai.map((p) => p.id), [unitPegawai]);

  const myDocs = useMemo(() => {
    if (!isPegawaiRole || unitPegawaiIds.length === 0) return dokumenList;
    return dokumenList.filter((d) => unitPegawaiIds.includes(d.pegawaiId));
  }, [isPegawaiRole, unitPegawaiIds, dokumenList]);

  const stats = useMemo(() => {
    const totalASN = isPegawaiRole ? unitPegawai.length : pegawaiList.length;
    const totalDocs = myDocs.length;
    const pendingCount = myDocs.filter((d) => d.status === 'Pending').length;
    const expiredCount = myDocs.filter((d) => isExpired(d.expiry)).length;
    return { totalASN, totalDocs, pendingCount, expiredCount };
  }, [isPegawaiRole, pegawaiList.length, unitPegawai.length, myDocs]);

  const barData = useMemo(() => {
    const months = getMonthLabels();
    const counts = getUploadPerMonth(myDocs);
    return months.map((name, i) => ({ name, value: counts[i] }));
  }, [myDocs]);

  const pieData = useMemo(() => {
    if (isPegawaiRole) return [];
    return buildPieData(pegawaiList);
  }, [isPegawaiRole, pegawaiList]);

  const recentDocs = useMemo(() => {
    return [...myDocs].sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '')).slice(0, 5);
  }, [myDocs]);

  const kelengkapanData = useMemo(() => {
    const list = isPegawaiRole ? unitPegawai : pegawaiList;
    return list.map((pg) => {
      const kel = getKelengkapanDokumen(pg.id, pg.jenisASN, myDocs);
      return { pegawai: pg, ...kel };
    }).sort((a, b) => a.percentage - b.percentage);
  }, [isPegawaiRole, unitPegawai, pegawaiList, myDocs]);

  const rataRataKelengkapan = useMemo(() => {
    if (kelengkapanData.length === 0) return 0;
    const total = kelengkapanData.reduce((sum, d) => sum + d.percentage, 0);
    return Math.round(total / kelengkapanData.length);
  }, [kelengkapanData]);

  const statValues: Record<string, number> = { asn: stats.totalASN, docs: stats.totalDocs, pending: stats.pendingCount, expired: stats.expiredCount };

  const visibleStatCards = useMemo(() => {
    if (isPegawaiRole) return STAT_CARDS.filter((c) => c.key !== 'asn' && c.key !== 'pending');
    return STAT_CARDS;
  }, [isPegawaiRole]);

  function getProgressColor(pct: number): string {
    if (pct >= 80) return 'bg-green-500'; if (pct >= 50) return 'bg-amber-500'; return 'bg-red-500';
  }
  function getProgressTextColor(pct: number): string {
    if (pct >= 80) return 'text-green-600 dark:text-green-400'; if (pct >= 50) return 'text-amber-600 dark:text-amber-400'; return 'text-red-600 dark:text-red-400';
  }

  return (
    <div className="space-y-6">
      <section aria-label="Ringkasan statistik">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {visibleStatCards.map((card, idx) => (
            <StatCard key={card.key} card={card} value={statValues[card.key]} delay={idx * 80} />
          ))}
        </div>
      </section>

      <section aria-label="Grafik statistik">
        <div className={isPegawaiRole ? '' : 'grid grid-cols-1 gap-4 lg:grid-cols-2'}>
          <Card className="dashboard-animate border border-border/60 bg-white dark:bg-zinc-950 transition-shadow duration-200 hover:shadow-md" style={{ animationDelay: '320ms' }}>
            <CardHeader className="pb-2 pt-5 px-5">
              <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-muted-foreground" /><CardTitle className="text-sm font-semibold">Upload Dokumen Bulanan</CardTitle></div>
              <p className="text-xs text-muted-foreground">Tahun {new Date().getFullYear()}</p>
            </CardHeader>
            <CardContent className="px-3 pb-4 pt-0">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
                    <Bar dataKey="value" fill="#3c6eff" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          {!isPegawaiRole && (
          <Card className="dashboard-animate border border-border/60 bg-white dark:bg-zinc-950 transition-shadow duration-200 hover:shadow-md" style={{ animationDelay: '400ms' }}>
            <CardHeader className="pb-2 pt-5 px-5">
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><CardTitle className="text-sm font-semibold">Statistik Pegawai per Kategori</CardTitle></div>
              <p className="text-xs text-muted-foreground">Berdasarkan jenis ASN</p>
            </CardHeader>
            <CardContent className="pb-4 pt-0">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" nameKey="name" strokeWidth={0}>
                      {pieData.map((_entry, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {pieData.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 px-2">
                  {pieData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="font-semibold text-foreground">({entry.value})</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </div>
      </section>

      {/* Kelengkapan Dokumen (Pegawai) */}
      {isPegawaiRole && myUnitKerja && (
      <section aria-label="Kelengkapan dokumen">
        <Card className="dashboard-animate border border-border/60 bg-white dark:bg-zinc-950 transition-shadow duration-200 hover:shadow-md" style={{ animationDelay: '460ms' }}>
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0"><ClipboardCheck className="h-4 w-4 shrink-0 text-[#3c6eff]" /><CardTitle className="text-sm font-semibold">Kelengkapan Dokumen</CardTitle></div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">Rata-rata</span>
                <Badge variant="secondary" className={`text-sm font-bold px-2.5 py-0.5 ${getProgressTextColor(rataRataKelengkapan)}`}>{rataRataKelengkapan}%</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {myKecamatan} &mdash; Unit Kerja: {myUnitKerja} &mdash; Persentase dokumen yang sudah diupload sesuai jenis ASN
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-muted-foreground">Rata-rata Kelengkapan Unit Kerja</span>
                <span className={`text-sm font-bold ${getProgressTextColor(rataRataKelengkapan)}`}>{rataRataKelengkapan}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full transition-all duration-500 ${getProgressColor(rataRataKelengkapan)}`} style={{ width: `${rataRataKelengkapan}%` }} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pegawai</TableHead>
                    <TableHead className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jenis ASN</TableHead>
                    <TableHead className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Dokumen</TableHead>
                    <TableHead className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center w-40">Kelengkapan</TableHead>
                    <TableHead className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Belum Lengkap</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kelengkapanData.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">Tidak ada data pegawai di unit kerja ini.</TableCell></TableRow>
                  ) : (
                    kelengkapanData.map((item) => (
                      <TableRow key={item.pegawai.id} className="border-border/40 transition-colors hover:bg-muted/40">
                        <TableCell className="px-3 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground leading-tight">{item.pegawai.nama}</span>
                            <span className="text-[11px] text-muted-foreground font-mono">{item.pegawai.nip}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2.5">
                          <Badge variant="secondary" className={`text-[10px] font-medium px-1.5 py-0 ${JENIS_ASN_BADGE[item.pegawai.jenisASN] ?? 'bg-muted text-muted-foreground'}`}>{item.pegawai.jenisASN}</Badge>
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-center">
                          <span className="text-sm font-medium text-foreground">{item.uploaded}</span>
                          <span className="text-xs text-muted-foreground">/{item.required}</span>
                        </TableCell>
                        <TableCell className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                              <div className={`h-full rounded-full transition-all duration-500 ${getProgressColor(item.percentage)}`} style={{ width: `${item.percentage}%` }} />
                            </div>
                            <span className={`text-xs font-bold min-w-[36px] text-right ${getProgressTextColor(item.percentage)}`}>{item.percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2.5 hidden md:table-cell">
                          {item.missing.length === 0 ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px] font-medium px-1.5 py-0">Lengkap</Badge>
                          ) : (
                            <span className="text-[11px] text-red-600 dark:text-red-400 leading-tight">{item.missing.join(', ')}</span>
                          )}
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
      )}

      {/* Recent Documents */}
      <section aria-label="Dokumen terbaru">
        <Card className="dashboard-animate border border-border/60 bg-white dark:bg-zinc-950 transition-shadow duration-200 hover:shadow-md" style={{ animationDelay: '480ms' }}>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3 pt-5 px-5">
            <div className="flex items-center gap-2 min-w-0"><History className="h-4 w-4 shrink-0 text-muted-foreground" /><CardTitle className="text-sm font-semibold">Dokumen Terbaru</CardTitle></div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground shrink-0" onClick={() => setActivePage('arsip')}>Lihat Semua <span className="ml-1">&rarr;</span></Button>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="px-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pegawai</TableHead>
                    <TableHead className="px-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jenis Dokumen</TableHead>
                    <TableHead className="px-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal</TableHead>
                    <TableHead className="px-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentDocs.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">Belum ada dokumen yang diunggah.</TableCell></TableRow>
                  ) : (
                    recentDocs.map((doc) => (
                      <TableRow key={doc.id} className="border-border/40 transition-colors hover:bg-muted/40">
                        <TableCell className="px-5 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground leading-tight">{doc.pegawaiNama}</span>
                            <Badge variant="secondary" className={`w-fit mt-0.5 text-[10px] font-medium px-1.5 py-0 ${JENIS_ASN_BADGE[doc.jenisASN] ?? 'bg-muted text-muted-foreground'}`}>{doc.jenisASN}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-3 text-sm text-foreground">{doc.jenisDokumen}</TableCell>
                        <TableCell className="px-5 py-3 text-sm text-muted-foreground whitespace-nowrap">{formatDate(doc.tanggal)}</TableCell>
                        <TableCell className="px-5 py-3 text-right">
                          <Badge variant="secondary" className={`text-[11px] font-semibold px-2 py-0.5 ${getStatusBadgeClass(doc.status)}`}>
                            {doc.status === 'Pending' && '⏳ '}{doc.status === 'Approved' && '✅ '}{doc.status === 'Rejected' && '❌ '}{doc.status}
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