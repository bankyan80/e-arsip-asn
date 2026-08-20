import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(root, '.env.local');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      if (!line || line.trim().startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx < 0) continue;
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (!process.env[k]) process.env[k] = v.replace(/^"|"$/g, '');
    }
  }
}

loadEnv();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN belum diset.');
  process.exit(1);
}

const commands = [
  { command: 'start', description: 'Mulai / verifikasi NIP' },
  { command: 'menu', description: 'Tampilkan menu utama' },
  { command: 'profil', description: 'Lihat data ASN Anda' },
  { command: 'upload', description: 'Upload arsip dokumen' },
  { command: 'arsip', description: 'Lihat arsip dokumen Anda' },
  { command: 'status', description: 'Status kelengkapan arsip' },
  { command: 'bantuan', description: 'Bantuan penggunaan bot' },
  { command: 'batal', description: 'Batalkan proses berjalan' },
];

const res = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ commands }),
}).then((r) => r.json());

if (!res.ok) {
  console.error('Gagal set commands:', JSON.stringify(res));
  process.exit(1);
}
console.log('Command bot diset:', commands.map((c) => '/' + c.command).join(', '));