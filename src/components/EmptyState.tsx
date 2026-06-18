import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onAction?: () => void;
  actionText?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Belum Ada Dokumen',
  description = 'Anda belum pernah mengunggah dokumen pada kategori ini.',
  onAction,
  actionText
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white rounded-2xl border border-dashed border-slate-200">
      <div className="bg-[#0f2a44]/5 p-4 rounded-full text-[#0f2a44] mb-3">
        <Inbox className="w-8 h-8 stroke-[1.5]" />
      </div>
      <h3 className="text-sm font-display font-bold text-slate-800">{title}</h3>
      <p className="mt-1 text-xs text-slate-450 max-w-[255px] leading-relaxed">
        {description}
      </p>
      {onAction && actionText && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2.5 bg-[#0f2a44] text-white text-xs font-semibold rounded-xl hover:bg-[#1a3d5e] transition-all shadow-sm focus:outline-none"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
export default EmptyState;

