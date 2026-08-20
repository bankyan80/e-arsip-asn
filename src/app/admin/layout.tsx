"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  Tags,
  Bell,
  Settings,
  ShieldCheck,
  FileSpreadsheet,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/asn", label: "Data ASN", icon: Users },
  { href: "/admin/dokumen", label: "Arsip Dokumen", icon: FileText },
  { href: "/admin/kelengkapan", label: "Kelengkapan", icon: ClipboardList },
  { href: "/admin/jenis-dokumen", label: "Jenis Dokumen", icon: Tags },
  { href: "/admin/notifikasi", label: "Notifikasi", icon: Bell },
  { href: "/admin/audit-log", label: "Audit Log", icon: ShieldCheck },
  { href: "/admin/users", label: "Admin", icon: Users },
  { href: "/admin/laporan", label: "Laporan", icon: FileSpreadsheet },
  { href: "/admin/settings", label: "Pengaturan", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ nama?: string; role?: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUser(d.user);
        else window.location.href = "/login";
      })
      .catch(() => (window.location.href = "/login"));
  }, []);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-slate-900 text-white lg:flex">
        <div className="flex items-center gap-2 px-6 py-5">
          <span className="text-xl">📁</span>
          <span className="font-semibold">e-ARSIP ASN</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                  active ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <p className="text-sm font-medium">{user?.nama || "Admin"}</p>
          <p className="text-xs text-slate-400">{user?.role}</p>
          <button onClick={logout} className="mt-2 flex items-center gap-2 text-xs text-slate-400 hover:text-white">
            <LogOut className="h-3.5 w-3.5" /> Keluar
          </button>
        </div>
      </aside>

      {/* Top bar mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-white px-4 py-3 shadow-sm lg:hidden">
        <button onClick={() => setOpen(true)} className="rounded-lg p-1 hover:bg-slate-100">
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-semibold">e-ARSIP ASN</span>
        <button onClick={logout} className="rounded-lg p-1 hover:bg-slate-100" title="Keluar">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-slate-900 p-4 text-white">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold">e-ARSIP ASN</span>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={clsx(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                      active ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <div className="p-6 lg:ml-60">
        <div className="mx-auto max-w-6xl">{children}</div>
      </div>
    </div>
  );
}