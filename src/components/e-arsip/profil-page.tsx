'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  UserCircle,
  Save,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Building,
  Briefcase,
  Shield,
  IdCard,
  Award,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useArsipStore } from '@/lib/store';
import { getGolonganOptions } from '@/lib/constants';

// ===== Constants =====

const JENIS_ASN_OPTIONS = ['PNS', 'PPPK'];

// ===== Profil Page =====

export default function ProfilPage() {
  const {
    currentUser,
    pegawaiList,
    updatePegawai,
    updateCurrentUser,
  } = useArsipStore();

  // Find pegawai data for current user (if role is pegawai)
  const pegawaiData = useMemo(() => {
    if (!currentUser || currentUser.role !== 'pegawai') return null;
    return pegawaiList.find((p) => p.id === currentUser.pegawaiId) || null;
  }, [currentUser, pegawaiList]);

  // Form state — semua field pegawai bisa diedit
  const [form, setForm] = useState({
    nip: '',
    nama: '',
    jenisASN: '',
    jabatan: '',
    golongan: '',
    kecamatan: '',
    unitKerja: '',
    email: '',
    hp: '',
    tanggalLahir: '',
    tempatLahir: '',
    jenisKelamin: '',
    agama: '',
    alamat: '',
    pendidikanTerakhir: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  // Populate form from pegawaiData when it loads
  useEffect(() => {
    if (pegawaiData) {
      setForm({
        nip: pegawaiData.nip || '',
        nama: pegawaiData.nama || '',
        jenisASN: pegawaiData.jenisASN || '',
        jabatan: pegawaiData.jabatan || '',
        golongan: pegawaiData.golongan || '',
        kecamatan: pegawaiData.kecamatan || '',
        unitKerja: pegawaiData.unitKerja || '',
        email: pegawaiData.email || '',
        hp: pegawaiData.hp || '',
        tanggalLahir: pegawaiData.tanggalLahir || '',
        tempatLahir: pegawaiData.tempatLahir || '',
        jenisKelamin: pegawaiData.jenisKelamin || '',
        agama: pegawaiData.agama || '',
        alamat: pegawaiData.alamat || '',
        pendidikanTerakhir: pegawaiData.pendidikanTerakhir || '',
      });
    } else if (currentUser) {
      setForm((prev) => ({ ...prev, nama: currentUser.nama || '' }));
    }
  }, [pegawaiData, currentUser]);

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.nama.trim()) {
      toast.error('Nama wajib diisi');
      return;
    }
    if (!form.nip.trim() || form.nip.trim().length < 5) {
      toast.error('NIP harus diisi minimal 5 karakter');
      return;
    }

    setIsSaving(true);

    try {
      if (currentUser?.role === 'pegawai' && pegawaiData) {
        updatePegawai(pegawaiData.id, {
          nip: form.nip.trim(),
          nama: form.nama.trim(),
          jenisASN: form.jenisASN || '-',
          jabatan: form.jabatan.trim() || '-',
          golongan: form.golongan || '-',
          kecamatan: form.kecamatan.trim() || '-',
          unitKerja: form.unitKerja.trim() || '-',
          email: form.email.trim(),
          hp: form.hp.trim(),
          tanggalLahir: form.tanggalLahir,
          tempatLahir: form.tempatLahir.trim(),
          jenisKelamin: form.jenisKelamin,
          agama: form.agama,
          alamat: form.alamat.trim(),
          pendidikanTerakhir: form.pendidikanTerakhir.trim(),
        });

        // Update currentUser agar sidebar & login reflect change
        updateCurrentUser({
          nama: form.nama.trim(),
          nip: form.nip.trim(),
        });

        toast.success('Profil berhasil diperbarui');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-extract tanggal lahir dari NIP
  const handleNipChange = (value: string) => {
    updateField('nip', value);
    if (value.trim().length === 18) {
      const dateStr = value.trim().substring(0, 8);
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const date = `${year}-${month}-${day}`;
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date))) {
        updateField('tanggalLahir', date);
      }
    }
  };

  if (!currentUser) return null;

  // Dynamic golongan options based on selected jenisASN
  const golonganOpts = useMemo(
    () => getGolonganOptions(form.jenisASN),
    [form.jenisASN]
  );

  // When jenisASN changes, reset golongan if current value is invalid for new type
  const handleJenisASNChange = (value: string) => {
    updateField('jenisASN', value);
    const newOpts = getGolonganOptions(value);
    if (form.golongan && !newOpts.some((g) => g.value === form.golongan)) {
      updateField('golongan', '');
    }
  };

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <section aria-label="Header Profil">
        <div>
          <div className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Edit Profil
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola informasi profil dan data pribadi Anda
          </p>
        </div>
      </section>

      {/* ===== Profile Card - Avatar & Summary ===== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-border/60 bg-white dark:bg-zinc-950 overflow-hidden">
          {/* Banner */}
          <div className="h-28 bg-gradient-to-r from-[#3c6eff] to-[#6d8fff] relative">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 right-8 h-20 w-20 rounded-full border-4 border-white/30" />
              <div className="absolute bottom-2 right-24 h-12 w-12 rounded-full border-4 border-white/20" />
            </div>
          </div>

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="relative -mt-12 mb-4">
              <Avatar className="h-24 w-24 border-4 border-white dark:border-zinc-950 shadow-lg">
                <AvatarFallback className="bg-[#3c6eff]/15 text-2xl font-bold text-[#3c6eff]">
                  {(form.nama || 'U')
                    .split(' ')
                    .map((w) => w[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Badge
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 shadow-sm"
                variant="secondary"
              >
                <Shield className="mr-1 h-3 w-3" />
                Pegawai
              </Badge>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ===== Edit Form: Data Kepegawaian ===== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Card className="border-border/60 bg-white dark:bg-zinc-950">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Data Kepegawaian</CardTitle>
                <CardDescription className="text-xs">
                  Informasi kepegawaian Anda
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* NIP */}
              <div className="space-y-2">
                <Label htmlFor="profil-nip" className="text-sm font-medium">
                  <span className="flex items-center gap-1">
                    <IdCard className="h-3.5 w-3.5" />
                    NIP <span className="text-red-500">*</span>
                  </span>
                </Label>
                <Input
                  id="profil-nip"
                  placeholder="Masukkan NIP"
                  value={form.nip}
                  onChange={(e) => handleNipChange(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">
                  Jika NIP 18 digit, tanggal lahir akan otomatis terisi.
                </p>
              </div>

              {/* Nama */}
              <div className="space-y-2">
                <Label htmlFor="profil-nama" className="text-sm font-medium">
                  <span className="flex items-center gap-1">
                    <UserCircle className="h-3.5 w-3.5" />
                    Nama Lengkap <span className="text-red-500">*</span>
                  </span>
                </Label>
                <Input
                  id="profil-nama"
                  placeholder="Masukkan nama lengkap"
                  value={form.nama}
                  onChange={(e) => updateField('nama', e.target.value)}
                />
              </div>

              {/* Jenis ASN */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  <span className="flex items-center gap-1">
                    <Award className="h-3.5 w-3.5" />
                    Jenis ASN
                  </span>
                </Label>
                <Select
                  value={form.jenisASN}
                  onValueChange={handleJenisASNChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Jenis ASN" />
                  </SelectTrigger>
                  <SelectContent>
                    {JENIS_ASN_OPTIONS.map((j) => (
                      <SelectItem key={j} value={j}>
                        {j}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Golongan — dinamis sesuai jenisASN */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  <span className="flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5" />
                    Golongan
                  </span>
                </Label>
                <Select
                  value={form.golongan}
                  onValueChange={(v) => updateField('golongan', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Golongan" />
                  </SelectTrigger>
                  <SelectContent>
                    {golonganOpts.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Jabatan */}
              <div className="space-y-2">
                <Label htmlFor="profil-jabatan" className="text-sm font-medium">
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    Jabatan
                  </span>
                </Label>
                <Input
                  id="profil-jabatan"
                  placeholder="Contoh: Guru, Kepala Sekolah, Staff"
                  value={form.jabatan}
                  onChange={(e) => updateField('jabatan', e.target.value)}
                />
              </div>

              {/* Kecamatan */}
              <div className="space-y-2">
                <Label htmlFor="profil-kecamatan" className="text-sm font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    Kecamatan
                  </span>
                </Label>
                <Input
                  id="profil-kecamatan"
                  placeholder="Kecamatan"
                  value={form.kecamatan}
                  onChange={(e) => updateField('kecamatan', e.target.value)}
                />
              </div>

              {/* Unit Kerja */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="profil-unit" className="text-sm font-medium">
                  <span className="flex items-center gap-1">
                    <Building className="h-3.5 w-3.5" />
                    Unit Kerja
                  </span>
                </Label>
                <Input
                  id="profil-unit"
                  placeholder="Nama unit kerja / sekolah"
                  value={form.unitKerja}
                  onChange={(e) => updateField('unitKerja', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== Edit Form: Data Pribadi ===== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-border/60 bg-white dark:bg-zinc-950">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <UserCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Data Pribadi</CardTitle>
                <CardDescription className="text-xs">
                  Perbarui informasi pribadi Anda di bawah ini
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Tanggal Lahir */}
              <div className="space-y-2">
                <Label htmlFor="profil-tanggal-lahir" className="text-sm font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Tanggal Lahir
                  </span>
                </Label>
                <Input
                  id="profil-tanggal-lahir"
                  type="date"
                  value={form.tanggalLahir}
                  onChange={(e) => updateField('tanggalLahir', e.target.value)}
                />
              </div>

              {/* Tempat Lahir */}
              <div className="space-y-2">
                <Label htmlFor="profil-tempat-lahir" className="text-sm font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    Tempat Lahir
                  </span>
                </Label>
                <Input
                  id="profil-tempat-lahir"
                  placeholder="Kota tempat lahir"
                  value={form.tempatLahir}
                  onChange={(e) => updateField('tempatLahir', e.target.value)}
                />
              </div>

              {/* Jenis Kelamin */}
              <div className="space-y-2">
                <Label htmlFor="profil-jenis-kelamin" className="text-sm font-medium">
                  Jenis Kelamin
                </Label>
                <select
                  id="profil-jenis-kelamin"
                  value={form.jenisKelamin}
                  onChange={(e) => updateField('jenisKelamin', e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">-- Pilih --</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              {/* Agama */}
              <div className="space-y-2">
                <Label htmlFor="profil-agama" className="text-sm font-medium">
                  Agama
                </Label>
                <select
                  id="profil-agama"
                  value={form.agama}
                  onChange={(e) => updateField('agama', e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">-- Pilih --</option>
                  <option value="Islam">Islam</option>
                  <option value="Kristen Protestan">Kristen Protestan</option>
                  <option value="Katolik">Katolik</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Buddha">Buddha</option>
                  <option value="Konghucu">Konghucu</option>
                </select>
              </div>

              {/* Pendidikan Terakhir */}
              <div className="space-y-2">
                <Label htmlFor="profil-pendidikan" className="text-sm font-medium">
                  Pendidikan Terakhir
                </Label>
                <select
                  id="profil-pendidikan"
                  value={form.pendidikanTerakhir}
                  onChange={(e) => updateField('pendidikanTerakhir', e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">-- Pilih --</option>
                  <option value="SLTA/Sederajat">SLTA/Sederajat</option>
                  <option value="D1">Diploma I (D1)</option>
                  <option value="D2">Diploma II (D2)</option>
                  <option value="D3">Diploma III (D3)</option>
                  <option value="S1/D4">Sarjana / D4 (S1)</option>
                  <option value="S2">Magister (S2)</option>
                  <option value="S3">Doktor (S3)</option>
                </select>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="profil-email" className="text-sm font-medium">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </span>
                </Label>
                <Input
                  id="profil-email"
                  type="email"
                  placeholder="contoh@email.com"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
              </div>

              {/* No HP */}
              <div className="space-y-2">
                <Label htmlFor="profil-hp" className="text-sm font-medium">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    No. HP
                  </span>
                </Label>
                <Input
                  id="profil-hp"
                  placeholder="08xxxxxxxxxx"
                  value={form.hp}
                  onChange={(e) => updateField('hp', e.target.value)}
                />
              </div>

              {/* Alamat - full width */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="profil-alamat" className="text-sm font-medium">
                  Alamat Lengkap
                </Label>
                <Input
                  id="profil-alamat"
                  placeholder="Masukkan alamat lengkap"
                  value={form.alamat}
                  onChange={(e) => updateField('alamat', e.target.value)}
                />
              </div>
            </div>

            <Separator className="my-5" />

            {/* Save button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#3c6eff] hover:bg-[#3c6eff]/90 text-white gap-2 shadow-lg shadow-[#3c6eff]/20 transition-all hover:shadow-xl hover:shadow-[#3c6eff]/30 active:scale-[0.98]"
              >
                {isSaving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}