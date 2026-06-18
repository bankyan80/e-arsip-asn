import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  bgColor?: string;
  textColor?: string;
  iconBgColor?: string;
  iconColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: IconComponent,
  bgColor = 'bg-white',
  textColor = 'text-[#0f2a44]',
  iconBgColor = 'bg-[#0f2a44]/5',
  iconColor = 'text-[#0f2a44]'
}) => {
  return (
    <div className={`p-5 rounded-2xl border border-slate-200/50 shadow-sm flex items-center gap-4 transition-all hover:shadow-md ${bgColor}`}>
      {IconComponent && (
        <div className={`p-3 rounded-xl ${iconBgColor} ${iconColor} shrink-0`}>
          <IconComponent className="w-5 h-5 stroke-[2]" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold truncate mb-1">
          {title}
        </p>
        <p className={`text-2xl font-display font-bold tracking-tight ${textColor}`}>
          {value}
        </p>
      </div>
    </div>
  );
};
export default StatCard;

