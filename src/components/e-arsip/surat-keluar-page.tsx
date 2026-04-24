'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Send, Plus, Trash2, Search } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useArsipStore } from '@/lib/store';

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function SuratKeluarPage() {
  const { suratKeluarList, addSuratKeluar, deleteSuratKeluar } = useArsipStore();
  const [jenisSurat, setJenisSurat] = useState('');
  const [ditujukanKe, setDitujukanKe] = useState('');
  const [nomorSurat, setNomorSurat] = useState('');
  const [perihal, setPerihal] = useState('');
  const [tanggalSurat, setTanggalSurat] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const filteredList = search.trim()
    ? suratKeluarList.filter(
        (s) =>
          s.jenisSurat.toLowerCase().includes(search.toLowerCase()) ||
          s.ditujukanKe.toLowerCase().includes(search.toLowerCase()) ||
          s.nomorSurat.toLowerCase().includes(search.toLowerCase()) ||
          s.perihal.toLowerCase().includes(search.toLowerCase())
      )
    : suratKeluarList;

  const resetForm = () => { setJenisSurat(''); setDitujukanKe(''); setNomorSurat(''); setPerihal(''); setTanggalSurat(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jenisSurat.trim()) { toast.error('Jenis surat wajib diisi'); return; }
    if (!ditujukanKe.trim()) { toast.error('Ditujukan ke wajib diisi'); return; }
    if (!nomorSurat.trim()) { toast.error('Nomor surat wajib diisi'); return; }
    if (!perihal.trim()) { toast.error('Perihal wajib diisi'); return; }
    if (!tanggalSurat) { toast.error('Tanggal surat wajib diisi'); return; }
    setSubmitting(true);
    try {
      await addSuratKeluar({ jenisSurat: jenisSurat.trim(), ditujukanKe: ditujukanKe.trim(), nomorSurat: nomorSurat.trim(), perihal: perihal.trim(), tanggalSurat });
      toast.success('Surat keluar berhasil ditambahkan');
      resetForm();
    } catch { toast.error('Gagal menambahkan surat keluar'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try { await deleteSuratKeluar(id); toast.success('Surat keluar berhasil dihapus'); }
    catch { toast.error('Gagal menghapus surat keluar'); }
  };

  return (
    <div className="space-y-6">
      <section aria-label="Header Surat Keluar">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Surat Keluar</h2>
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-semibold px-2.5 py-1">
            {suratKeluarList.length} surat
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Kelola data surat keluar dinas</p>
      </section>

      <Card className="border-border/60 bg-white dark:bg-zinc-950">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Plus className="h-4 w-4 text-[#3c6eff]" /> Tambah Surat Keluar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="jenis-surat" className="text-sm font-medium">Jenis Surat <span className="text-red-500">*</span></Label>
              <Input id="jenis-surat" placeholder="cth: Undangan, Surat Edaran" value={jenisSurat} onChange={(e) => setJenisSurat(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ditujukan-ke" className="text-sm font-medium">Ditujukan Ke <span className="text-red-500">*</span></Label>
              <Input id="ditujukan-ke" placeholder="cth: Semua Guru SD" value={ditujukanKe} onChange={(e) => setDitujukanKe(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nomor-surat-keluar" className="text-sm font-medium">Nomor Surat <span className="text-red-500">*</span></Label>
              <Input id="nomor-surat-keluar" placeholder="cth: 005/DPK/V/2026" value={nomorSurat} onChange={(e) => setNomorSurat(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="perihal" className="text-sm font-medium">Perihal <span className="text-red-500">*</span></Label>
              <Input id="perihal" placeholder="cth: Undangan Rapat Koordinasi Guru" value={perihal} onChange={(e) => setPerihal(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tanggal-surat-keluar" className="text-sm font-medium">Tanggal Surat <span className="text-red-500">*</span></Label>
              <Input id="tanggal-surat-keluar" type="date" value={tanggalSurat} onChange={(e) => setTanggalSurat(e.target.value)} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <Button type="submit" disabled={submitting} className="bg-[#3c6eff] hover:bg-[#3c6eff]/90 text-white gap-2">
                <Plus className="h-4 w-4" /> {submitting ? 'Menyimpan...' : 'Tambah Surat Keluar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-white dark:bg-zinc-950">
        <CardContent className="p-4">
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input placeholder="Cari jenis, tujuan, nomor, atau perihal..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-10">No</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jenis Surat</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ditujukan Ke</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nomor Surat</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Perihal</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-20 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Send className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-muted-foreground">{search ? 'Tidak ada surat ditemukan' : 'Belum ada data surat keluar'}</p>
                        <p className="text-xs text-muted-foreground/70">{search ? 'Coba ubah kata kunci pencarian' : 'Gunakan form di atas untuk menambahkan surat keluar'}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredList.map((item, idx) => (
                    <TableRow key={item.id} className="border-border/40 transition-colors hover:bg-muted/40">
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="px-4 py-3"><span className="text-sm font-medium text-foreground">{item.jenisSurat}</span></TableCell>
                      <TableCell className="px-4 py-3 text-sm text-foreground">{item.ditujukanKe}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-foreground font-mono">{item.nomorSurat}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{item.perihal}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{formatDate(item.tanggalSurat)}</TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Surat Keluar</AlertDialogTitle>
                              <AlertDialogDescription>Yakin ingin menghapus surat keluar jenis <strong>{item.jenisSurat}</strong> kepada <strong>{item.ditujukanKe}</strong>? Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-red-500 hover:bg-red-600 text-white">Hapus</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}