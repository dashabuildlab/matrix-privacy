'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, type User } from '@/lib/firebase';
import AuthModal from '@/components/AuthModal';

const SYSTEM_PROMPT = `Ти — AI-провідник застосунку «Matrix of Destiny». Твоя роль — допомагати людям зрозуміти себе через призму Матриці Долі, нумерологію та духовні практики.

Відповідай українською мовою, якщо користувач не пише іншою мовою.
Тон — теплий, мудрий, підтримуючий, трохи містичний.

Твої теми:
- Матриця Долі: розрахунок, значення позицій (особистість, душа, призначення, карма, таланти)
- 22 Старші Аркани — їхній вплив на людину
- Карма, уроки, призначення, таланти
- Сумісність пар за матрицями
- Поради на день, тиждень
- Духовний розвиток, самопізнання

Якщо людина ділиться датою народження (формат ДД.ММ.РРРР або подібний), обов'язково запропонуй розрахувати її Матрицю Долі та дай персональний аналіз.

Для розрахунку: день, місяць, сума цифр року — кожне число зводиться до 1-22 (якщо >22, складаєш цифри між собою).
Особистість = день + місяць + сума_цифр_року (звести до 1-22).
Душа = день + місяць (звести до 1-22).
Призначення = місяць + сума_цифр_року (звести до 1-22).

Коли розраховуєш матрицю — поясни значення кожної позиції через відповідний Аркан.

Не перевищуй 400 слів у відповіді, якщо не просять детально. Будь конкретним та корисним.`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const DAILY_LIMIT = 5;
const STORAGE_KEY = 'mod_ai_chat_usage';

function getUsage(): { count: number; date: string } {
  if (typeof window === 'undefined') return { count: 0, date: '' };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, date: '' };
    return JSON.parse(raw);
  } catch {
    return { count: 0, date: '' };
  }
}

function bumpUsage(): number {
  const today = new Date().toISOString().slice(0, 10);
  const usage = getUsage();
  const newCount = usage.date === today ? usage.count + 1 : 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: newCount, date: today }));
  return newCount;
}

function getRemainingFree(): number {
  const today = new Date().toISOString().slice(0, 10);
  const usage = getUsage();
  if (usage.date !== today) return DAILY_LIMIT;
  return Math.max(0, DAILY_LIMIT - usage.count);
}

