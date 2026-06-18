import jwt from 'jsonwebtoken';
import { SessionData } from '../src/types';

const SECRET_KEY = process.env.SESSION_SECRET || 'e_arsip_asn_super_secret_session_secret_123';
if (!process.env.SESSION_SECRET) {
  console.warn('⚠️  WARNING: SESSION_SECRET tidak diatur di .env! Menggunakan fallback default. Jangan deploy ke production tanpa mengatur secret ini.');
}

/**
 * Signs a JWT session token for the authenticated employee/administrator.
 */
export function signSession(data: SessionData): string {
  return jwt.sign(data, SECRET_KEY, { expiresIn: '7d' });
}

/**
 * Decodes and validates a session token payload. Returns null if invalid or expired.
 */
export function verifySession(token: string): SessionData | null {
  try {
    const decoded = jwt.verify(token, SECRET_KEY) as jwt.JwtPayload;
    if (decoded && decoded.id) {
      return {
        id: decoded.id,
        pegawaiId: decoded.pegawaiId,
        nip: decoded.nip,
        nik: decoded.nik,
        nama: decoded.nama,
        role: decoded.role,
        instansiId: decoded.instansiId,
        namaInstansi: decoded.namaInstansi
      };
    }
  } catch (error) {
    // Decryption or expiration failed
  }
  return null;
}
