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

import { useArsipStore } from '@/lib/store';
import { getGolonganOptions } from '@/lib/constants';

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

  // Form state
  const [form, setForm] = useState({
    nama: '',
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
        nama: pegawaiData.nama || '',
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

    setIsSaving(true);

    // Simulate brief delay for UX
    await new Promise((r) => setTimeout(r, 300));

    try {
      if (currentUser?.role === 'pegawai' && pegawaiData) {
        // Update pegawai in pegawaiList
        const golonganOpts = getGolonganOptions(pegawaiData.jenisASN);
        const currentGolongan = pegawaiData.golongan;
        const golonganLabel = golonganOpts.find((g) => g.value === currentGolongan)?.label || currentGolongan;

        updatePegawai(pegawaiData.id, {
          nama: form.nama.trim(),
          email: form.email.trim(),
          hp: form.hp.trim(),
          tanggalLahir: form.tanggalLahir,
          tempatLahir: form.tempatLahir.trim(),
          jenisKelamin: form.jenisKelamin,
          agama: form.agama,
          alamat: form.alamat.trim(),
          pendidikanTerakhir: form.pendidikanTerakhir.trim(),
        });

        // Also update currentUser.nama so sidebar reflects the change
        updateCurrentUser({ nama: form.nama.trim() });

        toast.success('Profil berhasil diperbarui');
      } else if (currentUser?.role === 'admin') {
        // Admin can update their display name
        updateCurrentUser({ nama: form.nama.trim() });
        toast.success('Profil berhasil diperbarui');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser) return null;

  const golonganOpts = pegawaiData ? getGolonganOptions(pegawaiData.jenisASN) : [];
  const golonganLabel = pegawaiData
    ? golonganOpts.find((g) => g.value === pegawaiData.golongan)?.label || pegawaiData.golongan
    : '';

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

      {/* ===== Profile Card - Avatar & Info Summary ===== */}
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
                  {(currentUser.nama || 'U')
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
                variant={currentUser.role === 'admin' ? 'default' : 'secondary'}
              >
                <Shield className="mr-1 h-3 w-3" />
                {currentUser.role === 'admin' ? 'Administrator' : 'Pegawai'}
              </Badge>
            </div>

            {/* Summary info (read-only) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {currentUser.role === 'pegawai' && (
                <InfoChip icon={IdCard} label="NIP" value={currentUser.nip} />
              )}
              {pegawaiData?.jenisASN && (
                <InfoChip icon={Briefcase} label="Jenis ASN" value={pegawaiData.jenisASN} />
              )}
              {pegawaiData?.jabatan && (
                <InfoChip icon={Briefcase} label="Jabatan" value={pegawaiData.jabatan} />
              )}
              {pegawaiData?.golongan && (
                <InfoChip icon={Shield} label="Golongan" value={golonganLabel || pegawaiData.golongan} />
              )}
              {pegawaiData?.kecamatan && (
                <InfoChip icon={MapPin} label="Kecamatan" value={pegawaiData.kecamatan} />
              )}
              {pegawaiData?.unitKerja && (
                <InfoChip icon={Building} label="Unit Kerja" value={pegawaiData.unitKerja} />
              )}
              {!pegawaiData && currentUser.role === 'admin' && (
                <InfoChip icon={Shield} label="Role" value="Administrator" />
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ===== Edit Form ===== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-border/60 bg-white dark:bg-zinc-950">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <UserCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
              {/* Nama Lengkap */}
              <div className="space-y-2">
                <Label htmlFor="profil-nama" className="text-sm font-medium">
                  Nama Lengkap <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <UserCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="profil-nama"
                    placeholder="Masukkan nama lengkap"
                    value={form.nama}
                    onChange={(e) => updateField('nama', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="profil-email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="profil-email"
                    type="email"
                    placeholder="contoh@email.com"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="pl-10"
                    disabled={currentUser.role === 'admin'}
                  />
                </div>
                {currentUser.role === 'admin' && (
                  <p className="text-xs text-muted-foreground">
                    Email admin tidak dapat diubah
                  </p>
                )}
              </div>

              {/* No HP */}
              <div className="space-y-2">
                <Label htmlFor="profil-hp" className="text-sm font-medium">
                  No HP
                </Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="profil-hp"
                    placeholder="08xxxxxxxxxx"
                    value={form.hp}
                    onChange={(e) => updateField('hp', e.target.value)}
                    className="pl-10"
                    disabled={currentUser.role === 'admin'}
                  />
                </div>
              </div>

              {/* Tempat Lahir */}
              <div className="space-y-2">
                <Label htmlFor="profil-tempat-lahir" className="text-sm font-medium">
                  Tempat Lahir
                </Label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="profil-tempat-lahir"
                    placeholder="Kota tempat lahir"
                    value={form.tempatLahir}
                    onChange={(e) => updateField('tempatLahir', e.target.value)}
                    className="pl-10"
                    disabled={currentUser.role === 'admin'}
                  />
                </div>
              </div>

              {/* Tanggal Lahir */}
              <div className="space-y-2">
                <Label htmlFor="profil-tanggal-lahir" className="text-sm font-medium">
                  Tanggal Lahir
                </Label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="profil-tanggal-lahir"
                    type="date"
                    value={form.tanggalLahir}
                    onChange={(e) => updateField('tanggalLahir', e.target.value)}
                    className="pl-10"
                    disabled={currentUser.role === 'admin'}
                  />
                </div>
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
                  disabled={currentUser.role === 'admin'}
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
                  disabled={currentUser.role === 'admin'}
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
                  disabled={currentUser.role === 'admin'}
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
                  disabled={currentUser.role === 'admin'}
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

// ===== Info Chip Helper =====

function InfoChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold text-foreground">{value || '-'}</p>
      </div>
    </div>
  );
}