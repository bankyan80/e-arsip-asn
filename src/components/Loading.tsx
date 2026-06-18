import React from 'react';

export const Loading: React.FC<{ message?: string }> = ({ message = 'Memuat data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-10 h-10 border-4 border-[#0f2a44] border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-3 text-sm text-slate-500 font-medium">{message}</p>
    </div>
  );
};
export default Loading;
