'use client';

import { useState, useMemo, useCallback } from 'react';
import { Search, Eye, Trash2, FileText, Filter, X, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useArsipStore } from '@/lib/store';
import { JENIS_ASN_OPTIONS, JENIS_ASN_BADGE, DOKUMEN_UMUM, getASNType } from '@/lib/constants';
import { formatDate, getStatusBadgeClass } from '@/lib/utils-arsip';
import type { Dokumen } from '@/lib/types';

// ===== Constants =====

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
];

// ===== Kategori Dokumen Groups =====

const KATEGORI_GROUPS = [
  {
    label: 'Dokumen PNS',
    items: ['SK CPNS', 'SK PNS', 'SK Kenaikan Pangkat', 'SK Kenaikan Gaji Berkala', 'SK Jabatan'],
  },
  {
    label: 'Dokumen PPPK',
    items: ['SK PPPK', 'SK Kenaikan Gaji Berkala', 'SK Jabatan'],
  },
  {
    label: 'Dokumen Umum',
    items: DOKUMEN_UMUM,
  },
];

// ===== Filter state type =====

interface FilterState {
  nama: string;
  nip: string;
  jenisASN: string;
  kategori: string;
  status: string;
}

const INITIAL_FILTERS: FilterState = {
  nama: '',
  nip: '',
  jenisASN: '',
  kategori: '',
  status: '',
};

// ===== Helper: Get short ASN category =====

function getASNCategory(jenisASN: string): string {
  if (!jenisASN) return '';
  if (jenisASN.startsWith('PNS')) return 'PNS';
  if (jenisASN.includes('Penuh Waktu')) return 'PPPK Penuh Waktu';
  if (jenisASN.includes('Paruh Waktu')) return 'PPPK Paruh Waktu';
  return jenisASN;
}

// ===== Arsip Page Component =====

