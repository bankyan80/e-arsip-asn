'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Download, Eye, Trash2, Send, Calendar, Building,
  Filter, X, Pencil, Plus, Save, FileText, Tag,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

// ===== Tipe Data =====
interface SuratKeluar {
  id: string;
  nomorSurat: string;
  tujuan: string;
  perihal: string;
  tanggalKeluar: string;
  tanggalSurat: string;
  pembuat: string;
  sifat: 'Biasa' | 'Penting' | 'Rahasia';
  status: 'Draft' | 'Terkirim' | 'Dibatalkan';
  fileUrl?: string;
  keterangan?: string;
}

const SIFAT_OPTIONS = ['Semua', 'Biasa', 'Penting', 'Rahasia'];
const STATUS_OPTIONS = ['Semua', 'Draft', 'Terkirim', 'Dibatalkan'];

// ===== Data Awal (Dummy) =====
const INITIAL_DATA: SuratKeluar[] = [
  {
    id: '1', nomorSurat: '025/DISDIK-KAB/IV/2026', tujuan: 'Dinas Pendidikan Provinsi',
    perihal: 'Laporan Realisasi Anggaran Triwulan I', tanggalKeluar: '2026-04-21',
    tanggalSurat: '2026-04-20', pembuat: 'Admin', sifat: 'Penting',
    status: 'Terkirim', keterangan: 'Lampiran laporan keuangan dan fisik',
  },
  {
    id: '2', nomorSurat: '030/DISDIK-KAB/IV/2026', tujuan: 'SD Negeri 1 Lemahabang',
    perihal: 'Surat Tugas Pembinaan', tanggalKeluar: '2026-04-22',
    tanggalSurat: '2026-04-22', pembuat: 'Admin', sifat: 'Biasa',
    status: 'Draft', keterangan: 'Pembinaan 28 April 2026',
  },
  {
    id: '3', nomorSurat: '028/DISDIK-KAB/IV/2026', tujuan: 'Sekretariat Daerah',
    perihal: 'Usulan Kenaikan Pangkat', tanggalKeluar: '2026-04-18',
    tanggalSurat: '2026-04-17', pembuat: 'Admin', sifat: 'Rahasia',
    status: 'Terkirim', keterangan: 'Usulan periode April 2026',
  },
];

// ===== Komponen Badge =====
function SifatBadge({ sifat }: { sifat: SuratKeluar['sifat'] }) {
  const map = {
    Biasa: 'text-sky-600 border-sky-300 bg-sky-50',
    Penting: 'text-amber-600 border-amber-300 bg-amber-50',
    Rahasia: 'text-red-600 border-red-300 bg-red-50',
  };
  return <Badge variant="outline" className={map[sifat]}>{sifat}</Badge>;
}

function StatusBadge({ status }: { status: SuratKeluar['status'] }) {
  const map = {
    Draft: 'text-gray-600 border-gray-300',
    Terkirim: 'bg-emerald-500 hover:bg-emerald-600',
    Dibatalkan: 'bg-red-500 hover:bg-red-600',
  };
  if (status === 'Draft') return <Badge variant="outline" className={map[status]}>Draft</Badge>;
  return <Badge className={map[status]}>{status}</Badge>;
}

// ===== Form Kosong =====
const EMPTY_FORM: Omit<SuratKeluar, 'id'> = {
  nomorSurat: '', tujuan: '', perihal: '', tanggalKeluar: '',
  tanggalSurat: '', pembuat: 'Admin', sifat: 'Biasa', status: 'Draft', keterangan: '',
};