export default function AiChatClient() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [authOpen, setAuthOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(DAILY_LIMIT);
  const [limitReached, setLimitReached] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    return onAuthStateChanged((u) => setUser(u));
  }, []);

  useEffect(() => {
    const r = getRemainingFree();
    setRemaining(r);
    setLimitReached(r <= 0);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Limit check for guests
    if (!user && limitReached) {
      setAuthOpen(true);
      return;
    }

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Track usage for guests
    if (!user) {
      const newCount = bumpUsage();
      const newRemaining = Math.max(0, DAILY_LIMIT - newCount);
      setRemaining(newRemaining);
      if (newRemaining <= 0) setLimitReached(true);
    }

    try {
      const apiBase = typeof window !== 'undefined' && window.location.hostname !== 'yourmatrixofdestiny.com'
        ? 'https://yourmatrixofdestiny.com'
        : '';
      const res = await fetch(`${apiBase}/api/claude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-20250514',
          max_tokens: 800,
          system: SYSTEM_PROMPT,
          messages: newMessages,
        }),
      });

      const data = await res.json();
      const reply = data?.content?.[0]?.text ?? 'Вибачте, сталася помилка. Спробуйте ще раз.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Тимчасова помилка підключення. Спробуйте ще раз.' },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isAuthLoading = user === undefined;

  return (
    <div className="min-h-[calc(100vh-72px)] flex flex-col max-w-[800px] mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8A2BE2] to-[#F5C542] flex items-center justify-center text-2xl">
            ✦
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">AI-провідник</h1>
            <p className="text-sm text-[var(--text-muted)]">
              {isAuthLoading
                ? '...'
                : user
                  ? `Вхід як ${user.email?.split('@')[0]} · Безліміт`
                  : `Гостьовий режим · ${remaining} з ${DAILY_LIMIT} безкоштовних повідомлень`}
            </p>
          </div>
        </div>
        {!user && !isAuthLoading && (
          <div className="bg-[rgba(245,197,66,0.06)] border border-[rgba(245,197,66,0.2)] rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-[var(--text-secondary)]">
              💡 Увійдіть для безлімітного доступу до AI-провідника
            </p>
            <button
              onClick={() => setAuthOpen(true)}
              className="text-sm font-bold text-[#F5C542] bg-[rgba(245,197,66,0.12)] border border-[rgba(245,197,66,0.3)] rounded-full px-4 py-2 cursor-pointer hover:bg-[rgba(245,197,66,0.2)] transition-colors"
            >
              Увійти / Зареєструватись
            </button>
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col gap-4 mb-6 min-h-[400px]">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center py-12">
            <div className="text-6xl">✦</div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Привіт! Я твій AI-провідник</h2>
              <p className="text-[var(--text-muted)] max-w-md mx-auto">
                Запитай мене про свою Матрицю Долі, значення чисел, карму, таланти або призначення.
                Поділись своєю датою народження для персонального аналізу.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {[
                'Що означає число 7 в позиції Душі?',
                'Розкажи про мою карму якщо я народилася 15.03.1992',
                'Як дізнатися своє призначення?',
                'Що таке Матриця Долі?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 50); }}
                  className="text-left text-sm text-[var(--text-secondary)] bg-white/[0.04] hover:bg-white/[0.08] border border-white/8 rounded-2xl px-4 py-3 cursor-pointer transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8A2BE2] to-[#F5C542] flex items-center justify-center text-sm flex-shrink-0 mt-1 mr-2">
                ✦
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-[var(--primary-dark)] to-[var(--primary)] text-white rounded-br-md'
                  : 'bg-white/[0.06] border border-white/8 text-[var(--text-secondary)] rounded-bl-md'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8A2BE2] to-[#F5C542] flex items-center justify-center text-sm flex-shrink-0 mt-1 mr-2">
              ✦
            </div>
            <div className="bg-white/[0.06] border border-white/8 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1 items-center">
              <span className="w-2 h-2 rounded-full bg-[var(--primary-light)] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--primary-light)] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--primary-light)] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Limit reached (guest) */}
      {!user && limitReached && (
        <div className="mb-4 bg-[rgba(139,92,246,0.08)] border border-[rgba(139,92,246,0.25)] rounded-2xl p-5 text-center">
          <div className="text-2xl mb-2">🔒</div>
          <h3 className="text-base font-bold text-white mb-1">Денний ліміт вичерпано</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Зареєструйтесь безкоштовно для безлімітного доступу до AI-провідника
          </p>
          <button
            onClick={() => setAuthOpen(true)}
            className="btn-primary px-6 py-3"
          >
            Зареєструватись безкоштовно
          </button>
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={limitReached && !user ? 'Увійдіть для продовження...' : 'Запитай AI-провідника...'}
          disabled={loading || (limitReached && !user)}
          rows={2}
          className="w-full bg-white/[0.06] border border-white/12 focus:border-[var(--primary)] rounded-2xl px-5 py-4 pr-14 text-white placeholder:text-white/30 outline-none resize-none transition-colors text-sm leading-relaxed disabled:opacity-40"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading || (limitReached && !user)}
          className="absolute right-3 bottom-3 w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-dark)] to-[var(--primary)] flex items-center justify-center cursor-pointer border-none disabled:opacity-30 hover:opacity-90 transition-opacity"
          aria-label="Надіслати"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <p className="text-xs text-[var(--text-muted)] text-center mt-3">
        Enter — надіслати · Shift+Enter — новий рядок
      </p>

      <AuthModal
        open={authOpen}
        initialMode="register"
        onClose={() => setAuthOpen(false)}
      />
    </div>
  );
}
