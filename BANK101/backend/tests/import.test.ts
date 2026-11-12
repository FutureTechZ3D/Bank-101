/**
 * Question-bank import: option E support, validation, idempotency, and the REAL verified bank
 * (database/import/verified.json, produced by extract_pdfs.py + verify.py) loaded end to end.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { freshDb, startServer, call, register, stopPg } from './helpers';
import { importQuizzes, validatePayload } from '../src/modules/admin/importQuizzes';

type Ctx = { base: string; pool: any; close: () => Promise<void> };
const VERIFIED = path.resolve(__dirname, '..', '..', 'database', 'import', 'verified.json');

const five = (extra: Record<string, any> = {}) => ({
  question: '2 + 2 = ?',
  options: { A: '3', B: '4', C: '5', D: '6', E: 'None of these' },
  correct_option: 'B',
  explanation: 'x',
  ...extra,
});

describe('payload validation (options A-D required, E optional)', () => {
  const ok = (qs: any[]) => validatePayload('T', [{ quiz_name: 'Q', questions: qs }]);

  it('accepts four options and five options', () => {
    assert.equal(ok([five({ options: { A: '3', B: '4', C: '5', D: '6' } })]), null);
    assert.equal(ok([five()]), null);
    assert.equal(ok([five({ correct_option: 'E' })]), null);
  });
  it('refuses E as the answer when there is no option E', () => {
    assert.match(ok([five({ options: { A: '3', B: '4', C: '5', D: '6' }, correct_option: 'E' })])!, /correct_option/);
  });
  it('refuses unknown labels, an empty E, duplicate option texts and a missing required option', () => {
    assert.match(ok([five({ options: { A: '3', B: '4', C: '5', D: '6', F: '7' } })])!, /unknown option label F/);
    assert.match(ok([five({ options: { A: '3', B: '4', C: '5', D: '6', E: '  ' } })])!, /option E/);
    assert.match(ok([five({ options: { A: '3', B: '3', C: '5', D: '6' } })])!, /same text/);
    assert.match(ok([five({ options: { A: '3', B: '4', C: '5' } })])!, /option D is required/);
  });
});

describe('five-option questions end to end (API + database)', () => {
  let c: Ctx;
  let adminToken: string;
  before(async () => {
    const { pool } = await freshDb();
    const s = await startServer();
    c = { base: s.base, pool, close: s.close };
    await pool.query("INSERT INTO users (username, password_hash, account_type) VALUES ('theadmin', $1, 'Admin')", [await bcrypt.hash('admin-passphrase-123', 10)]);
    adminToken = (await call(c.base, 'POST', '/api/v1/auth/login', { body: { username: 'theadmin', password: 'admin-passphrase-123' } })).json.token;
  });
  after(async () => c.close());

  it('upload accepts option E and refuses a bad payload with the reason', async () => {
    const bad = await call(c.base, 'POST', '/api/v1/admin/upload-quiz', { token: adminToken, body: { topic: 'Five', quizzesData: [{ quiz_name: 'Bad', questions: [five({ correct_option: 'F' })] }] } });
    assert.equal(bad.status, 400);
    const good = await call(c.base, 'POST', '/api/v1/admin/upload-quiz', {
      token: adminToken,
      body: { topic: 'Five Option Topic', quizzesData: [{ quiz_name: 'Five Quiz', questions: [five(), five({ question: '5 - 5 = ?', options: { A: '1', B: '2', C: '3', D: '4', E: 'None of these' }, correct_option: 'E' })] }] },
    });
    assert.equal(good.status, 200, JSON.stringify(good.json));
    assert.equal(good.json.questions, 2);
  });

  it('players see option E, can answer it, are scored on it, and see it in the review', async () => {
    const u = await register(c.base);
    const quiz = (await c.pool.query("SELECT id FROM quiz_tests WHERE name = 'Five Quiz'")).rows[0].id;
    const qs = await call(c.base, 'GET', `/api/v1/questions?quiz_id=${quiz}`, { token: u.token });
    assert.deepEqual(Object.keys(qs.json.questions[0].options).sort(), ['A', 'B', 'C', 'D', 'E']);
    assert.doesNotMatch(JSON.stringify(qs.json), /is_correct|correct_answer/);
    const attempt = (await call(c.base, 'POST', '/api/v1/attempts/start', { token: u.token, body: { quiz_id: quiz } })).json.attempt_id;
    const [q1, q2] = qs.json.questions;
    assert.equal((await call(c.base, 'POST', '/api/v1/attempts/answer', { token: u.token, body: { attempt_id: attempt, question_id: q1.id, selected_option: 'B' } })).status, 200);
    assert.equal((await call(c.base, 'POST', '/api/v1/attempts/answer', { token: u.token, body: { attempt_id: attempt, question_id: q2.id, selected_option: 'E' } })).status, 200);
    const sub = await call(c.base, 'POST', '/api/v1/attempts/submit', { token: u.token, body: { attempt_id: attempt } });
    assert.equal(sub.json.results.correct, 2);
    const res = await call(c.base, 'GET', `/api/v1/results/${attempt}`, { token: u.token });
    const r2 = res.json.review.find((x: any) => x.id === q2.id);
    assert.equal(r2.correct_answer, 'E');
    assert.equal(r2.selected_option, 'E');
    assert.equal(r2.options.E, 'None of these');
  });

  it('answering E on a four-option seed question is refused (400) and stores nothing', async () => {
    const u = await register(c.base);
    const attempt = (await call(c.base, 'POST', '/api/v1/attempts/start', { token: u.token, body: { quiz_id: 1 } })).json.attempt_id;
    const r = await call(c.base, 'POST', '/api/v1/attempts/answer', { token: u.token, body: { attempt_id: attempt, question_id: 1, selected_option: 'E' } });
    assert.equal(r.status, 400);
    assert.equal(Number((await c.pool.query('SELECT count(*) AS c FROM attempt_answers WHERE attempt_id = $1', [attempt])).rows[0].c), 0);
  });
});

describe('importQuizzes service', () => {
  it('skipExisting makes a second import a no-op (re-running an import is safe)', async () => {
    await freshDb();
    const payload = [{ quiz_name: 'Idem Quiz 1', questions: [five()] }, { quiz_name: 'Idem Quiz 2', questions: [five()] }];
    const first = await importQuizzes('Idem Topic', payload as any, { skipExisting: true });
    assert.deepEqual([first.quizzes, first.questions, first.skipped.length], [2, 2, 0]);
    const second = await importQuizzes('Idem Topic', payload as any, { skipExisting: true });
    assert.deepEqual([second.quizzes, second.questions, second.skipped.length], [0, 0, 2]);
  });
});

describe('the REAL verified question bank (database/import/verified.json)', { skip: fs.existsSync(VERIFIED) ? false : 'run python extract_pdfs.py && python verify.py first' }, () => {
  let c: Ctx;
  let bank: any;
  before(async () => {
    bank = JSON.parse(fs.readFileSync(VERIFIED, 'utf8'));
    const { pool } = await freshDb();
    const s = await startServer();
    c = { base: s.base, pool, close: s.close };
    assert.equal(validatePayload(bank.topic, bank.quizzesData), null, 'verified.json must pass the same validation as the admin upload');
    await importQuizzes(bank.topic, bank.quizzesData, { skipExisting: true });
  });
  after(async () => c.close());

  it('every verified question is in the database with its exact text, options and key', async () => {
    const wantQuestions = bank.quizzesData.reduce((n: number, z: any) => n + z.questions.length, 0);
    for (const z of bank.quizzesData) {
      const quiz = (await c.pool.query('SELECT id, total_qs FROM quiz_tests WHERE name = $1', [z.quiz_name])).rows[0];
      assert.ok(quiz, z.quiz_name);
      const rows = (await c.pool.query('SELECT q.id, q.question_text FROM question_bank q JOIN quiz_question_map m ON m.question_id = q.id WHERE m.quiz_id = $1 ORDER BY m.sort_order', [quiz.id])).rows;
      assert.equal(rows.length, z.questions.length, z.quiz_name);
      assert.equal(quiz.total_qs, z.questions.length);
      for (const [i, q] of z.questions.entries()) {
        assert.equal(rows[i].question_text, q.question);
        const opts = (await c.pool.query('SELECT label, text, is_correct FROM options WHERE question_id = $1 ORDER BY label', [rows[i].id])).rows;
        assert.deepEqual(opts.map((o: any) => String(o.label).trim()), Object.keys(q.options).sort());
        for (const o of opts) assert.equal(o.text, q.options[String(o.label).trim()]);
        const correct = opts.filter((o: any) => o.is_correct === true);
        assert.equal(correct.length, 1);
        assert.equal(String(correct[0].label).trim(), q.correct_option);
      }
    }
    const total = Number((await c.pool.query("SELECT count(*) AS c FROM question_bank WHERE topic_id = (SELECT id FROM topics WHERE name = $1)", [bank.topic])).rows[0].c);
    assert.equal(total, wantQuestions);
  });

  it('a player can take the largest imported quiz, answer everything with the keys, and gets 100 percent', async () => {
    const biggest = [...bank.quizzesData].sort((a: any, b: any) => b.questions.length - a.questions.length)[0];
    const quiz = (await c.pool.query('SELECT id FROM quiz_tests WHERE name = $1', [biggest.quiz_name])).rows[0].id;
    const u = await register(c.base);
    const qs = (await call(c.base, 'GET', `/api/v1/questions?quiz_id=${quiz}`, { token: u.token })).json.questions;
    assert.equal(qs.length, biggest.questions.length);
    const attempt = (await call(c.base, 'POST', '/api/v1/attempts/start', { token: u.token, body: { quiz_id: quiz } })).json.attempt_id;
    for (const [i, q] of qs.entries()) {
      const r = await call(c.base, 'POST', '/api/v1/attempts/answer', { token: u.token, body: { attempt_id: attempt, question_id: q.id, selected_option: biggest.questions[i].correct_option } });
      assert.equal(r.status, 200, `${biggest.quiz_name} question ${i + 1}`);
    }
    const sub = await call(c.base, 'POST', '/api/v1/attempts/submit', { token: u.token, body: { attempt_id: attempt } });
    assert.equal(sub.json.results.correct, biggest.questions.length);
    assert.equal(Number(sub.json.results.percentage), 100);
  });

  it('the quiz list for the subject name shows the seeded quiz plus the imported ones, with real question counts', async () => {
    const u = await register(c.base);
    const list = await call(c.base, 'GET', '/api/v1/quizzes/Simplification', { token: u.token });
    assert.equal(list.json.quizzes.length, 1 + bank.quizzesData.length);
    for (const z of bank.quizzesData) {
      const row = list.json.quizzes.find((q: any) => q.quiz_name === z.quiz_name);
      assert.equal(row.questions.length, z.questions.length);
    }
  });

});

// Must stay the LAST suite: stops the embedded PostgreSQL even if an earlier suite failed in its before() hook.
describe('teardown (import)', () => {
  it('closes the database pools and stops the embedded PostgreSQL', async () => {
    await stopPg();
  });
});
