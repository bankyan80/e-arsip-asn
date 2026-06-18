import { readFileSync } from 'fs';

function readJSON(path) {
  const buf = readFileSync(path);
  // Strip BOM if present
  const text = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF ? buf.slice(3).toString('utf-8') : buf.toString('utf-8');
  return JSON.parse(text);
}

const raw = readJSON('C:/Users/Bank Yan/simpeg-tim/data-pegawai.json');
const sekolahList = readJSON('C:/Users/Bank Yan/simpeg-tim/data-sekolah.json');

const sekolahMap = new Map();
for (const s of sekolahList) {
  sekolahMap.set(s.nama, { npsn: s.npsn, desa: s.desa });
}

const seenSekolah = new Set();
const instansi = [];
const pegawai = [];

const roleMap = { 'guru': 'pegawai', 'tendik': 'pegawai', 'kepala sekolah': 'admin_instansi' };

for (const p of raw) {
  const sekolah = p.sekolah || 'SD NEGERI 1 PICUNGPUGUR';
  const instansiId = 'INS_' + (sekolahMap.get(sekolah)?.npsn || 'UNKNOWN').slice(-8).toUpperCase();

  if (!seenSekolah.has(sekolah)) {
    seenSekolah.add(sekolah);
    const nama = sekolah;
    const desa = sekolahMap.get(sekolah)?.desa || 'LEMAHABANG';
    instansi.push({ id: instansiId, namaInstansi: nama, alamat: 'Jl. Raya ' + desa, kecamatan: 'Lemahabang', kabupaten: 'Cirebon', statusAktif: true });
  }

  const id = 'PGW_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const statusPegawai = p.status_kepegawaian || 'Honor Daerah TK.II Kab/Kota';
  const role = roleMap[p.role?.toLowerCase()] || 'pegawai';
  const date = new Date().toISOString();

  pegawai.push({
    id, instansiId, namaInstansi: sekolah,
    namaPegawai: p.nama,
    nip: p.nip || '',
    nik: String(p.nik || ''),
    tanggalLahir: p.tanggal_lahir || '',
    jenisKelamin: p.jk === 'L' ? 'Laki-laki' : 'Perempuan',
    jabatan: p.jenis_ptk || 'Guru',
    statusPegawai,
    pangkatGolongan: '',
    pendidikanTerakhir: '',
    nomorHp: '',
    email: '',
    alamat: '',
    role,
    statusAktif: true,
    createdAt: date,
    updatedAt: date
  });
}

const payload = JSON.stringify({ instansi, pegawai });
console.log(`Total: ${instansi.length} instansi, ${pegawai.length} pegawai`);
console.log(`Payload size: ${(payload.length / 1024).toFixed(1)} KB`);

// Login and import
const BASE = 'https://e-arsip-asn.vercel.app';

async function main() {
  // Login
  const loginRes = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginType: 'NIP', identifier: '198001292025211035', password: 'admin456' })
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) { console.error('Login failed:', loginData.error); process.exit(1); }
  console.log('Login OK');

  // Extract cookie from Set-Cookie header
  const cookies = loginRes.headers.getSetCookie?.() || [];
  const sessionCookie = cookies.find(c => c.startsWith('session='));
  if (!sessionCookie) { console.error('No session cookie'); process.exit(1); }

  // Import
  const importRes = await fetch(BASE + '/api/admin/import-pegawai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie.split(';')[0] },
    body: payload
  });
  const importData = await importRes.json();
  console.log('Import result:', importData);
}

main().catch(console.error);
