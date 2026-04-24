import { create } from 'zustand';
import type { Pegawai, Dokumen, Notifikasi, AppConfig, CurrentUser, PageType, SuratMasuk, SuratKeluar } from './types';
import {
  fetchPegawai, addPegawaiToDB, addPegawaiBatchToDB, updatePegawaiInDB, deletePegawaiFromDB,
  fetchDokumen, uploadFileAndGetUrl, addDokumenToDB, updateDokumenStatusInDB, updateDokumenKeteranganInDB, deleteDokumenFromDB,
  fetchNotifikasi, addNotifikasiToDB, markNotifikasiReadInDB, markAllNotifikasiReadInDB, clearNotifikasiInDB,
  fetchSuratMasuk, addSuratMasukToDB, deleteSuratMasukFromDB,
  fetchSuratKeluar, addSuratKeluarToDB, deleteSuratKeluarFromDB,
} from './db';

const AUTH_KEY = 'e-arsip-auth';

function saveAuthToStorage(user: CurrentUser | null) {
  if (typeof window === 'undefined') return;
  try {
    if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_KEY);
  } catch {}
}

function loadAuthFromStorage(): CurrentUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const r = localStorage.getItem(AUTH_KEY);
    return r ? JSON.parse(r) : null;
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
  suratMasukList: SuratMasuk[];
  suratKeluarList: SuratKeluar[];
  config: AppConfig;
  isLoading: boolean;

  addPegawai: (p: Pegawai) => Promise<Pegawai | null>;
  addPegawaiBatch: (list: Pegawai[]) => Promise<{ inserted: number; errors: string[] }>;
  updatePegawai: (id: number, data: Partial<Pegawai>) => Promise<void>;
  deletePegawai: (id: number) => Promise<void>;

  addDokumen: (d: Omit<Dokumen, 'id'>) => Promise<void>;
  addDokumenWithFile: (file: File, d: Omit<Dokumen, 'id'>) => Promise<void>;
  updateDokumenStatus: (id: number, status: 'Pending' | 'Approved' | 'Rejected') => Promise<void>;
  updateDokumenKeterangan: (id: number, keterangan: string) => Promise<void>;
  deleteDokumen: (id: number) => Promise<void>;

  addNotifikasi: (message: string, type: Notifikasi['type']) => Promise<void>;
  markNotifRead: (id: number) => Promise<void>;
  markAllNotifRead: () => Promise<void>;
  clearNotifikasi: () => Promise<void>;
  addSuratMasuk: (s: Omit<SuratMasuk, 'id' | 'createdAt'>) => Promise<void>;
  deleteSuratMasuk: (id: number) => Promise<void>;
  addSuratKeluar: (s: Omit<SuratKeluar, 'id' | 'createdAt'>) => Promise<void>;
  deleteSuratKeluar: (id: number) => Promise<void>;

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
  login: (user) => {
    saveAuthToStorage(user);
    set({ currentUser: user, isLoggedIn: true });
  },
  logout: () => {
    saveAuthToStorage(null);
    set({ currentUser: null, isLoggedIn: false });
  },

  pegawaiList: [],
  dokumenList: [],
  notifikasiList: [],
  suratMasukList: [],
  suratKeluarList: [],
  config: { appsScriptURL: '', telegramBotToken: '', telegramChatId: '' },
  isLoading: false,

  addPegawai: async (p) => {
    const r = await addPegawaiToDB(p);
    if (r) set((s) => ({ pegawaiList: [...s.pegawaiList, r] }));
    return r;
  },

  addPegawaiBatch: async (list) => {
    const result = await addPegawaiBatchToDB(list);
    if (result.inserted > 0) {
      const pegawai = await fetchPegawai();
      set({ pegawaiList: pegawai });
    }
    return result;
  },

  updatePegawai: async (id, data) => {
    const ok = await updatePegawaiInDB(id, data);
    if (ok) set((s) => ({ pegawaiList: s.pegawaiList.map((p) => (p.id === id ? { ...p, ...data } : p)) }));
  },
  deletePegawai: async (id) => {
    const ok = await deletePegawaiFromDB(id);
    if (ok) set((s) => ({ pegawaiList: s.pegawaiList.filter((p) => p.id !== id), dokumenList: s.dokumenList.filter((d) => d.pegawaiId !== id) }));
  },

  addDokumen: async (d) => {
    const r = await addDokumenToDB(d);
    if (r) set((s) => ({ dokumenList: [...s.dokumenList, r] }));
  },
  addDokumenWithFile: async (file, d) => {
    const u = await uploadFileAndGetUrl(file, d.pegawaiId);
    if (!u) throw new Error('Gagal upload');
    const r = await addDokumenToDB({ ...d, url: u.url, filePath: u.filePath, fileSize: file.size });
    if (r) set((s) => ({ dokumenList: [...s.dokumenList, r] }));
    else throw new Error('Gagal simpan');
  },
  updateDokumenStatus: async (id, status) => {
    const ok = await updateDokumenStatusInDB(id, status);
    if (ok) set((s) => ({ dokumenList: s.dokumenList.map((d) => (d.id === id ? { ...d, status } : d)) }));
  },
  updateDokumenKeterangan: async (id, keterangan) => {
    const ok = await updateDokumenKeteranganInDB(id, keterangan);
    if (ok) set((s) => ({ dokumenList: s.dokumenList.map((d) => (d.id === id ? { ...d, keterangan } : d)) }));
  },
  deleteDokumen: async (id) => {
    const doc = get().dokumenList.find((d) => d.id === id);
    const ok = await deleteDokumenFromDB(id, doc?.filePath);
    if (ok) set((s) => ({ dokumenList: s.dokumenList.filter((d) => d.id !== id) }));
  },

  addNotifikasi: async (message, type) => {
    const r = await addNotifikasiToDB(message, type);
    if (r) set((s) => ({ notifikasiList: [r, ...s.notifikasiList].slice(0, 50) }));
  },
  markNotifRead: async (id) => {
    const ok = await markNotifikasiReadInDB(id);
    if (ok) set((s) => ({ notifikasiList: s.notifikasiList.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  },
  markAllNotifRead: async () => {
    const ok = await markAllNotifikasiReadInDB();
    if (ok) set((s) => ({ notifikasiList: s.notifikasiList.map((n) => ({ ...n, read: true })) }));
  },
  clearNotifikasi: async () => {
    const ok = await clearNotifikasiInDB();
    if (ok) set({ notifikasiList: [] });
  },

  addSuratMasuk: async (s) => {
    const r = await addSuratMasukToDB(s);
    if (r) set((state) => ({ suratMasukList: [r, ...state.suratMasukList] }));
  },
  deleteSuratMasuk: async (id) => {
    const ok = await deleteSuratMasukFromDB(id);
    if (ok) set((state) => ({ suratMasukList: state.suratMasukList.filter((s) => s.id !== id) }));
  },
  addSuratKeluar: async (s) => {
    const r = await addSuratKeluarToDB(s);
    if (r) set((state) => ({ suratKeluarList: [r, ...state.suratKeluarList] }));
  },
  deleteSuratKeluar: async (id) => {
    const ok = await deleteSuratKeluarFromDB(id);
    if (ok) set((state) => ({ suratKeluarList: state.suratKeluarList.filter((s) => s.id !== id) }));
  },
  updateConfig: (cfg) => set((s) => ({ config: { ...s.config, ...cfg } })),
  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),

  initializeData: async () => {
    set({ isLoading: true });
    try {
      const [p, d, n, sm, sk] = await Promise.all([fetchPegawai(), fetchDokumen(), fetchNotifikasi(), fetchSuratMasuk(), fetchSuratKeluar()]);
      set({ pegawaiList: p, dokumenList: d, notifikasiList: n, suratMasukList: sm, suratKeluarList: sk });
    } catch (e) { console.error(e); }
    finally { set({ isLoading: false }); }
  },
  refreshData: async () => {
    try {
      const [p, d, n, sm, sk] = await Promise.all([fetchPegawai(), fetchDokumen(), fetchNotifikasi(), fetchSuratMasuk(), fetchSuratKeluar()]);
      set({ pegawaiList: p, dokumenList: d, notifikasiList: n, suratMasukList: sm, suratKeluarList: sk });
    } catch (e) { console.error(e); }
  },
    resetAllData: () => set({ pegawaiList: [], dokumenList: [], notifikasiList: [], suratMasukList: [], suratKeluarList: [], config: { appsScriptURL: '', telegramBotToken: '', telegramChatId: '' } }),
}));

export function restoreAuth(): boolean {
  const user = loadAuthFromStorage();
  if (user) {
    useArsipStore.setState({ currentUser: user, isLoggedIn: true });
    return true;
  }
  return false;
}