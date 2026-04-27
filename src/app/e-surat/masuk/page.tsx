'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Download,
  Eye,
  Trash2,
  Mail,
  Calendar,
  User,
  Building,
  Filter,
  X,
  Upload,
  FileText,
  ChevronDown,
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

// ===== Tipe Data Surat Masuk =====
interface SuratMasuk {
  id: string;
  nomorSurat: string;
  pengirim: string;
  perihal: string;
  tanggalMasuk: string;
  tanggalSurat: string;
  tujuan: string;
  sifat: 'Biasa' | 'Penting' | 'Rahasia';
  status: 'Baru' | 'Diproses' | 'Selesai';
  fileUrl?: string;
  keterangan?: string;
}

// ===== Data Dummy =====
const DUMMY_SURAT_MASUK: SuratMasuk[] = [
  {
    id: '1',
    nomorSurat: '005/DISDIK/2026',
    pengirim: 'Dinas Pendidikan Provinsi',
    perihal: 'Undangan Rapat Koordinasi Program Pendidikan',
    tanggalMasuk: '2026-04-20',
    tanggalSurat: '2026-04-18',
    tujuan: 'Kepala Dinas Pendidikan Kabupaten',
    sifat: 'Penting',
    status: 'Baru',
    keterangan: 'Rapat akan dilaksanakan tanggal 25 April 2026',
  },
  {
    id: '2',
    nomorSurat: '010/SEKDA/2026',
    pengirim: 'Sekretariat Daerah',
    perihal: 'Pemberitahuan Jadwal Pencairan TPP',
    tanggalMasuk: '2026-04-22',
    tanggalSurat: '2026-04-21',
    tujuan: 'Seluruh OPD',
    sifat: 'Penting',
    status: 'Diproses',
    keterangan: 'Pencairan dijadwalkan minggu pertama Mei 2026',
  },
  {
    id: '3',
    nomorSurat: '015/SD01/2026',
    pengirim: 'SD Negeri 1 Lemahabang',
    perihal: 'Laporan Bulanan Kepegawaian',
    tanggalMasuk: '2026-04-15',
    tanggalSurat: '2026-04-14',
    tujuan: 'Kabid Dikdas',
    sifat: 'Biasa',
    status: 'Selesai',
    keterangan: 'Laporan bulan Maret 2026',
  },
  {
    id: '4',
    nomorSurat: '020/BPK/2026',
    pengirim: 'BPK Perwakilan',
    perihal: 'Pemberitahuan Pemeriksaan Keuangan',
    tanggalMasuk: '2026-04-23',
    tanggalSurat: '2026-04-22',
    tujuan: 'Kepala Dinas Pendidikan',
    sifat: 'Rahasia',
    status: 'Baru',
    keterangan: 'Pemeriksaan akan dilaksanakan bulan Mei 2026',
  },
];

const SIFAT_OPTIONS = ['Semua', 'Biasa', 'Penting', 'Rahasia'];
const STATUS_OPTIONS = ['Semua', 'Baru', 'Diproses', 'Selesai'];

function getSifatBadge(sifat: SuratMasuk['sifat']) {
  switch (sifat) {
    case 'Biasa':
      return <Badge variant="outline" className="text-sky-600 border-sky-300 bg-sky-50">Biasa</Badge>;
    case 'Penting':
      return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Penting</Badge>;
    case 'Rahasia':
      return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">Rahasia</Badge>;
  }
}

function getStatusBadge(status: SuratMasuk['status']) {
  switch (status) {
    case 'Baru':
      return <Badge className="bg-blue-500 hover:bg-blue-600">Baru</Badge>;
    case 'Diproses':
      return <Badge className="bg-amber-500 hover:bg-amber-600">Diproses</Badge>;
    case 'Selesai':
      return <Badge className="bg-emerald-500 hover:bg-emerald-600">Selesai</Badge>;
  }
}

export default function SuratMasukPage() {
  const [search, setSearch] = useState('');
  const [sifatFilter, setSifatFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [selectedSurat, setSelectedSurat] = useState<SuratMasuk | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const filteredSurat = useMemo(() => {
    return DUMMY_SURAT_MASUK.filter((s) => {
      const matchSearch =
        !search ||
        s.nomorSurat.toLowerCase().includes(search.toLowerCase()) ||
        s.pengirim.toLowerCase().includes(search.toLowerCase()) ||
        s.perihal.toLowerCase().includes(search.toLowerCase());
      const matchSifat = sifatFilter === 'Semua' || s.sifat === sifatFilter;
      const matchStatus = statusFilter === 'Semua' || s.status === statusFilter;
      return matchSearch && matchSifat && matchStatus;
    });
  }, [search, sifatFilter, statusFilter]);

  const handleViewDetail = (surat: SuratMasuk) => {
    setSelectedSurat(surat);
    setShowDetail(true);
  };

  const handleDelete = (id: string) => {
    toast.success('Surat berhasil dihapus');
    setShowDetail(false);
    setSelectedSurat(null);
  };

  const totalBaru = DUMMY_SURAT_MASUK.filter((s) => s.status === 'Baru').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">📥 Surat Masuk</h2>
          <p className="text-sm text-muted-foreground">
            Kelola surat masuk • {totalBaru} surat baru
          </p>
        </div>
        <Button className="gap-2 bg-[#3c6eff] hover:bg-[#2b54f5] text-white shadow-lg shadow-[#3c6eff]/25">
          <Upload className="h-4 w-4" />
          Upload Surat
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nomor surat, pengirim, atau perihal..."
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
              <div className="flex-1">Pengirim / Perihal</div>
              <div className="w-28 text-center">Tgl Masuk</div>
              <div className="w-24 text-center">Sifat</div>
              <div className="w-24 text-center">Status</div>
              <div className="w-28 text-center">Aksi</div>
            </div>

            {/* Table Body */}
            <div className="divide-y">
              {filteredSurat.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Mail className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Tidak ada surat masuk</p>
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
                        {surat.pengirim}
                      </p>
                    </div>
                    <div className="w-28 text-center text-sm text-muted-foreground">
                      {new Date(surat.tanggalMasuk).toLocaleDateString('id-ID', {
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
          Menampilkan {filteredSurat.length} dari {DUMMY_SURAT_MASUK.length} surat masuk
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
                <h3 className="text-lg font-bold text-foreground">Detail Surat Masuk</h3>
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
                    <p className="text-xs text-muted-foreground">Tanggal Masuk</p>
                    <p className="text-sm">{selectedSurat.tanggalMasuk}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">Pengirim</p>
                  <p className="text-sm font-medium">{selectedSurat.pengirim}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tujuan</p>
                  <p className="text-sm">{selectedSurat.tujuan}</p>
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