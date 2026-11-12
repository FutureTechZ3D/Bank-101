/**
 * Behaviour that pg-mem CANNOT prove (it ignores BEGIN/ROLLBACK and has no real concurrency).
 * Runs only with TEST_DB=pg (npm run test:pg) on a REAL PostgreSQL server; skipped otherwise.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { freshDb, startServer, call, register, USING_PG, stopPg } from './helpers';
import { setPool, withTransaction, query } from '../src/config/db';

const opts = { skip: USING_PG ? false : 'needs a real PostgreSQL: run npm run test:pg' };

type Ctx = { base: string; pool: any; close: () => Promise<void> };
async function boot(): Promise<Ctx> {
  const { pool } = await freshDb();
  const s = await startServer();
  return { base: s.base, pool, close: s.close };
}

/** Wraps the real pool: the Nth transaction-client query matching `failOn` rejects with an injected error. */
function failingPool(real: any, failOn: RegExp, nth = 1) {
  return {
    query: (t: string, p?: any[]) => real.query(t, p),
    connect: async () => {
      const c = await real.connect();
      let n = 0;
      const original = c.query.bind(c);
      // pass ALL arguments through: pg's own pool.query() calls client.query(text, values, callback)
      c.query = (...args: any[]) => {
        if (typeof args[0] === 'string' && failOn.test(args[0]) && ++n === nth) return Promise.reject(new Error('INJECTED FAILURE'));
        return original(...args);
      };
      return c;
    },
  };
}

async function counts(pool: any) {
  const out: Record<string, number> = {};
  for (const t of ['topics', 'quiz_tests', 'question_bank', 'options', 'explanations', 'quiz_question_map', 'results']) {
    out[t] = Number((await pool.query(`SELECT count(*) AS c FROM ${t}`)).rows[0].c);
  }
  return out;
}

async function correctMap(pool: any): Promise<Record<number, string>> {
  const r = await pool.query('SELECT o.question_id, o.label FROM options o JOIN quiz_question_map m ON m.question_id = o.question_id WHERE m.quiz_id = 1 AND o.is_correct = true');
  const m: Record<number, string> = {};
  r.rows.forEach((x: any) => (m[x.question_id] = String(x.label).trim()));
  return m;
}

