require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server: SocketIO } = require('socket.io');
const { initDB } = require('./db');
const { startCronJobs } = require('./services/cron');
const { startTriggersWorker } = require('./services/triggersWorker');
const { startLiveWorker } = require('./services/liveWorker');
const { startResultChecker } = require('./services/resultChecker');

const chatRouter = require('./routes/chat');
const predictionsRouter = require('./routes/predictions');
const marketsRouter = require('./routes/probabilityInsights');
const marketConsensusRouter = require('./routes/marketConsensus');
const probabilityTrendsRouter = require('./routes/probabilityTrends');
const liveRouter = require('./routes/live');
const matchesRouter = require('./routes/matches');
const triggersRouter = require('./routes/triggers');
const simulatorRouter = require('./routes/simulator');
const authRouter = require('./routes/auth');
const trackerRouter = require('./routes/tracker');

const app = express();
const server = http.createServer(app);
const PORT = process.env.API_PORT || 3003;

// Socket.io — websocket transport only for React Native compatibility
const io = new SocketIO(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

app.use(cors());
app.use(express.json());

// Attach io to req so routes can use it if needed
app.use((req, _res, next) => { req.io = io; next(); });

app.use('/api/auth', authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/predictions', predictionsRouter);
app.use('/api/markets', marketsRouter);
app.use('/api/market-consensus', marketConsensusRouter);
app.use('/api/probability-trends', probabilityTrendsRouter);
app.use('/api/live', liveRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/triggers', triggersRouter);
app.use('/api/simulator', simulatorRouter);
app.use('/api/tracker', trackerRouter);

app.get('/api/health', async (req, res) => {
  try {
    const { getStatus } = require('./services/cron');
    const { pool } = require('./db');
    const { rows } = await pool.query(
      `SELECT sport, COUNT(*)::int AS n FROM stats_ai.predictions_log
        WHERE match_date IS NULL OR match_date > NOW()
        GROUP BY sport ORDER BY n DESC`
    );
    const cronStatus = getStatus();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      dataSources: {
        football: 'Football-Data.org (free)',
        basketball: 'balldontlie.io (free)',
        hockey: 'NHL Stats API (free, official)',
        ai: 'Claude Haiku (own key)',
      },
      upcomingPredictions: rows,
      cron: cronStatus,
    });
  } catch (e) {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), error: e.message });
  }
});

async function start() {
  try {
    await initDB();
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[API] Stats AI server running on port ${PORT}`);
      startCronJobs();
      startTriggersWorker();
      startLiveWorker(io);
      startResultChecker();
    });
  } catch (err) {
    console.error('[API] Failed to start:', err);
    process.exit(1);
  }
}

start();
