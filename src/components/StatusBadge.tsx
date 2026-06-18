import React from 'react';

interface StatusBadgeProps {
  status: 'Belum Upload' | 'Menunggu Validasi' | 'Valid' | 'Perlu Perbaikan' | 'Ditolak' | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let bgClass = 'bg-gray-100 text-gray-700';
  let dotClass = 'bg-gray-400';

  if (status === 'Valid') {
    bgClass = 'bg-green-50 text-green-700 border border-green-200';
    dotClass = 'bg-green-600';
  } else if (status === 'Menunggu Validasi') {
    bgClass = 'bg-yellow-50 text-yellow-800 border border-yellow-200';
    dotClass = 'bg-yellow-500';
  } else if (status === 'Perlu Perbaikan') {
    bgClass = 'bg-red-50 text-red-700 border border-red-200';
    dotClass = 'bg-red-500 animate-pulse';
  } else if (status === 'Ditolak') {
    bgClass = 'bg-purple-50 text-purple-700 border border-purple-200';
    dotClass = 'bg-purple-500';
  } else if (status === 'Belum Upload') {
    bgClass = 'bg-slate-100 text-slate-500 border border-slate-200';
    dotClass = 'bg-slate-400';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${bgClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></span>
      {status}
    </span>
  );
};