export default function ArsipPage() {
  const { currentUser, dokumenList, pegawaiList, deleteDokumen, addNotifikasi } = useArsipStore();

  // ===== Filter state =====
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);

  // ===== Preview state =====
  const [previewDoc, setPreviewDoc] = useState<Dokumen | null>(null);

  // ===== Delete confirmation state =====
  const [deleteTarget, setDeleteTarget] = useState<Dokumen | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  // ===== Pegawai role: dapatkan unit kerja =====
  const isPegawaiRole = currentUser?.role === 'pegawai';
  const pegawaiId = currentUser?.pegawaiId;

  // Dapatkan pegawai milik user saat ini untuk ambil unitKerja
  const myPegawai = useMemo(() => {
    if (!isPegawaiRole || !pegawaiId) return null;
    return pegawaiList.find((p) => p.id === pegawaiId) || null;
  }, [isPegawaiRole, pegawaiId, pegawaiList]);

  const myUnitKerja = myPegawai?.unitKerja || '';

  // Dapatkan semua pegawaiId di unit kerja yang sama
  const unitPegawaiIds = useMemo(() => {
    if (!isPegawaiRole || !myUnitKerja) return [];
    return pegawaiList.filter((p) => p.unitKerja === myUnitKerja).map((p) => p.id);
  }, [isPegawaiRole, myUnitKerja, pegawaiList]);

  // ===== Update a single filter =====
  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  // ===== Reset filters =====
  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setCurrentPage(1);
  }, []);

  // ===== Filtered & sorted documents =====
  const filteredDocs = useMemo(() => {
    let result = [...dokumenList];

    // Jika pegawai, filter hanya dokumen dari unit kerja yang sama
    if (isPegawaiRole && unitPegawaiIds.length > 0) {
      result = result.filter((d) => unitPegawaiIds.includes(d.pegawaiId));
    }

    // Filter by nama
    if (filters.nama.trim()) {
      const q = filters.nama.toLowerCase().trim();
      result = result.filter((d) => d.pegawaiNama.toLowerCase().includes(q));
    }

    // Filter by NIP
    if (filters.nip.trim()) {
      const q = filters.nip.trim();
      result = result.filter((d) => d.nip.includes(q));
    }

    // Filter by Jenis ASN
    if (filters.jenisASN) {
      const target = filters.jenisASN;
      result = result.filter((d) => {
        const asnType = getASNType(d.jenisASN);
        if (target === 'PNS') return asnType === 'PNS';
        if (target === 'PPPK Penuh Waktu') return asnType === 'PPPK_PENUH';
        if (target === 'PPPK Paruh Waktu') return asnType === 'PPPK_PARUH';
        return false;
      });
    }

    // Filter by Kategori Dokumen
    if (filters.kategori) {
      result = result.filter((d) => d.jenisDokumen === filters.kategori);
    }

    // Filter by Status
    if (filters.status && filters.status !== 'Semua') {
      result = result.filter((d) => d.status === filters.status);
    }

    // Sort by date descending (most recent first)
    result.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));

    return result;
  }, [dokumenList, filters]);

  // ===== Pagination =====
  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / ITEMS_PER_PAGE));
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDocs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDocs, currentPage]);

  // ===== Handle delete =====
  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;

    deleteDokumen(deleteTarget.id);
    addNotifikasi(
      `Dokumen "${deleteTarget.jenisDokumen}" milik ${deleteTarget.pegawaiNama} telah dihapus.`,
      'warning'
    );
    toast.success('Dokumen berhasil dihapus.');
    setDeleteTarget(null);
  }, [deleteTarget, deleteDokumen, addNotifikasi]);

  // ===== Check if has active filters =====
  const hasActiveFilters = useMemo(() => {
    return (
      filters.nama.trim() !== '' ||
      filters.nip.trim() !== '' ||
      filters.jenisASN !== '' ||
      filters.kategori !== '' ||
      filters.status !== ''
    );
  }, [filters]);

  // ===== Render =====

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <div>
        <h2 className="text-xl font-bold text-foreground tracking-tight">Pencarian Arsip</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isPegawaiRole && myUnitKerja
            ? `Dokumen arsip dari unit kerja: ${myUnitKerja}`
            : isPegawaiRole
              ? 'Lihat dokumen arsip milik Anda yang telah diunggah.'
              : 'Cari dan kelola dokumen arsip pegawai yang telah diunggah.'}
        </p>
      </div>

      {/* ===== Filter Bar ===== */}
      <Card className="bg-white dark:bg-zinc-950 shadow-sm">
        <CardHeader className="pb-3 px-5 pt-5">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Filter className="h-4 w-4 text-muted-foreground" />
              Filter Pencarian
            </CardTitle>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={resetFilters}
              >
                <X className="h-3 w-3 mr-1" />
                Reset Filter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {/* Search Nama (hidden for pegawai) */}
            {!isPegawaiRole && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Nama Pegawai</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari nama..."
                  value={filters.nama}
                  onChange={(e) => updateFilter('nama', e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>
            )}

            {/* Search NIP (hidden for pegawai) */}
            {!isPegawaiRole && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">NIP</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari NIP..."
                  value={filters.nip}
                  onChange={(e) => updateFilter('nip', e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>
            )}

            {/* Filter Jenis ASN (hidden for pegawai) */}
            {!isPegawaiRole && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Jenis ASN</Label>
              <Select value={filters.jenisASN} onValueChange={(v) => updateFilter('jenisASN', v)}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Semua Jenis" />
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
            )}

            {/* Filter Kategori Dokumen */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Kategori Dokumen</Label>
              <Select value={filters.kategori} onValueChange={(v) => updateFilter('kategori', v)}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Semua Kategori</SelectItem>
                  {KATEGORI_GROUPS.map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel className="font-semibold text-xs text-muted-foreground">
                        {group.label}
                      </SelectLabel>
                      {group.items.map((item) => (
                        <SelectItem key={`${group.label}-${item}`} value={item}>
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
              <Label className="text-xs font-medium text-muted-foreground">Status</Label>
              <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
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

      {/* ===== Results count ===== */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Menampilkan{' '}
          <span className="font-semibold text-foreground">{filteredDocs.length}</span>{' '}
          dokumen
          {hasActiveFilters && ' (filtered)'}
        </p>
      </div>

      {/* ===== Results Table ===== */}
      <Card className="bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-10">
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
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Jenis Dokumen
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden xl:table-cell">
                    Tanggal
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                    Status
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-3">
                          <FileSpreadsheet className="h-7 w-7 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Tidak ada dokumen ditemukan
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {hasActiveFilters
                            ? 'Coba ubah filter pencarian Anda.'
                            : 'Belum ada dokumen yang diunggah.'}
                        </p>
                        {hasActiveFilters && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-3 text-xs"
                            onClick={resetFilters}
                          >
                            Reset Filter
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDocs.map((doc, index) => {
                    const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;

                    return (
                      <TableRow
                        key={doc.id}
                        className="border-border/40 transition-colors hover:bg-muted/40"
                      >
                        {/* No */}
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                          {globalIndex}
                        </TableCell>

                        {/* Nama */}
                        <TableCell className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground leading-tight truncate max-w-[180px]">
                              {doc.pegawaiNama}
                            </span>
                            <span className="md:hidden text-[11px] text-muted-foreground truncate max-w-[180px]">
                              NIP: {doc.nip}
                            </span>
                          </div>
                        </TableCell>

                        {/* NIP (hidden on mobile) */}
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap hidden md:table-cell">
                          {doc.nip}
                        </TableCell>

                        {/* Jenis ASN (hidden on smaller screens) */}
                        <TableCell className="px-4 py-3 hidden lg:table-cell">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-medium px-1.5 py-0 ${
                              JENIS_ASN_BADGE[doc.jenisASN] ?? 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {getASNCategory(doc.jenisASN)}
                          </Badge>
                        </TableCell>

                        {/* Jenis Dokumen */}
                        <TableCell className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-foreground leading-tight">
                              {doc.jenisDokumen}
                            </span>
                            {doc.periode && doc.jenisDokumen === 'SK PPPK' && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge
                                  variant="secondary"
                                  className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-medium px-1.5 py-0"
                                >
                                  Periode {doc.periode}
                                </Badge>
                                {doc.tmtAwal && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatDate(doc.tmtAwal)} — {formatDate(doc.tmtAkhir)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Tanggal (hidden on smaller screens) */}
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap hidden xl:table-cell">
                          {formatDate(doc.tanggal)}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="px-4 py-3 text-center">
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

                        {/* Aksi */}
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              onClick={() => setPreviewDoc(doc)}
                              aria-label={`Lihat dokumen ${doc.jenisDokumen}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {/* Delete button (admin only) */}
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => setDeleteTarget(doc)}
                                aria-label={`Hapus dokumen ${doc.jenisDokumen}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* ===== Pagination ===== */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
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
        </CardContent>
      </Card>

      {/* ===== PDF/Image Preview Dialog ===== */}
      <Dialog
        open={previewDoc !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewDoc(null);
        }}
      >
        <DialogContent className="max-w-3xl sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              {previewDoc?.jenisDokumen}
            </DialogTitle>
            <DialogDescription>
              {previewDoc?.pegawaiNama} — {previewDoc?.nip}
            </DialogDescription>
          </DialogHeader>

          {previewDoc && (
            <div className="mt-2">
              <div className="flex items-center gap-2 flex-wrap mb-4">
                {previewDoc.periode && previewDoc.jenisDokumen === 'SK PPPK' && (
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[11px] font-medium"
                  >
                    Periode {previewDoc.periode}
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className={`text-[11px] font-semibold px-2 py-0.5 ${getStatusBadgeClass(previewDoc.status)}`}
                >
                  {previewDoc.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(previewDoc.tanggal)}
                </span>
              </div>

              <div className="flex items-center justify-center rounded-lg border bg-muted/30 overflow-hidden" style={{ minHeight: '400px', maxHeight: '70vh' }}>
                {previewDoc.url ? (
                  previewDoc.url.startsWith('data:application/pdf') || previewDoc.url.startsWith('http') ? (
                    <iframe
                      src={previewDoc.url}
                      title={`Preview ${previewDoc.jenisDokumen}`}
                      className="h-[65vh] w-full border-0"
                    />
                  ) : previewDoc.url.startsWith('data:image') || previewDoc.url.match(/\.(jpg|jpeg|png|webp|gif)/i) ? (
                    <img
                      src={previewDoc.url}
                      alt={`Preview ${previewDoc.jenisDokumen}`}
                      className="max-h-[65vh] w-full object-contain"
                    />
                  ) : (
                    <PreviewEmptyState />
                  )
                ) : (
                  <PreviewEmptyState />
                )}
              </div>

              {previewDoc.fileName && (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{previewDoc.fileName}</span>
                  {previewDoc.keterangan && (
                    <>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="truncate">{previewDoc.keterangan}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Delete Confirmation Dialog ===== */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Dokumen</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus dokumen{' '}
              <span className="font-semibold text-foreground">
                &ldquo;{deleteTarget?.jenisDokumen}&rdquo;
              </span>{' '}
              milik{' '}
              <span className="font-semibold text-foreground">
                {deleteTarget?.pegawaiNama}
              </span>
              ? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ===== Helpers =====

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

function PreviewEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-3">
        <FileText className="h-7 w-7 text-muted-foreground/40" />
      </div>
      <p className="text-sm text-muted-foreground font-medium">
        Preview tidak tersedia
      </p>
      <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">
        File tidak dapat ditampilkan dalam preview.
      </p>
    </div>
  );
}