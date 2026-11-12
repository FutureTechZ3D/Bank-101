import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb, startServer, call, register, stopPg } from './helpers';
import { query } from '../src/config/db';

type Ctx = { base: string; close: () => Promise<void> };
async function boot(): Promise<Ctx> {
  await freshDb();
  const s = await startServer();
  return { base: s.base, close: s.close };
}

describe('Phase 2 — Resilient CBT Engine & Attempt State Recovery', () => {
  it('saves marked_for_review flags and retrieves live palette state for reconnection', async () => {
    const c = await boot();
    try {
      const u = await register(c.base);
      const startRes = await call(c.base, 'POST', '/api/v1/attempts/start', {
        token: u.token,
        body: { quiz_id: 1 },
      });
      assert.equal(startRes.status, 201);
      const attemptId = startRes.json.attempt_id;

      // 1. Mark Question 1 for review WITH an answer (Option A)
      const a1 = await call(c.base, 'POST', '/api/v1/attempts/answer', {
        token: u.token,
        body: {
          attempt_id: attemptId,
          question_id: 1,
          selected_option: 'A',
          marked_for_review: true,
          time_taken_seconds: 15,
        },
      });
      assert.equal(a1.status, 200);
      assert.equal(a1.json.marked_for_review, true);

      // 2. Mark Question 2 for review WITHOUT an answer
      const a2 = await call(c.base, 'POST', '/api/v1/attempts/answer', {
        token: u.token,
        body: {
          attempt_id: attemptId,
          question_id: 2,
          marked_for_review: true,
          time_taken_seconds: 10,
        },
      });
      assert.equal(a2.status, 200);

      // 3. Answer Question 3 normally WITHOUT marking for review
      const a3 = await call(c.base, 'POST', '/api/v1/attempts/answer', {
        token: u.token,
        body: {
          attempt_id: attemptId,
          question_id: 3,
          selected_option: 'B',
          marked_for_review: false,
          time_taken_seconds: 25,
        },
      });
      assert.equal(a3.status, 200);

      // 4. Retrieve full state for reconnection
      const stateRes = await call(c.base, 'GET', `/api/v1/attempts/${attemptId}/state`, {
        token: u.token,
      });
      assert.equal(stateRes.status, 200);
      assert.equal(stateRes.json.attempt.id, attemptId);
      assert.ok(stateRes.json.attempt.seconds_remaining > 0);

      const pal = stateRes.json.palette;
      assert.ok(Array.isArray(pal));
      assert.ok(pal.length >= 3);

      const q1State = pal.find((p: any) => p.question_id === 1);
      assert.equal(q1State.status, 'answered_and_marked_for_review');
      assert.equal(q1State.saved_answer, 'A');

      const q2State = pal.find((p: any) => p.question_id === 2);
      assert.equal(q2State.status, 'marked_for_review');

      const q3State = pal.find((p: any) => p.question_id === 3);
      assert.equal(q3State.status, 'answered');
      assert.equal(q3State.saved_answer, 'B');

      const q4State = pal.find((p: any) => p.question_id === 4);
      assert.equal(q4State.status, 'unvisited');
    } finally {
      await c.close();
    }
  });

  it('supports Numerical question evaluation with tolerance', async () => {
    const c = await boot();
    try {
      const u = await register(c.base);

      // Insert a numerical question directly into question_bank and link to quiz 1
      const numQ = await query(
        `INSERT INTO question_bank (topic_id, question_text, question_type, numerical_answer, numerical_tolerance)
         VALUES (1, 'What is the square root of 144?', 'numerical', 12.0000, 0.0500) RETURNING id`
      );
      const qId = numQ.rows[0].id;
      await query(`INSERT INTO quiz_question_map (quiz_id, question_id) VALUES (1, $1) ON CONFLICT DO NOTHING`, [qId]);

      const start = await call(c.base, 'POST', '/api/v1/attempts/start', {
        token: u.token,
        body: { quiz_id: 1 },
      });
      const attemptId = start.json.attempt_id;

      // Answer correctly (12.02 within 0.05 tolerance)
      const ansRes = await call(c.base, 'POST', '/api/v1/attempts/answer', {
        token: u.token,
        body: {
          attempt_id: attemptId,
          question_id: qId,
          text_answer: '12.02',
          time_taken_seconds: 20,
        },
      });
      assert.equal(ansRes.status, 200);

      // Verify stored answer is marked as correct
      const stored = await query(
        `SELECT is_correct, text_answer FROM attempt_answers WHERE attempt_id = $1 AND question_id = $2`,
        [attemptId, qId]
      );
      assert.equal(stored.rows[0].is_correct, true);
      assert.equal(stored.rows[0].text_answer, '12.02');
    } finally {
      await c.close();
    }
  });
});

