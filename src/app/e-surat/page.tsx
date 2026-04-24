'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ESuratPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/e-surat/masuk'); }, [router]);
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin h-6 w-6 border-2 border-[#3c6eff] border-t-transparent rounded-full" />
    </div>
  );
}