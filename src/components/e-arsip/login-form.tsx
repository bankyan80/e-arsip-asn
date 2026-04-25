'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/app/providers';
import { toast } from 'sonner';
import { IdCard, Lock, Eye, EyeOff, LogIn, UserPlus, ArrowLeft } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useArsipStore } from '@/lib/store';
import { ALL_JENIS_ASN, KECAMATAN_OPTIONS, UNIT_KERJA_OPTIONS } from '@/lib/constants';
import { getGolonganOptions } from '@/lib/constants';
import type { Pegawai } from '@/lib/types';

export default function LoginForm() {
  const { login, initializeData, pegawaiList, addPegawai } = useArsipStore();
  const { theme } = useTheme();
  const resolvedTheme = theme;

  // View toggle: 'login' | 'register'
  const [view, setView] = useState<'login' | 'register'>('login');

  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Register state
  const [regForm, setRegForm] = useState({
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
  });
  const [regPassword, setRegPassword] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  // Golongan options dynamic
  const golonganOpts = getGolonganOptions(regForm.jenisASN);

  // ===== LOGIN =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('NIP/Username dan Password harus diisi.');
      triggerShake();
      return;
    }

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 400));

    try {
      // --- Admin login ---
      if (username === 'admin' && password === 'admin456') {
        await initializeData();
        login({ role: 'admin', nip: 'admin', nama: 'Administrator' });
        toast.success('Selamat datang, Administrator!', {
          description: 'Anda masuk sebagai Admin.',
        });
        return;
      }

      // --- Pegawai login ---
      if (password === '123456' && username.trim().length >= 5) {
        const nip = username.trim();

        let pegawai = pegawaiList.find((p) => p.nip === nip);

        if (!pegawai) {
          setError('NIP tidak ditemukan. Silakan daftar terlebih dahulu.');
          triggerShake();
          toast.error('NIP tidak terdaftar', {
            description: 'Silakan klik "Daftar" untuk mendaftar.',
          });
          return;
        }

        await initializeData();
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
    } finally {
      setIsLoading(false);
    }
  };

  // ===== REGISTER =====
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    // Validasi
    if (!regForm.nip.trim() || regForm.nip.trim().length < 5) {
      setRegError('NIP harus diisi (min. 5 karakter).');
      return;
    }
    if (!regForm.nama.trim()) {
      setRegError('Nama lengkap harus diisi.');
      return;
    }
    if (!regForm.jenisASN) {
      setRegError('Jenis ASN harus dipilih.');
      return;
    }
    if (!regPassword.trim() || regPassword.length < 6) {
      setRegError('Password harus diisi (min. 6 karakter).');
      return;
    }

    // Cek NIP sudah terdaftar
    const existing = pegawaiList.find((p) => p.nip === regForm.nip.trim());
    if (existing) {
      setRegError('NIP sudah terdaftar. Silakan login.');
      toast.error('NIP sudah terdaftar', {
        description: 'Gunakan menu Masuk untuk login.',
      });
      return;
    }

    setRegLoading(true);
    await new Promise((r) => setTimeout(r, 400));

    try {
      const newPegawai: Pegawai = {
        id: Date.now(),
        nip: regForm.nip.trim(),
        nama: regForm.nama.trim(),
        jenisASN: regForm.jenisASN,
        jabatan: regForm.jabatan,
        golongan: regForm.golongan,
        kecamatan: regForm.kecamatan,
        unitKerja: regForm.unitKerja,
        email: regForm.email,
        hp: regForm.hp,
        tanggalLahir: regForm.tanggalLahir,
        status: 'Aktif',
      };

      await addPegawai(newPegawai);
      await initializeData();

      login({
        role: 'pegawai',
        nip: newPegawai.nip,
        nama: newPegawai.nama,
        pegawaiId: newPegawai.id,
      });

      toast.success('Pendaftaran berhasil!', {
        description: `Selamat datang, ${newPegawai.nama}!`,
      });
    } catch (err) {
      console.error('Register error:', err);
      setRegError('Gagal mendaftar. Coba lagi.');
      toast.error('Pendaftaran gagal', {
        description: 'Terjadi kesalahan. Silakan coba lagi.',
      });
    } finally {
      setRegLoading(false);
    }
  };

  // ===== RENDER =====
  return (
    <div className="login-bg flex min-h-screen items-center justify-center p-4">
      {/* Subtle floating particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      </div>

      <motion.div
        animate={shake ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : { x: 0 }}
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
            <img
              src="https://i.pinimg.com/736x/76/39/2d/76392d91c9c22d8ec5563b1126cd55b8.jpg"
              alt="Logo E-Arsip ASN"
              className="h-16 w-16 rounded-2xl object-cover shadow-lg"
            />
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

            {/* ========== LOGIN VIEW ========== */}
            {view === 'login' && (
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
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-md bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400"
                  >
                    {error}
                  </motion.p>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  className="h-11 w-full gap-2 bg-[#3c6eff] text-base font-semibold text-white shadow-lg shadow-[#3c6eff]/25 transition-all hover:bg-[#2b54f5] hover:shadow-xl hover:shadow-[#3c6eff]/30 active:scale-[0.98]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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

                {/* Daftar link */}
                <button
                  type="button"
                  onClick={() => {
                    setView('register');
                    setError('');
                  }}
                  className="w-full text-center text-sm font-medium text-[#3c6eff] hover:text-[#2b54f5] transition-colors py-1"
                >
                  Belum punya akun? <span className="font-semibold underline underline-offset-2">Daftar di sini</span>
                </button>

                {/* Info */}
                <div className="rounded-lg bg-muted/60 px-4 py-3">
                  <p className="text-center text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold">Pegawai:</span>{' '}
                    <span className="text-foreground/80">
                      Masukkan NIP (min. 5 karakter) dan password Anda
                    </span>
                  </p>
                </div>
              </form>
            )}

            {/* ========== REGISTER VIEW ========== */}
            {view === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                {/* NIP */}
                <div className="space-y-2">
                  <Label htmlFor="reg-nip" className="text-sm font-semibold text-foreground">
                    NIP <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <IdCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reg-nip"
                      type="text"
                      placeholder="Masukkan NIP Anda"
                      value={regForm.nip}
                      onChange={(e) => setRegForm((f) => ({ ...f, nip: e.target.value }))}
                      className="h-10 pl-10 transition-colors focus-visible:ring-[#3c6eff]"
                      disabled={regLoading}
                    />
                  </div>
                </div>

                {/* Nama */}
                <div className="space-y-2">
                  <Label htmlFor="reg-nama" className="text-sm font-semibold text-foreground">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="reg-nama"
                    type="text"
                    placeholder="Nama lengkap sesuai KTP"
                    value={regForm.nama}
                    onChange={(e) => setRegForm((f) => ({ ...f, nama: e.target.value }))}
                    className="h-10 transition-colors focus-visible:ring-[#3c6eff]"
                    disabled={regLoading}
                  />
                </div>

                {/* Jenis ASN + Golongan */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">
                      Jenis ASN <span className="text-red-500">*</span>
                    </Label>
                    <select
                      value={regForm.jenisASN}
                      onChange={(e) => setRegForm((f) => ({ ...f, jenisASN: e.target.value, golongan: '' }))}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-[#3c6eff] focus-visible:ring-offset-2 outline-none"
                      disabled={regLoading}
                    >
                      <option value="">Pilih</option>
                      {ALL_JENIS_ASN.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">Golongan</Label>
                    <select
                      value={regForm.golongan}
                      onChange={(e) => setRegForm((f) => ({ ...f, golongan: e.target.value }))}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-[#3c6eff] focus-visible:ring-offset-2 outline-none"
                      disabled={regLoading}
                    >
                      <option value="">Pilih</option>
                      {golonganOpts.map((g) => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Jabatan + Unit Kerja */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">Jabatan</Label>
                    <Input
                      type="text"
                      placeholder="Jabatan saat ini"
                      value={regForm.jabatan}
                      onChange={(e) => setRegForm((f) => ({ ...f, jabatan: e.target.value }))}
                      className="h-10 transition-colors focus-visible:ring-[#3c6eff]"
                      disabled={regLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">Unit Kerja</Label>
                    <select
                      value={regForm.unitKerja}
                      onChange={(e) => setRegForm((f) => ({ ...f, unitKerja: e.target.value }))}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-[#3c6eff] focus-visible:ring-offset-2 outline-none"
                      disabled={regLoading}
                    >
                      <option value="">Pilih</option>
                      {UNIT_KERJA_OPTIONS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Kecamatan */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Kecamatan</Label>
                  <select
                    value={regForm.kecamatan}
                    onChange={(e) => setRegForm((f) => ({ ...f, kecamatan: e.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-[#3c6eff] focus-visible:ring-offset-2 outline-none"
                    disabled={regLoading}
                  >
                    <option value="">Pilih Kecamatan</option>
                    {KECAMATAN_OPTIONS.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>

                {/* Email + HP */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">Email</Label>
                    <Input
                      type="email"
                      placeholder="email@contoh.com"
                      value={regForm.email}
                      onChange={(e) => setRegForm((f) => ({ ...f, email: e.target.value }))}
                      className="h-10 transition-colors focus-visible:ring-[#3c6eff]"
                      disabled={regLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">No. HP</Label>
                    <Input
                      type="text"
                      placeholder="081234567890"
                      value={regForm.hp}
                      onChange={(e) => setRegForm((f) => ({ ...f, hp: e.target.value }))}
                      className="h-10 transition-colors focus-visible:ring-[#3c6eff]"
                      disabled={regLoading}
                    />
                  </div>
                </div>

                {/* Tanggal Lahir */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Tanggal Lahir</Label>
                  <Input
                    type="date"
                    value={regForm.tanggalLahir}
                    onChange={(e) => setRegForm((f) => ({ ...f, tanggalLahir: e.target.value }))}
                    className="h-10 transition-colors focus-visible:ring-[#3c6eff]"
                    disabled={regLoading}
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-sm font-semibold text-foreground">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reg-password"
                      type={regShowPassword ? 'text' : 'password'}
                      placeholder="Buat password (min. 6 karakter)"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="h-10 pl-10 pr-10 transition-colors focus-visible:ring-[#3c6eff]"
                      disabled={regLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setRegShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      tabIndex={-1}
                    >
                      {regShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
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

                {/* Buttons */}
                <div className="flex gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 flex-1 gap-2 font-medium"
                    onClick={() => {
                      setView('login');
                      setRegError('');
                    }}
                    disabled={regLoading}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Kembali
                  </Button>
                  <Button
                    type="submit"
                    className="h-11 flex-1 gap-2 bg-[#3c6eff] font-semibold text-white shadow-lg shadow-[#3c6eff]/25 transition-all hover:bg-[#2b54f5] hover:shadow-xl hover:shadow-[#3c6eff]/30 active:scale-[0.98]"
                    disabled={regLoading}
                  >
                    {regLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Sudah punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => { setView('login'); setRegError(''); }}
                    className="font-semibold text-[#3c6eff] hover:text-[#2b54f5] underline underline-offset-2"
                  >
                    Masuk di sini
                  </button>
                </p>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-white/50">
          &copy; {new Date().getFullYear()} E-Arsip ASN &mdash; Dinas Pendidikan Kabupaten
        </p>
      </motion.div>
    </div>
  );
}