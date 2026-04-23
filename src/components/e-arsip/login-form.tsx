'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/app/providers';
import { toast } from 'sonner';
import { IdCard, Lock, Eye, EyeOff, LogIn } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useArsipStore } from '@/lib/store';
import type { Pegawai } from '@/lib/types';

export default function LoginForm() {
  const { login, initializeData, pegawaiList, addPegawai } = useArsipStore();
  const { theme } = useTheme();
  const resolvedTheme = theme;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
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

    // Simulate a brief delay for UX
    await new Promise((r) => setTimeout(r, 400));

    try {
      // --- Admin login ---
      if (username === 'admin' && password === 'admin123') {
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
          // Auto-create new pegawai with the given NIP
          const newPegawai: Pegawai = {
            id: Date.now(),
            nip,
            nama: `Pegawai ${nip}`,
            jenisASN: 'PNS',
            jabatan: '-',
            golongan: '-',
            unitKerja: '-',
            email: '',
            hp: '',
            tanggalLahir: '',
            status: 'Aktif',
          };
          await addPegawai(newPegawai);
          pegawai = newPegawai;
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

  return (
    <div className="login-bg flex min-h-screen items-center justify-center p-4">
      {/* Subtle floating particles / decorative elements */}
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

          {/* Form */}
          <CardContent className="px-8 pb-8 pt-4">
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

            {/* Hint */}
            <div className="mt-6 rounded-lg bg-muted/60 px-4 py-3">
              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold">Demo:</span>{' '}
                <span className="text-foreground/80">
                  Admin: <span className="font-mono font-semibold">admin</span> /{' '}
                  <span className="font-mono font-semibold">admin123</span>
                </span>
                <br />
                <span className="font-semibold">Pegawai:</span>{' '}
                <span className="text-foreground/80">
                  NIP (min. 5 karakter) /{' '}
                  <span className="font-mono font-semibold">123456</span>
                </span>
              </p>
            </div>
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