/**
 * predictionsEngine — single source for generating + refreshing AI predictions.
 *
 * Pipeline (multi-sport, all FREE sources, no API-Sports needed):
 *   1. Football-Data.org  — football/soccer (free, current season, 12 leagues)
 *   2. balldontlie.io     — NBA basketball (free, no key required)
 *   3. NHL Stats API      — ice hockey (free, official from NHL.com)
 *   4. Claude AI          — turns fixtures into rationale + probabilities
 *   5. demoData           — safety net so UI is never empty
 *
 * Runs on startup and every N hours.
 */
const Anthropic = require('@anthropic-ai/sdk');
const { pool } = require('../db');
const { ensureDemoData } = require('./demoData');
const {
  getUpcomingFixtures: getFBFixtures,
  ping: pingFD,
  LEAGUE_NAMES,
} = require('./footballData');
const { getUpcomingGames: getNBAGames, ping: pingNBA } = require('./nbaData');
const { getUpcomingGames: getNHLGames, ping: pingNHL } = require('./nhlData');

const claude = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';

// Football competitions — covered by Football-Data.org free tier
const FB_COMPETITIONS = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'CL', 'EL'];
const MAX_FIXTURES_PER_COMP = 4;  // don't overload Claude calls
const MAX_NBA_GAMES = 6;
const MAX_NHL_GAMES = 6;

// Sport labels for Claude prompt context
const SPORT_CONTEXT = {
  football: { lang: 'Футбол', factorsLabel: 'футбольний матч', unit: '' },
  basketball: { lang: 'Баскетбол (NBA)', factorsLabel: 'баскетбольний матч NBA', unit: 'очки' },
  hockey: { lang: 'Хокей (NHL)', factorsLabel: 'хокейний матч NHL', unit: 'шайби' },
};

/**
 * Ask Claude for a structured prediction given minimal fixture info.
 * Adapts prompt based on sport type.
 * Always returns a valid object; falls back to heuristic if Claude fails.
 */
async function analyzeFixture(fx) {
  const sport = fx.sport || 'football';
  const ctx = SPORT_CONTEXT[sport] || SPORT_CONTEXT.football;

  const prompt = `Ти — спортивний AI-аналітик. Проаналізуй майбутній ${ctx.factorsLabel} і поверни структурований прогноз.

МАТЧ: ${fx.home} vs ${fx.away}
ЛІГА: ${fx.league}${fx.matchday ? ` (тур ${fx.matchday})` : ''}${fx.stage ? ` — ${fx.stage}` : ''}
ДАТА: ${new Date(fx.matchDate).toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' })}
ВИД СПОРТУ: ${ctx.lang}

Поверни ТІЛЬКИ валідний JSON без markdown / backticks.
Всі текстові поля — УКРАЇНСЬКОЮ.

{
  "prediction": "Home win" | "Draw" | "Away win",
  "confidence": 40..90,
  "win_prob": 5..90,
  "draw_prob": 5..40,
  "lose_prob": 5..90,
  "risk_level": "low" | "medium" | "high",
  "momentum": "High" | "Medium" | "Low",
  "rationale": "2-4 речення українською з конкретними фактами про форму, тактику, травми, контекст турніру.",
  "key_variable": "2-4 слова — ключова тактична або статистична змінна.",
  "key_variable_severity": "info" | "watch" | "critical",
  "confidence_delta": -10..10,
  "factors": [
    {"tag": "form", "icon": "trending-up", "title": "Форма", "weight": 30, "desc": "1 речення укр.", "impact": "positive" | "negative" | "neutral"},
    {"tag": "h2h", "icon": "compare-arrows", "title": "Очні зустрічі", "weight": 25, "desc": "1 речення укр.", "impact": "positive" | "negative" | "neutral"},
    {"tag": "injuries", "icon": "personal-injury", "title": "Травми", "weight": 20, "desc": "1 речення укр.", "impact": "positive" | "negative" | "neutral"},
    {"tag": "motivation", "icon": "emoji-events", "title": "Мотивація", "weight": 15, "desc": "1 речення укр.", "impact": "positive" | "negative" | "neutral"},
    {"tag": "schedule", "icon": "schedule", "title": "Навантаження", "weight": 10, "desc": "1 речення укр.", "impact": "positive" | "negative" | "neutral"}
  ]
}

win_prob + draw_prob + lose_prob ≈ 100.
risk_level: low=conf>70, medium=50-70, high<50.
Без емодзі.`;

  try {
    const msg = await claude.messages.create({
      model: MODEL,
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });
    return JSON.parse(msg.content[0].text);
  } catch (e) {
    console.warn(`[PredictionsEngine] Claude fallback for ${fx.home} vs ${fx.away}:`, e.message);
    return buildHeuristicFallback(fx);
  }
}

