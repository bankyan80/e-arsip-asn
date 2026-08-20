# Panduan Impor Data ASN

Dokumen ini menjelaskan alur impor data pegawai (ASN) dari file Excel Dapodik ke database e-ARSIP ASN.

## Ringkasan Alur

```
File Excel Dapodik (per sekolah)
        │
        ▼
[build-asn-excel-sdn2.mjs]  →  data-pegawai-SEMUA-NEGERI.xlsx
        │                        (4 sheet: Semua Pegawai / Dengan NIP / Tanpa NIP / Honor tanpa NIP dihapus)
        ▼
[import-asn-excel.mjs]      →  tabel `asn` di Neon PostgreSQL (upsert by NIP)
        │
        ▼
[verify-asn.mjs] / [verify-nips.mjs]  →  validasi (total, per sekolah, kesesuaian Excel↔DB)
```

## File & Lokasi

| Komponen | Lokasi |
|----------|--------|
| File Dapodik sumber | `C:\Users\Bank Yan\portal-dinas\data-pegawai\<sekolah>\` (daftar-guru + daftar-tendik `.xlsx`) |
| Generator Excel | `C:\Users\Bank Yan\portal-dinas\scripts\build-asn-excel-sdn2.mjs` |
| Excel hasil | `C:\Users\Bank Yan\portal-dinas\data-pegawai-SEMUA-NEGERI.xlsx` |
| Script impor DB | `C:\Users\Bank Yan\e-arsip-doc\scripts\import-asn-excel.mjs` |
| Script verifikasi | `C:\Users\Bank Yan\e-arsip-doc\scripts\verify-asn.mjs`, `verify-nips.mjs` |
| Script backup DB | `C:\Users\Bank Yan\e-arsip-doc\scripts\backup-db.mjs` |
| Kredensial DB | `C:\Users\Bank Yan\e-arsip-doc\.env.local` (`DATABASE_URL`), **tidak di-commit** |

## Langkah 1 — Buat Excel dari Dapodik

Generator membaca semua folder sekolah di `data-pegawai/`, mengambil baris data
(header ada di `rows[4]`), lalu memetakan kolom Dapodik → kolom ASN:

| Kolom Excel | Kolom Dapodik (index) |
|-------------|------------------------|
| NIP | NIP (6) |
| NIK | NIK (44) |
| Nama | Nama (1) |
| Pangkat | dari Pangkat Golongan (26) via map golongan |
| Golongan | Pangkat Golongan (26) |
| Jabatan | Jenis PTK (8) + Tugas Tambahan (20) |
| Unit Kerja | nama sekolah (dikanonikalkan) |
| Status | Status Kepegawaian (7): PNS / PPPK* / lainnya → LAINNYA |
| Email | Email (19) |
| No HP | HP (18) |
| Alamat | Alamat Jalan (10) + Desa/Kelurahan (14) |

Catatan penting di generator:
- Hanya sekolah negeri (`isNegeri`); daftar 22 sekolah negeri di `data_mix/data-sekolah.json`.
- Nama unit kerja dinormalisasi ke bentuk kanonik, mis. `SD NEGERI 1 LEMAHABANG`.
- Deduplikasi by NIP (baris ganda guru/tendik dihapus).
- **Daftar NIPPPK** (`NIPPPK_MAP`): honorer tanpa NIP dicocokkan ke daftar NIPPPK
  (normalisasi nama). Yang cocok → NIP diisi + status `PPPK`. Yang tidak cocok →
  dipindah ke sheet "Honor tanpa NIP (dihapus)" dan **tidak** diimpor.

Jalankan:
```powershell
cd "C:\Users\Bank Yan\portal-dinas"
node scripts\build-asn-excel-sdn2.mjs
```

## Langkah 2 — Impor ke Database

Impor membaca sheet "Pegawai (dengan NIP)" dari Excel dan melakukan
`INSERT ... ON CONFLICT (nip) DO UPDATE` (upsert).

Jalankan (butuh `node_modules` — `pg`):
```powershell
cd "C:\Users\Bank Yan\e-arsip-doc"
node scripts\import-asn-excel.mjs
```
Output akhir: `Selesai. Insert baru: X | Update: Y | Lewati: Z | Gagal: 0`.

> Catatan: script ini mengimpor langsung ke **Neon cloud** (DATABASE_URL di `.env.local`),
> sehingga data langsung tampil di aplikasi live (Vercel) tanpa redeploy.

## Langkah 3 — Verifikasi

```powershell
node scripts\verify-asn.mjs     # total, per unit_kerja, per status
node scripts\verify-nips.mjs    # cocokkan Excel ↔ DB (harus 0 selisih dua arah)
```

## Status Data Saat Ini (20 Agu 2026)

- **Total ASN: 262** — semua ber-NIP.
  - PNS: 83 | PPPK: 166 | LAINNYA: 13 (mayoritas tendik TK tanpa golongan).
  - 21 SD Negeri (252) + 1 TK NEGERI LEMAHABANG (10).
- Honor tanpa NIP: **25 orang** — tidak diimpor, tersimpan di sheet "Honor tanpa NIP (dihapus)".
- Tabel lain: `users` 1 (admin), `jenis_dokumen` 20, `settings` 8, `notifikasi_config` 7.
- `dokumen`, `upload_session`, `download_log`, `notifications`: kosong.

## Backup Database

```powershell
node scripts\backup-db.mjs   # → backups/backup-<timestamp>.json (SEMUA tabel)
```
Folder `backups/` di-gitignore (berisi NIP/email/PII). Backup diambil sebelum
perubahan data besar.

## Referensi Tabel `asn` (schema.sql)

`nip` (NOT NULL UNIQUE), `nama`, `pangkat`, `golongan`, `jabatan`, `unit_kerja`,
`status` (`PNS|PPPK|LAINNYA`), `email`, `no_hp`, `alamat`, `foto_url`.