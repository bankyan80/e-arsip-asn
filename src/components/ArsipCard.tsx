import React, { useState } from 'react';
import { FileText, Eye, Edit, Trash2, Calendar, HardDrive, FileSpreadsheet, Image as ImageIcon, History, Download, X } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { Arsip } from '../types';

interface ArsipCardProps {
  arsip: Arsip;
  onView: (id: string, url: string) => void;
  onEdit: (arsip: Arsip) => void;
  onDelete: (id: string) => void;
  isEmployeeView?: boolean;
  onValidate?: (id: string) => void; // for admin
}

export const ArsipCard: React.FC<ArsipCardProps> = ({
  arsip,
  onView,
  onEdit,
  onDelete,
  isEmployeeView = true,
  onValidate
}) => {
  const [showHistory, setShowHistory] = useState(false);

  const getFileIcon = (mime: string) => {
    if (mime.includes('image')) return <ImageIcon className="w-4 h-4 text-indigo-500" />;
    if (mime.includes('sheet') || mime.includes('excel') || mime.includes('xls')) return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
    return <FileText className="w-4 h-4 text-blue-600" />;
  };

  const getReadableSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatDateString = (dtStr: string) => {
    if (!dtStr) return '-';
    try {
      const bits = dtStr.split('-');
      if (bits.length === 3) {
        return `${bits[2]}/${bits[1]}/${bits[0]}`;
      }
      return new Date(dtStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dtStr;
    }
  };

  const historyList = arsip.versionHistory || [
    {
      versionId: 'V1',
      fileName: arsip.fileName,
      fileSize: arsip.fileSize,
      downloadUrl: arsip.downloadUrl,
      updatedAt: arsip.uploadedAt || arsip.updatedAt || new Date().toISOString(),
      updatedByNama: `${arsip.namaPegawai} (Pegawai)`,
      statusValidasi: arsip.statusValidasi,
      nomorDokumen: arsip.nomorDokumen,
      tanggalDokumen: arsip.tanggalDokumen,
      tahun: arsip.tahun,
      catatanAdmin: arsip.catatanAdmin || '',
      changeSummary: 'Unggah berkas pertama'
    }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden animate-fade-in duration-300">
      
      {/* Grouping Header with embedded version flag */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
            {arsip.kelompokArsip}
          </span>
          <span className="text-slate-300 text-[10px]">•</span>
          <span className="text-[10px] font-semibold text-slate-500 truncate block">
            {arsip.jenisDokumen}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHistory(true)}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-500 text-[9px] font-bold rounded-lg transition-all border border-slate-200/50"
            title="Lihat riwayat versi"
          >
            <History className="w-2.5 h-2.5 text-[#0f2a44]" />
            V{historyList.length}
          </button>
          <StatusBadge status={arsip.statusValidasi} />
        </div>
      </div>

      {/* Primary Details Area */}
      <div className="flex gap-4 mb-4">
        <div className="bg-slate-50 p-2.5 rounded-xl shrink-0 h-fit flex items-center justify-center border border-slate-150">
          {getFileIcon(arsip.fileType)}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-display font-bold text-slate-800 leading-snug break-words">
            {arsip.namaDokumen}
          </h4>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            No: <span className="font-mono font-semibold text-slate-700">{arsip.nomorDokumen || '-'}</span>
          </p>
          
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-[10px] text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 stroke-[1.8]" />
              {formatDateString(arsip.tanggalDokumen)} ({arsip.tahun})
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 stroke-[1.8]" />
              {getReadableSize(arsip.fileSize)}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Catatans / Feedback blocks */}
      {arsip.catatanAdmin && (
        <div className="bg-yellow-50/60 rounded-xl p-3 border border-yellow-105 text-[11px] text-yellow-800 mb-4 flex flex-col gap-1">
          <span className="font-bold uppercase tracking-wider text-[9px] text-yellow-600 leading-none">
            Catatan Verifikasi Admin:
          </span>
          <p className="leading-relaxed font-medium block">
            "{arsip.catatanAdmin}"
          </p>
        </div>
      )}

      {/* For admin mode - shows employee info */}
      {!isEmployeeView && (
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4 text-[11px] text-slate-600">
          <div className="flex justify-between">
            <span className="font-bold text-slate-700">{arsip.namaPegawai}</span>
            <span className="font-mono text-[10px] text-slate-500">{arsip.nip}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">{arsip.namaInstansi}</p>
        </div>
      )}

      {/* Action Buttons with high touch target spacing */}
      <div className="flex gap-2 border-t border-slate-100 pt-4">
        <button
          onClick={() => onView(arsip.id, arsip.downloadUrl)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100/80 text-[#1d4ed8] text-xs font-semibold rounded-xl transition-all min-h-[44px]"
        >
          <Eye className="w-4 h-4 stroke-[2]" />
          Lihat
        </button>

        {isEmployeeView ? (
          <>
            <button
              onClick={() => onEdit(arsip)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-50 hover:bg-slate-100/90 text-slate-700 text-xs font-semibold rounded-xl transition-all min-h-[44px]"
            >
              <Edit className="w-4 h-4 stroke-[2]" />
              Edit
            </button>

            <button
              onClick={() => setShowHistory(true)}
              className="inline-flex items-center justify-center p-2.5 bg-slate-50 hover:bg-slate-150/90 text-slate-600 rounded-xl transition-all min-h-[44px]"
              title="Riwayat Versi Dokumen"
            >
              <History className="w-4 h-4 stroke-[2]" />
            </button>

            <button
              onClick={() => onDelete(arsip.id)}
              className="inline-flex items-center justify-center p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all min-h-[44px]"
              title="Hapus Dokumen"
            >
              <Trash2 className="w-4 h-4 stroke-[2]" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowHistory(true)}
              className="inline-flex items-center justify-center p-2.5 bg-slate-50 hover:bg-slate-150/90 text-slate-600 rounded-xl transition-all min-h-[44px]"
              title="Riwayat Versi Dokumen"
            >
              <History className="w-4 h-4 stroke-[2]" />
            </button>

            {onValidate && (
              <button
                onClick={() => onValidate(arsip.id)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0f2a44] hover:bg-[#1a3d5e] text-white text-xs font-bold rounded-xl transition-all min-h-[44px]"
              >
                Verifikasi & Validasi
              </button>
            )}
          </>
        )}
      </div>

      {/* Riwayat Versi Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden animate-fade-in text-left">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#0f2a44] text-white rounded-lg">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-800 text-left">Riwayat Versi Dokumen</h3>
                  <p className="text-[10px] text-slate-500 font-medium font-mono">ID: {arsip.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistory(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Timeline scroll */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              <div className="border bg-slate-50/40 rounded-xl p-3 border-slate-200/55 mb-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Dokumen Saat Ini</span>
                <h4 className="text-xs font-display font-bold text-slate-705 truncate mt-0.5">{arsip.namaDokumen}</h4>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200/40 text-xs">
                  <span className="text-[11px] text-slate-500 font-medium">Total Versi Terarsip:</span>
                  <span className="bg-blue-50 text-[#1d4ed8] text-[10px] font-bold px-2.2 py-0.5 rounded-full font-mono">V{historyList.length}</span>
                </div>
              </div>

              <div className="relative border-l border-slate-250 pl-4 ml-2.5 space-y-5">
                {historyList.slice().reverse().map((ver, idx) => {
                  const isLatest = idx === 0;
                  return (
                    <div key={ver.versionId} className="relative">
                      {/* Timeline Dot icon */}
                      <span className={`absolute -left-[23px] top-1 flex h-4 w-4 items-center justify-center rounded-full border ${
                        isLatest 
                          ? 'bg-[#0f2a44] border-[#0f2a44] text-white font-bold' 
                          : 'bg-white border-slate-350 text-slate-600'
                        }`}
                      >
                        <span className="text-[8px] font-mono leading-none">{ver.versionId}</span>
                      </span>

                      {/* Version Content Card */}
                      <div className={`p-4 rounded-xl border transition-all ${
                        isLatest 
                          ? 'bg-slate-50/80 border-slate-300' 
                          : 'bg-white border-slate-150'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-bold text-slate-750">Versi {ver.versionId}</span>
                          <StatusBadge status={ver.statusValidasi} />
                        </div>

                        {/* Changelog Summary */}
                        <div className="text-[11px] font-medium text-slate-700 bg-slate-100/60 px-2 py-1 rounded border border-slate-200/30 mb-2.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8] inline-block animate-pulse"></span>
                          {ver.changeSummary || 'Sunting Dokumen'}
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-medium mt-2">
                          <div>
                            <span className="block text-[8px] font-bold uppercase text-slate-400">Nama File</span>
                            <span className="block text-slate-700 truncate font-mono" title={ver.fileName}>{ver.fileName}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-bold uppercase text-slate-400">Ukuran Berkas</span>
                            <span className="block text-slate-700 font-mono">{getReadableSize(ver.fileSize)}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-bold uppercase text-slate-400">Tanggal Modifikasi</span>
                            <span className="block text-slate-700 font-mono">
                              {formatDateString(ver.updatedAt.split('T')[0])} 
                              {ver.updatedAt.includes('T') ? ' ' + ver.updatedAt.split('T')[1].substring(0, 5) : ''}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-bold uppercase text-slate-400">Diperbarui / Diotorisasi Oleh</span>
                            <span className="block font-semibold text-slate-800 truncate" title={ver.updatedByNama}>
                              {ver.updatedByNama || '-'}
                            </span>
                          </div>
                        </div>

                        {/* Document Metadata details specific at this version */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-3 gap-1.5 text-[9px] text-slate-500 font-semibold">
                          <div>
                            No: <span className="font-mono text-slate-700">{ver.nomorDokumen || '-'}</span>
                          </div>
                          <div>
                            Tgl Dok: <span className="text-slate-700">{formatDateString(ver.tanggalDokumen)}</span>
                          </div>
                          <div>
                            Tahun: <span className="text-slate-700">{ver.tahun}</span>
                          </div>
                        </div>

                        {/* Admin comment block for this version */}
                        {ver.catatanAdmin && (
                          <div className="mt-2.5 bg-yellow-50/70 rounded-lg p-2 border border-yellow-200/80 text-[10px] text-yellow-805 flex flex-col gap-0.5">
                            <span className="font-bold text-[8px] text-yellow-600 uppercase tracking-wide leading-none">
                              Catatan Verifikator:
                            </span>
                            <p className="font-medium italic leading-normal">
                              "{ver.catatanAdmin}"
                            </p>
                          </div>
                        )}

                        {/* Download version button */}
                        <div className="mt-3 flex justify-end">
                          <a
                            href={ver.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0f2a44] text-white hover:bg-[#1a3d5e] text-[10px] font-bold rounded-lg transition-all shadow-sm focus:outline-none"
                          >
                            <Download className="w-3 h-3 text-white" />
                            Unduh Versi Ini
                          </a>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-105 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowHistory(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-all min-h-[38px] cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default ArsipCard;

