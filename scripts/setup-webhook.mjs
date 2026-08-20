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
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const defaultUrl = process.env.APP_BASE_URL
  ? `${process.env.APP_BASE_URL.replace(/\/$/, '')}/api/telegram/webhook`
  : null;
const url = process.argv[2] || defaultUrl;
if (!url) {
  console.error('URL webhook tidak ditemukan. Berikan argumen URL atau set APP_BASE_URL / TELEGRAM_WEBHOOK_URL.');
  process.exit(1);
}

const body = { url, allowed_updates: ['message', 'callback_query'] };
if (secret) body.secret_token = secret;

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}).then((r) => r.json());

if (!res.ok) {
  console.error('Gagal set webhook:', JSON.stringify(res));
  process.exit(1);
}
console.log('Webhook diset ke:', url);
console.log('Bot:', res.result.url || JSON.stringify(res));