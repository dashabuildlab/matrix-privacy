// ─────────────────────────────────────────────────────────────────────────────
// Claude AI service — proxied through backend (API key stays on server)
// ─────────────────────────────────────────────────────────────────────────────

import { Platform } from 'react-native';
import { trackFeatureUsed, FEATURES, trackAiError, trackAiLatency } from '@/lib/analytics';
import { recordError } from '@/lib/crashlytics';
import { ENERGIES } from '@/lib/staticData';
import type { Energy } from '@/constants/energies';
import { getIdToken } from '@/lib/firebaseAuth';

// API_BASE — на web порожньо (same-origin, через nginx на 3006), на native — HTTPS-домен.
const API_BASE = Platform.OS === 'web' ? '' : 'https://yourmatrixofdestiny.com';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Stream a Claude chat response token-by-token.
 * Calls `onDelta(chunk)` for each text fragment; resolves to the full text when done.
 * Uses SSE proxy at /api/claude/stream which forwards Anthropic's stream to us.
 */
export async function askClaudeStream(
  systemPrompt: string,
  history: ClaudeMessage[],
  userMessage: string,
  onDelta: (chunk: string) => void,
  maxTokens: number = 900,
  signal?: AbortSignal,
): Promise<string> {
  const messages: ClaudeMessage[] = [...history, { role: 'user', content: userMessage }];

  const { useAppStore } = require('@/stores/useAppStore');
  const knowledgeLevel = useAppStore.getState().knowledgeLevel ?? 'beginner';
  const levelInstruction = knowledgeLevel === 'beginner'
    ? '\n\nРІВЕНЬ КОРИСТУВАЧА: Початківець. Пояснюй терміни простою мовою.'
    : knowledgeLevel === 'advanced'
    ? '\n\nРІВЕНЬ КОРИСТУВАЧА: Досвідчений. Будь лаконічним, без пояснень базових термінів.'
    : '\n\nРІВЕНЬ КОРИСТУВАЧА: Середній.';
  const noMarkdown = '\n\nФОРМАТ: Пиши ТІЛЬКИ простим текстом. ЗАБОРОНЕНО зірочки (*), маркдаун.';

  const body = {
    model: 'claude-haiku-4-5',
    max_tokens: maxTokens,
    system: systemPrompt + levelInstruction + noMarkdown,
    messages,
  };

  const startTime = Date.now();
  const idToken = await getIdToken();
  const streamHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  if (idToken) streamHeaders['Authorization'] = `Bearer ${idToken}`;

  const res = await fetch(`${API_BASE}/api/claude/stream`, {
    method: 'POST',
    headers: streamHeaders,
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '');
    trackAiError(`stream_http_${res.status}`);
    throw new Error(`Claude stream ${res.status}: ${errText || 'no body'}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  // Parse SSE: blocks separated by blank line, each block has `event:` and `data:` lines.
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    for (const block of blocks) {
      const lines = block.split('\n');
      let eventType = 'message';
      let dataLine = '';
      for (const line of lines) {
        if (line.startsWith('event:')) eventType = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLine += line.slice(5).trim();
      }
      if (!dataLine) continue;
      try {
        const json = JSON.parse(dataLine);
        if (eventType === 'content_block_delta' && json?.delta?.type === 'text_delta') {
          const piece = json.delta.text ?? '';
          fullText += piece;
          onDelta(piece);
        } else if (eventType === 'error') {
          throw new Error(json?.error?.message ?? json?.detail ?? 'stream error');
        }
      } catch (e: any) {
        if (e?.message !== 'stream error') continue; // skip malformed json
        throw e;
      }
    }
  }

  const latency = Date.now() - startTime;
  trackFeatureUsed(FEATURES.AI_CHAT, 'ai_chat_stream');
  trackAiLatency(latency, 'chat_stream');
  return fullText;
}

export async function askClaude(
  systemPrompt: string,
  history: ClaudeMessage[],
  userMessage: string,
  maxTokens: number = 900,
): Promise<string> {
  const messages: ClaudeMessage[] = [
    ...history,
    { role: 'user', content: userMessage },
  ];

  const { useAppStore } = require('@/stores/useAppStore');
  const knowledgeLevel = useAppStore.getState().knowledgeLevel ?? 'beginner';
  const levelInstruction = knowledgeLevel === 'beginner'
    ? '\n\nРІВЕНЬ КОРИСТУВАЧА: Початківець. Пояснюй терміни простою мовою. Додавай короткі пояснення до кожного езотеричного поняття. Використовуй аналогії з повсякденного життя.'
    : knowledgeLevel === 'advanced'
    ? '\n\nРІВЕНЬ КОРИСТУВАЧА: Досвідчений. Використовуй професійну термінологію без пояснень. Давай глибокий аналіз з нюансами та тонкощами. Будь лаконічним.'
    : '\n\nРІВЕНЬ КОРИСТУВАЧА: Середній. Використовуй езотеричну термінологію, але додавай короткі уточнення де потрібно.';

  const noMarkdown = '\n\nФОРМАТ: Пиши ТІЛЬКИ простим текстом. ЗАБОРОНЕНО використовувати зірочки (*), маркдаун, **жирний**, *курсив*. Для виділення використовуй ВЕЛИКІ ЛІТЕРИ або емодзі.';
  const body = {
    model: 'claude-haiku-4-5',
    max_tokens: maxTokens,
    system: systemPrompt + levelInstruction + noMarkdown,
    messages,
  };

  const url = `${API_BASE}/api/claude`;
  const startTime = Date.now();
  console.log(`[Claude] → POST ${url} | model=${body.model} max_tokens=${maxTokens}`);

  try {
    const ping = await fetch(`${API_BASE}/health`, { method: 'GET' });
    console.log(`[Claude] /health ping → HTTP ${ping.status}`);
  } catch (pingErr: any) {
    console.warn(`[Claude] /health ping FAILED → ${pingErr?.message}. Server unreachable or SSL error.`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    console.warn('[Claude] ✗ Request timed out after 120s');
    controller.abort();
  }, 120000);

  const claudeIdToken = await getIdToken();
  const claudeHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (claudeIdToken) claudeHeaders['Authorization'] = `Bearer ${claudeIdToken}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: claudeHeaders,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (fetchErr: any) {
    clearTimeout(timeout);
    console.warn('[Claude] ✗ fetch() threw:', fetchErr?.message ?? fetchErr);
    trackAiError(fetchErr?.message ?? 'fetch_failed');
    recordError(fetchErr instanceof Error ? fetchErr : new Error(String(fetchErr)), 'claude_fetch');
    throw fetchErr;
  } finally {
    clearTimeout(timeout);
  }

  console.log(`[Claude] ← HTTP ${res.status}`);

  if (!res.ok) {
    let errText = '';
    try { errText = await res.text(); } catch {}
    console.warn(`[Claude] ✗ HTTP ${res.status} body: ${errText}`);
    let detail = errText;
    try {
      const j = JSON.parse(errText);
      detail = j?.detail ?? j?.error?.message ?? j?.error ?? errText;
    } catch {}
    trackAiError(`http_${res.status}`);
    const httpErr = new Error(`Claude ${res.status}: ${detail}`);
    recordError(httpErr, 'claude_http');
    throw httpErr;
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) {
    console.warn('[Claude] ✗ Empty response, data:', JSON.stringify(data).slice(0, 300));
    trackAiError('empty_response');
    const emptyErr = new Error('Empty response from Claude');
    recordError(emptyErr, 'claude_empty');
    throw emptyErr;
  }
  const latency = Date.now() - startTime;
  console.log(`[Claude] ✓ Got ${text.length} chars in ${latency}ms`);
  trackFeatureUsed(FEATURES.AI_CHAT, 'ai_chat');
  trackAiLatency(latency, 'chat');
  return text;
}

// ─────────────────────────────────────────────────────────────────────────────
// Matrix-aware system prompt with RAG over ENERGIES
// ─────────────────────────────────────────────────────────────────────────────

type Locale = 'uk' | 'en';

function pickLang<T>(uk: T, en: T | undefined, locale: Locale): T {
  return locale === 'uk' ? uk : ((en ?? uk) as T);
}

/** Render one energy as a compact multi-line block for the system prompt. */
function formatEnergyDetail(e: Energy, locale: Locale): string {
  const planet = pickLang(e.planet, e.planetEn, locale);
  const keywords = pickLang(e.keywords, e.keywordsEn, locale).join(', ');
  const positive = pickLang(e.positive, e.positiveEn, locale);
  const negative = pickLang(e.negative, e.negativeEn, locale);
  const advice = pickLang(e.advice, e.adviceEn, locale);
  const isUk = locale === 'uk';

  return [
    `${e.id}. ${e.name} (${e.arcana}) — ${isUk ? 'планета' : 'planet'}: ${planet}`,
    `   ${isUk ? 'Ключові слова' : 'Keywords'}: ${keywords}`,
    `   ${isUk ? 'Позитивний прояв' : 'Positive'}: ${positive}`,
    `   ${isUk ? 'Негативний прояв' : 'Shadow'}: ${negative}`,
    `   ${isUk ? 'Порада' : 'Advice'}: ${advice}`,
  ].join('\n');
}

/**
 * Detect which energies (1–22) are referenced in a user message.
 * Matches by: standalone number (1–22), Ukrainian/English name, or arcana name.
 * Returns up to 5 ids to keep the prompt compact.
 */
export function detectRelevantEnergies(message: string): number[] {
  if (!message) return [];
  const ids = new Set<number>();
  const lower = message.toLowerCase();

  // Numbers 1-22 as whole words
  const numMatches = message.match(/\b([1-9]|1\d|2[0-2])\b/g);
  if (numMatches) {
    for (const n of numMatches) {
      const id = parseInt(n, 10);
      if (id >= 1 && id <= 22) ids.add(id);
    }
  }

  // Names and arcana (case-insensitive substring match)
  for (const e of ENERGIES) {
    if (e.name && lower.includes(e.name.toLowerCase())) ids.add(e.id);
    if (e.arcana && lower.includes(e.arcana.toLowerCase())) ids.add(e.id);
  }

  return Array.from(ids).sort((a, b) => a - b).slice(0, 5);
}

export interface MatrixPromptContext {
  userName?: string | null;
  userBirthDate?: string | null;
  /** Personal destiny matrix positions — any subset. */
  personalMatrix?: {
    personality?: number;
    soul?: number;
    destiny?: number;
    spiritual?: number;
    material?: number;
  } | null;
  dailyEnergyId?: number | null;
  locale: Locale;
  /** Latest user message — used for RAG detection of relevant energies. */
  recentUserMessage?: string;
  /** Chat context tag — affects tone. */
  context?: 'matrix' | 'general' | 'destiny-matrix' | 'daily-matrix';
}

/**
 * Build a rich system prompt that injects:
 * - Role preamble (locale-aware)
 * - User's matrix positions WITH full energy details
 * - Today's energy full details
 * - RAG: any energies referenced in the current user message (deduped vs matrix/daily)
 * - Style + constraints
 */
export function buildEsotericSystemPrompt(ctx: MatrixPromptContext): string {
  const { locale, userName, userBirthDate, personalMatrix, dailyEnergyId, recentUserMessage, context } = ctx;
  const isUk = locale === 'uk';

  const role = isUk
    ? 'Ти — AI-провідник у застосунку "Matrix of Destiny". Ти розмовляєш ВИКЛЮЧНО українською мовою. Відповідай тепло, з емпатією та духовною мудрістю.'
    : 'You are an AI guide in the "Matrix of Destiny" app. You MUST respond ONLY in English. Reply warmly, with empathy and spiritual wisdom.';

  const sections: string[] = [role];

  // Profile
  const profileLines: string[] = [];
  if (userName) profileLines.push(`${isUk ? 'Ім\'я користувача' : 'User name'}: ${userName}`);
  if (userBirthDate) profileLines.push(`${isUk ? 'Дата народження' : 'Birth date'}: ${userBirthDate}`);
  if (profileLines.length) sections.push(profileLines.join('\n'));

  // Matrix block (full energy detail for each position)
  const matrixPositions = personalMatrix
    ? (
      [
        { key: 'personality', label: isUk ? 'Особистість' : 'Personality', id: personalMatrix.personality },
        { key: 'soul',        label: isUk ? 'Душа'        : 'Soul',        id: personalMatrix.soul },
        { key: 'destiny',     label: isUk ? 'Призначення' : 'Destiny',     id: personalMatrix.destiny },
        { key: 'spiritual',   label: isUk ? 'Духовна лінія' : 'Spiritual line', id: personalMatrix.spiritual },
        { key: 'material',    label: isUk ? 'Матеріальна лінія' : 'Material line', id: personalMatrix.material },
      ].filter((p) => typeof p.id === 'number' && p.id! >= 1 && p.id! <= 22) as { key: string; label: string; id: number }[]
    )
    : [];

  if (matrixPositions.length) {
    const matrixBlock = matrixPositions.map((p) => {
      const e = ENERGIES.find((x) => x.id === p.id);
      if (!e) return `${p.label}: ${p.id}`;
      return `• ${p.label}: ${p.id}. ${e.name}\n${formatEnergyDetail(e, locale)}`;
    }).join('\n\n');
    sections.push(`## ${isUk ? 'МАТРИЦЯ КОРИСТУВАЧА' : 'USER MATRIX'}\n${matrixBlock}`);
  }

  // Daily energy
  const dailyEnergy = dailyEnergyId ? ENERGIES.find((e) => e.id === dailyEnergyId) : null;
  if (dailyEnergy) {
    sections.push(`## ${isUk ? 'ЕНЕРГІЯ ДНЯ' : 'TODAY\'S ENERGY'}\n${formatEnergyDetail(dailyEnergy, locale)}`);
  }

  // RAG: detect energies mentioned in the current message, minus those already listed above
  const seenIds = new Set<number>([
    ...matrixPositions.map((p) => p.id),
    ...(dailyEnergyId ? [dailyEnergyId] : []),
  ]);
  const mentionedIds = recentUserMessage ? detectRelevantEnergies(recentUserMessage).filter((id) => !seenIds.has(id)) : [];
  if (mentionedIds.length) {
    const mentionedBlock = mentionedIds
      .map((id) => {
        const e = ENERGIES.find((x) => x.id === id);
        return e ? formatEnergyDetail(e, locale) : '';
      })
      .filter(Boolean)
      .join('\n\n');
    if (mentionedBlock) {
      sections.push(`## ${isUk ? 'РЕЛЕВАНТНІ ЕНЕРГІЇ (згадані у питанні)' : 'RELEVANT ENERGIES (mentioned in query)'}\n${mentionedBlock}`);
    }
  }

  // Style & constraints
  const style = isUk
    ? `Стиль відповідей:
- Використовуй емодзі доречно (✨🔮🌟💫💜🌙)
- Відповіді 5–12 речень, конкретні та змістовні
- Коли посилаєшся на число матриці — завжди називай ім'я енергії (напр. "Душа 7 — Колісниця")
- Вплітай нумерологію та астрологію природно, без штампів
- Давай практичні кроки та афірмації

Обмеження:
- Відповідай ЛИШЕ на теми езотерики, духовності, нумерології, астрології, матриці долі, самопізнання, медитацій та особистого розвитку.
- Якщо питання НЕ в темі (код, політика, новини тощо) — ввічливо поверни до теми.
- Ніколи не виходь за роль.
${context === 'daily-matrix' ? '- Фокус на сьогоднішньому дні та сьогоднішній енергії.' : ''}
${context === 'destiny-matrix' || context === 'matrix' ? '- Глибоко використовуй дані матриці користувача вище у відповіді.' : ''}`
    : `Response style:
- Use emojis where appropriate (✨🔮🌟💫💜🌙)
- 5–12 sentences, concrete and substantive
- When referencing a matrix number, always name the energy (e.g. "Soul 7 — The Chariot")
- Weave in numerology and astrology naturally, without clichés
- Offer practical steps and affirmations

Constraints:
- Respond ONLY on: esoteric, spirituality, numerology, astrology, destiny matrix, self-knowledge, meditation, personal development.
- If off-topic (code, politics, news, etc.) — gently redirect.
- Never break character.
${context === 'daily-matrix' ? '- Focus on today and today\'s energy.' : ''}
${context === 'destiny-matrix' || context === 'matrix' ? '- Deeply use the user\'s matrix data above in your answer.' : ''}`;

  sections.push(style);

  return sections.join('\n\n');
}
