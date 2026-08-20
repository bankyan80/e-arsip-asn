import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "e-ARSIP ASN",
  description: "Sistem Arsip Dokumen ASN berbasis Telegram Bot + Web Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}