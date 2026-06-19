import React, { useState, Fragment } from 'react';
import {
  Users, FileCheck, Clock, Layers, FileText, Search,
  CheckCircle, AlertTriangle, Download, Phone,
  Mail, MapPin, RefreshCw, Eye, Settings, Activity,
  UserPlus, UploadCloud, Folder
} from 'lucide-react';
import { BottomNav } from './components/BottomNav';
import { Header } from './components/Header';
import { Loading } from './components/Loading';
import { EmptyState } from './components/EmptyState';
import { StatCard } from './components/StatCard';
import { ArsipCard } from './components/ArsipCard';
import { UploadForm } from './components/UploadForm';
import { PullToRefresh } from './components/PullToRefresh';
import { Arsip, JenisDokumen } from './types';
import { useSession } from './hooks/useSession';
import { usePegawaiData } from './hooks/usePegawaiData';

function filterJenisDokumenByStatus(list: JenisDokumen[], statusPegawai: string): JenisDokumen[] {
  const hidden: string[] = [];
  if (statusPegawai === 'PNS') {
    hidden.push('SK PPPK', 'SK PPPK Paruh Waktu');
  } else if (statusPegawai === 'PPPK') {
    hidden.push('SK PPPK Paruh Waktu', 'SK CPNS/PNS');
  } else if (statusPegawai === 'PPPK Paruh Waktu') {
    hidden.push('SK Honor', 'SK CPNS/PNS');
  }
  return list.filter(jd => !hidden.includes(jd.namaDokumen));
}
import { useAdminData } from './hooks/useAdminData';

