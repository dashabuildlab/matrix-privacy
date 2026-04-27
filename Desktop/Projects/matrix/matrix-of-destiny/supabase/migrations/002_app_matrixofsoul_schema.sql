-- ─────────────────────────────────────────────────────────────────────────────
-- Matrix of Destiny — schema: app_matrixofsoul
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS app_matrixofsoul;

-- Allow authenticated users to use this schema
GRANT USAGE ON SCHEMA app_matrixofsoul TO authenticated, anon, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app_matrixofsoul
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;


-- ─── Static content ───────────────────────────────────────────────────────────

CREATE TABLE app_matrixofsoul.energies (
  id          SMALLINT    PRIMARY KEY,          -- 1–22
  name        TEXT        NOT NULL,
  arcana      TEXT        NOT NULL,
  planet      TEXT        NOT NULL DEFAULT '',
  keywords    TEXT[]      NOT NULL DEFAULT '{}',
  positive    TEXT        NOT NULL DEFAULT '',
  negative    TEXT        NOT NULL DEFAULT '',
  advice      TEXT        NOT NULL DEFAULT ''
);

CREATE TABLE app_matrixofsoul.meditations (
  id                  TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title               TEXT        NOT NULL,
  subtitle            TEXT        NOT NULL DEFAULT '',
  description         TEXT        NOT NULL DEFAULT '',
  guide               TEXT        NOT NULL DEFAULT '',
  duration_label      TEXT        NOT NULL DEFAULT '',
  duration_sec        INTEGER     NOT NULL DEFAULT 0,
  moods               TEXT[]      NOT NULL DEFAULT '{}',
  goals               TEXT[]      NOT NULL DEFAULT '{}',
  frequency           TEXT        NOT NULL DEFAULT '',
  artwork_gradient    TEXT[]      NOT NULL DEFAULT '{"#1E1B4B","#4338CA","#A5B4FC"}',
  artwork_emoji       TEXT        NOT NULL DEFAULT '✨',
  artwork_accent_color TEXT       NOT NULL DEFAULT '#A78BFA',
  is_premium          BOOLEAN     NOT NULL DEFAULT false,
  active              BOOLEAN     NOT NULL DEFAULT true,
  sort_order          SMALLINT    NOT NULL DEFAULT 0
);

CREATE TABLE app_matrixofsoul.moods (
  id          TEXT        PRIMARY KEY,
  label       TEXT        NOT NULL,
  emoji       TEXT        NOT NULL DEFAULT '',
  color       TEXT        NOT NULL DEFAULT '#8B5CF6',
  sort_order  SMALLINT    NOT NULL DEFAULT 0
);

CREATE TABLE app_matrixofsoul.goals (
  id          TEXT        PRIMARY KEY,
  label       TEXT        NOT NULL,
  emoji       TEXT        NOT NULL DEFAULT '',
  color       TEXT        NOT NULL DEFAULT '#8B5CF6',
  sort_order  SMALLINT    NOT NULL DEFAULT 0
);


-- ─── User profiles ────────────────────────────────────────────────────────────

CREATE TABLE app_matrixofsoul.user_profiles (
  id                      UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                    TEXT        NOT NULL DEFAULT '',
  birth_date              DATE,
  is_premium              BOOLEAN     NOT NULL DEFAULT false,
  premium_plan            TEXT                 DEFAULT NULL,
  xp                      INTEGER     NOT NULL DEFAULT 0,
  level                   SMALLINT    NOT NULL DEFAULT 1,
  streak                  SMALLINT    NOT NULL DEFAULT 0,
  last_active_date        DATE,
  tokens                  INTEGER     NOT NULL DEFAULT 3,
  referral_code           TEXT        UNIQUE,
  referred_by             TEXT,
  meditation_count        INTEGER     NOT NULL DEFAULT 0,
  unlocked_achievement_ids TEXT[]     NOT NULL DEFAULT '{}',
  language                TEXT        NOT NULL DEFAULT 'uk',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION app_matrixofsoul.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON app_matrixofsoul.user_profiles
  FOR EACH ROW EXECUTE FUNCTION app_matrixofsoul.update_updated_at();

ALTER TABLE app_matrixofsoul.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile"
  ON app_matrixofsoul.user_profiles
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ─── Matrices (saved numerology matrices) ────────────────────────────────────

CREATE TABLE app_matrixofsoul.matrices (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL DEFAULT '',
  birth_date  DATE        NOT NULL,
  is_self     BOOLEAN     NOT NULL DEFAULT false,
  data        JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_matrixofsoul.matrices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own matrices"
  ON app_matrixofsoul.matrices
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─── AI Chat ──────────────────────────────────────────────────────────────────

CREATE TABLE app_matrixofsoul.chat_sessions (
  id          TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL DEFAULT 'Новий чат',
  context     TEXT        NOT NULL DEFAULT 'general' CHECK (context IN ('general','matrix')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app_matrixofsoul.chat_messages (
  id          TEXT        PRIMARY KEY,
  session_id  TEXT        NOT NULL REFERENCES app_matrixofsoul.chat_sessions(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('user','assistant')),
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_session ON app_matrixofsoul.chat_messages(session_id, created_at);

ALTER TABLE app_matrixofsoul.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own chat sessions"
  ON app_matrixofsoul.chat_sessions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE app_matrixofsoul.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own chat messages"
  ON app_matrixofsoul.chat_messages
  USING (EXISTS (
    SELECT 1 FROM app_matrixofsoul.chat_sessions s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));


-- ─── Meditation sessions ──────────────────────────────────────────────────────

CREATE TABLE app_matrixofsoul.meditation_sessions (
  id              TEXT        PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meditation_id   TEXT        NOT NULL REFERENCES app_matrixofsoul.meditations(id),
  duration_sec    INTEGER     NOT NULL DEFAULT 0,
  completed       BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meditation_sessions_user ON app_matrixofsoul.meditation_sessions(user_id, created_at DESC);

ALTER TABLE app_matrixofsoul.meditation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own meditation sessions"
  ON app_matrixofsoul.meditation_sessions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─── Static data read policy ─────────────────────────────────────────────────

ALTER TABLE app_matrixofsoul.energies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_matrixofsoul.meditations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_matrixofsoul.moods       ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_matrixofsoul.goals       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read energies"    ON app_matrixofsoul.energies    FOR SELECT USING (true);
CREATE POLICY "Public read meditations" ON app_matrixofsoul.meditations FOR SELECT USING (active = true);
CREATE POLICY "Public read moods"       ON app_matrixofsoul.moods       FOR SELECT USING (true);
CREATE POLICY "Public read goals"       ON app_matrixofsoul.goals       FOR SELECT USING (true);
