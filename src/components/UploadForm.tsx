import React, { useState, useEffect } from 'react';
import { UploadCloud, File, AlertCircle, RefreshCw } from 'lucide-react';
import { KategoriArsip, JenisDokumen, Arsip } from '../types';

interface UploadFormProps {
  kategoriList: KategoriArsip[];
  jenisDokumenList: JenisDokumen[];
  isSubmitting: boolean;
  onSubmit: (formData: FormData) => void;
  editArsip?: Arsip | null; // If editing an existing archive
  onCancelEdit?: () => void;
}

export const UploadForm: React.FC<UploadFormProps> = ({
  kategoriList,
  jenisDokumenList,
  isSubmitting,
  onSubmit,
  editArsip = null,
  onCancelEdit
}) => {
  const [kelompok, setKelompok] = useState('');
  const [jenisDoc, setJenisDoc] = useState('');
  const [namaDoc, setNamaDoc] = useState('');
  const [nomorDoc, setNomorDoc] = useState('');
  const [tanggalDoc, setTanggalDoc] = useState('');
  const [tahun, setTahun] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [keterangan, setKeterangan] = useState('');
  const [filteredJenis, setFilteredJenis] = useState<JenisDokumen[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [formError, setFormError] = useState('');

  // Hydrate fields if in Edit Mode
  useEffect(() => {
    if (editArsip) {
      setKelompok(editArsip.kelompokArsip);
      setJenisDoc(editArsip.jenisDokumen);
      setNamaDoc(editArsip.namaDokumen);
      setNomorDoc(editArsip.nomorDokumen);
      // Ensure date format is YYYY-MM-DD
      setTanggalDoc(editArsip.tanggalDokumen || '');
      setTahun(editArsip.tahun);
      setKeterangan('');
    } else {
      // Clear fields
      setKelompok('');
      setJenisDoc('');
      setNamaDoc('');
      setNomorDoc('');
      setTanggalDoc('');
      setTahun('');
      setFile(null);
      setKeterangan('');
    }
    setFormError('');
  }, [editArsip]);

  // Filter Document Types dropdown based on selected Group
  useEffect(() => {
    if (kelompok) {
      const match = kategoriList.find(c => c.namaKategori === kelompok);
      if (match) {
        const filtered = jenisDokumenList.filter(jd => jd.kategoriId === match.id);
        setFilteredJenis(filtered);
      } else {
        // Fallback checks
        const filtered = jenisDokumenList.filter(jd => jd.namaKategori === kelompok);
        setFilteredJenis(filtered);
      }
    } else {
      setFilteredJenis([]);
    }
  }, [kelompok, kategoriList, jenisDokumenList]);

  // Handle specific auto-suggesting for Nama Dokumen when Jenis is toggled
  const handleJenisChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setJenisDoc(val);
    
    // Auto populate a friendly default name matching the document type
    if (val && !namaDoc) {
      setNamaDoc(`${val}`);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateVal = e.target.value;
    setTanggalDoc(dateVal);
    // Auto-extract year
    if (dateVal && dateVal.length >= 4) {
      setTahun(dateVal.substring(0, 4));
    }
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setFormError('');
    // Max 10MB
    if (selectedFile.size > 10 * 1024 * 1024) {
      setFormError('Berkas terlalu besar! Maksimal ukuran file adalah 10 MB.');
      return;
    }
    // Allowed extensions
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'];
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) {
      setFormError('Format berkas tidak didukung. Unggah PDF, Gambar, Word, atau Excel.');
      return;
    }
    setFile(selectedFile);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!kelompok || !jenisDoc || !namaDoc || !tanggalDoc || !tahun) {
      setFormError('Mohon lengkapi seluruh kolom formulir wajib.');
      return;
    }

    if (!editArsip && !file) {
      setFormError('Silakan pilih berkas dokumen untuk diunggah.');
      return;
    }

    const payload = new FormData();
    payload.append('kelompokArsip', kelompok);
    payload.append('jenisDokumen', jenisDoc);
    payload.append('namaDokumen', namaDoc);
    payload.append('nomorDokumen', nomorDoc);
    payload.append('tanggalDokumen', tanggalDoc);
    payload.append('tahun', tahun);
    payload.append('keterangan', keterangan);
    if (file) {
      payload.append('file', file);
    }

    onSubmit(payload);
  };

  return (
    <form id="asn-upload-form" onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <div className="p-3.5 bg-red-50/70 border border-red-200/65 text-red-700 text-xs font-semibold rounded-xl flex items-start gap-2.5 animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <p>{formError}</p>
        </div>
      )}

      {/* Kelompok / Grup */}
      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
          Kelompok Arsip <span className="text-red-500">*</span>
        </label>
        <select
          value={kelompok}
          onChange={(e) => {
            setKelompok(e.target.value);
            setJenisDoc('');
          }}
          className="w-full h-11 border border-slate-200 rounded-xl px-3 bg-white text-sm font-medium focus:outline-none focus:border-[#0f2a44] transition-all"
          required
        >
          <option value="">-- Pilih Kelompok Arsip --</option>
          {kategoriList.map(c => (
            <option key={c.id} value={c.namaKategori}>{c.namaKategori}</option>
          ))}
        </select>
      </div>

      {/* Jenis Dokumen */}
      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
          Jenis Dokumen <span className="text-red-500">*</span>
        </label>
        <select
          value={jenisDoc}
          onChange={handleJenisChange}
          disabled={!kelompok}
          className="w-full h-11 border border-slate-200 rounded-xl px-3 bg-white text-sm font-medium focus:outline-none focus:border-[#0f2a44] transition-all disabled:bg-slate-50 disabled:text-slate-400"
          required
        >
          <option value="">-- Pilih Jenis Dokumen --</option>
          {filteredJenis.map(jd => (
            <option key={jd.id} value={jd.namaDokumen}>
              {jd.namaDokumen} {jd.wajib ? '(Wajib)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Nama Dokumen */}
      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
          Nama Dokumen <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={namaDoc}
          onChange={(e) => setNamaDoc(e.target.value)}
          placeholder="Contoh: SK CPNS Ahmad Hidayat"
          className="w-full h-11 border border-slate-200 rounded-xl px-3 text-sm font-medium focus:outline-none focus:border-[#0f2a44] transition-all"
          required
        />
        <p className="text-[10px] text-slate-400 mt-1">Nama deskriptif untuk membedakan dokumen arsip Anda.</p>
      </div>

      {/* Nomor Dokumen */}
      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
          Nomor Dokumen <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={nomorDoc}
          onChange={(e) => setNomorDoc(e.target.value)}
          placeholder="Contoh: 800/1234/Kepeg.2024"
          className="w-full h-11 border border-slate-200 rounded-xl px-3 text-sm font-medium focus:outline-none focus:border-[#0f2a44] transition-all"
          required
        />
      </div>

      {/* Grid: Tanggal & Tahun */}
      <div className="grid grid-cols-2 gap-3.5">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
            Tanggal Dokumen <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={tanggalDoc}
            onChange={handleDateChange}
            className="w-full h-11 border border-slate-200 rounded-xl px-3 text-sm font-medium focus:outline-none focus:border-[#0f2a44] transition-all bg-white"
            required
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
            Tahun <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={tahun}
            onChange={(e) => setTahun(e.target.value)}
            placeholder="Tahun terbit"
            min="1950"
            max="2035"
            className="w-full h-11 border border-slate-200 rounded-xl px-3 text-sm font-medium focus:outline-none focus:border-[#0f2a44] transition-all"
            required
          />
        </div>
      </div>

      {/* File Upload Zone (Supports standard drag-and-drop & click-to-upload) */}
      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
          {editArsip ? 'Ganti Berkas Dokumen (Opsional)' : 'Pilih Berkas Dokumen'} <span className="text-red-500">*</span>
        </label>
        
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            dragActive ? 'border-[#0f2a44] bg-[#0f2a44]/5' : 'border-slate-300 hover:border-[#0f2a44] bg-slate-50/50'
          }`}
          onClick={() => document.getElementById('file-native-picker')?.click()}
        >
          <input
            type="file"
            id="file-native-picker"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
          />
          <div className="flex flex-col items-center justify-center">
            <UploadCloud className={`w-8 h-8 mb-2 ${dragActive ? 'text-[#0f2a44]' : 'text-slate-400'}`} />
            <p className="text-xs font-bold text-slate-700">
              {file ? 'Ganti file terpilih' : 'Seret & Letakkan Berkas atau Klik Untuk Memilih'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              PDF, JPG, JPEG, PNG, DOCX, XLSX (Maks. 10 MB)
            </p>
          </div>
        </div>

        {file && (
          <div className="mt-2.5 p-3.5 bg-blue-50/70 border border-blue-200/50 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-800 font-medium">
            <div className="flex items-center gap-2 truncate">
              <File className="w-4 h-4 shrink-0 text-[#1d4ed8]" />
              <span className="truncate">{file.name}</span>
            </div>
            <span className="text-[10px] bg-blue-100/70 px-2.5 py-0.5 rounded-full shrink-0 font-bold">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
        )}

        {editArsip && !file && (
          <div className="mt-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center gap-2.5 text-xs text-slate-600 font-medium tracking-tight">
            <File className="w-4 h-4 shrink-0 text-slate-400" />
            <p className="truncate">Telah terunggah: <span className="font-bold text-slate-800">{editArsip.fileName}</span></p>
          </div>
        )}
      </div>

      {editArsip && (
        <div className="bg-yellow-50/80 border border-yellow-200/50 text-xs text-yellow-800 p-3.5 rounded-xl font-medium tracking-tight leading-snug">
          MENGEDIT DOKUMEN: Status validasi akan otomatis dikembalikan menjadi <b className="text-yellow-700 font-bold">Menunggu Validasi</b> agar dikonfirmasi kembali oleh admin instansi.
        </div>
      )}

      {/* Submit Trigger Actions */}
      <div className="flex gap-2.5 pt-3">
        {editArsip && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            disabled={isSubmitting}
            className="flex-1 min-h-[44px] border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 min-h-[44px] bg-[#0f2a44] text-white text-xs font-bold rounded-xl hover:bg-[#1a3d5e] transition-all flex items-center justify-center gap-2 shadow-sm focus:outline-none disabled:bg-slate-350"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Menyimpan...
            </>
          ) : editArsip ? (
            'Simpan Pembaruan Dokumen'
          ) : (
            'Simpan Dokumen Arsip'
          )}
        </button>
      </div>
    </form>
  );
};
export default UploadForm;

