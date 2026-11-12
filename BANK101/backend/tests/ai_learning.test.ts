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

describe('Phase 4 — Grounded AI Learning Engine & Performance Lab', () => {
  it('POST /api/v1/ai/tutor/ask returns grounded academic citations for English queries', async () => {
    const c = await boot();
    try {
      const u = await register(c.base);

      // Ask AI tutor grounded in TNPSC Group II (examId: 1)
      const res = await call(c.base, 'POST', '/api/v1/ai/tutor/ask', {
        token: u.token,
        body: {
          examId: 1,
          topicId: 1,
          message: 'What are the main concepts in History and Indian Polity for this exam?',
          language: 'en',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.json.success, true);
      assert.ok(res.json.data.sessionId);
      assert.equal(res.json.data.role, 'assistant');
      assert.equal(res.json.data.language, 'en');
      assert.ok(res.json.data.content.includes('Grounded academic guidance'));

      // Check citations
      assert.ok(Array.isArray(res.json.data.citations));
      assert.ok(res.json.data.citations.length > 0);
      const hasTextbook = res.json.data.citations.some((cit: any) => cit.sourceType === 'textbook');
      assert.ok(hasTextbook, 'Expected at least one textbook citation');
    } finally {
      await c.close();
    }
  });

  it('POST /api/v1/ai/tutor/ask supports bilingual Tamil queries with state curriculum references', async () => {
    const c = await boot();
    try {
      const u = await register(c.base);

      const res = await call(c.base, 'POST', '/api/v1/ai/tutor/ask', {
        token: u.token,
        body: {
          examId: 1,
          message: 'தமிழ்நாடு வரலாறு மற்றும் தொல்லியல் சான்றுகள் பற்றி சுருக்கமாக கூறவும்.',
          language: 'ta',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.json.success, true);
      assert.equal(res.json.data.language, 'ta');
      // Tamil response confirmation
      assert.ok(res.json.data.content.includes('வணக்கம்!'));
      assert.ok(res.json.data.content.includes('பாடத்திட்ட விளக்கம்'));
      assert.ok(Array.isArray(res.json.data.citations));
    } finally {
      await c.close();
    }
  });

  it('GET /api/v1/ai/tutor/sessions and /:id maintains persistent conversation history', async () => {
    const c = await boot();
    try {
      const u = await register(c.base);

      // 1. Initial query
      const q1 = await call(c.base, 'POST', '/api/v1/ai/tutor/ask', {
        token: u.token,
        body: {
          examId: 1,
          message: 'Can you explain the preamble to the Indian Constitution?',
          language: 'en',
        },
      });
      const sessionId = q1.json.data.sessionId;

      // 2. Follow-up query in same session
      const q2 = await call(c.base, 'POST', '/api/v1/ai/tutor/ask', {
        token: u.token,
        body: {
          sessionId,
          message: 'Which amendment added Socialist and Secular?',
          language: 'en',
        },
      });
      assert.equal(q2.json.data.sessionId, sessionId);

      // 3. Retrieve session history
      const histRes = await call(c.base, 'GET', `/api/v1/ai/tutor/sessions/${sessionId}`, {
        token: u.token,
      });
      assert.equal(histRes.status, 200);
      assert.equal(histRes.json.success, true);
      assert.equal(histRes.json.data.session.id, sessionId);
      assert.equal(histRes.json.data.messages.length, 4); // 2 user + 2 assistant

      // 4. List user sessions
      const listRes = await call(c.base, 'GET', '/api/v1/ai/tutor/sessions', {
        token: u.token,
      });
      assert.equal(listRes.status, 200);
      assert.ok(listRes.json.data.length >= 1);
      assert.equal(listRes.json.data[0].id, sessionId);
    } finally {
      await c.close();
    }
  });

  it('POST & GET /api/v1/ai/study-plan generates distributed syllabus schedule with completion toggle', async () => {
    const c = await boot();
    try {
      const u = await register(c.base);

      // 1. Generate study plan for Exam 1 (TNPSC Group II)
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 45);
      const targetStr = targetDate.toISOString().split('T')[0];

      const genRes = await call(c.base, 'POST', '/api/v1/ai/study-plan/generate', {
        token: u.token,
        body: {
          examId: 1,
          targetExamDate: targetStr,
          dailyStudyHours: 4,
        },
      });

      assert.equal(genRes.status, 200);
      assert.equal(genRes.json.success, true);
      assert.ok(genRes.json.data.plan);
      assert.ok(Array.isArray(genRes.json.data.items));
      assert.ok(genRes.json.data.items.length > 0);
      assert.equal(genRes.json.data.stats.completedTopics, 0);

      const firstItem = genRes.json.data.items[0];
      assert.equal(firstItem.is_completed, false);

      // 2. Toggle completion of the first item
      const toggleRes = await call(c.base, 'PATCH', `/api/v1/ai/study-plan/items/${firstItem.id}`, {
        token: u.token,
        body: { isCompleted: true },
      });
      assert.equal(toggleRes.status, 200);
      assert.equal(toggleRes.json.data.is_completed, true);

      // 3. Fetch plan and verify updated stats
      const getRes = await call(c.base, 'GET', '/api/v1/ai/study-plan/1', {
        token: u.token,
      });
      assert.equal(getRes.status, 200);
      assert.equal(getRes.json.data.stats.completedTopics, 1);
      assert.ok(getRes.json.data.stats.progressPercentage > 0);
    } finally {
      await c.close();
    }
  });

  it('GET /api/v1/ai/performance-lab/:examId enforces strict Three-Tier Marks Separation', async () => {
    const c = await boot();
    try {
      const u = await register(c.base);

      // 1. Record Tier A: Official Published Government Result
      const offRes = await call(c.base, 'POST', '/api/v1/ai/performance-lab/official-result', {
        token: u.token,
        body: {
          examId: 1,
          rollNumber: 'TNPSC2025-098234',
          officialMarks: 218.5,
          totalMarks: 300,
          rankAchieved: 412,
          publicationDate: '2025-10-15',
          proofUrl: 'https://tnpsc.gov.in/results/2025/group2.pdf',
        },
      });
      assert.equal(offRes.status, 201);
      assert.equal(offRes.json.success, true);
      assert.equal(offRes.json.data.official_marks, '218.50');

      // 2. Fetch Performance Lab Scorecard
      const labRes = await call(c.base, 'GET', '/api/v1/ai/performance-lab/1', {
        token: u.token,
      });
      assert.equal(labRes.status, 200);
      assert.equal(labRes.json.success, true);
      const lab = labRes.json.data;

      // Tier A: Official Results
      assert.ok(Array.isArray(lab.tierA_officialResults));
      assert.equal(lab.tierA_officialResults.length, 1);
      assert.equal(lab.tierA_officialResults[0].roll_number, 'TNPSC2025-098234');
      assert.equal(lab.tierA_officialResults[0].official_marks, '218.50');

      // Tier B: Platform Assessed Scores
      assert.ok(lab.tierB_platformAssessed);
      assert.ok(typeof lab.tierB_platformAssessed.averagePercentage === 'number');

      // Tier C: AI Predicted Score
      assert.ok(lab.tierC_aiPredicted);
      assert.ok(lab.tierC_aiPredicted.predicted_min !== undefined);
      assert.ok(lab.tierC_aiPredicted.predicted_max !== undefined);
      assert.ok(Number(lab.tierC_aiPredicted.predicted_max) >= Number(lab.tierC_aiPredicted.predicted_min));
      assert.ok(lab.tierC_aiPredicted.confidence_interval, '0.85');
      assert.ok(lab.tierC_aiPredicted.readiness_score > 0);
    } finally {
      await c.close();
    }
  });
});

describe('teardown (ai_learning)', () => {
  it('closes the database pools and stops the embedded PostgreSQL', async () => {
    await stopPg();
  });
});
