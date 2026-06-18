import { useState, useCallback } from 'react';
import { Pegawai, Arsip, Log } from '../types';

export function useAdminData() {
  const [allEmployees, setAllEmployees] = useState<Pegawai[]>([]);
  const [allArchives, setAllArchives] = useState<Arsip[]>([]);
  const [rekapData, setRekapData] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<Log[]>([]);
  const [instansiList, setInstansiList] = useState<any[]>([]);
  const [adminSettings, setAdminSettings] = useState<any[]>([]);

  const fetchAdminData = useCallback(async (role: string) => {
    await Promise.all([
      fetch('/api/admin/pegawai').then(r => r.json()).then(setAllEmployees).catch(e => console.error('Admin pegawai fetch failed:', e)),
      fetch('/api/admin/arsip').then(r => r.json()).then(setAllArchives).catch(e => console.error('Admin arsip fetch failed:', e)),
      fetch('/api/admin/rekap').then(r => r.json()).then(setRekapData).catch(e => console.error('Admin rekap fetch failed:', e)),
      fetch('/api/admin/logs').then(r => r.json()).then(setSystemLogs).catch(e => console.error('Admin logs fetch failed:', e)),
    ]);

    if (role === 'admin_instansi' || role === 'super_admin') {
      fetch('/api/admin/instansi').then(r => r.json()).then(setInstansiList).catch(e => console.error('Admin instansi fetch failed:', e));
      fetch('/api/admin/settings').then(r => r.json()).then(setAdminSettings).catch(e => console.error('Admin settings fetch failed:', e));
    }
  }, []);

  return {
    allEmployees, setAllEmployees,
    allArchives, setAllArchives,
    rekapData, setRekapData,
    systemLogs, setSystemLogs,
    instansiList, setInstansiList,
    adminSettings, setAdminSettings,
    fetchAdminData
  };
}
