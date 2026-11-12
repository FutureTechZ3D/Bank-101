import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { freshDb, startServer, call, register, uniqueName, PASSWORD, stopPg } from './helpers';
import { createApp } from '../src/app';
import { setPool, query, withTransaction } from '../src/config/db';
import { jwtSecret } from '../src/config/env';
import { setGoogleVerifier } from '../src/modules/auth/auth.controller';

type Ctx = { base: string; pool: any; close: () => Promise<void> };

async function boot(): Promise<Ctx> {
  const { pool } = await freshDb();
  const s = await startServer();
  return { base: s.base, pool, close: s.close };
}

async function correctMap(pool: any, quizId = 1): Promise<Record<number, string>> {
  const r = await pool.query(
    `SELECT o.question_id, o.label FROM options o JOIN quiz_question_map m ON m.question_id = o.question_id
      WHERE m.quiz_id = ${quizId} AND o.is_correct = true`
  );
  const map: Record<number, string> = {};
  r.rows.forEach((x: any) => (map[x.question_id] = String(x.label).trim()));
  return map;
}

async function startAttempt(c: Ctx, token: string, quizId = 1): Promise<number> {
  const r = await call(c.base, 'POST', '/api/v1/attempts/start', { token, body: { quiz_id: quizId } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json.attempt_id;
}

// ---------------------------------------------------------------- configuration
describe('configuration (no unsafe defaults)', () => {
  it('JWT_SECRET must come from the environment: missing, short and the old public secret are all refused', () => {
    const keep = process.env.JWT_SECRET;
    try {
      delete process.env.JWT_SECRET;
      assert.throws(() => jwtSecret(), /JWT_SECRET/);
      process.env.JWT_SECRET = 'short';
      assert.throws(() => jwtSecret(), /JWT_SECRET/);
      process.env.JWT_SECRET = 'bank101_secret_key_jwt_authentication_2026';
      assert.throws(() => jwtSecret(), /old public example/);
    } finally {
      process.env.JWT_SECRET = keep;
    }
    assert.ok(jwtSecret().length >= 16);
  });

  it('there is no silent mock database: with no pool and no DATABASE_URL a query FAILS', async () => {
    const keepUrl = process.env.DATABASE_URL;
    setPool(null);
    delete process.env.DATABASE_URL;
    await assert.rejects(() => query('SELECT 1'), /DATABASE_URL/);
    if (keepUrl) process.env.DATABASE_URL = keepUrl;
  });

  // NOTE: pg-mem ignores BEGIN/ROLLBACK (measured: 3 inserts inside rolled-back transactions all stayed), so real
  // rollback behaviour cannot be proven here. What CAN be proven is that withTransaction sends the right commands
  // in the right order and always releases the connection. Real atomicity needs a run against PostgreSQL (open item).
  it('withTransaction sends BEGIN..COMMIT on success and BEGIN..ROLLBACK on error, and always releases the client', async () => {
    const log: string[] = [];
    const client = { query: async (t: string) => (log.push(t), { rows: [] }), release: () => log.push('RELEASE') };
    setPool({ query: async () => ({ rows: [] }), connect: async () => client });
    await withTransaction(async (q) => {
      await q('INSERT ONE');
    });
    assert.deepEqual(log, ['BEGIN', 'INSERT ONE', 'COMMIT', 'RELEASE']);
    log.length = 0;
    await assert.rejects(
      () =>
        withTransaction(async (q) => {
          await q('INSERT TWO');
          throw new Error('boom');
        }),
      /boom/
    );
    assert.deepEqual(log, ['BEGIN', 'INSERT TWO', 'ROLLBACK', 'RELEASE']);
  });
});

// ---------------------------------------------------------------- authentication
describe('authentication', () => {
  let c: Ctx;
  before(async () => (c = await boot()));
  after(async () => c.close());

  it('register returns a token and a public user (no password hash)', async () => {
    const r = await call(c.base, 'POST', '/api/v1/auth/register', { body: { username: 'alice01', password: PASSWORD, phone: '9876543210' } });
    assert.equal(r.status, 201);
    assert.ok(r.json.token);
    assert.equal(r.json.user.username, 'alice01');
    assert.equal(r.json.user.account_type, 'Free');
    assert.equal('password_hash' in r.json.user, false);
  });

  it('a client can NOT choose its own role at registration', async () => {
    const r = await call(c.base, 'POST', '/api/v1/auth/register', { body: { username: 'mallory', password: PASSWORD, account_type: 'Admin' } });
    assert.equal(r.status, 201);
    assert.equal(r.json.user.account_type, 'Free');
    const row = await c.pool.query("SELECT account_type FROM users WHERE username = 'mallory'");
    assert.equal(row.rows[0].account_type, 'Free');
  });

  it('rejects weak or malformed registrations', async () => {
    for (const body of [
      { username: 'ab', password: PASSWORD },
      { username: 'bad name!', password: PASSWORD },
      { username: 'okname', password: 'short' },
      { username: 'okname', password: 'x'.repeat(100) },
      { username: 'okname', password: PASSWORD, phone: 'abc' },
      { username: 123, password: PASSWORD },
      {},
    ]) {
      const r = await call(c.base, 'POST', '/api/v1/auth/register', { body });
      assert.equal(r.status, 400, JSON.stringify(body));
    }
  });

  it('duplicate usernames are refused, case-insensitively', async () => {
    const r = await call(c.base, 'POST', '/api/v1/auth/register', { body: { username: 'ALICE01', password: PASSWORD } });
    assert.equal(r.status, 409);
  });

  it('login works; wrong password and unknown user give the SAME 401 message', async () => {
    const ok = await call(c.base, 'POST', '/api/v1/auth/login', { body: { username: 'alice01', password: PASSWORD } });
    assert.equal(ok.status, 200);
    const wrong = await call(c.base, 'POST', '/api/v1/auth/login', { body: { username: 'alice01', password: 'wrong-password-1' } });
    const none = await call(c.base, 'POST', '/api/v1/auth/login', { body: { username: 'nobody_here', password: PASSWORD } });
    assert.equal(wrong.status, 401);
    assert.equal(none.status, 401);
    assert.equal(wrong.json.message, none.json.message);
  });

  it('REGRESSION: the old "any password works for a malformed hash" bypass is gone', async () => {
    // These are exactly the seed hashes the old mock database shipped with.
    const bad = '$2a$10$gJ6c4b2pA8b0y.6d2.K3U.3U9w9e7d9e7d9e7d9e7d9e7d9e7d9e';
    await c.pool.query("INSERT INTO users (username, password_hash, account_type) VALUES ('karthik', $1, 'Free')", [bad]);
    for (const pw of ['anything-at-all', bad, 'karthik123']) {
      const r = await call(c.base, 'POST', '/api/v1/auth/login', { body: { username: 'karthik', password: pw } });
      assert.equal(r.status, 401, 'password ' + pw);
    }
  });

  it('REGRESSION: a token signed with the old hard-coded secret is rejected', async () => {
    const forged = jwt.sign({ id: 1, username: 'alice01', account_type: 'Free' }, 'bank101_secret_key_jwt_authentication_2026');
    const r = await call(c.base, 'GET', '/api/v1/exams/categories', { token: forged });
    assert.equal(r.status, 403);
  });

  it('protected routes need a token: none -> 401, garbage -> 403', async () => {
    assert.equal((await call(c.base, 'GET', '/api/v1/exams/categories')).status, 401);
    assert.equal((await call(c.base, 'GET', '/api/v1/exams/categories', { token: 'not.a.jwt' })).status, 403);
  });

  it('login rate limit: the 4th attempt from one IP in the window gets 429', async () => {
    const keep = process.env.AUTH_RATE_MAX;
    process.env.AUTH_RATE_MAX = '3';
    const s = await startServer(createApp());
    process.env.AUTH_RATE_MAX = keep;
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) codes.push((await call(s.base, 'POST', '/api/v1/auth/login', { body: { username: 'alice01', password: 'wrong-password-1' } })).status);
    await s.close();
    assert.deepEqual(codes, [401, 401, 401, 429, 429]);
  });

  it('server errors do not leak internal text', async () => {
    const u = await register(c.base);
    const realPool = c.pool;
    setPool({
      query: async () => {
        throw new Error('SECRET_INTERNAL_DETAIL password=hunter2 at db.host.internal');
      },
    });
    const r = await call(c.base, 'GET', '/api/v1/exams/categories', { token: u.token });
    setPool(realPool);
    assert.equal(r.status, 500);
    assert.equal(r.json.message, 'Internal server error');
    assert.doesNotMatch(JSON.stringify(r.json), /SECRET_INTERNAL|hunter2|db\.host/);
  });

  it('bad JSON bodies get a clean 400', async () => {
    const r = await call(c.base, 'POST', '/api/v1/auth/login', { raw: '{"username": ' });
    assert.equal(r.status, 400);
  });
});

// ---------------------------------------------------------------- profile (no self-promotion)
describe('profile update', () => {
  let c: Ctx;
  before(async () => (c = await boot()));
  after(async () => c.close());

  it('points and streak can never be set by the client', async () => {
    const u = await register(c.base);
    const r = await call(c.base, 'PUT', '/api/v1/auth/update', { token: u.token, body: { points: 999999 } });
    assert.equal(r.status, 400);
    const r2 = await call(c.base, 'PUT', '/api/v1/auth/update', { token: u.token, body: { streak_days: 400 } });
    assert.equal(r2.status, 400);
    const row = await c.pool.query('SELECT points FROM users WHERE username = $1', [u.username]);
    assert.equal(row.rows[0].points, 0);
  });

  it('account_type is locked unless ENABLE_TIER_TOGGLE=true; Admin is never settable', async () => {
    const u = await register(c.base);
    delete process.env.ENABLE_TIER_TOGGLE;
    assert.equal((await call(c.base, 'PUT', '/api/v1/auth/update', { token: u.token, body: { account_type: 'Pro' } })).status, 403);
    process.env.ENABLE_TIER_TOGGLE = 'true';
    try {
      const pro = await call(c.base, 'PUT', '/api/v1/auth/update', { token: u.token, body: { account_type: 'Pro' } });
      assert.equal(pro.status, 200);
      assert.equal(pro.json.user.account_type, 'Pro');
      const admin = await call(c.base, 'PUT', '/api/v1/auth/update', { token: u.token, body: { account_type: 'Admin' } });
      assert.equal(admin.status, 400);
      const row = await c.pool.query('SELECT account_type FROM users WHERE username = $1', [u.username]);
      assert.equal(row.rows[0].account_type, 'Pro');
    } finally {
      delete process.env.ENABLE_TIER_TOGGLE;
    }
  });

  it('phone can be updated and is validated', async () => {
    const u = await register(c.base);
    const ok = await call(c.base, 'PUT', '/api/v1/auth/update', { token: u.token, body: { phone: '9000000001' } });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.user.phone, '9000000001');
    assert.equal((await call(c.base, 'PUT', '/api/v1/auth/update', { token: u.token, body: { phone: '<script>' } })).status, 400);
  });
});

