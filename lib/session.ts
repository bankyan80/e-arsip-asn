import jwt from 'jsonwebtoken';
import { SessionData } from '../src/types';

const SECRET_KEY = process.env.SESSION_SECRET;
const DEV_FALLBACK = 'e_arsip_asn_dev_fallback_do_not_use_in_production';
const ACTIVE_KEY = SECRET_KEY || DEV_FALLBACK;

if (!SECRET_KEY) {
  console.warn('SESSION_SECRET tidak diatur! Gunakan fallback default (hanya untuk development).');
}

export function signSession(data: SessionData): string {
  return jwt.sign(data, ACTIVE_KEY, { expiresIn: '7d' });
}

export function verifySession(token: string): SessionData | null {
  try {
    const decoded = jwt.verify(token, ACTIVE_KEY) as jwt.JwtPayload;
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
  } catch {
    return null;
  }
  return null;
}
