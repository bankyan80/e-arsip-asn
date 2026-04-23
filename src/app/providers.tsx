'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface ThemeContextType {
  theme: string;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'light', toggleTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

export function Providers({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  if (!mounted) {
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}