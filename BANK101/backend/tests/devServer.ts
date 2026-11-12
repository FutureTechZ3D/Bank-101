/**
 * Local test backend for the frontend end-to-end run: the REAL Express app on port 5000 with a pg-mem database
 * loaded with the real schema/seed/migration (no PostgreSQL needed). NOT for production.
 *
 *   npm run dev:test-server        (from backend/)
 *
 * An admin account is created from E2E_ADMIN_USER / E2E_ADMIN_PASS (defaults are for this local test only).
 */
process.env.ENABLE_TIER_TOGGLE = 'true';
process.env.AUTH_RATE_MAX = process.env.AUTH_RATE_MAX || '1000';

import bcrypt from 'bcryptjs';
import { freshDb, startServer } from './helpers';

async function main() {
  const { pool } = await freshDb();
  const user = process.env.E2E_ADMIN_USER || 'e2e_admin';
  const pass = process.env.E2E_ADMIN_PASS || 'e2e-admin-passphrase-1';
  await pool.query("INSERT INTO users (username, password_hash, account_type) VALUES ($1, $2, 'Admin')", [user, await bcrypt.hash(pass, 10)]);
  // Also provide simple admin credentials
  await pool.query("INSERT INTO users (username, password_hash, account_type) VALUES ($1, $2, 'Admin')", ['admin', await bcrypt.hash('admin123456', 10)]);

  // E2E_BANK=1: also load the independently verified question bank (database/import/verified.json)
  if (process.env.E2E_BANK === '1') {
    const fs = await import('fs');
    const path = await import('path');
    const { importQuizzes } = await import('../src/modules/admin/importQuizzes');
    const bank = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'database', 'import', 'verified.json'), 'utf8'));
    const r = await importQuizzes(bank.topic, bank.quizzesData, { skipExisting: true });
    console.log(`E2E bank loaded: ${r.quizzes} quizzes / ${r.questions} questions`);
  }

  // listen on a fixed port so the Vite proxy (localhost:5000) reaches it
  const { createApp } = await import('../src/app');
  const app = createApp();
  app.listen(5000, '127.0.0.1', () => console.log('E2E test backend (pg-mem) on http://127.0.0.1:5000'));
}

void startServer; // imported only so helpers' env defaults are applied first
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