/** Heuristic fallback used when Claude is unavailable */
function buildHeuristicFallback(fx) {
  const sport = fx.sport || 'football';
  return {
    prediction: 'Home win',
    confidence: 55,
    win_prob: 45, draw_prob: 28, lose_prob: 27,
    risk_level: 'medium',
    momentum: 'Medium',
    rationale: `Команди ${fx.home} та ${fx.away} зустрічаються у матчі ${fx.league}. AI-аналіз тимчасово недоступний — використано базову модель на основі домашньої переваги.`,
    key_variable: 'Home advantage',
    key_variable_severity: 'info',
    confidence_delta: 0,
    factors: [
      { tag: 'form',       icon: 'trending-up',     title: 'Форма',         weight: 30, desc: 'Форма обох команд у поточному сезоні.',  impact: 'neutral' },
      { tag: 'h2h',        icon: 'compare-arrows',  title: 'Очні зустрічі', weight: 25, desc: 'Історія очних матчів.',                   impact: 'neutral' },
      { tag: 'injuries',   icon: 'personal-injury', title: 'Травми',        weight: 20, desc: 'Склади стабільні, ключових травм немає.', impact: 'neutral' },
      { tag: 'motivation', icon: 'emoji-events',    title: 'Мотивація',     weight: 15, desc: 'Турнірна вага матчу для обох команд.',    impact: 'neutral' },
      { tag: 'schedule',   icon: 'schedule',        title: 'Навантаження',  weight: 10, desc: 'Стандартне розкладове навантаження.',     impact: 'neutral' },
    ],
  };
}

/**
 * Upsert a prediction row. Safe to call repeatedly —
 * UPDATE on conflict refreshes AI analysis but keeps result tracking intact.
 */
async function upsertPrediction(fx, ai) {
  const sport = fx.sport || 'football';
  await pool.query(
    `INSERT INTO stats_ai.predictions_log
       (fixture_id, sport, home_team, away_team, league, confidence, prediction, rationale, factors,
        win_prob, draw_prob, lose_prob, risk_level, match_date,
        key_variable, key_variable_severity, confidence_delta)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     ON CONFLICT (fixture_id) DO UPDATE SET
       confidence = EXCLUDED.confidence,
       prediction = EXCLUDED.prediction,
       rationale  = EXCLUDED.rationale,
       factors    = EXCLUDED.factors,
       win_prob   = EXCLUDED.win_prob,
       draw_prob  = EXCLUDED.draw_prob,
       lose_prob  = EXCLUDED.lose_prob,
       risk_level = EXCLUDED.risk_level,
       match_date = EXCLUDED.match_date,
       key_variable = EXCLUDED.key_variable,
       key_variable_severity = EXCLUDED.key_variable_severity,
       confidence_delta = EXCLUDED.confidence_delta`,
    [
      fx.fixtureId, sport, fx.home, fx.away, fx.league,
      ai.confidence, ai.prediction, ai.rationale,
      JSON.stringify(ai.factors),
      ai.win_prob, ai.draw_prob, ai.lose_prob, ai.risk_level, fx.matchDate,
      ai.key_variable || null,
      ai.key_variable_severity || null,
      ai.confidence_delta != null ? ai.confidence_delta : null,
    ],
  );
}

/**
 * Check if a fixture was analyzed in the last 12h (skip if so).
 */
async function isRecentlyAnalyzed(fixtureId) {
  const { rows } = await pool.query(
    `SELECT created_at FROM stats_ai.predictions_log
      WHERE fixture_id = $1
      ORDER BY created_at DESC LIMIT 1`,
    [String(fixtureId)],
  );
  return rows[0] && Date.now() - new Date(rows[0].created_at).getTime() < 12 * 3600 * 1000;
}

/**
 * Process a list of fixtures: skip recently analyzed, call Claude, upsert.
 * Returns { analyzed, skipped }.
 */
