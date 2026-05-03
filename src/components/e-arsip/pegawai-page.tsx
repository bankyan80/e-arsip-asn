'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Search, Trash2, ChevronLeft, ChevronRight, Pencil, Save, Users, Camera, Download } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { useArsipStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import * as db from '@/lib/db'
import * as XLSX from 'xlsx'
import type { Pegawai } from '@/lib/types'

const JENIS_ASN_OPTIONS = [
  { value: 'PNS', label: 'PNS' },
  { value: 'PPPK_GURU', label: 'PPPK Guru' },
  { value: 'PPPK_TEKNIK', label: 'PPPK Teknis/Tendik' },
  { value: 'PPPK_PARUH_GURU', label: 'PPPK Paruh Waktu Guru' },
  { value: 'PPPK_PARUH_TEKNIK', label: 'PPPK Paruh Waktu Teknis/Tendik' },
]

const GOLONGAN_PNS = [
  'I/a', 'I/b', 'I/c', 'I/d',
  'II/a', 'II/b', 'II/c', 'II/d',
  'III/a', 'III/b', 'III/c', 'III/d',
  'IV/a', 'IV/b', 'IV/c', 'IV/d', 'IV/e',
]

const GOLONGAN_PPPK_GURU = ['IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV']
const GOLONGAN_PPPK_TEKNIK = ['V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV']

const JABATAN_OPTIONS = [
  { group: 'Kepala Sekolah', options: ['Kepala Sekolah', 'Plt. Kepala Sekolah'] },
  { group: 'Guru', options: ['Guru Kelas', 'Guru Mata Pelajaran', 'Guru Agama', 'Guru PJOK / Olahraga', 'Guru Bahasa Inggris', 'Guru Seni Budaya'] },
  { group: 'Tenaga Kependidikan', options: ['Tenaga Administrasi Sekolah / TU', 'Operator Sekolah', 'Bendahara BOS', 'Pustakawan', 'Laboran', 'Arsiparis', 'Teknisi / IT Support'] },
  { group: 'Tenaga Pendukung', options: ['Penjaga Sekolah', 'Satpam', 'Petugas Kebersihan'] },
  { group: 'Pengawas', options: ['Pengawas Sekolah', 'Koordinator Wilayah'] },
]

