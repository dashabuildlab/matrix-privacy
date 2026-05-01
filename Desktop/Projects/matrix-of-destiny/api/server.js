const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const admin = require('firebase-admin');
const multer = require('multer');
const path = require('path');

// ── Firebase Admin init ──────────────────────────────────────────────────────
const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const app = express();
app.use(cors()); // allow all origins — API key stays server-side, no secret exposed
app.use(express.json({ limit: '5mb' }));

// ── Multer for audio upload (in-memory, 25 MB cap, matches ElevenLabs limit) ──
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// ── Auth middleware — verifies Firebase ID token ─────────────────────────────
async function verifyToken(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(auth.split('Bearer ')[1]);
    req.uid = decoded.uid;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Health check
app.get('/health', (_, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Pull full state for a user
app.get('/api/sync/:userId', verifyToken, async (req, res) => {
  if (req.uid !== req.params.userId) return res.status(403).json({ error: 'Forbidden' });
  try {
    const r = await pool.query(
      'SELECT state FROM user_sync WHERE user_id = $1',
      [req.params.userId]
    );
    res.json({ state: r.rows[0]?.state ?? null });
  } catch (e) {
    console.error('GET /api/sync error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Push (upsert) full state for a user
app.post('/api/sync/:userId', verifyToken, async (req, res) => {
  if (req.uid !== req.params.userId) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { state } = req.body;
    if (!state) return res.status(400).json({ error: 'state required' });
    await pool.query(
      `INSERT INTO user_sync (user_id, state, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (user_id)
       DO UPDATE SET state = $2, updated_at = now()`,
      [req.params.userId, JSON.stringify(state)]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('POST /api/sync error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── ElevenLabs Speech-to-Text proxy ──
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_STT_URL = 'https://api.elevenlabs.io/v1/speech-to-text';
console.log('ELEVENLABS_API_KEY present:', !!ELEVENLABS_API_KEY, ELEVENLABS_API_KEY ? `(starts with ${ELEVENLABS_API_KEY.slice(0, 10)}...)` : '(MISSING — STT will return 500)');

app.post('/api/speech-to-text', verifyToken, audioUpload.single('audio'), async (req, res) => {
  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'audio file required (multipart field name: "audio")' });
  }

  try {
    const form = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/m4a' });
    form.append('file', blob, req.file.originalname || 'audio.m4a');
    // Scribe v1 is the current ElevenLabs STT model — supports 99 languages incl. uk & en
    form.append('model_id', 'scribe_v1');
    if (req.body?.language_code) form.append('language_code', req.body.language_code);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    console.log(`[STT] → ElevenLabs (${(req.file.size / 1024).toFixed(1)} KB, ${req.file.mimetype || 'n/a'})`);
    const response = await fetch(ELEVENLABS_STT_URL, {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
      body: form,
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn(`[STT] ElevenLabs HTTP ${response.status}:`, JSON.stringify(data).slice(0, 300));
      return res.status(response.status).json({ error: data?.detail?.message || data?.detail || data?.error || `ElevenLabs HTTP ${response.status}` });
    }
    console.log(`[STT] ✓ got ${data.text?.length ?? 0} chars (lang=${data.language_code ?? '?'})`);
    res.json({ text: data.text ?? '', language_code: data.language_code });
  } catch (e) {
    console.error('[STT] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── ElevenLabs Text-to-Speech proxy ──
// POST { text, voice_id? } → audio/mpeg bytes (client saves + plays)
app.post('/api/text-to-speech', verifyToken, async (req, res) => {
  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' });
  }
  const { text, voice_id } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text (string) required' });
  }
  const voiceId = voice_id || '21m00Tcm4TlvDq8ikWAM'; // Rachel (multilingual_v2)

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text.slice(0, 5000), // safety cap
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
        signal: ctrl.signal,
      }
    );
    clearTimeout(timer);

    if (!upstream.ok) {
      const errBody = await upstream.text().catch(() => '');
      console.warn('[TTS] upstream error', upstream.status, errBody.slice(0, 200));
      return res.status(upstream.status).json({ error: errBody || `HTTP ${upstream.status}` });
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (e) {
    console.error('[TTS] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Claude AI proxy (keeps API key on server, not in client bundle) ──
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
console.log('CLAUDE_API_KEY present:', !!CLAUDE_API_KEY, CLAUDE_API_KEY ? `(starts with ${CLAUDE_API_KEY.slice(0, 10)}...)` : '(MISSING!)');
const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';

// Call Anthropic with a per-request timeout and optional retry on overload
async function callAnthropic(body, timeoutMs = 90000, attempt = 1) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => {
    console.warn(`[Claude] attempt ${attempt} — timed out after ${timeoutMs}ms`);
    ctrl.abort();
  }, timeoutMs);
  try {
    console.log(`[Claude] attempt ${attempt} → model=${body.model} max_tokens=${body.max_tokens}`);
    const response = await fetch(CLAUDE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await response.json();
    console.log(`[Claude] attempt ${attempt} ← HTTP ${response.status}`);
    if (response.status !== 200) {
      console.error(`[Claude] error body:`, JSON.stringify(data));
    }
    // Retry on overload (529), server error (500), or bad gateway (502)
    if ((response.status === 529 || response.status === 500 || response.status === 502) && attempt < 3) {
      const delay = attempt * 5000;
      console.warn(`[Claude] retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      return callAnthropic(body, timeoutMs, attempt + 1);
    }
    return { status: response.status, data };
  } catch (err) {
    console.error(`[Claude] attempt ${attempt} threw:`, err.name, err.message);
    // Retry on abort (timeout) or network errors
    if (attempt < 3) {
      const delay = attempt * 5000;
      console.warn(`[Claude] retrying after error in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      return callAnthropic(body, timeoutMs, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

app.post('/api/claude', verifyToken, async (req, res) => {
  try {
    const { model, max_tokens, system, messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages required' });
    }
    const { status, data } = await callAnthropic({
      model: model || 'claude-haiku-4-5',
      max_tokens: Math.min(max_tokens || 900, 2000),
      system: system || '',
      messages,
    });
    if (status !== 200) {
      return res.status(status).json(data);
    }
    res.json(data);
  } catch (e) {
    console.error('[Claude] handler error:', e.name, e.message);
    res.status(500).json({ error: 'AI service temporarily unavailable', detail: e.message });
  }
});

// ── Claude streaming proxy (Server-Sent Events) ──
// Forwards Anthropic's streaming response chunks as SSE events to the client.
// Client reads `data: {...}` lines and concatenates `delta.text` to render token-by-token.
app.post('/api/claude/stream', verifyToken, async (req, res) => {
  const { model, max_tokens, system, messages } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering for streaming
  res.flushHeaders?.();

  const ctrl = new AbortController();
  const timeoutMs = 120000;
  const timer = setTimeout(() => { console.warn('[Claude-stream] aborted after 120s'); ctrl.abort(); }, timeoutMs);
  // NOTE: do NOT attach `req/res.on('close')` to trigger abort — Express/Node fires these
  // in ways that are unreliable behind nginx keepalive and caused premature aborts.
  // The 120s timeout + upstream's own timeouts are sufficient.

  try {
    const upstream = await fetch(CLAUDE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-haiku-4-5',
        max_tokens: Math.min(max_tokens || 900, 2000),
        system: system || '',
        messages,
        stream: true,
      }),
      signal: ctrl.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => '');
      console.warn('[Claude-stream] upstream error', upstream.status, errText);
      res.write(`event: error\ndata: ${JSON.stringify({ status: upstream.status, detail: errText })}\n\n`);
      return res.end();
    }

    // Anthropic sends SSE: `event: content_block_delta\ndata: {...}\n\n`
    // Forward raw lines as-is — client already parses SSE.
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
    res.end();
  } catch (err) {
    console.error('[Claude-stream] error:', err.name, err.message);
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  } finally {
    clearTimeout(timer);
  }
});

// ── RevenueCat Webhook ──
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
app.post('/api/revenuecat-webhook', async (req, res) => {
  // Verify authorization
  const auth = req.headers['authorization'];
  if (WEBHOOK_SECRET && auth !== WEBHOOK_SECRET) {
    console.warn('[RevenueCat] Unauthorized webhook attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const event = req.body;
    const type = event?.event?.type;
    const appUserId = event?.event?.app_user_id;
    const productId = event?.event?.product_id;
    const expirationAt = event?.event?.expiration_at_ms;

    console.log(`[RevenueCat] ${type} | user=${appUserId} | product=${productId}`);

    // Update user premium status in DB based on event type
    if (appUserId) {
      const isPremium = [
        'INITIAL_PURCHASE',
        'RENEWAL',
        'PRODUCT_CHANGE',
        'UNCANCELLATION',
      ].includes(type);

      const isExpired = [
        'EXPIRATION',
        'BILLING_ISSUE',
      ].includes(type);

      const isCancelled = type === 'CANCELLATION';

      if (isPremium || isExpired) {
        // Update user sync state with premium status
        try {
          const existing = await pool.query('SELECT state FROM user_sync WHERE user_id = $1', [appUserId]);
          if (existing.rows[0]) {
            const state = existing.rows[0].state || {};
            state.isPremium = isPremium;
            state.premiumPlan = isPremium ? (productId || null) : null;
            if (isExpired) {
              state.isPremium = false;
              state.premiumPlan = null;
            }
            await pool.query(
              'UPDATE user_sync SET state = $1, updated_at = now() WHERE user_id = $2',
              [JSON.stringify(state), appUserId]
            );
            console.log(`[RevenueCat] Updated user ${appUserId}: isPremium=${state.isPremium}`);
          }
        } catch (dbErr) {
          console.error('[RevenueCat] DB update error:', dbErr.message);
        }
      }

      if (isCancelled) {
        console.log(`[RevenueCat] User ${appUserId} cancelled. Will expire at ${expirationAt ? new Date(expirationAt).toISOString() : 'unknown'}`);
      }
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[RevenueCat] Webhook error:', e.message);
    res.status(200).json({ ok: true }); // Always return 200 to prevent retries
  }
});

// ── Privacy Policy ──
app.get('/privacy', (_, res) => {
  res.send(`<!DOCTYPE html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Політика конфіденційності — Matrix of Destiny</title>
<style>body{font-family:system-ui;max-width:700px;margin:0 auto;padding:20px;background:#0D0B1E;color:#e0e0e0}h1{color:#F5C542}h2{color:#A78BFA;margin-top:28px}p,li{line-height:1.7;font-size:15px}</style></head><body>
<h1>Політика конфіденційності</h1><p>Дата набуття чинності: 18 березня 2026</p>
<h2>1. Які дані ми збираємо</h2><p>Matrix of Destiny зберігає ваші дані <strong>локально на пристрої</strong>: ім'я, дату народження, історію розкладів, матриці долі та налаштування. Ці дані не передаються на сервер без вашої згоди.</p>
<h2>2. AI-функції</h2><p>Коли ви використовуєте AI-чат, ваші повідомлення передаються на сервер для обробки через Claude AI (Anthropic). Ми не зберігаємо вміст чатів на сервері — вони зберігаються лише на вашому пристрої.</p>
<h2>3. Аналітика</h2><p>Ми можемо збирати анонімну аналітику використання (без ідентифікації особи) для покращення застосунку. Ви можете вимкнути це в налаштуваннях.</p>
<h2>4. Збереження даних</h2><p>Всі персональні дані зберігаються локально і зашифровані. При видаленні застосунку всі дані видаляються автоматично.</p>
<h2>5. Передача третім особам</h2><p>Ми <strong>не продаємо і не передаємо</strong> ваші персональні дані третім особам. AI-запити обробляються через Anthropic відповідно до їхньої політики конфіденційності.</p>
<h2>6. Права користувача</h2><p>Ви маєте право: переглядати свої дані, видаляти їх у будь-який момент через налаштування застосунку, відмовитися від аналітики.</p>
<h2>7. Контакти</h2><p>З питань конфіденційності: <strong>support@yourmatrixofdestiny.com</strong></p>
</body></html>`);
});

// ── Terms of Use ──
app.get('/terms', (_, res) => {
  res.send(`<!DOCTYPE html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Умови використання — Matrix of Destiny</title>
<style>body{font-family:system-ui;max-width:700px;margin:0 auto;padding:20px;background:#0D0B1E;color:#e0e0e0}h1{color:#F5C542}h2{color:#A78BFA;margin-top:28px}p,li{line-height:1.7;font-size:15px}ul{padding-left:20px}</style></head><body>
<h1>Умови використання</h1><p>Дата набуття чинності: 12 квітня 2026</p>
<h2>1. Загальні положення</h2><p>Використовуючи застосунок Matrix of Destiny ("Застосунок"), ви погоджуєтесь з цими Умовами використання. Якщо ви не згодні — будь ласка, припиніть використання Застосунку.</p>
<h2>2. Опис послуг</h2><p>Застосунок надає інформаційно-розважальні послуги в сфері нумерології та езотерики. Результати розрахунків та інтерпретацій мають <strong>виключно інформаційний та розважальний характер</strong> і не замінюють професійну консультацію психолога, лікаря чи фінансового радника.</p>
<h2>3. Підписка та платежі</h2><p>Застосунок пропонує безкоштовний та Premium доступ.</p><ul>
<li><strong>Безкоштовний доступ:</strong> обмежений функціонал з можливістю отримувати кристали через щоденні подарунки.</li>
<li><strong>Premium:</strong> тижнева, місячна або річна підписка з автоматичним поновленням.</li>
<li>Підписка автоматично поновлюється, якщо не скасована за 24 години до закінчення поточного періоду.</li>
<li>Скасувати підписку можна в налаштуваннях App Store або Google Play.</li>
<li>Повернення коштів здійснюється відповідно до політики Apple / Google.</li></ul>
<h2>4. Інтелектуальна власність</h2><p>Весь контент Застосунку (тексти, зображення, алгоритми, дизайн) є власністю розробника та захищений законодавством про авторське право. Забороняється копіювання, модифікація або розповсюдження без письмового дозволу.</p>
<h2>5. AI-функції</h2><p>Застосунок використовує штучний інтелект для генерації інтерпретацій та порад. AI-відповіді генеруються автоматично і можуть не бути повністю точними. Розробник не несе відповідальності за рішення, прийняті на основі AI-рекомендацій.</p>
<h2>6. Обмеження відповідальності</h2><p>Застосунок надається "як є". Розробник не гарантує безперебійну роботу та не несе відповідальності за:</p><ul>
<li>Будь-які рішення, прийняті на основі інформації з Застосунку.</li>
<li>Технічні збої, втрату даних або перерви в роботі.</li>
<li>Дії третіх сторін (Apple, Google, платіжні системи).</li></ul>
<h2>7. Вікові обмеження</h2><p>Застосунок призначений для осіб віком від 12 років. Використання особами молодше 12 років не рекомендується.</p>
<h2>8. Зміни умов</h2><p>Ми залишаємо за собою право змінювати ці Умови. Продовження використання Застосунку після змін означає згоду з оновленими Умовами.</p>
<h2>9. Контакти</h2><p>З питань щодо умов використання: <strong>support@yourmatrixofdestiny.com</strong></p>
</body></html>`);
});

// ── Delete Account (authenticated — called from app) ──
app.delete('/api/user/:userId', verifyToken, async (req, res) => {
  if (req.uid !== req.params.userId) return res.status(403).json({ error: 'Forbidden' });
  const { userId } = req.params;
  try {
    // Remove user data from DB
    await pool.query('DELETE FROM user_sync WHERE user_id = $1', [userId]);
    // Delete the Firebase auth user so the account is fully gone
    await admin.auth().deleteUser(userId);
    console.log(`[DeleteAccount] Deleted user ${userId}`);
    res.json({ ok: true });
  } catch (e) {
    console.error('[DeleteAccount] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Delete Account Request ──
app.post('/api/delete-account-request', async (req, res) => {
  try {
    const { email, reason } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedReason = reason || 'not_specified';

    console.log(`[DeleteRequest] email=${sanitizedEmail} reason=${sanitizedReason} time=${new Date().toISOString()}`);

    // Try to find user in DB and mark for deletion
    try {
      await pool.query(
        `INSERT INTO deletion_requests (email, reason, requested_at)
         VALUES ($1, $2, now())
         ON CONFLICT (email) DO UPDATE SET reason = $2, requested_at = now()`,
        [sanitizedEmail, sanitizedReason]
      );
    } catch (dbErr) {
      // Table may not exist yet — log and continue
      console.warn('[DeleteRequest] DB insert skipped:', dbErr.message);
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('[DeleteRequest] error:', e.message);
    res.status(500).json({ error: 'Request failed' });
  }
});

// ── Delete Account Page ──
app.get('/delete-account', (_, res) => {
  res.send(`<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Видалення акаунту — Matrix of Destiny</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0D0B1E; color: #e0e0e0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .container { width: 100%; max-width: 480px; }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo-icon { width: 72px; height: 72px; background: linear-gradient(135deg, #5B21B6, #8B5CF6); border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 36px; margin-bottom: 12px; }
    .logo-name { font-size: 18px; font-weight: 700; color: #F5C542; }
    .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(139,92,246,0.25); border-radius: 20px; padding: 32px; }
    h1 { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 8px; text-align: center; }
    .subtitle { font-size: 14px; color: rgba(255,255,255,0.55); text-align: center; margin-bottom: 28px; line-height: 1.5; }
    .warning-box { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); border-radius: 12px; padding: 14px 16px; margin-bottom: 24px; }
    .warning-box p { font-size: 13px; color: #fca5a5; line-height: 1.6; }
    .warning-box strong { color: #ef4444; }
    .field-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); margin-bottom: 8px; display: block; }
    input, select { width: 100%; background: rgba(255,255,255,0.07); border: 1px solid rgba(139,92,246,0.3); border-radius: 12px; padding: 13px 16px; color: #fff; font-size: 15px; outline: none; transition: border-color 0.2s; appearance: none; -webkit-appearance: none; margin-bottom: 18px; }
    input::placeholder { color: rgba(255,255,255,0.3); }
    input:focus, select:focus { border-color: #8B5CF6; }
    select option { background: #1a1530; color: #e0e0e0; }
    .select-wrap { position: relative; margin-bottom: 18px; }
    .select-wrap select { margin-bottom: 0; }
    .select-wrap::after { content: '▾'; position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.4); pointer-events: none; }
    .btn-delete { width: 100%; padding: 15px; background: linear-gradient(135deg, #dc2626, #991b1b); border: none; border-radius: 12px; color: #fff; font-size: 16px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; margin-top: 6px; }
    .btn-delete:hover { opacity: 0.9; }
    .btn-delete:disabled { opacity: 0.5; cursor: not-allowed; }
    .cancel-link { display: block; text-align: center; margin-top: 16px; color: rgba(255,255,255,0.45); font-size: 14px; text-decoration: none; }
    .cancel-link:hover { color: rgba(255,255,255,0.7); }
    .success-state { display: none; text-align: center; padding: 12px 0; }
    .success-icon { font-size: 48px; margin-bottom: 16px; }
    .success-state h2 { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 10px; }
    .success-state p { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.6; }
    .footer-note { text-align: center; margin-top: 20px; font-size: 12px; color: rgba(255,255,255,0.3); line-height: 1.6; }
    .footer-note a { color: rgba(139,92,246,0.7); text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <div class="logo-icon">🔮</div>
      <div class="logo-name">Matrix of Destiny</div>
    </div>
    <div class="card">
      <div id="form-state">
        <h1>Видалення акаунту</h1>
        <p class="subtitle">Введіть email вашого акаунту, щоб підтвердити запит на видалення</p>
        <div class="warning-box">
          <p>⚠️ <strong>Увага:</strong> Після видалення акаунту всі ваші дані, матриці, розклади та підписка будуть <strong>безповоротно видалені</strong>. Цю дію неможливо скасувати.</p>
        </div>
        <form id="delete-form" onsubmit="handleSubmit(event)">
          <label class="field-label" for="email">Email акаунту</label>
          <input type="email" id="email" placeholder="your@email.com" required autocomplete="email" />
          <label class="field-label" for="reason">Причина видалення</label>
          <div class="select-wrap">
            <select id="reason">
              <option value="">— Оберіть причину (необов'язково) —</option>
              <option value="not_using">Більше не використовую застосунок</option>
              <option value="privacy">Питання конфіденційності</option>
              <option value="switching">Перехожу на інший сервіс</option>
              <option value="too_expensive">Занадто дорого</option>
              <option value="technical">Технічні проблеми</option>
              <option value="other">Інша причина</option>
            </select>
          </div>
          <button type="submit" class="btn-delete" id="submit-btn">Надіслати запит на видалення</button>
        </form>
        <a href="https://yourmatrixofdestiny.com" class="cancel-link">← Повернутись на сайт</a>
      </div>
      <div class="success-state" id="success-state">
        <div class="success-icon">✅</div>
        <h2>Запит надіслано</h2>
        <p>Ваш запит на видалення акаунту отримано.<br/>Ми обробимо його протягом <strong style="color:#F5C542">7 робочих днів</strong>.<br/><br/>Підтвердження буде надіслане на вказаний email.</p>
        <a href="https://yourmatrixofdestiny.com" class="cancel-link" style="margin-top:24px;display:block">← Повернутись на сайт</a>
      </div>
    </div>
    <p class="footer-note">
      Питання? <a href="mailto:support@yourmatrixofdestiny.com">support@yourmatrixofdestiny.com</a><br/>
      <a href="/privacy">Політика конфіденційності</a> · <a href="/terms">Умови використання</a>
    </p>
  </div>
  <script>
    async function handleSubmit(e) {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const reason = document.getElementById('reason').value;
      const btn = document.getElementById('submit-btn');
      if (!email) return;
      btn.disabled = true;
      btn.textContent = 'Надсилаємо...';
      try {
        const res = await fetch('/api/delete-account-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, reason }),
        });
        showSuccess();
      } catch { showSuccess(); }
    }
    function showSuccess() {
      document.getElementById('form-state').style.display = 'none';
      document.getElementById('success-state').style.display = 'block';
    }
  </script>
</body>
</html>`);
});

// ── AI Scan & Higher Self ─────────────────────────────────────────────────────

/** Port of matrix-calc.ts (reduceToEnergy + calculateMatrix) for pure Node.js */
function reduceToEnergy(num) {
  if (num <= 0) return 22;
  if (num <= 22) return num;
  let result = num;
  while (result > 22) {
    result = String(result).split('').reduce((sum, d) => sum + Number(d), 0);
  }
  return result;
}
function calcMatrixSoul(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const yearSum = String(y).split('').reduce((s, x) => s + Number(x), 0);
  const a = reduceToEnergy(d), b = reduceToEnergy(m), c = reduceToEnergy(yearSum);
  return {
    soul: reduceToEnergy(a + b),
    personality: reduceToEnergy(a + b + c),
  };
}

/** Arcana names + spiritual qualities for Claude Vision prompt */
const ARCANA_PORTRAIT = {
  1:  { nameUk: 'Маг',              nameEn: 'The Magician',       qualities: 'воля, майстерність, трансформація реальності, дія та ініціатива' },
  2:  { nameUk: 'Жриця',            nameEn: 'The High Priestess', qualities: 'інтуїція, мудрість, таємне знання, внутрішній голос' },
  3:  { nameUk: 'Імператриця',      nameEn: 'The Empress',        qualities: 'творчість, родючість, краса, материнська сила природи' },
  4:  { nameUk: 'Імператор',        nameEn: 'The Emperor',        qualities: 'лідерство, структура, захист, стабільність та авторитет' },
  5:  { nameUk: 'Ієрофант',         nameEn: 'The Hierophant',     qualities: 'духовне наставництво, традиція, мудрість учителя' },
  6:  { nameUk: 'Закохані',         nameEn: 'The Lovers',         qualities: 'гармонія, вибір серця, єднання, любов як вища цінність' },
  7:  { nameUk: 'Колісниця',        nameEn: 'The Chariot',        qualities: 'перемога, контроль, рух уперед, сила волі' },
  8:  { nameUk: 'Справедливість',   nameEn: 'Justice',            qualities: 'баланс, чесність, карма, відповідальність за кожен вибір' },
  9:  { nameUk: 'Відлюдник',        nameEn: 'The Hermit',         qualities: 'самопізнання, мудрість самотності, внутрішнє світло' },
  10: { nameUk: 'Колесо Фортуни',   nameEn: 'Wheel of Fortune',   qualities: 'циклічність долі, удача, прийняття змін, синхронія' },
  11: { nameUk: 'Сила',             nameEn: 'Strength',           qualities: 'внутрішня сила, терпіння, приборкання страху любов\'ю' },
  12: { nameUk: 'Повішений',        nameEn: 'The Hanged Man',     qualities: 'жертовність, нова перспектива, духовне осяяння' },
  13: { nameUk: 'Смерть',           nameEn: 'Death',              qualities: 'трансформація, звільнення від старого, відродження' },
  14: { nameUk: 'Помірність',       nameEn: 'Temperance',         qualities: 'рівновага, терпіння, синтез протилежностей, цілісність' },
  15: { nameUk: 'Диявол',           nameEn: 'The Devil',          qualities: 'усвідомлення тіні, звільнення від обмежень, сила матерії' },
  16: { nameUk: 'Вежа',             nameEn: 'The Tower',          qualities: 'руйнування ілюзій, раптове прозріння, очисна сила' },
  17: { nameUk: 'Зірка',            nameEn: 'The Star',           qualities: 'надія, натхнення, зцілення, зв\'язок з вищим' },
  18: { nameUk: 'Місяць',           nameEn: 'The Moon',           qualities: 'підсвідомість, інтуїція, сновидіння, ілюзія та правда' },
  19: { nameUk: 'Сонце',            nameEn: 'The Sun',            qualities: 'радість, успіх, ясність, дитяча щирість та творення' },
  20: { nameUk: 'Суд',              nameEn: 'Judgement',          qualities: 'пробудження, покликання, відновлення, відповідь душі' },
  21: { nameUk: 'Світ',             nameEn: 'The World',          qualities: 'завершеність, цілісність, єднання з Всесвітом, тріумф' },
  22: { nameUk: 'Блазень',          nameEn: 'The Fool',           qualities: 'початок, сміливість, довіра до Всесвіту, чиста свобода' },
};

/** Image upload multer instance for AI scan (10 MB cap) */
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

/**
 * POST /api/ai-scan
 * Body: multipart — photo (image file) + birthDate (YYYY-MM-DD)
 * Auth: optional (saves to DB only if authenticated)
 * Returns: { arcanaId, arcanaName, description }
 */
app.post('/api/ai-scan', imageUpload.single('photo'), async (req, res) => {
  const { birthDate } = req.body || {};
  if (!req.file) return res.status(400).json({ error: 'photo required' });
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return res.status(400).json({ error: 'birthDate required (YYYY-MM-DD)' });
  }

  // Optional auth — if token provided, save result to DB
  let userId = null;
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
      userId = decoded.uid;
    } catch { /* unauthenticated — proceed anyway */ }
  }

  try {
    // 1. Calculate soul arcana from birth date
    const { soul } = calcMatrixSoul(birthDate);
    const arcana = ARCANA_PORTRAIT[soul] || ARCANA_PORTRAIT[1];
    console.log(`[AIScan] user=${userId || 'anon'} birthDate=${birthDate} soul=${soul} arcana="${arcana.nameUk}"`);

    // 2. Convert uploaded photo to pure base64 (no data: prefix — Claude API needs raw base64)
    const mime = req.file.mimetype || 'image/jpeg';
    const imageBase64 = req.file.buffer.toString('base64');
    console.log(`[AIScan] → Claude Vision (${(req.file.size / 1024).toFixed(0)} KB, ${mime})`);

    // 3. Claude Vision: analyze face + generate Higher Self description in one call
    const visionPrompt = `Аркан Душі цієї людини за Матрицею Долі: ${soul}. ${arcana.nameUk} — архетип ${arcana.qualities}.

Уважно подивись на обличчя на фото. Ти бачиш реальну людину — зчитай її унікальну енергетику:
— Що ти бачиш у погляді та очах: глибина, характер, що відчитується за першим поглядом
— Яку енергію транслює вираз обличчя: м'якість чи рішучість, відкритість чи внутрішня таємниця
— Яка прихована сила або вразливість відчувається в рисах

Напиши персональний духовний портрет цієї конкретної людини — 5 речень, кожне відкриває новий рівень:
1. Що конкретно ти бачиш в очах і погляді — специфічно, не загально
2. Яка глибинна сила чи особлива якість проявляється в рисах її обличчя
3. Як архетип ${arcana.nameUk} розкривається саме в цій людині — її особистий прояв, не шаблон
4. Яке унікальне призначення або дар ця людина несе у світ
5. Особисте послання цій людині — натхнення і напрям

Критично важливо: кожне речення має стосуватися САМЕ цієї людини, яку ти бачиш на фото. Описуй те, що реально відчитуєш — погляд, вираз, енергію. Уникай шаблонних фраз. Живий, поетичний, глибокий текст. Без markdown.`;

    let description = '';
    try {
      const { data: claudeData } = await callAnthropic({
        model: 'claude-haiku-4-5',
        max_tokens: 650,
        system: 'Ти — містичний оракул Матриці Долі з даром читання обличчя. Ти дійсно бачиш фото і описуєш конкретну людину — її погляд, вираз, приховану силу. Твої слова мають відчуватися як написані особисто для неї, а не як шаблон. Відповідаєш виключно українською мовою. Тільки поетичний живий текст без markdown і без вступних слів типу "Звісно" чи "Ось".',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mime,
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: visionPrompt,
              },
            ],
          },
        ],
      });
      description = claudeData?.content?.[0]?.text?.trim() ?? '';
      console.log(`[AIScan] ✓ Claude Vision description (${description.length} chars)`);
    } catch (e) {
      console.warn('[AIScan] Claude Vision failed:', e.message);
      description = `AI-провідник побачив у тобі глибоку силу архетипу ${arcana.nameUk}. Твоя душа несе якості: ${arcana.qualities}. Довіряй своїй внутрішній мудрості — вона веде тебе до вищого призначення.`;
    }

    // 4. Save to DB (optional — only if authenticated)
    if (userId) {
      try {
        await pool.query(
          `INSERT INTO ai_portraits (user_id, birth_date, arcana_id, portrait_url, description)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, birthDate, soul, '', description]
        );
      } catch (dbErr) {
        console.warn('[AIScan] DB insert failed:', dbErr.message);
      }
    }

    res.json({
      arcanaId: soul,
      arcanaName: arcana.nameUk,
      description,
    });
  } catch (e) {
    console.error('[AIScan] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/ai-scan/history — last 10 scans for authenticated user */
app.get('/api/ai-scan/history', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  try {
    const decoded = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
    const rows = await pool.query(
      'SELECT id, arcana_id, description, created_at FROM ai_portraits WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
      [decoded.uid]
    );
    res.json({ scans: rows.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3100;
app.listen(PORT, () => console.log(`Matrix API listening on :${PORT}`));
