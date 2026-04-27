/**
 * Cron service — smart scheduling for multi-sport predictions.
 *
 * Data sources (ALL FREE — no API-Sports required):
 *   - Football-Data.org  → football (free, current season)
 *   - balldontlie.io     → NBA basketball (free, no key)
 *   - NHL Stats API      → ice hockey (free, official)
 *   - Claude Haiku       → AI analysis (our own Claude API key)
 *   - demoData           → safety net seed
 *
 * Runs every 6 hours. Individual sources are resilient — if one fails,
 * others continue. Demo data always keeps the UI populated.
 */
const { refreshPredictions } = require('./predictionsEngine');
const { pool } = require('../db');

// Simple stat tracking (no daily limit needed — these are free APIs)
let lastRunAt = null;
let lastResult = null;

/**
 * Start all cron jobs.
 */
function startCronJobs() {
  console.log('[Cron] Starting multi-sport prediction engine...');

  // Initial run after 15 seconds (let DB / server finish startup)
  setTimeout(async () => {
    try {
      lastResult = await refreshPredictions();
      lastRunAt = new Date();
      console.log('[Cron] Initial refresh complete:', lastResult);
    } catch (e) {
      console.error('[Cron] Initial refresh failed:', e.message);
    }
  }, 15000);

  // Every 6 hours: refresh predictions for all sports
  setInterval(async () => {
    try {
      lastResult = await refreshPredictions();
      lastRunAt = new Date();
      console.log('[Cron] Scheduled refresh complete:', lastResult);
    } catch (e) {
      console.error('[Cron] Scheduled refresh failed:', e.message);
    }
  }, 6 * 60 * 60 * 1000);

  console.log('[Cron] Scheduled: multi-sport predictions every 6 hours');
}

/**
 * Get cron status for /api/health endpoint.
 */
function getStatus() {
  return {
    lastRunAt,
    lastResult,
    nextRunIn: lastRunAt
      ? Math.max(0, 6 * 3600 * 1000 - (Date.now() - lastRunAt.getTime()))
      : null,
  };
}

// Legacy compat — some routes still import refreshPredictions from cron.js
module.exports = { startCronJobs, refreshPredictions, getStatus };
