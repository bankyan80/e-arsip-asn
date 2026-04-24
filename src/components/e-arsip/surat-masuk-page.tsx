'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Inbox, Plus, Trash2, Search } from 'lucide-react';

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

export default function SuratMasukPage() {
  const { suratMasukList, addSuratMasuk, deleteSuratMasuk } = useArsipStore();
  const [asalSurat, setAsalSurat] = useState('');
  const [nomorSurat, setNomorSurat] = useState('');
  const [tanggalSurat, setTanggalSurat] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const filteredList = search.trim()
    ? suratMasukList.filter(
        (s) =>
          s.asalSurat.toLowerCase().includes(search.toLowerCase()) ||
          s.nomorSurat.toLowerCase().includes(search.toLowerCase())
      )
    : suratMasukList;

  const resetForm = () => { setAsalSurat(''); setNomorSurat(''); setTanggalSurat(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asalSurat.trim()) { toast.error('Asal surat wajib diisi'); return; }
    if (!nomorSurat.trim()) { toast.error('Nomor surat wajib diisi'); return; }
    if (!tanggalSurat) { toast.error('Tanggal surat wajib diisi'); return; }
    setSubmitting(true);
    try {
      await addSuratMasuk({ asalSurat: asalSurat.trim(), nomorSurat: nomorSurat.trim(), tanggalSurat });
      toast.success('Surat masuk berhasil ditambahkan');
      resetForm();
    } catch { toast.error('Gagal menambahkan surat masuk'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try { await deleteSuratMasuk(id); toast.success('Surat masuk berhasil dihapus'); }
    catch { toast.error('Gagal menghapus surat masuk'); }
  };

  return (
    <div className="space-y-6">
      <section aria-label="Header Surat Masuk">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Surat Masuk</h2>
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-semibold px-2.5 py-1">
            {suratMasukList.length} surat
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Kelola data surat masuk dinas</p>
      </section>

      <Card className="border-border/60 bg-white dark:bg-zinc-950">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Plus className="h-4 w-4 text-[#3c6eff]" /> Tambah Surat Masuk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="asal-surat" className="text-sm font-medium">Asal Surat <span className="text-red-500">*</span></Label>
              <Input id="asal-surat" placeholder="cth: Dinas Pendidikan Kabupaten" value={asalSurat} onChange={(e) => setAsalSurat(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nomor-surat-masuk" className="text-sm font-medium">Nomor Surat <span className="text-red-500">*</span></Label>
              <Input id="nomor-surat-masuk" placeholder="cth: 001/DP/IV/2026" value={nomorSurat} onChange={(e) => setNomorSurat(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tanggal-surat-masuk" className="text-sm font-medium">Tanggal Surat <span className="text-red-500">*</span></Label>
              <Input id="tanggal-surat-masuk" type="date" value={tanggalSurat} onChange={(e) => setTanggalSurat(e.target.value)} />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <Button type="submit" disabled={submitting} className="bg-[#3c6eff] hover:bg-[#3c6eff]/90 text-white gap-2">
                <Plus className="h-4 w-4" /> {submitting ? 'Menyimpan...' : 'Tambah Surat Masuk'}
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
              <Input placeholder="Cari asal atau nomor surat..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-10">No</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Asal Surat</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nomor Surat</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal Surat</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-20 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Inbox className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-muted-foreground">{search ? 'Tidak ada surat ditemukan' : 'Belum ada data surat masuk'}</p>
                        <p className="text-xs text-muted-foreground/70">{search ? 'Coba ubah kata kunci pencarian' : 'Gunakan form di atas untuk menambahkan surat masuk'}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredList.map((item, idx) => (
                    <TableRow key={item.id} className="border-border/40 transition-colors hover:bg-muted/40">
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="px-4 py-3 text-sm font-medium text-foreground">{item.asalSurat}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-foreground font-mono">{item.nomorSurat}</TableCell>
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
                              <AlertDialogTitle>Hapus Surat Masuk</AlertDialogTitle>
                              <AlertDialogDescription>Yakin ingin menghapus surat masuk dari <strong>{item.asalSurat}</strong> dengan nomor <strong>{item.nomorSurat}</strong>? Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
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