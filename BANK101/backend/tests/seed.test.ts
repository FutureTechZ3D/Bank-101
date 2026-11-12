/**
 * Quality gate for database/seed.sql. The answer keys are checked against an INDEPENDENT calculation written in this
 * file (plain JS arithmetic), so a wrong key, a changed question or a half-edited explanation fails the build.
 * This test was added after the seed shipped Q1 with the wrong key and Q5 with an answer that was not an option.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb, stopPg } from './helpers';

// question id -> [exact question text, independent calculation of the answer]
const EXPECTED: Record<number, [string, number]> = {
  1: ['What is the value of 240 ÷ 8 × 512 ÷ 4 - 25?', 240 / 8 * 512 / 4 - 25],
  2: ['Evaluate: 45% of 600 + 150% of 240 - 25% of 400', 0.45 * 600 + 1.5 * 240 - 0.25 * 400],
  3: ['Find the value of: (18 × 15) ÷ 3 + (24 × 8) ÷ 4', (18 * 15) / 3 + (24 * 8) / 4],
  4: ['Solve: 5/12 of 360 + 3/8 of 640 - 4/5 of 250', (5 / 12) * 360 + (3 / 8) * 640 - (4 / 5) * 250],
  5: ['What is the square root of (144 + 256 + 624) divided by 2?', Math.sqrt(144 + 256 + 624) / 2],
  6: ['Solve: (12 × 12 - 40) ÷ 8 + 15 × 4', (12 * 12 - 40) / 8 + 15 * 4],
  7: ['What is the value of 3/5 of 4/7 of 7/9 of 450?', (3 / 5) * (4 / 7) * (7 / 9) * 450],
  8: ['Evaluate: 625 ÷ 25 × 5 + 120 - 75 ÷ 15', 625 / 25 * 5 + 120 - 75 / 15],
  9: ['Solve: (240 - 40) ÷ 4 + 16 × 5 - 12 × 3', (240 - 40) / 4 + 16 * 5 - 12 * 3],
  10: ['Find the value of x in the equation: x + 15% of 400 = 25% of 800 - 40', 0.25 * 800 - 40 - 0.15 * 400],
};

const DRAFT_WORDS = /\b(wait|let''?s assume|recalculate|actually|let us|let's|oops|hmm|adjust)\b/i;

describe('seed.sql quality', () => {
  let questions: any[];
  let options: any[];
  let explanations: any[];
  let quizzes: any[];
  let maps: any[];

  before(async () => {
    const { pool } = await freshDb();
    questions = (await pool.query('SELECT id, question_text FROM question_bank ORDER BY id')).rows;
    options = (await pool.query('SELECT question_id, label, text, is_correct FROM options ORDER BY question_id, label')).rows;
    explanations = (await pool.query('SELECT question_id, short_answer, detailed_text FROM explanations ORDER BY question_id')).rows;
    quizzes = (await pool.query('SELECT id, name, total_qs, duration_mins FROM quiz_tests ORDER BY id')).rows;
    maps = (await pool.query('SELECT quiz_id, question_id FROM quiz_question_map')).rows;
  });

  const optsOf = (qid: number) => options.filter((o) => o.question_id === qid);
  const label = (o: any) => String(o.label).trim();

  it('the expected-answer table covers exactly the seeded questions (no question escapes the check)', () => {
    assert.deepEqual(questions.map((q) => q.id), Object.keys(EXPECTED).map(Number));
  });

  it('every question text is exactly the one the independent calculation was written for', () => {
    for (const q of questions) assert.equal(q.question_text, EXPECTED[q.id][0], `question ${q.id}`);
  });

  it('structure: each question has options A, B, C, D, exactly one correct, and distinct option texts', () => {
    for (const q of questions) {
      const o = optsOf(q.id);
      assert.deepEqual(o.map(label), ['A', 'B', 'C', 'D'], `question ${q.id}`);
      assert.equal(o.filter((x) => x.is_correct === true).length, 1, `question ${q.id} must have exactly one correct option`);
      assert.equal(new Set(o.map((x) => String(x.text).trim())).size, 4, `question ${q.id} has duplicate option texts`);
    }
  });

  it('the option marked correct holds the independently calculated answer', () => {
    for (const q of questions) {
      const correct = optsOf(q.id).find((x) => x.is_correct === true)!;
      const expected = EXPECTED[q.id][1];
      assert.ok(Math.abs(Number(correct.text) - expected) < 1e-9, `question ${q.id}: key says ${correct.text} but the calculation gives ${expected}`);
    }
  });

  it('no wrong option equals the right answer, and the right answer appears among the options', () => {
    for (const q of questions) {
      const expected = EXPECTED[q.id][1];
      const matches = optsOf(q.id).filter((x) => Math.abs(Number(x.text) - expected) < 1e-9);
      assert.equal(matches.length, 1, `question ${q.id}: the answer ${expected} must appear exactly once`);
      assert.equal(matches[0].is_correct, true, `question ${q.id}: the option with the right value is not marked correct`);
    }
  });

  it('explanations: present, agree with the key letter, end with the answer, and contain no draft/self-correction text', () => {
    assert.equal(explanations.length, questions.length);
    for (const e of explanations) {
      const correct = optsOf(e.question_id).find((x) => x.is_correct === true)!;
      assert.equal(e.short_answer, `Correct Answer: ${label(correct)}`, `question ${e.question_id}`);
      assert.doesNotMatch(e.detailed_text, DRAFT_WORDS, `question ${e.question_id} explanation looks like an unfinished draft`);
      const lastNumber = e.detailed_text.match(/-?\d+(\.\d+)?/g)!.pop();
      assert.ok(Math.abs(Number(lastNumber) - EXPECTED[e.question_id][1]) < 1e-9, `question ${e.question_id}: explanation ends at ${lastNumber}, not at ${EXPECTED[e.question_id][1]}`);
    }
  });

  it('quiz tests: every seeded quiz has questions, and total_qs equals the real number of mapped questions', () => {
    assert.ok(quizzes.length >= 1);
    for (const z of quizzes) {
      const n = maps.filter((m) => m.quiz_id === z.id).length;
      assert.ok(n > 0, `${z.name} has no questions`);
      assert.equal(z.total_qs, n, `${z.name} claims ${z.total_qs} questions but has ${n}`);
    }
  });

  it('teardown', async () => {
    await stopPg();
  });
});