// ---------------------------------------------------------------- Google sign-in
describe('google sign-in', () => {
  let c: Ctx;
  before(async () => (c = await boot()));
  after(async () => {
    setGoogleVerifier(null);
    await c.close();
  });

  it('is disabled (501) when GOOGLE_CLIENT_ID is not configured', async () => {
    setGoogleVerifier(null);
    const r = await call(c.base, 'POST', '/api/v1/auth/google-oauth', { body: { id_token: 'x' } });
    assert.equal(r.status, 501);
  });

  it('the old unauthenticated body {email, google_id} is refused (no id_token)', async () => {
    const r = await call(c.base, 'POST', '/api/v1/auth/google-oauth', { body: { email: 'victim@example.com', name: 'x', google_id: 'whatever' } });
    assert.equal(r.status, 400);
  });

  it('a token Google rejects gives 401', async () => {
    setGoogleVerifier(async () => {
      throw new Error('bad token');
    });
    assert.equal((await call(c.base, 'POST', '/api/v1/auth/google-oauth', { body: { id_token: 'x' } })).status, 401);
  });

  it('a verified token creates an account, and signing in again returns the SAME account', async () => {
    setGoogleVerifier(async () => ({ sub: 'google-sub-111', email: 'newperson@example.com', name: 'New Person' }));
    const a = await call(c.base, 'POST', '/api/v1/auth/google-oauth', { body: { id_token: 't1' } });
    const b = await call(c.base, 'POST', '/api/v1/auth/google-oauth', { body: { id_token: 't2' } });
    assert.equal(a.status, 200);
    assert.equal(a.json.user.id, b.json.user.id);
    assert.equal(a.json.user.account_type, 'Free');
  });

  it('REGRESSION: a Google account can NOT take over an existing password account with the same e-mail prefix', async () => {
    const victim = await register(c.base, 'victim99');
    setGoogleVerifier(async () => ({ sub: 'google-sub-222', email: 'victim99@evil.example', name: 'Attacker' }));
    const r = await call(c.base, 'POST', '/api/v1/auth/google-oauth', { body: { id_token: 't' } });
    assert.equal(r.status, 200);
    assert.notEqual(r.json.user.id, victim.user.id);
    assert.notEqual(r.json.user.username, 'victim99');
  });
});