describe('Phase 2 — Multi-Format Dataset Ingestion Pipeline', () => {
  it('POST /api/v1/admin/datasets/preview detects valid questions vs validation errors', async () => {
    const c = await boot();
    try {
      // Create admin user
      const admin = await register(c.base, 'admin_datasets', 'pass123456');
      await query(`UPDATE users SET account_type = 'Admin' WHERE id = $1`, [admin.user.id]);
      await query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, 1) ON CONFLICT DO NOTHING`, [admin.user.id]);

      const payload = {
        questions: [
          {
            question_text: 'What is 15 * 12?',
            question_type: 'single_mcq',
            options: [
              { label: 'A', text: '180', is_correct: true },
              { label: 'B', text: '170', is_correct: false },
              { label: 'C', text: '160', is_correct: false },
              { label: 'D', text: '190', is_correct: false },
            ],
            explanation: '15 * 12 = 180',
          },
          {
            // Invalid: missing options for single_mcq
            question_text: 'Faulty Question without options',
            question_type: 'single_mcq',
          },
        ],
      };

      const res = await call(c.base, 'POST', '/api/v1/admin/datasets/preview', {
        token: admin.token,
        body: payload,
      });

      assert.equal(res.status, 200);
      assert.equal(res.json.validation.valid, false);
      assert.equal(res.json.validation.totalRows, 2);
      assert.equal(res.json.validation.validRows, 1);
      assert.equal(res.json.validation.invalidRows, 1);
      assert.ok(res.json.validation.errors[0].error.includes('options'));
    } finally {
      await c.close();
    }
  });

  it('POST /api/v1/admin/datasets/import atomically imports valid questions and creates a playable test', async () => {
    const c = await boot();
    try {
      const admin = await register(c.base, 'admin_importer', 'pass123456');
      await query(`UPDATE users SET account_type = 'Admin' WHERE id = $1`, [admin.user.id]);
      await query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, 1) ON CONFLICT DO NOTHING`, [admin.user.id]);

      const validBatch = {
        dataset_name: 'National Mock Series 2026',
        create_quiz: true,
        quiz_title: 'Grand Speed Test 01',
        questions: [
          {
            question_text: 'Evaluate 25% of 400 + 15',
            question_type: 'single_mcq',
            options: [
              { label: 'A', text: '115', is_correct: true },
              { label: 'B', text: '100', is_correct: false },
              { label: 'C', text: '125', is_correct: false },
              { label: 'D', text: '110', is_correct: false },
            ],
            explanation: '25% of 400 = 100. 100 + 15 = 115.',
          },
          {
            question_text: 'Solve for x: 3x - 9 = 21',
            question_type: 'numerical',
            numerical_answer: 10,
            numerical_tolerance: 0.001,
            explanation: '3x = 30 => x = 10',
          },
        ],
      };

      const res = await call(c.base, 'POST', '/api/v1/admin/datasets/import', {
        token: admin.token,
        body: validBatch,
      });

      assert.equal(res.status, 200);
      assert.equal(res.json.success, true);
      assert.equal(res.json.importedCount, 2);
      assert.ok(res.json.quizId > 0);

      // Verify player can see the created quiz in the catalog
      const user = await register(c.base, 'student_player');
      const qzRes = await call(c.base, 'GET', `/api/v1/quizzes/detail/${res.json.quizId}`, {
        token: user.token,
      });
      assert.equal(qzRes.status, 200);
      assert.equal(qzRes.json.quiz.name, 'Grand Speed Test 01');
    } finally {
      await c.close();
    }
  });
});

describe('teardown (exam_engine)', () => {
  it('closes the database pools and stops the embedded PostgreSQL', async () => {
    await stopPg();
  });
});

