'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Archive,
  LayoutDashboard,
  Users,
  FileUp,
  Search,
  CheckCircle,
  BarChart3,
  Hourglass,
  Mail,
  Send,
  FolderOpen,
  Moon,
  Sun,
  Bell,
  LogOut,
  Menu,
  Check,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  UserCircle,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useArsipStore } from '@/lib/store';
import type { PageType, Notifikasi } from '@/lib/types';

// ===== Types =====

interface NavItem {
  icon: React.ElementType;
  label: string;
  page: PageType;
  adminOnly?: boolean;
  pegawaiOnly?: boolean;
  separate?: boolean;
}

interface SuratSubItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

// ===== Constants =====

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', page: 'dashboard' },
  { icon: Users, label: 'Data Pegawai', page: 'pegawai' },
  { icon: FileUp, label: 'Upload Dokumen', page: 'dokumen' },
  { icon: Search, label: 'Pencarian Arsip', page: 'arsip' },
  { icon: CheckCircle, label: 'Approval', page: 'approval', adminOnly: true },
  { icon: BarChart3, label: 'Laporan', page: 'laporan', adminOnly: true },
  { icon: Hourglass, label: 'BUP Pensiun', page: 'bup', adminOnly: true },
  { icon: UserCircle, label: 'Edit Profil', page: 'profil', pegawaiOnly: true, separate: true },
];

const SURAT_SUB_ITEMS: SuratSubItem[] = [
  { icon: Mail, label: 'Surat Masuk', href: '/e-surat/masuk' },
  { icon: Send, label: 'Surat Keluar', href: '/e-surat/keluar' },
  { icon: FolderOpen, label: 'Arsip Surat', href: '/e-surat/arsip' },
];

const PAGE_TITLES: Record<PageType, string> = {
  dashboard: 'Dashboard',
  pegawai: 'Data Pegawai',
  dokumen: 'Upload Dokumen',
  arsip: 'Pencarian Arsip',
  approval: 'Approval',
  laporan: 'Laporan',
  bup: 'BUP Pensiun',
  profil: 'Edit Profil',
  pengaturan: 'Pengaturan',
};

const ACCENT = '#3c6eff';

