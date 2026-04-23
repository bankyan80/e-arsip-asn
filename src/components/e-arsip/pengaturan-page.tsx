'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Settings,
  Save,
  Globe,
  Send,
  Database,
  Download,
  Upload,
  Trash2,
  Info,
  RefreshCw,
  Loader2,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { useArsipStore } from '@/lib/store';
import type { AppConfig } from '@/lib/types';

// ===== Main Settings Page =====

export default function PengaturanPage() {
  const {
    config,
    pegawaiList,
    dokumenList,
    updateConfig,
    resetAllData,
    addPegawai,
    addDokumen,
  } = useArsipStore();

  // ===== Config form state =====
  const [appsScriptURL, setAppsScriptURL] = useState((config as Record<string, unknown>).appsScriptURL as string || '');
  const [telegramBotToken, setTelegramBotToken] = useState(config.telegramBotToken);
  const [telegramChatId, setTelegramChatId] = useState(config.telegramChatId);

  // ===== Dialog states =====
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isTestingNotif, setIsTestingNotif] = useState(false);

  // ===== File input ref =====
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ===== Save Apps Script URL =====
  const handleSaveAppsScript = useCallback(() => {
    updateConfig({ appsScriptURL: appsScriptURL.trim() });
    toast.success('URL Google Apps Script berhasil disimpan');
  }, [appsScriptURL, updateConfig]);

  // ===== Save Telegram config =====
  const handleSaveTelegram = useCallback(() => {
    updateConfig({
      telegramBotToken: telegramBotToken.trim(),
      telegramChatId: telegramChatId.trim(),
    });
    toast.success('Konfigurasi Telegram berhasil disimpan');
  }, [telegramBotToken, telegramChatId, updateConfig]);

  // ===== Test Telegram notification =====
  const handleTestNotif = useCallback(async () => {
    if (!telegramBotToken.trim() || !telegramChatId.trim()) {
      toast.error('Bot Token dan Chat ID harus diisi terlebih dahulu');
      return;
    }

    setIsTestingNotif(true);
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${telegramBotToken.trim()}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId.trim(),
            text: '🔔 *Test Notifikasi E-Arsip ASN*\n\nNotifikasi berhasil dikirim! Konfigurasi Telegram Anda sudah benar.\n\n_Dinas Pendidikan_',
            parse_mode: 'Markdown',
          }),
        }
      );

      const result = await response.json();

      if (result.ok) {
        toast.success('Notifikasi test berhasil dikirim ke Telegram');
      } else {
        toast.error(`Gagal mengirim notifikasi: ${result.description || 'Unknown error'}`);
      }
    } catch {
      toast.error('Gagal menghubungi API Telegram. Periksa koneksi internet Anda.');
    } finally {
      setIsTestingNotif(false);
    }
  }, [telegramBotToken, telegramChatId]);

  // ===== Reset all data =====
  const handleResetData = useCallback(() => {
    resetAllData();
    setAppsScriptURL('');
    setTelegramBotToken('');
    setTelegramChatId('');
    setShowResetDialog(false);
    toast.success('Semua data berhasil direset');
  }, [resetAllData]);

  // ===== Export backup =====
  const handleExportBackup = useCallback(() => {
    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      pegawaiList,
      dokumenList,
      config,
    };

    const jsonContent = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `e-arsip-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Backup data berhasil diekspor');
  }, [pegawaiList, dokumenList, config]);

  // ===== Import backup =====
  const handleImportBackup = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string;
          const data = JSON.parse(text);

          // Validate structure
          if (!data.pegawaiList || !Array.isArray(data.pegawaiList)) {
            toast.error('Format file backup tidak valid: pegawaiList tidak ditemukan');
            return;
          }

          // Import pegawai
          let importedPegawai = 0;
          let importedDokumen = 0;

          for (const pg of data.pegawaiList) {
            if (pg.nip && pg.nama) {
              addPegawai({
                id: pg.id || Date.now() + importedPegawai,
                nip: pg.nip,
                nama: pg.nama,
                jenisASN: pg.jenisASN || '',
                jabatan: pg.jabatan || '',
                golongan: pg.golongan || '',
                unitKerja: pg.unitKerja || '',
                email: pg.email || '',
                hp: pg.hp || '',
                tanggalLahir: pg.tanggalLahir || '',
                status: pg.status || 'Aktif',
              });
              importedPegawai++;
            }
          }

          // Import dokumen
          if (data.dokumenList && Array.isArray(data.dokumenList)) {
            for (const doc of data.dokumenList) {
              if (doc.pegawaiId) {
                addDokumen({
                  id: doc.id || Date.now() + importedDokumen,
                  pegawaiId: doc.pegawaiId,
                  pegawaiNama: doc.pegawaiNama || '',
                  nip: doc.nip || '',
                  jenisASN: doc.jenisASN || '',
                  jenisDokumen: doc.jenisDokumen || '',
                  tanggal: doc.tanggal || '',
                  status: doc.status || 'Pending',
                  url: doc.url || '',
                  expiry: doc.expiry || '',
                  fileName: doc.fileName || '',
                  keterangan: doc.keterangan || '',
                  periode: doc.periode,
                  tmtAwal: doc.tmtAwal,
                  tmtAkhir: doc.tmtAkhir,
                });
                importedDokumen++;
              }
            }
          }

          // Import config
          if (data.config) {
            const cfg: Partial<AppConfig> = {};
            if (data.config.appsScriptURL) cfg.appsScriptURL = data.config.appsScriptURL;
            if (data.config.telegramBotToken) cfg.telegramBotToken = data.config.telegramBotToken;
            if (data.config.telegramChatId) cfg.telegramChatId = data.config.telegramChatId;
            if (Object.keys(cfg).length > 0) {
              updateConfig(cfg);
              setAppsScriptURL(cfg.appsScriptURL ?? '');
              setTelegramBotToken(cfg.telegramBotToken ?? '');
              setTelegramChatId(cfg.telegramChatId ?? '');
            }
          }

          toast.success(
            `Backup berhasil diimpor: ${importedPegawai} pegawai, ${importedDokumen} dokumen`
          );
        } catch {
          toast.error('Gagal membaca file backup. Pastikan format file adalah JSON yang valid.');
        }
      };

      reader.onerror = () => {
        toast.error('Gagal membaca file');
      };

      reader.readAsText(file);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [addPegawai, addDokumen, updateConfig]
  );

  // ===== Computed stats =====
  const totalPegawai = pegawaiList.length;
  const totalDokumen = dokumenList.length;

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <section aria-label="Header Pengaturan">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Pengaturan
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Konfigurasi aplikasi E-Arsip ASN
          </p>
        </div>
      </section>

      {/* ===== Google Apps Script Integration ===== */}
      <Card className="border-border/60 bg-white dark:bg-zinc-950">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Google Apps Script API</CardTitle>
              <CardDescription className="text-xs">
                Konfigurasi upload dokumen ke Google Drive
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-2">
            <Label htmlFor="appsScriptUrl" className="text-sm font-medium">
              Web App URL
            </Label>
            <Input
              id="appsScriptUrl"
              type="url"
              placeholder="https://script.google.com/macros/s/xxxxx/exec"
              value={appsScriptURL}
              onChange={(e) => setAppsScriptURL(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Masukkan URL deploy Google Apps Script untuk upload ke Google Drive
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSaveAppsScript}
              className="bg-[#3c6eff] hover:bg-[#3c6eff]/90 text-white gap-2"
            >
              <Save className="h-4 w-4" />
              Simpan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== Telegram Notification ===== */}
      <Card className="border-border/60 bg-white dark:bg-zinc-950">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
              <Send className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Telegram Bot Notification</CardTitle>
              <CardDescription className="text-xs">
                Kirim notifikasi otomatis ke Telegram
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="botToken" className="text-sm font-medium">
                Bot Token
              </Label>
              <Input
                id="botToken"
                type="password"
                placeholder="123456:ABC-DEF..."
                value={telegramBotToken}
                onChange={(e) => setTelegramBotToken(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chatId" className="text-sm font-medium">
                Chat ID
              </Label>
              <Input
                id="chatId"
                type="text"
                placeholder="-1001234567890"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Untuk notifikasi otomatis saat ada dokumen baru
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={handleTestNotif}
              disabled={isTestingNotif}
              className="border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-700 dark:text-sky-400 dark:hover:bg-sky-950/30 gap-2"
            >
              {isTestingNotif ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isTestingNotif ? 'Mengirim...' : 'Test Notifikasi'}
            </Button>
            <Button
              onClick={handleSaveTelegram}
              className="bg-[#3c6eff] hover:bg-[#3c6eff]/90 text-white gap-2"
            >
              <Save className="h-4 w-4" />
              Simpan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== Data Management ===== */}
      <Card className="border-border/60 bg-white dark:bg-zinc-950">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Database className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Manajemen Data</CardTitle>
              <CardDescription className="text-xs">
                Backup, impor, dan reset data aplikasi
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Export Backup */}
            <Button
              variant="outline"
              onClick={handleExportBackup}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30 h-auto flex-col gap-1.5 py-4"
            >
              <Download className="h-5 w-5" />
              <div className="flex flex-col items-center">
                <span className="text-sm font-medium">Export Backup</span>
                <span className="text-[11px] text-muted-foreground">JSON file</span>
              </div>
            </Button>

            {/* Import Backup */}
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-700 dark:text-sky-400 dark:hover:bg-sky-950/30 h-auto flex-col gap-1.5 py-4"
            >
              <Upload className="h-5 w-5" />
              <div className="flex flex-col items-center">
                <span className="text-sm font-medium">Import Backup</span>
                <span className="text-[11px] text-muted-foreground">Pilih file JSON</span>
              </div>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportBackup}
            />

            {/* Reset Data */}
            <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30 h-auto flex-col gap-1.5 py-4"
                >
                  <Trash2 className="h-5 w-5" />
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-medium">Reset Semua Data</span>
                    <span className="text-[11px] text-muted-foreground">Hapus permanen</span>
                  </div>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-red-500" />
                    Reset Semua Data
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <p>
                        Apakah Anda yakin ingin menghapus semua data? Tindakan ini
                        tidak dapat dibatalkan.
                      </p>
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
                        <p className="text-sm font-medium text-red-700 dark:text-red-400">
                          Menghapus semua data pegawai dan dokumen. Tindakan ini tidak
                          dapat dibatalkan.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <RefreshCw className="h-4 w-4" />
                        <span>
                          Data akan dikembalikan ke keadaan awal (kosong)
                        </span>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleResetData}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Ya, Reset Semua Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* ===== App Info ===== */}
      <Card className="border-border/60 bg-white dark:bg-zinc-950">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Informasi Aplikasi</CardTitle>
              <CardDescription className="text-xs">
                Detail versi dan statistik aplikasi
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InfoItem label="Total Pegawai" value={`${totalPegawai.toLocaleString('id-ID')} orang`} />
            <InfoItem label="Total Dokumen" value={`${totalDokumen.toLocaleString('id-ID')} dokumen`} />
            <InfoItem label="Versi Aplikasi" value="1.0.0" />
          </div>

          <Separator className="my-4" />

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              E-Arsip ASN Dinas Pendidikan
            </p>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} — Sistem Arsip Digital
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Info Item Helper =====

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1 rounded-lg border border-border/60 bg-muted/20 p-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}