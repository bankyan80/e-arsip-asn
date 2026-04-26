import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import type { Pegawai, Dokumen, Notifikasi, AppConfig, CurrentUser, PageType } from './types';
import * as db from './db';

interface ArsipStore {
  // Auth
  currentUser: CurrentUser | null;
  isLoggedIn: boolean;
  login: (user: CurrentUser) => void;
  logout: () => void;
  updateCurrentUser: (data: Partial<CurrentUser>) => void;

  // Data
  pegawaiList: Pegawai[];
  dokumenList: Dokumen[];
  notifikasiList: Notifikasi[];
  config: AppConfig;

  // Loading state
  isLoading: boolean;
  isLoadingMore: boolean;

  // Pagination
  dokumenPage: number;
  dokumenTotal: number;
  hasMoreDokumen: boolean;

  // Actions - Data fetching
  fetchData: () => Promise<void>;
  loadMoreDokumen: () => Promise<void>;

  // Actions - Pegawai
  addPegawai: (p: Pegawai) => Promise<boolean>;
  updatePegawai: (id: number, data: Partial<Pegawai>) => Promise<void>;
  deletePegawai: (id: number) => Promise<void>;

  // Actions - Dokumen
  addDokumen: (d: Dokumen) => Promise<boolean>;
  updateDokumenStatus: (id: number, status: 'Approved' | 'Rejected') => Promise<void>;
  deleteDokumen: (id: number) => Promise<void>;

  // Actions - Notifikasi
  addNotifikasi: (message: string, type: Notifikasi['type']) => void;
  markNotifRead: (id: number) => void;
  clearNotifikasi: () => void;

  // Actions - Config
  updateConfig: (cfg: Partial<AppConfig>) => void;

  // UI State
  activePage: PageType;
  setActivePage: (page: PageType) => void;

  // Reset
  resetAllData: () => void;
}

