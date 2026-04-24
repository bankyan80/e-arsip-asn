import { create } from 'zustand';
import type { Pegawai, Dokumen, Notifikasi, AppConfig, CurrentUser, PageType } from './types';
import {
  fetchPegawai,
  addPegawaiToDB,
  updatePegawaiInDB,
  deletePegawaiFromDB,
  fetchDokumen,
  uploadFileAndGetUrl,
  addDokumenToDB,
  updateDokumenStatusInDB,
  updateDokumenKeteranganInDB,
  deleteDokumenFromDB,
  fetchNotifikasi,
  addNotifikasiToDB,
  markNotifikasiReadInDB,
  markAllNotifikasiReadInDB,
  clearNotifikasiInDB,
} from './db';

const AUTH_KEY = 'e-arsip-auth';

function saveAuthToStorage(user: CurrentUser | null) {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  } catch { /* ignore */ }
}

function loadAuthFromStorage(): CurrentUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CurrentUser;
  } catch { return null; }
}

interface ArsipStore {
  currentUser: CurrentUser | null;
  isLoggedIn: boolean;
  login: (user: CurrentUser) => void;
  logout: () => void;
  pegawaiList: Pegawai[];
  dokumenList: Dokumen[];
  notifikasiList: Notifikasi[];
  config: AppConfig;
  isLoading: boolean;
  addPegawai: (p: Pegawai) => Promise<void>;
  updatePegawai: (id: number, data: Partial<Pegawai>) => Promise<void>;
  deletePegawai: (id: number) => Promise<void>;
  addDokumen: (d: Dokumen) => Promise<void>;
  addDokumenWithFile: (file: File, d: Omit<Dokumen, 'id' | 'url' | 'filePath' | 'fileSize'>) => Promise<void>;
  updateDokumenStatus: (id: number, status: 'Pending' | 'Approved' | 'Rejected') => Promise<void>;
  updateDokumenKeterangan: (id: number, keterangan: string) => Promise<void>;
  deleteDokumen: (id: number) => Promise<void>;
  addNotifikasi: (message: string, type: Notifikasi['type']) => Promise<void>;
  markNotifRead: (id: number) => Promise<void>;
  markAllNotifRead: () => Promise<void>;
  clearNotifikasi: () => Promise<void>;
  updateConfig: (cfg: Partial<AppConfig>) => void;
  activePage: PageType;
  setActivePage: (page: PageType) => void;
  initializeData: () => Promise<void>;
  refreshData: () => Promise<void>;
  resetAllData: () => void;
}

