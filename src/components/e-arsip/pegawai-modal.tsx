'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useArsipStore } from '@/lib/store';
import {
  JENIS_ASN_OPTIONS,
  JABATAN_OPTIONS,
  GOLONGAN_OPTIONS,
  KECAMATAN_OPTIONS,
  ALL_JENIS_ASN,
} from '@/lib/constants';
import type { Pegawai } from '@/lib/types';

// ===== Props =====

interface PegawaiModalProps {
  open: boolean;
  onClose: () => void;
  pegawai: Pegawai | null; // null = add new, existing = edit
}

// ===== Form State =====

interface FormData {
  nip: string;
  nama: string;
  jenisASN: string;
  jabatan: string;
  golongan: string;
  kecamatan: string;
  unitKerja: string;
  email: string;
  hp: string;
  status: 'Aktif' | 'Nonaktif';
}

const INITIAL_FORM: FormData = {
  nip: '',
  nama: '',
  jenisASN: '',
  jabatan: '',
  golongan: '',
  kecamatan: '',
  unitKerja: '',
  email: '',
  hp: '',
  status: 'Aktif',
};

// ===== Component =====

export default function PegawaiModal({ open, onClose, pegawai }: PegawaiModalProps) {
  const { addPegawai, updatePegawai } = useArsipStore();
  const [prevPegawaiId, setPrevPegawaiId] = useState<number | null>(pegawai?.id ?? null);
  const [form, setForm] = useState<FormData>(() =>
    pegawai
      ? {
          nip: pegawai.nip || '',
          nama: pegawai.nama || '',
          jenisASN: pegawai.jenisASN || '',
          jabatan: pegawai.jabatan || '',
          golongan: pegawai.golongan || '',
          kecamatan: pegawai.kecamatan || '',
          unitKerja: pegawai.unitKerja || '',
          email: pegawai.email || '',
          hp: pegawai.hp || '',
          status: pegawai.status || 'Aktif',
        }
      : INITIAL_FORM
  );

  if ((pegawai?.id ?? null) !== prevPegawaiId) {
    setPrevPegawaiId(pegawai?.id ?? null);
    setForm(
      pegawai
        ? {
            nip: pegawai.nip || '',
            nama: pegawai.nama || '',
            jenisASN: pegawai.jenisASN || '',
            jabatan: pegawai.jabatan || '',
            golongan: pegawai.golongan || '',
            kecamatan: pegawai.kecamatan || '',
            unitKerja: pegawai.unitKerja || '',
            email: pegawai.email || '',
            hp: pegawai.hp || '',
            status: pegawai.status || 'Aktif',
          }
        : INITIAL_FORM
    );
  }

  const jenisASNOptions =
    pegawai?.jenisASN && !ALL_JENIS_ASN.includes(pegawai.jenisASN)
      ? [
          ...JENIS_ASN_OPTIONS,
          { group: 'Lainnya', items: [pegawai.jenisASN] },
        ]
      : JENIS_ASN_OPTIONS;

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): boolean => {
    if (!form.nip.trim()) { toast.error('NIP/NIK wajib diisi'); return false; }
    if (!form.nama.trim()) { toast.error('Nama Lengkap wajib diisi'); return false; }
    if (!form.jenisASN) { toast.error('Jenis ASN wajib dipilih'); return false; }
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;

    if (pegawai) {
      updatePegawai(pegawai.id, {
        nip: form.nip.trim(),
        nama: form.nama.trim(),
        jenisASN: form.jenisASN,
        jabatan: form.jabatan.trim(),
        golongan: form.golongan,
        kecamatan: form.kecamatan.trim(),
        unitKerja: form.unitKerja.trim(),
        email: form.email.trim(),
        hp: form.hp.trim(),
        status: form.status,
      });
      toast.success('Data pegawai berhasil diperbarui');
    } else {
      const newPegawai: Pegawai = {
        id: Date.now(),
        nip: form.nip.trim(),
        nama: form.nama.trim(),
        jenisASN: form.jenisASN,
        jabatan: form.jabatan.trim(),
        golongan: form.golongan,
        kecamatan: form.kecamatan.trim(),
        unitKerja: form.unitKerja.trim(),
        email: form.email.trim(),
        hp: form.hp.trim(),
        tanggalLahir: '',
        status: form.status,
      };
      addPegawai(newPegawai);
      toast.success('Pegawai baru berhasil ditambahkan');
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {pegawai ? 'Edit Pegawai' : 'Tambah Pegawai'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 py-2">
          {/* NIP/NIK */}
          <div className="space-y-2">
            <Label htmlFor="nip">NIP/NIK <span className="text-red-500">*</span></Label>
            <Input id="nip" placeholder="Masukkan NIP atau NIK" value={form.nip}
              onChange={(e) => updateField('nip', e.target.value)} />
          </div>

          {/* Nama Lengkap */}
          <div className="space-y-2">
            <Label htmlFor="nama">Nama Lengkap <span className="text-red-500">*</span></Label>
            <Input id="nama" placeholder="Masukkan nama lengkap" value={form.nama}
              onChange={(e) => updateField('nama', e.target.value)} />
          </div>

          {/* Jenis ASN */}
          <div className="space-y-2">
            <Label htmlFor="jenisASN">Jenis ASN <span className="text-red-500">*</span></Label>
            <select id="jenisASN" value={form.jenisASN}
              onChange={(e) => updateField('jenisASN', e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
              <option value="">-- Pilih Jenis ASN --</option>
              {jenisASNOptions.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.items.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Jabatan/Pangkat */}
          <div className="space-y-2">
            <Label htmlFor="jabatan">Jabatan/Pangkat</Label>
            <select id="jabatan" value={form.jabatan}
              onChange={(e) => updateField('jabatan', e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
              <option value="">-- Pilih Jabatan --</option>
              {JABATAN_OPTIONS.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.items.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Golongan */}
          <div className="space-y-2">
            <Label htmlFor="golongan">Golongan</Label>
            <select id="golongan" value={form.golongan}
              onChange={(e) => updateField('golongan', e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
              <option value="">-- Pilih Golongan --</option>
              {GOLONGAN_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Kecamatan */}
          <div className="space-y-2">
            <Label htmlFor="kecamatan">Kecamatan</Label>
            <select id="kecamatan" value={form.kecamatan}
              onChange={(e) => updateField('kecamatan', e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
              <option value="">-- Pilih Kecamatan --</option>
              {KECAMATAN_OPTIONS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          {/* Unit Kerja */}
          <div className="space-y-2">
            <Label htmlFor="unitKerja">Unit Kerja</Label>
            <Input id="unitKerja" placeholder="Masukkan unit kerja" value={form.unitKerja}
              onChange={(e) => updateField('unitKerja', e.target.value)} />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="contoh@email.com" value={form.email}
              onChange={(e) => updateField('email', e.target.value)} />
          </div>

          {/* No HP */}
          <div className="space-y-2">
            <Label htmlFor="hp">No HP</Label>
            <Input id="hp" placeholder="08xxxxxxxxxx" value={form.hp}
              onChange={(e) => updateField('hp', e.target.value)} />
          </div>

          {/* Status - full width */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="status">Status</Label>
            <select id="status" value={form.status}
              onChange={(e) => updateField('status', e.target.value as 'Aktif' | 'Nonaktif')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave}
            className="bg-[#3c6eff] hover:bg-[#3c6eff]/90 text-white">Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}