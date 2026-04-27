/**
 * NHL Data Client — NHL Stats API (completely free, official from NHL.com)
 *
 * No API key required. Official NHL public API.
 * Docs: https://gitlab.com/dword4/nhlapi / https://api-web.nhle.com
 *
 * New NHL API (v2, 2023+): https://api-web.nhle.com/v1/
 * Old API is deprecated — this uses the new one.
 */

const BASE = 'https://api-web.nhle.com/v1';

const cache = new Map();
function getCached(url, ttlMs) {
  const e = cache.get(url);
  if (e && Date.now() - e.t < ttlMs) return e.data;
  return null;
}
function setCached(url, data) {
  cache.set(url, { t: Date.now(), data });
}

async function fetchNHL(path, { ttlMs = 10 * 60 * 1000 } = {}) {
  const url = `${BASE}${path}`;
  const cached = getCached(url, ttlMs);
  if (cached) return { ok: true, data: cached, cached: true };

  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.warn(`[NHL] ${path} failed: HTTP ${res.status}`);
      return { ok: false, error: `HTTP ${res.status}`, data: null };
    }

    setCached(url, data);
    return { ok: true, data };
  } catch (err) {
    console.warn(`[NHL] ${path} error: ${err.message}`);
    return { ok: false, error: err.message, data: null };
  }
}

/**
 * Get the current/upcoming NHL schedule for the next N days.
 */
async function getUpcomingGames({ daysAhead = 7 } = {}) {
  const dateFrom = new Date().toISOString().slice(0, 10);
  const dateTo = new Date(Date.now() + daysAhead * 86400 * 1000).toISOString().slice(0, 10);

  // NHL schedule endpoint: /schedule/YYYY-MM-DD
  const res = await fetchNHL(`/schedule/${dateFrom}`, { ttlMs: 30 * 60 * 1000 });
  if (!res.ok || !res.data) return [];

  const allGames = [];

  // NHL API returns gameWeek array
  const gameWeek = res.data.gameWeek || [];
  for (const day of gameWeek) {
    if (day.date > dateTo) break;

    for (const g of (day.games || [])) {
      // gameState: FUT = future, PRE = pre-game, LIVE = in-play, FINAL = done
      if (g.gameState === 'FINAL' || g.gameState === 'OFF') continue;

      allGames.push({
        fixtureId: `nhl_${g.id}`,
        sport: 'hockey',
        competition: 'NHL',
        league: 'NHL',
        season: g.season || null,
        matchDate: g.startTimeUTC || `${day.date}T00:00:00Z`,
        status: g.gameState === 'LIVE' ? 'IN_PLAY' : 'SCHEDULED',
        matchday: null,
        stage: g.gameType === 3 ? 'Playoffs' : (g.gameType === 2 ? 'Regular Season' : null),
        home: g.homeTeam?.placeName?.default
          ? `${g.homeTeam.placeName.default} ${g.homeTeam.commonName?.default || ''}`
          : (g.homeTeam?.name?.default || 'TBD'),
        homeShort: g.homeTeam?.abbrev || null,
        homeCrest: g.homeTeam?.logo || null,
        away: g.awayTeam?.placeName?.default
          ? `${g.awayTeam.placeName.default} ${g.awayTeam.commonName?.default || ''}`
          : (g.awayTeam?.name?.default || 'TBD'),
        awayShort: g.awayTeam?.abbrev || null,
        awayCrest: g.awayTeam?.logo || null,
        venue: g.venue?.default || null,
        homeScore: g.homeTeam?.score ?? null,
        awayScore: g.awayTeam?.score ?? null,
      });
    }
  }

  return allGames;
}

/** Verify NHL API is reachable */
async function ping() {
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetchNHL(`/schedule/${today}`, { ttlMs: 60 * 60 * 1000 });
  if (!res.ok) return { ok: false, reason: res.error };
  return { ok: true, source: 'api-web.nhle.com' };
}

module.exports = { getUpcomingGames, ping };
