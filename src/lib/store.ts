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

  // Actions - Data fetching
  fetchData: () => Promise<void>;

  // Actions - Pegawai
  addPegawai: (p: Pegawai) => void;
  updatePegawai: (id: number, data: Partial<Pegawai>) => void;
  deletePegawai: (id: number) => void;

  // Actions - Dokumen
  addDokumen: (d: Dokumen) => void;
  updateDokumenStatus: (id: number, status: 'Approved' | 'Rejected') => void;
  deleteDokumen: (id: number) => void;

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
      logout: () => set({
        currentUser: null,
        isLoggedIn: false,
        pegawaiList: [],
        dokumenList: [],
        notifikasiList: [],
      }),
      updateCurrentUser: (data) => set((s) => ({
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

      // ===== Fetch all data from Supabase =====
      fetchData: async () => {
        set({ isLoading: true });
        try {
          const [pegawai, dokumen, notifikasi] = await Promise.all([
            db.fetchAllPegawai(),
            db.fetchAllDokumen(),
            db.fetchAllNotifikasi(),
          ]);
          set({
            pegawaiList: pegawai,
            dokumenList: dokumen,
            notifikasiList: notifikasi,
            isLoading: false,
          });
        } catch (e: any) {
          console.error('Gagal memuat data dari Supabase:', e);
          toast.error('Gagal memuat data: ' + (e.message || 'Unknown error'));
          set({ isLoading: false });
        }
      },

      // ===== Pegawai CRUD =====
      addPegawai: (p) => {
        // Optimistic: update local state immediately
        set((s) => ({ pegawaiList: [...s.pegawaiList, p] }));
        // Sync to Supabase in background
        db.insertPegawai(p)
          .then((result) => {
            // Update local id with Supabase-generated id
            if (result && result.id !== p.id) {
              set((s) => ({
                pegawaiList: s.pegawaiList.map((pg) =>
                  pg.id === p.id ? { ...pg, id: result.id } : pg
                ),
              }));
              // Also update currentUser.pegawaiId if it references this pegawai
              const curr = get().currentUser;
              if (curr && curr.pegawaiId === p.id) {
                set({ currentUser: { ...curr, pegawaiId: result.id } });
              }
            }
          })
          .catch((e) => {
            console.error('Gagal menyimpan pegawai ke Supabase:', e);
            toast.error('Gagal menyimpan pegawai ke database');
            // Revert optimistic update
            set((s) => ({
              pegawaiList: s.pegawaiList.filter((pg) => pg.id !== p.id),
            }));
          });
      },

      updatePegawai: (id, data) => {
        // Optimistic update
        set((s) => ({
          pegawaiList: s.pegawaiList.map((p) => (p.id === id ? { ...p, ...data } : p)),
        }));
        // Sync to Supabase
        db.updatePegawaiInDB(id, data).catch((e) => {
          console.error('Gagal update pegawai:', e);
          toast.error('Gagal memperbarui data pegawai');
        });
      },

      deletePegawai: (id) => {
        // Optimistic update
        set((s) => ({
          pegawaiList: s.pegawaiList.filter((p) => p.id !== id),
          dokumenList: s.dokumenList.filter((d) => d.pegawaiId !== id),
        }));
        // Sync to Supabase (cascade will handle dokumen)
        db.deletePegawaiFromDB(id).catch((e) => {
          console.error('Gagal hapus pegawai:', e);
          toast.error('Gagal menghapus pegawai dari database');
        });
      },

      // ===== Dokumen CRUD =====
      addDokumen: (d) => {
        set((s) => ({ dokumenList: [...s.dokumenList, d] }));
        db.insertDokumen(d)
          .then((result) => {
            if (result && result.id !== d.id) {
              set((s) => ({
                dokumenList: s.dokumenList.map((doc) =>
                  doc.id === d.id ? { ...doc, id: result.id } : doc
                ),
              }));
            }
          })
          .catch((e) => {
            console.error('Gagal menyimpan dokumen:', e);
            toast.error('Gagal menyimpan dokumen ke database');
            set((s) => ({
              dokumenList: s.dokumenList.filter((doc) => doc.id !== d.id),
            }));
          });
      },

      updateDokumenStatus: (id, status) => {
        set((s) => ({
          dokumenList: s.dokumenList.map((d) => (d.id === id ? { ...d, status } : d)),
        }));
        db.updateDokumenStatusInDB(id, status).catch((e) => {
          console.error('Gagal update status dokumen:', e);
          toast.error('Gagal memperbarui status dokumen');
        });
      },

      deleteDokumen: (id) => {
        set((s) => ({
          dokumenList: s.dokumenList.filter((d) => d.id !== id),
        }));
        db.deleteDokumenFromDB(id).catch((e) => {
          console.error('Gagal hapus dokumen:', e);
          toast.error('Gagal menghapus dokumen dari database');
        });
      },

      // ===== Notifikasi =====
      addNotifikasi: (message, type) => {
        // Optimistic
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
        // Sync to Supabase
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