// ---------------------------------------------------------------- admin
describe('admin routes', () => {
  let c: Ctx;
  let adminToken: string;
  before(async () => {
    c = await boot();
    const hash = await bcrypt.hash('admin-passphrase-123', 10);
    await c.pool.query("INSERT INTO users (username, password_hash, account_type) VALUES ('theadmin', $1, 'Admin')", [hash]);
    const r = await call(c.base, 'POST', '/api/v1/auth/login', { body: { username: 'theadmin', password: 'admin-passphrase-123' } });
    adminToken = r.json.token;
  });
  after(async () => c.close());

  const good = {
    topic: 'Audit Topic',
    quizzesData: [
      {
        quiz_name: 'Audit Quiz 1',
        questions: [
          { question: 'What is 2 + 2?', options: { A: '3', B: '4', C: '5', D: '6' }, correct_option: 'B', explanation: 'Two plus two is four.' },
          { question: 'What is 3 + 3?', options: { A: '6', B: '7', C: '8', D: '9' }, correct_option: 'A' },
        ],
      },
    ],
  };

  it('REGRESSION: /admin/stats and /admin/upload-quiz need a token (they used to need nothing)', async () => {
    assert.equal((await call(c.base, 'GET', '/api/v1/admin/stats')).status, 401);
    assert.equal((await call(c.base, 'POST', '/api/v1/admin/upload-quiz', { body: good })).status, 401);
  });

  it('a normal user gets 403', async () => {
    const u = await register(c.base);
    assert.equal((await call(c.base, 'GET', '/api/v1/admin/stats', { token: u.token })).status, 403);
    assert.equal((await call(c.base, 'POST', '/api/v1/admin/upload-quiz', { token: u.token, body: good })).status, 403);
  });

  it('a token that CLAIMS Admin is not trusted: the role is read from the database', async () => {
    const u = await register(c.base);
    const lie = jwt.sign({ id: u.user.id, username: u.username, account_type: 'Admin' }, jwtSecret());
    assert.equal((await call(c.base, 'GET', '/api/v1/admin/stats', { token: lie })).status, 403);
  });

  it('the real admin sees database numbers and no password hashes', async () => {
    const r = await call(c.base, 'GET', '/api/v1/admin/stats', { token: adminToken });
    assert.equal(r.status, 200);
    assert.equal(r.json.totalQuizzes, 1);
    assert.equal(r.json.totalQuestions, 10);
    assert.ok(r.json.totalUsers >= 2);
    assert.doesNotMatch(JSON.stringify(r.json), /password/i);
  });

  it('invalid upload payloads are refused with 400 and nothing is written', async () => {
    const before = Number((await c.pool.query('SELECT count(*) AS c FROM quiz_tests')).rows[0].c);
    const bad = [
      { topic: '', quizzesData: good.quizzesData },
      { topic: 'T', quizzesData: [] },
      { topic: 'T', quizzesData: [{ quiz_name: 'Q', questions: [{ question: 'x', options: { A: '1', B: '2', C: '3' }, correct_option: 'A' }] }] },
      { topic: 'T', quizzesData: [{ quiz_name: 'Q', questions: [{ question: 'x', options: { A: '1', B: '2', C: '3', D: '4' }, correct_option: 'E' }] }] },
      { topic: 'T', quizzesData: [good.quizzesData[0], { quiz_name: 'Q2', questions: [] }] },
    ];
    for (const body of bad) assert.equal((await call(c.base, 'POST', '/api/v1/admin/upload-quiz', { token: adminToken, body })).status, 400, JSON.stringify(body).slice(0, 80));
    const after_ = Number((await c.pool.query('SELECT count(*) AS c FROM quiz_tests')).rows[0].c);
    assert.equal(after_, before);
  });

  it('REGRESSION: an uploaded quiz is stored in the DATABASE and is playable through the normal endpoints', async () => {
    const up = await call(c.base, 'POST', '/api/v1/admin/upload-quiz', { token: adminToken, body: good });
    assert.equal(up.status, 200, JSON.stringify(up.json));
    assert.equal(up.json.quizzes, 1);
    assert.equal(up.json.questions, 2);
    const row = await c.pool.query("SELECT id FROM quiz_tests WHERE name = 'Audit Quiz 1'");
    assert.equal(row.rows.length, 1);
    const quizId = row.rows[0].id;

    const u = await register(c.base);
    const list = await call(c.base, 'GET', '/api/v1/quizzes/Audit%20Topic', { token: u.token });
    assert.equal(list.status, 200);
    assert.equal(list.json.quizzes.length, 1);
    assert.equal(list.json.quizzes[0].questions.length, 2);

    const qs = await call(c.base, 'GET', `/api/v1/questions?quiz_id=${quizId}`, { token: u.token });
    assert.equal(qs.json.questions.length, 2);
    assert.deepEqual(Object.keys(qs.json.questions[0].options).sort(), ['A', 'B', 'C', 'D']);
    assert.doesNotMatch(JSON.stringify(qs.json), /is_correct|correct_answer|correct_option/);

    // play it and score it
    const attempt = await startAttempt(c, u.token, quizId);
    const map = await correctMap(c.pool, quizId);
    for (const [qid, label] of Object.entries(map)) {
      assert.equal((await call(c.base, 'POST', '/api/v1/attempts/answer', { token: u.token, body: { attempt_id: attempt, question_id: Number(qid), selected_option: label } })).status, 200);
    }
    const sub = await call(c.base, 'POST', '/api/v1/attempts/submit', { token: u.token, body: { attempt_id: attempt } });
    assert.equal(sub.json.results.correct, 2);
    assert.equal(sub.json.results.total, 2);
  });
});

