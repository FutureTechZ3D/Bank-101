import { Request, Response } from 'express';
import { query } from '../../config/db';

function ok(res: Response, data: any) {
  return res.json({ success: true, ...data });
}

function fail(res: Response, message: string, status = 400) {
  return res.status(status).json({ success: false, message });
}

function serverError(res: Response, tag: string, err: any) {
  console.error(tag, err);
  return res.status(500).json({ success: false, message: 'Internal server error' });
}

// ── 01. Digital Academic Books ────────────────────────────────────────────────
export async function listBooks(req: Request, res: Response) {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : null;
    const examSlug = typeof req.query.exam_slug === 'string' ? req.query.exam_slug : null;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : null;

    let sql = `
      SELECT b.id, b.category, b.title, b.authors, b.publisher, b.publication_year,
             b.language, b.edition, b.cover_image_url, b.source_url,
             CASE WHEN lic.can_redistribute = true AND b.is_quarantined = false THEN b.download_url ELSE NULL END AS download_url,
             b.is_quarantined,
             lic.code AS license_code, lic.name AS license_name, lic.can_redistribute, lic.attribution_required,
             (SELECT count(*)::int FROM book_chapters ch WHERE ch.book_id = b.id) AS chapters_count
        FROM books b
        JOIN licenses lic ON lic.id = b.license_id
       WHERE b.is_active = true
    `;
    const params: any[] = [];

    if (category) {
      params.push(category);
      sql += ` AND b.category = $${params.length}`;
    }
    if (examSlug) {
      params.push(examSlug);
      sql += ` AND EXISTS (
        SELECT 1 FROM book_exam_map bem
        JOIN exams ex ON ex.id = bem.exam_id
        WHERE bem.book_id = b.id AND ex.slug = $${params.length}
      )`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (b.title ILIKE $${params.length} OR b.authors ILIKE $${params.length} OR b.category ILIKE $${params.length})`;
    }

    sql += ` ORDER BY b.category ASC, b.title ASC`;
    const r = await query(sql, params);

    return ok(res, { books: r.rows });
  } catch (err) {
    return serverError(res, 'listBooks:', err);
  }
}

export async function getBookDetail(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) return fail(res, 'Invalid book ID');

  try {
    const bookRes = await query(
      `SELECT b.id, b.category, b.title, b.authors, b.publisher, b.publication_year,
              b.language, b.edition, b.isbn, b.cover_image_url, b.source_url,
              CASE WHEN lic.can_redistribute = true AND b.is_quarantined = false THEN b.download_url ELSE NULL END AS download_url,
              b.is_quarantined,
              lic.code AS license_code, lic.name AS license_name, lic.can_redistribute, lic.terms_summary
         FROM books b
         JOIN licenses lic ON lic.id = b.license_id
        WHERE b.id = $1 AND b.is_active = true`,
      [id]
    );

    if (!bookRes.rows[0]) return fail(res, 'Book not found', 404);
    const book = bookRes.rows[0];

    // Fetch chapters with topic mapping
    const chaptersRes = await query(
      `SELECT ch.id, ch.chapter_number, ch.title, ch.page_start, ch.page_end,
              s.name AS subject_name,
              t.name AS topic_name
         FROM book_chapters ch
         LEFT JOIN subjects s ON s.id = ch.subject_id
         LEFT JOIN topics t ON t.id = ch.topic_id
        WHERE ch.book_id = $1
        ORDER BY ch.chapter_number ASC`,
      [id]
    );

    // Fetch mapped exams
    const examsRes = await query(
      `SELECT ex.id, ex.code, ex.title, ex.slug, bem.relevance_score
         FROM book_exam_map bem
         JOIN exams ex ON ex.id = bem.exam_id
        WHERE bem.book_id = $1
        ORDER BY bem.relevance_score DESC`,
      [id]
    );

    return ok(res, {
      book,
      chapters: chaptersRes.rows,
      targetExams: examsRes.rows,
    });
  } catch (err) {
    return serverError(res, 'getBookDetail:', err);
  }
}

// ── 02. Previous-Year Question Papers (PYQ) ───────────────────────────────────
export async function listPYQPapers(req: Request, res: Response) {
  try {
    const examSlug = typeof req.query.exam_slug === 'string' ? req.query.exam_slug : null;
    const year = typeof req.query.year === 'string' ? Number(req.query.year) : null;

    let sql = `
      SELECT p.id, p.year, p.shift_session, p.language, p.title,
             p.original_paper_url, p.official_key_url, p.total_questions,
             p.is_verified, p.provenance_note,
             ex.slug AS exam_slug, ex.title AS exam_title,
             auth.code AS authority_code,
             st.name AS stage_name
        FROM pyq_papers p
        JOIN exams ex ON ex.id = p.exam_id
        JOIN exam_authorities auth ON auth.id = ex.authority_id
        LEFT JOIN exam_stages st ON st.id = p.stage_id
       WHERE 1=1
    `;
    const params: any[] = [];

    if (examSlug) {
      params.push(examSlug);
      sql += ` AND ex.slug = $${params.length}`;
    }
    if (year && !isNaN(year)) {
      params.push(year);
      sql += ` AND p.year = $${params.length}`;
    }

    sql += ` ORDER BY p.year DESC, ex.title ASC`;
    const r = await query(sql, params);

    return ok(res, { papers: r.rows });
  } catch (err) {
    return serverError(res, 'listPYQPapers:', err);
  }
}

export async function getPYQDetail(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) return fail(res, 'Invalid PYQ paper ID');

  try {
    const paperRes = await query(
      `SELECT p.id, p.year, p.shift_session, p.language, p.title,
              p.original_paper_url, p.official_key_url, p.total_questions,
              p.is_verified, p.provenance_note,
              ex.slug AS exam_slug, ex.title AS exam_title,
              auth.code AS authority_code, auth.name AS authority_name,
              st.name AS stage_name
         FROM pyq_papers p
         JOIN exams ex ON ex.id = p.exam_id
         JOIN exam_authorities auth ON auth.id = ex.authority_id
         LEFT JOIN exam_stages st ON st.id = p.stage_id
        WHERE p.id = $1`,
      [id]
    );

    if (!paperRes.rows[0]) return fail(res, 'Previous-year paper not found', 404);
    const paper = paperRes.rows[0];

    // Fetch verified questions mapped to this paper
    const questionsRes = await query(
      `SELECT pq.id, pq.question_number, pq.official_key, pq.calculated_key,
              pq.key_status, pq.discrepancy_note, pq.is_verified,
              qb.id AS question_id, qb.question_text, qb.difficulty, qb.question_type,
              exp.detailed_text AS ai_or_expert_explanation
         FROM pyq_questions pq
         LEFT JOIN question_bank qb ON qb.id = pq.question_id
         LEFT JOIN explanations exp ON exp.question_id = qb.id
        WHERE pq.pyq_paper_id = $1
        ORDER BY pq.question_number ASC`,
      [id]
    );

    return ok(res, {
      paper,
      questions: questionsRes.rows,
    });
  } catch (err) {
    return serverError(res, 'getPYQDetail:', err);
  }
}

