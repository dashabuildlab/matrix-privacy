/**
 * Web fallback for chatDb.ts — identical public API, localStorage instead of SQLite.
 * Metro bundler automatically picks this file over chatDb.ts when building for web.
 */
import type { AIChatSession, ChatMessage } from '@/stores/useAppStore';

export interface SessionRow {
  id: string;
  user_id: string | null;
  title: string;
  context: AIChatSession['context'];
  matrix_id: string | null;
  spread_id: string | null;
  created_at: string;
  last_message: string | null;
  msg_count: number;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const SESSIONS_KEY = 'chat_sessions_v1';
const MSGS_PREFIX  = 'chat_msgs_v1_';

function loadSessions(): SessionRow[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as SessionRow[]) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: SessionRow[]): void {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)); } catch {}
}

function loadMessages(sessionId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(MSGS_PREFIX + sessionId);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function saveMessages(sessionId: string, msgs: ChatMessage[]): void {
  try { localStorage.setItem(MSGS_PREFIX + sessionId, JSON.stringify(msgs)); } catch {}
}

// ─── Schema ───────────────────────────────────────────────────────────────────

export function initChatDb(): void {
  // nothing to initialise on web
}

// ─── Session helpers ──────────────────────────────────────────────────────────

export function getSessionsSync(limit = 50): SessionRow[] {
  const all = loadSessions();
  all.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return all.slice(0, limit);
}

export function getSessionSync(id: string): SessionRow | null {
  return loadSessions().find((s) => s.id === id) ?? null;
}

export function upsertSessionSync(session: AIChatSession): void {
  const sessions = loadSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  const row: SessionRow = {
    id: session.id,
    user_id: session.userId ?? null,
    title: session.title,
    context: session.context,
    matrix_id: session.matrixId ?? null,
    spread_id: null,
    created_at: session.createdAt,
    last_message: null,
    msg_count: 0,
  };
  if (idx >= 0) {
    // preserve last_message and msg_count on update
    row.last_message = sessions[idx].last_message;
    row.msg_count    = sessions[idx].msg_count;
    sessions[idx] = row;
  } else {
    sessions.push(row);
  }
  saveSessions(sessions);
}

export function renameSessionSync(id: string, title: string): void {
  const sessions = loadSessions();
  const s = sessions.find((s) => s.id === id);
  if (s) { s.title = title; saveSessions(sessions); }
}

export function deleteSessionSync(id: string): void {
  saveSessions(loadSessions().filter((s) => s.id !== id));
  try { localStorage.removeItem(MSGS_PREFIX + id); } catch {}
}

export function updateSessionUserIdSync(guestId: string, newUserId: string): void {
  const sessions = loadSessions();
  sessions.forEach((s) => {
    if (s.user_id === guestId || s.user_id === null) s.user_id = newUserId;
  });
  saveSessions(sessions);
}

export function clearAllSessionsSync(): void {
  const sessions = loadSessions();
  sessions.forEach((s) => { try { localStorage.removeItem(MSGS_PREFIX + s.id); } catch {} });
  saveSessions([]);
}

// ─── Message helpers ──────────────────────────────────────────────────────────

export function getMessagesSync(sessionId: string): ChatMessage[] {
  return loadMessages(sessionId);
}

export function addMessageSync(sessionId: string, msg: ChatMessage): void {
  const msgs = loadMessages(sessionId);
  const idx  = msgs.findIndex((m) => m.id === msg.id);
  if (idx >= 0) msgs[idx] = msg; else msgs.push(msg);
  saveMessages(sessionId, msgs);

  // Update denormalised fields on the session row
  const sessions = loadSessions();
  const s = sessions.find((s) => s.id === sessionId);
  if (s) {
    s.last_message = msg.content.slice(0, 120);
    s.msg_count    = msgs.length;
    saveSessions(sessions);
  }
}

// ─── Bulk import / export ─────────────────────────────────────────────────────

export function importSessionsSync(sessions: AIChatSession[]): void {
  for (const session of sessions) {
    upsertSessionSync(session);
    for (const msg of session.messages) {
      addMessageSync(session.id, msg);
    }
  }
}

export function exportSessionsSync(limit = 20): AIChatSession[] {
  return getSessionsSync(limit).map((s) => ({
    id: s.id,
    userId: s.user_id ?? undefined,
    title: s.title,
    context: s.context,
    matrixId: s.matrix_id ?? undefined,
    messages: getMessagesSync(s.id).slice(-100),
    createdAt: s.created_at,
  }));
}
