-- AI portraits — generated Higher Self portraits
CREATE TABLE IF NOT EXISTS ai_portraits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT        NOT NULL,
  birth_date  TEXT        NOT NULL,
  arcana_id   INTEGER     NOT NULL,
  portrait_url TEXT       NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_portraits_user_id_idx ON ai_portraits (user_id);
CREATE INDEX IF NOT EXISTS ai_portraits_created_at_idx ON ai_portraits (created_at DESC);
