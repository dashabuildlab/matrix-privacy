-- ─────────────────────────────────────────────────────────────────────────────
-- Matrix of Soul — plain PostgreSQL schema (no Supabase auth)
-- Run as: app_matrix_of_soul user
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Users ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id              TEXT        PRIMARY KEY,          -- uuid from client
  email           TEXT        UNIQUE,
  phone           TEXT        UNIQUE,
  name            TEXT        NOT NULL DEFAULT '',
  birth_date      DATE,
  avatar_url      TEXT,
  is_premium      BOOLEAN     NOT NULL DEFAULT false,
  premium_plan    TEXT                 DEFAULT NULL,   -- 'monthly','annual','lifetime'
  premium_expires_at TIMESTAMPTZ      DEFAULT NULL,
  xp              INTEGER     NOT NULL DEFAULT 0,
  level           SMALLINT    NOT NULL DEFAULT 1,
  streak          SMALLINT    NOT NULL DEFAULT 0,
  last_active_date DATE,
  diamonds        INTEGER     NOT NULL DEFAULT 0,
  knowledge_level TEXT                 DEFAULT NULL,   -- 'beginner','intermediate','advanced'
  life_focus      TEXT[]      NOT NULL DEFAULT '{}',
  daily_card_enabled BOOLEAN  NOT NULL DEFAULT true,
  language        TEXT        NOT NULL DEFAULT 'uk',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Static content ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS energies (
  id          SMALLINT    PRIMARY KEY,
  name        TEXT        NOT NULL,
  arcana      TEXT        NOT NULL,
  planet      TEXT        NOT NULL DEFAULT '',
  keywords    TEXT[]      NOT NULL DEFAULT '{}',
  positive    TEXT        NOT NULL DEFAULT '',
  negative    TEXT        NOT NULL DEFAULT '',
  advice      TEXT        NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS meditations (
  id                   TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title                TEXT        NOT NULL,
  subtitle             TEXT        NOT NULL DEFAULT '',
  description          TEXT        NOT NULL DEFAULT '',
  guide                TEXT        NOT NULL DEFAULT '',
  duration_label       TEXT        NOT NULL DEFAULT '',
  duration_sec         INTEGER     NOT NULL DEFAULT 0,
  moods                TEXT[]      NOT NULL DEFAULT '{}',
  goals                TEXT[]      NOT NULL DEFAULT '{}',
  frequency            TEXT        NOT NULL DEFAULT '',
  artwork_gradient     TEXT[]      NOT NULL DEFAULT '{"#1E1B4B","#4338CA","#A5B4FC"}',
  artwork_emoji        TEXT        NOT NULL DEFAULT '✨',
  artwork_accent_color TEXT        NOT NULL DEFAULT '#A78BFA',
  is_premium           BOOLEAN     NOT NULL DEFAULT false,
  diamond_cost         INTEGER     NOT NULL DEFAULT 0,
  active               BOOLEAN     NOT NULL DEFAULT true,
  sort_order           SMALLINT    NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS moods (
  id          TEXT        PRIMARY KEY,
  label       TEXT        NOT NULL,
  emoji       TEXT        NOT NULL DEFAULT '',
  color       TEXT        NOT NULL DEFAULT '#8B5CF6',
  sort_order  SMALLINT    NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS goals (
  id          TEXT        PRIMARY KEY,
  label       TEXT        NOT NULL,
  emoji       TEXT        NOT NULL DEFAULT '',
  color       TEXT        NOT NULL DEFAULT '#8B5CF6',
  sort_order  SMALLINT    NOT NULL DEFAULT 0
);

-- ─── Matrices ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS matrices (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL DEFAULT '',
  birth_date  DATE        NOT NULL,
  is_self     BOOLEAN     NOT NULL DEFAULT false,
  data        JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matrices_user ON matrices(user_id, created_at DESC);


-- ─── AI Chat ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_messages (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id  TEXT        NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('user','assistant')),
  content     TEXT        NOT NULL,
  tokens_used INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at);

-- ─── Meditation sessions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meditation_sessions (
  id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id         TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meditation_id   TEXT        NOT NULL REFERENCES meditations(id),
  duration_sec    INTEGER     NOT NULL DEFAULT 0,
  completed       BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meditation_sessions_user ON meditation_sessions(user_id, created_at DESC);

-- ─── Unlocked meditations (bought with diamonds) ──────────────────────────────

CREATE TABLE IF NOT EXISTS meditation_unlocks (
  user_id         TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meditation_id   TEXT        NOT NULL REFERENCES meditations(id),
  diamonds_spent  INTEGER     NOT NULL DEFAULT 0,
  unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, meditation_id)
);

-- ─── Notifications ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL DEFAULT 'system',
  title       TEXT        NOT NULL DEFAULT '',
  body        TEXT        NOT NULL DEFAULT '',
  read        BOOLEAN     NOT NULL DEFAULT false,
  data        JSONB                DEFAULT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
