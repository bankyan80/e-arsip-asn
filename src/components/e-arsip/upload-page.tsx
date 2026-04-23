'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
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
  AlertTriangle,
  RotateCcw,
  Loader2,
  FileCheck,
  ShieldCheck,
  ShieldAlert,
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
import { getASNType, getDokumenOptions, MAX_FILE_SIZE, ALLOWED_MIME_TYPES, DOKUMEN_UMUM } from '@/lib/constants';
import { formatDate, formatFileSize, todayISO } from '@/lib/utils-arsip';
import { analyzePDFQuality, getQualityLabel } from '@/lib/pdf-quality';
import type { Pegawai, Dokumen } from '@/lib/types';
import type { PDFQualityResult } from '@/lib/pdf-quality';

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

// ===== Upload Page Component =====

export default function UploadPage() {
  const { currentUser, pegawaiList, dokumenList, addDokumenWithFile } = useArsipStore();

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

  // ===== PDF Quality state =====
  const [qualityResult, setQualityResult] = useState<PDFQualityResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef<number>(0);

  // ===== Derived: Current pegawai (for pegawai role or admin selection) =====

  const activePegawai = useMemo<Pegawai | undefined>(() => {
    if (!selectedPegawaiId) return undefined;
    return pegawaiList.find((p) => p.id === Number(selectedPegawaiId));
  }, [selectedPegawaiId, pegawaiList]);

  // ===== Derived: ASN type & dokumen options =====

  const asnType = useMemo(() => {
    if (!activePegawai) return null;
    return getASNType(activePegawai.jenisASN);
  }, [activePegawai]);

  const dokumenConfig = useMemo(() => {
    if (!asnType) return null;
    return getDokumenOptions(asnType);
  }, [asnType]);

  const showPPPKPeriod = useMemo(() => {
    return !!dokumenConfig?.showPPPKPeriod && selectedJenisDokumen === 'SK PPPK';
  }, [dokumenConfig, selectedJenisDokumen]);

  // ===== Derived: Next PPPK period number =====

  const nextPPPKPeriode = useMemo(() => {
    if (!activePegawai) return '1';
    const existingSKs = dokumenList.filter(
      (d) => d.pegawaiId === activePegawai.id && d.jenisDokumen === 'SK PPPK'
    );
    if (existingSKs.length === 0) return '1';
    const maxPeriode = Math.max(
      ...existingSKs.map((d) => parseInt(d.periode || '0', 10))
    );
    return String(maxPeriode + 1);
  }, [activePegawai, dokumenList]);

  // ===== Filtered pegawai for admin dropdown (active only) =====

  const activePegawaiList = useMemo(
    () => pegawaiList.filter((p) => p.status === 'Aktif'),
    [pegawaiList]
  );

  // ===== Derived: Quality label =====

  const qualityLabel = useMemo(() => {
    if (!qualityResult || qualityResult.error) return null;
    return getQualityLabel(qualityResult.score);
  }, [qualityResult]);

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

  // ===== PDF Quality Analysis =====

  const runQualityAnalysis = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    setAnalysisProgress('Menganalisis kualitas PDF...');
    setQualityResult(null);

    const result = await analyzePDFQuality(file, (msg) => {
      setAnalysisProgress(msg);
    });

    setQualityResult(result);
    setIsAnalyzing(false);
    setAnalysisProgress('');

    if (result.isBlurry) {
      toast.warning(
        'Dokumen PDF terdeteksi kurang jelas/buram. Disarankan untuk upload ulang dengan kualitas yang lebih baik.',
        { duration: 6000 }
      );
    } else if (!result.error) {
      toast.success('Kualitas PDF baik — dokumen terdeteksi jelas.');
    }
  }, []);

  // ===== File handling =====

  const validateAndSetFile = useCallback((file: File) => {
    // Validate type — PDF only
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setFileError('Format file tidak didukung. Hanya file PDF yang diperbolehkan.');
      setSelectedFile(null);
      setPreviewUrl('');
      setQualityResult(null);
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`Ukuran file melebihi batas ${formatFileSize(MAX_FILE_SIZE)} (${formatFileSize(file.size)}).`);
      setSelectedFile(null);
      setPreviewUrl('');
      setQualityResult(null);
      return;
    }

    setFileError('');
    setSelectedFile(file);
    setQualityResult(null);

    // Generate preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Run quality analysis
    runQualityAnalysis(file);
  }, [runQualityAnalysis]);

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
    setQualityResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ===== Submit handler =====

  const pegawaiRole = currentUser?.role;

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

    const pg = activePegawai;
    if (!pg) return;

    try {
      const dokumen: Dokumen = {
        id: Date.now(),
        pegawaiId: pegawai.id,
        pegawaiNama: pegawai.nama,
        nip: pegawai.nip,
        jenisASN: pegawai.jenisASN,
        jenisDokumen: selectedJenisDokumen,
        tanggal: todayISO(),
        status: 'Pending',
        url: '',
        expiry: masaBerlaku || '',
        fileName: selectedFile.name,
        keterangan: keterangan.trim(),
      };

      if (selectedJenisDokumen === 'SK PPPK' && showPPPKPeriod) {
        dokumen.periode = periode || nextPPPKPeriode;
        dokumen.tmtAwal = tmtAwal || '';
        dokumen.tmtAkhir = tmtAkhir || '';
      }

      await addDokumenWithFile(selectedFile, dokumen);

      toast.success('Dokumen berhasil diunggah!');

      // Reset form
      if (pegawaiRole === 'pegawai') {
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
    selectedPegawaiId,
    selectedJenisDokumen,
    selectedFile,
    fileError,
    activePegawai,
    showPPPKPeriod,
    periode,
    tmtAwal,
    tmtAkhir,
    masaBerlaku,
    keterangan,
    nextPPPKPeriode,
    pegawaiRole,
    addDokumenWithFile,
    removeFile,
  ]);

  // ===== Lock pegawai for pegawai role =====

  const isPegawaiRole = currentUser?.role === 'pegawai';
  const pegawaiNIP = currentUser?.nip || '';

  const pegawaiPegawai = useMemo(() => {
    if (!isPegawaiRole || !pegawaiNIP) return undefined;
    return pegawaiList.find((p) => p.nip === pegawaiNIP);
  }, [isPegawaiRole, pegawaiNIP, pegawaiList]);

  // ===== Render =====

  return (
    <div className="space-y-6">
      {/* ===== Pegawai Info Card (pegawai role only) ===== */}
      {isPegawaiRole && pegawaiPegawai && (
        <Card className="border-l-4 border-l-blue-500 bg-white dark:bg-zinc-950 shadow-sm">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <UserCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">
                  Data Pegawai
                </h3>
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

      {/* ===== Two-column Layout ===== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ===== Left Column - Upload Form (3 cols) ===== */}
        <div className="lg:col-span-3 space-y-5">
          <Card className="bg-white dark:bg-zinc-950 shadow-sm">
            <CardHeader className="pb-4 px-5 pt-5">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Upload className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                Upload Dokumen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 px-5 pb-5">
              {/* ===== Pegawai Select (admin only) ===== */}
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
                        <SelectItem value="__none" disabled>
                          Tidak ada pegawai aktif
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {/* ===== Jenis Dokumen Select ===== */}
              <div className="space-y-2">
                <Label htmlFor="jenis-dokumen-select" className="text-sm font-medium">
                  Jenis Dokumen <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedJenisDokumen}
                  onValueChange={(v) => {
                    setSelectedJenisDokumen(v);
                    if (v === 'SK PPPK' && showPPPKPeriod) {
                      setPeriode(nextPPPKPeriode);
                    }
                  }}
                  disabled={!activePegawai}
                >
                  <SelectTrigger id="jenis-dokumen-select" className="w-full">
                    <SelectValue
                      placeholder={
                        activePegawai
                          ? 'Pilih jenis dokumen...'
                          : 'Pilih pegawai terlebih dahulu'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {dokumenConfig
                      ? dokumenConfig.options.map((opt, idx) => {
                          if (opt === '---') {
                            return <SelectSeparator key={`sep-${idx}`} />;
                          }
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
                                      <span className="ml-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                        (Wajib)
                                      </span>
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
                                <span className="ml-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                  (Wajib)
                                </span>
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

              {/* ===== PPPK Period Fields ===== */}
              {showPPPKPeriod && (
                <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <h4 className="text-sm font-semibold text-foreground">
                        Periode Kontrak PPPK
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          No Periode
                        </Label>
                        <Select value={periode} onValueChange={setPeriode}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih periode" />
                          </SelectTrigger>
                          <SelectContent>
                            {['1', '2', '3', '4', '5'].map((num) => (
                              <SelectItem key={num} value={num}>
                                Periode {num}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          TMT Awal
                        </Label>
                        <Input
                          type="date"
                          value={tmtAwal}
                          onChange={(e) => setTmtAwal(e.target.value)}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          TMT Akhir
                        </Label>
                        <Input
                          type="date"
                          value={tmtAkhir}
                          onChange={(e) => setTmtAkhir(e.target.value)}
                          className="w-full"
                        />
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

              {/* ===== Masa Berlaku ===== */}
              <div className="space-y-2">
                <Label htmlFor="masa-berlaku" className="text-sm font-medium">
                  Masa Berlaku{' '}
                  <span className="text-xs font-normal text-muted-foreground">(opsional)</span>
                </Label>
                <Input
                  id="masa-berlaku"
                  type="date"
                  value={masaBerlaku}
                  onChange={(e) => setMasaBerlaku(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* ===== Keterangan ===== */}
              <div className="space-y-2">
                <Label htmlFor="keterangan" className="text-sm font-medium">
                  Keterangan{' '}
                  <span className="text-xs font-normal text-muted-foreground">(opsional)</span>
                </Label>
                <Textarea
                  id="keterangan"
                  placeholder="Catatan tambahan tentang dokumen ini..."
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  rows={3}
                  className="w-full resize-none"
                />
              </div>

              {/* ===== File Upload Area ===== */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  File Dokumen <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    Wajib format PDF — Maks. {formatFileSize(MAX_FILE_SIZE)}
                  </span>
                </Label>
                <div
                  className={`relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors cursor-pointer ${
                    qualityResult?.isBlurry
                      ? 'border-amber-400/60 bg-amber-50/30 dark:border-amber-600/60 dark:bg-amber-950/10'
                      : 'border-muted-foreground/25 bg-muted/30 hover:border-blue-400/60 hover:bg-blue-50/30 dark:hover:border-blue-600/60 dark:hover:bg-blue-950/20'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  aria-label="Klik atau seret file PDF ke sini untuk mengunggah"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    aria-hidden="true"
                  />

                  {selectedFile ? (
                    <>
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        qualityResult?.isBlurry
                          ? 'bg-amber-100 dark:bg-amber-900/30'
                          : 'bg-blue-100 dark:bg-blue-900/30'
                      }`}>
                        <File className={`h-6 w-6 ${
                          qualityResult?.isBlurry
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`} />
                      </div>
                      <div className="min-w-0 max-w-full">
                        <p className="truncate text-sm font-medium text-foreground">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-7 w-7 rounded-full p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile();
                        }}
                        aria-label="Hapus file"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                        <CloudUpload className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Klik atau seret file PDF ke sini
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Hanya file PDF yang diperbolehkan — Maks. {formatFileSize(MAX_FILE_SIZE)}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* File error */}
                {fileError && (
                  <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {fileError}
                  </p>
                )}

                {/* ===== PDF Quality Analysis Result ===== */}
                {isAnalyzing && (
                  <div className="flex items-center gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-3.5">
                    <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Menganalisis kualitas PDF...
                      </p>
                      <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">
                        {analysisProgress || 'Memproses halaman...'}
                      </p>
                    </div>
                  </div>
                )}

                {qualityResult && !isAnalyzing && !qualityResult.error && (
                  <div className={`rounded-lg border p-3.5 ${
                    qualityResult.isBlurry
                      ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
                      : qualityLabel?.bgColor || 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20'
                  }`}>
                    <div className="flex items-start gap-3">
                      {qualityResult.isBlurry ? (
                        <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${qualityLabel?.color || ''}`}>
                            {qualityLabel?.label || 'OK'}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-mono px-1.5 py-0 ${qualityLabel?.bgColor || ''}`}
                          >
                            Skor: {qualityResult.score}
                          </Badge>
                        </div>
                        <p className={`text-xs mt-1 ${qualityResult.isBlurry ? 'text-amber-600/80 dark:text-amber-400/80' : 'text-muted-foreground'}`}>
                          {qualityLabel?.description}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Halaman dianalisis: {qualityResult.pageAnalyzed} dari {qualityResult.totalPages}
                        </p>
                        {qualityResult.isBlurry && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2.5 h-8 gap-1.5 text-xs font-semibold border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                            onClick={() => {
                              removeFile();
                              toast.info('Silakan pilih file PDF yang lebih jelas untuk diunggah.');
                            }}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Upload Ulang
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {qualityResult?.error && !isAnalyzing && (
                  <div className="flex items-start gap-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 p-3.5">
                    <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                        Analisis Gagal
                      </p>
                      <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-1">
                        {qualityResult.error}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ===== Upload Button ===== */}
              <Button
                onClick={handleSubmit}
                disabled={
                  !selectedPegawaiId ||
                  !selectedJenisDokumen ||
                  selectedJenisDokumen === '---' ||
                  !selectedFile ||
                  isAnalyzing
                }
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isAnalyzing ? 'Menganalisis PDF...' : 'Unggah Dokumen'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ===== Right Column - Preview (2 cols) ===== */}
        <div className="lg:col-span-2 space-y-5">
          {/* ===== Preview Card ===== */}
          <Card className="bg-white dark:bg-zinc-950 shadow-sm">
            <CardHeader className="pb-3 px-5 pt-5">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Eye className="h-4.5 w-4.5 text-muted-foreground" />
                Preview Dokumen
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className={`flex items-center justify-center rounded-lg border overflow-hidden ${
                qualityResult?.isBlurry
                  ? 'border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/10'
                  : 'bg-muted/30'
              }`} style={{ minHeight: '320px' }}>
                {previewUrl && selectedFile ? (
                  <iframe
                    src={previewUrl}
                    title="Preview PDF"
                    className="h-80 w-full border-0"
                  />
                ) : (
                  <PreviewPlaceholder />
                )}
              </div>
            </CardContent>
          </Card>

          {/* ===== File Info Card ===== */}
          <Card className="bg-white dark:bg-zinc-950 shadow-sm">
            <CardHeader className="pb-3 px-5 pt-5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <FileCheck className="h-4 w-4" />
                Informasi File
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {selectedFile ? (
                <div className="space-y-2.5">
                  <FileInfoRow label="Nama File" value={selectedFile.name} />
                  <FileInfoRow label="Ukuran" value={formatFileSize(selectedFile.size)} />
                  <FileInfoRow label="Tipe" value="PDF Document" />
                  <FileInfoRow
                    label="Waktu Upload"
                    value={new Date().toLocaleString('id-ID')}
                  />
                  {qualityResult && !isAnalyzing && !qualityResult.error && (
                    <>
                      <FileInfoRow
                        label="Kualitas"
                        value={qualityLabel?.label || 'N/A'}
                        badge
                        badgeClass={`text-[11px] font-semibold px-2 py-0.5 border ${qualityLabel?.bgColor || ''} ${qualityLabel?.color || ''}`}
                      />
                      <FileInfoRow
                        label="Skor Ketajaman"
                        value={`${qualityResult.score} / ${qualityResult.threshold}`}
                      />
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <File className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Pilih file untuk melihat informasi
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ===== Sub-components =====

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm text-foreground truncate">{value || '-'}</span>
    </div>
  );
}

function FileInfoRow({
  label,
  value,
  badge,
  badgeClass,
}: {
  label: string;
  value: string;
  badge?: boolean;
  badgeClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      {badge ? (
        <Badge
          variant="secondary"
          className={`text-[11px] font-semibold px-2 py-0.5 ${badgeClass ?? ''}`}
        >
          {value}
        </Badge>
      ) : (
        <span className="text-xs font-medium text-foreground text-right truncate">
          {value}
        </span>
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
      <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">
        Unggah dokumen PDF untuk melihat preview di sini
      </p>
    </div>
  );
}