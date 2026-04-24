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
  Briefcase,
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
  Pencil,
  Save,
  ChevronDown,
  ChevronUp,
  MapPin,
  GraduationCap,
  Phone,
  Mail,
  Calendar,
  Home,
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
import { getASNType, getDokumenOptions, getGolonganOptions, MAX_FILE_SIZE, ALLOWED_MIME_TYPES, DOKUMEN_UMUM, JENIS_ASN_BADGE, JENIS_ASN_OPTIONS, JABATAN_OPTIONS, UNIT_KERJA_OPTIONS } from '@/lib/constants';
import { formatDate, formatFileSize, todayISO } from '@/lib/utils-arsip';
import { analyzePDFQuality, getQualityLabel } from '@/lib/pdf-quality';
import { fetchPegawaiByNIP, fetchPegawai, fetchDokumenByPegawaiId, uploadFileAndGetUrl, addDokumenToDB, addNotifikasiToDB, addPegawaiToDB, updatePegawaiInDB } from '@/lib/db';
import type { Pegawai, Dokumen } from '@/lib/types';
import type { PDFQualityResult } from '@/lib/pdf-quality';

// ===== Profile Editable Fields =====
interface ProfileFormData {
  nip: string;
  nama: string;
  jenisASN: string;
  jabatan: string;
  golongan: string;
  unitKerja: string;
  email: string;
  hp: string;
  tanggalLahir: string;
  tempatLahir: string;
  jenisKelamin: string;
  agama: string;
  alamat: string;
  pendidikanTerakhir: string;
  status: 'Aktif' | 'Nonaktif';
}

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

  // ===== NIP check & register state =====
  const [nipCheckInput, setNipCheckInput] = useState('');
  const [isCheckingNIP, setIsCheckingNIP] = useState(false);
  const [nipCheckError, setNipCheckError] = useState('');
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerForm, setRegisterForm] = useState<ProfileFormData>({
    nip: '', nama: '', jenisASN: '', jabatan: '', golongan: '',
    unitKerja: '', email: '', hp: '', tanggalLahir: '',
    tempatLahir: '', jenisKelamin: '', agama: '',
    alamat: '', pendidikanTerakhir: '', status: 'Aktif',
  });
  const [nipDupInfo, setNipDupInfo] = useState<{ nama: string; unitKerja: string } | null>(null);

  // ===== Profile edit state =====
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    nip: '', nama: '', jenisASN: '', jabatan: '', golongan: '',
    unitKerja: '', email: '', hp: '', tanggalLahir: '',
    tempatLahir: '', jenisKelamin: '', agama: '',
    alamat: '', pendidikanTerakhir: '', status: 'Aktif',
  });
  const [profileInitialized, setProfileInitialized] = useState(false);

  // ===== Upload form state =====
  const [selectedJenisDokumen, setSelectedJenisDokumen] = useState<string>('');
  const [periode, setPeriode] = useState<string>('');
  const [tmtAwal, setTmtAwal] = useState<string>('');
  const [tmtAkhir, setTmtAkhir] = useState<string>('');
  const [masaBerlaku, setMasaBerlaku] = useState<string>('');
  const [keterangan, setKeterangan] = useState<string>('');
  const [uploading, setUploading] = useState(false);

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
        setNipCheckInput('');
        setLoading(false);
        return;
      }

      try {
        const pg = await fetchPegawaiByNIP(nipParam);
        if (!pg) {
          setNotFound(true);
          setNipCheckInput(nipParam);
          setLoading(false);
          return;
        }

        setPegawai(pg);

        // Initialize profile form with current data
        setProfileForm({
          nip: pg.nip || '',
          nama: pg.nama || '',
          jenisASN: pg.jenisASN || '',
          jabatan: pg.jabatan || '',
          golongan: pg.golongan || '',
          unitKerja: pg.unitKerja || '',
          email: pg.email || '',
          hp: pg.hp || '',
          tanggalLahir: pg.tanggalLahir || '',
          tempatLahir: pg.tempatLahir || '',
          jenisKelamin: pg.jenisKelamin || '',
          agama: pg.agama || '',
          alamat: pg.alamat || '',
          pendidikanTerakhir: pg.pendidikanTerakhir || '',
          status: pg.status || 'Aktif',
        });
        setProfileInitialized(true);

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
    // ===== Profile handlers =====
  const updateProfileField = useCallback((key: keyof ProfileFormData, value: string) => {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const hasProfileChanges = useMemo(() => {
    if (!pegawai || !profileInitialized) return false;
    return (
      profileForm.nip !== (pegawai.nip || '') ||
      profileForm.nama !== (pegawai.nama || '') ||
      profileForm.jenisASN !== (pegawai.jenisASN || '') ||
      profileForm.jabatan !== (pegawai.jabatan || '') ||
      profileForm.golongan !== (pegawai.golongan || '') ||
      profileForm.unitKerja !== (pegawai.unitKerja || '') ||
      profileForm.email !== (pegawai.email || '') ||
      profileForm.hp !== (pegawai.hp || '') ||
      profileForm.tanggalLahir !== (pegawai.tanggalLahir || '') ||
      profileForm.tempatLahir !== (pegawai.tempatLahir || '') ||
      profileForm.jenisKelamin !== (pegawai.jenisKelamin || '') ||
      profileForm.agama !== (pegawai.agama || '') ||
      profileForm.alamat !== (pegawai.alamat || '') ||
      profileForm.pendidikanTerakhir !== (pegawai.pendidikanTerakhir || '') ||
      profileForm.status !== (pegawai.status || 'Aktif')
    );
  }, [pegawai, profileForm, profileInitialized]);

  const handleSaveProfile = useCallback(async () => {
    if (!pegawai) return;

    setIsSavingProfile(true);
    try {
      const ok = await updatePegawaiInDB(pegawai.id, {
        nip: profileForm.nip.trim(),
        nama: profileForm.nama.trim(),
        jenisASN: profileForm.jenisASN,
        jabatan: profileForm.jabatan,
        golongan: profileForm.golongan,
        unitKerja: profileForm.unitKerja,
        email: profileForm.email.trim(),
        hp: profileForm.hp.trim(),
        tanggalLahir: profileForm.tanggalLahir,
        tempatLahir: profileForm.tempatLahir.trim(),
        jenisKelamin: profileForm.jenisKelamin,
        agama: profileForm.agama,
        alamat: profileForm.alamat.trim(),
        pendidikanTerakhir: profileForm.pendidikanTerakhir.trim(),
        status: profileForm.status,
      });

      if (ok) {
        // Refresh pegawai data from DB (use new NIP if changed)
        const newNip = profileForm.nip.trim() || nipParam;
        const updated = await fetchPegawaiByNIP(newNip);
        if (updated) setPegawai(updated);
        setIsEditingProfile(false);
        toast.success('Profil berhasil diperbarui dan tersimpan di data admin.');
      } else {
        toast.error('Gagal menyimpan profil. Silakan coba lagi.');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      toast.error('Gagal menyimpan profil.');
    } finally {
      setIsSavingProfile(false);
    }
  }, [pegawai, profileForm, nipParam]);

  const handleCancelEdit = useCallback(() => {
    if (!pegawai) return;
    setProfileForm({
      nip: pegawai.nip || '',
      nama: pegawai.nama || '',
      jenisASN: pegawai.jenisASN || '',
      jabatan: pegawai.jabatan || '',
      golongan: pegawai.golongan || '',
      unitKerja: pegawai.unitKerja || '',
      email: pegawai.email || '',
      hp: pegawai.hp || '',
      tanggalLahir: pegawai.tanggalLahir || '',
      tempatLahir: pegawai.tempatLahir || '',
      jenisKelamin: pegawai.jenisKelamin || '',
      agama: pegawai.agama || '',
      alamat: pegawai.alamat || '',
      pendidikanTerakhir: pegawai.pendidikanTerakhir || '',
      status: pegawai.status || 'Aktif',
    });
    setIsEditingProfile(false);
  }, [pegawai]);

  // ===== NIP Check Handler =====
  const handleCheckNIP = useCallback(async () => {
    const nip = nipCheckInput.replace(/\s/g, '').trim();
    if (!nip) {
      setNipCheckError('Masukkan NIP terlebih dahulu.');
      return;
    }
    setIsCheckingNIP(true);
    setNipCheckError('');
    try {
      const pg = await fetchPegawaiByNIP(nip);
      if (pg) {
        // NIP ditemukan — load pegawai data
        setPegawai(pg);
        setNotFound(false);
        setShowRegisterForm(false);
        setProfileForm({
          nip: pg.nip || '', nama: pg.nama || '', jenisASN: pg.jenisASN || '',
          jabatan: pg.jabatan || '', golongan: pg.golongan || '',
          unitKerja: pg.unitKerja || '', email: pg.email || '', hp: pg.hp || '',
          tanggalLahir: pg.tanggalLahir || '', tempatLahir: pg.tempatLahir || '',
          jenisKelamin: pg.jenisKelamin || '', agama: pg.agama || '',
          alamat: pg.alamat || '', pendidikanTerakhir: pg.pendidikanTerakhir || '',
          status: pg.status || 'Aktif',
        });
        setProfileInitialized(true);
        const docs = await fetchDokumenByPegawaiId(pg.id);
        setDokumenList(docs);
        toast.success(`NIP ditemukan! Selamat datang, ${pg.nama}.`);
      } else {
        setNipCheckError(`NIP "${nip}" tidak terdaftar dalam sistem. Pastikan NIP yang Anda masukkan sudah benar tanpa spasi.`);
      }
    } catch {
      setNipCheckError('Gagal memeriksa NIP. Periksa koneksi internet Anda.');
    } finally {
      setIsCheckingNIP(false);
    }
  }, [nipCheckInput]);

  // ===== Open Register Form =====
  const handleOpenRegister = useCallback(() => {
    const nip = nipCheckInput.replace(/\s/g, '').trim();
    setRegisterForm((prev) => ({ ...prev, nip }));
    setShowRegisterForm(true);
    setNipDupInfo(null);
  }, [nipCheckInput]);

  // ===== Register Handler =====
  const handleRegister = useCallback(async () => {
    const nip = registerForm.nip.replace(/\s/g, '').trim();
    if (!nip || !registerForm.nama.trim()) {
      toast.error('NIP dan Nama wajib diisi.');
      return;
    }
    setIsRegistering(true);
    setNipDupInfo(null);
    try {
      // Double-check NIP tidak duplikat
      const existing = await fetchPegawaiByNIP(nip);
      if (existing) {
        setNipDupInfo({ nama: existing.nama, unitKerja: existing.unitKerja || '-' });
        toast.error(`NIP sudah terdaftar atas nama ${existing.nama}${existing.unitKerja ? ` dari ${existing.unitKerja}` : ''}.`);
        setIsRegistering(false);
        return;
      }
      const newPegawai: Pegawai = {
        id: 0, nip, nama: registerForm.nama.trim(),
        jenisASN: registerForm.jenisASN, jabatan: registerForm.jabatan,
        golongan: registerForm.golongan, unitKerja: registerForm.unitKerja,
        email: registerForm.email.trim(), hp: registerForm.hp.trim(),
        tanggalLahir: registerForm.tanggalLahir, tempatLahir: registerForm.tempatLahir.trim(),
        jenisKelamin: registerForm.jenisKelamin, agama: registerForm.agama,
        alamat: registerForm.alamat.trim(), pendidikanTerakhir: registerForm.pendidikanTerakhir.trim(),
        status: 'Aktif',
      };
      const saved = await addPegawaiToDB(newPegawai);
      if (saved) {
        await addNotifikasiToDB(`Pegawai baru "${saved.nama}" (NIP: ${saved.nip}) mendaftar via link share.`, 'info');
        // Load data like normal
        setPegawai(saved);
        setNotFound(false);
        setShowRegisterForm(false);
        setProfileForm({
          nip: saved.nip || '', nama: saved.nama || '', jenisASN: saved.jenisASN || '',
          jabatan: saved.jabatan || '', golongan: saved.golongan || '',
          unitKerja: saved.unitKerja || '', email: saved.email || '', hp: saved.hp || '',
          tanggalLahir: saved.tanggalLahir || '', tempatLahir: saved.tempatLahir || '',
          jenisKelamin: saved.jenisKelamin || '', agama: saved.agama || '',
          alamat: saved.alamat || '', pendidikanTerakhir: saved.pendidikanTerakhir || '',
          status: saved.status || 'Aktif',
        });
        setProfileInitialized(true);
        const docs = await fetchDokumenByPegawaiId(saved.id);
        setDokumenList(docs);
        toast.success('Pendaftaran berhasil! Selamat datang, ' + saved.nama + '.');
      } else {
        toast.error('Gagal mendaftar. Silakan coba lagi.');
      }
    } catch (err) {
      console.error('Register error:', err);
      toast.error('Gagal mendaftar. Terjadi kesalahan server.');
    } finally {
      setIsRegistering(false);
    }
  }, [registerForm]);

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

  // ===== Derived: Golongan options based on jenisASN =====
  const golonganOptions = useMemo(() => {
    return getGolonganOptions(profileForm.jenisASN);
  }, [profileForm.jenisASN]);

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
        console.error('[Upload] FAILED: Could not upload file to storage.');
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
        console.error('[Upload] FAILED: Could not save dokumen to database.');
        toast.error('Gagal menyimpan data dokumen ke database. Periksa RLS policies di Supabase.', { duration: 8000 });
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
    // ===== Render: Not found / Check NIP / Register =====
  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-950 dark:to-zinc-900">
        {/* Header */}
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

        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          {!showRegisterForm ? (
            /* ===== NIP Check Card ===== */
            <Card className="w-full border-0 shadow-2xl">
              <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
                  <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">NIP Tidak Ditemukan</h2>
                  <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                    NIP yang Anda gunakan belum terdaftar dalam sistem. Silakan periksa kembali NIP Anda dan pastikan tanpa spasi.
                  </p>
                </div>

                {/* NIP Input */}
                <div className="w-full max-w-sm space-y-3">
                  <div className="relative">
                    <Input
                      placeholder="Masukkan NIP Anda (tanpa spasi)"
                      value={nipCheckInput}
                      onChange={(e) => {
                        setNipCheckInput(e.target.value.replace(/\s/g, ''));
                        setNipCheckError('');
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCheckNIP(); }}
                      className="h-11 text-center text-base font-mono tracking-wider pr-12"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9"
                      onClick={() => setNipCheckInput('')}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <Button
                    onClick={handleCheckNIP}
                    disabled={isCheckingNIP || !nipCheckInput.trim()}
                    className="w-full h-11 bg-[#3c6eff] hover:bg-[#3c6eff]/90 text-white font-semibold gap-2"
                  >
                    {isCheckingNIP ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Memeriksa NIP...</>
                    ) : (
                      <><FileCheck className="h-4 w-4" />Periksa NIP</>
                    )}
                  </Button>
                </div>

                {/* Error message */}
                {nipCheckError && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4 text-left w-full max-w-sm">
                    <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">{nipCheckError}</p>
                  </div>
                )}

                {/* Divider */}
                {nipCheckError && (
                  <div className="flex items-center gap-3 w-full max-w-sm">
                    <div className="flex-1 border-t" />
                    <span className="text-xs text-muted-foreground font-medium">atau</span>
                    <div className="flex-1 border-t" />
                  </div>
                )}

                {/* Register button */}
                {nipCheckError && (
                  <Button
                    onClick={handleOpenRegister}
                    variant="outline"
                    className="w-full max-w-sm h-11 border-dashed border-2 border-[#3c6eff]/40 text-[#3c6eff] hover:bg-[#3c6eff]/10 hover:border-[#3c6eff] font-semibold gap-2"
                  >
                    <UserCircle className="h-4 w-4" />
                    Daftar sebagai Pegawai Baru
                  </Button>
                )}

                <p className="text-[11px] text-muted-foreground/60 mt-2">
                  Jika Anda yakin NIP sudah benar, hubungi administrator untuk verifikasi.
                </p>
              </CardContent>
            </Card>
          ) : (
            /* ===== Register Form ===== */
            <Card className="w-full border-0 shadow-2xl">
              <CardHeader className="pb-2 px-6 pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3c6eff]/10">
                    <UserCircle className="h-5 w-5 text-[#3c6eff]" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">Pendaftaran Pegawai Baru</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Lengkapi data profil Anda untuk mendaftar ke sistem E-Arsip ASN.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {/* NIP dup warning */}
                {nipDupInfo && (
                  <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
                    <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-700 dark:text-red-300">NIP Sudah Terdaftar!</p>
                      <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
                        NIP ini sudah terdaftar atas nama <strong>{nipDupInfo.nama}</strong> dari <strong>{nipDupInfo.unitKerja}</strong>.
                        Silakan hubungi administrator jika ini merupakan kesalahan.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* NIP */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <FileCheck className="h-3.5 w-3.5" />NIP <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="Nomor Induk Pegawai"
                      value={registerForm.nip}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, nip: e.target.value.replace(/\s/g, '') }))}
                      className="h-9 text-sm font-mono"
                    />
                  </div>

                  {/* Nama */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <UserCircle className="h-3.5 w-3.5" />Nama Lengkap <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="Nama sesuai data kepegawaian"
                      value={registerForm.nama}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, nama: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Jenis ASN */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Jenis ASN</Label>
                    <Select value={registerForm.jenisASN} onValueChange={(v) => setRegisterForm((p) => ({ ...p, jenisASN: v, golongan: '' }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih jenis ASN..." /></SelectTrigger>
                      <SelectContent>
                        {JENIS_ASN_OPTIONS.map((group) => (
                          <SelectGroup key={group.group}>
                            <SelectLabel className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{group.group}</SelectLabel>
                            {group.items.map((item) => (
                              <SelectItem key={item} value={item}>{item}</SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Jabatan */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" />Jabatan
                    </Label>
                    <Select value={registerForm.jabatan} onValueChange={(v) => setRegisterForm((p) => ({ ...p, jabatan: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih jabatan..." /></SelectTrigger>
                      <SelectContent>
                        {JABATAN_OPTIONS.map((group) => (
                          <SelectGroup key={group.group}>
                            <SelectLabel className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{group.group}</SelectLabel>
                            {group.items.map((item) => (
                              <SelectItem key={item} value={item}>{item}</SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Golongan */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Golongan</Label>
                    <Select value={registerForm.golongan} onValueChange={(v) => setRegisterForm((p) => ({ ...p, golongan: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih golongan..." /></SelectTrigger>
                      <SelectContent>
                        {getGolonganOptions(registerForm.jenisASN).map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Unit Kerja */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />Unit Kerja
                    </Label>
                    <Select value={registerForm.unitKerja} onValueChange={(v) => setRegisterForm((p) => ({ ...p, unitKerja: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih unit kerja..." /></SelectTrigger>
                      <SelectContent>
                        {UNIT_KERJA_OPTIONS.map((item) => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />Email
                    </Label>
                    <Input
                      type="email"
                      placeholder="contoh@email.com"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* No HP */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />No HP
                    </Label>
                    <Input
                      placeholder="08xxxxxxxxxx"
                      value={registerForm.hp}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, hp: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Tempat Lahir */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />Tempat Lahir
                    </Label>
                    <Input
                      placeholder="Kota / Kabupaten"
                      value={registerForm.tempatLahir}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, tempatLahir: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Tanggal Lahir */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" />Tanggal Lahir
                    </Label>
                    <Input
                      type="date"
                      value={registerForm.tanggalLahir}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, tanggalLahir: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Jenis Kelamin */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Jenis Kelamin</Label>
                    <Select value={registerForm.jenisKelamin} onValueChange={(v) => setRegisterForm((p) => ({ ...p, jenisKelamin: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                        <SelectItem value="Perempuan">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Agama */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Agama</Label>
                    <Select value={registerForm.agama} onValueChange={(v) => setRegisterForm((p) => ({ ...p, agama: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Islam">Islam</SelectItem>
                        <SelectItem value="Kristen">Kristen</SelectItem>
                        <SelectItem value="Katolik">Katolik</SelectItem>
                        <SelectItem value="Hindu">Hindu</SelectItem>
                        <SelectItem value="Buddha">Buddha</SelectItem>
                        <SelectItem value="Konghucu">Konghucu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pendidikan Terakhir */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5" />Pendidikan Terakhir
                    </Label>
                    <Select value={registerForm.pendidikanTerakhir} onValueChange={(v) => setRegisterForm((p) => ({ ...p, pendidikanTerakhir: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SMA/SMK Sederajat">SMA/SMK Sederajat</SelectItem>
                        <SelectItem value="Diploma I">Diploma I</SelectItem>
                        <SelectItem value="Diploma II">Diploma II</SelectItem>
                        <SelectItem value="Diploma III (D3)">Diploma III (D3)</SelectItem>
                        <SelectItem value="Diploma IV (D4)">Diploma IV (D4)</SelectItem>
                        <SelectItem value="Sarjana (S1)">Sarjana (S1)</SelectItem>
                        <SelectItem value="Magister (S2)">Magister (S2)</SelectItem>
                        <SelectItem value="Doktor (S3)">Doktor (S3)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Alamat — full width */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Home className="h-3.5 w-3.5" />Alamat Lengkap
                    </Label>
                    <Textarea
                      placeholder="Masukkan alamat lengkap..."
                      value={registerForm.alamat}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, alamat: e.target.value }))}
                      rows={2}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs text-muted-foreground"
                    onClick={() => { setShowRegisterForm(false); setNipDupInfo(null); }}
                  >
                    <ChevronDown className="h-3.5 w-3.5 mr-1" />Kembali
                  </Button>
                  <Button
                    className="h-10 bg-[#3c6eff] hover:bg-[#3c6eff]/90 text-white font-semibold gap-2 px-6"
                    onClick={handleRegister}
                    disabled={isRegistering || !registerForm.nip.trim() || !registerForm.nama.trim()}
                  >
                    {isRegistering ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Mendaftar...</>
                    ) : (
                      <><UserCircle className="h-4 w-4" />Daftar Sekarang</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
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
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold text-foreground">{pegawai.nama}</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 gap-1.5 text-xs font-medium shrink-0 ${isEditingProfile ? 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30' : 'text-[#3c6eff] hover:text-[#3c6eff] hover:bg-[#3c6eff]/10'}`}
                    onClick={() => {
                      if (isEditingProfile) {
                        if (hasProfileChanges) handleSaveProfile();
                        else setIsEditingProfile(false);
                      } else {
                        setIsEditingProfile(true);
                      }
                    }}
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" />Menyimpan...</>
                    ) : isEditingProfile ? (
                      <><Save className="h-3.5 w-3.5" />Simpan Profil</>
                    ) : (
                      <><Pencil className="h-3.5 w-3.5" />Edit Profil</>
                    )}
                  </Button>
                </div>
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

        {/* ===== Profile Edit Section ===== */}
        {isEditingProfile && (
          <Card className="mb-6 border-0 shadow-lg border-l-4 border-l-[#3c6eff]">
            <CardHeader className="pb-3 px-5 pt-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <UserCircle className="h-4 w-4 text-[#3c6eff]" />
                Data Profil Pribadi
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Perbarui data profil Anda. Perubahan akan langsung tersimpan di database administrator.
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* NIP */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <FileCheck className="h-3.5 w-3.5" />NIP
                  </Label>
                  <Input
                    placeholder="Nomor Induk Pegawai"
                    value={profileForm.nip}
                    onChange={(e) => updateProfileField('nip', e.target.value)}
                    className="h-9 text-sm font-mono"
                  />
                </div>

                {/* Nama */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <UserCircle className="h-3.5 w-3.5" />Nama Lengkap
                  </Label>
                  <Input
                    placeholder="Nama sesuai data kepegawaian"
                    value={profileForm.nama}
                    onChange={(e) => updateProfileField('nama', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Jenis ASN */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Jenis ASN</Label>
                  <Select value={profileForm.jenisASN} onValueChange={(v) => {
                    updateProfileField('jenisASN', v);
                    updateProfileField('golongan', '');
                  }}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih jenis ASN..." /></SelectTrigger>
                    <SelectContent>
                      {JENIS_ASN_OPTIONS.map((group) => (
                        <SelectGroup key={group.group}>
                          <SelectLabel className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{group.group}</SelectLabel>
                          {group.items.map((item) => (
                            <SelectItem key={item} value={item}>{item}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Jabatan */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" />Jabatan
                  </Label>
                  <Select value={profileForm.jabatan} onValueChange={(v) => updateProfileField('jabatan', v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih jabatan..." /></SelectTrigger>
                    <SelectContent>
                      {JABATAN_OPTIONS.map((group) => (
                        <SelectGroup key={group.group}>
                          <SelectLabel className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{group.group}</SelectLabel>
                          {group.items.map((item) => (
                            <SelectItem key={item} value={item}>{item}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Golongan */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Golongan</Label>
                  <Select value={profileForm.golongan} onValueChange={(v) => updateProfileField('golongan', v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih golongan..." /></SelectTrigger>
                    <SelectContent>
                      {golonganOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Unit Kerja */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />Unit Kerja
                  </Label>
                  <Select value={profileForm.unitKerja} onValueChange={(v) => updateProfileField('unitKerja', v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih unit kerja..." /></SelectTrigger>
                    <SelectContent>
                      {UNIT_KERJA_OPTIONS.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Status Kepegawaian</Label>
                  <Select value={profileForm.status} onValueChange={(v) => updateProfileField('status', v as 'Aktif' | 'Nonaktif')}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih status..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aktif">Aktif</SelectItem>
                      <SelectItem value="Nonaktif">Nonaktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />Email
                  </Label>
                  <Input
                    type="email"
                    placeholder="contoh@email.com"
                    value={profileForm.email}
                    onChange={(e) => updateProfileField('email', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                {/* No HP */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />No HP
                  </Label>
                  <Input
                    placeholder="08xxxxxxxxxx"
                    value={profileForm.hp}
                    onChange={(e) => updateProfileField('hp', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Tempat Lahir */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />Tempat Lahir
                  </Label>
                  <Input
                    placeholder="Kota / Kabupaten"
                    value={profileForm.tempatLahir}
                    onChange={(e) => updateProfileField('tempatLahir', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Tanggal Lahir */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />Tanggal Lahir
                  </Label>
                  <Input
                    type="date"
                    value={profileForm.tanggalLahir}
                    onChange={(e) => updateProfileField('tanggalLahir', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Jenis Kelamin */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Jenis Kelamin</Label>
                  <Select value={profileForm.jenisKelamin} onValueChange={(v) => updateProfileField('jenisKelamin', v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                      <SelectItem value="Perempuan">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Agama */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Agama</Label>
                  <Select value={profileForm.agama} onValueChange={(v) => updateProfileField('agama', v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Islam">Islam</SelectItem>
                      <SelectItem value="Kristen">Kristen</SelectItem>
                      <SelectItem value="Katolik">Katolik</SelectItem>
                      <SelectItem value="Hindu">Hindu</SelectItem>
                      <SelectItem value="Buddha">Buddha</SelectItem>
                      <SelectItem value="Konghucu">Konghucu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pendidikan Terakhir */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5" />Pendidikan Terakhir
                  </Label>
                  <Select value={profileForm.pendidikanTerakhir} onValueChange={(v) => updateProfileField('pendidikanTerakhir', v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SMA/SMK Sederajat">SMA/SMK Sederajat</SelectItem>
                      <SelectItem value="Diploma I">Diploma I</SelectItem>
                      <SelectItem value="Diploma II">Diploma II</SelectItem>
                      <SelectItem value="Diploma III (D3)">Diploma III (D3)</SelectItem>
                      <SelectItem value="Diploma IV (D4)">Diploma IV (D4)</SelectItem>
                      <SelectItem value="Sarjana (S1)">Sarjana (S1)</SelectItem>
                      <SelectItem value="Magister (S2)">Magister (S2)</SelectItem>
                      <SelectItem value="Doktor (S3)">Doktor (S3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Alamat — full width */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Home className="h-3.5 w-3.5" />Alamat Lengkap
                  </Label>
                  <Textarea
                    placeholder="Masukkan alamat lengkap..."
                    value={profileForm.alamat}
                    onChange={(e) => updateProfileField('alamat', e.target.value)}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleCancelEdit}
                  disabled={isSavingProfile}
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  className="h-8 bg-[#3c6eff] hover:bg-[#3c6eff]/90 text-white text-xs gap-1.5"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile || !hasProfileChanges}
                >
                  {isSavingProfile ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" />Menyimpan...</>
                  ) : (
                    <><Save className="h-3.5 w-3.5" />Simpan Perubahan</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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