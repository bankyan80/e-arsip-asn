import { verifySession } from '../lib/session';
import { findPegawaiByCredentials, seedInitialDb } from '../lib/firestore';
import { loginSchema } from '../lib/validation';
import { uploadFile } from '../lib/storage';

export default async function handler(_req: any, res: any) {
  const checks: Record<string, string> = {
    verifySession: typeof verifySession === 'function' ? 'ok' : 'wrong',
    findPegawai: typeof findPegawaiByCredentials === 'function' ? 'ok' : 'wrong',
    seedInitialDb: typeof seedInitialDb === 'function' ? 'ok' : 'wrong',
    loginSchema: typeof loginSchema === 'object' ? 'ok' : 'wrong',
    uploadFile: typeof uploadFile === 'function' ? 'ok' : 'wrong',
    jwt: typeof (await import('jsonwebtoken')).default === 'function' ? 'ok' : 'sign' in (await import('jsonwebtoken')) ? 'has-sign' : 'wrong',
  };
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ checks }));
}