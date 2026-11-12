import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb, startServer, call, stopPg } from './helpers';

type Ctx = { base: string; close: () => Promise<void> };
async function boot(): Promise<Ctx> {
  await freshDb();
  const s = await startServer();
  return { base: s.base, close: s.close };
}

describe('Universal Examination Taxonomy & Catalog APIs', () => {
  it('GET /api/v1/catalog/authorities lists all national and state authorities', async () => {
    const c = await boot();
    try {
      const res = await call(c.base, 'GET', '/api/v1/catalog/authorities');
      assert.equal(res.status, 200);
      assert.equal(res.json.status, 'success');
      assert.ok(Array.isArray(res.json.authorities));
      assert.ok(res.json.authorities.length >= 8);

      const codes = res.json.authorities.map((a: any) => a.code);
      assert.ok(codes.includes('TNPSC'));
      assert.ok(codes.includes('TRB'));
      assert.ok(codes.includes('TNUSRB'));
      assert.ok(codes.includes('UPSC'));
      assert.ok(codes.includes('SSC'));
      assert.ok(codes.includes('IBPS'));
    } finally {
      await c.close();
    }
  });

  it('GET /api/v1/catalog/authorities?state=TN filters specifically for Tamil Nadu authorities', async () => {
    const c = await boot();
    try {
      const res = await call(c.base, 'GET', '/api/v1/catalog/authorities?state=TN');
      assert.equal(res.status, 200);
      const codes = res.json.authorities.map((a: any) => a.code);
      assert.ok(codes.includes('TNPSC'));
      assert.ok(codes.includes('TRB'));
      assert.ok(codes.includes('TNUSRB'));
      assert.ok(!codes.includes('UPSC'));
      assert.ok(!codes.includes('SSC'));
    } finally {
      await c.close();
    }
  });

  it('GET /api/v1/catalog/authorities/:code returns authority profile and linked examinations', async () => {
    const c = await boot();
    try {
      const res = await call(c.base, 'GET', '/api/v1/catalog/authorities/TNPSC');
      assert.equal(res.status, 200);
      assert.equal(res.json.authority.code, 'TNPSC');
      assert.equal(res.json.authority.state_code, 'TN');
      assert.ok(Array.isArray(res.json.exams));
      assert.ok(res.json.exams.some((e: any) => e.slug === 'tnpsc-group-2'));
    } finally {
      await c.close();
    }
  });

  it('GET /api/v1/catalog/exams lists unified examinations with stage counts and active syllabus', async () => {
    const c = await boot();
    try {
      const res = await call(c.base, 'GET', '/api/v1/catalog/exams');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.json.exams));
      assert.ok(res.json.exams.length >= 3);

      const slugs = res.json.exams.map((e: any) => e.slug);
      assert.ok(slugs.includes('tnpsc-group-2'));
      assert.ok(slugs.includes('ssc-cgl'));
      assert.ok(slugs.includes('ibps-po'));

      const tnpsc = res.json.exams.find((e: any) => e.slug === 'tnpsc-group-2');
      assert.equal(tnpsc.authority_code, 'TNPSC');
      assert.equal(tnpsc.stages_count, 2);
      assert.ok(tnpsc.active_syllabus_version.includes('Notification'));
    } finally {
      await c.close();
    }
  });

  it('GET /api/v1/catalog/exams/:slug returns full exam hierarchy, stages, and papers', async () => {
    const c = await boot();
    try {
      const res = await call(c.base, 'GET', '/api/v1/catalog/exams/ssc-cgl');
      assert.equal(res.status, 200);
      assert.equal(res.json.exam.slug, 'ssc-cgl');
      assert.equal(res.json.exam.authority_code, 'SSC');
      assert.ok(Array.isArray(res.json.stages));
      assert.equal(res.json.stages.length, 2);

      const tier1 = res.json.stages.find((s: any) => s.stage_order === 1);
      assert.ok(tier1.name.includes('Tier I'));
      assert.ok(Array.isArray(tier1.papers));
      assert.equal(tier1.papers[0].duration_minutes, 60);
      assert.equal(Number(tier1.papers[0].negative_marking_ratio), 0.5);
    } finally {
      await c.close();
    }
  });

  it('GET /api/v1/catalog/exams/:slug/syllabus returns full hierarchical syllabus tree', async () => {
    const c = await boot();
    try {
      const res = await call(c.base, 'GET', '/api/v1/catalog/exams/tnpsc-group-2/syllabus');
      assert.equal(res.status, 200);
      assert.equal(res.json.exam.slug, 'tnpsc-group-2');
      assert.ok(Array.isArray(res.json.syllabusTree));
      assert.ok(res.json.syllabusTree.length >= 1);

      const math = res.json.syllabusTree.find((s: any) => s.subject_name === 'Simplification');
      assert.ok(math);
      assert.ok(Array.isArray(math.units));
      assert.ok(math.units.length >= 1);
      assert.ok(math.units[0].title.includes('Numerical Aptitude'));
      assert.ok(Array.isArray(math.units[0].topics));
      assert.ok(math.units[0].topics[0].subtopics.length >= 1);
    } finally {
      await c.close();
    }
  });

  it('GET /api/v1/catalog/compare computes cross-exam syllabus overlaps and common subjects', async () => {
    const c = await boot();
    try {
      const res = await call(
        c.base,
        'GET',
        '/api/v1/catalog/compare?exams=tnpsc-group-2,ssc-cgl,ibps-po'
      );
      assert.equal(res.status, 200);
      assert.equal(res.json.status, 'success');
      assert.equal(res.json.comparison.totalCompared, 3);
      assert.ok(Array.isArray(res.json.comparison.commonSubjects));
      assert.ok(res.json.comparison.commonSubjects.some((s: any) => s.name === 'Simplification'));
      assert.ok(res.json.comparison.overlapPercentage > 0);
      assert.ok(res.json.comparison.preparationSynergyNote.includes('Simplification'));
    } finally {
      await c.close();
    }
  });
});

describe('teardown (catalog)', () => {
  it('closes the database pools and stops the embedded PostgreSQL', async () => {
    await stopPg();
  });
});