export const useArsipStore = create<ArsipStore>()((set, get) => ({
  currentUser: null,
  isLoggedIn: false,

  // Login: simpan ke state + localStorage
  login: (user) => {
    saveAuthToStorage(user);
    set({ currentUser: user, isLoggedIn: true });
  },

  // Logout: hapus state + localStorage
  logout: () => {
    saveAuthToStorage(null);
    set({ currentUser: null, isLoggedIn: false });
  },

  pegawaiList: [],
  dokumenList: [],
  notifikasiList: [],
  config: { appsScriptURL: '', telegramBotToken: '', telegramChatId: '' },
  isLoading: false,

  // ===== PEGAWAI CRUD - Supabase =====
  addPegawai: async (p) => {
    const result = await addPegawaiToDB(p);
    if (result) {
      set((s) => ({ pegawaiList: [...s.pegawaiList, result] }));
    }
  },
  updatePegawai: async (id, data) => {
    const success = await updatePegawaiInDB(id, data);
    if (success) {
      set((s) => ({ pegawaiList: s.pegawaiList.map((p) => (p.id === id ? { ...p, ...data } : p)) }));
    }
  },
  deletePegawai: async (id) => {
    const success = await deletePegawaiFromDB(id);
    if (success) {
      set((s) => ({
        pegawaiList: s.pegawaiList.filter((p) => p.id !== id),
        dokumenList: s.dokumenList.filter((d) => d.pegawaiId !== id),
      }));
    }
  },

  // ===== DOKUMEN CRUD - Supabase =====
  addDokumen: async (d) => {
    const result = await addDokumenToDB(d);
    if (result) {
      set((s) => ({ dokumenList: [...s.dokumenList, result] }));
    }
  },
  addDokumenWithFile: async (file, d) => {
    const uploadResult = await uploadFileAndGetUrl(file, d.pegawaiId);
    if (!uploadResult) throw new Error('Gagal mengunggah file ke storage');
    const result = await addDokumenToDB({ ...d, url: uploadResult.url, filePath: uploadResult.filePath, fileSize: file.size });
    if (result) {
      set((s) => ({ dokumenList: [...s.dokumenList, result] }));
    } else {
      const { supabase } = await import('./supabase');
      supabase.storage.from('dokumen').remove([uploadResult.filePath]);
      throw new Error('Gagal menyimpan data dokumen');
    }
  },
  updateDokumenStatus: async (id, status) => {
    const success = await updateDokumenStatusInDB(id, status);
    if (success) {
      set((s) => ({ dokumenList: s.dokumenList.map((d) => (d.id === id ? { ...d, status } : d)) }));
    }
  },
  updateDokumenKeterangan: async (id, keterangan) => {
    const success = await updateDokumenKeteranganInDB(id, keterangan);
    if (success) {
      set((s) => ({ dokumenList: s.dokumenList.map((d) => (d.id === id ? { ...d, keterangan } : d)) }));
    }
  },
  deleteDokumen: async (id) => {
    const doc = get().dokumenList.find((d) => d.id === id);
    const success = await deleteDokumenFromDB(id, doc?.filePath);
    if (success) {
      set((s) => ({ dokumenList: s.dokumenList.filter((d) => d.id !== id) }));
    }
  },

  // ===== NOTIFIKASI - Supabase =====
  addNotifikasi: async (message, type) => {
    const result = await addNotifikasiToDB(message, type);
    if (result) {
      set((s) => ({ notifikasiList: [result, ...s.notifikasiList].slice(0, 50) }));
    }
  },
  markNotifRead: async (id) => {
    const success = await markNotifikasiReadInDB(id);
    if (success) {
      set((s) => ({ notifikasiList: s.notifikasiList.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
    }
  },
  markAllNotifRead: async () => {
    const success = await markAllNotifikasiReadInDB();
    if (success) {
      set((s) => ({ notifikasiList: s.notifikasiList.map((n) => ({ ...n, read: true })) }));
    }
  },
  clearNotifikasi: async () => {
    const success = await clearNotifikasiInDB();
    if (success) set({ notifikasiList: [] });
  },

  // ===== CONFIG =====
  updateConfig: (cfg) => set((s) => ({ config: { ...s.config, ...cfg } })),

  // ===== UI =====
  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),

  // ===== INIT: fetch dari Supabase =====
  initializeData: async () => {
    set({ isLoading: true });
    try {
      const [pegawai, dokumen, notifikasi] = await Promise.all([fetchPegawai(), fetchDokumen(), fetchNotifikasi()]);
      set({ pegawaiList: pegawai, dokumenList: dokumen, notifikasiList: notifikasi });
    } catch (error) {
      console.error('Error initializing data:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  refreshData: async () => {
    try {
      const [pegawai, dokumen, notifikasi] = await Promise.all([fetchPegawai(), fetchDokumen(), fetchNotifikasi()]);
      set({ pegawaiList: pegawai, dokumenList: dokumen, notifikasiList: notifikasi });
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  },
  resetAllData: () => set({ pegawaiList: [], dokumenList: [], notifikasiList: [], config: { appsScriptURL: '', telegramBotToken: '', telegramChatId: '' } }),
}));

// Helper: restore auth dari localStorage (dipanggil dari page.tsx)
export function restoreAuth() {
  const user = loadAuthFromStorage();
  if (user) {
    useArsipStore.setState({ currentUser: user, isLoggedIn: true });
    return true;
  }
  return false;
}