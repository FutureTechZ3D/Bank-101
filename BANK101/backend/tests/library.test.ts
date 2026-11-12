import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb, startServer, call, stopPg } from './helpers';

type Ctx = { base: string; close: () => Promise<void> };
async function boot(): Promise<Ctx> {
  await freshDb();
  const s = await startServer();
  return { base: s.base, close: s.close };
}

describe('Phase 3 — Digital Academic Library & Rights Management', () => {
  it('GET /api/v1/library/books lists books and enforces redistribution license controls', async () => {
    const c = await boot();
    try {
      const res = await call(c.base, 'GET', '/api/v1/library/books');
      assert.equal(res.status, 200);
      assert.equal(res.json.success, true);
      assert.ok(Array.isArray(res.json.books));
      assert.ok(res.json.books.length >= 4);

      // 1. Verify NCERT book: COPYRIGHT_LINK_ONLY -> download_url MUST be null
      const ncert = res.json.books.find((b: any) => b.title.includes('NCERT'));
      assert.ok(ncert);
      assert.equal(ncert.license_code, 'COPYRIGHT_LINK_ONLY');
      assert.equal(ncert.can_redistribute, false);
      assert.equal(ncert.download_url, null);
      assert.ok(ncert.source_url.includes('epathshala.nic.in'));

      // 2. Verify OpenStax book: CC_BY -> download_url is permitted
      const openstax = res.json.books.find((b: any) => b.title.includes('OpenStax'));
      assert.ok(openstax);
      assert.equal(openstax.license_code, 'CC_BY');
      assert.equal(openstax.can_redistribute, true);
      assert.ok(openstax.download_url);

      // 3. Verify Tamil Nadu State Board book
      const tnBook = res.json.books.find((b: any) => b.title.includes('Samacheer Kalvi'));
      assert.ok(tnBook);
      assert.equal(tnBook.category, 'Tamil Nadu State Board');
      assert.equal(tnBook.download_url, null); // link only
      assert.ok(tnBook.source_url.includes('textbookcorp.tn.gov.in'));
    } finally {
      await c.close();
    }
  });

  it('GET /api/v1/library/books/:id returns structured chapter hierarchy and topic mappings', async () => {
    const c = await boot();
    try {
      const listRes = await call(c.base, 'GET', '/api/v1/library/books');
      const bookId = listRes.json.books[0].id;

      const res = await call(c.base, 'GET', `/api/v1/library/books/${bookId}`);
      assert.equal(res.status, 200);
      assert.equal(res.json.book.id, bookId);
      assert.ok(Array.isArray(res.json.chapters));
      assert.ok(Array.isArray(res.json.targetExams));

      if (res.json.chapters.length > 0) {
        const ch = res.json.chapters[0];
        assert.ok(ch.title);
        assert.ok(ch.chapter_number >= 1);
        assert.ok(ch.subject_name);
      }
    } finally {
      await c.close();
    }
  });
});

describe('Phase 3 — Previous-Year Question Papers (PYQ) Repository', () => {
  it('GET /api/v1/library/pyq lists verified past papers for target examinations', async () => {
    const c = await boot();
    try {
      const res = await call(c.base, 'GET', '/api/v1/library/pyq');
      assert.equal(res.status, 200);
      assert.equal(res.json.success, true);
      assert.ok(Array.isArray(res.json.papers));
      assert.ok(res.json.papers.length >= 3);

      const tnpsc = res.json.papers.find((p: any) => p.exam_slug === 'tnpsc-group-2');
      assert.ok(tnpsc);
      assert.equal(tnpsc.year, 2022);
      assert.equal(tnpsc.authority_code, 'TNPSC');
      assert.ok(tnpsc.provenance_note);

      const ssc = res.json.papers.find((p: any) => p.exam_slug === 'ssc-cgl');
      assert.ok(ssc);
      assert.equal(ssc.year, 2023);
      assert.equal(ssc.authority_code, 'SSC');
    } finally {
      await c.close();
    }
  });

  it('GET /api/v1/library/pyq/:id strictly separates official answer key, calculated key, and explanation', async () => {
    const c = await boot();
    try {
      const listRes = await call(c.base, 'GET', '/api/v1/library/pyq?exam_slug=tnpsc-group-2');
      assert.ok(listRes.json.papers.length > 0);
      const paperId = listRes.json.papers[0].id;

      const res = await call(c.base, 'GET', `/api/v1/library/pyq/${paperId}`);
      assert.equal(res.status, 200);
      assert.equal(res.json.paper.id, paperId);
      assert.ok(res.json.paper.official_key_url);
      assert.ok(Array.isArray(res.json.questions));

      if (res.json.questions.length > 0) {
        const q1 = res.json.questions[0];
        assert.equal(q1.question_number, 1);
        assert.equal(q1.official_key, 'A');
        assert.equal(q1.calculated_key, 'A');
        assert.ok(q1.ai_or_expert_explanation); // Stored independently from official key
        assert.ok(q1.discrepancy_note);
      }
    } finally {
      await c.close();
    }
  });
});

describe('teardown (library)', () => {
  it('closes the database pools and stops the embedded PostgreSQL', async () => {
    await stopPg();
  });
});

