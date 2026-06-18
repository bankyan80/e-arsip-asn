import { createApp } from '../server';

let app: any;

export default async function handler(req: any, res: any) {
  try {
    if (!app) app = await createApp();
    return new Promise<void>((resolve, reject) => {
      res.on('finish', resolve);
      res.on('error', reject);
      app(req, res);
    });
  } catch (err: any) {
    console.error('Handler error:', err?.stack || err?.message || err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Terjadi kesalahan server.', detail: err?.message || 'unknown' }));
  }
}
