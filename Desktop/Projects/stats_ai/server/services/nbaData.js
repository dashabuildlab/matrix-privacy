/**
 * NBA Data Client — balldontlie.io (free, no key required)
 *
 * Free tier: unlimited requests, current season data
 * Docs: https://www.balldontlie.io/
 *
 * Provides: teams, players, games (scores, dates, status)
 * Does NOT provide: odds, lineups, injuries (need paid tier)
 */

const BASE = 'https://api.balldontlie.io/v1';
const API_KEY = process.env.BALLDONTLIE_API_KEY || ''; // optional — free without key too

// In-memory cache (same pattern as footballData.js)
const cache = new Map();
function getCached(url, ttlMs) {
  const e = cache.get(url);
  if (e && Date.now() - e.t < ttlMs) return e.data;
  return null;
}
function setCached(url, data) {
  cache.set(url, { t: Date.now(), data });
}

async function fetchBDL(path, { ttlMs = 10 * 60 * 1000 } = {}) {
  const url = `${BASE}${path}`;
  const cached = getCached(url, ttlMs);
  if (cached) return { ok: true, data: cached, cached: true };

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (API_KEY) headers['Authorization'] = API_KEY;

    const res = await fetch(url, { headers });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = data?.error || `HTTP ${res.status}`;
      console.warn(`[NBA] ${path} failed: ${msg}`);
      return { ok: false, error: msg, data: null };
    }

    setCached(url, data);
    return { ok: true, data };
  } catch (err) {
    console.warn(`[NBA] ${path} error: ${err.message}`);
    return { ok: false, error: err.message, data: null };
  }
}

/**
 * Get upcoming NBA games in the next N days.
 * Returns normalized fixture objects matching predictionsEngine format.
 */
async function getUpcomingGames({ daysAhead = 7 } = {}) {
  const dates = [];
  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(Date.now() + i * 86400 * 1000);
    dates.push(d.toISOString().slice(0, 10));
  }

  const allGames = [];
  // Fetch in batches of 3 dates to avoid too many calls
  for (let i = 0; i < dates.length; i += 3) {
    const batch = dates.slice(i, i + 3);
    const params = batch.map(d => `dates[]=${d}`).join('&');
    const res = await fetchBDL(`/games?${params}&per_page=30`, { ttlMs: 30 * 60 * 1000 });

    if (!res.ok || !res.data?.data) continue;

    for (const g of res.data.data) {
      // Only upcoming (not started or finished)
      if (g.status !== 'scheduled' && !g.status?.includes('pm') && !g.status?.includes('ET')) continue;

      allGames.push({
        fixtureId: `nba_${g.id}`,
        sport: 'basketball',
        competition: 'NBA',
        league: 'NBA',
        season: g.season,
        matchDate: g.date,
        status: 'SCHEDULED',
        matchday: null,
        stage: null,
        home: g.home_team?.full_name || g.home_team?.name || 'TBD',
        homeShort: g.home_team?.abbreviation || null,
        homeCrest: null,
        away: g.visitor_team?.full_name || g.visitor_team?.name || 'TBD',
        awayShort: g.visitor_team?.abbreviation || null,
        awayCrest: null,
        venue: g.home_team?.city ? `${g.home_team.city} Arena` : null,
        homeScore: g.home_team_score || null,
        awayScore: g.visitor_team_score || null,
      });
    }

    // Small delay to respect rate limits
    if (i + 3 < dates.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return allGames;
}

/** Verify the API is reachable */
async function ping() {
  const res = await fetchBDL('/teams?per_page=1', { ttlMs: 60 * 60 * 1000 });
  if (!res.ok) return { ok: false, reason: res.error };
  return { ok: true, source: 'balldontlie.io' };
}

module.exports = { getUpcomingGames, ping };
