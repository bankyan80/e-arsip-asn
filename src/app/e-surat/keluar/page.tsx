'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Download,
  Eye,
  Trash2,
  Send,
  Calendar,
  Building,
  Filter,
  X,
  Plus,
  FileText,
  Tag,
} from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// ===== Tipe Data Surat Keluar =====
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

// ===== Data Dummy =====
const DUMMY_SURAT_KELUAR: SuratKeluar[] = [
  {
    id: '1',
    nomorSurat: '025/DISDIK-KAB/IV/2026',
    tujuan: 'Dinas Pendidikan Provinsi',
    perihal: 'Laporan Realisasi Anggaran Triwulan I',
    tanggalKeluar: '2026-04-21',
    tanggalSurat: '2026-04-20',
    pembuat: 'Admin',
    sifat: 'Penting',
    status: 'Terkirim',
    keterangan: 'Lampiran laporan keuangan dan fisik',
  },
  {
    id: '2',
    nomorSurat: '030/DISDIK-KAB/IV/2026',
    tujuan: 'SD Negeri 1 Lemahabang',
    perihal: 'Surat Tugas Pembinaan',
    tanggalKeluar: '2026-04-22',
    tanggalSurat: '2026-04-22',
    pembuat: 'Admin',
    sifat: 'Biasa',
    status: 'Draft',
    keterangan: 'Pembinaan akan dilaksanakan 28 April 2026',
  },
  {
    id: '3',
    nomorSurat: '028/DISDIK-KAB/IV/2026',
    tujuan: 'Sekretariat Daerah',
    perihal: 'Usulan Kenaikan Pangkat',
    tanggalKeluar: '2026-04-18',
    tanggalSurat: '2026-04-17',
    pembuat: 'Admin',
    sifat: 'Rahasia',
    status: 'Terkirim',
    keterangan: 'Usulan periode April 2026',
  },
  {
    id: '4',
    nomorSurat: '035/DISDIK-KAB/IV/2026',
    tujuan: 'KPPN Cirebon',
    perihal: 'Pengajuan Pencairan Anggaran',
    tanggalKeluar: '2026-04-23',
    tanggalSurat: '2026-04-23',
    pembuat: 'Admin',
    sifat: 'Penting',
    status: 'Draft',
    keterangan: 'Pencairan untuk kegiatan bulan Mei',
  },
];

const SIFAT_OPTIONS = ['Semua', 'Biasa', 'Penting', 'Rahasia'];
const STATUS_OPTIONS = ['Semua', 'Draft', 'Terkirim', 'Dibatalkan'];

function getSifatBadge(sifat: SuratKeluar['sifat']) {
  switch (sifat) {
    case 'Biasa':
      return <Badge variant="outline" className="text-sky-600 border-sky-300 bg-sky-50">Biasa</Badge>;
    case 'Penting':
      return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Penting</Badge>;
    case 'Rahasia':
      return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">Rahasia</Badge>;
  }
}

function getStatusBadge(status: SuratKeluar['status']) {
  switch (status) {
    case 'Draft':
      return <Badge variant="outline" className="text-gray-600 border-gray-300">Draft</Badge>;
    case 'Terkirim':
      return <Badge className="bg-emerald-500 hover:bg-emerald-600">Terkirim</Badge>;
    case 'Dibatalkan':
      return <Badge className="bg-red-500 hover:bg-red-600">Dibatalkan</Badge>;
  }
}

