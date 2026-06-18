# E-Arsip ASN - Sistem Pengarsipan Dokumen Digital Pegawai

E-Arsip ASN adalah aplikasi berbasis **Full-stack (Express + React + Vite)** dengan filosofi **mobile-first / Android-first** yang dirancang khusus untuk digitalisasi berkas kepegawaian ASN. Aplikasi ini mengintegrasikan Firebase Firestore (database), Firebase Storage (berkas fisik), dan Firebase Admin SDK secara aman di server-side.

---

## 🚀 Fitur Utama

1. **Akses Berkas Digital Mandiri**: Pegawai ASN login secara mandiri menggunakan NIP or NIK dan tanggal lahir tanpa perlu mendaftar manual.
2. **Unggah Dokumen Pintar**: Form unggah berkas dilengkapi filter otomatis Jenis Dokumen berdasarkan pilihan Kelompok Berkas, dengan validasi format (PDF, Word, Excel, Gambar) dan batas ukuran maksimal 10 MB.
3. **Verifikasi & Validasi Admin**: Admin instansi dan Super Admin dapat meninjau antrean dokumen, menetapkan status verifikasi (Valid, Perlu Perbaikan, atau Ditolak), serta melampirkan catatan revisi khusus.
4. **Rekap Kelengkapan & Ekspor CSV**: Dasbor admin mendaftar status persentase kelengkapan seluruh pegawai instansi dengan fitur ekspor lembar kerja `.CSV` secara instan dari peramban.
5. **Log Aktivitas & Audit Trails**: Setiap aktivitas sensitif kepegawaian (Login, Unggah, Verifikasi, Hapus) dicatat dalam koleksi jejak audit terperinci.
6. **Zero-Setup Fallback (Uji Coba Langsung)**: Jika berkas kredensial riil Firebase belum dikonfigurasi, sistem akan mentransisikan database secara otomatis ke media JSON statis `/local-db.json` sehingga aplikasi dapat langsung diuji coba dengan lancar di frame pratinjau.

---

## 🛠️ Langkah Integrasi Firebase Project

Ikuti instruksi berikut untuk mendaftarkan dan menghubungkan akun Firebase Developer Anda:

