/**
 * /api/matches — upcoming & live fixtures from FREE data sources.
 *
 * Sources (no API-Sports required):
 *   GET /upcoming → DB-first (predictions_log) — always works
 *   GET /         → live enrichment from:
 *                     Football-Data.org (football)
 *                     balldontlie.io    (NBA)
 *                     NHL Stats API     (NHL)
 *                   Falls back to DB if sources unreachable
 */
const { Router } = require('express');
const { pool } = require('../db');
const { getLiveFixtures, getUpcomingFixtures } = require('../services/footballData');
const { getUpcomingGames: getNBAGames } = require('../services/nbaData');
const { getUpcomingGames: getNHLGames } = require('../services/nhlData');

const router = Router();

/**
 * GET /api/matches/upcoming — matches from DB (always available).
 * Returns upcoming matches from predictions_log (AI-enriched) + matches table.
 */
router.get('/upcoming', async (req, res) => {
  try {
    const sportFilter = req.query.sport; // optional: 'football', 'basketball', 'hockey'

    const { rows: predictions } = await pool.query(`
      SELECT DISTINCT ON (fixture_id)
             fixture_id, home_team, away_team, league, sport,
             confidence, prediction, match_date, win_prob, draw_prob, lose_prob, risk_level,
             key_variable, key_variable_severity, confidence_delta
      FROM stats_ai.predictions_log
      WHERE (match_date IS NULL OR match_date > NOW() - INTERVAL '3 hours')
        ${sportFilter ? `AND sport = '${sportFilter.replace(/'/g, "''")}'` : ''}
      ORDER BY fixture_id, created_at DESC
    `);

    const seen = new Set();
    const results = [];

    for (const p of predictions) {
      seen.add(String(p.fixture_id));
      const matchTs = p.match_date ? new Date(p.match_date).getTime() : null;
      const isLive = matchTs && matchTs < Date.now() && matchTs > Date.now() - 3 * 60 * 60 * 1000;

      results.push({
        id: `pred_${p.fixture_id}`,
        fixtureId: p.fixture_id,
        home: p.home_team,
        away: p.away_team,
        league: p.league,
        sport: p.sport || 'football',
        confidence: p.confidence,
        prediction: p.prediction,
        winProb: p.win_prob,
        drawProb: p.draw_prob,
        loseProb: p.lose_prob,
        riskLevel: p.risk_level,
        keyVariable: p.key_variable || null,
        keyVariableSeverity: p.key_variable_severity || null,
        confidenceDelta: p.confidence_delta != null ? Number(p.confidence_delta) : null,
        matchDate: p.match_date,
        date: p.match_date,
        score: null,
        isLive: !!isLive,
        hasPrediction: true,
      });
    }

    // Optionally enrich from matches table
    const { rows: dbMatches } = await pool.query(`
      SELECT m.api_fixture_id,
             h.name as home_team, a.name as away_team,
             l.name as league, m.match_date, m.status,
             m.home_score, m.away_score
      FROM stats_ai.matches m
      LEFT JOIN stats_ai.teams h ON m.home_team_id = h.id
      LEFT JOIN stats_ai.teams a ON m.away_team_id = a.id
      LEFT JOIN stats_ai.leagues l ON m.league_id = l.id
      WHERE m.match_date > NOW() - INTERVAL '3 hours'
      ORDER BY m.match_date ASC
      LIMIT 50
    `);

    for (const m of dbMatches) {
      if (seen.has(String(m.api_fixture_id))) continue;
      const isLive = ['1H', '2H', 'HT', 'ET'].includes(m.status);
      results.push({
        id: `db_${m.api_fixture_id}`,
        fixtureId: m.api_fixture_id,
        home: m.home_team,
        away: m.away_team,
        league: m.league,
        sport: 'football',
        confidence: null,
        prediction: null,
        matchDate: m.match_date,
        date: m.match_date,
        score: m.home_score !== null ? `${m.home_score}-${m.away_score}` : null,
        isLive,
        hasPrediction: false,
      });
    }

    // Sort: live first, then by date, then by confidence
    results.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      if (a.date && b.date) return new Date(a.date).getTime() - new Date(b.date).getTime();
      return (b.confidence || 0) - (a.confidence || 0);
    });

    res.json(results);
  } catch (err) {
    console.error('[matches/upcoming]', err);
    res.status(500).json({ error: 'Failed to fetch upcoming matches' });
  }
});

/**
 * GET /api/matches — today/upcoming matches from live free sources.
 * Falls back to predictions_log if sources are unreachable.
 */
router.get('/', async (req, res) => {
  try {
    const { sport, live: liveOnly } = req.query;
    const results = [];

    // ─── Football (Football-Data.org) ────────────────────────────────────────
    if (!sport || sport === 'football') {
      try {
        let fbFixtures = [];
        if (liveOnly) {
          fbFixtures = await getLiveFixtures();
        } else {
          // Load from multiple competitions
          const comps = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'CL', 'EL'];
          const promises = comps.map(c => getUpcomingFixtures(c, { daysAhead: 3 }).catch(() => []));
          const batches = await Promise.all(promises);
          fbFixtures = batches.flat().slice(0, 30);
        }

        for (const f of fbFixtures) {
          results.push({
            id: `fb_${f.fixtureId}`,
            fixtureId: String(f.fixtureId),
            sport: 'football',
            category: 'Футбол',
            home: f.home,
            away: f.away,
            homeLogo: f.homeCrest || null,
            awayLogo: f.awayCrest || null,
            score: f.homeScore !== null ? `${f.homeScore}-${f.awayScore}` : null,
            status: f.status,
            matchDate: f.matchDate,
            date: f.matchDate,
            league: f.league,
            matchday: f.matchday || null,
            isLive: f.status === 'IN_PLAY' || f.status === 'PAUSED',
          });
        }
      } catch (e) {
        console.warn('[matches] Football fetch failed:', e.message);
      }
    }

    // ─── NBA (balldontlie.io) ─────────────────────────────────────────────────
    if (!sport || sport === 'basketball') {
      try {
        const games = await getNBAGames({ daysAhead: liveOnly ? 1 : 3 });
        for (const g of games.slice(0, 15)) {
          results.push({
            id: String(g.fixtureId),
            fixtureId: String(g.fixtureId),
            sport: 'basketball',
            category: 'Баскетбол',
            home: g.home,
            away: g.away,
            homeLogo: null,
            awayLogo: null,
            score: g.homeScore !== null ? `${g.homeScore}-${g.awayScore}` : null,
            status: g.status,
            matchDate: g.matchDate,
            date: g.matchDate,
            league: 'NBA',
            isLive: g.status === 'IN_PLAY',
          });
        }
      } catch (e) {
        console.warn('[matches] NBA fetch failed:', e.message);
      }
    }

    // ─── NHL (official NHL API) ───────────────────────────────────────────────
    if (!sport || sport === 'hockey') {
      try {
        const games = await getNHLGames({ daysAhead: liveOnly ? 1 : 3 });
        for (const g of games.slice(0, 15)) {
          results.push({
            id: String(g.fixtureId),
            fixtureId: String(g.fixtureId),
            sport: 'hockey',
            category: 'Хокей',
            home: g.home,
            away: g.away,
            homeLogo: g.homeCrest || null,
            awayLogo: g.awayCrest || null,
            score: g.homeScore !== null ? `${g.homeScore}-${g.awayScore}` : null,
            status: g.status,
            matchDate: g.matchDate,
            date: g.matchDate,
            league: 'NHL',
            venue: g.venue || null,
            stage: g.stage || null,
            isLive: g.status === 'IN_PLAY',
          });
        }
      } catch (e) {
        console.warn('[matches] NHL fetch failed:', e.message);
      }
    }

    // If nothing from live sources, fall back to DB predictions
    if (results.length === 0) {
      console.log('[matches] Live sources empty — falling back to DB');
      const { rows } = await pool.query(`
        SELECT DISTINCT ON (fixture_id)
               fixture_id, home_team, away_team, league, sport, match_date,
               confidence, prediction, win_prob, draw_prob, lose_prob, risk_level
        FROM stats_ai.predictions_log
        WHERE match_date IS NULL OR match_date > NOW() - INTERVAL '3 hours'
        ORDER BY fixture_id, created_at DESC
        LIMIT 30
      `);
      for (const r of rows) {
        results.push({
          id: `pred_${r.fixture_id}`,
          fixtureId: String(r.fixture_id),
          sport: r.sport || 'football',
          category: r.sport === 'basketball' ? 'Баскетбол' : r.sport === 'hockey' ? 'Хокей' : 'Футбол',
          home: r.home_team,
          away: r.away_team,
          matchDate: r.match_date,
          date: r.match_date,
          league: r.league,
          confidence: r.confidence,
          prediction: r.prediction,
          winProb: r.win_prob,
          drawProb: r.draw_prob,
          loseProb: r.lose_prob,
          riskLevel: r.risk_level,
          isLive: false,
          hasPrediction: true,
        });
      }
    }

    // Sort: live first, then by date
    results.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      if (a.date && b.date) return new Date(a.date).getTime() - new Date(b.date).getTime();
      return 0;
    });

    res.json(results);
  } catch (err) {
    console.error('[matches]', err);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

/** GET /api/matches/:id/prediction — fetch prediction from DB for a fixture */
router.get('/:id/prediction', async (req, res) => {
  try {
    const fixtureId = req.params.id.replace(/^(fb|pred|db|nba|nhl)_/, '');
    const { rows } = await pool.query(
      `SELECT fixture_id, home_team, away_team, league, sport,
              confidence, prediction, rationale, factors, match_date,
              win_prob, draw_prob, lose_prob, risk_level,
              key_variable, key_variable_severity, confidence_delta
       FROM stats_ai.predictions_log
       WHERE fixture_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [fixtureId],
    );

    if (!rows[0]) return res.json({ available: false });

    const r = rows[0];
    const factors = (typeof r.factors === 'string' ? JSON.parse(r.factors) : r.factors) || [];
    res.json({
      available: true,
      prediction: r.prediction,
      confidence: r.confidence,
      rationale: r.rationale,
      winProb: r.win_prob,
      drawProb: r.draw_prob,
      loseProb: r.lose_prob,
      riskLevel: r.risk_level,
      keyVariable: r.key_variable,
      keyVariableSeverity: r.key_variable_severity,
      confidenceDelta: r.confidence_delta,
      factors,
    });
  } catch (err) {
    console.error('[matches/:id/prediction]', err);
    res.status(500).json({ error: 'Failed to fetch prediction' });
  }
});

module.exports = router;