// ---------------------------------------------------------------- quiz engine
describe('quiz engine (server-side scoring)', () => {
  let c: Ctx;
  let correct: Record<number, string>;
  before(async () => {
    c = await boot();
    correct = await correctMap(c.pool, 1);
  });
  after(async () => c.close());

  const answer = (token: string, attempt: number, qid: number, label: string) =>
    call(c.base, 'POST', '/api/v1/attempts/answer', { token, body: { attempt_id: attempt, question_id: qid, selected_option: label } });

  it('catalogue endpoints read the database (10 categories, the seeded quiz has 10 questions)', async () => {
    const u = await register(c.base);
    const cats = await call(c.base, 'GET', '/api/v1/exams/categories', { token: u.token });
    assert.equal(cats.json.categories.length, 10);
    const quizzes = await call(c.base, 'GET', '/api/v1/quizzes', { token: u.token });
    assert.equal(quizzes.json.quizzes.length, 1);
    assert.equal(quizzes.json.quizzes.find((q: any) => q.quiz_id === 1).questions.length, 10);
    assert.equal((await call(c.base, 'GET', '/api/v1/exams/types?category_id=abc', { token: u.token })).status, 400);
  });

  it('REGRESSION: the menu name "Simplification" (a SUBJECT) finds the quizzes; a topic name and an id work too; unknown gives []', async () => {
    const u = await register(c.base);
    const bySubject = await call(c.base, 'GET', '/api/v1/quizzes/Simplification', { token: u.token });
    assert.equal(bySubject.json.quizzes.length, 1);
    const byTopic = await call(c.base, 'GET', '/api/v1/quizzes/BODMAS%20Rule', { token: u.token });
    assert.equal(byTopic.json.quizzes.length, 1);
    const byId = await call(c.base, 'GET', '/api/v1/quizzes?topic_id=1', { token: u.token });
    assert.equal(byId.json.quizzes.length, 1);
    const none = await call(c.base, 'GET', '/api/v1/quizzes/No%20Such%20Thing', { token: u.token });
    assert.deepEqual(none.json.quizzes, []);
    // REGRESSION (found by the frontend e2e run): after an admin imports a TOPIC named "Simplification", the subject's
    // the subject's seeded quiz must not disappear, and the imported quiz must appear too.
    await c.pool.query("INSERT INTO topics (subject_id, name) VALUES (1, 'Simplification')");
    const tq = await c.pool.query("INSERT INTO quiz_tests (topic_id, name, total_qs, duration_mins) VALUES ((SELECT max(id) FROM topics), 'Imported Quiz', 1, 1) RETURNING id");
    assert.ok(tq.rows[0].id);
    const both = await call(c.base, 'GET', '/api/v1/quizzes/Simplification', { token: u.token });
    assert.equal(both.json.quizzes.length, 2);
    // a subject with no quizzes (seed has none for Vocabulary) is empty, not an error
    const empty = await call(c.base, 'GET', '/api/v1/quizzes/Vocabulary', { token: u.token });
    assert.equal(empty.status, 200);
    assert.deepEqual(empty.json.quizzes, []);
  });

  it('questions never reveal the answer', async () => {
    const u = await register(c.base);
    const r = await call(c.base, 'GET', '/api/v1/questions?quiz_id=1', { token: u.token });
    assert.equal(r.json.questions.length, 10);
    assert.doesNotMatch(JSON.stringify(r.json), /is_correct|correct_answer|explanation/);
    assert.equal((await call(c.base, 'GET', '/api/v1/questions', { token: u.token })).status, 400);
  });

  it('perfect run: 10/10, 100 percent, 100 points; the result row is in the database', async () => {
    const u = await register(c.base);
    const attempt = await startAttempt(c, u.token);
    for (const [qid, label] of Object.entries(correct)) assert.equal((await answer(u.token, attempt, Number(qid), label)).status, 200);
    const sub = await call(c.base, 'POST', '/api/v1/attempts/submit', { token: u.token, body: { attempt_id: attempt } });
    assert.equal(sub.status, 200);
    assert.equal(sub.json.results.correct, 10);
    assert.equal(sub.json.results.wrong, 0);
    assert.equal(sub.json.results.unanswered, 0);
    assert.equal(Number(sub.json.results.percentage), 100);
    assert.equal(sub.json.points_gained, 100);
    assert.equal(sub.json.user.points, 100);
    const row = await c.pool.query('SELECT correct, total FROM results WHERE attempt_id = $1', [attempt]);
    assert.equal(row.rows[0].correct, 10);
  });

  it('mixed run: 4 right (one corrected), 2 wrong, 4 skipped -> 40 percent (a changed answer counts once)', async () => {
    const u = await register(c.base);
    const attempt = await startAttempt(c, u.token);
    const ids = Object.keys(correct).map(Number);
    const wrongLabel = (id: number) => (correct[id] === 'A' ? 'B' : 'A');
    for (const id of ids.slice(0, 3)) await answer(u.token, attempt, id, correct[id]);
    for (const id of ids.slice(3, 5)) await answer(u.token, attempt, id, wrongLabel(id));
    await answer(u.token, attempt, ids[5], wrongLabel(ids[5])); // wrong first ...
    await answer(u.token, attempt, ids[5], correct[ids[5]]); // ... then corrected: must not double count
    const dup = await c.pool.query('SELECT count(*) AS c FROM attempt_answers WHERE attempt_id = $1', [attempt]);
    assert.equal(Number(dup.rows[0].c), 6);
    const sub = await call(c.base, 'POST', '/api/v1/attempts/submit', { token: u.token, body: { attempt_id: attempt } });
    assert.equal(sub.json.results.correct, 4);
    assert.equal(sub.json.results.wrong, 2);
    assert.equal(sub.json.results.unanswered, 4);
    assert.equal(Number(sub.json.results.percentage), 40);
  });

  it('REGRESSION: a second submit is refused (409) and cannot farm points', async () => {
    const u = await register(c.base);
    const attempt = await startAttempt(c, u.token);
    for (const [qid, label] of Object.entries(correct)) await answer(u.token, attempt, Number(qid), label);
    const first = await call(c.base, 'POST', '/api/v1/attempts/submit', { token: u.token, body: { attempt_id: attempt } });
    assert.equal(first.status, 200);
    for (let i = 0; i < 3; i++) assert.equal((await call(c.base, 'POST', '/api/v1/attempts/submit', { token: u.token, body: { attempt_id: attempt } })).status, 409);
    const row = await c.pool.query('SELECT points, streak_days FROM users WHERE username = $1', [u.username]);
    assert.equal(row.rows[0].points, 100);
    assert.equal(row.rows[0].streak_days, 1);
  });

  it('REGRESSION: other people\'s attempts are invisible: answer, submit, hint, hint count and result all give 404', async () => {
    const a = await register(c.base);
    const b = await register(c.base);
    const attempt = await startAttempt(c, a.token);
    const qid = Number(Object.keys(correct)[0]);
    assert.equal((await answer(b.token, attempt, qid, 'A')).status, 404);
    assert.equal((await call(c.base, 'POST', '/api/v1/attempts/submit', { token: b.token, body: { attempt_id: attempt } })).status, 404);
    assert.equal((await call(c.base, 'POST', '/api/v1/hints/use', { token: b.token, body: { quiz_attempt_id: attempt, question_id: qid } })).status, 404);
    assert.equal((await call(c.base, 'GET', `/api/v1/hints/count?quiz_attempt_id=${attempt}`, { token: b.token })).status, 404);
    await answer(a.token, attempt, qid, correct[qid]);
    await call(c.base, 'POST', '/api/v1/attempts/submit', { token: a.token, body: { attempt_id: attempt } });
    assert.equal((await call(c.base, 'GET', `/api/v1/results/${attempt}`, { token: b.token })).status, 404);
    assert.equal((await call(c.base, 'GET', `/api/v1/results/${attempt}`, { token: a.token })).status, 200);
    const stored = await c.pool.query('SELECT count(*) AS c FROM attempt_answers WHERE attempt_id = $1', [attempt]);
    assert.equal(Number(stored.rows[0].c), 1); // b wrote nothing into a's attempt
  });

  it('answers are refused after submit (409), after the timer (403), for a foreign question (400) and for option E (400)', async () => {
    const u = await register(c.base);
    const ids = Object.keys(correct).map(Number);

    const late = await startAttempt(c, u.token);
    await c.pool.query("UPDATE quiz_attempts SET started_at = $1 WHERE id = $2", [new Date(Date.now() - 3 * 3600 * 1000), late]);
    assert.equal((await answer(u.token, late, ids[0], 'A')).status, 403);

    const open = await startAttempt(c, u.token);
    assert.equal((await answer(u.token, open, ids[0], 'E')).status, 400);
    assert.equal((await answer(u.token, open, 999999, 'A')).status, 400); // not in this quiz
    assert.equal((await answer(u.token, open, ids[0], 'A')).status, 200);
    await call(c.base, 'POST', '/api/v1/attempts/submit', { token: u.token, body: { attempt_id: open } });
    assert.equal((await answer(u.token, open, ids[1], 'A')).status, 409);
    assert.equal((await call(c.base, 'POST', '/api/v1/attempts/start', { token: u.token, body: { quiz_id: 424242 } })).status, 404);
    assert.equal((await call(c.base, 'POST', '/api/v1/attempts/start', { token: u.token, body: { quiz_id: 'abc' } })).status, 400);
  });

  it('result review contains the correct answer, the user choice and the explanation', async () => {
    const u = await register(c.base);
    const attempt = await startAttempt(c, u.token);
    const id = Number(Object.keys(correct)[0]);
    const wrong = correct[id] === 'A' ? 'B' : 'A';
    await answer(u.token, attempt, id, wrong);
    await call(c.base, 'POST', '/api/v1/attempts/submit', { token: u.token, body: { attempt_id: attempt } });
    const r = await call(c.base, 'GET', `/api/v1/results/${attempt}`, { token: u.token });
    assert.equal(r.status, 200);
    const item = r.json.review.find((x: any) => x.id === id);
    assert.equal(item.correct_answer, correct[id]);
    assert.equal(item.selected_option, wrong);
    assert.ok(item.explanation.length > 5);
  });
});

