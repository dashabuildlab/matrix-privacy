/**
 * Creates / ensures the Apple reviewer account exists with Premium access.
 * Run: node create-reviewer.js
 */
const path = require('path');
const admin = require('firebase-admin');
const { Pool } = require('pg');

const EMAIL    = 'reviewer@yourmatrixofdestiny.com';
const PASSWORD = 'Reviewer2026!';

const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // 1. Create or get Firebase user
  let uid;
  try {
    const existing = await admin.auth().getUserByEmail(EMAIL);
    uid = existing.uid;
    console.log(`[Firebase] User already exists: ${uid}`);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      const created = await admin.auth().createUser({ email: EMAIL, password: PASSWORD, emailVerified: true });
      uid = created.uid;
      console.log(`[Firebase] User created: ${uid}`);
    } else {
      throw e;
    }
  }

  // 2. Ensure user_sync table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sync (
      user_id    TEXT PRIMARY KEY,
      state      JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // 3. Build premium state
  const premiumState = {
    isPremium: true,
    plan: 'yearly',
    isAuthenticated: true,
    userId: uid,
    userName: 'Apple Reviewer',
    tokens: 999,
    streak: 1,
    level: 5,
    xp: 500,
    onboardingCompleted: true,
  };

  // 4. Upsert into user_sync
  const existing = await pool.query('SELECT state FROM user_sync WHERE user_id = $1', [uid]);

  if (existing.rows.length > 0) {
    // Merge premium fields into existing state
    const merged = { ...existing.rows[0].state, ...premiumState };
    await pool.query(
      `UPDATE user_sync SET state = $1, updated_at = now() WHERE user_id = $2`,
      [JSON.stringify(merged), uid]
    );
    console.log(`[DB] State updated with Premium for existing user.`);
  } else {
    await pool.query(
      `INSERT INTO user_sync (user_id, state, updated_at) VALUES ($1, $2, now())`,
      [uid, JSON.stringify(premiumState)]
    );
    console.log(`[DB] New state row created with Premium.`);
  }

  console.log('\n✅ Done!');
  console.log(`   Email   : ${EMAIL}`);
  console.log(`   Password: ${PASSWORD}`);
  console.log(`   UID     : ${uid}`);
  console.log(`   Premium : true (yearly)`);

  await pool.end();
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Error:', e.message ?? e);
  console.error('Stack:', e.stack);
  console.error('DB URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@') : 'NOT SET');
  process.exit(1);
});
