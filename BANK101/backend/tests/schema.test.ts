/**
 * Phase 2 — Schema hardening tests.
 *
 * Covers:
 *  - quiz_attempts.status column (in_progress → submitted)
 *  - Idempotent submit via status (double submit returns 409)
 *  - negative_marks config on quiz_tests
 *  - Negative marking in submit scoring
 *  - question_type column on question_bank
 *  - questions endpoint includes question_type
 *  - New tables exist (result_details, attempt_events, notifications, audit_logs, etc.)
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb, startServer, call, register, uniqueName, PASSWORD, stopPg } from './helpers';

type Ctx = { base: string; pool: any; close: () => Promise<void> };
async function boot(): Promise<Ctx> {
  const { pool } = await freshDb();
  const s = await startServer();
  return { base: s.base, pool, close: s.close };
}

// ── attempt status ────────────────────────────────────────────────────────────
describe('quiz_attempts.status', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('a new attempt has status in_progress', async () => {
    const { token } = await register(ctx.base);
    const startRes = await call(ctx.base, 'POST', '/api/v1/attempts/start', { token, body: { quiz_id: 1 } });
    assert.equal(startRes.status, 201);
    const { attempt_id } = startRes.json;
    const dbRow = await ctx.pool.query('SELECT status FROM quiz_attempts WHERE id = $1', [attempt_id]);
    assert.equal(dbRow.rows[0].status, 'in_progress');
  });

  it('status becomes submitted after submitAttempt', async () => {
    const { token } = await register(ctx.base);
    const startRes = await call(ctx.base, 'POST', '/api/v1/attempts/start', { token, body: { quiz_id: 1 } });
    const { attempt_id } = startRes.json;

    const submitRes = await call(ctx.base, 'POST', '/api/v1/attempts/submit', { token, body: { attempt_id } });
    assert.equal(submitRes.status, 200);

    const dbRow = await ctx.pool.query('SELECT status FROM quiz_attempts WHERE id = $1', [attempt_id]);
    assert.equal(dbRow.rows[0].status, 'submitted');
  });

  it('double submit returns 409 (status guard)', async () => {
    const { token } = await register(ctx.base);
    const startRes = await call(ctx.base, 'POST', '/api/v1/attempts/start', { token, body: { quiz_id: 1 } });
    const { attempt_id } = startRes.json;

    const r1 = await call(ctx.base, 'POST', '/api/v1/attempts/submit', { token, body: { attempt_id } });
    assert.equal(r1.status, 200);

    const r2 = await call(ctx.base, 'POST', '/api/v1/attempts/submit', { token, body: { attempt_id } });
    assert.equal(r2.status, 409, 'second submit must be rejected');
  });
});

// ── negative marking ──────────────────────────────────────────────────────────
describe('negative marking', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('quiz_tests has negative_marks and marks_per_question columns', async () => {
    const r = await ctx.pool.query('SELECT negative_marks, marks_per_question FROM quiz_tests WHERE id = 1');
    assert.ok(r.rows.length > 0, 'quiz 1 must exist');
    assert.ok('negative_marks' in r.rows[0], 'negative_marks column must exist');
    assert.ok('marks_per_question' in r.rows[0], 'marks_per_question column must exist');
  });

  it('score with negative marking: wrong answers reduce score', async () => {
    // Set negative_marks = 0.25 on quiz 1 for this test
    await ctx.pool.query('UPDATE quiz_tests SET negative_marks = 0.25, marks_per_question = 1 WHERE id = 1');

    const { token } = await register(ctx.base);
    const startRes = await call(ctx.base, 'POST', '/api/v1/attempts/start', { token, body: { quiz_id: 1 } });
    const { attempt_id } = startRes.json;

    // Answer Q1 correctly (A is correct) and Q2 wrongly (B is wrong for Q2)
    const qs = await ctx.pool.query(
      'SELECT q.id, o.label AS correct FROM question_bank q JOIN options o ON o.question_id = q.id JOIN quiz_question_map m ON m.question_id = q.id WHERE m.quiz_id = 1 AND o.is_correct = true ORDER BY m.sort_order'
    );
    const q1 = qs.rows[0];
    const q2 = qs.rows[1];
    const wrongLabel = q2.correct === 'A' ? 'B' : 'A';

    await call(ctx.base, 'POST', '/api/v1/attempts/answer', { token, body: { attempt_id, question_id: q1.id, selected_option: q1.correct, time_taken_seconds: 5 } });
    await call(ctx.base, 'POST', '/api/v1/attempts/answer', { token, body: { attempt_id, question_id: q2.id, selected_option: wrongLabel, time_taken_seconds: 5 } });

    const submitRes = await call(ctx.base, 'POST', '/api/v1/attempts/submit', { token, body: { attempt_id } });
    assert.equal(submitRes.status, 200);

    // 1 correct (1.0) - 1 wrong (0.25) = 0.75 / 10 total = 7.5%
    const result = submitRes.json.results;
    assert.equal(result.correct, 1);
    assert.equal(result.wrong, 1);
    // percentage = (0.75 / 10) * 100 = 7.5
    assert.ok(Number(result.percentage) < 10, `expected < 10%, got ${result.percentage}`);
    assert.ok(Number(result.percentage) > 0, `expected > 0%, got ${result.percentage}`);

    // Reset for other tests
    await ctx.pool.query('UPDATE quiz_tests SET negative_marks = 0, marks_per_question = 1 WHERE id = 1');
  });

  it('score without negative marking: wrong answers do not reduce score', async () => {
    await ctx.pool.query('UPDATE quiz_tests SET negative_marks = 0, marks_per_question = 1 WHERE id = 1');

    const { token } = await register(ctx.base);
    const startRes = await call(ctx.base, 'POST', '/api/v1/attempts/start', { token, body: { quiz_id: 1 } });
    assert.equal(startRes.status, 201, `startAttempt failed: ${JSON.stringify(startRes.json)}`);
    const { attempt_id } = startRes.json;

    // Get the correct option for Q1 and pick the wrong one
    const qs = await ctx.pool.query(
      'SELECT q.id, o.label AS correct FROM question_bank q JOIN options o ON o.question_id = q.id JOIN quiz_question_map m ON m.question_id = q.id WHERE m.quiz_id = 1 AND o.is_correct = true ORDER BY m.sort_order LIMIT 1'
    );
    const q1 = qs.rows[0];
    const wrongLabel = q1.correct === 'A' ? 'B' : 'A';

    // Answer 1 wrong
    const ansRes = await call(ctx.base, 'POST', '/api/v1/attempts/answer', { token, body: { attempt_id, question_id: q1.id, selected_option: wrongLabel, time_taken_seconds: 5 } });
    assert.equal(ansRes.status, 200, `answerQuestion failed: ${JSON.stringify(ansRes.json)}`);

    const r = await call(ctx.base, 'POST', '/api/v1/attempts/submit', { token, body: { attempt_id } });
    assert.equal(r.status, 200, `submitAttempt failed: ${JSON.stringify(r.json)}`);
    const result = r.json.results;
    assert.equal(Number(result.correct), 0);
    assert.ok(Number(result.wrong) >= 1, `expected at least 1 wrong answer, got ${result.wrong}. Full result: ${JSON.stringify(result)}`);
    // No negative marking: score should be 0 (not negative)
    assert.equal(Number(result.percentage), 0, `expected 0%, got ${result.percentage}`);
  });
});

// ── question_type ─────────────────────────────────────────────────────────────
describe('question_type', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('question_bank has question_type column defaulting to single_mcq', async () => {
    const r = await ctx.pool.query('SELECT question_type FROM question_bank WHERE id = 1');
    assert.ok(r.rows.length > 0);
    assert.equal(r.rows[0].question_type, 'single_mcq');
  });

  it('GET /questions includes question_type in each question', async () => {
    const { token } = await register(ctx.base);
    const r = await call(ctx.base, 'GET', '/api/v1/questions?quiz_id=1', { token });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.json.questions));
    assert.ok(r.json.questions.length > 0);
    assert.ok('question_type' in r.json.questions[0], 'question_type must be in each question');
    assert.equal(r.json.questions[0].question_type, 'single_mcq');
  });
});

// ── new tables existence ───────────────────────────────────────────────────────
describe('new schema tables exist', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  const tables = [
    'result_details', 'attempt_events', 'question_tags', 'question_media',
    'study_materials', 'previous_papers', 'bookmarks', 'announcements',
    'notifications', 'audit_logs', 'system_settings',
    'datasets', 'dataset_versions', 'dataset_imports', 'dataset_import_errors',
  ];

  for (const table of tables) {
    it(`table ${table} exists and is queryable`, async () => {
      const r = await ctx.pool.query(`SELECT count(*) AS n FROM ${table}`);
      assert.ok(r.rows.length > 0, `${table} must be queryable`);
    });
  }
});

// ── system_settings defaults ───────────────────────────────────────────────────
describe('system_settings defaults', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('default settings are seeded', async () => {
    const r = await ctx.pool.query("SELECT key, value FROM system_settings WHERE key IN ('daily_mock_enabled','max_free_hints','cert_pass_threshold') ORDER BY key");
    assert.equal(r.rows.length, 3);
    const map = Object.fromEntries(r.rows.map((x: any) => [x.key, x.value]));
    assert.equal(map.daily_mock_enabled, 'false');
    assert.equal(map.max_free_hints, '10');
    assert.equal(map.cert_pass_threshold, '80');
  });
});

// ── teardown ──────────────────────────────────────────────────────────────────
describe('teardown (schema)', () => {
  it('stops pg if running', async () => { await stopPg(); });
});
