import React from 'react';
import { LogOut, Archive } from 'lucide-react';

interface HeaderProps {
  userName?: string;
  agencyName?: string;
  role?: string;
  onLogout: () => void;
  isAdminView?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ userName, agencyName, role, onLogout }) => {
  return (
    <header id="app-main-header" className="sticky top-0 z-30 bg-[#0f2a44] text-white shadow-lg px-6 pt-5 pb-5 rounded-b-[28px] border-b border-[#1e3a5f]/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl text-white backdrop-blur-md border border-white/10">
            <Archive className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h1 className="text-base font-display font-bold tracking-tight">Arsip Digital ASN</h1>
            <p className="text-[10px] text-white/60 font-medium truncate max-w-[180px] sm:max-w-[240px]">
              {agencyName || 'Instansi Pemerintah'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {userName && (
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-semibold text-white truncate max-w-[140px]">{userName}</span>
              <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full ${
                role === 'admin_instansi' || role === 'super_admin' ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30' : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
              }`}>
                {role === 'admin_instansi' ? 'Admin' : role === 'super_admin' ? 'Super Admin' : 'ASN'}
              </span>
            </div>
          )}

          <button
            id="btn-logout"
            onClick={onLogout}
            title="Keluar Aplikasi"
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all focus:outline-none"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
export default Header;
