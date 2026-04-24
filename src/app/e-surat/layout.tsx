'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox, Send, Archive, Moon, Sun, LogOut, Menu, ChevronLeft,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useTheme } from '@/app/providers';
import { useArsipStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const AUTH_KEY = 'e-arsip-auth';

interface SubPage {
  href: string;
  icon: React.ElementType;
  label: string;
}

const SUB_PAGES: SubPage[] = [
  { href: '/e-surat/masuk', icon: Inbox, label: 'Surat Masuk' },
  { href: '/e-surat/keluar', icon: Send, label: 'Surat Keluar' },
  { href: '/e-surat/arsip', icon: Archive, label: 'Arsip Surat' },
];

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function SuratSidebar({ pathname, currentUser, logout, onNavigate }: {
  pathname: string;
  currentUser: { role: string; nama: string; nip: string };
  logout: () => void;
  onNavigate?: () => void;
}) {
  const router = useRouter();

  const handleNav = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-950">
      <div className="flex shrink-0 items-center gap-3 px-5 py-5">
        <img src="https://i.pinimg.com/736x/76/39/2d/76392d91c9c22d8ec5563b1126cd55b8.jpg" alt="Logo" className="h-10 w-10 rounded-xl object-cover shadow-md" />
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-foreground">E-Arsip ASN</span>
          <span className="text-[11px] leading-tight font-medium text-muted-foreground">Dinas Pendidikan</span>
        </div>
      </div>
      <Separator />
      <div className="px-3 pt-3">
        <button onClick={() => { router.push('/'); onNavigate?.(); }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
          <span>Kembali ke Dashboard</span>
        </button>
      </div>
      <Separator className="mt-2" />
      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="flex flex-col gap-1" role="navigation" aria-label="Menu Manajemen Surat">
          {SUB_PAGES.map((sp) => {
            const isActive = pathname === sp.href;
            const Icon = sp.icon;
            return (
              <button key={sp.href} onClick={() => handleNav(sp.href)}
                className={cn(
                  'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 outline-none',
                  'focus-visible:ring-2 focus-visible:ring-[#3c6eff]/40 focus-visible:ring-offset-1',
                  isActive ? 'font-semibold text-[#3c6eff]' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                )} aria-current={isActive ? 'page' : undefined}>
                {isActive && (
                  <motion.div layoutId="surat-sidebar-active-bar"
                    className="absolute right-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-l-full bg-[#3c6eff]"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }} />
                )}
                {isActive && (
                  <motion.div layoutId="surat-sidebar-active-bg"
                    className="absolute inset-0 rounded-lg"
                    style={{ backgroundColor: '#3c6eff0D' }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }} />
                )}
                <Icon className={cn('relative z-10 h-[18px] w-[18px] shrink-0 transition-colors',
                  isActive ? 'text-[#3c6eff]' : 'text-muted-foreground group-hover:text-foreground')} />
                <span className="relative z-10 truncate">{sp.label}</span>
              </button>
            );
          })}
        </nav>
      </ScrollArea>
      <Separator />
      <div className="shrink-0 px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-muted">
            <AvatarFallback className="bg-[#3c6eff]/10 text-xs font-bold text-[#3c6eff]">{getInitials(currentUser.nama)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-foreground">{currentUser.nama}</span>
            <span className="truncate text-[11px] font-medium capitalize text-muted-foreground">{currentUser.role === 'admin' ? 'Administrator' : 'Pegawai'}</span>
          </div>
          <Button variant="ghost" size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
            onClick={logout} aria-label="Keluar">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();
  if (!mounted) {
    return <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Toggle tema"><Sun className="h-[18px] w-[18px] text-muted-foreground" /></Button>;
  }
  return (
    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground"
      onClick={toggleTheme} aria-label={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={theme === 'dark' ? 'moon' : 'sun'}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }} animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.5 }} transition={{ duration: 0.2 }}
          className="flex items-center justify-center">
          {theme === 'dark' ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </motion.div>
      </AnimatePresence>
    </Button>
  );
}

function SuratTopbar({ pathname, mobileSidebarOpen, setMobileSidebarOpen }: {
  pathname: string; mobileSidebarOpen: boolean; setMobileSidebarOpen: (open: boolean) => void;
}) {
  const pageTitle = SUB_PAGES.find((sp) => sp.href === pathname)?.label || 'Manajemen Surat';
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-white/80 px-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80 sm:px-6">
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground lg:hidden" aria-label="Buka menu"><Menu className="h-5 w-5" /></Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 sm:max-w-[256px]">
          <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
          <SuratSidebar pathname={pathname}
            currentUser={useArsipStore.getState().currentUser!}
            logout={useArsipStore.getState().logout}
            onNavigate={() => setMobileSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 items-center">
        <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">{pageTitle}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-1"><ThemeToggle /></div>
    </header>
  );
}

export default function ESuratLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { currentUser, isLoggedIn, logout, initializeData } = useArsipStore();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        const user = JSON.parse(raw);
        if (user && user.role && user.nip && user.nama) {
          useArsipStore.setState({ currentUser: user, isLoggedIn: true });
        }
      }
    } catch { /* ignore */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready && isLoggedIn) initializeData();
  }, [ready, isLoggedIn, initializeData]);

  useEffect(() => {
    if (ready && !isLoggedIn) router.replace('/');
  }, [ready, isLoggedIn, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 border-4 border-[#3c6eff] border-t-transparent rounded-full" />
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !currentUser) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30 dark:bg-zinc-900/30">
      <aside className="hidden w-64 shrink-0 border-r bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:block">
        <SuratSidebar pathname={pathname} currentUser={currentUser} logout={logout} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <SuratTopbar pathname={pathname} mobileSidebarOpen={mobileSidebarOpen} setMobileSidebarOpen={setMobileSidebarOpen} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}>
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}