"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  ClipboardCheck,
  FolderOpen,
  Bell,
  UserRound,
} from "lucide-react";
import clsx from "clsx";

export interface MeResponse {
  user: {
    id: number;
    nip: string;
    nama: string;
    pangkat: string | null;
    golongan: string | null;
    jabatan: string | null;
    unit_kerja: string | null;
    jenis_asn_resolved: string;
    email_masked: string | null;
    no_hp: string | null;
    telegram_username: string | null;
    telegram_verified_at: string | null;
  };
  summary: {
    pct: number;
    terverifikasi: number;
    menunggu: number;
    belum: number;
    perlu_diperbarui: number;
    ditolak: number;
  };
}

const navItems = [
  { href: "/asn", label: "Beranda", icon: Home },
  { href: "/asn/kelengkapan", label: "Kelengkapan", icon: ClipboardCheck },
  { href: "/asn/dokumen", label: "Dokumen", icon: FolderOpen },
  { href: "/asn/notifikasi", label: "Notifikasi", icon: Bell },
  { href: "/asn/profil", label: "Profil", icon: UserRound },
];

export default function AsnPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    fetch("/api/asn/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setMe(d))
      .catch(() => (window.location.href = "/asn/login"));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-br from-indigo-700 to-blue-600 px-4 py-3 text-white shadow-md">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <img src="/logokab.png" alt="Logo" className="h-8 w-auto object-contain" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">
              {me?.user.nama ?? "Memuat..."}
            </p>
            <p className="truncate text-xs opacity-80 leading-tight">
              {me ? `${me.user.nip} · ${me.user.jabatan ?? "-"}` : "e-ARSIP ASN"}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-28 pt-4">{children}</main>

      {/* Bottom navigation ala aplikasi Android */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="mx-auto flex max-w-lg">
          {navItems.map((item) => {
            const active =
              item.href === "/asn" ? pathname === "/asn" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition",
                  active ? "text-indigo-600" : "text-slate-400"
                )}
              >
                <Icon className={clsx("h-5 w-5", active && "drop-shadow")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
