'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
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
  Moon,
  Sun,
  CheckCircle2,
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

import { useTheme } from '@/app/providers';
import { getASNType, getDokumenOptions, MAX_FILE_SIZE, ALLOWED_MIME_TYPES, DOKUMEN_UMUM, JENIS_ASN_BADGE } from '@/lib/constants';
import { formatDate, formatFileSize, todayISO } from '@/lib/utils-arsip';
import { analyzePDFQuality, getQualityLabel } from '@/lib/pdf-quality';
import { fetchPegawaiByNIP, fetchDokumenByPegawaiId, uploadFileAndGetUrl, addDokumenToDB, addNotifikasiToDB } from '@/lib/db';
import type { Pegawai, Dokumen } from '@/lib/types';
import type { PDFQualityResult } from '@/lib/pdf-quality';

// ===== Share Upload Page =====

export default function ShareUploadPage() {
  const params = useParams();
  const nipParam = params?.id as string;
  const { theme, toggleTheme } = useTheme();

  // ===== Data state =====
  const [pegawai, setPegawai] = useState<Pegawai | undefined>(undefined);
  const [dokumenList, setDokumenList] = useState<Dokumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ===== Form state =====
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

  // ===== Success state =====
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef<number>(0);

  // ===== Load pegawai & dokumen on mount =====
  useEffect(() => {
    async function loadData() {
      if (!nipParam) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const pg = await fetchPegawaiByNIP(nipParam);
        if (!pg) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setPegawai(pg);

        const docs = await fetchDokumenByPegawaiId(pg.id);
        setDokumenList(docs);
      } catch (err) {
        console.error('Error loading data:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [nipParam]);

  // ===== Derived: ASN type & dokumen options =====
  const asnType = useMemo(() => {
    if (!pegawai) return null;
    return getASNType(pegawai.jenisASN);
  }, [pegawai]);

  const dokumenConfig = useMemo(() => {
    if (!asnType) return null;
    return getDokumenOptions(asnType);
  }, [asnType]);

  const showPPPKPeriod = useMemo(() => {
    return !!dokumenConfig?.showPPPKPeriod && selectedJenisDokumen === 'SK PPPK';
  }, [dokumenConfig, selectedJenisDokumen]);

  // ===== Derived: Next PPPK period number =====
  const nextPPPKPeriode = useMemo(() => {
    if (!pegawai) return '1';
    const existingSKs = dokumenList.filter(
      (d) => d.pegawaiId === pegawai.id && d.jenisDokumen === 'SK PPPK'
    );
    if (existingSKs.length === 0) return '1';
    const maxPeriode = Math.max(
      ...existingSKs.map((d) => parseInt(d.periode || '0', 10))
    );
    return String(maxPeriode + 1);
  }, [pegawai, dokumenList]);

  // ===== Derived: Quality label =====
  const qualityLabel = useMemo(() => {
    if (!qualityResult || qualityResult.error) return null;
    return getQualityLabel(qualityResult.score);
  }, [qualityResult]);

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
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setFileError('Format file tidak didukung. Hanya file PDF yang diperbolehkan.');
      setSelectedFile(null);
      setPreviewUrl('');
      setQualityResult(null);
      return;
    }
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
    setUploadSuccess(false);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    runQualityAnalysis(file);
  }, [runQualityAnalysis]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSetFile(file);
    },
    [validateAndSetFile]
  );

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
    setUploadSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ===== Submit handler =====
  const handleSubmit = useCallback(async () => {
    if (!pegawai) return;

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

    setUploading(true);

    try {
      // 1. Upload file to Supabase Storage
      console.log('[Upload] Step 1: Uploading file to Supabase Storage...');
      const uploadResult = await uploadFileAndGetUrl(selectedFile, pegawai.id);
      if (!uploadResult) {
        console.error('[Upload] FAILED: Could not upload file to storage. Check bucket exists and RLS policies allow upload.');
        toast.error('Gagal mengunggah file. Storage bucket mungkin belum disiapkan atau RLS memblokir.', { duration: 8000 });
        setUploading(false);
        return;
      }
      console.log('[Upload] File uploaded to storage:', uploadResult.filePath);

      // 2. Save dokumen metadata to Supabase DB
      console.log('[Upload] Step 2: Saving dokumen metadata to Supabase DB...');
      const docData: Omit<Dokumen, 'id'> = {
        pegawaiId: pegawai.id,
        pegawaiNama: pegawai.nama,
        nip: pegawai.nip,
        jenisASN: pegawai.jenisASN,
        jenisDokumen: selectedJenisDokumen,
        tanggal: todayISO(),
        status: 'Pending',
        url: uploadResult.url,
        expiry: masaBerlaku || '',
        fileName: selectedFile.name,
        keterangan: keterangan.trim(),
        filePath: uploadResult.filePath,
        fileSize: selectedFile.size,
      };

      if (selectedJenisDokumen === 'SK PPPK' && showPPPKPeriod) {
        docData.periode = periode || nextPPPKPeriode;
        docData.tmtAwal = tmtAwal || '';
        docData.tmtAkhir = tmtAkhir || '';
      }

      const savedDoc = await addDokumenToDB(docData);
      if (!savedDoc) {
        console.error('[Upload] FAILED: Could not save dokumen to database. Check RLS policies on dokumen table.');
        toast.error('Gagal menyimpan data dokumen ke database. Periksa RLS policies di Supabase.', { duration: 8000 });
        // Try cleanup uploaded file
        try {
          const { supabase } = await import('@/lib/supabase');
          await supabase.storage.from('dokumen').remove([uploadResult.filePath]);
        } catch { /* ignore cleanup error */ }
        setUploading(false);
        return;
      }
      console.log('[Upload] Dokumen saved to DB with id:', savedDoc.id);

      // 3. Add notification
      console.log('[Upload] Step 3: Adding notification...');
      const notifResult = await addNotifikasiToDB(
        `Dokumen "${selectedJenisDokumen}" untuk ${pegawai.nama} berhasil diunggah via link share.`,
        'success'
      );
      if (!notifResult) {
        console.warn('[Upload] WARNING: Could not save notification, but dokumen was saved successfully.');
      }

      // 4. Update local state
      setDokumenList((prev) => [savedDoc, ...prev]);
      setUploadSuccess(true);
      toast.success('Dokumen berhasil diunggah! Menunggu approval admin.', { duration: 5000 });
      console.log('[Upload] SUCCESS: Dokumen uploaded successfully.');

      // Reset form for next upload
      setSelectedJenisDokumen('');
      setPeriode('');
      setTmtAwal('');
      setTmtAkhir('');
      setMasaBerlaku('');
      setKeterangan('');
      removeFile();
    } catch (err) {
      console.error('[Upload] EXCEPTION:', err);
      toast.error(`Gagal mengunggah: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}`, { duration: 8000 });
    } finally {
      setUploading(false);
    }
  }, [
    pegawai, selectedJenisDokumen, selectedFile, fileError,
    showPPPKPeriod, periode, tmtAwal, tmtAkhir, masaBerlaku,
    keterangan, nextPPPKPeriode, removeFile,
  ]);

  // ===== Render: Not found =====
  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-950 dark:to-zinc-900 p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Link Tidak Valid</h2>
            <p className="text-sm text-muted-foreground">
              Link yang Anda buka tidak ditemukan atau sudah tidak berlaku. Silakan hubungi administrator untuk mendapatkan link yang benar.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== Render: Loading =====
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-950 dark:to-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-[#3c6eff]" />
      </div>
    );
  }

  const ACCENT = '#3c6eff';
  const badgeClass = pegawai ? (JENIS_ASN_BADGE[pegawai.jenisASN] ?? 'bg-muted text-muted-foreground') : '';

  // ===== Render: Main page =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-950 dark:to-zinc-900">
      {/* ===== Top Header Bar ===== */}
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur-md dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src="https://i.pinimg.com/736x/76/39/2d/76392d91c9c22d8ec5563b1126cd55b8.jpg"
              alt="Logo E-Arsip ASN"
              className="h-9 w-9 rounded-xl object-cover shadow-sm"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-foreground">E-Arsip ASN</span>
              <span className="text-[10px] font-medium text-muted-foreground leading-tight">Dinas Pendidikan</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={toggleTheme}
            aria-label="Toggle tema"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {pegawai && (<>
        {/* ===== Pegawai Info Card ===== */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#3c6eff]/10">
                <UserCircle className="h-6 w-6 text-[#3c6eff]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-foreground">{pegawai.nama}</h2>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">{pegawai.nip}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className={`text-[11px] font-medium px-2 py-0.5 ${badgeClass}`}>
                    {pegawai.jenisASN}
                  </Badge>
                  {pegawai.jabatan && (
                    <span className="text-xs text-muted-foreground">{pegawai.jabatan}</span>
                  )}
                  {pegawai.golongan && (
                    <span className="text-xs font-medium text-foreground">Gol. {pegawai.golongan}</span>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
                  {pegawai.unitKerja && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Unit Kerja</span>
                      <span className="text-xs text-foreground truncate">{pegawai.unitKerja}</span>
                    </div>
                  )}
                  {pegawai.email && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Email</span>
                      <span className="text-xs text-foreground truncate">{pegawai.email}</span>
                    </div>
                  )}
                  {pegawai.hp && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">No HP</span>
                      <span className="text-xs text-foreground truncate">{pegawai.hp}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== Upload Success Banner ===== */}
        {uploadSuccess && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-4">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-300">Dokumen Berhasil Diunggah!</p>
              <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-0.5">
                Dokumen Anda telah berhasil dikirim dan menunggu approval dari administrator. Anda dapat mengunggah dokumen lain di bawah ini.
              </p>
            </div>
          </div>
        )}

        {/* ===== Upload Form ===== */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4 px-5 pt-5">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CloudUpload className="h-4.5 w-4.5 text-[#3c6eff]" />
              Upload Dokumen
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Unggah dokumen arsip Anda. File wajib format PDF dan akan diperiksa kualitasnya secara otomatis.
            </p>
          </CardHeader>
          <CardContent className="space-y-5 px-5 pb-5">
            {/* ===== Jenis Dokumen ===== */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
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
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih jenis dokumen..." />
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

            {/* ===== PPPK Period ===== */}
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
                        <SelectTrigger className="w-full"><SelectValue placeholder="Pilih" /></SelectTrigger>
                        <SelectContent>
                          {['1','2','3','4','5'].map((n) => (
                            <SelectItem key={n} value={n}>Periode {n}</SelectItem>
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

            {/* ===== Masa Berlaku ===== */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Masa Berlaku <span className="text-xs font-normal text-muted-foreground">(opsional)</span>
              </Label>
              <Input type="date" value={masaBerlaku} onChange={(e) => setMasaBerlaku(e.target.value)} className="w-full" />
            </div>

            {/* ===== Keterangan ===== */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Keterangan <span className="text-xs font-normal text-muted-foreground">(opsional)</span>
              </Label>
              <Textarea
                placeholder="Catatan tambahan tentang dokumen ini..."
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                rows={2}
                className="w-full resize-none"
              />
            </div>

            {/* ===== File Upload ===== */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                File Dokumen <span className="text-red-500">*</span>
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  Wajib PDF — Maks. {formatFileSize(MAX_FILE_SIZE)}
                </span>
              </Label>
              <div
                className={`relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors cursor-pointer ${
                  qualityResult?.isBlurry
                    ? 'border-amber-400/60 bg-amber-50/30 dark:border-amber-600/60 dark:bg-amber-950/10'
                    : 'border-muted-foreground/25 bg-muted/30 hover:border-blue-400/60 hover:bg-blue-50/30 dark:hover:border-blue-600/60 dark:hover:bg-blue-950/20'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {selectedFile ? (
                  <>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      qualityResult?.isBlurry ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      <File className={`h-6 w-6 ${qualityResult?.isBlurry ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`} />
                    </div>
                    <div className="min-w-0 max-w-full">
                      <p className="truncate text-sm font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-7 w-7 rounded-full p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={(e) => { e.stopPropagation(); removeFile(); }}
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
                      <p className="text-sm font-medium text-foreground">Klik atau seret file PDF ke sini</p>
                      <p className="text-xs text-muted-foreground mt-1">Hanya file PDF — Maks. {formatFileSize(MAX_FILE_SIZE)}</p>
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

              {/* Quality analysis */}
              {isAnalyzing && (
                <div className="flex items-center gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-3.5">
                  <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Menganalisis kualitas PDF...</p>
                    <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">{analysisProgress || 'Memproses...'}</p>
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
                        <span className={`text-sm font-semibold ${qualityLabel?.color || ''}`}>{qualityLabel?.label || 'OK'}</span>
                        <Badge variant="secondary" className={`text-[10px] font-mono px-1.5 py-0 ${qualityLabel?.bgColor || ''}`}>
                          Skor: {qualityResult.score}
                        </Badge>
                      </div>
                      <p className={`text-xs mt-1 ${qualityResult.isBlurry ? 'text-amber-600/80 dark:text-amber-400/80' : 'text-muted-foreground'}`}>
                        {qualityLabel?.description}
                      </p>
                      {qualityResult.isBlurry && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2.5 h-8 gap-1.5 text-xs font-semibold border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                          onClick={() => { removeFile(); toast.info('Silakan pilih file PDF yang lebih jelas.'); }}
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
                    <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">Analisis Gagal</p>
                    <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-1">{qualityResult.error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ===== Upload Button ===== */}
            <Button
              onClick={handleSubmit}
              disabled={!selectedJenisDokumen || selectedJenisDokumen === '---' || !selectedFile || isAnalyzing || uploading}
              className="w-full h-11 bg-[#3c6eff] hover:bg-[#3c6eff]/90 text-white font-semibold gap-2 shadow-lg shadow-[#3c6eff]/20"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mengunggah ke server...
                </>
              ) : isAnalyzing ? (
                'Menganalisis PDF...'
              ) : (
                <>
                  <CloudUpload className="h-4 w-4" />
                  Unggah Dokumen
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ===== Preview ===== */}
        {previewUrl && selectedFile && (
          <Card className="mt-6 border-0 shadow-lg">
            <CardHeader className="pb-3 px-5 pt-5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Eye className="h-4 w-4" />
                Preview Dokumen
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className={`flex items-center justify-center rounded-lg border overflow-hidden ${
                qualityResult?.isBlurry ? 'border-amber-300 dark:border-amber-700' : ''
              }`} style={{ minHeight: '280px' }}>
                <iframe src={previewUrl} title="Preview PDF" className="h-72 w-full border-0" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== Uploaded Documents List ===== */}
        {pegawai && (
          <Card className="mt-6 border-0 shadow-lg">
            <CardHeader className="pb-3 px-5 pt-5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <FileCheck className="h-4 w-4" />
                Dokumen yang Sudah Diunggah
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {dokumenList.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <FileCheck className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Belum ada dokumen yang diunggah</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dokumenList.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '')).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3 bg-muted/20">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <File className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{doc.jenisDokumen}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(doc.tanggal)}</p>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-semibold px-2 py-0.5 shrink-0 ${
                          doc.status === 'Approved'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : doc.status === 'Rejected'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}
                      >
                        {doc.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ===== Footer ===== */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground/60">
            E-Arsip ASN &mdash; Dinas Pendidikan Kabupaten &copy; {new Date().getFullYear()}
          </p>
        </div>
        </>)}
      </main>
    </div>
  );
}