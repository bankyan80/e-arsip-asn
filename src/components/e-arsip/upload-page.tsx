'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Upload,
  File,
  CloudUpload,
  Eye,
  Info,
  AlertCircle,
  UserCircle,
  X,
  CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

import { useArsipStore } from '@/lib/store';
import { getASNType, getDokumenOptions, MAX_FILE_SIZE, DOKUMEN_UMUM } from '@/lib/constants';
import { formatDate, formatFileSize, todayISO } from '@/lib/utils-arsip';
import type { Pegawai, Dokumen } from '@/lib/types';

// ===== Helper: Check if pegawai profile is complete =====

function isPegawaiComplete(pg: Pegawai): boolean {
  return !!(
    pg.nip &&
    pg.nama &&
    pg.jenisASN &&
    pg.jabatan &&
    pg.golongan &&
    pg.unitKerja
  );
}

// ===== Helper: File reader as data URL =====

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

// ===== Helper: Detect file type category =====

function getFileTypeCategory(file: File): 'pdf' | 'image' | 'unknown' {
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.startsWith('image/')) return 'image';
  return 'unknown';
}

// ===== Upload Page Component =====

export default function UploadPage() {
  const { currentUser, pegawaiList, dokumenList, addDokumen, addNotifikasi } = useArsipStore();

  // ===== Role detection (MUST be before pegawaiPegawai & effectivePegawai) =====
  const isPegawaiRole = currentUser?.role === 'pegawai';
  const pegawaiNIP = currentUser?.nip || '';

  // ===== Form state =====
  const [selectedPegawaiId, setSelectedPegawaiId] = useState<string>('');
  const [selectedJenisDokumen, setSelectedJenisDokumen] = useState<string>('');
  const [periode, setPeriode] = useState<string>('');
  const [tmtAwal, setTmtAwal] = useState<string>('');
  const [tmtAkhir, setTmtAkhir] = useState<string>('');
  const [masaBerlaku, setMasaBerlaku] = useState<string>('');
  const [keterangan, setKeterangan] = useState<string>('');

  // ===== File state =====
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [fileError, setFileError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef<number>(0);

  // ===== Pegawai for pegawai role (auto-detect from currentUser NIP) =====
  const pegawaiPegawai = useMemo(() => {
    if (!isPegawaiRole || !pegawaiNIP) return undefined;
    return pegawaiList.find((p) => p.nip === pegawaiNIP);
  }, [isPegawaiRole, pegawaiNIP, pegawaiList]);

  // ===== Derived: Current pegawai (for pegawai role or admin selection) =====
  const activePegawai = useMemo<Pegawai | undefined>(() => {
    if (!selectedPegawaiId) return undefined;
    return pegawaiList.find((p) => p.id === Number(selectedPegawaiId));
  }, [selectedPegawaiId, pegawaiList]);

  // For pegawai role, use pegawaiPegawai as fallback for activePegawai
  const effectivePegawai = useMemo<Pegawai | undefined>(() => {
    if (activePegawai) return activePegawai;
    if (isPegawaiRole && pegawaiPegawai) return pegawaiPegawai;
    return undefined;
  }, [activePegawai, isPegawaiRole, pegawaiPegawai]);

  // ===== Auto-set selectedPegawaiId untuk pegawai role =====
  useEffect(() => {
    if (isPegawaiRole && pegawaiPegawai && !selectedPegawaiId) {
      setSelectedPegawaiId(String(pegawaiPegawai.id));
    }
  }, [isPegawaiRole, pegawaiPegawai, selectedPegawaiId]);

  // ===== Derived: ASN type & dokumen options =====
  const asnType = useMemo(() => {
    if (!effectivePegawai) return null;
    return getASNType(effectivePegawai.jenisASN);
  }, [effectivePegawai]);

  const dokumenConfig = useMemo(() => {
    if (!asnType) return null;
    return getDokumenOptions(asnType);
  }, [asnType]);

  const showPPPKPeriod = useMemo(() => {
    return !!dokumenConfig?.showPPPKPeriod && selectedJenisDokumen === 'SK PPPK';
  }, [dokumenConfig, selectedJenisDokumen]);

  // ===== Derived: Next PPPK period number =====
  const nextPPPKPeriode = useMemo(() => {
    if (!effectivePegawai) return '1';
    const existingSKs = dokumenList.filter(
      (d) => d.pegawaiId === effectivePegawai.id && d.jenisDokumen === 'SK PPPK'
    );
    if (existingSKs.length === 0) return '1';
    const maxPeriode = Math.max(
      ...existingSKs.map((d) => parseInt(d.periode || '0', 10))
    );
    return String(maxPeriode + 1);
  }, [effectivePegawai, dokumenList]);

  // ===== Filtered pegawai for admin dropdown (active only) =====
  const activePegawaiList = useMemo(
    () => pegawaiList.filter((p) => p.status === 'Aktif'),
    [pegawaiList]
  );

  // ===== Handle pegawai selection change =====
  const handlePegawaiChange = useCallback(
    (value: string) => {
      setSelectedPegawaiId(value);
      setSelectedJenisDokumen('');
      setPeriode('');
      setTmtAwal('');
      setTmtAkhir('');
    },
    []
  );

  // ===== File handling =====
  const validateAndSetFile = useCallback((file: File) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setFileError('Format file tidak didukung. Gunakan PDF, JPG, atau PNG.');
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`Ukuran file melebihi batas 2MB (${formatFileSize(file.size)}).`);
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }
    setFileError('');
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSetFile(file);
    },
    [validateAndSetFile]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      const file = e.dataTransfer.files?.[0];
      if (file) validateAndSetFile(file);
    },
    [validateAndSetFile]
  );

  const removeFile = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl('');
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ===== Submit handler =====
  const handleSubmit = useCallback(async () => {
    if (!selectedPegawaiId) {
      toast.error('Pilih pegawai terlebih dahulu.');
      return;
    }
    if (!selectedJenisDokumen || selectedJenisDokumen === '---') {
      toast.error('Pilih jenis dokumen terlebih dahulu.');
      return;
    }
    if (!selectedFile) {
      toast.error('Pilih file untuk diunggah.');
      return;
    }
    if (fileError) {
      toast.error('Perbaiki error file sebelum mengunggah.');
      return;
    }
    const pg = effectivePegawai;
    if (!pg) return;

    try {
      const base64Url = await readFileAsDataURL(selectedFile);
      const dokumen: Dokumen = {
        id: Date.now(),
        pegawaiId: pg.id,
        pegawaiNama: pg.nama,
        nip: pg.nip,
        jenisASN: pg.jenisASN,
        jenisDokumen: selectedJenisDokumen,
        tanggal: todayISO(),
        status: 'Pending',
        url: base64Url,
        expiry: masaBerlaku || '',
        fileName: selectedFile.name,
        keterangan: keterangan.trim(),
      };
      if (selectedJenisDokumen === 'SK PPPK' && showPPPKPeriod) {
        dokumen.periode = periode || nextPPPKPeriode;
        dokumen.tmtAwal = tmtAwal || '';
        dokumen.tmtAkhir = tmtAkhir || '';
      }
      addDokumen(dokumen);
      addNotifikasi(
        `Dokumen "${selectedJenisDokumen}" untuk ${pg.nama} berhasil diunggah.`,
        'success'
      );
      toast.success('Dokumen berhasil diunggah!');
      if (isPegawaiRole) {
        setSelectedJenisDokumen('');
        setPeriode('');
        setTmtAwal('');
        setTmtAkhir('');
        setMasaBerlaku('');
        setKeterangan('');
        removeFile();
      } else {
        setSelectedPegawaiId('');
        setSelectedJenisDokumen('');
        setPeriode('');
        setTmtAwal('');
        setTmtAkhir('');
        setMasaBerlaku('');
        setKeterangan('');
        removeFile();
      }
    } catch {
      toast.error('Gagal mengunggah dokumen. Silakan coba lagi.');
    }
  }, [
    selectedPegawaiId, selectedJenisDokumen, selectedFile, fileError,
    effectivePegawai, showPPPKPeriod, periode, tmtAwal, tmtAkhir,
    masaBerlaku, keterangan, nextPPPKPeriode, isPegawaiRole,
    addDokumen, addNotifikasi, removeFile,
  ]);

  // ===== Render =====
  return (
    <div className="space-y-6">
      {/* Pegawai Info Card (pegawai role only) */}
      {isPegawaiRole && pegawaiPegawai && (
        <Card className="border-l-4 border-l-blue-500 bg-white dark:bg-zinc-950 shadow-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <UserCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">Data Pegawai</h3>
                {!isPegawaiComplete(pegawaiPegawai) && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[11px] font-semibold px-2 py-0.5 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Profil belum lengkap
                  </Badge>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
                <InfoRow label="NIP" value={pegawaiPegawai.nip} />
                <InfoRow label="Nama" value={pegawaiPegawai.nama} />
                <InfoRow label="Jenis ASN" value={pegawaiPegawai.jenisASN} />
                <InfoRow label="Jabatan" value={pegawaiPegawai.jabatan} />
                <InfoRow label="Golongan" value={pegawaiPegawai.golongan} />
                <InfoRow label="Unit Kerja" value={pegawaiPegawai.unitKerja} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left Column - Upload Form */}
        <div className="lg:col-span-3 space-y-5">
          <Card className="bg-white dark:bg-zinc-950 shadow-sm">
            <CardHeader className="pb-4 px-5 pt-5">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Upload className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                Upload Dokumen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 px-5 pb-5">
              {/* Pegawai Select (admin only) */}
              {!isPegawaiRole ? (
                <div className="space-y-2">
                  <Label htmlFor="pegawai-select" className="text-sm font-medium">
                    Pegawai <span className="text-red-500">*</span>
                  </Label>
                  <Select value={selectedPegawaiId} onValueChange={handlePegawaiChange}>
                    <SelectTrigger id="pegawai-select" className="w-full">
                      <SelectValue placeholder="Pilih pegawai..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activePegawaiList.map((pg) => (
                        <SelectItem key={pg.id} value={String(pg.id)}>
                          {pg.nama} — {pg.nip}
                        </SelectItem>
                      ))}
                      {activePegawaiList.length === 0 && (
                        <SelectItem value="__none" disabled>Tidak ada pegawai aktif</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {/* Jenis Dokumen Select */}
              <div className="space-y-2">
                <Label htmlFor="jenis-dokumen-select" className="text-sm font-medium">
                  Jenis Dokumen <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedJenisDokumen}
                  onValueChange={(v) => {
                    setSelectedJenisDokumen(v);
                    if (v === 'SK PPPK' && showPPPKPeriod) setPeriode(nextPPPKPeriode);
                  }}
                  disabled={!effectivePegawai}
                >
                  <SelectTrigger id="jenis-dokumen-select" className="w-full">
                    <SelectValue
                      placeholder={
                        effectivePegawai
                          ? 'Pilih jenis dokumen...'
                          : isPegawaiRole
                            ? 'Memuat data pegawai...'
                            : 'Pilih pegawai terlebih dahulu'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {dokumenConfig
                      ? dokumenConfig.options.map((opt, idx) => {
                          if (opt === '---') return <SelectSeparator key={`sep-${idx}`} />;
                          if (opt === 'Dokumen Umum') {
                            return (
                              <SelectGroup key="umum-group">
                                <SelectLabel className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                                  Dokumen Umum
                                </SelectLabel>
                                {DOKUMEN_UMUM.map((u) => (
                                  <SelectItem key={u} value={u}>
                                    {u}
                                    {dokumenConfig.required === u ? (
                                      <span className="ml-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">(Wajib)</span>
                                    ) : null}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            );
                          }
                          return (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                              {dokumenConfig.required === opt ? (
                                <span className="ml-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">(Wajib)</span>
                              ) : null}
                            </SelectItem>
                          );
                        })
                      : null}
                  </SelectContent>
                </Select>
                {dokumenConfig?.hint && (
                  <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/70" />
                    {dokumenConfig.hint}
                  </p>
                )}
              </div>

              {/* PPPK Period Fields */}
              {showPPPKPeriod && (
                <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <h4 className="text-sm font-semibold text-foreground">Periode Kontrak PPPK</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">No Periode</Label>
                        <Select value={periode} onValueChange={setPeriode}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Pilih periode" /></SelectTrigger>
                          <SelectContent>
                            {['1', '2', '3', '4', '5'].map((num) => (
                              <SelectItem key={num} value={num}>Periode {num}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">TMT Awal</Label>
                        <Input type="date" value={tmtAwal} onChange={(e) => setTmtAwal(e.target.value)} className="w-full" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">TMT Akhir</Label>
                        <Input type="date" value={tmtAkhir} onChange={(e) => setTmtAkhir(e.target.value)} className="w-full" />
                      </div>
                    </div>
                    {dokumenConfig?.periodNote && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        {dokumenConfig.periodNote}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Masa Berlaku */}
              <div className="space-y-2">
                <Label htmlFor="masa-berlaku" className="text-sm font-medium">
                  Masa Berlaku <span className="text-xs font-normal text-muted-foreground">(opsional)</span>
                </Label>
                <Input id="masa-berlaku" type="date" value={masaBerlaku} onChange={(e) => setMasaBerlaku(e.target.value)} className="w-full" />
              </div>

              {/* Keterangan */}
              <div className="space-y-2">
                <Label htmlFor="keterangan" className="text-sm font-medium">
                  Keterangan <span className="text-xs font-normal text-muted-foreground">(opsional)</span>
                </Label>
                <Textarea id="keterangan" placeholder="Catatan tambahan tentang dokumen ini..." value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={3} className="w-full resize-none" />
              </div>

              {/* File Upload Area */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">File Dokumen <span className="text-red-500">*</span></Label>
                <div
                  className="relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 px-6 py-8 text-center transition-colors hover:border-blue-400/60 hover:bg-blue-50/30 dark:hover:border-blue-600/60 dark:hover:bg-blue-950/20 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
                  aria-label="Klik atau seret file ke sini untuk mengunggah"
                >
                  <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" aria-hidden="true" />
                  {selectedFile ? (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                        <File className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0 max-w-full">
                        <p className="truncate text-sm font-medium text-foreground">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatFileSize(selectedFile.size)}</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" className="absolute top-2 right-2 h-7 w-7 rounded-full p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={(e) => { e.stopPropagation(); removeFile(); }} aria-label="Hapus file">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                        <CloudUpload className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Klik atau seret file ke sini</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, JPG, atau PNG — Maks. 2MB</p>
                      </div>
                    </>
                  )}
                </div>
                {fileError && (
                  <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {fileError}
                  </p>
                )}
              </div>

              {/* Upload Button */}
              <Button onClick={handleSubmit} disabled={!selectedPegawaiId || !selectedJenisDokumen || selectedJenisDokumen === '---' || !selectedFile} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                <Upload className="h-4 w-4 mr-2" />
                Unggah Dokumen
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="bg-white dark:bg-zinc-950 shadow-sm">
            <CardHeader className="pb-3 px-5 pt-5">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Eye className="h-4.5 w-4.5 text-muted-foreground" />
                Preview Dokumen
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex items-center justify-center rounded-lg border bg-muted/30 overflow-hidden" style={{ minHeight: '320px' }}>
                {previewUrl && selectedFile ? (
                  getFileTypeCategory(selectedFile) === 'pdf' ? (
                    <iframe src={previewUrl} title="Preview PDF" className="h-80 w-full border-0" />
                  ) : getFileTypeCategory(selectedFile) === 'image' ? (
                    <img src={previewUrl} alt="Preview dokumen" className="max-h-80 w-full object-contain" />
                  ) : (
                    <PreviewPlaceholder />
                  )
                ) : (
                  <PreviewPlaceholder />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-zinc-950 shadow-sm">
            <CardHeader className="pb-3 px-5 pt-5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <File className="h-4 w-4" />
                Informasi File
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {selectedFile ? (
                <div className="space-y-2.5">
                  <FileInfoRow label="Nama File" value={selectedFile.name} />
                  <FileInfoRow label="Ukuran" value={formatFileSize(selectedFile.size)} />
                  <FileInfoRow label="Tipe" value={selectedFile.type || 'Unknown'} />
                  <FileInfoRow label="Waktu Upload" value={new Date().toLocaleString('id-ID')} />
                  <FileInfoRow label="Status OCR" value="Scan selesai" badge badgeClass="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <File className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Pilih file untuk melihat informasi</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm text-foreground truncate">{value || '-'}</span>
    </div>
  );
}

function FileInfoRow({ label, value, badge, badgeClass }: { label: string; value: string; badge?: boolean; badgeClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      {badge ? (
        <Badge variant="secondary" className={`text-[11px] font-semibold px-2 py-0.5 ${badgeClass ?? ''}`}>{value}</Badge>
      ) : (
        <span className="text-xs font-medium text-foreground text-right truncate">{value}</span>
      )}
    </div>
  );
}

function PreviewPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-3">
        <Eye className="h-7 w-7 text-muted-foreground/40" />
      </div>
      <p className="text-sm text-muted-foreground font-medium">Belum ada preview</p>
      <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">Unggah dokumen untuk melihat preview di sini</p>
    </div>
  );
}