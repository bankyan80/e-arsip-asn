import { create } from 'zustand';
import type { Pegawai, Dokumen, Notifikasi, AppConfig, CurrentUser, PageType } from './types';
import {
  fetchPegawai, addPegawai as dbAddPegawai,
  updatePegawai as dbUpdatePegawai, deletePegawai as dbDeletePegawai,
  fetchDokumen,
  uploadFileAndGetUrl, addDokumenToDB,
  updateDokumenStatus, updateDokumenKeterangan, deleteDokumen as dbDeleteDokumen,
  fetchNotifikasi, addNotifikasi as dbAddNotifikasi,
  markNotifikasiRead, markAllNotifikasiRead,
  fetchAppConfig, updateAppConfig as dbUpdateConfig,
} from './db';

interface ArsipStore {
  pegawaiList: Pegawai[];
  dokumenList: Dokumen[];
  notifikasiList: Notifikasi[];
  appConfig: AppConfig | null;
  currentUser: CurrentUser | null;
  activePage: PageType;
  isLoading: boolean;

  login: (arg1: unknown, arg2?: unknown) => Promise<boolean>;
  logout: () => void;
  initializeData: () => Promise<void>;
  refreshPegawai: () => Promise<void>;
  refreshDokumen: () => Promise<void>;
  refreshNotifikasi: () => Promise<void>;
  addPegawai: (p: Pegawai) => Promise<void>;
  updatePegawai: (id: number, data: Partial<Pegawai>) => Promise<void>;
  deletePegawai: (id: number) => Promise<void>;
  addDokumen: (d: Dokumen) => Promise<void>;
  addDokumenWithFile: (file: File, d: Dokumen) => Promise<void>;
  approveDokumen: (id: number) => Promise<void>;
  rejectDokumen: (id: number, keterangan: string) => Promise<void>;
  updateDokumenKet: (id: number, keterangan: string) => Promise<void>;
  deleteDokumen: (id: number) => Promise<void>;
  addNotifikasi: (pesan: string, tipe: string) => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  updateAppConfig: (config: AppConfig) => Promise<void>;
  setActivePage: (page: PageType) => void;
}

