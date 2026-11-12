import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb, startServer, call, stopPg } from './helpers';

type Ctx = { base: string; close: () => Promise<void> };
async function boot(): Promise<Ctx> {
  await freshDb();
  const s = await startServer();
  return { base: s.base, close: s.close };
}

describe('Phase 5 — National & Tamil Nadu Catalog Expansion', () => {
  it('GET /api/v1/catalog/authorities?state=TN returns complete Tamil Nadu recruitment ecosystem', async () => {
    const c = await boot();
    try {
      const res = await call(c.base, 'GET', '/api/v1/catalog/authorities?state=TN');
      assert.equal(res.status, 200);
      assert.equal(res.json.status, 'success');
      assert.ok(Array.isArray(res.json.authorities));

      const codes = res.json.authorities.map((a: any) => a.code);
      assert.ok(codes.includes('TNPSC'), 'Expected TNPSC in Tamil Nadu');
      assert.ok(codes.includes('TRB'), 'Expected TRB in Tamil Nadu');
      assert.ok(codes.includes('TNUSRB'), 'Expected TNUSRB in Tamil Nadu');
      assert.ok(codes.includes('MRB'), 'Expected MRB in Tamil Nadu');
      assert.ok(codes.includes('TANGEDCO'), 'Expected TANGEDCO in Tamil Nadu');
    } finally {
      await c.close();
    }
  });

  it('GET /api/v1/catalog/exams/upsc-cse returns full 3-stage UPSC Civil Services structure with CSAT', async () => {
    const c = await boot();
    try {
      const res = await call(c.base, 'GET', '/api/v1/catalog/exams/upsc-cse');
      assert.equal(res.status, 200);
      assert.equal(res.json.status, 'success');
      assert.equal(res.json.exam.code, 'UPSC_CSE');
      assert.equal(res.json.exam.slug, 'upsc-cse');
      assert.equal(res.json.exam.authority_code, 'UPSC');

      // Verify stages: Prelims, Mains, Interview
      assert.ok(Array.isArray(res.json.stages));
      assert.equal(res.json.stages.length, 3);
      assert.ok(res.json.stages[0].name.includes('Preliminary'));
      assert.ok(res.json.stages[1].name.includes('Main'));
      assert.ok(res.json.stages[2].name.includes('Interview') || res.json.stages[2].name.includes('Personality'));

      // Verify papers for Prelims: GS I and CSAT II
      const prelimsPapers = res.json.stages[0].papers;
      assert.ok(Array.isArray(prelimsPapers));
      assert.equal(prelimsPapers.length, 2);
      assert.ok(prelimsPapers.some((p: any) => p.title.includes('General Studies')));
      assert.ok(prelimsPapers.some((p: any) => p.title.includes('CSAT')));
    } finally {
      await c.close();
    }
  });

  it('GET /api/v1/catalog/exams/tnpsc-group-1 & tnpsc-group-4 provides complete Tamil Nadu administrative hierarchy', async () => {
    const c = await boot();
    try {
      // Group 1
      const g1Res = await call(c.base, 'GET', '/api/v1/catalog/exams/tnpsc-group-1');
      assert.equal(g1Res.status, 200);
      assert.equal(g1Res.json.exam.code, 'TNPSC_G1');
      assert.equal(g1Res.json.stages.length, 3); // Prelims, Mains, Interview

      // Group 4
      const g4Res = await call(c.base, 'GET', '/api/v1/catalog/exams/tnpsc-group-4');
      assert.equal(g4Res.status, 200);
      assert.equal(g4Res.json.exam.code, 'TNPSC_G4');
      assert.equal(g4Res.json.stages.length, 1); // Single stage OMR/CBT
      assert.ok(g4Res.json.stages[0].papers[0].title.includes('General Tamil'));
    } finally {
      await c.close();
    }
  });

  it('GET /api/v1/catalog/exams/tnusrb-si & tntet models uniformed police & teaching qualifications', async () => {
    const c = await boot();
    try {
      // TNUSRB SI
      const siRes = await call(c.base, 'GET', '/api/v1/catalog/exams/tnusrb-si');
      assert.equal(siRes.status, 200);
      assert.equal(siRes.json.exam.code, 'TNUSRB_SI');
      assert.ok(siRes.json.stages.length >= 2); // Written + Physical

      // TNTET
      const tetRes = await call(c.base, 'GET', '/api/v1/catalog/exams/tntet');
      assert.equal(tetRes.status, 200);
      assert.equal(tetRes.json.exam.code, 'TNTET');
      assert.equal(tetRes.json.stages.length, 2); // Paper I (Primary) & Paper II (Upper Primary)
    } finally {
      await c.close();
    }
  });

  it('GET /api/v1/catalog/compare computes cross-exam overlap across UPSC, State PSC, and Railway exams', async () => {
    const c = await boot();
    try {
      // Compare TNPSC Group 1 vs UPSC CSE
      const comp1 = await call(c.base, 'GET', '/api/v1/catalog/compare?exams=tnpsc-group-1,upsc-cse');
      assert.equal(comp1.status, 200);
      assert.equal(comp1.json.status, 'success');
      assert.ok(comp1.json.comparison.commonSubjects.length > 0);
      assert.ok(comp1.json.comparison.commonSubjects.some((s: any) => s.name === 'General Awareness'));
      assert.ok(comp1.json.comparison.overlapPercentage > 0);

      // Compare RRB NTPC vs SSC CGL
      const comp2 = await call(c.base, 'GET', '/api/v1/catalog/compare?exams=rrb-ntpc,ssc-cgl');
      assert.equal(comp2.status, 200);
      assert.equal(comp2.json.status, 'success');
      assert.ok(comp2.json.comparison.overlapPercentage >= 30); // Overlap in Quant, Reasoning, GA
    } finally {
      await c.close();
    }
  });
});

describe('teardown (catalog_expansion)', () => {
  it('closes the database pools and stops the embedded PostgreSQL', async () => {
    await stopPg();
  });
});
