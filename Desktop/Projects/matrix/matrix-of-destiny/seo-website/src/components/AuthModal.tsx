'use client';

import { useState, useEffect } from 'react';
import {
  registerWithEmail,
  loginWithEmail,
  signInWithGoogle,
  sendPasswordReset,
} from '@/lib/firebase';
import { getAuthErrorMessage } from '@/lib/authErrors';

type Mode = 'login' | 'register' | 'reset';

export default function AuthModal({
  open,
  initialMode = 'login',
  onClose,
  onSuccess,
}: {
  open: boolean;
  initialMode?: Mode;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
      setResetSent(false);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    }
  }, [open, initialMode]);

  if (!open) return null;

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(getAuthErrorMessage(e as any));
    }
    setLoading(false);
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || (!password && mode !== 'reset')) {
      setError('Заповніть усі поля');
      return;
    }
    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Паролі не збігаються');
        return;
      }
      if (password.length < 6) {
        setError('Пароль мінімум 6 символів');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        onSuccess?.();
        onClose();
      } else if (mode === 'register') {
        await registerWithEmail(email, password);
        onSuccess?.();
        onClose();
      } else {
        await sendPasswordReset(email);
        setResetSent(true);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err as any));
    }
    setLoading(false);
  };

  const title =
    mode === 'login'
      ? 'Вхід'
      : mode === 'register'
        ? 'Реєстрація'
        : 'Відновлення пароля';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0D0B1E] border border-[rgba(245,197,66,0.3)] rounded-2xl shadow-2xl p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white cursor-pointer border-none transition-colors"
          aria-label="Закрити"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
        <p className="text-sm text-white/60 mb-5">
          {mode === 'login' && 'Увійди, щоб зберегти свою матрицю та використовувати AI-провідника'}
          {mode === 'register' && 'Створи акаунт, щоб відкрити всі можливості Matrix of Destiny'}
          {mode === 'reset' && 'Ми надішлемо лист для скидання пароля'}
        </p>

        {resetSent ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4">
            <div className="text-emerald-400 font-semibold mb-1">Лист надіслано ✓</div>
            <div className="text-sm text-white/70">
              Перевір поштову скриньку і перейди за посиланням, щоб встановити новий пароль.
            </div>
          </div>
        ) : (
          <form onSubmit={handleEmail} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="off"
              autoComplete="email"
              className="bg-white/[0.08] border border-[rgba(245,197,66,0.25)] rounded-full px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-[rgba(245,197,66,0.6)] transition-colors"
            />
            {mode !== 'reset' && (
              <input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                className="bg-white/[0.08] border border-[rgba(245,197,66,0.25)] rounded-full px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-[rgba(245,197,66,0.6)] transition-colors"
              />
            )}
            {mode === 'register' && (
              <input
                type="password"
                placeholder="Повтори пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="bg-white/[0.08] border border-[rgba(245,197,66,0.25)] rounded-full px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-[rgba(245,197,66,0.6)] transition-colors"
              />
            )}
            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3 whitespace-pre-line">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-[#C8901A] via-[#F5C542] to-[#C8901A] text-[#0D0B1E] font-extrabold rounded-full py-3 mt-1 cursor-pointer border-none disabled:opacity-60 transition-opacity"
            >
              {loading
                ? '...'
                : mode === 'login'
                  ? 'Увійти'
                  : mode === 'register'
                    ? 'Створити акаунт'
                    : 'Надіслати лист'}
            </button>
          </form>
        )}

        {mode !== 'reset' && !resetSent && (
          <>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/40">або</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/15 rounded-full py-3 text-white font-semibold cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#F5C542"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z"
                />
              </svg>
              Продовжити з Google
            </button>
          </>
        )}

        <div className="mt-4 text-center text-sm text-white/50 flex flex-col gap-1.5">
          {mode === 'login' && (
            <>
              <button
                type="button"
                onClick={() => { setMode('reset'); setError(null); }}
                className="bg-transparent border-none text-[#A78BFA] cursor-pointer font-semibold hover:text-white transition-colors"
              >
                Забули пароль?
              </button>
              <div>
                Немає акаунту?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); }}
                  className="bg-transparent border-none text-[#F5C542] cursor-pointer font-bold hover:text-white transition-colors"
                >
                  Зареєструватись
                </button>
              </div>
            </>
          )}
          {mode === 'register' && (
            <div>
              Вже є акаунт?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className="bg-transparent border-none text-[#F5C542] cursor-pointer font-bold hover:text-white transition-colors"
              >
                Увійти
              </button>
            </div>
          )}
          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setResetSent(false); }}
              className="bg-transparent border-none text-[#F5C542] cursor-pointer font-bold hover:text-white transition-colors"
            >
              ← Назад до входу
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
