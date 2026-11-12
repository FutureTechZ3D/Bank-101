import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb, startServer, call, register, stopPg } from './helpers';

type Ctx = { base: string; close: () => Promise<void> };
async function boot(): Promise<Ctx> {
  await freshDb();
  const s = await startServer();
  return { base: s.base, close: s.close };
}

describe('Phase 6 — Institutional Workspaces, Offline Sync & DPDP Compliance', () => {
  it('GET /api/v1/institutions lists verified academies and their batch programs', async () => {
    const c = await boot();
    try {
      const u = await register(c.base);
      const res = await call(c.base, 'GET', '/api/v1/institutions', { token: u.token });
      assert.equal(res.status, 200);
      assert.equal(res.json.success, true);
      assert.ok(Array.isArray(res.json.data));
      assert.ok(res.json.data.length >= 2);

      const chennaiAcademy = res.json.data.find((i: any) => i.slug === 'chennai-ias-academy');
      assert.ok(chennaiAcademy);
      assert.equal(chennaiAcademy.subscription_tier, 'enterprise');
      assert.ok(chennaiAcademy.batches_count >= 2);
    } finally {
      await c.close();
    }
  });

  it('POST /api/v1/institutions/join and batch assignment workflow', async () => {
    const c = await boot();
    try {
      const u = await register(c.base);

      // 1. Join institution
      const joinRes = await call(c.base, 'POST', '/api/v1/institutions/join', {
        token: u.token,
        body: { institutionId: 1, role: 'faculty' },
      });
      assert.equal(joinRes.status, 200);
      assert.equal(joinRes.json.data.role, 'faculty');

      // 2. Assign test to batch 1
      const assignRes = await call(c.base, 'POST', '/api/v1/institutions/batches/1/assign', {
        token: u.token,
        body: {
          quizId: 1,
          deadline: '2026-12-31T23:59:59Z',
          isMandatory: true,
        },
      });
      assert.equal(assignRes.status, 201);
      assert.equal(assignRes.json.data.batch_id, 1);
      assert.equal(assignRes.json.data.quiz_id, 1);

      // 3. Fetch batch details
      const batchRes = await call(c.base, 'GET', '/api/v1/institutions/batches/1', {
        token: u.token,
      });
      assert.equal(batchRes.status, 200);
      assert.ok(batchRes.json.data.assignedTests.length > 0);
      assert.equal(batchRes.json.data.assignedTests[0].quiz_id, 1);
    } finally {
      await c.close();
    }
  });

  it('POST /api/v1/compliance/consent & GET /export enforces Indian DPDP Act compliance', async () => {
    const c = await boot();
    try {
      const u = await register(c.base);

      // 1. Record DPDP Purpose Consent
      const consentRes = await call(c.base, 'POST', '/api/v1/compliance/consent', {
        token: u.token,
        body: {
          purposeCode: 'EXAM_EVALUATION',
          consentGiven: true,
        },
      });
      assert.equal(consentRes.status, 201);
      assert.equal(consentRes.json.data.purpose_code, 'EXAM_EVALUATION');
      assert.equal(consentRes.json.data.consent_given, true);

      // 2. Export personal data archive (Right to Data Portability)
      const exportRes = await call(c.base, 'GET', '/api/v1/compliance/export', {
        token: u.token,
      });
      assert.equal(exportRes.status, 200);
      assert.ok(exportRes.json.data.exportedAt);
      assert.ok(exportRes.json.data.complianceStandard.includes('DPDP'));
      assert.equal(exportRes.json.data.user.id, u.user.id);
      assert.ok(Array.isArray(exportRes.json.data.consentRecords));
      assert.equal(exportRes.json.data.consentRecords.length, 1);
    } finally {
      await c.close();
    }
  });

  it('POST /api/v1/compliance/sync ingests disconnected offline CBT test results', async () => {
    const c = await boot();
    try {
      const u = await register(c.base);
      const attemptUuid = 'offline-test-' + Date.now();

      const syncRes = await call(c.base, 'POST', '/api/v1/compliance/sync', {
        token: u.token,
        body: {
          clientAttemptUuid: attemptUuid,
          quizId: 1,
          clientStartedAt: '2026-11-12T09:00:00Z',
          clientSubmittedAt: '2026-11-12T09:45:00Z',
          answers: [
            { questionId: 1, selectedOption: 'A' },
            { questionId: 2, selectedOption: 'B' },
          ],
        },
      });

      assert.equal(syncRes.status, 200);
      assert.equal(syncRes.json.success, true);
      assert.equal(syncRes.json.data.status, 'synced');
      assert.ok(syncRes.json.data.attemptId);
      assert.ok(syncRes.json.data.syncLog);
      assert.equal(syncRes.json.data.syncLog.client_attempt_uuid, attemptUuid);

      // Verify idempotency on second identical sync
      const dupRes = await call(c.base, 'POST', '/api/v1/compliance/sync', {
        token: u.token,
        body: {
          clientAttemptUuid: attemptUuid,
          quizId: 1,
          answers: [],
        },
      });
      assert.equal(dupRes.status, 200);
      assert.equal(dupRes.json.data.status, 'already_synced');
    } finally {
      await c.close();
    }
  });

  it('POST /api/v1/compliance/forget-me executes Right to Erasure / Anonymization', async () => {
    const c = await boot();
    try {
      const u = await register(c.base);

      const eraseRes = await call(c.base, 'POST', '/api/v1/compliance/forget-me', {
        token: u.token,
        body: { reason: 'Account closure request under DPDP Act' },
      });

      assert.equal(eraseRes.status, 200);
      assert.equal(eraseRes.json.success, true);
      assert.equal(eraseRes.json.data.request_type, 'DATA_ERASURE');
      assert.equal(eraseRes.json.data.status, 'completed');
    } finally {
      await c.close();
    }
  });
});

describe('teardown (institutions_and_compliance)', () => {
  it('closes the database pools and stops the embedded PostgreSQL', async () => {
    await stopPg();
  });
});