### 1. Membuat Firebase Project
1. Buka [Firebase Console](https://console.firebase.google.com/).
2. Klik **Add Project**, berikan nama proyek Anda (misal: `e-arsip-asn`).
3. Pilih opsi mengaktifkan Google Analytics jika diperlukan, kemudian klik **Create Project**.

### 2. Membuat Firestore Database
1. Pada menu navigasi sebelah kiri, klik **Build** > **Firestore Database**.
2. Klik **Create Database**.
3. Pilih lokasi server database terdekat (misal: `asia-southeast1` untuk Indonesia), pilih **Start in test mode**, lalu klik **Create**.

### 3. Membuat Firebase Storage (Penyimpanan Berkas)
1. Klik **Build** > **Storage**.
2. Klik **Get Started**.
3. Pilih opsi **Start in test mode**, pilih lokasi penyimpanan (pastikan selaras dengan lokasi Firestore), lalu selesai.

### 4. Membuat Service Account (Firebase Admin SDK)
Kredensial ini digunakan untuk menjalankan operasi database di sisi server (Express) demi keamanan hak akses data pribadi ASN:
1. Klik ikon gir (Settings) di sebelah kiri atas menu utama, lalu pilih **Project Settings**.
2. Buka tab **Service Accounts**.
3. Klik tombol **Generate New Private Key**, lalu klik kembali **Generate Key**.
4. Sebuah berkas format `.json` rahasia akan terunduh ke komputer Anda. Buka file tersebut dengan text editor untuk mengambil informasi token.

---

## 🔑 Mengonfigurasi Environment Variables

Salin isi berkas `.env.example` ke file `.env` di komputer lokal Anda, atau sesuaikan di platform Vercel:

```env
FIREBASE_PROJECT_ID="project-id-anda"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@xxxx.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC8...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET="project-id-anda.appspot.com"
SESSION_SECRET="e_arsip_asn_super_secret_session_secret_123"
NEXT_PUBLIC_APP_NAME="E-Arsip ASN"
```

*Catatan: Pastikan string `FIREBASE_PRIVATE_KEY` menyertakan karakter `\n` sebagai penanda baris baru agar dapat diurai dengan benar oleh Node.*

---

## 💻 Cara Menjalankan Project

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Menjalankan Server Pengembangan (Dev Mode)
```bash
npm run dev
```
Aplikasi akan aktif di tautan `http://localhost:3000`.

### 3. Otomatisasi Seeding Data
Sistem kami telah dirancang secara pintar untuk melakukan auto-seeding jika database kosong (baik Firestore riil maupun fallback JSON). Data awal instansi, kategori arsip standard, jenis dokumen (Riwayat Karier, Pendidikan, Kinerja, Data Pribadi, Kesehatan dan Disiplin) serta 3 akun tes akan otomatis disimpan saat server pertama kali diaktifkan.

---

## 🔐 Data Login Contoh Uji Coba

Gunakan data pre-seeded di bawah ini untuk menguji coba berbagai skenario hak role:

### 1. Akun Pegawai (ASN PNS)
*   **Pilihan Login**: NIP
*   **Nomor NIP**: `198705122010012003`
*   **Tanggal Lahir**: `1987-05-12`
*   **Akses**: Melihat dasbor, presentase wajib, unggah dokumen riwayat/pendidikan/kinerja, sunting profil kontak, hapus dokumen tak valid.

### 2. Akun Admin Instansi (SD Negeri 1 Lemahabang)
*   **Pilihan Login**: NIP
*   **Nomor NIP**: `198501012008011002`
*   **Tanggal Lahir**: `1985-01-01`
*   **Akses**: Menghitung statistik instansi, menyetujui/menolak berkas dengan catatan revisi, melihat rekap kelengkapan, unduh berkas ekspor CSV.

### 3. Akun Super Admin
*   **Pilihan Login**: NIP
*   **Nomor NIP**: `198001012002012001`
*   **Tanggal Lahir**: `1980-01-01`
*   **Akses**: Memantau seluruh rekap kearsipan, mendaftarkan data pegawai ASN baru, mengaktifkan/menonaktifkan filter kearsipan global (misal: pengaturan izin hapus berkas berstatus valid).

---

## ☁️ Penerbitan Ke GitHub & Deployment Vercel

### 1. Push ke Repository GitHub
1. Pastikan Anda telah membuat repositori kosong di GitHub.
2. Inisialisasi Git di repositori lokal dan unggah kode:
   ```bash
   git init
   git add .
   git commit -m "Inisialisasi E-Arsip ASN"
   git branch -M main
   git remote add origin https://github.com/username/e-arsip-asn.git
   git push -u origin main
   ```

### 2. Deploy dari GitHub ke Vercel
1. Masuk ke dasbor [Vercel](https://vercel.com).
2. Klik **Add New** > **Project**.
3. Hubungkan akun GitHub Anda dan pilih repositori `e-arsip-asn`.
4. Pada bagian **Environment Variables**, masukkan seluruh kunci-kunci nilai rahasia (.env) dari petunjuk di atas.
5. Klik **Deploy**. Vercel akan otomatis menyusun backend serverless bundle dan menyajikannya secara online!

---

## 🎨 Panduan Penggunaan Antarmuka
Aplikasi E-Arsip ASN didesain secara adaptif dengan fokus utama pada layar HP Android. Menghindari sidebar yang sempit, antarmuka bawah menggunakan **Bottom Navigation** yang ramah sentuhan (min. 44px) sehingga navigasi terasa lancar layaknya aplikasi Android Native. Warna Navy Utama (`#0f2a44`), Biru Tombol (`#1d4ed8`), Hijau Valid (`#16a34a`), dan Kuning Menunggu (`#facc15`) berpadu kontras untuk menyajikan informasi status dokumen secara tegas.
