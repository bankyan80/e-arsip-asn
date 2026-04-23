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
  fetchDokumenByPegawaiId,
} from './db';

interface ArsipStore {
  // Auth
  currentUser: CurrentUser | null;
  login: (user: CurrentUser) => void;
  logout: () => void;

  // Data
  pegawaiList: Pegawai[];
  dokumenList: Dokumen[];
  notifikasiList: Notifikasi[];
  config: AppConfig;

  // Loading
  isLoading: boolean;

  // Actions - Pegawai
  addPegawai: (p: Pegawai) => Promise<void>;
  updatePegawai: (id: number, data: Partial<Pegawai>) => Promise<void>;
  deletePegawai: (id: number) => Promise<void>;

  // Actions - Dokumen
  addDokumen: (d: Dokumen) => Promise<void>;
  addDokumenWithFile: (file: File, d: Omit<Dokumen, 'id' | 'url' | 'filePath' | 'fileSize'>) => Promise<void>;
  updateDokumenStatus: (id: number, status: 'Pending' | 'Approved' | 'Rejected') => Promise<void>;
  updateDokumenKeterangan: (id: number, keterangan: string) => Promise<void>;
  deleteDokumen: (id: number) => Promise<void>;

  // Actions - Notifikasi
  addNotifikasi: (message: string, type: Notifikasi['type']) => Promise<void>;
  markNotifRead: (id: number) => Promise<void>;
  markAllNotifRead: () => Promise<void>;
  clearNotifikasi: () => Promise<void>;

  // Actions - Config
  updateConfig: (cfg: Partial<AppConfig>) => void;

  // UI State
  activePage: PageType;
  setActivePage: (page: PageType) => void;

  // Initialization
  initializeData: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export const useArsipStore = create<ArsipStore>()((set, get) => ({
  // Auth
  currentUser: null,
  login: (user) => set({ currentUser: user }),
  logout: () => set({ currentUser: null }),

  // Data
  pegawaiList: [],
  dokumenList: [],
  notifikasiList: [],
  config: {
    appsScriptURL: '',
    telegramBotToken: '',
    telegramChatId: '',
  },

  // Loading
  isLoading: false,

  // Pegawai CRUD
  addPegawai: async (p) => {
    const result = await addPegawaiToDB(p);
    if (result) {
      set((s) => ({ pegawaiList: [...s.pegawaiList, result] }));
    }
  },

  updatePegawai: async (id, data) => {
    const success = await updatePegawaiInDB(id, data);
    if (success) {
      set((s) => ({
        pegawaiList: s.pegawaiList.map((p) => (p.id === id ? { ...p, ...data } : p)),
      }));
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

  // Dokumen CRUD
  addDokumen: async (d) => {
    const result = await addDokumenToDB(d);
    if (result) {
      set((s) => ({ dokumenList: [...s.dokumenList, result] }));
    }
  },

  addDokumenWithFile: async (file, d) => {
    const uploadResult = await uploadFileAndGetUrl(file, d.pegawaiId);
    if (!uploadResult) {
      throw new Error('Gagal mengunggah file ke storage');
    }

    const result = await addDokumenToDB({
      ...d,
      url: uploadResult.url,
      filePath: uploadResult.filePath,
      fileSize: file.size,
    });

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
      set((s) => ({
        dokumenList: s.dokumenList.map((d) => (d.id === id ? { ...d, status } : d)),
      }));
    }
  },

  updateDokumenKeterangan: async (id, keterangan) => {
    const success = await updateDokumenKeteranganInDB(id, keterangan);
    if (success) {
      set((s) => ({
        dokumenList: s.dokumenList.map((d) => (d.id === id ? { ...d, keterangan } : d)),
      }));
    }
  },

  deleteDokumen: async (id) => {
    const doc = get().dokumenList.find((d) => d.id === id);
    const success = await deleteDokumenFromDB(id, doc?.filePath);
    if (success) {
      set((s) => ({
        dokumenList: s.dokumenList.filter((d) => d.id !== id),
      }));
    }
  },

  // Notifikasi
  addNotifikasi: async (message, type) => {
    const result = await addNotifikasiToDB(message, type);
    if (result) {
      set((s) => ({
        notifikasiList: [result, ...s.notifikasiList].slice(0, 50),
      }));
    }
  },

  markNotifRead: async (id) => {
    const success = await markNotifikasiReadInDB(id);
    if (success) {
      set((s) => ({
        notifikasiList: s.notifikasiList.map((n) => (n.id === id ? { ...n, read: true } : n)),
      }));
    }
  },

  markAllNotifRead: async () => {
    const success = await markAllNotifikasiReadInDB();
    if (success) {
      set((s) => ({
        notifikasiList: s.notifikasiList.map((n) => ({ ...n, read: true })),
      }));
    }
  },

  clearNotifikasi: async () => {
    const success = await clearNotifikasiInDB();
    if (success) {
      set({ notifikasiList: [] });
    }
  },

  // Config (still local)
  updateConfig: (cfg) => set((s) => ({ config: { ...s.config, ...cfg } })),

  // UI
  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),

  // Initialize: fetch all data from Supabase
  initializeData: async () => {
    set({ isLoading: true });
    try {
      const [pegawai, dokumen, notifikasi] = await Promise.all([
        fetchPegawai(),
        fetchDokumen(),
        fetchNotifikasi(),
      ]);
      set({ pegawaiList: pegawai, dokumenList: dokumen, notifikasiList: notifikasi });
    } catch (error) {
      console.error('Error initializing data:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Refresh: re-fetch all data from Supabase
  refreshData: async () => {
    try {
      const [pegawai, dokumen, notifikasi] = await Promise.all([
        fetchPegawai(),
        fetchDokumen(),
        fetchNotifikasi(),
      ]);
      set({ pegawaiList: pegawai, dokumenList: dokumen, notifikasiList: notifikasi });
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  },
}));