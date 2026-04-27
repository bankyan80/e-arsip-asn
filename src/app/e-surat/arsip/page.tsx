'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Download,
  Eye,
  Trash2,
  Archive,
  Calendar,
  FileText,
  Filter,
  X,
  FolderOpen,
  Tag,
  ArrowUpDown,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
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

// ===== Tipe Data Arsip Surat =====
interface ArsipSurat {
  id: string;
  nomorSurat: string;
  perihal: string;
  asalTujuan: string;
  tanggal: string;
  jenis: 'Masuk' | 'Keluar';
  kategori: string;
  status: string;
  fileUrl?: string;
}

// ===== Data Dummy =====
const DUMMY_ARSIP: ArsipSurat[] = [
  {
    id: '1',
    nomorSurat: '005/DISDIK/2026',
    perihal: 'Undangan Rapat Koordinasi Program Pendidikan',
    asalTujuan: 'Dinas Pendidikan Provinsi',
    tanggal: '2026-04-20',
    jenis: 'Masuk',
    kategori: 'Undangan',
    status: 'Selesai',
  },
  {
    id: '2',
    nomorSurat: '025/DISDIK-KAB/IV/2026',
    perihal: 'Laporan Realisasi Anggaran Triwulan I',
    asalTujuan: 'Dinas Pendidikan Provinsi',
    tanggal: '2026-04-21',
    jenis: 'Keluar',
    kategori: 'Laporan',
    status: 'Terkirim',
  },
  {
    id: '3',
    nomorSurat: '010/SEKDA/2026',
    perihal: 'Pemberitahuan Jadwal Pencairan TPP',
    asalTujuan: 'Sekretariat Daerah',
    tanggal: '2026-04-22',
    jenis: 'Masuk',
    kategori: 'Pemberitahuan',
    status: 'Diproses',
  },
  {
    id: '4',
    nomorSurat: '030/DISDIK-KAB/IV/2026',
    perihal: 'Surat Tugas Pembinaan',
    asalTujuan: 'SD Negeri 1 Lemahabang',
    tanggal: '2026-04-22',
    jenis: 'Keluar',
    kategori: 'Surat Tugas',
    status: 'Draft',
  },
  {
    id: '5',
    nomorSurat: '015/SD01/2026',
    perihal: 'Laporan Bulanan Kepegawaian',
    asalTujuan: 'SD Negeri 1 Lemahabang',
    tanggal: '2026-04-15',
    jenis: 'Masuk',
    kategori: 'Laporan',
    status: 'Selesai',
  },
  {
    id: '6',
    nomorSurat: '020/BPK/2026',
    perihal: 'Pemberitahuan Pemeriksaan Keuangan',
    asalTujuan: 'BPK Perwakilan',
    tanggal: '2026-04-23',
    jenis: 'Masuk',
    kategori: 'Pemberitahuan',
    status: 'Baru',
  },
];

const JENIS_OPTIONS = ['Semua', 'Masuk', 'Keluar'];
const KATEGORI_OPTIONS = ['Semua', 'Undangan', 'Laporan', 'Pemberitahuan', 'Surat Tugas', 'Lainnya'];

function getJenisBadge(jenis: ArsipSurat['jenis']) {
  return jenis === 'Masuk' ? (
    <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">📥 Masuk</Badge>
  ) : (
    <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50">📤 Keluar</Badge>
  );
}

export default function ArsipSuratPage() {
  const [search, setSearch] = useState('');
  const [jenisFilter, setJenisFilter] = useState('Semua');
  const [kategoriFilter, setKategoriFilter] = useState('Semua');
  const [selectedSurat, setSelectedSurat] = useState<ArsipSurat | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredArsip = useMemo(() => {
    let result = DUMMY_ARSIP.filter((s) => {
      const matchSearch =
        !search ||
        s.nomorSurat.toLowerCase().includes(search.toLowerCase()) ||
        s.perihal.toLowerCase().includes(search.toLowerCase()) ||
        s.asalTujuan.toLowerCase().includes(search.toLowerCase());
      const matchJenis = jenisFilter === 'Semua' || s.jenis === jenisFilter;
      const matchKategori = kategoriFilter === 'Semua' || s.kategori === kategoriFilter;
      return matchSearch && matchJenis && matchKategori;
    });

    result.sort((a, b) => {
      if (sortOrder === 'asc') return a.tanggal.localeCompare(b.tanggal);
      return b.tanggal.localeCompare(a.tanggal);
    });

    return result;
  }, [search, jenisFilter, kategoriFilter, sortOrder]);

  const handleViewDetail = (surat: ArsipSurat) => {
    setSelectedSurat(surat);
    setShowDetail(true);
  };

  const handleDelete = (id: string) => {
    toast.success('Arsip berhasil dihapus');
    setShowDetail(false);
    setSelectedSurat(null);
  };

  const totalMasuk = DUMMY_ARSIP.filter((s) => s.jenis === 'Masuk').length;
  const totalKeluar = DUMMY_ARSIP.filter((s) => s.jenis === 'Keluar').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">🗂️ Arsip Surat</h2>
          <p className="text-sm text-muted-foreground">
            Total {DUMMY_ARSIP.length} surat • 📥 {totalMasuk} masuk • 📤 {totalKeluar} keluar
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          title={sortOrder === 'asc' ? 'Terbaru dulu' : 'Terlama dulu'}
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nomor surat, perihal, atau asal/tujuan..."
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
              <Select value={jenisFilter} onValueChange={setJenisFilter}>
                <SelectTrigger className="h-10 w-28">
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JENIS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={kategoriFilter} onValueChange={setKategoriFilter}>
                <SelectTrigger className="h-10 w-36">
                  <Tag className="h-3.5 w-3.5 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KATEGORI_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid Arsip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredArsip.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Arsip kosong</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Coba ubah kata kunci atau filter</p>
          </div>
        ) : (
          filteredArsip.map((surat) => (
            <motion.div
              key={surat.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    {getJenisBadge(surat.jenis)}
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-[#3c6eff]"
                        onClick={() => handleViewDetail(surat)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-emerald-600"
                        onClick={() => toast.success('Download dimulai')}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        onClick={() => handleDelete(surat.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground line-clamp-2">{surat.perihal}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{surat.nomorSurat}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(surat.tanggal).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">{surat.asalTujuan}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">{surat.kategori}</Badge>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

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
                <h3 className="text-lg font-bold text-foreground">Detail Arsip Surat</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowDetail(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="flex justify-between items-center">
                  {getJenisBadge(selectedSurat.jenis)}
                  <Badge variant="secondary">{selectedSurat.kategori}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nomor Surat</p>
                  <p className="text-sm font-semibold">{selectedSurat.nomorSurat}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal</p>
                  <p className="text-sm">{selectedSurat.tanggal}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {selectedSurat.jenis === 'Masuk' ? 'Pengirim' : 'Tujuan'}
                  </p>
                  <p className="text-sm font-medium">{selectedSurat.asalTujuan}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Perihal</p>
                  <p className="text-sm font-medium">{selectedSurat.perihal}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm">{selectedSurat.status}</p>
                </div>
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