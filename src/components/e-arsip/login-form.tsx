'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  Archive,
  IdCard,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Building,
  MapPin,
  Briefcase,
  Award,
  Users,
} from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useArsipStore } from '@/lib/store';
import { fetchPegawaiByNIP } from '@/lib/db';
import type { Pegawai } from '@/lib/types';

type Mode = 'login' | 'register';

const JENIS_ASN_OPTIONS = [
  { value: 'PNS', label: 'PNS' },
  { value: 'PPPK_PENUH', label: 'PPPK Penuh' },
  { value: 'PPPK_PARUH', label: 'PPPK Paruh Waktu' },
  { value: 'OTHER', label: 'Lainnya' },
];

const GOLONGAN_PNS = [
  'I/a', 'I/b', 'I/c', 'I/d',
  'II/a', 'II/b', 'II/c', 'II/d',
  'III/a', 'III/b', 'III/c', 'III/d',
  'IV/a', 'IV/b', 'IV/c', 'IV/d', 'IV/e', 'IV/j',
];

const GOLONGAN_PPPK = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17'];

export default function LoginForm() {
  const { login, fetchData, addPegawai } = useArsipStore();
  const { resolvedTheme } = useTheme();

  // Mode: login atau register
  const [mode, setMode] = useState<Mode>('login');

  // Login states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Register states
  const [regNip, setRegNip] = useState('');
  const [regNama, setRegNama] = useState('');
  const [regJenisASN, setRegJenisASN] = useState('PNS');
  const [regJabatan, setRegJabatan] = useState('');
  const [regGolongan, setRegGolongan] = useState('');
  const [regKecamatan, setRegKecamatan] = useState('');
  const [regUnitKerja, setRegUnitKerja] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regHp, setRegHp] = useState('');
  const [regTanggalLahir, setRegTanggalLahir] = useState('');
  const [regError, setRegError] = useState('');
  const [regShake, setRegShake] = useState(false);
  const [isRegLoading, setIsRegLoading] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const triggerRegShake = () => {
    setRegShake(true);
    setTimeout(() => setRegShake(false), 600);
  };

  // Switch to register mode with pre-filled NIP
  const switchToRegister = (nip?: string) => {
    if (nip) setRegNip(nip);
    setError('');
    setMode('register');
  };

  // Switch back to login mode
  const switchToLogin = () => {
    setRegError('');
    setMode('login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('NIP/Username dan Password harus diisi.');
      triggerShake();
      return;
    }

    setIsLoading(true);

    try {
      // --- Admin login ---
      if (username === 'admin' && password === 'admin456') {
        await fetchData();
        login({ role: 'admin', nip: 'admin', nama: 'Administrator' });
        toast.success('Selamat datang, Administrator!', {
          description: 'Anda masuk sebagai Admin.',
        });
        return;
      }

      // --- Pegawai login ---
      if (password === '123456' && username.trim().length >= 5) {
        const nip = username.trim();

        // Cari pegawai di Supabase berdasarkan NIP
        let pegawai = await fetchPegawaiByNIP(nip);

        if (!pegawai) {
          // NIP tidak terdaftar → tampilkan error + tombol Daftar
          setError('NIP belum terdaftar di sistem. Silakan klik tombol Daftar untuk mendaftar.');
          triggerShake();
          toast.error('NIP tidak terdaftar', {
            description: 'Silakan daftarkan NIP Anda terlebih dahulu.',
          });
          return;
        }

        // Load semua data dari Supabase
        await fetchData();
        login({
          role: 'pegawai',
          nip: pegawai.nip,
          nama: pegawai.nama,
          pegawaiId: pegawai.id,
        });
        toast.success(`Selamat datang, ${pegawai.nama}!`, {
          description: `NIP: ${pegawai.nip}`,
        });
        return;
      }

      // --- Login failed ---
      setError('NIP/Username atau Password salah. Silakan coba lagi.');
      triggerShake();
      toast.error('Login gagal', {
        description: 'Periksa kembali kredensial Anda.',
      });
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Terjadi kesalahan saat menghubungi server. Coba lagi.');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    // Validasi
    if (!regNip.trim() || regNip.trim().length < 5) {
      setRegError('NIP harus diisi minimal 5 karakter.');
      triggerRegShake();
      return;
    }
    if (!regNama.trim()) {
      setRegError('Nama harus diisi.');
      triggerRegShake();
      return;
    }

    setIsRegLoading(true);

    try {
      // Cek apakah NIP sudah terdaftar
      const existing = await fetchPegawaiByNIP(regNip.trim());
      if (existing) {
        setRegError('NIP sudah terdaftar di sistem. Silakan langsung login.');
        triggerRegShake();
        toast.error('NIP sudah terdaftar', {
          description: 'Gunakan NIP ini untuk login.',
          action: {
            label: 'Login',
            onClick: () => switchToLogin(),
          },
        });
        return;
      }

      // Buat pegawai baru
      const newPegawai: Pegawai = {
        id: Date.now(),
        nip: regNip.trim(),
        nama: regNama.trim(),
        jenisASN: regJenisASN,
        jabatan: regJabatan.trim() || '-',
        golongan: regGolongan || '-',
        kecamatan: regKecamatan.trim() || '-',
        unitKerja: regUnitKerja.trim() || '-',
        email: regEmail.trim(),
        hp: regHp.trim(),
        tanggalLahir: regTanggalLahir,
        status: 'Aktif',
      };

      addPegawai(newPegawai);

      // Load semua data dari Supabase
      await fetchData();

      // Auto-login setelah daftar
      login({
        role: 'pegawai',
        nip: newPegawai.nip,
        nama: newPegawai.nama,
        pegawaiId: newPegawai.id,
      });

      toast.success('Pendaftaran berhasil!', {
        description: `Selamat datang, ${newPegawai.nama}. Silakan lengkapi data profil Anda.`,
      });
    } catch (err: any) {
      console.error('Register error:', err);
      setRegError('Terjadi kesalahan saat mendaftar. Coba lagi.');
      triggerRegShake();
    } finally {
      setIsRegLoading(false);
    }
  };

  // Auto-extract tanggal lahir dari NIP pada form register
  const handleRegNipChange = (value: string) => {
    setRegNip(value);
    // Jika NIP 18 digit, coba extract tanggal lahir (8 digit pertama: yyyymmdd)
    if (value.trim().length === 18) {
      const dateStr = value.trim().substring(0, 8);
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const date = `${year}-${month}-${day}`;
      // Validasi format tanggal
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date))) {
        setRegTanggalLahir(date);
      }
    }
  };

  return (
    <div className="login-bg flex min-h-screen items-center justify-center p-4">
      {/* Subtle floating particles / decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      </div>

      <motion.div
        animate={shake || regShake ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card
          className="border-0 shadow-2xl"
          style={{
            background:
              resolvedTheme === 'dark' ? 'rgba(26, 28, 36, 0.95)' : '#ffffff',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Header */}
          <CardHeader className="flex flex-col items-center gap-4 pb-2 pt-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-lg overflow-hidden border-2 border-gray-100">
              <img
                src="/logo.jpg"
                alt="Logo Dinas Pendidikan"
                className="h-full w-full object-contain p-1"
                onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
            <div className="text-center">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                E-Arsip ASN
              </h1>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Dinas Pendidikan Kabupaten
              </p>
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-8 pt-4">
            <AnimatePresence mode="wait">
              {/* ============ LOGIN FORM ============ */}
              {mode === 'login' && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                >
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* NIP / Username */}
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-sm font-semibold text-foreground">
                        NIP / Username
                      </Label>
                      <div className="relative">
                        <IdCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="username"
                          type="text"
                          placeholder="Masukkan NIP atau username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="h-11 pl-10 transition-colors focus-visible:ring-[#3c6eff]"
                          autoComplete="username"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Masukkan password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-11 pl-10 pr-10 transition-colors focus-visible:ring-[#3c6eff]"
                          autoComplete="current-password"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                          tabIndex={-1}
                          aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Error message */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-2"
                      >
                        <p className="rounded-md bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400">
                          {error}
                        </p>
                        {/* Tombol Daftar Sekarang jika NIP tidak terdaftar */}
                        {error.includes('belum terdaftar') && username.trim().length >= 5 && (
                          <Button
                            type="button"
                            onClick={() => switchToRegister(username.trim())}
                            className="w-full gap-2 bg-green-600 text-white shadow-lg shadow-green-600/25 transition-all hover:bg-green-700 hover:shadow-xl active:scale-[0.98]"
                          >
                            <UserPlus className="h-4 w-4" />
                            Daftar Sekarang
                          </Button>
                        )}
                      </motion.div>
                    )}

                    {/* Submit */}
                    <Button
                      type="submit"
                      className="h-11 w-full gap-2 bg-[#3c6eff] text-base font-semibold text-white shadow-lg shadow-[#3c6eff]/25 transition-all hover:bg-[#2b54f5] hover:shadow-xl hover:shadow-[#3c6eff]/30 active:scale-[0.98]"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <svg
                            className="h-4 w-4 animate-spin"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          Memproses...
                        </span>
                      ) : (
                        <>
                          <LogIn className="h-4 w-4" />
                          Masuk
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Info login pegawai */}
                  <div className="mt-6 rounded-lg bg-muted/60 px-4 py-3">
                    <p className="text-center text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold">Pegawai:</span>{' '}
                      <span className="text-foreground/80">
                        Masukan NIP (tanpa spasi) dan Masukan kata sandi &quot;123456&quot;
                      </span>
                    </p>
                  </div>

                  {/* Link Daftar */}
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Belum punya akun?{' '}
                      <button
                        type="button"
                        onClick={() => switchToRegister()}
                        className="font-semibold text-[#3c6eff] transition-colors hover:text-[#2b54f5] hover:underline"
                      >
                        Daftar di sini
                      </button>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ============ REGISTER FORM ============ */}
              {mode === 'register' && (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <form onSubmit={handleRegister} className="space-y-4">
                    {/* Tombol kembali */}
                    <button
                      type="button"
                      onClick={switchToLogin}
                      className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Kembali ke Login
                    </button>

                    {/* NIP */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-nip" className="text-xs font-semibold text-foreground">
                        <span className="flex items-center gap-1">
                          <IdCard className="h-3.5 w-3.5" />
                          NIP
                        </span>
                      </Label>
                      <Input
                        id="reg-nip"
                        type="text"
                        placeholder="Masukkan NIP (min. 5 karakter)"
                        value={regNip}
                        onChange={(e) => handleRegNipChange(e.target.value)}
                        className="h-10 transition-colors focus-visible:ring-[#3c6eff]"
                        autoComplete="off"
                        disabled={isRegLoading}
                      />
                    </div>

                    {/* Nama */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-nama" className="text-xs font-semibold text-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          Nama Lengkap
                        </span>
                      </Label>
                      <Input
                        id="reg-nama"
                        type="text"
                        placeholder="Masukkan nama lengkap"
                        value={regNama}
                        onChange={(e) => setRegNama(e.target.value)}
                        className="h-10 transition-colors focus-visible:ring-[#3c6eff]"
                        autoComplete="name"
                        disabled={isRegLoading}
                      />
                    </div>

                    {/* Jenis ASN & Golongan */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">
                          <span className="flex items-center gap-1">
                            <Award className="h-3.5 w-3.5" />
                            Jenis ASN
                          </span>
                        </Label>
                        <Select
                          value={regJenisASN}
                          onValueChange={(value) => {
                            setRegJenisASN(value);
                            // Reset golongan saat jenis ASN berubah
                            setRegGolongan('');
                          }}
                          disabled={isRegLoading}
                        >
                          <SelectTrigger className="h-10 focus:ring-[#3c6eff]">
                            <SelectValue placeholder="Pilih Jenis ASN" />
                          </SelectTrigger>
                          <SelectContent>
                            {JENIS_ASN_OPTIONS.map((j) => (
                              <SelectItem key={j.value} value={j.value}>
                                {j.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">
                          <span className="flex items-center gap-1">
                            <Award className="h-3.5 w-3.5" />
                            Golongan
                          </span>
                        </Label>
                        <Select
                          value={regGolongan}
                          onValueChange={setRegGolongan}
                          disabled={isRegLoading || !regJenisASN}
                        >
                          <SelectTrigger className="h-10 focus:ring-[#3c6eff]">
                            <SelectValue placeholder={
                              !regJenisASN ? 'Pilih ASN dulu' : 
                              regJenisASN === 'PNS' ? 'Pilih Golongan' : 'Pilih Level'
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {(regJenisASN === 'PNS' || regJenisASN === 'OTHER'
                              ? GOLONGAN_PNS
                              : GOLONGAN_PPPK
                            ).map((g) => (
                              <SelectItem key={g} value={g}>
                                {regJenisASN === 'PNS' || regJenisASN === 'OTHER' ? g : `Level ${g}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Jabatan */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-jabatan" className="text-xs font-semibold text-foreground">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5" />
                          Jabatan
                        </span>
                      </Label>
                      <Input
                        id="reg-jabatan"
                        type="text"
                        placeholder="Contoh: Guru, Kepala Sekolah, Staff"
                        value={regJabatan}
                        onChange={(e) => setRegJabatan(e.target.value)}
                        className="h-10 transition-colors focus-visible:ring-[#3c6eff]"
                        autoComplete="organization-title"
                        disabled={isRegLoading}
                      />
                    </div>

                    {/* Kecamatan & Unit Kerja */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="reg-kecamatan" className="text-xs font-semibold text-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            Kecamatan
                          </span>
                        </Label>
                        <Input
                          id="reg-kecamatan"
                          type="text"
                          placeholder="Kecamatan"
                          value={regKecamatan}
                          onChange={(e) => setRegKecamatan(e.target.value)}
                          className="h-10 transition-colors focus-visible:ring-[#3c6eff]"
                          autoComplete="address-level2"
                          disabled={isRegLoading}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="reg-unit" className="text-xs font-semibold text-foreground">
                          <span className="flex items-center gap-1">
                            <Building className="h-3.5 w-3.5" />
                            Unit Kerja
                          </span>
                        </Label>
                        <Input
                          id="reg-unit"
                          type="text"
                          placeholder="Unit Kerja"
                          value={regUnitKerja}
                          onChange={(e) => setRegUnitKerja(e.target.value)}
                          className="h-10 transition-colors focus-visible:ring-[#3c6eff]"
                          autoComplete="organization"
                          disabled={isRegLoading}
                        />
                      </div>
                    </div>

                    {/* Tanggal Lahir */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-tgl" className="text-xs font-semibold text-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Tanggal Lahir
                        </span>
                      </Label>
                      <Input
                        id="reg-tgl"
                        type="date"
                        value={regTanggalLahir}
                        onChange={(e) => setRegTanggalLahir(e.target.value)}
                        className="h-10 transition-colors focus-visible:ring-[#3c6eff]"
                        disabled={isRegLoading}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Otomatis terisi dari NIP (jika NIP 18 digit). Bisa diubah manual.
                      </p>
                    </div>

                    {/* Email & HP */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="reg-email" className="text-xs font-semibold text-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            Email
                          </span>
                        </Label>
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="email@contoh.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="h-10 transition-colors focus-visible:ring-[#3c6eff]"
                          autoComplete="email"
                          disabled={isRegLoading}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="reg-hp" className="text-xs font-semibold text-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            No. HP
                          </span>
                        </Label>
                        <Input
                          id="reg-hp"
                          type="tel"
                          placeholder="08xxxxxxxxxx"
                          value={regHp}
                          onChange={(e) => setRegHp(e.target.value)}
                          className="h-10 transition-colors focus-visible:ring-[#3c6eff]"
                          autoComplete="tel"
                          disabled={isRegLoading}
                        />
                      </div>
                    </div>

                    {/* Error message register */}
                    {regError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-md bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400"
                      >
                        {regError}
                      </motion.p>
                    )}

                    {/* Submit Register */}
                    <Button
                      type="submit"
                      className="h-11 w-full gap-2 bg-green-600 text-base font-semibold text-white shadow-lg shadow-green-600/25 transition-all hover:bg-green-700 hover:shadow-xl hover:shadow-green-600/30 active:scale-[0.98]"
                      disabled={isRegLoading}
                    >
                      {isRegLoading ? (
                        <span className="flex items-center gap-2">
                          <svg
                            className="h-4 w-4 animate-spin"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          Mendaftar...
                        </span>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Daftar
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Info password */}
                  <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 dark:bg-green-950/30">
                    <p className="text-center text-xs leading-relaxed text-green-700 dark:text-green-400">
                      Setelah mendaftar, Anda bisa langsung login dengan password:{' '}
                      <span className="font-bold">123456</span>
                    </p>
                  </div>

                  {/* Link Login */}
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Sudah punya akun?{' '}
                      <button
                        type="button"
                        onClick={switchToLogin}
                        className="font-semibold text-[#3c6eff] transition-colors hover:text-[#2b54f5] hover:underline"
                      >
                        Masuk di sini
                      </button>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Footer text */}
        <p className="mt-6 text-center text-xs text-white/50">
          &copy; {new Date().getFullYear()} E-Arsip ASN &mdash; Dinas Pendidikan Kabupaten
        </p>
      </motion.div>
    </div>
  );
}