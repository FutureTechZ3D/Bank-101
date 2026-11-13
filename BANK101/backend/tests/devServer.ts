/**
 * Local dev/test backend for the frontend: the REAL Express app on port 5000 with an embedded
 * PostgreSQL 18.6 database loaded with schema.sql, seed.sql, all 9 migrations, and all
 * open-source academic datasets (NCERT/SCERT books, PYQs, bilingual question banks, mock tests)
 * pre-imported automatically on startup — no external PostgreSQL install or admin action needed.
 *
 *   npm run dev:test-server        (from backend/)
 */
process.env.ENABLE_TIER_TOGGLE = 'true';
process.env.AUTH_RATE_MAX = process.env.AUTH_RATE_MAX || '1000';
process.env.TEST_DB = process.env.TEST_DB || 'pg';

import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

async function main() {
  const { freshDb, stopPg } = await import('./helpers');
  const { pool } = await freshDb();

  // Seed default admin accounts
  const user = process.env.E2E_ADMIN_USER || 'e2e_admin';
  const pass = process.env.E2E_ADMIN_PASS || 'e2e-admin-passphrase-1';
  await pool.query("INSERT INTO users (username, password_hash, account_type) VALUES ($1, $2, 'Admin')", [
    user,
    await bcrypt.hash(pass, 10),
  ]);
  await pool.query("INSERT INTO users (username, password_hash, account_type) VALUES ($1, $2, 'Admin')", [
    'admin',
    await bcrypt.hash('admin123456', 10),
  ]);

  // Auto-import all open-source academic datasets (books, PYQs, curated bilingual questions, mock tests)
  const { runFullPipeline } = await import('../src/pipeline/importer');
  const summary = await runFullPipeline();
  console.log(
    `Auto-imported datasets: ${summary.total_questions_imported} questions, ` +
      `${summary.total_books_imported} books (${summary.total_chapters_imported} chapters), ` +
      `${summary.total_pyq_papers_imported} PYQ papers (${summary.total_pyq_questions_imported} PYQ items), ` +
      `${summary.total_mock_tests_created} mock tests (${summary.duration_ms}ms)`
  );

  // Also load the independently verified simplification question bank unless disabled
  if (process.env.E2E_BANK !== '0') {
    const verifiedPath = path.resolve(__dirname, '..', '..', 'database', 'import', 'verified.json');
    if (fs.existsSync(verifiedPath)) {
      const { importQuizzes } = await import('../src/modules/admin/importQuizzes');
      const bank = JSON.parse(fs.readFileSync(verifiedPath, 'utf8'));
      const r = await importQuizzes(bank.topic, bank.quizzesData, { skipExisting: true });
      console.log(`Verified bank loaded: ${r.quizzes} quizzes / ${r.questions} questions`);
    }
  }

  // Listen on fixed port 5000 so the Vite proxy (localhost:3000 -> 5000) reaches it
  const { createApp } = await import('../src/app');
  const app = createApp();
  const server = app.listen(5000, '127.0.0.1', () => {
    console.log(`BANK-101 backend (${process.env.TEST_DB === 'pg' ? 'embedded PostgreSQL' : 'pg-mem'}) listening on http://127.0.0.1:5000`);
  });

  const shutdown = async () => {
    server.close();
    await stopPg();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
