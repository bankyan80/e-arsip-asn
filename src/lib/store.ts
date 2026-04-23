import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Pegawai, Dokumen, Notifikasi, AppConfig, CurrentUser, PageType } from './types';
import { generateDummyPegawai, getASNType } from './constants';

interface ArsipStore {
  currentUser: CurrentUser | null;
  isLoggedIn: boolean;
  login: (user: CurrentUser) => void;
  logout: () => void;

  pegawaiList: Pegawai[];
  dokumenList: Dokumen[];
  notifikasiList: Notifikasi[];
  config: AppConfig;

  addPegawai: (p: Pegawai) => void;
  updatePegawai: (id: number, data: Partial<Pegawai>) => void;
  deletePegawai: (id: number) => void;

  addDokumen: (d: Dokumen) => void;
  updateDokumenStatus: (id: number, status: 'Pending' | 'Approved' | 'Rejected') => void;
  deleteDokumen: (id: number) => void;

  addNotifikasi: (message: string, type: Notifikasi['type']) => void;
  markNotifRead: (id: number) => void;
  clearNotifikasi: () => void;

  updateConfig: (cfg: Partial<AppConfig>) => void;

  activePage: PageType;
  setActivePage: (page: PageType) => void;

  initializeData: () => void;
  resetAllData: () => void;
}

export const useArsipStore = create<ArsipStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isLoggedIn: false,
      login: (user) => set({ currentUser: user, isLoggedIn: true }),
      logout: () => set({ currentUser: null, isLoggedIn: false }),

      pegawaiList: [],
      dokumenList: [],
      notifikasiList: [],
      config: {
        appsScriptURL: '',
        telegramBotToken: '',
        telegramChatId: '',
      },

      addPegawai: (p) => set((s) => ({ pegawaiList: [...s.pegawaiList, p] })),
      updatePegawai: (id, data) => set((s) => ({
        pegawaiList: s.pegawaiList.map((p) => (p.id === id ? { ...p, ...data } : p)),
      })),
      deletePegawai: (id) => set((s) => ({
        pegawaiList: s.pegawaiList.filter((p) => p.id !== id),
        dokumenList: s.dokumenList.filter((d) => d.pegawaiId !== id),
      })),

      addDokumen: (d) => set((s) => ({ dokumenList: [...s.dokumenList, d] })),
      updateDokumenStatus: (id, status) => set((s) => ({
        dokumenList: s.dokumenList.map((d) => (d.id === id ? { ...d, status } : d)),
      })),
      deleteDokumen: (id) => set((s) => ({
        dokumenList: s.dokumenList.filter((d) => d.id !== id),
      })),

      addNotifikasi: (message, type) => set((s) => ({
        notifikasiList: [
          { id: Date.now(), message, type, read: false, createdAt: new Date().toISOString() },
          ...s.notifikasiList,
        ].slice(0, 50),
      })),
      markNotifRead: (id) => set((s) => ({
        notifikasiList: s.notifikasiList.map((n) => (n.id === id ? { ...n, read: true } : n)),
      })),
      clearNotifikasi: () => set({ notifikasiList: [] }),

      updateConfig: (cfg) => set((s) => ({ config: { ...s.config, ...cfg } })),

      activePage: 'dashboard',
      setActivePage: (page) => set({ activePage: page }),

      initializeData: () => {
        const state = get();
        if (state.pegawaiList.length === 0) {
          const dummy = generateDummyPegawai();
          const dummyDocs: Dokumen[] = [];
          dummy.forEach((pg, idx) => {
            const asnType = getASNType(pg.jenisASN);
            if (asnType === 'PNS') {
              dummyDocs.push({
                id: Date.now() + idx * 10 + 1,
                pegawaiId: pg.id, pegawaiNama: pg.nama, nip: pg.nip,
                jenisASN: pg.jenisASN, jenisDokumen: 'SK CPNS',
                tanggal: '2020-01-15', status: 'Approved', url: '', expiry: '',
                fileName: 'sk_cpns_' + pg.nip + '.pdf', keterangan: '',
              });
            } else if (asnType === 'PPPK_PENUH' || asnType === 'PPPK_PARUH') {
              dummyDocs.push({
                id: Date.now() + idx * 10 + 1,
                pegawaiId: pg.id, pegawaiNama: pg.nama, nip: pg.nip,
                jenisASN: pg.jenisASN, jenisDokumen: 'SK PPPK',
                tanggal: '2022-03-01', status: 'Approved', url: '', expiry: '',
                fileName: 'sk_pppk_' + pg.nip + '.pdf', keterangan: '',
                periode: '1', tmtAwal: '2022-03-01', tmtAkhir: asnType === 'PPPK_PENUH' ? '2027-02-28' : '2023-02-28',
              });
            }
          });
          set({ pegawaiList: dummy, dokumenList: dummyDocs });
        }
      },
      resetAllData: () => set({
        pegawaiList: [], dokumenList: [], notifikasiList: [],
        config: { appsScriptURL: '', telegramBotToken: '', telegramChatId: '' },
      }),
    }),
    {
      name: 'e-arsip-asn-storage',
      partialize: (state) => ({
        pegawaiList: state.pegawaiList,
        dokumenList: state.dokumenList,
        notifikasiList: state.notifikasiList,
        config: state.config,
        currentUser: state.currentUser,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);