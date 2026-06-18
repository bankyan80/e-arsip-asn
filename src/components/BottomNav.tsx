import React from 'react';
import { Home, UploadCloud, Folder, FileCheck, User } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
  countBadges?: {
    revisions?: number;
    pending?: number;
  };
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onChangeTab, countBadges = {} as { revisions?: number; pending?: number } }) => {
  const navItems = [
    { id: 'beranda', label: 'Beranda', icon: Home },
    { id: 'upload', label: 'Upload', icon: UploadCloud },
    { id: 'arsip', label: 'Arsip', icon: Folder },
    { id: 'kelengkapan', label: 'Kelengkapan', icon: FileCheck },
    { id: 'profil', label: 'Profil', icon: User },
  ];

  return (
    <div id="asn-bottom-navigation" className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/80 shadow-lg md:max-w-md md:mx-auto md:rounded-t-[20px]">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = currentTab === item.id;
          
          return (
            <button
              id={`nav-tab-${item.id}`}
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-all focus:outline-none min-h-[44px] ${
                isActive ? 'text-[#0f2a44]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <IconComponent className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 text-[#0f2a44]' : 'text-slate-400'}`} />
                
                {/* Specific custom badges */}
                {item.id === 'kelengkapan' && countBadges.revisions && countBadges.revisions > 0 ? (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full scale-90 animate-bounce">
                    {countBadges.revisions}
                  </span>
                ) : null}

                {item.id === 'arsip' && countBadges.pending && countBadges.pending > 0 ? (
                  <span className="absolute -top-1.5 -right-2 bg-yellow-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full scale-90">
                    {countBadges.pending}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] mt-1 font-medium transition-all ${isActive ? 'font-bold text-[#0f2a44]' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default BottomNav;

