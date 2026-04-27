-- Matrix of Soul — user sync state table
-- Stores the full Zustand state as JSONB for server-side sync

CREATE TABLE IF NOT EXISTS user_sync (
  user_id    TEXT        PRIMARY KEY,
  state      JSONB       NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sync_updated ON user_sync(updated_at DESC);