export default function SuratKeluarPage() {
  const [search, setSearch] = useState('');
  const [sifatFilter, setSifatFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [selectedSurat, setSelectedSurat] = useState<SuratKeluar | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const filteredSurat = useMemo(() => {
    return DUMMY_SURAT_KELUAR.filter((s) => {
      const matchSearch =
        !search ||
        s.nomorSurat.toLowerCase().includes(search.toLowerCase()) ||
        s.tujuan.toLowerCase().includes(search.toLowerCase()) ||
        s.perihal.toLowerCase().includes(search.toLowerCase());
      const matchSifat = sifatFilter === 'Semua' || s.sifat === sifatFilter;
      const matchStatus = statusFilter === 'Semua' || s.status === statusFilter;
      return matchSearch && matchSifat && matchStatus;
    });
  }, [search, sifatFilter, statusFilter]);

  const handleViewDetail = (surat: SuratKeluar) => {
    setSelectedSurat(surat);
    setShowDetail(true);
  };

  const handleDelete = (id: string) => {
    toast.success('Surat berhasil dihapus');
    setShowDetail(false);
    setSelectedSurat(null);
  };

  const totalDraft = DUMMY_SURAT_KELUAR.filter((s) => s.status === 'Draft').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">📤 Surat Keluar</h2>
          <p className="text-sm text-muted-foreground">
            Kelola surat keluar • {totalDraft} draft
          </p>
        </div>
        <Button className="gap-2 bg-[#3c6eff] hover:bg-[#2b54f5] text-white shadow-lg shadow-[#3c6eff]/25">
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
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Select value={sifatFilter} onValueChange={setSifatFilter}>
                <SelectTrigger className="h-10 w-32">
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIFAT_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-32">
                  <Tag className="h-3.5 w-3.5 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <ScrollArea className="h-[calc(100vh-320px)]">
          <div className="min-w-[700px]">
            {/* Table Header */}
            <div className="flex items-center gap-3 border-b px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="w-40">No. Surat</div>
              <div className="flex-1">Tujuan / Perihal</div>
              <div className="w-28 text-center">Tgl Keluar</div>
              <div className="w-24 text-center">Sifat</div>
              <div className="w-24 text-center">Status</div>
              <div className="w-28 text-center">Aksi</div>
            </div>

            {/* Table Body */}
            <div className="divide-y">
              {filteredSurat.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Send className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Tidak ada surat keluar</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Coba ubah kata kunci atau filter</p>
                </div>
              ) : (
                filteredSurat.map((surat) => (
                  <motion.div
                    key={surat.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="w-40">
                      <p className="text-sm font-semibold text-foreground">{surat.nomorSurat}</p>
                      <p className="text-xs text-muted-foreground">{surat.tanggalSurat}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{surat.perihal}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {surat.tujuan}
                      </p>
                    </div>
                    <div className="w-28 text-center text-sm text-muted-foreground">
                      {new Date(surat.tanggalKeluar).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="w-24 text-center">{getSifatBadge(surat.sifat)}</div>
                    <div className="w-24 text-center">{getStatusBadge(surat.status)}</div>
                    <div className="w-28 flex justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-[#3c6eff]"
                        onClick={() => handleViewDetail(surat)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
                        onClick={() => toast.success('Download dimulai')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                        onClick={() => handleDelete(surat.id)}
                      >
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
          Menampilkan {filteredSurat.length} dari {DUMMY_SURAT_KELUAR.length} surat keluar
        </div>
      </Card>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetail && selectedSurat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowDetail(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b px-6 py-4">
                <h3 className="text-lg font-bold text-foreground">Detail Surat Keluar</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowDetail(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="flex justify-between">
                  {getSifatBadge(selectedSurat.sifat)}
                  {getStatusBadge(selectedSurat.status)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nomor Surat</p>
                  <p className="text-sm font-semibold">{selectedSurat.nomorSurat}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Tanggal Surat</p>
                    <p className="text-sm">{selectedSurat.tanggalSurat}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tanggal Keluar</p>
                    <p className="text-sm">{selectedSurat.tanggalKeluar}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">Tujuan</p>
                  <p className="text-sm font-medium">{selectedSurat.tujuan}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pembuat</p>
                  <p className="text-sm">{selectedSurat.pembuat}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Perihal</p>
                  <p className="text-sm font-medium">{selectedSurat.perihal}</p>
                </div>
                {selectedSurat.keterangan && (
                  <div>
                    <p className="text-xs text-muted-foreground">Keterangan</p>
                    <p className="text-sm">{selectedSurat.keterangan}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 border-t px-6 py-4">
                <Button className="flex-1 gap-2 bg-[#3c6eff] hover:bg-[#2b54f5] text-white">
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => setShowDetail(false)}
                >
                  Tutup
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}