export const useArsipStore = create<ArsipStore>((set, get) => ({
  pegawaiList: [],
  dokumenList: [],
  notifikasiList: [],
  appConfig: null,
  currentUser: null,
  activePage: 'dashboard',
  isLoading: false,

  login: async (arg1: unknown, arg2?: unknown) => {
    try {
      // Admin login via object - langsung set tanpa tunggu Supabase
      if (typeof arg1 === 'object' && arg1 !== null) {
        const user = arg1 as CurrentUser;
        set({ currentUser: user, activePage: 'dashboard' });
        if (typeof window !== 'undefined') sessionStorage.setItem('arsip_user', JSON.stringify(user));
        // Load data di background
        get().initializeData().catch((e) => console.error('init bg:', e));
        return true;
      }
      // Login dengan nip + password
      const nip = String(arg1 || '');
      const password = String(arg2 || '');
      if (nip.toLowerCase() === 'admin' && password === 'admin123') {
        const user: CurrentUser = { nip: 'admin', nama: 'Administrator', role: 'admin' };
        set({ currentUser: user, activePage: 'dashboard' });
        if (typeof window !== 'undefined') sessionStorage.setItem('arsip_user', JSON.stringify(user));
        get().initializeData().catch((e) => console.error('init bg:', e));
        return true;
      }
      // Pegawai login - perlu data dari Supabase
      const state = get();
      if (state.pegawaiList.length === 0) {
        await state.initializeData();
      }
      const cs = get();
      const pg = cs.pegawaiList.find((p) => p.nip === nip);
      if (pg && password === '123456') {
        const user: CurrentUser = { nip: pg.nip, nama: pg.nama, role: 'pegawai', jenisASN: pg.jenisASN };
        set({ currentUser: user, activePage: 'dashboard' });
        if (typeof window !== 'undefined') sessionStorage.setItem('arsip_user', JSON.stringify(user));
        return true;
      }
      return false;
    } catch (e) {
      console.error('login error:', e);
      return false;
    }
  },

  logout: () => {
    set({ currentUser: null, activePage: 'dashboard' });
    if (typeof window !== 'undefined') sessionStorage.removeItem('arsip_user');
  },

  initializeData: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('arsip_user');
      if (saved) { try { set({ currentUser: JSON.parse(saved) }); } catch {} }
    }
    const [pegawai, dokumen, notifikasi, config] = await Promise.all([
      fetchPegawai(), fetchDokumen(), fetchNotifikasi(), fetchAppConfig(),
    ]);
    set({
      pegawaiList: pegawai,
      dokumenList: dokumen,
      notifikasiList: notifikasi,
      appConfig: config || {
        namaInstansi: 'Dinas Pendidikan Kabupaten',
        alamatInstansi: '', teleponInstansi: '', emailInstansi: '',
        maxFileUpload: 5, blurThreshold: 80, autoApprove: false, retentionDays: 365,
      },
      isLoading: false,
    });
  },

  refreshPegawai: async () => { set({ pegawaiList: await fetchPegawai() }); },
  refreshDokumen: async () => { set({ dokumenList: await fetchDokumen() }); },
  refreshNotifikasi: async () => { set({ notifikasiList: await fetchNotifikasi() }); },

  addPegawai: async (p: Pegawai) => { await dbAddPegawai(p); await get().refreshPegawai(); },
  updatePegawai: async (id: number, data: Partial<Pegawai>) => { await dbUpdatePegawai(id, data); await get().refreshPegawai(); },
  deletePegawai: async (id: number) => { await dbDeletePegawai(id); await get().refreshPegawai(); await get().refreshDokumen(); },

  addDokumen: async (d: Dokumen) => {
    const row: Record<string, unknown> = {
      pegawaiId: d.pegawaiId, pegawaiNama: d.pegawaiNama, nip: d.nip, jenisASN: d.jenisASN,
      jenisDokumen: d.jenisDokumen, tanggal: d.tanggal, status: d.status,
      filePath: '', fileName: d.fileName, fileSize: 0,
      expiry: d.expiry, keterangan: d.keterangan, periode: d.periode, tmtAwal: d.tmtAwal, tmtAkhir: d.tmtAkhir,
    };
    await addDokumenToDB(row);
    await get().refreshDokumen();
    await get().addNotifikasi(`Dokumen "${d.jenisDokumen}" untuk ${d.pegawaiNama} berhasil diunggah.`, 'success');
  },

  addDokumenWithFile: async (file: File, d: Dokumen) => {
    const uploadResult = await uploadFileAndGetUrl(file);
    if (!uploadResult) { console.error('Upload file gagal'); return; }
    const row: Record<string, unknown> = {
      pegawaiId: d.pegawaiId, pegawaiNama: d.pegawaiNama, nip: d.nip, jenisASN: d.jenisASN,
      jenisDokumen: d.jenisDokumen, tanggal: d.tanggal, status: d.status,
      filePath: uploadResult.path, fileName: d.fileName || file.name, fileSize: file.size,
      expiry: d.expiry, keterangan: d.keterangan, periode: d.periode, tmtAwal: d.tmtAwal, tmtAkhir: d.tmtAkhir,
    };
    await addDokumenToDB(row);
    await get().refreshDokumen();
    await get().addNotifikasi(`Dokumen "${d.jenisDokumen}" untuk ${d.pegawaiNama} berhasil diunggah.`, 'success');
  },

  approveDokumen: async (id: number) => {
    await updateDokumenStatus(id, 'Approved');
    await get().refreshDokumen();
    const doc = get().dokumenList.find((d) => d.id === id);
    if (doc) await get().addNotifikasi(`Dokumen "${doc.jenisDokumen}" untuk ${doc.pegawaiNama} telah disetujui.`, 'success');
  },

  rejectDokumen: async (id: number, keterangan: string) => {
    await updateDokumenStatus(id, 'Rejected');
    await updateDokumenKeterangan(id, keterangan);
    await get().refreshDokumen();
    const doc = get().dokumenList.find((d) => d.id === id);
    if (doc) await get().addNotifikasi(`Dokumen "${doc.jenisDokumen}" untuk ${doc.pegawaiNama} ditolak. Alasan: ${keterangan}`, 'warning');
  },

  updateDokumenKet: async (id: number, keterangan: string) => { await updateDokumenKeterangan(id, keterangan); await get().refreshDokumen(); },
  deleteDokumen: async (id: number) => { await dbDeleteDokumen(id); await get().refreshDokumen(); await get().addNotifikasi('Dokumen telah dihapus.', 'info'); },

  addNotifikasi: async (pesan: string, tipe: string) => { await dbAddNotifikasi(pesan, tipe); await get().refreshNotifikasi(); },
  markRead: async (id: number) => { await markNotifikasiRead(id); await get().refreshNotifikasi(); },
  markAllRead: async () => { await markAllNotifikasiRead(); await get().refreshNotifikasi(); },

  updateAppConfig: async (config: AppConfig) => { await dbUpdateConfig(config); set({ appConfig: config }); },
  setActivePage: (page: PageType) => set({ activePage: page }),
}));