const PAGE_SIZE = 10

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function formatDate(d: string) {
  if (!d) return '-'
  try { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}

export default function PegawaiPage() {
  const { pegawaiList, fetchData, currentUser } = useArsipStore()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<Pegawai | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<Partial<Pegawai>>({})
  const [saving, setSaving] = useState(false)
  const [del, setDel] = useState<Pegawai | null>(null)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = useMemo(() => {
    let r = pegawaiList
    if (currentUser?.role === 'pegawai') {
      const me = pegawaiList.find(p => p.nip === currentUser.nip)
      if (me?.unitKerja) r = r.filter(p => p.unitKerja === me.unitKerja)
      else r = r.filter(p => p.nip === currentUser.nip)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(p => p.nip.toLowerCase().includes(q) || p.nama.toLowerCase().includes(q) || (p.jenisASN || '').toLowerCase().includes(q) || (p.jabatan || '').toLowerCase().includes(q) || (p.unitKerja || '').toLowerCase().includes(q))
    }
    return r
  }, [pegawaiList, search, currentUser])

  const total = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safe = Math.min(page, total)
  const paged = filtered.slice((safe - 1) * PAGE_SIZE, safe * PAGE_SIZE)

  const labelAsn = (v: string) => JENIS_ASN_OPTIONS.find(o => o.value === v)?.label || v || '-'

  const openEdit = (p: Pegawai) => {
    setEditId(p.id)
    setForm({
      nip: p.nip, nama: p.nama, jenisASN: p.jenisASN, jabatan: p.jabatan,
      golongan: p.golongan, kecamatan: p.kecamatan, unitKerja: p.unitKerja,
      email: p.email, hp: p.hp, tanggalLahir: p.tanggalLahir,
      tempatLahir: p.tempatLahir, jenisKelamin: p.jenisKelamin,
      agama: p.agama, alamat: p.alamat, pendidikanTerakhir: p.pendidikanTerakhir,
      status: p.status
    })
    setFotoFile(null)
    setFotoPreview('')
    setShowEdit(true)
  }

  const uploadFoto = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage
      .from('foto-profil')
      .upload(`profil/${fileName}`, file, { cacheControl: '3600', upsert: true })
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from('foto-profil').getPublicUrl(`profil/${fileName}`)
    return data.publicUrl
  }

  const handlePilihFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('File harus gambar'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('Maksimal 2MB'); return }
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const getGolonganOptions = () => {
    switch (form.jenisASN) {
      case 'PNS': return GOLONGAN_PNS
      case 'PPPK_GURU': return GOLONGAN_PPPK_GURU
      case 'PPPK_TEKNIK': return GOLONGAN_PPPK_TEKNIK
      case 'PPPK_PARUH_GURU': return GOLONGAN_PPPK_GURU
      case 'PPPK_PARUH_TEKNIK': return GOLONGAN_PPPK_TEKNIK
      default: return []
    }
  }

  const save = async () => {
    if (!editId) return
    setSaving(true)
    try {
      let fotoUrl = form.fotoUrl
      if (fotoFile) {
        setUploading(true)
        try {
          fotoUrl = await uploadFoto(fotoFile)
        } catch (e: any) {
          toast.error('Gagal upload foto: ' + (e.message || 'Unknown'))
          setSaving(false)
          setUploading(false)
          return
        }
        setUploading(false)
      }
      await db.updatePegawaiInDB(editId, { ...form, fotoUrl })
      toast.success('Data berhasil diperbarui!')
      setShowEdit(false)
      await fetchData()
    } catch (e: any) {
      console.error('Save error:', e)
      toast.error('Gagal menyimpan: ' + (e.message || 'Unknown'))
    } finally {
      setSaving(false)
    }
  }

  const hapus = async () => {
    if (!del) return
    try { await db.deletePegawaiFromDB(del.id); toast.success('Dihapus'); setDel(null); await fetchData() }
    catch (e: any) { toast.error('Gagal: ' + (e.message || 'Unknown')) }
  }

  const exportToExcel = () => {
    const dataToExport = pegawaiList.map((p, i) => ({
      'No': i + 1,
      'NIP': p.nip,
      'Nama': p.nama,
      'Jenis ASN': labelAsn(p.jenisASN),
      'Golongan': p.golongan || '-',
      'Jabatan': p.jabatan || '-',
      'Kecamatan': p.kecamatan || '-',
      'Unit Kerja': p.unitKerja || '-',
      'Jenis Kelamin': p.jenisKelamin || '-',
      'Agama': p.agama || '-',
      'Pendidikan': p.pendidikanTerakhir || '-',
      'TMT Pensiun': p.tglPensiun ? formatDate(p.tglPensiun) : '-',
      'Status': p.status || 'Aktif',
    }))

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    ws['!cols'] = [
      { wch: 5 }, { wch: 22 }, { wch: 25 }, { wch: 26 }, { wch: 10 },
      { wch: 28 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 12 },
      { wch: 12 }, { wch: 15 }, { wch: 10 }
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data Pegawai')
    const today = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `Data-Pegawai-${today}.xlsx`)
    toast.success('Data pegawai berhasil diunduh!')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">👥 Data Pegawai</h2>
          <p className="text-sm text-muted-foreground">
            {currentUser?.role === 'pegawai' ? 'Rekan satu unit • ' + filtered.length : 'Kelola • ' + pegawaiList.length}
          </p>
        </div>
        {currentUser?.role === 'admin' && (
          <Button onClick={exportToExcel} variant="outline" className="gap-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950">
            <Download className="h-4 w-4" />
            Unduh Excel
          </Button>
        )}
      </div>
      <Card><CardContent className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-10 h-10" />
        </div>
      </CardContent></Card>
      <Card>
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="min-w-[900px]">
            <div className="flex items-center gap-3 border-b px-4 py-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
              <div className="w-14 text-center">Foto</div>
              <div className="w-40">NIP</div>
              <div className="flex-1 min-w-0">Nama</div>
              <div className="w-28">ASN</div>
              <div className="w-20">Gol</div>
              <div className="w-32">Unit</div>
              <div className="w-20 text-center">Status</div>
              <div className="w-24 text-center">Aksi</div>
            </div>
            <div className="divide-y">
              {paged.length === 0 ? (
                <div className="flex flex-col items-center py-16"><Users className="h-12 w-12 text-muted-foreground/30 mb-3" /><p className="text-sm text-muted-foreground">Tidak ada data</p></div>
              ) : paged.map(p => (
                <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer" onClick={() => { setDetail(p); setShowDetail(true) }}>
                  <div className="w-14 flex shrink-0 justify-center">
                    <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-zinc-800 shadow-sm shrink-0">
                      <AvatarImage src={p.fotoUrl || ''} alt={p.nama} className="object-cover" />
                      <AvatarFallback className="bg-[#3c6eff] text-xs font-bold text-white">{getInitials(p.nama)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="w-40 shrink-0"><p className="text-sm font-mono truncate" title={p.nip}>{p.nip}</p></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate" title={p.nama}>{p.nama}</p></div>
                  <div className="w-28 shrink-0"><Badge variant="outline" className="text-xs truncate max-w-full block" title={labelAsn(p.jenisASN)}>{labelAsn(p.jenisASN)}</Badge></div>
                  <div className="w-20 shrink-0 text-sm text-muted-foreground truncate" title={p.golongan || ''}>{p.golongan || '-'}</div>
                  <div className="w-32 shrink-0 text-sm text-muted-foreground truncate" title={p.unitKerja || ''}>{p.unitKerja || '-'}</div>
                  <div className="w-20 shrink-0 text-center">
                    <Badge className={p.status === 'Aktif' ? 'bg-emerald-500 shrink-0' : 'bg-gray-500 shrink-0'}>{p.status || 'Aktif'}</Badge>
                  </div>
                  <div className="w-24 shrink-0 flex justify-center gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-amber-600" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    {currentUser?.role === 'admin' && <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-500" onClick={() => setDel(p)}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </ScrollArea>
        <div className="border-t px-4 py-2 flex justify-between text-sm text-muted-foreground">
          <span>{paged.length} dari {filtered.length}</span>
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={safe <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-xs">{safe}/{total}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={safe >= total} onClick={() => setPage(p => Math.min(total, p + 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>

      {/* MODAL EDIT */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Pegawai</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-28 w-28 ring-4 ring-[#3c6eff]/20 shadow-xl">
                <AvatarImage src={fotoPreview || form.fotoUrl || ''} className="object-cover" />
                <AvatarFallback className="bg-[#3c6eff] text-2xl font-bold text-white">{getInitials(form.nama || '')}</AvatarFallback>
              </Avatar>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePilihFoto} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-1">
                <Camera className="h-4 w-4" />{fotoFile || form.fotoUrl ? 'Ganti Foto' : 'Upload Foto'}
              </Button>
              {fotoFile && <p className="text-xs text-muted-foreground">{fotoFile.name}</p>}
            </div>
            <div><Label>NIP</Label><Input value={form.nip || ''} disabled className="bg-muted" /></div>
            <div><Label>Nama *</Label><Input value={form.nama || ''} onChange={e => setForm({ ...form, nama: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jenis ASN</Label>
                <Select value={form.jenisASN || 'PNS'} onValueChange={v => setForm({ ...form, jenisASN: v, golongan: '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JENIS_ASN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Golongan</Label>
                <Select value={form.golongan || ''} onValueChange={v => setForm({ ...form, golongan: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    {getGolonganOptions().map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Jabatan</Label>
              <Select value={form.jabatan || ''} onValueChange={v => setForm({ ...form, jabatan: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih Jabatan" /></SelectTrigger>
                <SelectContent>
                  {JABATAN_OPTIONS.map(group => (
                    <div key={group.group}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">{group.group}</div>
                      {group.options.map(j => (
                        <SelectItem key={j} value={j}>{j}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Kecamatan</Label><Input value={form.kecamatan || ''} onChange={e => setForm({ ...form, kecamatan: e.target.value })} /></div>
              <div><Label>Unit Kerja</Label><Input value={form.unitKerja || ''} onChange={e => setForm({ ...form, unitKerja: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>No HP</Label><Input value={form.hp || ''} onChange={e => setForm({ ...form, hp: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tgl Lahir</Label><Input type="date" value={form.tanggalLahir || ''} onChange={e => setForm({ ...form, tanggalLahir: e.target.value })} /></div>
              <div><Label>Tempat Lahir</Label><Input value={form.tempatLahir || ''} onChange={e => setForm({ ...form, tempatLahir: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Jenis Kelamin</Label><Select value={form.jenisKelamin || ''} onValueChange={v => setForm({ ...form, jenisKelamin: v })}><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent><SelectItem value="Laki-laki">Laki-laki</SelectItem><SelectItem value="Perempuan">Perempuan</SelectItem></SelectContent></Select></div>
              <div><Label>Agama</Label><Select value={form.agama || ''} onValueChange={v => setForm({ ...form, agama: v })}><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu', 'Lainnya'].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Alamat</Label><Input value={form.alamat || ''} onChange={e => setForm({ ...form, alamat: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Pendidikan</Label><Select value={form.pendidikanTerakhir || ''} onValueChange={v => setForm({ ...form, pendidikanTerakhir: v })}><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{['SD', 'SMP', 'SMA', 'D1', 'D2', 'D3', 'S1', 'S2', 'S3'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Status</Label><Select value={form.status || 'Aktif'} onValueChange={v => setForm({ ...form, status: v as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Aktif">Aktif</SelectItem><SelectItem value="Nonaktif">Nonaktif</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEdit(false)}>Batal</Button>
            <Button onClick={save} disabled={saving || uploading} className="gap-2 bg-[#3c6eff] hover:bg-[#2b54f5] text-white">
              {saving ? 'Menyimpan...' : <><Save className="h-4 w-4" />Simpan</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DETAIL */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detail Pegawai</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-4 ring-[#3c6eff]/20 shadow-lg">
                  <AvatarImage src={detail.fotoUrl || ''} alt={detail.nama} className="object-cover" />
                  <AvatarFallback className="bg-[#3c6eff] text-lg font-bold text-white">{getInitials(detail.nama)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-lg">{detail.nama}</p>
                  <p className="text-muted-foreground font-mono text-sm">{detail.nip}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div><p className="text-xs text-muted-foreground">Jenis ASN</p><p>{labelAsn(detail.jenisASN)}</p></div>
                <div><p className="text-xs text-muted-foreground">Golongan</p><p>{detail.golongan || '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">Jabatan</p><p>{detail.jabatan || '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">Unit Kerja</p><p>{detail.unitKerja || '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">Kecamatan</p><p>{detail.kecamatan || '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">Email</p><p>{detail.email || '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">HP</p><p>{detail.hp || '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">Tgl Lahir</p><p>{formatDate(detail.tanggalLahir)}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><Badge className={detail.status === 'Aktif' ? 'bg-emerald-500' : 'bg-gray-500'}>{detail.status || 'Aktif'}</Badge></div>
                <div><p className="text-xs text-muted-foreground">TMT Pensiun</p><p>{formatDate(detail.tglPensiun || '')}</p></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetail(false)}>Tutup</Button>
            <Button onClick={() => { setShowDetail(false); if (detail) openEdit(detail) }} className="bg-amber-500 hover:bg-amber-600 text-white"><Pencil className="h-4 w-4 mr-1" />Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!del} onOpenChange={() => setDel(null)}>
        <DialogContent><DialogHeader><DialogTitle>Hapus?</DialogTitle></DialogHeader><p className="text-sm">Yakin hapus <b>{del?.nama}</b>?</p><DialogFooter className="gap-2"><Button variant="outline" onClick={() => setDel(null)}>Batal</Button><Button variant="destructive" onClick={hapus}>Hapus</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  )
}