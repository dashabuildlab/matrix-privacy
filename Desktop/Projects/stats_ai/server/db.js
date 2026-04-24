const { Pool } = require('pg');

// Strip ?schema= param that psql doesn't understand
const rawUrl = process.env.DATABASE_URL || '';
const connectionString = rawUrl.split('?')[0];

const pool = new Pool({ connectionString });

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS stats_ai`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stats_ai.users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name VARCHAR(100),
        sports TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stats_ai.triggers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES stats_ai.users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        label TEXT NOT NULL,
        match_name TEXT,
        threshold TEXT,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stats_ai.chat_history (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(64),
        role VARCHAR(10) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stats_ai.sports (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        slug VARCHAR(50) UNIQUE NOT NULL,
        api_host VARCHAR(100),
        icon VARCHAR(50),
        active BOOLEAN DEFAULT true
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stats_ai.leagues (
        id SERIAL PRIMARY KEY,
        sport_id INTEGER REFERENCES stats_ai.sports(id),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(50) NOT NULL,
        api_id INTEGER,
        api_season VARCHAR(20),
        country VARCHAR(50),
        logo_url TEXT,
        active BOOLEAN DEFAULT true
      )
    `);

    // Teams + matches (used by dataSync / matches-upcoming)
    await client.query(`
      CREATE TABLE IF NOT EXISTS stats_ai.teams (
        id SERIAL PRIMARY KEY,
        api_id INTEGER,
        name VARCHAR(120) NOT NULL,
        short_name VARCHAR(20),
        country VARCHAR(60),
        logo_url TEXT,
        UNIQUE(api_id)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS stats_ai.matches (
        id SERIAL PRIMARY KEY,
        api_fixture_id INTEGER UNIQUE,
        league_id INTEGER REFERENCES stats_ai.leagues(id),
        home_team_id INTEGER REFERENCES stats_ai.teams(id),
        away_team_id INTEGER REFERENCES stats_ai.teams(id),
        match_date TIMESTAMP,
        status VARCHAR(20),
        home_score INTEGER,
        away_score INTEGER,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_matches_date ON stats_ai.matches (match_date)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stats_ai.user_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES stats_ai.users(id) ON DELETE CASCADE,
        language VARCHAR(5) DEFAULT 'en',
        notifications_enabled BOOLEAN DEFAULT true,
        theme VARCHAR(10) DEFAULT 'dark',
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stats_ai.predictions_log (
        id SERIAL PRIMARY KEY,
        fixture_id INTEGER,
        sport VARCHAR(50),
        home_team VARCHAR(100),
        away_team VARCHAR(100),
        league VARCHAR(100),
        confidence INTEGER,
        prediction TEXT,
        rationale TEXT,
        factors JSONB,
        result VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stats_ai.favorite_matches (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES stats_ai.users(id) ON DELETE CASCADE,
        fixture_id VARCHAR(50) NOT NULL,
        sport VARCHAR(50),
        home_team VARCHAR(100),
        away_team VARCHAR(100),
        league VARCHAR(100),
        match_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, fixture_id)
      )
    `);

    // Migrate predictions_log: fixture_id → TEXT (supports nba_123, nhl_456 prefixed IDs)
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
           WHERE table_schema='stats_ai' AND table_name='predictions_log'
             AND column_name='fixture_id' AND data_type='integer'
        ) THEN
          ALTER TABLE stats_ai.predictions_log
            ALTER COLUMN fixture_id TYPE TEXT USING fixture_id::TEXT;
        END IF;
      END $$
    `);
    // Also add UNIQUE constraint if missing (needed for ON CONFLICT)
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
           WHERE conrelid = 'stats_ai.predictions_log'::regclass
             AND conname = 'predictions_log_fixture_id_key'
        ) THEN
          ALTER TABLE stats_ai.predictions_log ADD CONSTRAINT predictions_log_fixture_id_key UNIQUE (fixture_id);
        END IF;
      END $$
    `);

    // Migrate predictions_log: add enriched fields
    await client.query(`ALTER TABLE stats_ai.predictions_log ADD COLUMN IF NOT EXISTS win_prob INTEGER`);
    await client.query(`ALTER TABLE stats_ai.predictions_log ADD COLUMN IF NOT EXISTS draw_prob INTEGER`);
    await client.query(`ALTER TABLE stats_ai.predictions_log ADD COLUMN IF NOT EXISTS lose_prob INTEGER`);
    await client.query(`ALTER TABLE stats_ai.predictions_log ADD COLUMN IF NOT EXISTS risk_level VARCHAR(10)`);
    await client.query(`ALTER TABLE stats_ai.predictions_log ADD COLUMN IF NOT EXISTS value_edge NUMERIC`);
    await client.query(`ALTER TABLE stats_ai.predictions_log ADD COLUMN IF NOT EXISTS match_date TIMESTAMP`);
    // Architect: new Explainable-AI fields
    await client.query(`ALTER TABLE stats_ai.predictions_log ADD COLUMN IF NOT EXISTS key_variable TEXT`);
    await client.query(`ALTER TABLE stats_ai.predictions_log ADD COLUMN IF NOT EXISTS key_variable_severity VARCHAR(12)`);
    await client.query(`ALTER TABLE stats_ai.predictions_log ADD COLUMN IF NOT EXISTS confidence_delta NUMERIC`);

    // Probability time-series history (for Probability Trends chart)
    await client.query(`
      CREATE TABLE IF NOT EXISTS stats_ai.probability_history (
        id SERIAL PRIMARY KEY,
        fixture_id INTEGER NOT NULL,
        captured_at TIMESTAMP NOT NULL DEFAULT NOW(),
        win_prob NUMERIC NOT NULL,
        draw_prob NUMERIC,
        lose_prob NUMERIC,
        note TEXT,
        severity VARCHAR(12)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prob_history_fixture_time
        ON stats_ai.probability_history (fixture_id, captured_at)
    `);

    // Market-consensus snapshots (AI / Expert / Public at a point in time)
    await client.query(`
      CREATE TABLE IF NOT EXISTS stats_ai.market_consensus_snapshots (
        id SERIAL PRIMARY KEY,
        fixture_id INTEGER NOT NULL,
        captured_at TIMESTAMP NOT NULL DEFAULT NOW(),
        ai_forecast NUMERIC,
        expert_aggregator NUMERIC,
        public_expectation NUMERIC
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_consensus_fixture_time
        ON stats_ai.market_consensus_snapshots (fixture_id, captured_at)
    `);

    // Achievements / Streaks (Architect tracker)
    await client.query(`
      CREATE TABLE IF NOT EXISTS stats_ai.achievements (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(100) NOT NULL,
        badge_id VARCHAR(40) NOT NULL,
        level INTEGER DEFAULT 1,
        unlocked_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(device_id, badge_id)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS stats_ai.streaks (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(100) UNIQUE NOT NULL,
        current_streak INTEGER DEFAULT 0,
        best_streak INTEGER DEFAULT 0,
        elite_days INTEGER DEFAULT 0,
        last_hit_at TIMESTAMP
      )
    `);

    // Prediction Tracker tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS stats_ai.user_predictions (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(100) NOT NULL,
        user_id INTEGER REFERENCES stats_ai.users(id),
        fixture_id INTEGER NOT NULL,
        home_team VARCHAR(100),
        away_team VARCHAR(100),
        league VARCHAR(100),
        match_date TIMESTAMP,
        predicted_outcome VARCHAR(20) NOT NULL,
        ai_prediction VARCHAR(20),
        ai_confidence INTEGER,
        actual_result VARCHAR(20),
        is_correct BOOLEAN,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(device_id, fixture_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stats_ai.user_stats (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(100) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES stats_ai.users(id),
        total_predictions INTEGER DEFAULT 0,
        correct_predictions INTEGER DEFAULT 0,
        accuracy_pct NUMERIC(5,2) DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        best_streak INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Migrate triggers table: add new columns if they don't exist
    await client.query(`ALTER TABLE stats_ai.triggers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'`);
    await client.query(`ALTER TABLE stats_ai.triggers ADD COLUMN IF NOT EXISTS push_token TEXT`);
    await client.query(`ALTER TABLE stats_ai.triggers ADD COLUMN IF NOT EXISTS fired_at TIMESTAMP`);

    console.log('[DB] All tables initialized');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