export default function App() {
  const { session, loadingSession, login: sessionLogin, logout: handleLogout } = useSession();
  const pegawaiData = usePegawaiData();
  const adminData = useAdminData();
  const { profile, setProfile, kategoriList, setKategoriList, jenisDokumenList, setJenisDokumenList, myArchives, setMyArchives, checklist, setChecklist, loadAllPegawaiData, fetchMyArchives, fetchMyChecklist, fetchMyProfile } = pegawaiData;
  const { allEmployees, allArchives, rekapData, systemLogs, instansiList, adminSettings } = adminData;

  // Form states (Login)
  const [loginType, setLoginType] = useState<'NIP' | 'NIK' | 'BOTH'>('BOTH');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // UI Navigation states
  const [currentTab, setCurrentTab] = useState('beranda'); // pegawai tab
  const [adminTab, setAdminTab] = useState('dashboard'); // admin tab
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filtering states (Personnel)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Filtering states (Admin)
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [expandedPegawai, setExpandedPegawai] = useState<string | null>(null);
  const [bupData, setBupData] = useState<any[]>([]);
  const [bupLoading, setBupLoading] = useState(false);

  // Editing state (Personnel)
  const [editArsip, setEditArsip] = useState<Arsip | null>(null);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ namaPegawai: '', jabatan: '', statusPegawai: '', pangkatGolongan: '', pendidikanTerakhir: '', nomorHp: '', email: '', alamat: '', namaInstansi: '' });

  // Creation dialog state (Super Admin)
  const [showAddPegawai, setShowAddPegawai] = useState(false);
  const [newPegawaiForm, setNewPegawaiForm] = useState({
    namaPegawai: '',
    nip: '',
    nik: '',
    tanggalLahir: '',
    jenisKelamin: 'Laki-laki',
    jabatan: '',
    statusPegawai: 'PNS',
    pangkatGolongan: '',
    pendidikanTerakhir: '',
    nomorHp: '',
    email: '',
    alamat: '',
    role: 'pegawai',
    instansiId: 'INST001'
  });
  const [addingPegawaiProcess, setAddingPegawaiProcess] = useState(false);

  // Edit & Delete pegawai states
  const [showEditPegawai, setShowEditPegawai] = useState(false);
  const [editPegawaiForm, setEditPegawaiForm] = useState<any>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePegawaiId, setDeletePegawaiId] = useState<string | null>(null);

  // Kategori & Jenis Dokumen CRUD states
  const [showKategoriModal, setShowKategoriModal] = useState(false);
  const [editKategori, setEditKategori] = useState<any>(null);
  const [kategoriForm, setKategoriForm] = useState({ namaKategori: '', urutan: 0 });

  const [showJenisModal, setShowJenisModal] = useState(false);
  const [editJenis, setEditJenis] = useState<any>(null);
  const [jenisForm, setJenisForm] = useState({ kategoriId: '', namaDokumen: '', berlakuUntuk: 'Semua', wajib: false });

  const [confirmDelete, setConfirmDelete] = useState<{ type: 'kategori' | 'jenis'; id: string; nama: string } | null>(null);

  // File Viewer light box state
  const [activeFileUrl, setActiveFileUrl] = useState<string | null>(null);
  const [activeFileName, setActiveFileName] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. LOAD DATA ON SESSION CHANGE
  React.useEffect(() => {
    if (!session) return;
    if (session.role === 'admin_instansi') {
      setNewPegawaiForm(prev => ({ ...prev, instansiId: session.instansiId }));
    }
    if (session.role === 'pegawai') {
      loadAllPegawaiData();
    } else {
      adminData.fetchAdminData(session.role);
      fetch('/api/kategori').then(r => r.json()).then(setKategoriList).catch(() => {});
      fetch('/api/jenis-dokumen').then(r => r.json()).then(setJenisDokumenList).catch(() => {});
      fetch('/api/pegawai/me').then(r => r.json()).then(d => { if (d && d.id) setProfile(d); }).catch(() => {});
    }
  }, [session]);

  // 2. HANDLERS (LOGIN / SYSTEM)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!identifier || !password) {
      setLoginError('Sila lengkapi data NIP/NIK dan password Anda.');
      return;
    }

    setLoginLoading(true);
    try {
      await sessionLogin(identifier, password, loginType);
      showToast('Autentikasi berhasil. Selamat datang!');
    } catch (err: any) {
      setLoginError(err.message || 'Koneksi ke server gagal.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogoutClick = async () => {
    await handleLogout();
    setProfile(null);
    setMyArchives([]);
    setChecklist([]);
    showToast('Berhasil keluar sistem.');
  };

  // FILL LOGINS QUICKLY FOR TESTING
  const fillTestCredentials = (type: 'pegawai' | 'admin' | 'super') => {
    setLoginType('BOTH');
    if (type === 'pegawai') {
      setIdentifier('198705122010012003');
      setPassword('012003');
    } else if (type === 'admin') {
      setIdentifier('198501012008011002');
      setPassword('011002');
    } else if (type === 'super') {
      setIdentifier('198001292025211035');
      setPassword('admin456');
    }
  };

  // 3. HANDLERS (PEGAWAI USER UPLOAD & EDIT)
  const handleSaveDocument = async (formData: FormData) => {
    try {
      const isEdit = !!editArsip;
      const url = isEdit ? `/api/arsip/${editArsip.id}` : '/api/arsip/upload';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        body: formData // contains files and standard inputs
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unggah data gagal.');
      }

      showToast(isEdit ? 'Dokumen arsip berhasil diperbarui.' : 'Dokumen baru berhasil disimpan.');
      setEditArsip(null);
      fetchMyArchives();
      fetchMyChecklist();
      setCurrentTab('arsip'); // Switch tab back to list view
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus dokumen arsip digital ini? Tindakan ini tidak dapat dibatalkan.')) return;

    try {
      const res = await fetch(`/api/arsip/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Penghapusan gagal dilakukan.');
      }

      showToast('Arsip berhasil dihapus dari penyimpanan.');
      fetchMyArchives();
      fetchMyChecklist();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/pegawai/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pembaruan profil gagal.');

      showToast('Profil berhasil diperbarui.');
      setProfileEditing(false);
      fetchMyProfile();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // 4. HANDLERS (ADMIN PROCESSES)
  const handleCreatePegawai = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingPegawaiProcess(true);
    try {
      const res = await fetch('/api/admin/pegawai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPegawaiForm)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pendaftaran ASN gagal.');

      showToast(`Pegawai ${data.namaPegawai} berhasil didaftarkan.`);
      setShowAddPegawai(false);
      setNewPegawaiForm({
        namaPegawai: '',
        nip: '',
        nik: '',
        tanggalLahir: '',
        jenisKelamin: 'Laki-laki',
        jabatan: '',
        statusPegawai: 'PNS',
        pangkatGolongan: '',
        pendidikanTerakhir: '',
        nomorHp: '',
        email: '',
        alamat: '',
        role: 'pegawai',
        instansiId: session?.role === 'admin_instansi' ? session.instansiId : 'INST001'
      });
      if (session) adminData.fetchAdminData(session.role);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setAddingPegawaiProcess(false);
    }
  };

  const handleEditPegawai = (p: any) => {
    setEditPegawaiForm({
      id: p.id, namaPegawai: p.namaPegawai, nip: p.nip, nik: p.nik,
      tanggalLahir: p.tanggalLahir || '', jenisKelamin: p.jenisKelamin || 'Laki-laki',
      jabatan: p.jabatan || '', statusPegawai: p.statusPegawai || 'PNS',
      pangkatGolongan: p.pangkatGolongan || '', pendidikanTerakhir: p.pendidikanTerakhir || '',
      nomorHp: p.nomorHp || '', email: p.email || '', alamat: p.alamat || '',
      instansiId: p.instansiId || '', password: ''
    });
    setShowEditPegawai(true);
  };

  const handleUpdatePegawai = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id, password, ...data } = editPegawaiForm;
    if (password) (data as any).password = password;
    try {
      const res = await fetch('/api/admin/pegawai/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Gagal memperbarui data.'); }
      showToast('Data pegawai berhasil diperbarui.');
      setShowEditPegawai(false);
      if (session) adminData.fetchAdminData(session.role);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeletePegawai = async () => {
    if (!deletePegawaiId) return;
    try {
      const res = await fetch('/api/admin/pegawai/' + deletePegawaiId, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Gagal menghapus pegawai.'); }
      showToast('Pegawai berhasil dihapus.');
      setShowDeleteConfirm(false);
      setDeletePegawaiId(null);
      if (session) adminData.fetchAdminData(session.role);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const toggleSettingValue = async (key: string, currentValue: string) => {
    const newValue = currentValue === 'true' ? 'false' : 'true';
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: newValue })
      });
      if (!res.ok) throw new Error();
      showToast('Kunci konfigurasi berhasil diperbarui.');
      if (session) adminData.fetchAdminData(session.role);
    } catch {
      showToast('Gagal merubah sistem config.', 'error');
    }
  };

  const openFileViewer = (id: string, url: string) => {
    const match = myArchives.find(a => a.id === id) || allArchives.find(a => a.id === id);
    setActiveFileName(match ? `${match.jenisDokumen} - ${match.namaDokumen}` : 'Dokumen Arsip');
    // Use download URL if available; otherwise fetch via API (handles base64 from DB)
    const fileUrl = url || `/api/files/download?arsipId=${id}`;
    setActiveFileUrl(fileUrl);
  };

  // CLIENT SIDE CSV EXPORT
  const exportToCSV = () => {
    if (rekapData.length === 0) return;
    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'NIP,Nama Pegawai,Jabatan,Instansi,Status Kerja,Total Arsip,Valid,Menunggu,Perbaikan,Wajib,Wajib Valid,Persentase Kelengkapan\n';
    rekapData.forEach(r => {
      csv += `"${r.nip}","${r.namaPegawai}","${r.jabatan}","${r.namaInstansi}","${r.statusPegawai}",${r.jumlahArsipUploaded},${r.jumlahArsipValid},${r.jumlahArsipPending},${r.jumlahArsipPerbaikan},${r.jumlahWajib},${r.jumlahWajibValid},"${r.persentaseKelengkapan}%"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rekap_kelengkapan_asn_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Rekapitulasi instansi berhasil diexport ke CSV.');
  };

  // 5. RENDERS & VIEWS
  if (loadingSession) {
    return (
      <div className="min-h-screen bg-[#f3f6fa] flex items-center justify-center">
        <Loading message="Menginisialisasi sistem Arsip Digital ASN..." />
      </div>
    );
  }

  // --- LOGIN LAYOUT (Android Centered Mobile Screen) ---
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-[#f0f4fa] to-[#e8eef6] flex justify-center items-center py-6 px-4">
        
        {/* Android Display bounds container */}
        <div id="android-login-wrapper" className="w-full max-w-sm bg-white rounded-[32px] shadow-2xl shadow-slate-200/60 overflow-hidden border border-slate-200/40 flex flex-col">
          
          {/* Header navy */}
          <div className="bg-gradient-to-br from-[#0f2a44] to-[#1a3d5e] p-8 text-center text-white relative">
            <div className="absolute top-4 right-4 bg-white/8 backdrop-blur-sm text-[9px] font-bold tracking-widest px-2.5 py-1 rounded-full text-white/80 border border-white/8">
              V1.2
            </div>
            <div className="bg-white/10 backdrop-blur-sm w-14 h-14 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 border border-white/10 shadow-inner">
              <FileCheck className="w-8 h-8 stroke-[1.8]" />
            </div>
            <h2 className="text-xl font-display font-bold tracking-tight uppercase">Arsip Digital ASN</h2>
            <p className="text-[10px] text-white/60 font-medium tracking-wide mt-1">
              Sistem Pengarsipan Dokumen Digital Kepegawaian ASN
            </p>
          </div>

          <div className="p-6 flex-1 flex flex-col">
            
            {loginError && (
              <div className="mb-4 p-3.5 bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-700 text-xs font-semibold rounded-2xl flex items-start gap-2.5 shadow-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              
              {/* Unified NIP / NIK Identifier Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 flex justify-between items-center">
                  <span>NIP atau NIK <span className="text-red-400">*</span></span>
                  <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/50">Otomatis</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, ''))}
                    placeholder="18 digit NIP atau 16 digit NIK"
                    maxLength={18}
                    className="w-full h-11 border border-slate-200 rounded-xl px-3.5 bg-slate-50/60 text-slate-800 text-sm font-semibold tracking-wide focus:outline-none focus:border-[#0f2a44] focus:bg-white focus:ring-2 focus:ring-[#0f2a44]/5 transition-all"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />
                  Masukkan NIP 18 digit atau NIK 16 digit — sistem mengenali otomatis
                </p>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full h-11 border border-slate-200 rounded-xl px-3.5 bg-slate-50/60 text-slate-800 text-sm font-semibold focus:outline-none focus:border-[#0f2a44] focus:bg-white focus:ring-2 focus:ring-[#0f2a44]/5 transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full h-12 bg-gradient-to-r from-[#0f2a44] to-[#1a3d5e] hover:from-[#1a3d5e] hover:to-[#254b6e] active:scale-[0.98] text-white font-bold text-sm rounded-xl tracking-wide transition-all shadow-md shadow-slate-200 flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Menghubungkan...
                  </>
                ) : (
                  'Masuk Ke Arsip Digital'
                )}
              </button>
            </form>

            {/* Test accounts quick fills — only in dev */}
            {import.meta.env.DEV && (
            <div className="mt-6 border-t border-slate-100 pt-5">
              <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center mb-2.5">
                Akses Cepat Uji Coba
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => fillTestCredentials('pegawai')}
                  className="text-[10px] py-2 bg-slate-50 hover:bg-[#0f2a44]/5 active:scale-95 text-[#0f2a44] font-bold rounded-xl border border-slate-200/60 transition-all"
                >
                  Pegawai
                </button>
                <button
                  onClick={() => fillTestCredentials('admin')}
                  className="text-[10px] py-2 bg-slate-50 hover:bg-[#0f2a44]/5 active:scale-95 text-[#0f2a44] font-bold rounded-xl border border-slate-200/60 transition-all"
                >
                  Admin
                </button>
                <button
                  onClick={() => fillTestCredentials('super')}
                  className="text-[10px] py-2 bg-slate-50 hover:bg-[#0f2a44]/5 active:scale-95 text-[#0f2a44] font-bold rounded-xl border border-slate-200/60 transition-all"
                >
                  Super Admin
                </button>
              </div>
            </div>
            )}

          </div>

          {/* Footer constraints */}
          <div className="bg-slate-50/70 py-3.5 text-center border-t border-slate-100/60">
            <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">
              Tim Kerja Bidang SD Kecamatan Lemahabang
            </p>
            <p className="text-[6px] text-slate-300 font-semibold mt-0.5 tracking-widest uppercase">
              &copy; {new Date().getFullYear()} &bull; All Rights Reserved
            </p>
          </div>

        </div>
      </div>
    );
  }

  // Calculate calculations for Employee home dashboard
  const userUploadedCount = myArchives.length;
  const validationsCount = myArchives.filter(a => a.statusValidasi === 'Valid').length;
  const correctionsCount = myArchives.filter(a => a.statusValidasi === 'Perlu Perbaikan').length;
  const pendingsCount = myArchives.filter(a => a.statusValidasi === 'Menunggu Validasi').length;
  
  // Total mandatory check items
  const mandatoryItems = checklist.filter(c => c.wajib);
  const sizeMandatory = mandatoryItems.length;
  const sizeMandatoryValid = mandatoryItems.filter(c => c.status === 'Valid').length;
  const sizeMandatoryNotUploaded = mandatoryItems.filter(c => c.status === 'Belum Upload').length;
  const employeeCompletenessPercentage = sizeMandatory > 0 ? Math.round((sizeMandatoryValid / sizeMandatory) * 100) : 100;

  // --- MAIN EMPLOYEES USER LAYOUT ---
  if (session.role === 'pegawai') {
    return (
      <div className="min-h-screen bg-[#f3f6fa] flex flex-col md:max-w-md md:mx-auto md:shadow-2xl relative pb-20">
        
        {/* Core Top view */}
        <Header
          userName={profile?.namaPegawai || session.nama}
          agencyName={profile?.namaInstansi || session.namaInstansi}
          role={session.role}
          onLogout={handleLogoutClick}
        />

        {/* Dynamic tabs render content area wrapper */}
        <main id="employee-content-area" className="flex-1 flex flex-col min-h-0">
          <PullToRefresh onRefresh={async () => {
            if (session) {
              loadAllPegawaiData();
              await new Promise(resolve => setTimeout(resolve, 800));
            }
          }}>
            <div className="p-4 space-y-4">
              
              {/* A. BERANDA TAB */}
              {currentTab === 'beranda' && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Profile Brief overview */}
              {profile && (
                <div className="bg-gradient-to-br from-[#0f2a44] to-[#1e3a5f] rounded-2xl p-5 text-white shadow-sm relative overflow-hidden">
                  <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white bg-opacity-5 rounded-full"></div>
                  
                  <div className="flex justify-between items-start">
                    <span className="inline-block text-[9px] uppercase tracking-wider bg-white bg-opacity-20 px-2 py-0.5 rounded-md font-bold">
                      {profile.statusPegawai}
                    </span>
                    <span className="text-[10px] text-white/70 font-semibold">Aktif</span>
                  </div>

                  <h3 className="text-base font-display font-bold mt-3 tracking-tight truncate">
                    {profile.namaPegawai}
                  </h3>
                  
                  <div className="flex gap-2 text-[11px] text-white/80 mt-1 font-mono">
                    <span>NIP: {profile.nip}</span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white border-opacity-10 text-[11px] text-white/80 flex justify-between gap-2">
                    <span className="truncate">{profile.jabatan}</span>
                    <span className="font-bold whitespace-nowrap">{profile.pangkatGolongan}</span>
                  </div>
                </div>
              )}

              {/* Progress Completeness Dial Card (Requested "Persentase kelengkapan arsip") */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/50 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    Kelengkapan Dokumen Wajib
                  </h4>
                  <span className="text-base font-display font-bold text-[#0f2a44]">
                    {employeeCompletenessPercentage}%
                  </span>
                </div>
                
                {/* Visual tracker bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-green-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${employeeCompletenessPercentage}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 mt-4 text-center">
                  <div className="p-2 bg-green-50/60 rounded-xl border border-green-150">
                    <span className="block text-lg font-display font-bold text-green-700 leading-none">
                      {sizeMandatoryValid}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase block leading-none">
                      Wajib Valid
                    </span>
                  </div>
                  <div className="p-2 bg-yellow-50/60 rounded-xl border border-yellow-150">
                    <span className="block text-lg font-display font-bold text-yellow-700 leading-none">
                      {pendingsCount}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase block leading-none">
                      Menunggu
                    </span>
                  </div>
                  <div className="p-2 bg-red-50/60 rounded-xl border border-red-150">
                    <span className="block text-lg font-display font-bold text-red-700 leading-none">
                      {sizeMandatoryNotUploaded}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase block leading-none">
                      Belum Upload
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary counters (Stats Cards) */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard title="Total Upload" value={userUploadedCount} icon={FileText} />
                <StatCard title="Dokumen Valid" value={validationsCount} icon={CheckCircle} iconBgColor="bg-green-50" iconColor="text-green-600" />
                <StatCard title="Perlu Perbaikan" value={correctionsCount} icon={AlertTriangle} iconBgColor="bg-red-50" iconColor="text-red-500" />
                <StatCard title="Belum Upload" value={sizeMandatoryNotUploaded} icon={Clock} iconBgColor="bg-slate-50" iconColor="text-slate-500" />
              </div>

              {/* Quick links block buttons (Requested "Tombol cepat") */}
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">
                  Navigasi Pintas
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    onClick={() => setCurrentTab('upload')}
                    className="flex flex-col items-center justify-center p-3 bg-[#0f2a44] text-white text-xs font-bold rounded-2xl shadow-sm hover:bg-[#1a3d5e] min-h-[44px] transition-all"
                  >
                    <UploadCloud className="w-5 h-5 mb-1 stroke-[2]" />
                    Upload
                  </button>
                  <button
                    onClick={() => setCurrentTab('arsip')}
                    className="flex flex-col items-center justify-center p-3 bg-white text-slate-700 text-xs font-bold rounded-2xl border border-slate-200/50 shadow-sm hover:bg-slate-50 min-h-[44px] transition-all"
                  >
                    <Folder className="w-5 h-5 mb-1 text-[#0f2a44]" />
                    Arsip Saya
                  </button>
                  <button
                    onClick={() => setCurrentTab('kelengkapan')}
                    className="flex flex-col items-center justify-center p-3 bg-white text-slate-700 text-xs font-bold rounded-2xl border border-slate-200/50 shadow-sm hover:bg-slate-50 min-h-[44px] transition-all"
                  >
                    <FileCheck className="w-5 h-5 mb-1 text-green-600" />
                    Kelengkapan
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* B. UPLOAD TAB */}
          {currentTab === 'upload' && (
            <div className="space-y-4 animate-fade-in bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <h3 className="text-sm font-bold text-slate-800">
                  {editArsip ? 'Ubah Berkas Arsip' : 'Form Upload Arsip Baru'}
                </h3>
                {editArsip && (
                  <button
                    onClick={() => setEditArsip(null)}
                    className="text-xs text-red-600 font-bold"
                  >
                    Batal Edit
                  </button>
                )}
              </div>

              <UploadForm
                kategoriList={kategoriList}
                jenisDokumenList={filterJenisDokumenByStatus(jenisDokumenList, profile?.statusPegawai || '')}
                statusPegawai={profile?.statusPegawai || ''}
                isSubmitting={false}
                onSubmit={handleSaveDocument}
                editArsip={editArsip}
                onCancelEdit={() => setEditArsip(null)}
              />
            </div>
          )}

          {/* C. ARSIP SAYA TAB */}
          {currentTab === 'arsip' && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Search & filters headblock */}
              <div className="space-y-2">
                
                {/* Search Bar text input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama atau nomor dokumen..."
                    className="w-full h-11 bg-white border border-slate-100 rounded-xl pl-9 pr-4 text-xs font-semibold focus:ring-1 focus:ring-[#1d4ed8] shadow-xs"
                  />
                </div>

                {/* Filters block layout */}
                <div className="grid grid-cols-2 gap-2">
                  
                  {/* Category Filter dropdown */}
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="h-10 border border-slate-100 rounded-xl px-2.5 bg-white text-[10px] font-bold text-slate-600 focus:ring-0 focus:outline-none"
                  >
                    <option value="">-- Semua Kategori --</option>
                    {kategoriList.map(c => (
                      <option key={c.id} value={c.namaKategori}>{c.namaKategori}</option>
                    ))}
                  </select>

                  {/* Status Filter dropdown */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-10 border border-slate-100 rounded-xl px-2.5 bg-white text-[10px] font-bold text-slate-600 focus:ring-0 focus:outline-none"
                  >
                    <option value="">-- Semua Status --</option>
                    <option value="Valid">Valid</option>
                    <option value="Menunggu Validasi">Menunggu Validasi</option>
                    <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                    <option value="Ditolak">Ditolak</option>
                  </select>

                </div>
              </div>

              {/* Render dynamic documents matching conditions */}
              {(() => {
                const results = myArchives.filter(a => {
                  const matchSearch =
                    a.namaDokumen.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    a.jenisDokumen.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (a.nomorDokumen && a.nomorDokumen.toLowerCase().includes(searchQuery.toLowerCase()));

                  const matchCat = filterCategory ? a.kelompokArsip === filterCategory : true;
                  const matchStat = filterStatus ? a.statusValidasi === filterStatus : true;

                  return matchSearch && matchCat && matchStat;
                });

                if (results.length === 0) {
                  return (
                    <EmptyState
                      title="Hasil Pencarian Kosong"
                      description="Tidak ditemukan dokumen arsip yang sesuai dengan filter pencarian Anda."
                      actionText="Reset Pencarian"
                      onAction={() => {
                        setSearchQuery('');
                        setFilterCategory('');
                        setFilterStatus('');
                      }}
                    />
                  );
                }

                return (
                  <div className="space-y-4">
                    {results.map(a => (
                      <ArsipCard
                        key={a.id}
                        arsip={a}
                        onView={openFileViewer}
                        onEdit={(arsip) => {
                          setEditArsip(arsip);
                          setCurrentTab('upload');
                        }}
                        onDelete={handleDeleteDocument}
                      />
                    ))}
                  </div>
                );
              })()}

            </div>
          )}

          {/* D. KELENGKAPAN CHECKLIST TAB */}
          {currentTab === 'kelengkapan' && (
            <div className="space-y-4 animate-fade-in">
              
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                  Checklist Dokumen Wajib
                </span>
                <h3 className="text-sm font-bold text-[#0f2a44]">Status Kelengkapan</h3>
                <p className="text-xs text-slate-500 mt-1 leading-snug">
                  Pastikan seluruh dokumen bertanda <span className="text-red-500 font-bold">Wajib</span> diunggah dan telah divalidasi sebagai berkas <span className="font-bold text-green-700">Valid</span>.
                </p>
              </div>

              {/* Render checklist segregated by Category group */}
              {kategoriList.map(cat => {
                const catItems = checklist.filter(item => item.kategoriId === cat.id || item.namaKategori === cat.namaKategori);
                if (catItems.length === 0) return null;

                return (
                  <div key={cat.id} className="bg-white rounded-2xl border border-slate-50 overflow-hidden shadow-xs">
                    
                    {/* Category Title Header banner */}
                    <div className="bg-[#0f2a44] bg-opacity-5 px-3 py-2 text-xs font-extrabold text-[#0f2a44] tracking-tight uppercase border-b border-slate-100">
                      {cat.namaKategori}
                    </div>

                    <div className="divide-y divide-slate-50">
                      {catItems.map(item => (
                        <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-800 tracking-tight leading-snug">
                                {item.namaDokumen}
                              </span>
                              {item.wajib && (
                                <span className="inline-block text-[8px] font-bold uppercase tracking-wider bg-red-100 text-red-600 px-1 py-0.2 rounded">
                                  Wajib
                                </span>
                              )}
                            </div>
                            
                            {/* Notes if perbaikan */}
                            {item.catatanAdmin && (
                              <p className="text-[10px] text-red-600 font-medium leading-tight mt-1 bg-red-50 p-1.5 rounded-lg border border-red-100">
                                Perbaikan: "{item.catatanAdmin}"
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {/* Shortened badges */}
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                              item.status === 'Valid' ? 'bg-green-50 text-green-600' :
                              item.status === 'Menunggu Validasi' ? 'bg-yellow-50 text-yellow-600' :
                              item.status === 'Perlu Perbaikan' ? 'bg-red-50 text-red-600' :
                              'bg-slate-50 text-slate-400'
                            }`}>
                              {item.status}
                            </span>

                            {/* Utility direct upload or file view */}
                            {item.status === 'Belum Upload' || item.status === 'Perlu Perbaikan' ? (
                              <button
                                onClick={() => {
                                  if (item.arsipId) {
                                    // Set editing
                                    const match = myArchives.find(a => a.id === item.arsipId);
                                    if (match) setEditArsip(match);
                                  } else {
                                    setEditArsip({
                                      id: '', pegawaiId: '', nip: '', nik: '',
                                      namaPegawai: session.nama, instansiId: session.instansiId,
                                      namaInstansi: session.namaInstansi,
                                      kelompokArsip: item.namaKategori,
                                      jenisDokumen: item.namaDokumen,
                                      namaDokumen: item.namaDokumen,
                                      nomorDokumen: '', tanggalDokumen: '', tahun: '',
                                      fileName: '', fileType: '', fileSize: 0,
                                      storagePath: '', downloadUrl: '',
                                      statusValidasi: 'Menunggu Validasi',
                                      deleted: false,
                                      uploadedAt: '', updatedAt: '',
                                      uploadedBy: '', updatedBy: ''
                                    } as Arsip);
                                  }
                                  setCurrentTab('upload');
                                }}
                                className="p-1 px-2.5 bg-blue-50 text-[#1d4ed8] hover:bg-blue-100 text-[10px] font-bold rounded-lg leading-6"
                              >
                                Upload
                              </button>
                            ) : (
                              (item.downloadUrl || item.storagePath) && (
                                <button
                                  onClick={() => openFileViewer(item.arsipId || '', item.downloadUrl)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"
                                  title="Lihat Berkas"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                );
              })}

            </div>
          )}

          {/* E. PROFIL TAB */}
          {currentTab === 'profil' && profile && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Profile Card Header */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#1d4ed8] rounded-full text-white text-xl font-bold flex items-center justify-center shadow">
                  {profile.namaPegawai.substring(0, 2).toUpperCase()}
                </div>
                <h3 className="text-base font-extrabold text-slate-800 mt-3">{profile.namaPegawai}</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-1">NIP: {profile.nip}</p>
                <div className="mt-2.5 flex items-center gap-1.5">
                  <span className="bg-blue-50 text-[#1d4ed8] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                    {profile.statusPegawai}
                  </span>
                  <span className="bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                    {profile.pangkatGolongan}
                  </span>
                </div>
              </div>

              {/* General details metadata card */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs divide-y divide-slate-50">
                <div className="px-4 py-3 bg-slate-50 text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
                  Riwayat & Jabatan Kerja
                </div>
                
                <div className="p-4 py-3 text-xs grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-semibold">Instansi / Unit</span>
                  <span className="col-span-2 text-slate-700 font-bold">{profile.namaInstansi}</span>
                </div>

                <div className="p-4 py-3 text-xs grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-semibold">Jabatan</span>
                  <span className="col-span-2 text-slate-700 font-bold">{profile.jabatan}</span>
                </div>

                <div className="p-4 py-3 text-xs grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-semibold">Tgl Lahir</span>
                  <span className="col-span-2 text-slate-700 font-mono font-bold">{profile.tanggalLahir}</span>
                </div>

                <div className="p-4 py-3 text-xs grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-semibold">Kelamin</span>
                  <span className="col-span-2 text-slate-700 font-bold">{profile.jenisKelamin}</span>
                </div>

                <div className="p-4 py-3 text-xs grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-semibold">Pendidikan</span>
                  <span className="col-span-2 text-slate-700 font-bold">{profile.pendidikanTerakhir}</span>
                </div>
              </div>

              {/* Edit Contact parameters (Only allow editable fields according to instructions: HP, Email, Alamat) */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                  <h4 className="text-xs font-black text-[#0f2a44] uppercase">Kontak ASN</h4>
                  <button
                    onClick={() => {
                      setProfileForm({ namaPegawai: profile.namaPegawai || '', jabatan: profile.jabatan || '', statusPegawai: profile.statusPegawai || '', pangkatGolongan: profile.pangkatGolongan || '', pendidikanTerakhir: profile.pendidikanTerakhir || '', nomorHp: profile.nomorHp || '', email: profile.email || '', alamat: profile.alamat || '', namaInstansi: profile.namaInstansi || '' });
                      setProfileEditing(!profileEditing);
                    }}
                    className="text-xs text-[#1d4ed8] font-bold"
                  >
                    {profileEditing ? 'Batal' : 'Ubah Kontak'}
                  </button>
                </div>

                {!profileEditing ? (
                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center gap-2.5 text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{profile.nomorHp || 'Belum diisi'}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>{profile.email || 'Belum diisi'}</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                      <span className="leading-relaxed">{profile.alamat || 'Belum diisi'}</span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateProfile} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nomor HP</label>
                      <input type="text" value={profileForm.nomorHp} onChange={(e) => setProfileForm({ ...profileForm, nomorHp: e.target.value })} className="w-full h-10 border border-slate-200 rounded-lg px-3 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Surel / Email</label>
                      <input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} className="w-full h-10 border border-slate-200 rounded-lg px-3 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Alamat Tinggal</label>
                      <textarea value={profileForm.alamat} onChange={(e) => setProfileForm({ ...profileForm, alamat: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 text-xs min-h-[60px]" />
                    </div>
                    <button type="submit" className="w-full h-10 bg-[#1d4ed8] text-white text-xs font-bold rounded-lg">Simpan Perubahan Kontak</button>
                  </form>
                )}
              </div>

            </div>
          )}

            </div>
          </PullToRefresh>
        </main>

        {/* Persistent bottom tabs navigation bar for pegawai */}
        <BottomNav
          currentTab={currentTab}
          onChangeTab={setCurrentTab}
          countBadges={{
            revisions: correctionsCount,
            pending: pendingsCount
          }}
        />

        {/* Global Toast HUD notifications */}
        {toast && (
          <div className={`fixed bottom-18 left-4 right-4 z-50 p-3.5 rounded-xl shadow-lg border text-white font-semibold text-xs flex items-center gap-2 animate-bounce ${
            toast.type === 'error' ? 'bg-red-600 border-red-700' : 'bg-slate-900 border-slate-800'
          }`}>
            <span>{toast.message}</span>
          </div>
        )}

        {/* LIGHTBOX FILE VIEWER */}
        {activeFileUrl && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex flex-col justify-between p-4">
            <div className="flex justify-between items-center text-white mb-2">
              <span className="text-xs font-bold truncate max-w-[250px]">{activeFileName}</span>
              <button
                onClick={() => {
                  setActiveFileUrl(null);
                  setActiveFileName(null);
                }}
                className="bg-slate-800 p-2.5 rounded-full font-bold text-xs"
              >
                Tutup [X]
              </button>
            </div>
            
            <div className="flex-1 bg-white rounded-xl overflow-hidden flex items-center justify-center relative">
              {activeFileUrl.endsWith('.pdf') || activeFileUrl.includes('pdf') || activeFileUrl.includes('download') ? (
                <iframe
                  src={activeFileUrl}
                  className="w-full h-full"
                  title="Document Preview"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <img
                  src={activeFileUrl}
                  alt="Previa berkas"
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            
            <div className="text-center text-slate-400 text-[10px] mt-2 font-mono">
              Amankan tautan berkas digital
            </div>
          </div>
        )}

      </div>
    );
  }

  // --- ADMINISTRATOR CONSOLE WRAPPER ---
  // Roles: 'admin_instansi' | 'super_admin'
  const sizeTotalPegawai = allEmployees.length;
  const sizeTotalArsip = allArchives.length;
  const sizeWaitingVal = allArchives.filter(a => a.statusValidasi === 'Menunggu Validasi').length;
  const sizeRevisions = allArchives.filter(a => a.statusValidasi === 'Perlu Perbaikan').length;
  const sizeLengkapPegawai = rekapData.filter(r => r.persentaseKelengkapan === 100).length;
  const sizeBelumLengkapPegawai = sizeTotalPegawai - sizeLengkapPegawai;

  return (
    <div className="min-h-screen bg-[#f3f6fa] flex flex-col">
      
      {/* 1. Header with metadata */}
      <Header
        userName={session.nama}
        agencyName={session.namaInstansi}
        role={session.role}
        onLogout={handleLogoutClick}
      />

      {/* 2. Admin Desktop Layout layout */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 lg:grid lg:grid-cols-5 lg:gap-6">
        
        {/* Navigation Rail Menu */}
        <aside className="lg:col-span-1 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mb-4 lg:mb-0 h-fit">
          <span className="block text-[10.5px] font-bold uppercase text-slate-400 tracking-widest mb-3 px-2">
            Konsol Administrasi
          </span>
          <nav className="flex flex-wrap lg:flex-col gap-1 text-xs">
            <button
              onClick={() => setAdminTab('dashboard')}
              className={`flex-1 lg:flex-initial text-left px-3.5 py-3 rounded-xl font-bold flex items-center gap-2.5 transition-colors ${
                adminTab === 'dashboard' ? 'bg-[#0f2a44] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setAdminTab('pegawai')}
              className={`flex-1 lg:flex-initial text-left px-3.5 py-3 rounded-xl font-bold flex items-center gap-2.5 transition-colors ${
                adminTab === 'pegawai' ? 'bg-[#0f2a44] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              Data Pegawai
            </button>
            <button
              onClick={() => { setAdminTab('bup'); if (bupData.length === 0 && !bupLoading) { setBupLoading(true); fetch('/api/admin/bup').then(r => r.json()).then(setBupData).catch(() => {}).finally(() => setBupLoading(false)); } }}
              className={`flex-1 lg:flex-initial text-left px-3.5 py-3 rounded-xl font-bold flex items-center gap-2.5 transition-colors ${
                adminTab === 'bup' ? 'bg-[#0f2a44] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-4 h-4" />
              BUP
            </button>
            <button
              onClick={() => setAdminTab('rekap')}
              className={`flex-1 lg:flex-initial text-left px-3.5 py-3 rounded-xl font-bold flex items-center gap-2.5 transition-colors ${
                adminTab === 'rekap' ? 'bg-[#0f2a44] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              Rekap Kelengkapan
            </button>
            <button
              onClick={() => setAdminTab('berkas')}
              className={`flex-1 lg:flex-initial text-left px-3.5 py-3 rounded-xl font-bold flex items-center gap-2.5 transition-colors ${
                adminTab === 'berkas' ? 'bg-[#0f2a44] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              Semua Berkas
            </button>
            <button
              onClick={() => setAdminTab('kategori')}
              className={`flex-1 lg:flex-initial text-left px-3.5 py-3 rounded-xl font-bold flex items-center gap-2.5 transition-colors ${
                adminTab === 'kategori' ? 'bg-[#0f2a44] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-4 h-4" />
              Kategori Arsip
            </button>
            <button
              onClick={() => setAdminTab('logs')}
              className={`flex-1 lg:flex-initial text-left px-3.5 py-3 rounded-xl font-bold flex items-center gap-2.5 transition-colors ${
                adminTab === 'logs' ? 'bg-[#0f2a44] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Activity className="w-4 h-4" />
              Log Aktivitas
            </button>
            <button
              onClick={() => { setAdminTab('profil'); }}
              className={`flex-1 lg:flex-initial text-left px-3.5 py-3 rounded-xl font-bold flex items-center gap-2.5 transition-colors ${
                adminTab === 'profil' ? 'bg-[#0f2a44] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              Profil Saya
            </button>
          </nav>
        </aside>

        {/* Content Panel Area */}
        <main id="admin-mainframe-core" className="lg:col-span-4 min-w-0 flex flex-col">
          <PullToRefresh onRefresh={async () => {
            if (session) {
              adminData.fetchAdminData(session.role);
              await new Promise(resolve => setTimeout(resolve, 800));
            }
          }}>
            <div className="flex flex-col gap-4">
              
              {/* TOAST HUD FOR ADMIN */}
          {toast && (
            <div className={`p-4 rounded-xl border text-white font-semibold text-xs flex justify-between items-center shadow-md animate-fade-in ${
              toast.type === 'error' ? 'bg-red-600 border-red-700' : 'bg-slate-800 border-slate-700'
            }`}>
              <span>{toast.message}</span>
              <button onClick={() => setToast(null)} className="text-[10px] uppercase font-bold underline">Tutup</button>
            </div>
          )}

          {/* PAGE A. DASHBOARD PANEL */}
          {adminTab === 'dashboard' && (
            <div className="space-y-4 animate-fade-in">
              
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#0f2a44]">Ringkasan Instansi</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Selamat bekerja kembali Team Operator Kepegawaian. Pantau kelengkapan arsip ASN secara langsung.
                  </p>
                </div>
                <div className="text-xs font-mono font-bold bg-[#1d4ed8] bg-opacity-5 text-[#1d4ed8] px-3 py-1.5 rounded-lg shrink-0">
                  Admin
                </div>
              </div>

              {/* Statistical indicator widgets */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard title="Total Pegawai" value={sizeTotalPegawai} icon={Users} iconBgColor="bg-blue-50" iconColor="text-blue-600" />
                <StatCard title="Total Arsip" value={sizeTotalArsip} icon={FileText} iconBgColor="bg-slate-50" iconColor="text-slate-500" />
                <StatCard title="Pegawai Lengkap" value={sizeLengkapPegawai} icon={CheckCircle} iconBgColor="bg-green-50" iconColor="text-green-600" />
                <StatCard title="Belum Lengkap" value={sizeBelumLengkapPegawai} icon={Clock} iconBgColor="bg-slate-100" iconColor="text-slate-400" />
                
                <StatCard
                  title="Antrean Validasi"
                  value={sizeWaitingVal}
                  icon={Clock}
                  bgColor={sizeWaitingVal > 0 ? 'bg-yellow-50 bg-opacity-60 border-yellow-200' : 'bg-white'}
                  iconBgColor="bg-yellow-100"
                  iconColor="text-yellow-600"
                />
                
                <StatCard title="Perlu Perbaikan" value={sizeRevisions} icon={AlertTriangle} iconBgColor="bg-red-50" iconColor="text-red-500" />
              </div>

              {/* Global Settings policies block */}
              {(session.role === 'admin_instansi' || session.role === 'super_admin') && (
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-5 h-5 text-indigo-600" />
                    <h4 className="text-xs font-black text-[#0f2a44] uppercase">Pengaturan Global Kebijakan</h4>
                  </div>
                  
                  <div className="divide-y divide-slate-100">
                    {adminSettings.map((sett) => (
                      <div key={sett.key} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-extrabold text-slate-800">{sett.key}</p>
                          <p className="text-[11px] text-slate-500">{sett.keterangan}</p>
                        </div>
                        <button
                          onClick={() => toggleSettingValue(sett.key, sett.value)}
                          className={`px-3 py-1.5 font-extrabold rounded-lg text-[11px] uppercase tracking-wide border transition-all ${
                            sett.value === 'true'
                              ? 'bg-green-600 text-white border-green-700'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {sett.value === 'true' ? 'AKTIF (TRUE)' : 'MATI (FALSE)'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* PAGE B. DATA PEGAWAI PANEL */}
          {adminTab === 'pegawai' && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Header layout controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Daftar Pegawai ASN</h3>
                  <p className="text-xs text-slate-400 mt-1">Mengelola hak profil dan penempatan instansi kerja</p>
                </div>

                <div className="flex items-center gap-2">
                  {(session.role === 'admin_instansi' || session.role === 'super_admin') && (
                    <button
                      onClick={() => setShowAddPegawai(!showAddPegawai)}
                      className="h-10 px-3 bg-[#1d4ed8] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-opacity-95"
                    >
                      <UserPlus className="w-4 h-4" />
                      Tambah Pegawai
                    </button>
                  )}
                </div>
              </div>

              {/* ADMIN INLINE PEGWAWI REGISTER FORM */}
              {showAddPegawai && (session.role === 'admin_instansi' || session.role === 'super_admin') && (
                <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-md animate-slide-up">
                  <span className="block text-[10px] font-bold text-indigo-500 uppercase tracking-widest leading-none mb-1">
                    Admin Console
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-800 mb-4">Pendaftaran Pegawai ASN Baru</h4>
                  
                  <form onSubmit={handleCreatePegawai} className="space-y-3 text-xs">
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">NAMA LENGKAP *</label>
                        <input
                          type="text"
                          required
                          value={newPegawaiForm.namaPegawai}
                          onChange={(e) => setNewPegawaiForm({ ...newPegawaiForm, namaPegawai: e.target.value })}
                          className="w-full h-10 border rounded-lg px-2"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">TANGGAL LAHIR *</label>
                        <input
                          type="date"
                          required
                          value={newPegawaiForm.tanggalLahir}
                          onChange={(e) => setNewPegawaiForm({ ...newPegawaiForm, tanggalLahir: e.target.value })}
                          className="w-full h-10 border rounded-lg px-2"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">NIP (18 DIGIT) *</label>
                        <input
                          type="text"
                          required
                          maxLength={18}
                          value={newPegawaiForm.nip}
                          onChange={(e) => setNewPegawaiForm({ ...newPegawaiForm, nip: e.target.value.replace(/\D/g, '') })}
                          className="w-full h-10 border rounded-lg px-2 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">NIK KTP (16 DIGIT) *</label>
                        <input
                          type="text"
                          required
                          maxLength={16}
                          value={newPegawaiForm.nik}
                          onChange={(e) => setNewPegawaiForm({ ...newPegawaiForm, nik: e.target.value.replace(/\D/g, '') })}
                          className="w-full h-10 border rounded-lg px-2 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">INSTANSI</label>
                        <select
                          value={session?.role === 'admin_instansi' ? session.instansiId : newPegawaiForm.instansiId}
                          onChange={(e) => setNewPegawaiForm({ ...newPegawaiForm, instansiId: e.target.value })}
                          disabled={session?.role === 'admin_instansi'}
                          className="w-full h-10 border rounded-lg px-2 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                        >
                          {instansiList.map(ins => (
                            <option key={ins.id} value={ins.id}>{ins.namaInstansi}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">STATUS ASN</label>
                        <select
                          value={newPegawaiForm.statusPegawai}
                          onChange={(e) => setNewPegawaiForm({ ...newPegawaiForm, statusPegawai: e.target.value })}
                          className="w-full h-10 border rounded-lg px-2 bg-white"
                        >
                          <option value="PNS">PNS</option>
                          <option value="PPPK">PPPK</option>
                          <option value="PPPK Paruh Waktu">PPPK Paruh Waktu</option>
                          <option value="CPNS">CPNS</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">HAK AKSES / ROLE</label>
                          <select
                            value={newPegawaiForm.role}
                            onChange={(e) => setNewPegawaiForm({ ...newPegawaiForm, role: e.target.value })}
                            className="w-full h-10 border rounded-lg px-2 bg-white"
                          >
                            <option value="pegawai">pegawai</option>
                            <option value="admin_instansi">admin_instansi</option>
                            {session.role === 'super_admin' && <option value="super_admin">super_admin</option>}
                          </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">JABATAN</label>
                        <input
                          type="text"
                          value={newPegawaiForm.jabatan}
                          onChange={(e) => setNewPegawaiForm({ ...newPegawaiForm, jabatan: e.target.value })}
                          placeholder="Guru, Operator, Staf..."
                          className="w-full h-10 border rounded-lg px-2"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">PANGKAT GOLONGAN</label>
                        <input
                          type="text"
                          value={newPegawaiForm.pangkatGolongan}
                          onChange={(e) => setNewPegawaiForm({ ...newPegawaiForm, pangkatGolongan: e.target.value })}
                          placeholder="Penata / III.c..."
                          className="w-full h-10 border rounded-lg px-2"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowAddPegawai(false)}
                        className="flex-1 h-11 border rounded-xl font-bold"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={addingPegawaiProcess}
                        className="flex-1 h-11 bg-[#1d4ed8] text-white rounded-xl font-bold"
                      >
                        {addingPegawaiProcess ? 'Mendaftarkan...' : 'Konfirmasi Pendaftaran'}
                      </button>
                    </div>

                  </form>
                </div>
              )}

              {/* Employees List UI desktop/mobile wrapper */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
                
                {/* Search query parameters */}
                <div className="p-4 border-b border-slate-50 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                      placeholder="Cari NIP, nama pegawai..."
                      className="w-full h-10 border border-slate-100 rounded-xl pl-9 pr-4 text-xs font-medium focus:ring-0"
                    />
                  </div>
                </div>

                {/* Render employee cards lists */}
                {(() => {
                  const filtered = allEmployees.filter(p => {
                    const matchQuery =
                      p.namaPegawai.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                      p.nip.includes(adminSearchQuery);
                    return matchQuery;
                  });

                  if (filtered.length === 0) {
                    return <EmptyState title="Pegawai Tidak Ditemukan" description="Silakan periksa kembali kata kunci pencarian Anda." />;
                  }

                  return (
                    <div className="divide-y divide-slate-100 text-xs">
                      {filtered.map(p => (
                        <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-800 text-sm leading-snug">{p.namaPegawai}</span>
                              <span className="inline-block text-[8px] font-black tracking-wider uppercase bg-blue-50 text-[#1d4ed8] px-1.5 py-0.5 rounded">
                                {p.statusPegawai}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 font-mono">
                              NIP: <span className="text-slate-600 font-semibold">{p.nip}</span>
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{p.namaInstansi}</p>
                          </div>

                          <div className="text-right sm:text-right flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto pt-2 sm:pt-0 border-t border-slate-50 sm:border-0">
                            <div>
                              <p className="text-slate-700 font-semibold">{p.jabatan}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Gol: {p.pangkatGolongan}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditPegawai(p)}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => { setDeletePegawaiId(p.id); setShowDeleteConfirm(true); }}
                                className="text-[10px] font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg"
                              >
                                Hapus
                              </button>
                              <span className={`w-2.5 h-2.5 rounded-full ${p.statusAktif ? 'bg-green-500' : 'bg-red-500'}`} title={p.statusAktif ? 'Pegawai Aktif' : 'Pegawai Tidak Aktif'}></span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

              </div>

            </div>
          )}

          {/* PAGE C. BUP (BATAS USIA PENSIUN) */}
          {adminTab === 'bup' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Batas Usia Pensiun (BUP)</h3>
                  <p className="text-xs text-slate-400 mt-1">Daftar pegawai berdasarkan urutan pensiun terdekat</p>
                </div>
                <button
                  onClick={() => {
                    setBupData([]);
                    setBupLoading(true);
                    fetch('/api/admin/bup')
                      .then(r => r.json())
                      .then(setBupData)
                      .catch(() => {})
                      .finally(() => setBupLoading(false));
                  }}
                  className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                >
                  {bupLoading ? 'Memuat...' : 'Muat Ulang'}
                </button>
              </div>

              {bupLoading ? (
                <Loading />
              ) : bupData.length === 0 ? (
                <EmptyState title="Tidak ada data" description="Klik 'Muat Ulang' untuk memuat data BUP." />
              ) : (
                <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                          <th className="p-3">Nama Pegawai</th>
                          <th className="p-3">NIP</th>
                          <th className="p-3">Tgl. Lahir</th>
                          <th className="p-3">Usia</th>
                          <th className="p-3">Mulai Pensiun</th>
                          <th className="p-3">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bupData.map((item: any) => (
                          <tr key={item.pegawaiId} className="hover:bg-slate-50">
                            <td className="p-3 font-semibold text-slate-800">{item.namaPegawai}</td>
                            <td className="p-3 font-mono text-slate-600">{item.nip}</td>
                            <td className="p-3 text-slate-600">{item.tanggalLahir ? new Date(item.tanggalLahir).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</td>
                            <td className="p-3">
                              <span className="font-bold">{item.usia}</span>
                              <span className="text-slate-400"> / {item.usiaPensiun} thn</span>
                            </td>
                            <td className="p-3 font-mono text-slate-700">{item.mulaiPensiun ? new Date(item.mulaiPensiun).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className={`inline-block w-2 h-2 rounded-full ${
                                  (() => { const y = parseInt(item.sisa?.split(' ')[0] || '99'); return y < 1 ? 'bg-red-500' : y < 2 ? 'bg-amber-500' : 'bg-green-500'; })()
                                }`} />
                                <span className="text-slate-600 text-[11px]">{item.sisa}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PAGE D. REKAP KELENGKAPAN PANEL */}
          {adminTab === 'rekap' && (
            <div className="space-y-4 animate-fade-in">
              
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Rekapitulasi Kelengkapan Pegawai</h3>
                  <p className="text-xs text-slate-400 mt-1">Pantau persentase kontribusi berkas digital seluruh instansi</p>
                </div>
                <button
                  onClick={exportToCSV}
                  className="h-10 px-3.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow"
                >
                  <Download className="w-4 h-4" />
                  Export .CSV (Excel)
                </button>
              </div>

              {/* Table stats */}
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <th className="p-3">NIP & Nama Pegawai</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-center">Arsip (Valid)</th>
                        <th className="p-3 text-center">Wajib (Valid)</th>
                        <th className="p-3 text-right">Kelengkapan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rekapData.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-3">
                            <span className="font-extrabold text-slate-800 block text-[13px]">{r.namaPegawai}</span>
                            <span className="font-mono text-[10px] text-slate-400 leading-none inline-block">NIP: {r.nip}</span>
                          </td>
                          <td className="p-3">
                            <span className="inline-block text-[9px] font-bold bg-blue-50 text-[#1d4ed8] px-1.5 py-0.5 rounded">
                              {r.statusPegawai}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-600">
                            {r.jumlahArsipUploaded} <span className="text-[10px] font-normal text-slate-400">({r.jumlahArsipValid})</span>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-600">
                            {r.jumlahWajibValid} / {r.jumlahWajib}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className={`font-mono font-black text-sm ${
                                r.persentaseKelengkapan === 100 ? 'text-green-600' : 'text-slate-700'
                              }`}>{r.persentaseKelengkapan}%</span>
                              <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden inline-block">
                                <div
                                  className={`h-full rounded-full ${r.persentaseKelengkapan === 100 ? 'bg-green-600' : 'bg-blue-600'}`}
                                  style={{ width: `${r.persentaseKelengkapan}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* PAGE E. SEMUA BERKAS */}
          {adminTab === 'berkas' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Semua Berkas Pegawai</h3>
                  <p className="text-xs text-slate-400 mt-1">Total {allArchives.length} dokumen</p>
                </div>
                <input
                  type="text"
                  placeholder="Cari pegawai..."
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                  className="w-full sm:w-48 text-xs border rounded-xl px-3 py-2 focus:ring-1 outline-none"
                />
              </div>

              {(() => {
                // Group archives by pegawai
                const pegawaiStatusMap = new Map<string, string>();
                allEmployees.forEach(e => pegawaiStatusMap.set(e.id, e.statusPegawai || ''));
                const pegawaiMap = new Map<string, { id: string; nama: string; statusPegawai: string; arsip: typeof allArchives }>();
                allArchives.forEach(a => {
                  if (adminSearchQuery && !a.namaPegawai?.toLowerCase().includes(adminSearchQuery.toLowerCase())) return;
                  const key = a.pegawaiId;
                  if (!pegawaiMap.has(key)) pegawaiMap.set(key, { id: key, nama: a.namaPegawai || '', statusPegawai: pegawaiStatusMap.get(key) || '', arsip: [] });
                  pegawaiMap.get(key)!.arsip.push(a);
                });
                const pegawaiList = Array.from(pegawaiMap.values());

                if (pegawaiList.length === 0) {
                  return <EmptyState title="Tidak ada berkas" description="Tidak ditemukan berkas sesuai pencarian." />;
                }
                return (
                  <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                            <th className="p-3">Pegawai</th>
                            <th className="p-3">Total Berkas</th>
                            <th className="p-3 hidden sm:table-cell">Valid</th>
                            <th className="p-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pegawaiList.map(p => {
                            const isOpen = expandedPegawai === p.id;
                            const validCount = p.arsip.filter(a => a.statusValidasi === 'Valid').length;
                            return (
                              <Fragment key={p.id}>
                                <tr
                                  className="hover:bg-slate-50 cursor-pointer"
                                  onClick={() => setExpandedPegawai(isOpen ? null : p.id)}
                                >
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}>&#9654;</span>
                                      <span className="font-semibold text-slate-800">{p.nama}</span>
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <span className="font-bold text-slate-700">{p.arsip.length}</span>
                                  </td>
                                  <td className="p-3 hidden sm:table-cell">
                                    <span className="text-green-600 font-bold">{validCount}</span>
                                    <span className="text-slate-400"> / {p.arsip.length}</span>
                                  </td>
                                  <td className="p-3 text-right">
                                    <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                                      {isOpen ? 'Tutup' : 'Detail'}
                                    </span>
                                  </td>
                                </tr>
                                {isOpen && (
                                  <tr key={p.id + '_detail'}>
                                    <td colSpan={4} className="p-0">
                                      <div className="bg-slate-50 p-4">
                                        <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-3">
                                          Daftar Dokumen — {p.nama}
                                        </h4>
                                        <div className="space-y-1">
                                          {filterJenisDokumenByStatus(jenisDokumenList, p.statusPegawai).map(jd => {
                                            const match = p.arsip.find(a => a.jenisDokumen === jd.namaDokumen);
                                            return (
                                              <div key={jd.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-white border border-slate-100">
                                                <div className="flex items-center gap-2 min-w-0">
                                                  <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${
                                                    match?.statusValidasi === 'Valid' ? 'bg-green-500' :
                                                    match ? 'bg-yellow-400' : 'bg-slate-200'
                                                  }`} />
                                                  <span className={`text-xs ${match ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                                                    {jd.namaDokumen}
                                                  </span>
                                                  {jd.wajib && <span className="text-[8px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">WAJIB</span>}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                  {match ? (
                                                    <>
                                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                        match.statusValidasi === 'Valid' ? 'bg-green-100 text-green-700' :
                                                        match.statusValidasi === 'Perlu Perbaikan' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                      }`}>{match.statusValidasi}</span>
                                                      <button
                                                        onClick={(e) => { e.stopPropagation(); openFileViewer(match.id, match.downloadUrl); }}
                                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase"
                                                      >
                                                        Lihat
                                                      </button>
                                                    </>
                                                  ) : (
                                                    <span className="text-[10px] text-slate-300 italic">Belum upload</span>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* PAGE F. KATEGORI ARSIP PANEL */}
          {adminTab === 'kategori' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Master Kategori Kearsipan ASN</h3>
                  <p className="text-xs text-slate-400 mt-1">Grup dan Kategori yang didaftarkan dalam sistem</p>
                </div>
                {session?.role === 'super_admin' && (
                  <button onClick={() => { setEditKategori(null); setKategoriForm({ namaKategori: '', urutan: 0 }); setShowKategoriModal(true); }} className="text-xs bg-[#0f2a44] text-white px-3 py-1.5 rounded-lg font-bold hover:bg-[#1a3d5e] whitespace-nowrap">
                    + Kategori
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {kategoriList.map(cat => (
                  <div key={cat.id} className="bg-white p-4 rounded-xl border border-slate-100 text-xs shadow-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-50 mb-2">
                      <span className="font-extrabold text-slate-800 uppercase tracking-wide">
                        {cat.namaKategori}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-100 px-2.5 py-0.5 rounded text-[10px] font-bold text-slate-500">
                          Urutan {cat.urutan}
                        </span>
                        {session?.role === 'super_admin' && (
                          <>
                            <button onClick={() => { setEditKategori(cat); setKategoriForm({ namaKategori: cat.namaKategori, urutan: cat.urutan }); setShowKategoriModal(true); }} className="text-[#0f2a44] hover:underline text-[10px]">Edit</button>
                            <button onClick={() => setConfirmDelete({ type: 'kategori', id: cat.id, nama: cat.namaKategori })} className="text-red-500 hover:underline text-[10px]">Hapus</button>
                            <button onClick={() => { setEditJenis(null); setJenisForm({ kategoriId: cat.id, namaDokumen: '', berlakuUntuk: 'Semua', wajib: false }); setShowJenisModal(true); }} className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-lg font-bold hover:bg-emerald-700">+ Dokumen</button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {jenisDokumenList.filter(jd => jd.kategoriId === cat.id || jd.namaKategori === cat.namaKategori).map(jd => (
                        <span key={jd.id} className={`inline-flex items-center gap-1 py-1 px-2 rounded-lg font-semibold text-[10px] ${
                          jd.wajib ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-slate-500 border'
                        }`}>
                          {jd.namaDokumen} {jd.wajib ? '(Wajib)' : ''}
                          {session?.role === 'super_admin' && (
                            <button onClick={() => { setEditJenis(jd); setJenisForm({ kategoriId: jd.kategoriId, namaDokumen: jd.namaDokumen, berlakuUntuk: jd.berlakuUntuk, wajib: jd.wajib }); setShowJenisModal(true); }} className="text-[#0f2a44] hover:underline ml-1">✎</button>
                          )}
                          {session?.role === 'super_admin' && (
                            <button onClick={() => setConfirmDelete({ type: 'jenis', id: jd.id, nama: jd.namaDokumen })} className="text-red-400 hover:text-red-600 ml-0.5">✕</button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Kategori Modal */}
              {showKategoriModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
                  <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl">
                    <h4 className="text-sm font-bold text-slate-800 mb-4">{editKategori ? 'Edit Kategori' : 'Tambah Kategori'}</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nama Kategori</label>
                        <input value={kategoriForm.namaKategori} onChange={e => setKategoriForm(p => ({ ...p, namaKategori: e.target.value }))} className="w-full h-10 border rounded-xl px-3 text-sm mt-1" placeholder="Contoh: Riwayat Karier" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Urutan</label>
                        <input type="number" value={kategoriForm.urutan} onChange={e => setKategoriForm(p => ({ ...p, urutan: parseInt(e.target.value) || 0 }))} className="w-full h-10 border rounded-xl px-3 text-sm mt-1" />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-5">
                      <button onClick={() => setShowKategoriModal(false)} className="flex-1 h-10 border rounded-xl text-sm font-bold">Batal</button>
                      <button onClick={async () => {
                        try {
                          if (editKategori) {
                            await fetch(`/api/admin/kategori/${editKategori.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(kategoriForm) });
                          } else {
                            await fetch('/api/admin/kategori', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(kategoriForm) });
                          }
                          setShowKategoriModal(false);
                          const res = await fetch('/api/kategori'); setKategoriList(await res.json());
                          showToast(editKategori ? 'Kategori diperbarui' : 'Kategori ditambahkan');
                        } catch { showToast('Gagal menyimpan kategori', 'error'); }
                      }} className="flex-1 h-10 bg-[#0f2a44] text-white rounded-xl text-sm font-bold">Simpan</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Jenis Dokumen Modal */}
              {showJenisModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
                  <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl">
                    <h4 className="text-sm font-bold text-slate-800 mb-4">{editJenis ? 'Edit Jenis Dokumen' : 'Tambah Jenis Dokumen'}</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nama Dokumen</label>
                        <input value={jenisForm.namaDokumen} onChange={e => setJenisForm(p => ({ ...p, namaDokumen: e.target.value }))} className="w-full h-10 border rounded-xl px-3 text-sm mt-1" placeholder="Contoh: SK CPNS/PNS" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Berlaku Untuk</label>
                        <select value={jenisForm.berlakuUntuk} onChange={e => setJenisForm(p => ({ ...p, berlakuUntuk: e.target.value }))} className="w-full h-10 border rounded-xl px-3 text-sm mt-1">
                          <option value="Semua">Semua</option>
                          <option value="PNS">PNS</option>
                          <option value="PPPK">PPPK</option>
                          <option value="CPNS">CPNS</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={jenisForm.wajib} onChange={e => setJenisForm(p => ({ ...p, wajib: e.target.checked }))} id="wajib" className="w-4 h-4" />
                        <label htmlFor="wajib" className="text-xs font-bold text-slate-600">Wajib</label>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-5">
                      <button onClick={() => setShowJenisModal(false)} className="flex-1 h-10 border rounded-xl text-sm font-bold">Batal</button>
                      <button onClick={async () => {
                        try {
                          if (editJenis) {
                            await fetch(`/api/admin/jenis-dokumen/${editJenis.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(jenisForm) });
                          } else {
                            await fetch('/api/admin/jenis-dokumen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...jenisForm, kategoriId: jenisForm.kategoriId, namaKategori: kategoriList.find(k => k.id === jenisForm.kategoriId)?.namaKategori || '' }) });
                          }
                          setShowJenisModal(false);
                          const res = await fetch('/api/jenis-dokumen'); setJenisDokumenList(await res.json());
                          showToast(editJenis ? 'Jenis dokumen diperbarui' : 'Jenis dokumen ditambahkan');
                        } catch { showToast('Gagal menyimpan jenis dokumen', 'error'); }
                      }} className="flex-1 h-10 bg-[#0f2a44] text-white rounded-xl text-sm font-bold">Simpan</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirm Delete */}
              {confirmDelete && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
                  <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl">
                    <h4 className="text-sm font-bold text-slate-800 mb-2">Konfirmasi Hapus</h4>
                    <p className="text-xs text-slate-500">Yakin ingin menghapus <strong>{confirmDelete.nama}</strong>?</p>
                    <div className="flex gap-2 mt-5">
                      <button onClick={() => setConfirmDelete(null)} className="flex-1 h-10 border rounded-xl text-sm font-bold">Batal</button>
                      <button onClick={async () => {
                        try {
                          if (confirmDelete.type === 'kategori') {
                            await fetch(`/api/admin/kategori/${confirmDelete.id}`, { method: 'DELETE' });
                            const res = await fetch('/api/kategori'); setKategoriList(await res.json());
                            const res2 = await fetch('/api/jenis-dokumen'); setJenisDokumenList(await res2.json());
                          } else {
                            await fetch(`/api/admin/jenis-dokumen/${confirmDelete.id}`, { method: 'DELETE' });
                            const res = await fetch('/api/jenis-dokumen'); setJenisDokumenList(await res.json());
                          }
                          setConfirmDelete(null);
                          showToast('Berhasil dihapus');
                        } catch { showToast('Gagal menghapus', 'error'); }
                      }} className="flex-1 h-10 bg-red-600 text-white rounded-xl text-sm font-bold">Hapus</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PAGE F. LOGS PANEL */}
          {adminTab === 'logs' && (
            <div className="space-y-4 animate-fade-in">
              
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                <h3 className="text-sm font-bold text-slate-800">Riwayat Digital & Audit Trail</h3>
                <p className="text-xs text-slate-400 mt-1">Jalur verifikasi dan mutasi dokumen ASN yang tercatat</p>
              </div>

              {/* Table of logs */}
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <th className="p-3">Tanggal</th>
                        <th className="p-3">Pegawai</th>
                        <th className="p-3 col-span-2">Aksi & Keterangan Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 divide-opacity-65 font-mono">
                      {systemLogs.map((lg) => (
                        <tr key={lg.id} className="hover:bg-slate-50 text-[11px]">
                          <td className="p-3 text-slate-400 whitespace-nowrap">
                            {new Date(lg.tanggal).toLocaleString('id-ID')}
                          </td>
                          <td className="p-3">
                            <span className="font-extrabold text-slate-800 block text-xs">{lg.namaPegawai}</span>
                            <span className="text-[10px] text-slate-400">NIP: {lg.nip}</span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mr-2 uppercase ${
                              lg.aksi === 'LOGIN' ? 'bg-green-50 text-green-700' :
                              lg.aksi === 'UPLOAD_ARSIP' ? 'bg-blue-50 text-blue-700' :
                              lg.aksi === 'VALIDASI_ARSIP' ? 'bg-purple-50 text-purple-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>{lg.aksi}</span>
                            <span className="text-slate-600 text-xs font-sans tracking-tight">{lg.detail}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* PAGE G. ADMIN PROFILE */}
          {adminTab === 'profil' && profile && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#1d4ed8] rounded-full text-white text-xl font-bold flex items-center justify-center shadow">
                  {profile.namaPegawai.substring(0, 2).toUpperCase()}
                </div>
                <h3 className="text-base font-extrabold text-slate-800 mt-3">{profile.namaPegawai}</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-1">NIP: {profile.nip}</p>
                <div className="mt-2.5 flex items-center gap-1.5">
                  <span className="bg-blue-50 text-[#1d4ed8] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">{profile.statusPegawai}</span>
                  <span className="bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">{profile.pangkatGolongan}</span>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs divide-y divide-slate-50">
                <div className="px-4 py-3 bg-slate-50 text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Riwayat & Jabatan Kerja</div>
                <div className="p-4 py-3 text-xs grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-semibold">Instansi</span>
                  <span className="col-span-2 text-slate-700 font-bold">{profile.namaInstansi}</span>
                </div>
                <div className="p-4 py-3 text-xs grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-semibold">Jabatan</span>
                  <span className="col-span-2 text-slate-700 font-bold">{profile.jabatan}</span>
                </div>
                <div className="p-4 py-3 text-xs grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-semibold">Tgl Lahir</span>
                  <span className="col-span-2 text-slate-700 font-mono font-bold">{profile.tanggalLahir}</span>
                </div>
                <div className="p-4 py-3 text-xs grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-semibold">Kelamin</span>
                  <span className="col-span-2 text-slate-700 font-bold">{profile.jenisKelamin}</span>
                </div>
                <div className="p-4 py-3 text-xs grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-semibold">Pendidikan</span>
                  <span className="col-span-2 text-slate-700 font-bold">{profile.pendidikanTerakhir}</span>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                  <h4 className="text-xs font-black text-[#0f2a44] uppercase">Biodata ASN</h4>
                  <button onClick={() => {
                      setProfileForm({ namaPegawai: profile.namaPegawai || '', jabatan: profile.jabatan || '', statusPegawai: profile.statusPegawai || '', pangkatGolongan: profile.pangkatGolongan || '', pendidikanTerakhir: profile.pendidikanTerakhir || '', nomorHp: profile.nomorHp || '', email: profile.email || '', alamat: profile.alamat || '', namaInstansi: profile.namaInstansi || '' });
                      setProfileEditing(!profileEditing);
                    }} className="text-xs text-[#1d4ed8] font-bold">
                    {profileEditing ? 'Batal' : 'Edit Profil'}
                  </button>
                </div>
                {!profileEditing ? (
                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center gap-2.5 text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{profile.nomorHp || 'Belum diisi'}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>{profile.email || 'Belum diisi'}</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                      <span className="leading-relaxed">{profile.alamat || 'Belum diisi'}</span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateProfile} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Lengkap</label>
                      <input type="text" value={profileForm.namaPegawai} onChange={e => setProfileForm(p => ({ ...p, namaPegawai: e.target.value }))} className="w-full h-10 border border-slate-200 rounded-lg px-3 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jabatan</label>
                      <input type="text" value={profileForm.jabatan} onChange={e => setProfileForm(p => ({ ...p, jabatan: e.target.value }))} className="w-full h-10 border border-slate-200 rounded-lg px-3 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status Kepegawaian</label>
                      <select value={profileForm.statusPegawai} onChange={e => setProfileForm(p => ({ ...p, statusPegawai: e.target.value }))} className="w-full h-10 border border-slate-200 rounded-lg px-3 text-xs bg-white">
                        <option value="">Pilih status</option>
                        <option value="PNS">PNS</option>
                        <option value="PPPK">PPPK</option>
                        <option value="PPPK Paruh Waktu">PPPK Paruh Waktu</option>
                        <option value="CPNS">CPNS</option>
                        <option value="Honor Daerah TK.II Kab/Kota">Honor Daerah TK.II Kab/Kota</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pangkat / Golongan</label>
                      <input type="text" value={profileForm.pangkatGolongan} onChange={e => setProfileForm(p => ({ ...p, pangkatGolongan: e.target.value }))} className="w-full h-10 border border-slate-200 rounded-lg px-3 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pendidikan Terakhir</label>
                      <input type="text" value={profileForm.pendidikanTerakhir} onChange={e => setProfileForm(p => ({ ...p, pendidikanTerakhir: e.target.value }))} className="w-full h-10 border border-slate-200 rounded-lg px-3 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Instansi / Unit</label>
                      <input type="text" value={profileForm.namaInstansi} onChange={e => setProfileForm(p => ({ ...p, namaInstansi: e.target.value }))} className="w-full h-10 border border-slate-200 rounded-lg px-3 text-xs" />
                    </div>
                    <hr className="border-slate-100" />
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nomor HP</label>
                      <input type="text" value={profileForm.nomorHp} onChange={e => setProfileForm(p => ({ ...p, nomorHp: e.target.value }))} className="w-full h-10 border border-slate-200 rounded-lg px-3 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Surel / Email</label>
                      <input type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} className="w-full h-10 border border-slate-200 rounded-lg px-3 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Alamat Tinggal</label>
                      <textarea value={profileForm.alamat} onChange={e => setProfileForm(p => ({ ...p, alamat: e.target.value }))} className="w-full border border-slate-200 rounded-lg p-2 text-xs min-h-[60px]" />
                    </div>
                    <button type="submit" className="w-full h-10 bg-[#1d4ed8] text-white text-xs font-bold rounded-lg">Simpan Perubahan</button>
                  </form>
                )}
              </div>
            </div>
          )}

            </div>
          </PullToRefresh>
        </main>

      </div>

      {/* Persistent Admin footer brand */}
      <footer className="bg-slate-100 py-3.5 text-center text-[7px] text-slate-400 border-t mt-8">
        Tim Kerja Bidang SD Kecamatan Lemahabang • Arsip Digital ASN Integrated V1.2
      </footer>

      {/* EDIT PEGAWAI MODAL */}
      {showEditPegawai && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl'>
            <div className='p-5 border-b border-slate-100 flex items-center justify-between'>
              <h3 className='text-sm font-extrabold text-slate-800'>Edit Data Pegawai</h3>
              <button onClick={() => setShowEditPegawai(false)} className='text-slate-400 hover:text-slate-600'>&times;</button>
            </div>
            <form onSubmit={handleUpdatePegawai} className='p-5 space-y-3 text-xs'>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-[10px] font-bold text-slate-600 mb-1'>NAMA LENGKAP</label>
                  <input type='text' required value={editPegawaiForm.namaPegawai || ''} onChange={(e) => setEditPegawaiForm({...editPegawaiForm, namaPegawai: e.target.value})} className='w-full h-10 border rounded-lg px-2' />
                </div>
                <div>
                  <label className='block text-[10px] font-bold text-slate-600 mb-1'>TANGGAL LAHIR</label>
                  <input type='date' value={editPegawaiForm.tanggalLahir || ''} onChange={(e) => setEditPegawaiForm({...editPegawaiForm, tanggalLahir: e.target.value})} className='w-full h-10 border rounded-lg px-2' />
                </div>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-[10px] font-bold text-slate-600 mb-1'>NIP</label>
                  <input type='text' required value={editPegawaiForm.nip || ''} onChange={(e) => setEditPegawaiForm({...editPegawaiForm, nip: e.target.value.replace(/\D/g, '')})} maxLength={18} className='w-full h-10 border rounded-lg px-2 font-mono' />
                </div>
                <div>
                  <label className='block text-[10px] font-bold text-slate-600 mb-1'>NIK KTP</label>
                  <input type='text' required value={editPegawaiForm.nik || ''} onChange={(e) => setEditPegawaiForm({...editPegawaiForm, nik: e.target.value.replace(/\D/g, '')})} maxLength={16} className='w-full h-10 border rounded-lg px-2 font-mono' />
                </div>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-[10px] font-bold text-slate-600 mb-1'>JENIS KELAMIN</label>
                  <select value={editPegawaiForm.jenisKelamin || 'Laki-laki'} onChange={(e) => setEditPegawaiForm({...editPegawaiForm, jenisKelamin: e.target.value})} className='w-full h-10 border rounded-lg px-2 bg-white'>
                    <option value='Laki-laki'>Laki-laki</option>
                    <option value='Perempuan'>Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className='block text-[10px] font-bold text-slate-600 mb-1'>STATUS ASN</label>
                  <select value={editPegawaiForm.statusPegawai || 'PNS'} onChange={(e) => setEditPegawaiForm({...editPegawaiForm, statusPegawai: e.target.value})} className='w-full h-10 border rounded-lg px-2 bg-white'>
                    <option value='PNS'>PNS</option>
                    <option value='PPPK'>PPPK</option>
                    <option value='PPPK Paruh Waktu'>PPPK Paruh Waktu</option>
                    <option value='CPNS'>CPNS</option>
                  </select>
                </div>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-[10px] font-bold text-slate-600 mb-1'>JABATAN</label>
                  <input type='text' value={editPegawaiForm.jabatan || ''} onChange={(e) => setEditPegawaiForm({...editPegawaiForm, jabatan: e.target.value})} className='w-full h-10 border rounded-lg px-2' />
                </div>
                <div>
                  <label className='block text-[10px] font-bold text-slate-600 mb-1'>PANGKAT GOLONGAN</label>
                  <input type='text' value={editPegawaiForm.pangkatGolongan || ''} onChange={(e) => setEditPegawaiForm({...editPegawaiForm, pangkatGolongan: e.target.value})} className='w-full h-10 border rounded-lg px-2' />
                </div>
              </div>
              <div>
                <label className='block text-[10px] font-bold text-slate-600 mb-1'>PASSWORD BARU (kosongkan jika tidak diubah)</label>
                <input type='text' value={editPegawaiForm.password || ''} onChange={(e) => setEditPegawaiForm({...editPegawaiForm, password: e.target.value})} className='w-full h-10 border rounded-lg px-2' />
              </div>
              <div className='flex gap-2.5 pt-3'>
                <button type='button' onClick={() => setShowEditPegawai(false)} className='flex-1 h-11 border rounded-xl font-bold'>Batal</button>
                <button type='submit' className='flex-1 h-11 bg-[#1d4ed8] text-white rounded-xl font-bold'>Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl text-center'>
            <div className='w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center'>
              <span className='text-red-600 text-xl font-bold'>!</span>
            </div>
            <h3 className='text-sm font-extrabold text-slate-800 mb-2'>Hapus Pegawai</h3>
            <p className='text-xs text-slate-500 mb-6'>Apakah Anda yakin ingin menghapus pegawai ini? Semua arsip terkait juga akan dihapus.</p>
            <div className='flex gap-3'>
              <button onClick={() => { setShowDeleteConfirm(false); setDeletePegawaiId(null); }} className='flex-1 h-11 border rounded-xl font-bold text-xs'>Batal</button>
              <button onClick={handleDeletePegawai} className='flex-1 h-11 bg-red-600 text-white rounded-xl font-bold text-xs'>Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX FILE VIEWER */}
      {activeFileUrl && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex flex-col justify-between p-4">
          <div className="flex justify-between items-center text-white mb-2">
            <span className="text-xs font-bold truncate max-w-[250px]">{activeFileName}</span>
            <button
              onClick={() => {
                setActiveFileUrl(null);
                setActiveFileName(null);
              }}
              className="bg-slate-800 p-2.5 rounded-full font-bold text-xs hover:bg-slate-700 transition"
            >
              Tutup [X]
            </button>
          </div>
          
          <div className="flex-1 bg-white rounded-xl overflow-hidden flex items-center justify-center relative">
            {activeFileUrl.endsWith('.pdf') || activeFileUrl.includes('pdf') || activeFileUrl.includes('download') ? (
              <iframe
                src={activeFileUrl}
                className="w-full h-full"
                title="Document Preview"
                referrerPolicy="no-referrer"
              />
            ) : (
              <img
                src={activeFileUrl}
                alt="Previa berkas"
                className="max-w-full max-h-full object-contain"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
          
          <div className="text-center text-slate-400 text-[10px] mt-2 font-mono">
            Sistem Keamanan Berkas Digital - Enkripsi Sesi
          </div>
        </div>
      )}

    </div>
  );
}