export default function SuratKeluarPage() {
  // Data state
  const [data, setData] = useState<SuratKeluar[]>(INITIAL_DATA);

  // Filter & search
  const [search, setSearch] = useState('');
  const [sifatFilter, setSifatFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');

  // Modal detail
  const [selectedSurat, setSelectedSurat] = useState<SuratKeluar | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Modal form (tambah/edit)
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Konfirmasi hapus
  const [deleteTarget, setDeleteTarget] = useState<SuratKeluar | null>(null);

  // ===== Filter Logic =====
  const filteredData = useMemo(() => {
    return data.filter((s) => {
      const matchSearch = !search ||
        s.nomorSurat.toLowerCase().includes(search.toLowerCase()) ||
        s.tujuan.toLowerCase().includes(search.toLowerCase()) ||
        s.perihal.toLowerCase().includes(search.toLowerCase());
      const matchSifat = sifatFilter === 'Semua' || s.sifat === sifatFilter;
      const matchStatus = statusFilter === 'Semua' || s.status === statusFilter;
      return matchSearch && matchSifat && matchStatus;
    });
  }, [data, search, sifatFilter, statusFilter]);

  // ===== Handlers =====
  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (surat: SuratKeluar) => {
    setEditId(surat.id);
    setForm({
      nomorSurat: surat.nomorSurat,
      tujuan: surat.tujuan,
      perihal: surat.perihal,
      tanggalKeluar: surat.tanggalKeluar,
      tanggalSurat: surat.tanggalSurat,
      pembuat: surat.pembuat,
      sifat: surat.sifat,
      status: surat.status,
      keterangan: surat.keterangan || '',
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.nomorSurat || !form.tujuan || !form.perihal || !form.tanggalKeluar) {
      toast.error('Harap isi nomor surat, tujuan, perihal, dan tanggal keluar.');
      return;
    }

    if (editId) {
      // Update
      setData((prev) =>
        prev.map((s) => (s.id === editId ? { ...s, ...form } : s))
      );
      toast.success('Surat berhasil diperbarui.');
    } else {
      // Tambah baru
      const newSurat: SuratKeluar = {
        id: Date.now().toString(),
        ...form,
      };
      setData((prev) => [newSurat, ...prev]);
      toast.success('Surat baru berhasil ditambahkan.');
    }

    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setData((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    toast.success('Surat berhasil dihapus.');
    setDeleteTarget(null);
    setShowDetail(false);
    setSelectedSurat(null);
  };

  const totalDraft = data.filter((s) => s.status === 'Draft').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">📤 Surat Keluar</h2>
          <p className="text-sm text-muted-foreground">
            Kelola surat keluar • {totalDraft} draft • Total {data.length}
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 bg-[#3c6eff] hover:bg-[#2b54f5] text-white shadow-lg shadow-[#3c6eff]/25">
          <Plus className="h-4 w-4" />
          Buat Surat Baru
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nomor surat, tujuan, atau perihal..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Select value={sifatFilter} onValueChange={setSifatFilter}>
                <SelectTrigger className="h-10 w-32"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
                <SelectContent>{SIFAT_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-32"><Tag className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <ScrollArea className="h-[calc(100vh-320px)]">
          <div className="min-w-[800px]">
            <div className="flex items-center gap-3 border-b px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="w-40">No. Surat</div>
              <div className="flex-1">Tujuan / Perihal</div>
              <div className="w-28 text-center">Tgl Keluar</div>
              <div className="w-24 text-center">Sifat</div>
              <div className="w-24 text-center">Status</div>
              <div className="w-32 text-center">Aksi</div>
            </div>
            <div className="divide-y">
              {filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Send className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Tidak ada surat keluar</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Coba ubah kata kunci atau filter</p>
                </div>
              ) : (
                filteredData.map((surat) => (
                  <motion.div key={surat.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                    <div className="w-40">
                      <p className="text-sm font-semibold text-foreground">{surat.nomorSurat}</p>
                      <p className="text-xs text-muted-foreground">{surat.tanggalSurat}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{surat.perihal}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building className="h-3 w-3" /> {surat.tujuan}
                      </p>
                    </div>
                    <div className="w-28 text-center text-sm text-muted-foreground">
                      {new Date(surat.tanggalKeluar).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="w-24 text-center"><SifatBadge sifat={surat.sifat} /></div>
                    <div className="w-24 text-center"><StatusBadge status={surat.status} /></div>
                    <div className="w-32 flex justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-[#3c6eff]"
                        onClick={() => { setSelectedSurat(surat); setShowDetail(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                        onClick={() => openEdit(surat)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500"
                        onClick={() => setDeleteTarget(surat)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </ScrollArea>
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          Menampilkan {filteredData.length} dari {data.length} surat keluar
        </div>
      </Card>

      {/* ===== MODAL DETAIL ===== */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detail Surat Keluar</DialogTitle></DialogHeader>
          {selectedSurat && (
            <div className="space-y-4">
              <div className="flex justify-between">
                <SifatBadge sifat={selectedSurat.sifat} />
                <StatusBadge status={selectedSurat.status} />
              </div>
              <div><p className="text-xs text-muted-foreground">Nomor Surat</p><p className="text-sm font-semibold">{selectedSurat.nomorSurat}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Tanggal Surat</p><p className="text-sm">{selectedSurat.tanggalSurat}</p></div>
                <div><p className="text-xs text-muted-foreground">Tanggal Keluar</p><p className="text-sm">{selectedSurat.tanggalKeluar}</p></div>
              </div>
              <Separator />
              <div><p className="text-xs text-muted-foreground">Tujuan</p><p className="text-sm font-medium">{selectedSurat.tujuan}</p></div>
              <div><p className="text-xs text-muted-foreground">Pembuat</p><p className="text-sm">{selectedSurat.pembuat}</p></div>
              <div><p className="text-xs text-muted-foreground">Perihal</p><p className="text-sm font-medium">{selectedSurat.perihal}</p></div>
              {selectedSurat.keterangan && <div><p className="text-xs text-muted-foreground">Keterangan</p><p className="text-sm">{selectedSurat.keterangan}</p></div>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetail(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== MODAL FORM TAMBAH/EDIT ===== */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Surat Keluar' : 'Buat Surat Keluar Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nomorSurat">Nomor Surat *</Label>
              <Input id="nomorSurat" value={form.nomorSurat} onChange={(e) => setForm({ ...form, nomorSurat: e.target.value })} placeholder="Contoh: 025/DISDIK-KAB/IV/2026" />
            </div>
            <div>
              <Label htmlFor="tujuan">Tujuan *</Label>
              <Input id="tujuan" value={form.tujuan} onChange={(e) => setForm({ ...form, tujuan: e.target.value })} placeholder="Instansi/unit tujuan" />
            </div>
            <div>
              <Label htmlFor="perihal">Perihal *</Label>
              <Input id="perihal" value={form.perihal} onChange={(e) => setForm({ ...form, perihal: e.target.value })} placeholder="Perihal surat" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tanggalSurat">Tanggal Surat</Label>
                <Input id="tanggalSurat" type="date" value={form.tanggalSurat} onChange={(e) => setForm({ ...form, tanggalSurat: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="tanggalKeluar">Tanggal Keluar *</Label>
                <Input id="tanggalKeluar" type="date" value={form.tanggalKeluar} onChange={(e) => setForm({ ...form, tanggalKeluar: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="pembuat">Pembuat</Label>
              <Input id="pembuat" value={form.pembuat} onChange={(e) => setForm({ ...form, pembuat: e.target.value })} placeholder="Nama pembuat surat" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sifat</Label>
                <Select value={form.sifat} onValueChange={(val) => setForm({ ...form, sifat: val as SuratKeluar['sifat'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Biasa">Biasa</SelectItem>
                    <SelectItem value="Penting">Penting</SelectItem>
                    <SelectItem value="Rahasia">Rahasia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val as SuratKeluar['status'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Terkirim">Terkirim</SelectItem>
                    <SelectItem value="Dibatalkan">Dibatalkan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="keterangan">Keterangan</Label>
              <Input id="keterangan" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} placeholder="Keterangan tambahan" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            <Button onClick={handleSave} className="gap-2 bg-[#3c6eff] hover:bg-[#2b54f5] text-white">
              <Save className="h-4 w-4" /> Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== KONFIRMASI HAPUS ===== */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Yakin ingin menghapus surat <span className="font-semibold text-foreground">{deleteTarget?.nomorSurat}</span>?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}