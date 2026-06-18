import { useState, useEffect, useCallback } from 'react';
import { SessionData } from '../types';

export function useSession() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.user) setSession(data.user);
      })
      .catch(err => console.error('Session check failed:', err))
      .finally(() => setLoadingSession(false));
  }, []);

  const login = useCallback(async (identifier: string, tanggalLahir: string, loginType: 'NIP' | 'NIK' | 'BOTH' = 'BOTH') => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginType, identifier, tanggalLahir })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login gagal.');
    setSession(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    setSession(null);
  }, []);

  return { session, setSession, loadingSession, login, logout };
}
