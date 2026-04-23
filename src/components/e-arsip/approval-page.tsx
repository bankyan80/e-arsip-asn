'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Search,
  FileCheck,
  Clock,
} from 'lucide-react';
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
import { JENIS_ASN_OPTIONS, JENIS_ASN_BADGE, getASNType } from '@/lib/constants';
import { formatDate, getStatusBadgeClass } from '@/lib/utils-arsip';
import type { Dokumen } from '@/lib/types';

// ===== Constants =====

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
];

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-sky-500',
  'bg-cyan-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-violet-500',
];

// ===== Helper: Get short ASN category =====

function getASNCategory(jenisASN: string): string {
  if (!jenisASN) return '';
  if (jenisASN.startsWith('PNS')) return 'PNS';
  if (jenisASN.includes('Penuh Waktu')) return 'PPPK Penuh Waktu';
  if (jenisASN.includes('Paruh Waktu')) return 'PPPK Paruh Waktu';
  return jenisASN;
}

// ===== Helper: Get consistent avatar color =====

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ===== Helper: Get status border color =====

function getStatusBorderColor(status: string): string {
  switch (status) {
    case 'Approved':
      return 'border-l-green-500';
    case 'Rejected':
      return 'border-l-red-500';
    case 'Pending':
    default:
      return 'border-l-yellow-500';
  }
}

// ===== Approval Page Component =====

