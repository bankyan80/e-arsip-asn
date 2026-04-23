'use client';

import { useEffect } from 'react';
import { useArsipStore } from '@/lib/store';
import LoginForm from '@/components/e-arsip/login-form';
import AppLayout from '@/components/e-arsip/app-layout';
import DashboardPage from '@/components/e-arsip/dashboard-page';
import PegawaiPage from '@/components/e-arsip/pegawai-page';
import UploadPage from '@/components/e-arsip/upload-page';
import ArsipPage from '@/components/e-arsip/arsip-page';
import ApprovalPage from '@/components/e-arsip/approval-page';
import LaporanPage from '@/components/e-arsip/laporan-page';
import BUPPage from '@/components/e-arsip/bup-page';

export default function Home() {
  const { currentUser, activePage, initializeData } = useArsipStore();

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  if (!currentUser) {
    return <LoginForm />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'pegawai':
        return <PegawaiPage />;
      case 'dokumen':
        return <UploadPage />;
      case 'arsip':
        return <ArsipPage />;
      case 'approval':
        return <ApprovalPage />;
      case 'laporan':
        return <LaporanPage />;
      case 'bup':
        return <BUPPage />;
      default:
        return <DashboardPage />;
    }
  };

  return <AppLayout>{renderPage()}</AppLayout>;
}