// ===== Helpers =====

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHr < 24) return `${diffHr} jam lalu`;
  if (diffDay < 30) return `${diffDay} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getNotifIcon(type: Notifikasi['type']) {
  switch (type) {
    case 'success':
      return <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
    case 'warning':
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
    case 'error':
      return <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />;
    case 'info':
      return <Info className="h-3.5 w-3.5 text-sky-500 shrink-0" />;
  }
}

// ===== Sidebar Content (shared between desktop & mobile) =====

function SidebarContent({
  activePage,
  setActivePage,
  filteredItems,
  currentUser,
  logout,
  onNavigate,
  suratExpanded,
  setSuratExpanded,
  currentPath,
}: {
  activePage: PageType;
  setActivePage: (page: PageType) => void;
  filteredItems: NavItem[];
  currentUser: { role: string; nama: string; nip: string };
  logout: () => void;
  onNavigate?: () => void;
  suratExpanded: boolean;
  setSuratExpanded: (v: boolean) => void;
  currentPath: string;
}) {
  const router = useRouter();

  const handleNav = (page: PageType) => {
    setActivePage(page);
    onNavigate?.();
  };

  const handleSuratNav = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  const isSuratActive = currentPath.startsWith('/e-surat');

  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-950">
      {/* Logo Area */}
      <div className="flex shrink-0 items-center gap-3 px-5 py-5">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl shadow-md overflow-hidden"
          style={{ backgroundColor: ACCENT, boxShadow: `0 4px 14px ${ACCENT}33` }}
        >
          <img
            src="/logo.jpg"
            alt="Logo"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-foreground">
            E-Arsip ASN
          </span>
          <span className="text-[11px] leading-tight font-medium text-muted-foreground">
            Dinas Pendidikan
          </span>
          <span className="text-[10px] leading-tight text-muted-foreground/70">
            Kabupaten Cirebon
          </span>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="flex flex-col gap-1" role="navigation" aria-label="Menu utama">
          {filteredItems.map((item) => {
            const isActive = activePage === item.page;
            const Icon = item.icon;

            return (
              <div key={item.page}>
                {item.separate && <Separator className="my-1.5" />}
                <button
                  onClick={() => handleNav(item.page)}
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 outline-none',
                    'focus-visible:ring-2 focus-visible:ring-[#3c6eff]/40 focus-visible:ring-offset-1',
                    isActive
                      ? 'font-semibold text-[#3c6eff]'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-bar"
                      className="absolute right-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-l-full"
                      style={{ backgroundColor: ACCENT }}
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}

                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-bg"
                      className="absolute inset-0 rounded-lg"
                      style={{ backgroundColor: `${ACCENT}0D` }}
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}

                  <Icon
                    className={cn(
                      'relative z-10 h-[18px] w-[18px] shrink-0 transition-colors',
                      isActive ? 'text-[#3c6eff]' : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  />
                  <span className="relative z-10 truncate">{item.label}</span>
                </button>
              </div>
            );
          })}

          {/* ===== Manajemen Surat (Collapsible - Admin Only) ===== */}
          {currentUser.role === 'admin' && (
            <div className="mt-1">
              <button
                onClick={() => setSuratExpanded(!suratExpanded)}
                className={cn(
                  'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 outline-none',
                  'focus-visible:ring-2 focus-visible:ring-[#3c6eff]/40 focus-visible:ring-offset-1',
                  isSuratActive
                    ? 'font-semibold text-[#3c6eff]'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                )}
              >
                {isSuratActive && (
                  <motion.div
                    layoutId="sidebar-active-bar"
                    className="absolute right-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-l-full"
                    style={{ backgroundColor: ACCENT }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                {isSuratActive && (
                  <motion.div
                    layoutId="sidebar-active-bg"
                    className="absolute inset-0 rounded-lg"
                    style={{ backgroundColor: `${ACCENT}0D` }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Mail
                  className={cn(
                    'relative z-10 h-[18px] w-[18px] shrink-0 transition-colors',
                    isSuratActive ? 'text-[#3c6eff]' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                <span className="relative z-10 flex-1 truncate">Manajemen Surat</span>
                <motion.div
                  animate={{ rotate: suratExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative z-10"
                >
                  <ChevronRight className="h-4 w-4" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {suratExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-5 mt-1 flex flex-col gap-0.5 border-l-2 border-muted pl-3">
                      {SURAT_SUB_ITEMS.map((sub) => {
                        const subActive = currentPath === sub.href;
                        const SubIcon = sub.icon;
                        return (
                          <button
                            key={sub.href}
                            onClick={() => handleSuratNav(sub.href)}
                            className={cn(
                              'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors text-left',
                              subActive
                                ? 'bg-[#3c6eff]/10 text-[#3c6eff] font-semibold'
                                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                            )}
                          >
                            <SubIcon className="h-4 w-4 shrink-0" />
                            <span>{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </nav>
      </ScrollArea>

      <Separator />

      {/* User Info */}
      <div className="shrink-0 px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-muted">
            <AvatarFallback
              className="bg-[#3c6eff]/10 text-xs font-bold text-[#3c6eff]"
            >
              {getInitials(currentUser.nama)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-foreground">
              {currentUser.nama}
            </span>
            <span className="truncate text-[11px] font-medium capitalize text-muted-foreground">
              {currentUser.role === 'admin' ? 'Administrator' : 'Pegawai'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
            onClick={logout}
            aria-label="Keluar"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===== Notification Popover =====

function NotificationPopover() {
  const { notifikasiList, markNotifRead, clearNotifikasi } = useArsipStore();

  const unreadCount = notifikasiList.filter((n) => !n.read).length;
  const visibleNotifs = notifikasiList.slice(0, 8);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label="Notifikasi"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <Badge className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white border-2 border-white dark:border-zinc-950">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold text-foreground">Notifikasi</span>
          {notifikasiList.length > 0 && (
            <button
              onClick={clearNotifikasi}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-red-500"
            >
              Hapus semua
            </button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto">
          {visibleNotifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Tidak ada notifikasi</p>
            </div>
          ) : (
            visibleNotifs.map((notif) => (
              <button
                key={notif.id}
                onClick={() => markNotifRead(notif.id)}
                className={cn(
                  'flex w-full items-start gap-2.5 border-b px-4 py-3 text-left transition-colors last:border-b-0',
                  'hover:bg-muted/40',
                  !notif.read && 'bg-blue-50/50 dark:bg-blue-950/20'
                )}
              >
                <div className="mt-0.5 rounded-full bg-muted p-1.5">
                  {getNotifIcon(notif.type)}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p
                    className={cn(
                      'text-[13px] leading-snug',
                      notif.read
                        ? 'text-muted-foreground'
                        : 'font-medium text-foreground'
                    )}
                  >
                    {notif.message}
                  </p>
                  <span className="text-[11px] text-muted-foreground/70">
                    {formatRelativeTime(notif.createdAt)}
                  </span>
                </div>
                {!notif.read && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#3c6eff]" />
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ===== Theme Toggle =====

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useState(() => {
    setMounted(true);
  });

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Toggle tema">
        <Sun className="h-[18px] w-[18px] text-muted-foreground" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme === 'dark' ? 'moon' : 'sun'}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-center"
        >
          {theme === 'dark' ? (
            <Moon className="h-[18px] w-[18px]" />
          ) : (
            <Sun className="h-[18px] w-[18px]" />
          )}
        </motion.div>
      </AnimatePresence>
    </Button>
  );
}

// ===== Topbar =====

function Topbar({
  mobileSidebarOpen,
  setMobileSidebarOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
}: {
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}) {
  const activePage = useArsipStore((s) => s.activePage);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-white/80 px-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80 sm:px-6">
      {/* Mobile hamburger */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground lg:hidden"
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 sm:max-w-[256px]">
          <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
          <MobileSidebar onNavigate={() => setMobileSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden h-9 w-9 text-muted-foreground hover:text-foreground lg:flex"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        aria-label={sidebarCollapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={sidebarCollapsed ? 'open' : 'close'}
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </motion.div>
        </AnimatePresence>
      </Button>

      {/* Page title */}
      <div className="flex min-w-0 flex-1 items-center">
        <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
          {PAGE_TITLES[activePage]}
        </h1>
      </div>

      {/* Right actions */}
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <NotificationPopover />
      </div>
    </header>
  );
}

// ===== Mobile Sidebar (inside Sheet) =====

function MobileSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { activePage, setActivePage, currentUser, logout } = useArsipStore();
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  const [suratExpanded, setSuratExpanded] = useState(currentPath.startsWith('/e-surat'));

  const filteredItems = useMemo(
    () =>
      NAV_ITEMS.filter(
        (item) =>
          (!item.adminOnly || currentUser?.role === 'admin') &&
          (!item.pegawaiOnly || currentUser?.role !== 'admin')
      ),
    [currentUser?.role]
  );

  if (!currentUser) return null;

  return (
    <SidebarContent
      activePage={activePage}
      setActivePage={setActivePage}
      filteredItems={filteredItems}
      currentUser={currentUser}
      logout={logout}
      onNavigate={onNavigate}
      suratExpanded={suratExpanded}
      setSuratExpanded={setSuratExpanded}
      currentPath={currentPath}
    />
  );
}

// ===== Main App Layout =====

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { activePage, setActivePage, currentUser, logout } = useArsipStore();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [suratExpanded, setSuratExpanded] = useState(false);

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  useState(() => {
    if (currentPath.startsWith('/e-surat')) {
      setSuratExpanded(true);
    }
  });

  const filteredItems = useMemo(
    () =>
      NAV_ITEMS.filter(
        (item) =>
          (!item.adminOnly || currentUser?.role === 'admin') &&
          (!item.pegawaiOnly || currentUser?.role !== 'admin')
      ),
    [currentUser?.role]
  );

  if (!currentUser) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30 dark:bg-zinc-900/30">
      {/* Desktop Sidebar */}
      <AnimatePresence initial={false}>
        {!sidebarCollapsed && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="hidden shrink-0 overflow-hidden border-r bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:block"
          >
            <div className="w-64">
              <SidebarContent
                activePage={activePage}
                setActivePage={setActivePage}
                filteredItems={filteredItems}
                currentUser={currentUser}
                logout={logout}
                suratExpanded={suratExpanded}
                setSuratExpanded={setSuratExpanded}
                currentPath={currentPath}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          mobileSidebarOpen={mobileSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}