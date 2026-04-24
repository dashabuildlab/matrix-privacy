'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut, type User } from '@/lib/firebase';
import AuthModal from '@/components/AuthModal';

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return onAuthStateChanged(setUser);
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const navLinks = [
    { href: '/uk/', label: 'Головна' },
    { href: '/uk/kalkulyator-matrytsi-doli/', label: 'Калькулятор' },
    { href: '/uk/kalkulyator-sumisnosti/', label: 'Сумісність' },
    { href: '/uk/matrytsya-dnya/', label: 'Матриця дня' },
    { href: '/uk/ai-chat/', label: 'AI-провідник' },
    { href: '/uk/wiki/', label: 'Вікі' },
  ];

  const openLogin = () => { setAuthMode('login'); setAuthOpen(true); };
  const openRegister = () => { setAuthMode('register'); setAuthOpen(true); };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Профіль';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[rgba(3,2,13,0.80)] border-b border-[var(--border)]">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/uk/" className="flex items-center gap-2.5 no-underline flex-shrink-0">
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[var(--primary-dark)] to-[var(--primary)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F5C542" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/>
              </svg>
            </div>
            <span className="text-[17px] font-extrabold text-white tracking-tight">Matrix of Destiny</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-5 flex-1 justify-center">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-semibold transition-colors no-underline whitespace-nowrap ${
                  pathname === link.href || pathname === link.href.slice(0, -1)
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth area */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/15 rounded-full px-3 py-2 cursor-pointer transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-xs font-bold text-[#0D0B1E]">
                    {initials}
                  </div>
                  <span className="text-sm text-white hidden sm:block max-w-[100px] truncate">{displayName}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="text-white/50">
                    <path d="M6 8L1 3h10z"/>
                  </svg>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#0D0B1E] border border-[rgba(245,197,66,0.2)] rounded-2xl shadow-2xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-white/8">
                      <div className="text-xs text-white/40 truncate">{user.email}</div>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={async () => { await signOut(); setUserMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-xl cursor-pointer bg-transparent border-none transition-colors"
                      >
                        Вийти
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={openLogin}
                  className="text-sm font-semibold text-[var(--text-muted)] hover:text-white transition-colors bg-transparent border-none cursor-pointer px-3 py-2"
                >
                  Увійти
                </button>
                <button
                  onClick={openRegister}
                  className="text-sm font-bold bg-gradient-to-r from-[var(--primary-dark)] to-[var(--primary)] text-white rounded-full px-4 py-2 cursor-pointer border-none hover:opacity-90 transition-opacity"
                >
                  Реєстрація
                </button>
              </div>
            )}

            {/* Mobile burger */}
            <button
              className="lg:hidden flex flex-col gap-1.5 p-2 bg-transparent border-none cursor-pointer"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
            >
              <span className="w-5 h-0.5 bg-white rounded" />
              <span className="w-5 h-0.5 bg-white rounded" />
              <span className="w-5 h-0.5 bg-white rounded" />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-[var(--border)] bg-[rgba(3,2,13,0.97)] px-6 py-4 flex flex-col gap-3">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`text-base font-semibold no-underline py-2 ${
                  pathname === link.href ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-white/8 flex flex-col gap-2">
              {user ? (
                <button
                  onClick={async () => { await signOut(); setMenuOpen(false); }}
                  className="text-left text-sm text-red-400 bg-transparent border-none cursor-pointer py-2"
                >
                  Вийти
                </button>
              ) : (
                <>
                  <button
                    onClick={() => { openLogin(); setMenuOpen(false); }}
                    className="text-left text-base font-semibold text-[var(--text-secondary)] bg-transparent border-none cursor-pointer py-2"
                  >
                    Увійти
                  </button>
                  <button
                    onClick={() => { openRegister(); setMenuOpen(false); }}
                    className="text-left text-base font-bold text-[var(--accent)] bg-transparent border-none cursor-pointer py-2"
                  >
                    Реєстрація
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      <AuthModal
        open={authOpen}
        initialMode={authMode}
        onClose={() => setAuthOpen(false)}
      />
    </>
  );
}