describe('real PostgreSQL: transactions', opts, () => {
  let c: Ctx;
  let adminToken: string;
  before(async () => {
    c = await boot();
    await c.pool.query("INSERT INTO users (username, password_hash, account_type) VALUES ('theadmin', $1, 'Admin')", [await bcrypt.hash('admin-passphrase-123', 10)]);
    adminToken = (await call(c.base, 'POST', '/api/v1/auth/login', { body: { username: 'theadmin', password: 'admin-passphrase-123' } })).json.token;
  });
  after(async () => c.close());

  it('withTransaction really rolls back on error and really commits on success', async () => {
    await assert.rejects(() =>
      withTransaction(async (q) => {
        await q("INSERT INTO exam_categories (name, icon, slug) VALUES ('TMP', 'x', 'tmp')");
        throw new Error('boom');
      })
    );
    assert.equal(Number((await query("SELECT count(*) AS c FROM exam_categories WHERE slug = 'tmp'")).rows[0].c), 0);
    await withTransaction(async (q) => {
      await q("INSERT INTO exam_categories (name, icon, slug) VALUES ('TMP2', 'x', 'tmp2')");
    });
    assert.equal(Number((await query("SELECT count(*) AS c FROM exam_categories WHERE slug = 'tmp2'")).rows[0].c), 1);
  });

  it('upload-quiz is all-or-nothing: a failure in the middle leaves NO partial data behind', async () => {
    const payload = {
      topic: 'Atomic Topic',
      quizzesData: [
        {
          quiz_name: 'Atomic Quiz',
          questions: [1, 2, 3].map((n) => ({ question: `Q${n}?`, options: { A: '1', B: '2', C: '3', D: '4' }, correct_option: 'A', explanation: 'x' })),
        },
      ],
    };
    const before_ = await counts(c.pool);
    // fail on the 2nd question's explanation insert: topic, quiz, question 1 (+4 options, explanation, map) and question 2 are already written
    const real = c.pool;
    setPool(failingPool(real, /INSERT INTO explanations/i, 2) as any);
    const r = await call(c.base, 'POST', '/api/v1/admin/upload-quiz', { token: adminToken, body: payload });
    setPool(real);
    assert.equal(r.status, 500);
    assert.deepEqual(await counts(real), before_, 'nothing may remain after the failed upload');

    // the same payload then succeeds completely (proves the failure was the injection, not the data)
    const ok = await call(c.base, 'POST', '/api/v1/admin/upload-quiz', { token: adminToken, body: payload });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const after_ = await counts(real);
    assert.equal(after_.question_bank, before_.question_bank + 3);
    assert.equal(after_.options, before_.options + 12);
    assert.equal(after_.quiz_tests, before_.quiz_tests + 1);
  });

  it('submit is all-or-nothing: if saving the result fails the attempt stays OPEN, points unchanged, and a retry works', async () => {
    const u = await register(c.base);
    const attempt = (await call(c.base, 'POST', '/api/v1/attempts/start', { token: u.token, body: { quiz_id: 1 } })).json.attempt_id;
    const map = await correctMap(c.pool);
    for (const [qid, label] of Object.entries(map)) await call(c.base, 'POST', '/api/v1/attempts/answer', { token: u.token, body: { attempt_id: attempt, question_id: Number(qid), selected_option: label } });

    const real = c.pool;
    setPool(failingPool(real, /INSERT INTO results/i, 1) as any);
    const bad = await call(c.base, 'POST', '/api/v1/attempts/submit', { token: u.token, body: { attempt_id: attempt } });
    setPool(real);
    assert.equal(bad.status, 500);
    const row = (await real.query('SELECT submitted_at, score FROM quiz_attempts WHERE id = $1', [attempt])).rows[0];
    assert.equal(row.submitted_at, null, 'the attempt must NOT be marked submitted');
    assert.equal(Number((await real.query('SELECT count(*) AS c FROM results WHERE attempt_id = $1', [attempt])).rows[0].c), 0);
    assert.equal((await real.query('SELECT points FROM users WHERE username = $1', [u.username])).rows[0].points, 0);

    const retry = await call(c.base, 'POST', '/api/v1/attempts/submit', { token: u.token, body: { attempt_id: attempt } });
    assert.equal(retry.status, 200);
    assert.equal(retry.json.results.correct, 10);
    assert.equal(retry.json.user.points, 100);
  });
});

