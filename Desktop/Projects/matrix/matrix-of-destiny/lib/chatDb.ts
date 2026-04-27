/**
 * SQLite persistence for chat sessions and messages.
 *
 * Why SQLite and not Zustand persist?
 * - Zustand serialises the entire state to one JSON blob on every change.
 *   With hundreds of messages this blocks the JS thread (UI stutter).
 * - SQLite reads/writes only the rows it needs and runs off the main thread.
 *
 * expo-sqlite is bundled with Expo SDK 50+, no extra install required.
 */
import * as SQLite from 'expo-sqlite';
import type { AIChatSession, ChatMessage } from '@/stores/useAppStore';

const db = SQLite.openDatabaseSync('chat.db');

// ─── Schema ──────────────────────────────────────────────────────────────────

export function initChatDb(): void {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id           TEXT PRIMARY KEY,
      user_id      TEXT,
      title        TEXT NOT NULL,
      context      TEXT NOT NULL DEFAULT 'general',
      matrix_id    TEXT,
      spread_id    TEXT,
      created_at   TEXT NOT NULL,
      last_message TEXT,
      msg_count    INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id         TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role       TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content    TEXT NOT NULL,
      cards      TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_msgs_session
      ON chat_messages(session_id, created_at);
  `);
}

// ─── Session helpers ──────────────────────────────────────────────────────────

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

export function getSessionsSync(limit = 50): SessionRow[] {
  return db.getAllSync<SessionRow>(
    `SELECT * FROM chat_sessions ORDER BY created_at DESC LIMIT ?`,
    [limit],
  );
}

export function getSessionSync(id: string): SessionRow | null {
  return db.getFirstSync<SessionRow>(
    `SELECT * FROM chat_sessions WHERE id = ?`, [id],
  ) ?? null;
}

export function upsertSessionSync(session: AIChatSession): void {
  db.runSync(
    `INSERT INTO chat_sessions (id, user_id, title, context, matrix_id, spread_id, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?)
     ON CONFLICT(id) DO UPDATE SET
       title     = excluded.title,
       user_id   = excluded.user_id,
       matrix_id = excluded.matrix_id`,
    [
      session.id,
      session.userId ?? null,
      session.title,
      session.context,
      session.matrixId ?? null,
      session.createdAt,
    ],
  );
}

export function renameSessionSync(id: string, title: string): void {
  db.runSync(`UPDATE chat_sessions SET title = ? WHERE id = ?`, [title, id]);
}

export function deleteSessionSync(id: string): void {
  // CASCADE deletes messages automatically (FK defined above)
  db.runSync(`DELETE FROM chat_sessions WHERE id = ?`, [id]);
}

export function updateSessionUserIdSync(guestId: string, newUserId: string): void {
  db.runSync(
    `UPDATE chat_sessions SET user_id = ? WHERE user_id = ? OR user_id IS NULL`,
    [newUserId, guestId],
  );
}

export function clearAllSessionsSync(): void {
  db.execSync(`DELETE FROM chat_messages; DELETE FROM chat_sessions;`);
}

// ─── Message helpers ──────────────────────────────────────────────────────────

interface MessageRow {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  cards: string | null;
  created_at: string;
}

function rowToMessage(row: MessageRow): ChatMessage {
  // The `cards` column is legacy (Tarot) and intentionally ignored here.
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

export function getMessagesSync(sessionId: string): ChatMessage[] {
  const rows = db.getAllSync<MessageRow>(
    `SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC`,
    [sessionId],
  );
  return rows.map(rowToMessage);
}

export function addMessageSync(sessionId: string, msg: ChatMessage): void {
  db.runSync(
    `INSERT OR REPLACE INTO chat_messages (id, session_id, role, content, cards, created_at)
     VALUES (?, ?, ?, ?, NULL, ?)`,
    [
      msg.id,
      sessionId,
      msg.role,
      msg.content,
      msg.createdAt,
    ],
  );
  // Denormalize last_message + count so the session list doesn't need a JOIN
  db.runSync(
    `UPDATE chat_sessions
     SET last_message = ?,
         msg_count    = (SELECT COUNT(*) FROM chat_messages WHERE session_id = ?)
     WHERE id = ?`,
    [msg.content.slice(0, 120), sessionId, sessionId],
  );
}

// ─── Bulk import (used by syncWithServer) ────────────────────────────────────

export function importSessionsSync(sessions: AIChatSession[]): void {
  for (const session of sessions) {
    upsertSessionSync(session);
    for (const msg of session.messages) {
      addMessageSync(session.id, msg);
    }
  }
}

/**
 * Export the last `limit` sessions with their full messages for server sync.
 * Runs synchronously to avoid async complications inside pushToServer.
 */
export function exportSessionsSync(limit = 20): AIChatSession[] {
  const sessions = getSessionsSync(limit);
  return sessions.map((s) => ({
    id: s.id,
    userId: s.user_id ?? undefined,
    title: s.title,
    context: s.context,
    matrixId: s.matrix_id ?? undefined,
    messages: getMessagesSync(s.id).slice(-100),
    createdAt: s.created_at,
  }));
}
