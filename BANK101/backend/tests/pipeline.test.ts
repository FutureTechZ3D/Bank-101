import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { freshDb, startServer, call, PASSWORD, stopPg } from './helpers';
import { computeQuestionHash, validateAndCleanOptions } from '../src/pipeline/normalizer';
import { runFullPipeline } from '../src/pipeline/importer';
import { getPipelineStats } from '../src/pipeline/pipeline.service';

describe('Phase 7 — Automated Open-Source Academic Ingestion Pipeline', () => {
  let ctx: any;

  before(async () => {
    const { pool } = await freshDb();
    const s = await startServer();

    // Create admin user
    const hash = await bcrypt.hash(PASSWORD, 10);
    const r = await pool.query(
      "INSERT INTO users (username, password_hash, account_type, points, streak_days) VALUES ('pipeline_admin', $1, 'Admin', 0, 0) RETURNING id",
      [hash]
    );
    const adminId = r.rows[0].id;
    await pool.query('INSERT INTO user_roles (user_id, role_id) SELECT $1::int, id FROM roles WHERE name = $2', [adminId, 'admin']);

    const login = await call(s.base, 'POST', '/api/v1/auth/login', {
      body: { username: 'pipeline_admin', password: PASSWORD },
    });

    ctx = { base: s.base, close: s.close, adminToken: login.json.token, pool };
  });

  after(async () => {
    if (ctx?.close) await ctx.close();
    await stopPg();
  });

  it('1. Computes deterministic SHA-256 question hash ignoring case and whitespace', () => {
    const text1 = 'Which Article of the Constitution safeguards right to marry?';
    const text2 = '  which article of the constitution safeguards right to marry?  ';
    const hash1 = computeQuestionHash(text1);
    const hash2 = computeQuestionHash(text2);
    assert.equal(hash1, hash2, 'Normalized hashes must match');
    assert.equal(hash1.length, 64, 'SHA-256 hash length must be 64 characters');
  });

  it('2. Normalizes options and ensures exactly one correct option', () => {
    const rawOptions = [
      { label: 'a', text: 'Option A', is_correct: false },
      { label: 'b', text: 'Option B', is_correct: true },
      { label: 'c', text: 'Option C', is_correct: true }, // accidental duplicate correct
    ];
    const cleaned = validateAndCleanOptions(rawOptions);
    assert.equal(cleaned[0].label, 'A');
    assert.equal(cleaned[1].label, 'B');
    assert.equal(cleaned.filter((o) => o.is_correct).length, 1, 'Only one correct option allowed');
  });

  it('3. Runs full pipeline and ingests questions, books, PYQs, and creates mock tests', async () => {
    const summary = await runFullPipeline();

    assert.ok(summary.total_questions_imported > 0, 'Questions must be imported');
    assert.ok(summary.total_books_imported > 0, 'Books must be imported');
    assert.ok(summary.total_chapters_imported > 0, 'Chapters must be imported');
    assert.ok(summary.total_pyq_papers_imported > 0, 'PYQ papers must be imported');
    assert.ok(summary.total_mock_tests_created > 0, 'Mock tests must be created');
  });

  it('4. Running pipeline again deduplicates and skips already imported questions', async () => {
    const secondRun = await runFullPipeline();

    // Already imported questions must be skipped
    assert.ok(secondRun.total_questions_skipped > 0, 'Duplicate questions must be skipped');
  });

  it('5. Pipeline stats reports total counts and subject breakdown correctly', async () => {
    const stats = await getPipelineStats();

    assert.ok(stats.total_questions > 0, 'Total questions count must be positive');
    assert.ok(stats.total_books > 0, 'Total books count must be positive');
    assert.ok(stats.total_quizzes > 0, 'Total quizzes count must be positive');
    assert.ok(Array.isArray(stats.subject_breakdown), 'Subject breakdown must be an array');
  });

  it('6. Admin pipeline API endpoints respond with valid stats and authentication', async () => {
    // 1. Unauthenticated call is rejected
    const unauthRes = await call(ctx.base, 'GET', '/api/v1/admin/pipeline/stats');
    assert.equal(unauthRes.status, 401, 'Unauthenticated request must be rejected');

    // 2. Admin call succeeds
    const adminRes = await call(ctx.base, 'GET', '/api/v1/admin/pipeline/stats', {
      token: ctx.adminToken,
    });
    assert.equal(adminRes.status, 200, 'Admin request must succeed');
    assert.equal(adminRes.json.success, true);
    assert.ok(adminRes.json.stats.total_questions >= 0);
  });
});