export default function ApprovalPage() {
  const { dokumenList, updateDokumenStatus, addNotifikasi } = useArsipStore();

  // ===== Filter state =====
  const [search, setSearch] = useState('');
  const [filterJenisASN, setFilterJenisASN] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // ===== Dialog state =====
  const [approveTarget, setApproveTarget] = useState<Dokumen | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Dokumen | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Dokumen | null>(null);

  // ===== Filtered documents =====
  const filteredDocs = useMemo(() => {
    let result = [...dokumenList];

    // Search by nama/NIP
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.pegawaiNama.toLowerCase().includes(q) ||
          d.nip.includes(q)
      );
    }

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

    // Sort: Pending first, then by date descending
    result.sort((a, b) => {
      const statusOrder = { Pending: 0, Approved: 1, Rejected: 2 };
      const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
      if (statusDiff !== 0) return statusDiff;
      return (b.tanggal || '').localeCompare(a.tanggal || '');
    });

    return result;
  }, [dokumenList, search, filterJenisASN, filterStatus]);

  // ===== Pending count =====
  const pendingCount = useMemo(
    () => dokumenList.filter((d) => d.status === 'Pending').length,
    [dokumenList]
  );

  // ===== Handlers =====
  const handleApprove = useCallback(() => {
    if (!approveTarget) return;
    updateDokumenStatus(approveTarget.id, 'Approved');
    addNotifikasi(
      `Dokumen "${approveTarget.jenisDokumen}" milik ${approveTarget.pegawaiNama} telah disetujui.`,
      'success'
    );
    toast.success('Dokumen berhasil disetujui.');
    setApproveTarget(null);
  }, [approveTarget, updateDokumenStatus, addNotifikasi]);

  const handleReject = useCallback(() => {
    if (!rejectTarget) return;
    updateDokumenStatus(rejectTarget.id, 'Rejected');
    addNotifikasi(
      `Dokumen "${rejectTarget.jenisDokumen}" milik ${rejectTarget.pegawaiNama} telah ditolak.`,
      'warning'
    );
    toast.success('Dokumen berhasil ditolak.');
    setRejectTarget(null);
  }, [rejectTarget, updateDokumenStatus, addNotifikasi]);

  const handleCancel = useCallback(() => {
    if (!cancelTarget) return;
    updateDokumenStatus(cancelTarget.id, 'Pending');
    addNotifikasi(
      `Status dokumen "${cancelTarget.jenisDokumen}" milik ${cancelTarget.pegawaiNama} telah direset ke Pending.`,
      'info'
    );
    toast.success('Status dokumen berhasil direset ke Pending.');
    setCancelTarget(null);
  }, [cancelTarget, updateDokumenStatus, addNotifikasi]);

  // ===== Render =====

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            Approval Dokumen
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola persetujuan dokumen arsip pegawai
          </p>
        </div>
        {/* Pending count badge */}
        {pendingCount > 0 && (
          <Badge
            variant="secondary"
            className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs font-semibold px-3 py-1 border border-yellow-200 dark:border-yellow-800 w-fit"
          >
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            {pendingCount} menunggu persetujuan
          </Badge>
        )}
      </div>

      {/* ===== Filter Bar ===== */}
      <Card className="bg-white dark:bg-zinc-950 shadow-sm">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Search */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Cari Nama / NIP
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau NIP..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>

            {/* Filter Jenis ASN */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Jenis ASN
              </Label>
              <Select value={filterJenisASN} onValueChange={setFilterJenisASN}>
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
              <Select value={filterStatus} onValueChange={setFilterStatus}>
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

      {/* ===== Document List (Card-based) ===== */}
      {filteredDocs.length === 0 ? (
        <Card className="bg-white dark:bg-zinc-950 shadow-sm">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              {dokumenList.length === 0 || (search || filterJenisASN || filterStatus) ? (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-3">
                    <Search className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Tidak ada dokumen ditemukan
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Coba ubah filter pencarian Anda.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/20 mb-3">
                    <CheckCircle className="h-7 w-7 text-green-500" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Tidak ada dokumen yang menunggu persetujuan
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Semua dokumen telah diproses.
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Results count */}
          <p className="text-sm text-muted-foreground">
            Menampilkan{' '}
            <span className="font-semibold text-foreground">{filteredDocs.length}</span>{' '}
            dokumen
          </p>

          {/* Document cards */}
          {filteredDocs.map((doc) => (
            <Card
              key={doc.id}
              className={`bg-white dark:bg-zinc-950 shadow-sm border-l-4 ${getStatusBorderColor(doc.status)} transition-colors hover:shadow-md`}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Left: Avatar */}
                  <div
                    className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full text-white text-sm sm:text-base font-bold ${getAvatarColor(doc.pegawaiNama)}`}
                  >
                    {doc.pegawaiNama.charAt(0).toUpperCase()}
                  </div>

                  {/* Middle: Document Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-1.5">
                      {/* Name row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
                          {doc.pegawaiNama}
                        </h3>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-medium px-1.5 py-0 shrink-0 ${
                            JENIS_ASN_BADGE[doc.jenisASN] ?? 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {getASNCategory(doc.jenisASN)}
                        </Badge>
                      </div>

                      {/* NIP */}
                      <p className="text-xs text-muted-foreground">
                        NIP: {doc.nip}
                      </p>

                      {/* Document details */}
                      <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <FileCheck className="h-3 w-3 shrink-0" />
                          {doc.jenisDokumen}
                        </span>
                        <span>{formatDate(doc.tanggal)}</span>
                        {doc.fileName && (
                          <span className="truncate max-w-[200px] hidden sm:inline">
                            {doc.fileName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status + Actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {/* Status badge */}
                    <Badge
                      variant="secondary"
                      className={`text-[11px] font-semibold px-2 py-0.5 ${getStatusBadgeClass(doc.status)}`}
                    >
                      {doc.status === 'Pending' && '⏳ '}
                      {doc.status === 'Approved' && '✅ '}
                      {doc.status === 'Rejected' && '❌ '}
                      {doc.status}
                    </Badge>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5">
                      {doc.status === 'Pending' ? (
                        <>
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white px-3"
                            onClick={() => setApproveTarget(doc)}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            <span className="hidden sm:inline">Setujui</span>
                            <span className="sm:hidden">Ya</span>
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white px-3"
                            onClick={() => setRejectTarget(doc)}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            <span className="hidden sm:inline">Tolak</span>
                            <span className="sm:hidden">Tidak</span>
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground px-3"
                          onClick={() => setCancelTarget(doc)}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          <span className="hidden sm:inline">Batalkan</span>
                          <span className="sm:hidden">Reset</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ===== Approve Confirmation Dialog ===== */}
      <AlertDialog
        open={approveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setApproveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Setujui Dokumen</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menyetujui dokumen{' '}
              <span className="font-semibold text-foreground">
                &ldquo;{approveTarget?.jenisDokumen}&rdquo;
              </span>{' '}
              milik{' '}
              <span className="font-semibold text-foreground">
                {approveTarget?.pegawaiNama}
              </span>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Setujui
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== Reject Confirmation Dialog ===== */}
      <AlertDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tolak Dokumen</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menolak dokumen{' '}
              <span className="font-semibold text-foreground">
                &ldquo;{rejectTarget?.jenisDokumen}&rdquo;
              </span>{' '}
              milik{' '}
              <span className="font-semibold text-foreground">
                {rejectTarget?.pegawaiNama}
              </span>
              ? Pegawai akan diberitahu tentang penolakan ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Tolak
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== Cancel (Reset to Pending) Confirmation Dialog ===== */}
      <AlertDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Keputusan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin membatalkan keputusan untuk dokumen{' '}
              <span className="font-semibold text-foreground">
                &ldquo;{cancelTarget?.jenisDokumen}&rdquo;
              </span>{' '}
              milik{' '}
              <span className="font-semibold text-foreground">
                {cancelTarget?.pegawaiNama}
              </span>
              ? Status akan direset menjadi{' '}
              <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                Pending
              </span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}