// ---------------------------------------------------------------- hints / tiers
describe('hints and tiers', () => {
  let c: Ctx;
  let qid: number;
  before(async () => {
    c = await boot();
    qid = Number(Object.keys(await correctMap(c.pool, 1))[0]);
  });
  after(async () => c.close());

  const hint = (token: string, attempt: number, q = qid) => call(c.base, 'POST', '/api/v1/hints/use', { token, body: { quiz_attempt_id: attempt, question_id: q } });

  it('Free: 10 hints per attempt (answer only, no explanation), the 11th is refused', async () => {
    const u = await register(c.base);
    const attempt = await startAttempt(c, u.token);
    let last: any;
    for (let i = 1; i <= 10; i++) {
      last = await hint(u.token, attempt);
      assert.equal(last.status, 200, 'hint ' + i);
      assert.equal(last.json.remaining_hints, 10 - i);
      assert.equal('explanation' in last.json, false);
      assert.ok(['A', 'B', 'C', 'D'].includes(last.json.correct_answer));
    }
    assert.equal((await hint(u.token, attempt)).status, 403);
    const cnt = await call(c.base, 'GET', `/api/v1/hints/count?quiz_attempt_id=${attempt}`, { token: u.token });
    assert.equal(cnt.json.remaining, 0);
    // a NEW attempt has a fresh quota of 10
    const fresh = await startAttempt(c, u.token);
    assert.equal((await hint(u.token, fresh)).status, 200);
  });

  it('REGRESSION: a Free user cannot reset the quota by passing an invented attempt id', async () => {
    const u = await register(c.base);
    const attempt = await startAttempt(c, u.token);
    for (let i = 0; i < 10; i++) await hint(u.token, attempt);
    assert.equal((await hint(u.token, attempt)).status, 403);
    assert.equal((await hint(u.token, 987654)).status, 404);
  });

  it('Pro: unlimited hints with the explanation; the tier is read from the DATABASE, not the token', async () => {
    const u = await register(c.base); // token says Free
    await c.pool.query("UPDATE users SET account_type = 'Pro' WHERE username = $1", [u.username]);
    const attempt = await startAttempt(c, u.token);
    for (let i = 0; i < 12; i++) {
      const r = await hint(u.token, attempt);
      assert.equal(r.status, 200);
      assert.ok(r.json.explanation.length > 5);
    }
    assert.equal((await call(c.base, 'GET', `/api/v1/hints/count?quiz_attempt_id=${attempt}`, { token: u.token })).json.unlimited, true);

    // reverse: token claims Pro, database says Free -> Free limits apply
    const f = await register(c.base);
    const proToken = jwt.sign({ id: f.user.id, username: f.username, account_type: 'Pro' }, jwtSecret());
    const att2 = await startAttempt(c, proToken);
    for (let i = 0; i < 10; i++) assert.equal((await hint(proToken, att2)).status, 200);
    assert.equal((await hint(proToken, att2)).status, 403);
  });

  it('hints are refused on a submitted attempt (409) and for a question outside the quiz (400)', async () => {
    const u = await register(c.base);
    const attempt = await startAttempt(c, u.token);
    assert.equal((await hint(u.token, attempt, 999999)).status, 400);
    await call(c.base, 'POST', '/api/v1/attempts/submit', { token: u.token, body: { attempt_id: attempt } });
    assert.equal((await hint(u.token, attempt)).status, 409);
  });
});

