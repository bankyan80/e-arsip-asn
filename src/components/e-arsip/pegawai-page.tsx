'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Plus, Download, Upload, Eye, Pencil, Trash2, Search, Users,
  X, FileSpreadsheet, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { useArsipStore } from '@/lib/store';
import { JENIS_ASN_OPTIONS, JABATAN_OPTIONS, GOLONGAN_OPTIONS, UNIT_KERJA_OPTIONS, ALL_JENIS_ASN, JENIS_ASN_BADGE } from '@/lib/constants';
import { formatDate, getStatusBadgeClass, groupDocsByType, downloadTemplateXLS, parseXLSXTemplate } from '@/lib/utils-arsip';
import type { Pegawai } from '@/lib/types';

import PegawaiModal from './pegawai-modal';

const ITEMS_PER_PAGE = 10;

interface ImportResult {
  success: number;
  errors: number;
  messages: string[];
}

export default function PegawaiPage() {
  const {
    pegawaiList,
    dokumenList,
    currentUser,
    addPegawai,
    addPegawaiBatch,
    deletePegawai,
  } = useArsipStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [editingPegawai, setEditingPegawai] = useState<Pegawai | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailPegawai, setDetailPegawai] = useState<Pegawai | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterJenisASN, setFilterJenisASN] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUnitKerja, setFilterUnitKerja] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const filteredData = useMemo(() => {
    let data = [...pegawaiList];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((p) => p.nama.toLowerCase().includes(q) || p.nip.toLowerCase().includes(q));
    }
    if (filterJenisASN) data = data.filter((p) => p.jenisASN === filterJenisASN);
    if (filterStatus) data = data.filter((p) => p.status === filterStatus);
    if (filterUnitKerja) data = data.filter((p) => p.unitKerja === filterUnitKerja);
    return data;
  }, [pegawaiList, search, filterJenisASN, filterStatus, filterUnitKerja]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const updateSearch = useCallback((v: string) => { setSearch(v); setCurrentPage(1); }, []);
  const updateJenisASN = useCallback((v: string) => { setFilterJenisASN(v); setCurrentPage(1); }, []);
  const updateStatus = useCallback((v: string) => { setFilterStatus(v); setCurrentPage(1); }, []);
  const updateUnitKerja = useCallback((v: string) => { setFilterUnitKerja(v); setCurrentPage(1); }, []);

  const detailDocs = useMemo(() => {
    if (!detailPegawai) return [];
    return dokumenList.filter((d) => d.pegawaiId === detailPegawai.id);
  }, [detailPegawai, dokumenList]);

  const groupedDocs = useMemo(() => groupDocsByType(detailDocs), [detailDocs]);

  const handleView = (pegawai: Pegawai) => { setDetailPegawai(pegawai); setShowDetailModal(true); };
  const handleEdit = (pegawai: Pegawai) => { setEditingPegawai(pegawai); setModalKey((k) => k + 1); setShowAddModal(true); };
  const handleDelete = (pegawai: Pegawai) => {
    if (!confirm(`Yakin ingin menghapus data pegawai "${pegawai.nama}"?`)) return;
    deletePegawai(pegawai.id);
    toast.success(`Data pegawai "${pegawai.nama}" berhasil dihapus`);
  };
  const handleOpenAdd = () => { setEditingPegawai(null); setModalKey((k) => k + 1); setShowAddModal(true); };
  const handleCloseAdd = () => { setShowAddModal(false); setEditingPegawai(null); };
  const handleDownloadTemplate = async () => { await downloadTemplateXLS(); toast.success('Template berhasil diunduh'); };
  const handleOpenUpload = () => { setImportResult(null); setShowUploadModal(true); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'];
    const validExt = file.name.toLowerCase().endsWith('.xlsx');
    if (!validTypes.includes(file.type) && !validExt) {
      toast.error('Format file tidak didukung. Gunakan file .xlsx (Microsoft Excel).');
      return;
    }

    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const data = ev.target?.result as ArrayBuffer;
      if (!data) { toast.error('Gagal membaca file Excel'); setIsImporting(false); return; }

      const rows = await parseXLSXTemplate(data);
      if (rows.length === 0) { toast.error('File Excel kosong atau format tidak valid.'); setIsImporting(false); return; }

      let successCount = 0;
      let errorCount = 0;
      const messages: string[] = [];
      const newPegawaiList: Pegawai[] = [];

      const existingNips = new Set(useArsipStore.getState().pegawaiList.map((p) => p.nip));

      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        const rowNum = idx + 2;
        const nip = (row['NIP'] || '').trim();
        const nama = (row['Nama'] || '').trim();
        const jenisASN = (row['Jenis ASN'] || '').trim();
        const jabatan = (row['Jabatan'] || '').trim();
        const golongan = (row['Golongan'] || '').trim();
        const unitKerja = (row['Unit Kerja'] || '').trim();
        const email = (row['Email'] || '').trim();
        const hp = (row['No HP'] || '').trim();
        const tanggalLahir = (row['Tanggal Lahir'] || '').trim();
        const status = (row['Status'] || 'Aktif').trim() as 'Aktif' | 'Nonaktif';

        if (!nip) { errorCount++; messages.push(`Baris ${rowNum}: NIP wajib diisi`); continue; }
        if (!nama) { errorCount++; messages.push(`Baris ${rowNum}: Nama wajib diisi`); continue; }
        if (jenisASN && !ALL_JENIS_ASN.includes(jenisASN)) { errorCount++; messages.push(`Baris ${rowNum}: Jenis ASN "${jenisASN}" tidak valid`); continue; }
        if (existingNips.has(nip)) { errorCount++; messages.push(`Baris ${rowNum}: NIP "${nip}" sudah terdaftar`); continue; }

        const pg: Pegawai = { id: Date.now() + idx, nip, nama, jenisASN: jenisASN || '', jabatan, golongan, unitKerja, email, hp, tanggalLahir, status };
        newPegawaiList.push(pg);
        existingNips.add(nip);
        successCount++;
      }

      if (newPegawaiList.length > 0) {
        const store = useArsipStore.getState();
        if (typeof store.addPegawaiBatch === 'function') {
          const batchResult = await store.addPegawaiBatch(newPegawaiList);
          if (batchResult.errors.length > 0) {
            batchResult.errors.forEach((err) => messages.push(err));
            errorCount += batchResult.errors.length;
          }
        } else {
          useArsipStore.setState((s) => ({ pegawaiList: [...s.pegawaiList, ...newPegawaiList] }));
        }
      }

      setIsImporting(false);
      setImportResult({ success: successCount, errors: errorCount, messages });
      if (errorCount === 0) { toast.success(`${successCount} pegawai berhasil diimpor`); }
      else { toast.warning(`${successCount} berhasil, ${errorCount} gagal diimpor`); }
    };

    reader.onerror = () => { toast.error('Gagal membaca file'); setIsImporting(false); };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <section aria-label="Header Data Pegawai">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Data Pegawai ASN</h2>
            <p className="mt-1 text-sm text-muted-foreground">Kelola data pegawai Aparatur Sipil Negara di lingkungan Dinas Pendidikan</p>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleOpenAdd} className="bg-[#3c6eff] hover:bg-[#3c6eff]/90 text-white gap-2"><Plus className="h-4 w-4" />Tambah Pegawai</Button>
              <Button variant="outline" onClick={handleDownloadTemplate} className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30 gap-2"><Download className="h-4 w-4" />Unduh Template</Button>
              <Button variant="outline" onClick={handleOpenUpload} className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30 gap-2"><Upload className="h-4 w-4" />Upload Template</Button>
            </div>
          )}
        </div>
      </section>

      <Card className="border-border/60 bg-white dark:bg-zinc-950">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input placeholder="Cari nama atau NIP..." value={search} onChange={(e) => updateSearch(e.target.value)} className="pl-9" />
            </div>
            <select value={filterJenisASN} onChange={(e) => updateJenisASN(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="">Semua Jenis ASN</option>
              {JENIS_ASN_OPTIONS.map((group) => (<optgroup key={group.group} label={group.group}>{group.items.map((item) => (<option key={item} value={item}>{item}</option>))}</optgroup>))}
            </select>
            <select value={filterStatus} onChange={(e) => updateStatus(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
            <select value={filterUnitKerja} onChange={(e) => updateUnitKerja(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="">Semua Unit Kerja</option>
              {UNIT_KERJA_OPTIONS.map((unit) => (<option key={unit} value={unit}>{unit}</option>))}
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
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">NIP/NIK</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jenis ASN</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Jabatan</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Golongan</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden xl:table-cell">Unit Kerja</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  {isAdmin && (<TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Aksi</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 9 : 8} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-muted-foreground">Tidak ada data pegawai ditemukan</p>
                        <p className="text-xs text-muted-foreground/70">Coba ubah filter pencarian Anda</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((pg, idx) => {
                    const rowNum = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                    const badgeClass = JENIS_ASN_BADGE[pg.jenisASN] ?? 'bg-muted text-muted-foreground';
                    return (
                      <TableRow key={pg.id} className="border-border/40 transition-colors hover:bg-muted/40">
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground">{rowNum}</TableCell>
                        <TableCell className="px-4 py-3 text-sm font-mono text-foreground whitespace-nowrap">{pg.nip}</TableCell>
                        <TableCell className="px-4 py-3"><span className="text-sm font-medium text-foreground">{pg.nama}</span></TableCell>
                        <TableCell className="px-4 py-3"><Badge variant="secondary" className={`text-[11px] font-medium px-2 py-0.5 ${badgeClass}`}>{pg.jenisASN}</Badge></TableCell>
                        <TableCell className="px-4 py-3 text-sm text-foreground hidden lg:table-cell">{pg.jabatan || '-'}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-foreground hidden md:table-cell">{pg.golongan || '-'}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground hidden xl:table-cell">{pg.unitKerja || '-'}</TableCell>
                        <TableCell className="px-4 py-3"><Badge variant="secondary" className={`text-[11px] font-semibold px-2 py-0.5 ${pg.status === 'Aktif' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>{pg.status}</Badge></TableCell>
                        {isAdmin && (
                          <TableCell className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-[#3c6eff] hover:bg-[#3c6eff]/10" onClick={() => handleView(pg)} aria-label={`Lihat detail ${pg.nama}`}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30" onClick={() => handleEdit(pg)} aria-label={`Edit ${pg.nama}`}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => handleDelete(pg)} aria-label={`Hapus ${pg.nama}`}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {filteredData.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">Menampilkan <span className="font-medium text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-medium text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}</span> dari <span className="font-medium text-foreground">{filteredData.length}</span> pegawai</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-1" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" />Sebelumnya</Button>
                <span className="text-sm text-muted-foreground">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="sm" className="h-8 gap-1" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Selanjutnya<ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <PegawaiModal key={modalKey} open={showAddModal} onClose={handleCloseAdd} pegawai={editingPegawai} />

      <Dialog open={showDetailModal} onOpenChange={(v) => !v && setShowDetailModal(false)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-lg font-semibold"><Users className="h-5 w-5 text-[#3c6eff]" />Detail Pegawai</DialogTitle></DialogHeader>
          {detailPegawai && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailItem label="NIP/NIK" value={detailPegawai.nip} mono />
                <DetailItem label="Nama Lengkap" value={detailPegawai.nama} bold />
                <DetailItem label="Jenis ASN" value={detailPegawai.jenisASN} badge badgeClass={JENIS_ASN_BADGE[detailPegawai.jenisASN] ?? 'bg-muted text-muted-foreground'} />
                <DetailItem label="Jabatan/Pangkat" value={detailPegawai.jabatan} />
                <DetailItem label="Golongan" value={detailPegawai.golongan} />
                <DetailItem label="Unit Kerja" value={detailPegawai.unitKerja} />
                <DetailItem label="Email" value={detailPegawai.email} />
                <DetailItem label="No HP" value={detailPegawai.hp} />
                <DetailItem label="Tanggal Lahir" value={formatDate(detailPegawai.tanggalLahir)} />
                <DetailItem label="Status" value={detailPegawai.status} badge badgeClass={detailPegawai.status === 'Aktif' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Dokumen Terkait</h3>
                {groupedDocs.length === 0 || detailDocs.length === 0 ? (
                  <div className="flex flex-col items-center py-6 text-muted-foreground"><FileSpreadsheet className="h-8 w-8 text-muted-foreground/40 mb-2" /><p className="text-sm">Belum ada dokumen untuk pegawai ini</p></div>
                ) : (
                  <div className="space-y-4">{groupedDocs.map((group) => (
                    <div key={group.label}>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{group.label}</h4>
                      <div className="space-y-2">{group.items.map((doc) => (
                        <div key={doc.id} className="flex flex-col gap-1.5 rounded-lg border border-border/60 p-3 bg-muted/20">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-foreground">{doc.jenisDokumen}</span>
                            <Badge variant="secondary" className={`text-[11px] font-semibold px-2 py-0.5 shrink-0 ${getStatusBadgeClass(doc.status)}`}>{doc.status}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {doc.periode && (<span>Periode: {doc.periode}</span>)}
                            {doc.tmtAwal && (<span>TMT Awal: {formatDate(doc.tmtAwal)}</span>)}
                            {doc.tmtAkhir && (<span>TMT Akhir: {formatDate(doc.tmtAkhir)}</span>)}
                            {doc.tanggal && (<span>Tanggal: {formatDate(doc.tanggal)}</span>)}
                          </div>
                        </div>
                      ))}</div>
                    </div>
                  ))}</div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showUploadModal} onOpenChange={(v) => !v && setShowUploadModal(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-lg font-semibold"><Upload className="h-5 w-5 text-amber-600" />Upload Template Pegawai</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {!importResult ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Upload file .xlsx sesuai template yang telah diunduh. Format kolom:</p>
                  <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs font-mono text-foreground break-all">NIP, Nama, Jenis ASN, Jabatan, Golongan, Unit Kerja, Email, No HP, Tanggal Lahir, Status</p></div>
                </div>
                <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 transition-colors hover:border-muted-foreground/50">
                  {isImporting ? (
                    <><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3c6eff]" /><p className="text-sm text-muted-foreground">Sedang mengimpor data pegawai...</p><p className="text-xs text-muted-foreground/70">Mohon tunggu, jangan tutup halaman ini</p></>
                  ) : (
                    <><FileSpreadsheet className="h-10 w-10 text-muted-foreground/50" /><p className="text-sm text-muted-foreground">Klik untuk memilih file Excel</p><p className="text-xs text-muted-foreground/70">Format: .xlsx (Microsoft Excel)</p>
                    <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2"><FileSpreadsheet className="h-4 w-4" />Pilih File Excel</Button></>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-lg bg-muted/30 p-4">
                  <div className="flex flex-col items-center gap-1"><CheckCircle2 className="h-6 w-6 text-green-500" /><span className="text-lg font-bold text-green-600">{importResult.success}</span><span className="text-[11px] text-muted-foreground">Berhasil</span></div>
                  <div className="h-8 w-px bg-border" />
                  <div className="flex flex-col items-center gap-1"><AlertCircle className="h-6 w-6 text-red-500" /><span className="text-lg font-bold text-red-600">{importResult.errors}</span><span className="text-[11px] text-muted-foreground">Gagal</span></div>
                </div>
                {importResult.messages.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detail Error</p>
                    {importResult.messages.map((msg, idx) => (<div key={idx} className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/20 dark:text-red-400"><X className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{msg}</span></div>))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            {importResult && (<Button variant="outline" onClick={() => setImportResult(null)} className="gap-2"><Upload className="h-4 w-4" />Upload Lagi</Button>)}
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailItem({ label, value, mono, bold, badge, badgeClass }: { label: string; value: string; mono?: boolean; bold?: boolean; badge?: boolean; badgeClass?: string }) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {badge ? (<div><Badge variant="secondary" className={`text-[11px] font-semibold px-2 py-0.5 ${badgeClass ?? ''}`}>{value || '-'}</Badge></div>) : (
        <p className={`text-sm ${bold ? 'font-semibold' : 'font-medium'} text-foreground ${mono ? 'font-mono' : ''}`}>{value || '-'}</p>
      )}
    </div>
  );
}