async function processFixtures(fixtures, label) {
  let analyzed = 0;
  let skipped = 0;

  for (const fx of fixtures) {
    try {
      if (await isRecentlyAnalyzed(fx.fixtureId)) {
        skipped++;
        continue;
      }
      const ai = await analyzeFixture(fx);
      await upsertPrediction(fx, ai);
      analyzed++;
      console.log(`[PredictionsEngine]   ✓ [${label}] ${fx.home} vs ${fx.away} → ${ai.prediction} ${ai.confidence}%`);
    } catch (err) {
      console.warn(`[PredictionsEngine] Error processing ${fx.home} vs ${fx.away}:`, err.message);
    }
  }

  return { analyzed, skipped };
}

/**
 * Main refresh cycle — pulls upcoming fixtures from ALL free sources and
 * generates / updates predictions.
 *
 * Sources:
 *   - Football-Data.org  (football)
 *   - balldontlie.io     (NBA)
 *   - NHL Stats API      (NHL)
 *
 * Safe to call even when all external APIs are down — demo data keeps UI populated.
 */
async function refreshPredictions() {
  console.log('[PredictionsEngine] Refresh cycle start');

  // Always ensure demo safety net first
  await ensureDemoData();

  let totalAnalyzed = 0;
  let totalSkipped = 0;

  // ─── 1. FOOTBALL (Football-Data.org) ────────────────────────────────────────
  const fdStatus = await pingFD();
  if (fdStatus.ok) {
    console.log(`[PredictionsEngine] Football-Data.org OK (${fdStatus.competitions} competitions)`);

    for (const compCode of FB_COMPETITIONS) {
      try {
        const fixtures = await getFBFixtures(compCode, { daysAhead: 10 });
        if (!fixtures.length) continue;

        const picks = fixtures.slice(0, MAX_FIXTURES_PER_COMP).map(fx => ({ ...fx, sport: 'football' }));
        console.log(`[PredictionsEngine] Football ${compCode}: ${fixtures.length} fixtures → analyzing ${picks.length}`);

        const { analyzed, skipped } = await processFixtures(picks, compCode);
        totalAnalyzed += analyzed;
        totalSkipped += skipped;
      } catch (err) {
        console.warn(`[PredictionsEngine] Football ${compCode} failed:`, err.message);
      }
    }
  } else {
    console.warn(`[PredictionsEngine] Football-Data.org unavailable: ${fdStatus.reason}`);
  }

  // ─── 2. NBA (balldontlie.io) ─────────────────────────────────────────────────
  const nbaStatus = await pingNBA();
  if (nbaStatus.ok) {
    console.log('[PredictionsEngine] NBA (balldontlie.io) OK');
    try {
      const games = await getNBAGames({ daysAhead: 7 });
      const picks = games.slice(0, MAX_NBA_GAMES);
      console.log(`[PredictionsEngine] NBA: ${games.length} games → analyzing ${picks.length}`);

      const { analyzed, skipped } = await processFixtures(picks, 'NBA');
      totalAnalyzed += analyzed;
      totalSkipped += skipped;
    } catch (err) {
      console.warn('[PredictionsEngine] NBA failed:', err.message);
    }
  } else {
    console.warn(`[PredictionsEngine] NBA unavailable: ${nbaStatus.reason}`);
  }

  // ─── 3. NHL (official NHL Stats API) ─────────────────────────────────────────
  const nhlStatus = await pingNHL();
  if (nhlStatus.ok) {
    console.log('[PredictionsEngine] NHL (api-web.nhle.com) OK');
    try {
      const games = await getNHLGames({ daysAhead: 7 });
      const picks = games.slice(0, MAX_NHL_GAMES);
      console.log(`[PredictionsEngine] NHL: ${games.length} games → analyzing ${picks.length}`);

      const { analyzed, skipped } = await processFixtures(picks, 'NHL');
      totalAnalyzed += analyzed;
      totalSkipped += skipped;
    } catch (err) {
      console.warn('[PredictionsEngine] NHL failed:', err.message);
    }
  } else {
    console.warn(`[PredictionsEngine] NHL unavailable: ${nhlStatus.reason}`);
  }

  console.log(`[PredictionsEngine] Refresh done — ${totalAnalyzed} new/updated, ${totalSkipped} recent (skipped)`);
  return {
    sources: { football: fdStatus.ok, nba: nbaStatus.ok, nhl: nhlStatus.ok },
    fixtures: totalAnalyzed,
    skipped: totalSkipped,
  };
}

module.exports = { refreshPredictions, analyzeFixture };
