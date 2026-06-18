import { useState, useCallback } from 'react';
import { Pegawai, KategoriArsip, JenisDokumen, Arsip } from '../types';

export function usePegawaiData() {
  const [profile, setProfile] = useState<Pegawai | null>(null);
  const [kategoriList, setKategoriList] = useState<KategoriArsip[]>([]);
  const [jenisDokumenList, setJenisDokumenList] = useState<JenisDokumen[]>([]);
  const [myArchives, setMyArchives] = useState<Arsip[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]);

  const fetchKategori = useCallback(async () => {
    try {
      const res = await fetch('/api/kategori');
      setKategoriList(await res.json());
    } catch (err) { console.error('Fetch kategori failed:', err); }
  }, []);

  const fetchJenisDokumen = useCallback(async () => {
    try {
      const res = await fetch('/api/jenis-dokumen');
      setJenisDokumenList(await res.json());
    } catch (err) { console.error('Fetch jenis dokumen failed:', err); }
  }, []);

  const fetchMyArchives = useCallback(async () => {
    try {
      const res = await fetch('/api/arsip/me');
      setMyArchives(await res.json());
    } catch (err) { console.error('Fetch my archives failed:', err); }
  }, []);

  const fetchMyChecklist = useCallback(async () => {
    try {
      const res = await fetch('/api/kelengkapan/me');
      setChecklist(await res.json());
    } catch (err) { console.error('Fetch checklist failed:', err); }
  }, []);

  const fetchMyProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/pegawai/me');
      setProfile(await res.json());
    } catch (err) { console.error('Fetch profile failed:', err); }
  }, []);

  const loadAllPegawaiData = useCallback(async () => {
    await Promise.all([
      fetchKategori(),
      fetchJenisDokumen(),
      fetchMyArchives(),
      fetchMyChecklist(),
      fetchMyProfile()
    ]);
  }, [fetchKategori, fetchJenisDokumen, fetchMyArchives, fetchMyChecklist, fetchMyProfile]);

  return {
    profile, setProfile,
    kategoriList, setKategoriList,
    jenisDokumenList, setJenisDokumenList,
    myArchives, setMyArchives,
    checklist, setChecklist,
    loadAllPegawaiData, fetchMyArchives, fetchMyChecklist, fetchMyProfile
  };
}
