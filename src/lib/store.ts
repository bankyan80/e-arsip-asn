import { create } from 'zustand';
import type { Pegawai, Dokumen, Notifikasi, AppConfig, CurrentUser, PageType } from './types';
import { fetchPegawai, addPegawaiToDB, updatePegawaiInDB, deletePegawaiFromDB, fetchDokumen, uploadFileAndGetUrl, addDokumenToDB, updateDokumenStatusInDB, updateDokumenKeteranganInDB, deleteDokumenFromDB, fetchNotifikasi, addNotifikasiToDB, markNotifikasiReadInDB, markAllNotifikasiReadInDB, clearNotifikasiInDB } from './db';

const AUTH_KEY = 'e-arsip-auth';

function saveAuthToStorage(user) {
  if (typeof window === 'undefined') return;
  try { if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user)); else localStorage.removeItem(AUTH_KEY); } catch {}
}

function loadAuthFromStorage() {
  if (typeof window === 'undefined') return null;
  try { const r = localStorage.getItem(AUTH_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}

export const useArsipStore = create()((set, get) => ({
  currentUser: null,
  isLoggedIn: false,
  login: (user) => {
    try { localStorage.setItem('e-arsip-auth', JSON.stringify(user)); } catch {}
    set({ currentUser: user, isLoggedIn: true });
  },
  logout: () => {
    try { localStorage.removeItem('e-arsip-auth'); } catch {}
    set({ currentUser: null, isLoggedIn: false });
  },
  pegawaiList: [],
  dokumenList: [],
  notifikasiList: [],
  config: { appsScriptURL: '', telegramBotToken: '', telegramChatId: '' },
  isLoading: false,
  addPegawai: async (p) => { const r = await addPegawaiToDB(p); if (r) set((s) => ({ pegawaiList: [...s.pegawaiList, r] })); },
  updatePegawai: async (id, data) => { const ok = await updatePegawaiInDB(id, data); if (ok) set((s) => ({ pegawaiList: s.pegawaiList.map((p) => (p.id === id ? { ...p, ...data } : p)) })); },
  deletePegawai: async (id) => { const ok = await deletePegawaiFromDB(id); if (ok) set((s) => ({ pegawaiList: s.pegawaiList.filter((p) => p.id !== id), dokumenList: s.dokumenList.filter((d) => d.pegawaiId !== id) })); },
  addDokumen: async (d) => { const r = await addDokumenToDB(d); if (r) set((s) => ({ dokumenList: [...s.dokumenList, r] })); },
  addDokumenWithFile: async (file, d) => { const u = await uploadFileAndGetUrl(file, d.pegawaiId); if (!u) throw new Error('Gagal upload'); const r = await addDokumenToDB({ ...d, url: u.url, filePath: u.filePath, fileSize: file.size }); if (r) set((s) => ({ dokumenList: [...s.dokumenList, r] })); else throw new Error('Gagal simpan'); },
  updateDokumenStatus: async (id, status) => { const ok = await updateDokumenStatusInDB(id, status); if (ok) set((s) => ({ dokumenList: s.dokumenList.map((d) => (d.id === id ? { ...d, status } : d)) })); },
  updateDokumenKeterangan: async (id, keterangan) => { const ok = await updateDokumenKeteranganInDB(id, keterangan); if (ok) set((s) => ({ dokumenList: s.dokumenList.map((d) => (d.id === id ? { ...d, keterangan } : d)) })); },
  deleteDokumen: async (id) => { const doc = get().dokumenList.find((d) => d.id === id); const ok = await deleteDokumenFromDB(id, doc?.filePath); if (ok) set((s) => ({ dokumenList: s.dokumenList.filter((d) => d.id !== id) })); },
  addNotifikasi: async (message, type) => { const r = await addNotifikasiToDB(message, type); if (r) set((s) => ({ notifikasiList: [r, ...s.notifikasiList].slice(0, 50) })); },
  markNotifRead: async (id) => { const ok = await markNotifikasiReadInDB(id); if (ok) set((s) => ({ notifikasiList: s.notifikasiList.map((n) => (n.id === id ? { ...n, read: true } : n)) })); },
  markAllNotifRead: async () => { const ok = await markAllNotifikasiReadInDB(); if (ok) set((s) => ({ notifikasiList: s.notifikasiList.map((n) => ({ ...n, read: true })) })); },
  clearNotifikasi: async () => { const ok = await clearNotifikasiInDB(); if (ok) set({ notifikasiList: [] }); },
  updateConfig: (cfg) => set((s) => ({ config: { ...s.config, ...cfg } })),
  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),
  initializeData: async () => { set({ isLoading: true }); try { const [p, d, n] = await Promise.all([fetchPegawai(), fetchDokumen(), fetchNotifikasi()]); set({ pegawaiList: p, dokumenList: d, notifikasiList: n }); } catch (e) { console.error(e); } finally { set({ isLoading: false }); } },
  refreshData: async () => { try { const [p, d, n] = await Promise.all([fetchPegawai(), fetchDokumen(), fetchNotifikasi()]); set({ pegawaiList: p, dokumenList: d, notifikasiList: n }); } catch (e) { console.error(e); } },
  resetAllData: () => set({ pegawaiList: [], dokumenList: [], notifikasiList: [], config: { appsScriptURL: '', telegramBotToken: '', telegramChatId: '' } }),
}));

export function restoreAuth() { const user = loadAuthFromStorage(); if (user) { useArsipStore.setState({ currentUser: user, isLoggedIn: true }); return true; } return false; }
