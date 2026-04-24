'use client';

import { useEffect, useState } from 'react';
import { useArsipStore, restoreAuth } from '@/lib/store';
import { LoginForm } from '@/components/e-arsip/login-form';
import { AppLayout } from '@/components/e-arsip/app-layout';
import { DashboardPage } from '@/components/e-arsip/dashboard-page';
import { PegawaiPage } from '@/components/e-arsip/pegawai-page';
import { UploadPage } from '@/components/e-arsip/upload-page';
import { ArsipPage } from '@/components/e-arsip/arsip-page';
import { ApprovalPage } from '@/components/e-arsip/approval-page';
import { LaporanPage } from '@/components/e-arsip/laporan-page';
import { BupPage } from '@/components/e-arsip/bup-page';
import { PengaturanPage } from '@/components/e-arsip/pengaturan-page';

export default function Home() {
  const { isLoggedIn, activePage, initializeData } = useArsipStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Restore login dari localStorage (bypass zustand persist)
    restoreAuth();
    setReady(true);
  }, []);

  // Setelah ready, load data dari Supabase jika sudah login
  useEffect(() => {
    if (ready && isLoggedIn) {
      initializeData();
    }
  }, [ready, isLoggedIn, initializeData]);

  // Loading screen
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 border-4 border-[#3c6eff] border-t-transparent rounded-full" />
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginForm />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardPage />;
      case 'pegawai': return <PegawaiPage />;
      case 'dokumen': return <UploadPage />;
      case 'arsip': return <ArsipPage />;
      case 'approval': return <ApprovalPage />;
      case 'laporan': return <LaporanPage />;
      case 'bup': return <BupPage />;
      case 'pengaturan': return <PengaturanPage />;
      default: return <DashboardPage />;
    }
  };

  return <AppLayout>{renderPage()}</AppLayout>;
}