export const useArsipStore = create<ArsipStore>()(
  persist(
    (set, get) => ({
      // ===== Auth =====
      currentUser: null,
      isLoggedIn: false,
      login: (user) => set({ currentUser: user, isLoggedIn: true }),
      logout: () =>
        set({
          currentUser: null,
          isLoggedIn: false,
          pegawaiList: [],
          dokumenList: [],
          notifikasiList: [],
        }),
      updateCurrentUser: (data) =>
        set((s) => ({
          currentUser: s.currentUser ? { ...s.currentUser, ...data } : null,
        })),

      // ===== Data =====
      pegawaiList: [],
      dokumenList: [],
      notifikasiList: [],
      config: {
        appsScriptURL: '',
        telegramBotToken: '',
        telegramChatId: '',
      },
      isLoading: false,
      isLoadingMore: false,

      // Pagination
      dokumenPage: 1,
      dokumenTotal: 0,
      hasMoreDokumen: true,

      // ===== Fetch all data from Supabase =====
      fetchData: async () => {
        set({ isLoading: true });
        try {
          const [pegawai, dokumenResult, notifikasi] = await Promise.all([
            db.fetchAllPegawai(),
            db.fetchAllDokumen(1, 20),
            db.fetchAllNotifikasi(),
          ]);

          const dokumen = dokumenResult.data;

          set({
            pegawaiList: pegawai,
            dokumenList: dokumen,
            notifikasiList: notifikasi,
            dokumenPage: 1,
            dokumenTotal: dokumenResult.total,
            hasMoreDokumen: dokumen.length < dokumenResult.total,
            isLoading: false,
          });
        } catch (e: any) {
          console.error('Gagal memuat data dari Supabase:', e);
          toast.error('Gagal memuat data: ' + (e.message || 'Unknown error'));
          set({ isLoading: false });
        }
      },

      // Load more dokumen (pagination)
      loadMoreDokumen: async () => {
        const { isLoadingMore, hasMoreDokumen, dokumenPage } = get();
        if (isLoadingMore || !hasMoreDokumen) return;

        set({ isLoadingMore: true });
        try {
          const nextPage = dokumenPage + 1;
          const result = await db.fetchAllDokumen(nextPage, 20);

          set((s) => ({
            dokumenList: [...s.dokumenList, ...result.data],
            dokumenPage: nextPage,
            dokumenTotal: result.total,
            hasMoreDokumen: s.dokumenList.length + result.data.length < result.total,
            isLoadingMore: false,
          }));
        } catch (e: any) {
          console.error('Gagal memuat dokumen berikutnya:', e);
          toast.error('Gagal memuat data dokumen tambahan');
          set({ isLoadingMore: false });
        }
      },

      // ===== Pegawai CRUD =====
      addPegawai: async (p) => {
        // Optimistic: tambah dulu ke UI
        set((s) => ({ pegawaiList: [...s.pegawaiList, p] }));

        try {
          const result = await db.insertPegawai(p);
          if (result && result.id !== p.id) {
            set((s) => ({
              pegawaiList: s.pegawaiList.map((pg) =>
                pg.id === p.id ? { ...pg, id: result.id } : pg
              ),
            }));
            const curr = get().currentUser;
            if (curr && curr.pegawaiId === p.id) {
              set({ currentUser: { ...curr, pegawaiId: result.id } });
            }
          }
          // Refresh data dari server
          const freshData = await db.fetchAllPegawai();
          set({ pegawaiList: freshData });
          return true;
        } catch (e: any) {
          console.error('Gagal menyimpan pegawai ke Supabase:', e);
          const errMsg = e?.message || String(e);
          toast.error('Gagal menyimpan pegawai ke database: ' + errMsg);
          // Revert optimistic update
          set((s) => ({
            pegawaiList: s.pegawaiList.filter((pg) => pg.id !== p.id),
          }));
          return false;
        }
      },

      updatePegawai: async (id, data) => {
        // Optimistic update
        set((s) => ({
          pegawaiList: s.pegawaiList.map((p) => (p.id === id ? { ...p, ...data } : p)),
        }));

        try {
          await db.updatePegawaiInDB(id, data);
          // Refresh dari server
          const freshData = await db.fetchAllPegawai();
          set({ pegawaiList: freshData });
        } catch (e: any) {
          console.error('Gagal update pegawai:', e);
          toast.error('Gagal memperbarui data pegawai: ' + (e?.message || String(e)));
          // Revert dengan refresh dari server
          try {
            const freshData = await db.fetchAllPegawai();
            set({ pegawaiList: freshData });
          } catch {
            // Jika gagal refresh, biarkan saja
          }
        }
      },

      deletePegawai: async (id) => {
        // Simpan data lama untuk rollback
        const previousList = get().pegawaiList;

        // Optimistic update
        set((s) => ({
          pegawaiList: s.pegawaiList.filter((p) => p.id !== id),
          dokumenList: s.dokumenList.filter((d) => d.pegawaiId !== id),
        }));

        try {
          await db.deletePegawaiFromDB(id);
          // Refresh dari server
          const freshData = await db.fetchAllPegawai();
          set({ pegawaiList: freshData });
        } catch (e: any) {
          console.error('Gagal hapus pegawai:', e);
          toast.error('Gagal menghapus pegawai dari database: ' + (e?.message || String(e)));
          // Rollback
          set({ pegawaiList: previousList });
        }
      },

      // ===== Dokumen CRUD =====
      addDokumen: async (d) => {
        // Optimistic: tambah dulu ke UI
        set((s) => ({ dokumenList: [d, ...s.dokumenList] }));

        try {
          const result = await db.insertDokumen(d);
          if (result && result.id !== d.id) {
            set((s) => ({
              dokumenList: s.dokumenList.map((doc) =>
                doc.id === d.id ? { ...doc, id: result.id } : doc
              ),
            }));
          }
          // Refresh dokumen dari server
          const freshResult = await db.fetchAllDokumen(1, 20);
          set({
            dokumenList: freshResult.data,
            dokumenPage: 1,
            dokumenTotal: freshResult.total,
            hasMoreDokumen: freshResult.data.length < freshResult.total,
          });
          toast.success('Dokumen berhasil disimpan ke database');
          return true;
        } catch (e: any) {
          console.error('Gagal menyimpan dokumen ke Supabase:', e);
          const errMsg = e?.message || String(e);
          toast.error('Gagal menyimpan dokumen ke database: ' + errMsg);
          // Revert optimistic update
          set((s) => ({
            dokumenList: s.dokumenList.filter((doc) => doc.id !== d.id),
          }));
          return false;
        }
      },

      updateDokumenStatus: async (id, status) => {
        // Optimistic update
        set((s) => ({
          dokumenList: s.dokumenList.map((d) => (d.id === id ? { ...d, status } : d)),
        }));

        try {
          await db.updateDokumenStatusInDB(id, status);
          // Refresh dari server
          const freshResult = await db.fetchAllDokumen(1, 20);
          set({
            dokumenList: freshResult.data,
            dokumenTotal: freshResult.total,
            hasMoreDokumen: freshResult.data.length < freshResult.total,
          });
        } catch (e: any) {
          console.error('Gagal update status dokumen:', e);
          toast.error('Gagal memperbarui status dokumen: ' + (e?.message || String(e)));
          // Refresh dari server untuk dapat state terkini
          try {
            const freshResult = await db.fetchAllDokumen(1, 20);
            set({
              dokumenList: freshResult.data,
              dokumenTotal: freshResult.total,
              hasMoreDokumen: freshResult.data.length < freshResult.total,
            });
          } catch {
            // Biarkan saja
          }
        }
      },

      deleteDokumen: async (id) => {
        // Simpan data lama untuk rollback
        const previousList = get().dokumenList;

        // Optimistic update
        set((s) => ({
          dokumenList: s.dokumenList.filter((d) => d.id !== id),
        }));

        try {
          await db.deleteDokumenFromDB(id);
          // Refresh dari server
          const freshResult = await db.fetchAllDokumen(1, 20);
          set({
            dokumenList: freshResult.data,
            dokumenTotal: freshResult.total,
            hasMoreDokumen: freshResult.data.length < freshResult.total,
          });
          toast.success('Dokumen berhasil dihapus');
        } catch (e: any) {
          console.error('Gagal hapus dokumen:', e);
          toast.error('Gagal menghapus dokumen dari database: ' + (e?.message || String(e)));
          // Rollback
          set({ dokumenList: previousList });
        }
      },

      // ===== Notifikasi =====
      addNotifikasi: (message, type) => {
        const notif: Notifikasi = {
          id: Date.now(),
          message,
          type,
          read: false,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          notifikasiList: [notif, ...s.notifikasiList].slice(0, 50),
        }));
        db.insertNotifikasi(message, type).catch((e) => {
          console.error('Gagal menyimpan notifikasi:', e);
        });
      },

      markNotifRead: (id) => {
        set((s) => ({
          notifikasiList: s.notifikasiList.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
        db.markNotifikasiRead(id).catch((e) => {
          console.error('Gagal tandai notifikasi:', e);
        });
      },

      clearNotifikasi: () => {
        set({ notifikasiList: [] });
        db.clearAllNotifikasi().catch((e) => {
          console.error('Gagal hapus notifikasi:', e);
        });
      },

      // ===== Config (localStorage only) =====
      updateConfig: (cfg) => set((s) => ({ config: { ...s.config, ...cfg } })),

      // ===== UI =====
      activePage: 'dashboard',
      setActivePage: (page) => set({ activePage: page }),

      // ===== Reset =====
      resetAllData: () => {
        db.resetAllData()
          .then(() => {
            set({
              pegawaiList: [],
              dokumenList: [],
              notifikasiList: [],
              config: {
                appsScriptURL: '',
                telegramBotToken: '',
                telegramChatId: '',
              },
            });
            toast.success('Semua data berhasil direset');
          })
          .catch((e) => {
            console.error('Gagal reset data:', e);
            toast.error('Gagal reset data dari database');
          });
      },
    }),
    {
      name: 'e-arsip-asn-storage',
      partialize: (state) => ({
        config: state.config,
        currentUser: state.currentUser,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);