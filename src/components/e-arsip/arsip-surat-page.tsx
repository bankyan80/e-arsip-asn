'use client';

import { useState, useMemo } from 'react';
import { Archive, Search, ChevronLeft, ChevronRight, Inbox, Send, Download } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useArsipStore } from '@/lib/store';

interface ArsipSuratEntry {
  id: string;
  jenis: 'masuk' | 'keluar';
  nomorSurat: string;
  tanggal: string;
  asal?: string;
  ditujukanKe?: string;
  jenisSurat?: string;
  perihal?: string;
}

const ITEMS_PER_PAGE = 15;

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getBadgeClass(jenis: 'masuk' | 'keluar'): string {
  return jenis === 'masuk'
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
}

export default function ArsipSuratPage() {
  const { suratMasukList, suratKeluarList } = useArsipStore();
  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState<'' | 'masuk' | 'keluar'>('');
  const [currentPage, setCurrentPage] = useState(1);

  const allEntries = useMemo((): ArsipSuratEntry[] => {
    const masuk: ArsipSuratEntry[] = suratMasukList.map((s) => ({
      id: `masuk-${s.id}`, jenis: 'masuk' as const, nomorSurat: s.nomorSurat, tanggal: s.tanggalSurat, asal: s.asalSurat,
    }));
    const keluar: ArsipSuratEntry[] = suratKeluarList.map((s) => ({
      id: `keluar-${s.id}`, jenis: 'keluar' as const, nomorSurat: s.nomorSurat, tanggal: s.tanggalSurat,
      ditujukanKe: s.ditujukanKe, jenisSurat: s.jenisSurat, perihal: s.perihal,
    }));
    return [...masuk, ...keluar].sort((a, b) => {
      const dateA = new Date(a.tanggal).getTime() || 0;
      const dateB = new Date(b.tanggal).getTime() || 0;
      return dateB - dateA;
    });
  }, [suratMasukList, suratKeluarList]);

  const stats = useMemo(() => ({
    total: allEntries.length,
    masuk: allEntries.filter((e) => e.jenis === 'masuk').length,
    keluar: allEntries.filter((e) => e.jenis === 'keluar').length,
  }), [allEntries]);

  const filteredData = useMemo(() => {
    let data = [...allEntries];
    if (filterJenis) data = data.filter((e) => e.jenis === filterJenis);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((e) => {
        const searchable = [e.nomorSurat, e.asal, e.ditujukanKe, e.jenisSurat, e.perihal].filter(Boolean).join(' ').toLowerCase();
        return searchable.includes(q);
      });
    }
    return data;
  }, [allEntries, filterJenis, search]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const updateSearch = (v: string) => { setSearch(v); setCurrentPage(1); };
  const updateFilter = (v: '' | 'masuk' | 'keluar') => { setFilterJenis(v); setCurrentPage(1); };

  const handleExport = () => {
    const headers = ['No', 'Jenis', 'Nomor Surat', 'Tanggal', 'Asal/Ditujukan Ke', 'Keterangan'];
    const rows = filteredData.map((item, idx) => [
      idx + 1,
      item.jenis === 'masuk' ? 'Masuk' : 'Keluar',
      `"${item.nomorSurat}"`,
      `"${formatDate(item.tanggal)}"`,
      `"${item.jenis === 'masuk' ? item.asal : item.ditujukanKe}"`,
      `"${item.jenis === 'keluar' ? (item.jenisSurat ? `${item.jenisSurat} - ${item.perihal}` : item.perihal) : item.asal}"`,
    ]);
    const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `arsip_surat_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section aria-label="Header Arsip Surat">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Arsip Surat</h2>
            <p className="mt-1 text-sm text-muted-foreground">Riwayat seluruh surat masuk dan surat keluar</p>
          </div>
          <Button variant="outline" onClick={handleExport} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30 gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </section>

      <section aria-label="Ringkasan statistik">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-border/60 bg-white dark:bg-zinc-950">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                <Archive className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="text-xs font-medium leading-tight text-muted-foreground">Total Surat</span>
                <span className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">{stats.total}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-white dark:bg-zinc-950">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <Inbox className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="text-xs font-medium leading-tight text-muted-foreground">Surat Masuk</span>
                <span className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">{stats.masuk}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-white dark:bg-zinc-950">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <Send className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="text-xs font-medium leading-tight text-muted-foreground">Surat Keluar</span>
                <span className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">{stats.keluar}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="border-border/60 bg-white dark:bg-zinc-950">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input placeholder="Cari nomor, asal, tujuan, perihal..." value={search} onChange={(e) => updateSearch(e.target.value)} className="pl-9" />
            </div>
            <select value={filterJenis} onChange={(e) => updateFilter(e.target.value as '' | 'masuk' | 'keluar')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
              <option value="">Semua Jenis Surat</option>
              <option value="masuk">Surat Masuk</option>
              <option value="keluar">Surat Keluar</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-white dark:bg-zinc-950">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-10">No</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-24">Jenis</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nomor Surat</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Asal / Tujuan</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Keterangan</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Archive className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-muted-foreground">{search || filterJenis ? 'Tidak ada surat ditemukan' : 'Belum ada data arsip surat'}</p>
                        <p className="text-xs text-muted-foreground/70">{search || filterJenis ? 'Coba ubah filter pencarian' : 'Tambahkan surat masuk atau keluar terlebih dahulu'}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item, idx) => {
                    const rowNum = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                    return (
                      <TableRow key={item.id} className={`border-border/40 transition-colors hover:bg-muted/40 ${item.jenis === 'masuk' ? 'border-l-2 border-l-blue-400' : 'border-l-2 border-l-emerald-400'}`}>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground">{rowNum}</TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge variant="secondary" className={`text-[11px] font-semibold px-2 py-0.5 ${getBadgeClass(item.jenis)}`}>
                            {item.jenis === 'masuk' ? 'Masuk' : 'Keluar'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm font-mono text-foreground">{item.nomorSurat}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-foreground">{item.jenis === 'masuk' ? item.asal : item.ditujukanKe}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell max-w-[250px] truncate">
                          {item.jenis === 'masuk' ? `Surat dari ${item.asal}` : item.perihal ? `${item.jenisSurat ? item.jenisSurat + ' - ' : ''}${item.perihal}` : item.jenisSurat || '-'}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{formatDate(item.tanggal)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {filteredData.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Menampilkan <span className="font-medium text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-medium text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}</span> dari <span className="font-medium text-foreground">{filteredData.length}</span> surat
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-1" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Sebelumnya
                </Button>
                <span className="text-sm text-muted-foreground">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="sm" className="h-8 gap-1" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                  Selanjutnya <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}