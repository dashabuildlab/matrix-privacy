/**
 * /api/predictions
 *
 * GET  /              — today's AI predictions from DB
 * GET  /:fixtureId    — single prediction
 * POST /scenario      — quick scenario recalculation (Rain, Player out, etc.)
 */
const { Router } = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { pool } = require('../db');
const { refreshPredictions } = require('../services/predictionsEngine');

const router = Router();
const claude = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';

const SCENARIO_PRESETS = {
  rain:        { label: 'Heavy rain conditions',                 winMod: -6,  drawMod: +4,  riskUp: true  },
  player_out:  { label: 'Key home player injured',               winMod: -18, drawMod: +6,  riskUp: true  },
  high_tempo:  { label: 'High-tempo, open game',                 winMod: +5,  drawMod: -5,  riskUp: false },
  low_tempo:   { label: 'Low-tempo, defensive game',             winMod: -4,  drawMod: +8,  riskUp: false },
  worst_case:  { label: 'Worst case: 2 key players out + rain',  winMod: -28, drawMod: +10, riskUp: true  },
};

/** GET /api/predictions?sport=football|basketball|hockey */
router.get('/', async (req, res) => {
  try {
    const sportFilter = req.query.sport; // optional: 'football', 'basketball', 'hockey'

    const baseQuery = `
      SELECT DISTINCT ON (fixture_id)
             fixture_id, sport, home_team, away_team, league,
             confidence, prediction, rationale, factors, created_at,
             win_prob, draw_prob, lose_prob, risk_level, value_edge, match_date,
             key_variable, key_variable_severity, confidence_delta
      FROM stats_ai.predictions_log
      WHERE created_at > NOW() - INTERVAL '90 days'
        ${sportFilter ? `AND sport = $1` : ''}
      ORDER BY fixture_id, created_at DESC
    `;

    const { rows } = await pool.query(baseQuery, sportFilter ? [sportFilter] : []);

    if (rows.length === 0) {
      try {
        await refreshPredictions();
        const { rows: fresh } = await pool.query(baseQuery, sportFilter ? [sportFilter] : []);
        return res.json(formatPredictions(fresh));
      } catch (e) {
        console.warn('[predictions] On-demand generation failed:', e.message);
        return res.json([]);
      }
    }

    // Sort by confidence for display
    rows.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    res.json(formatPredictions(rows));
  } catch (err) {
    console.error('[predictions]', err);
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

/** GET /api/predictions/:fixtureId */
router.get('/:fixtureId', async (req, res) => {
  try {
    // Support both "123" and "nba_123" / "nhl_456" formats
    const fixtureId = req.params.fixtureId;

    const { rows } = await pool.query(`
      SELECT fixture_id, sport, home_team, away_team, league,
             confidence, prediction, rationale, factors, created_at,
             win_prob, draw_prob, lose_prob, risk_level, value_edge, match_date,
             key_variable, key_variable_severity, confidence_delta
      FROM stats_ai.predictions_log
      WHERE fixture_id = $1
      ORDER BY created_at DESC LIMIT 1
    `, [String(fixtureId)]);

    if (rows.length === 0) return res.status(404).json({ error: 'Prediction not found' });
    res.json(formatPredictions(rows)[0]);
  } catch (err) {
    console.error('[predictions/:id]', err);
    res.status(500).json({ error: 'Failed to fetch prediction' });
  }
});

/**
 * POST /api/predictions/scenario
 * Body: { fixtureId, homeTeam, awayTeam, league, scenario, basePrediction }
 * Returns updated prediction for the given scenario preset.
 */
router.post('/scenario', async (req, res) => {
  try {
    const { fixtureId, homeTeam, awayTeam, league, scenario, basePrediction } = req.body;

    if (!scenario || !SCENARIO_PRESETS[scenario]) {
      return res.status(400).json({ error: `Unknown scenario. Valid: ${Object.keys(SCENARIO_PRESETS).join(', ')}` });
    }

    const preset = SCENARIO_PRESETS[scenario];
    const home = homeTeam || 'Home';
    const away = awayTeam || 'Away';

    // Get base prediction from DB or use client-provided
    let base = basePrediction;
    if (!base && fixtureId) {
      try {
        const { rows } = await pool.query(
          `SELECT confidence, prediction, win_prob, draw_prob, lose_prob
           FROM stats_ai.predictions_log
           WHERE fixture_id = $1
           ORDER BY created_at DESC LIMIT 1`,
          [fixtureId]
        );
        if (rows[0]) base = rows[0];
      } catch (e) { /* skip */ }
    }

    const baseConf = base?.confidence || base?.win_prob || 65;

    // Ask Claude for scenario-adjusted prediction
    const prompt = `You are a sports probability engine.

MATCH: ${home} vs ${away}
LEAGUE: ${league || 'Unknown'}
BASE HOME WIN PROBABILITY: ${baseConf}%
SCENARIO APPLIED: ${preset.label}
ESTIMATED STATISTICAL SHIFT: Win probability changes by approx ${preset.winMod >= 0 ? '+' : ''}${preset.winMod}%, Draw by ${preset.drawMod >= 0 ? '+' : ''}${preset.drawMod}%

Re-analyze and return the adjusted prediction. Return ONLY JSON:
{
  "prediction": "Home win" or "Draw" or "Away win",
  "confidence": integer,
  "win_prob": integer,
  "draw_prob": integer,
  "lose_prob": integer,
  "risk_level": "low" or "medium" or "high",
  "rationale": "One sentence explaining the scenario impact."
}
win_prob + draw_prob + lose_prob must sum to 100.`;

    const msg = await claude.messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    let result;
    try {
      result = JSON.parse(msg.content[0].text);
    } catch (e) {
      // Fallback: apply statistical modifier
      const newConf = Math.max(10, Math.min(90, baseConf + preset.winMod));
      result = {
        prediction: newConf > 50 ? 'Home win' : 'Away win',
        confidence: newConf,
        win_prob: newConf,
        draw_prob: Math.max(5, Math.min(35, (base?.draw_prob || 20) + preset.drawMod)),
        lose_prob: Math.max(5, 100 - newConf - 20),
        risk_level: preset.riskUp ? 'high' : (newConf > 70 ? 'low' : 'medium'),
        rationale: `Under ${preset.label.toLowerCase()} conditions, home win probability shifts significantly.`,
      };
    }

    res.json({ scenario, scenarioLabel: preset.label, ...result });
  } catch (err) {
    console.error('[predictions/scenario]', err);
    res.status(500).json({ error: 'Scenario calculation failed', detail: err.message });
  }
});

/** Format DB rows into frontend-ready objects */
function formatPredictions(rows) {
  return rows.map(r => {
    const factors = (typeof r.factors === 'string' ? JSON.parse(r.factors) : r.factors) || [];
    const confidence = r.confidence || 0;

    // Derive probabilities if missing from DB
    const winProb  = r.win_prob  || confidence;
    const drawProb = r.draw_prob || Math.round((100 - confidence) * 0.38);
    const loseProb = r.lose_prob || (100 - winProb - drawProb);
    const riskLevel = r.risk_level || (confidence > 70 ? 'low' : confidence > 50 ? 'medium' : 'high');

    return {
      id: `fb_${r.fixture_id}`,
      fixtureId: r.fixture_id,
      home: r.home_team,
      away: r.away_team,
      league: r.league,
      sport: r.sport || 'Football',
      confidence,
      prediction: r.prediction,
      momentum: confidence > 70 ? 'High' : confidence > 50 ? 'Medium' : 'Low',
      rationale: r.rationale,
      winProb,
      drawProb,
      loseProb,
      riskLevel,
      probabilityEdge: r.value_edge || null,
      matchDate: r.match_date || null,
      keyVariable: r.key_variable || null,
      keyVariableSeverity: r.key_variable_severity || null,
      confidenceDelta: r.confidence_delta != null ? Number(r.confidence_delta) : null,
      factors: factors.map(f => ({
        tag: f.tag || 'form',
        icon: f.icon || 'psychology',
        title: f.title,
        weight: typeof f.weight === 'number' ? `${f.weight}%` : f.weight,
        desc: f.desc,
        impact: f.impact || 'neutral',
      })),
      createdAt: r.created_at,
    };
  });
}

module.exports = router;