describe('real PostgreSQL: concurrency and constraints', opts, () => {
  let c: Ctx;
  before(async () => (c = await boot()));
  after(async () => c.close());

  it('the unique index on (attempt_id, question_id) exists and rejects a duplicate row', async () => {
    const u = await register(c.base);
    const attempt = (await call(c.base, 'POST', '/api/v1/attempts/start', { token: u.token, body: { quiz_id: 1 } })).json.attempt_id;
    await c.pool.query("INSERT INTO attempt_answers (attempt_id, question_id, selected_option) VALUES ($1, 1, 'A')", [attempt]);
    await assert.rejects(() => c.pool.query("INSERT INTO attempt_answers (attempt_id, question_id, selected_option) VALUES ($1, 1, 'B')", [attempt]), /duplicate key|unique/i);
  });

  it('RACE: 8 identical answer requests at once all succeed and leave exactly ONE answer row', async () => {
    const u = await register(c.base);
    const attempt = (await call(c.base, 'POST', '/api/v1/attempts/start', { token: u.token, body: { quiz_id: 1 } })).json.attempt_id;
    const qid = Number(Object.keys(await correctMap(c.pool))[0]);
    const replies = await Promise.all(
      Array.from({ length: 8 }, () => call(c.base, 'POST', '/api/v1/attempts/answer', { token: u.token, body: { attempt_id: attempt, question_id: qid, selected_option: 'A' } }))
    );
    assert.deepEqual(replies.map((r) => r.status), Array(8).fill(200), JSON.stringify(replies.map((r) => r.status)));
    assert.equal(Number((await c.pool.query('SELECT count(*) AS c FROM attempt_answers WHERE attempt_id = $1', [attempt])).rows[0].c), 1);
  });

  it('RACE: 6 submits at once -> exactly one 200, the rest 409, points awarded once', async () => {
    const u = await register(c.base);
    const attempt = (await call(c.base, 'POST', '/api/v1/attempts/start', { token: u.token, body: { quiz_id: 1 } })).json.attempt_id;
    for (const [qid, label] of Object.entries(await correctMap(c.pool))) await call(c.base, 'POST', '/api/v1/attempts/answer', { token: u.token, body: { attempt_id: attempt, question_id: Number(qid), selected_option: label } });
    const replies = await Promise.all(Array.from({ length: 6 }, () => call(c.base, 'POST', '/api/v1/attempts/submit', { token: u.token, body: { attempt_id: attempt } })));
    const statuses = replies.map((r) => r.status).sort();
    assert.deepEqual(statuses, [200, 409, 409, 409, 409, 409], JSON.stringify(statuses));
    const row = (await c.pool.query('SELECT points, streak_days FROM users WHERE username = $1', [u.username])).rows[0];
    assert.equal(row.points, 100);
    assert.equal(row.streak_days, 1);
    assert.equal(Number((await c.pool.query('SELECT count(*) AS c FROM results WHERE attempt_id = $1', [attempt])).rows[0].c), 1);
  });

  it('RACE: 15 hint requests at once for a Free user -> at most 10 hints are given', async () => {
    const u = await register(c.base);
    const attempt = (await call(c.base, 'POST', '/api/v1/attempts/start', { token: u.token, body: { quiz_id: 1 } })).json.attempt_id;
    const qid = Number(Object.keys(await correctMap(c.pool))[0]);
    const replies = await Promise.all(
      Array.from({ length: 15 }, () => call(c.base, 'POST', '/api/v1/hints/use', { token: u.token, body: { quiz_attempt_id: attempt, question_id: qid } }))
    );
    const ok = replies.filter((r) => r.status === 200).length;
    const stored = Number((await c.pool.query('SELECT count(*) AS c FROM hint_usage WHERE quiz_attempt_id = $1', [attempt])).rows[0].c);
    assert.equal(stored, 10, `stored ${stored} hint rows (statuses ${replies.map((r) => r.status).join(',')})`);
    assert.equal(ok, 10);
  });

  it('PostgreSQL types: percentage is NUMERIC(5,2) and the API returns a usable number', async () => {
    const u = await register(c.base);
    const attempt = (await call(c.base, 'POST', '/api/v1/attempts/start', { token: u.token, body: { quiz_id: 1 } })).json.attempt_id;
    const ids = Object.keys(await correctMap(c.pool)).map(Number);
    const map = await correctMap(c.pool);
    for (const id of ids.slice(0, 3)) await call(c.base, 'POST', '/api/v1/attempts/answer', { token: u.token, body: { attempt_id: attempt, question_id: id, selected_option: map[id] } });
    const sub = await call(c.base, 'POST', '/api/v1/attempts/submit', { token: u.token, body: { attempt_id: attempt } });
    assert.equal(Number(sub.json.results.percentage), 30);
    const col = (await c.pool.query("SELECT numeric_precision, numeric_scale FROM information_schema.columns WHERE table_name = 'results' AND column_name = 'percentage'")).rows[0];
    assert.deepEqual([Number(col.numeric_precision), Number(col.numeric_scale)], [5, 2]);
  });
});

// Each test file runs in its own process and starts its own embedded server: stop it here (no-op without TEST_DB=pg).
describe('teardown (pg-real)', () => {
  it('closes the database pools and stops the embedded PostgreSQL', async () => {
    await stopPg();
  });
});
