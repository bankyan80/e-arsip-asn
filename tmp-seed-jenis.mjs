import fs from "fs";
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i > 0 && !line.trim().startsWith("#")) {
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim().replace(/^"|"$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
const { neon } = await import("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);
const rows = [
  ["SKP", "SKP", "Sasaran Kinerja Pegawai / RHK", "Kinerja", 20],
  ["PKG", "PKG", "Penilaian Kinerja Guru", "Kinerja", 21],
  ["PKKS", "PKKS", "Penilaian Kinerja Kepala Sekolah", "Kinerja", 22],
  ["PAK", "PAK", "Penilaian Angka Kredit", "Kinerja", 23],
  ["JABFUNG", "Jabatan Fungsional", "SK Jabatan Fungsional", "Kepegawaian", 24],
  ["SK_PNS", "SK PNS", "SK Kepegawaian PNS (lainnya)", "Kepegawaian", 25],
  ["AKTA_NIKAH", "Akta Nikah", "Akta/Buku Nikah", "Kependudukan", 26],
  ["AKTA_KELAHIRAN", "Akta Kelahiran", "Akta Kelahiran (sendiri/keluarga)", "Kependudukan", 27],
  ["TRANSKRIP", "Transkrip Nilai", "Transkrip nilai pendidikan", "Pendidikan", 28],
  ["FOTO", "Foto", "Foto pegawai / pas foto", "Lainnya", 29],
  ["NIP_BARU", "Kartu NIP Baru", "Kartu NIP baru", "Kepegawaian", 30],
  ["REKENING", "Rekening Bank", "Buku/surat rekening bank", "Kependudukan", 31],
  ["SERDIK", "Serdik", "Surat tugas/pengesahan pendidikan dan pelatihan", "Lainnya", 32],
];
const added = [];
for (const [kode, nama, deskripsi, kategori, urutan] of rows) {
  const r = await sql`
    INSERT INTO jenis_dokumen (kode, nama, deskripsi, kategori, wajib, berlaku_pns, berlaku_pppk, urutan)
    VALUES (${kode}, ${nama}, ${deskripsi}, ${kategori}, false, true, true, ${urutan})
    ON CONFLICT (kode) DO NOTHING
    RETURNING kode`;
  if (r.length) added.push(kode);
}
console.log("ditambahkan:", added.join(", ") || "(sudah ada semua)");
const total = await sql`SELECT COUNT(*)::int AS n FROM jenis_dokumen`;
console.log("total jenis dokumen:", total[0].n);