// ---------------------------------------------------------------- leaderboard, certificates, analytics
describe('leaderboard, certificates and analytics come from real data', () => {
  let c: Ctx;
  let correct: Record<number, string>;
  before(async () => {
    c = await boot();
    correct = await correctMap(c.pool, 1);
  });
  after(async () => c.close());

  async function play(token: string, rightCount: number) {
    const attempt = await startAttempt(c, token);
    const ids = Object.keys(correct).map(Number);
    for (const [i, id] of ids.entries()) {
      const label = i < rightCount ? correct[id] : correct[id] === 'A' ? 'B' : 'A';
      await call(c.base, 'POST', '/api/v1/attempts/answer', { token, body: { attempt_id: attempt, question_id: id, selected_option: label } });
    }
    const sub = await call(c.base, 'POST', '/api/v1/attempts/submit', { token, body: { attempt_id: attempt } });
    assert.equal(sub.status, 200);
    return attempt;
  }

  it('leaderboard ranks REAL users by points and does not list admins', async () => {
    await c.pool.query("INSERT INTO users (username, password_hash, account_type, points) VALUES ('boss', 'x', 'Admin', 99999)");
    const low = await register(c.base);
    const high = await register(c.base);
    await play(low.token, 2); // 20 points
    await play(high.token, 9); // 90 points
    const r = await call(c.base, 'GET', '/api/v1/leaderboard', { token: low.token });
    assert.equal(r.status, 200);
    const names = r.json.leaderboard.map((x: any) => x.username);
    assert.ok(names.indexOf(high.username) < names.indexOf(low.username));
    assert.ok(!names.includes('boss'));
    assert.ok(!names.includes('karthik') && !names.includes('priya')); // the old fake users
    assert.equal(r.json.leaderboard.find((x: any) => x.username === high.username).points, 90);
  });

  it('certificate only for >= 80 percent, with a STABLE id', async () => {
    const u = await register(c.base);
    await play(u.token, 5);
    assert.equal((await call(c.base, 'GET', '/api/v1/certificates', { token: u.token })).json.certificates.length, 0);
    const good = await play(u.token, 9);
    const a = await call(c.base, 'GET', '/api/v1/certificates', { token: u.token });
    const b = await call(c.base, 'GET', '/api/v1/certificates', { token: u.token });
    assert.equal(a.json.certificates.length, 1);
    assert.equal(a.json.certificates[0].id, good);
    assert.equal(a.json.certificates[0].percentage, 90);
    assert.equal(a.json.certificates[0].certificate_id, b.json.certificates[0].certificate_id);
  });

  it('analytics add up for the user and are isolated per user', async () => {
    const u = await register(c.base);
    const other = await register(c.base);
    await play(u.token, 10);
    await play(u.token, 4);
    await play(other.token, 1);
    const r = await call(c.base, 'GET', '/api/v1/analytics', { token: u.token });
    const a = r.json.analytics;
    assert.equal(a.totalAttempts, 2);
    assert.equal(a.totalCorrect, 14);
    assert.equal(a.totalQuestions, 20);
    assert.equal(a.averagePercentage, 70);
    assert.equal(a.weeklyProgress.length, 2);
    assert.equal(a.topicsPerformance[0].accuracy, 70);
    const empty = await register(c.base);
    assert.equal((await call(c.base, 'GET', '/api/v1/analytics', { token: empty.token })).json.analytics.totalAttempts, 0);
  });
});

// ---------------------------------------------------------------- CORS
describe('CORS', () => {
  let c: Ctx;
  before(async () => (c = await boot()));
  after(async () => c.close());

  it('an unknown website origin gets no CORS permission; the app origin does', async () => {
    const evil = await call(c.base, 'GET', '/health', { headers: { Origin: 'https://evil.example' } });
    assert.equal(evil.headers.get('access-control-allow-origin'), null);
    const ok = await call(c.base, 'GET', '/health', { headers: { Origin: 'http://localhost:5173' } });
    assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  });

  it('unknown routes give a JSON 404', async () => {
    const r = await call(c.base, 'GET', '/nope');
    assert.equal(r.status, 404);
  });
});

// Must stay the LAST suite: closes every pool and stops the embedded PostgreSQL (only started when TEST_DB=pg).
// A root-level after() hook ran too early and cancelled running suites.
describe('teardown', () => {
  it('closes the database pools and stops the embedded PostgreSQL', async () => {
    await stopPg();
  });
});
