import { Request, Response } from 'express';
import { query } from '../../config/db';

function ok(res: Response, data: any) {
  return res.json({ status: 'success', ...data });
}

function fail(res: Response, message: string, status = 400) {
  return res.status(status).json({ status: 'error', message });
}

function serverError(res: Response, tag: string, err: any) {
  console.error(tag, err);
  return res.status(500).json({ status: 'error', message: 'Internal server error' });
}

// ── 01. Authorities ──────────────────────────────────────────────────────────
export async function listAuthorities(req: Request, res: Response) {
  try {
    const stateCode = typeof req.query.state === 'string' ? req.query.state.toUpperCase() : null;
    const isNational = req.query.national === 'true' ? true : req.query.national === 'false' ? false : null;

    let sql = `
      SELECT a.id, a.code, a.name, a.website_url, a.description,
             s.name AS state_name, s.code AS state_code, s.is_national,
             (SELECT count(*)::int FROM exams e WHERE e.authority_id = a.id AND e.is_active = true) AS active_exams_count
        FROM exam_authorities a
        LEFT JOIN states s ON s.id = a.state_id
       WHERE 1=1
    `;
    const params: any[] = [];
    if (stateCode) {
      params.push(stateCode);
      sql += ` AND s.code = $${params.length}`;
    }
    if (isNational !== null) {
      params.push(isNational);
      sql += ` AND s.is_national = $${params.length}`;
    }
    sql += ` ORDER BY s.is_national DESC, s.name ASC, a.name ASC`;

    const r = await query(sql, params);
    return ok(res, { authorities: r.rows });
  } catch (err) {
    return serverError(res, 'listAuthorities:', err);
  }
}

export async function getAuthorityDetail(req: Request, res: Response) {
  const codeOrId = req.params.codeOrId;
  try {
    const isNum = /^\d+$/.test(codeOrId);
    const authSql = `
      SELECT a.id, a.code, a.name, a.website_url, a.description,
             s.name AS state_name, s.code AS state_code, s.is_national
        FROM exam_authorities a
        LEFT JOIN states s ON s.id = a.state_id
       WHERE ${isNum ? 'a.id = $1' : 'upper(a.code) = upper($1)'}
    `;
    const authRes = await query(authSql, [codeOrId]);
    if (!authRes.rows[0]) return fail(res, 'Exam authority not found', 404);

    const authority = authRes.rows[0];
    const examsRes = await query(
      `SELECT e.id, e.code, e.title, e.slug, e.description, e.eligibility_summary,
              c.name AS category_name,
              (SELECT count(*)::int FROM exam_stages st WHERE st.exam_id = e.id) AS stages_count
         FROM exams e
         LEFT JOIN exam_categories c ON c.id = e.category_id
        WHERE e.authority_id = $1 AND e.is_active = true
        ORDER BY e.title ASC`,
      [authority.id]
    );

    return ok(res, { authority, exams: examsRes.rows });
  } catch (err) {
    return serverError(res, 'getAuthorityDetail:', err);
  }
}

// ── 02. Exams ────────────────────────────────────────────────────────────────
export async function listExams(req: Request, res: Response) {
  try {
    const authority = typeof req.query.authority === 'string' ? req.query.authority : null;
    const category = typeof req.query.category === 'string' ? req.query.category : null;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : null;

    let sql = `
      SELECT e.id, e.code, e.title, e.slug, e.description, e.eligibility_summary, e.is_active,
             a.code AS authority_code, a.name AS authority_name,
             s.name AS state_name, s.code AS state_code, s.is_national,
             c.name AS category_name,
             (SELECT count(*)::int FROM exam_stages st WHERE st.exam_id = e.id) AS stages_count,
             (SELECT version_label FROM syllabuses syl WHERE syl.exam_id = e.id AND syl.is_active = true ORDER BY syl.id DESC LIMIT 1) AS active_syllabus_version
        FROM exams e
        JOIN exam_authorities a ON a.id = e.authority_id
        LEFT JOIN states s ON s.id = a.state_id
        LEFT JOIN exam_categories c ON c.id = e.category_id
       WHERE e.is_active = true
    `;
    const params: any[] = [];
    if (authority) {
      params.push(authority);
      sql += ` AND (upper(a.code) = upper($${params.length}) OR e.authority_id = ${/^\d+$/.test(authority) ? authority : -1})`;
    }
    if (category) {
      params.push(category);
      sql += ` AND upper(c.name) = upper($${params.length})`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (e.title ILIKE $${params.length} OR e.code ILIKE $${params.length} OR e.description ILIKE $${params.length})`;
    }
    sql += ` ORDER BY e.id ASC`;

    const r = await query(sql, params);
    return ok(res, { exams: r.rows });
  } catch (err) {
    return serverError(res, 'listExams:', err);
  }
}

export async function getExamDetail(req: Request, res: Response) {
  const slugOrId = req.params.slugOrId;
  try {
    const isNum = /^\d+$/.test(slugOrId);
    const examRes = await query(
      `SELECT e.id, e.code, e.title, e.slug, e.description, e.eligibility_summary, e.is_active, e.created_at,
              a.code AS authority_code, a.name AS authority_name, a.website_url AS authority_url,
              s.name AS state_name, s.code AS state_code, s.is_national,
              c.name AS category_name
         FROM exams e
         JOIN exam_authorities a ON a.id = e.authority_id
         LEFT JOIN states s ON s.id = a.state_id
         LEFT JOIN exam_categories c ON c.id = e.category_id
        WHERE ${isNum ? 'e.id = $1' : 'e.slug = $1'}`,
      [slugOrId]
    );

    if (!examRes.rows[0]) return fail(res, 'Examination not found', 404);
    const exam = examRes.rows[0];

    // Stages and papers
    const stagesRes = await query(
      `SELECT st.id, st.stage_order, st.name, st.pattern_summary
         FROM exam_stages st
        WHERE st.exam_id = $1
        ORDER BY st.stage_order ASC`,
      [exam.id]
    );

    const stages = [];
    for (const st of stagesRes.rows) {
      const papersRes = await query(
        `SELECT p.id, p.paper_number, p.title, p.duration_minutes, p.total_marks, p.negative_marking_ratio
           FROM papers p
          WHERE p.stage_id = $1
          ORDER BY p.paper_number ASC`,
        [st.id]
      );
      stages.push({ ...st, papers: papersRes.rows });
    }

    // Active syllabus info
    const sylRes = await query(
      `SELECT syl.id, syl.version_label, syl.effective_from, syl.source_notification_url
         FROM syllabuses syl
        WHERE syl.exam_id = $1 AND syl.is_active = true
        ORDER BY syl.id DESC LIMIT 1`,
      [exam.id]
    );

    return ok(res, {
      exam,
      stages,
      syllabus: sylRes.rows[0] || null,
    });
  } catch (err) {
    return serverError(res, 'getExamDetail:', err);
  }
}

// ── 03. Syllabus Tree ─────────────────────────────────────────────────────────
export async function getExamSyllabus(req: Request, res: Response) {
  const slugOrId = req.params.slugOrId;
  try {
    const isNum = /^\d+$/.test(slugOrId);
    const examRes = await query(
      `SELECT id, title, slug FROM exams WHERE ${isNum ? 'id = $1' : 'slug = $1'}`,
      [slugOrId]
    );
    if (!examRes.rows[0]) return fail(res, 'Examination not found', 404);
    const exam = examRes.rows[0];

    // Subjects mapped to this exam
    const subjectsRes = await query(
      `SELECT DISTINCT s.id, s.name, esm.weightage_percent
         FROM exam_subject_map esm
         JOIN subjects s ON s.id = esm.subject_id
        WHERE esm.exam_id = $1
        ORDER BY s.name ASC`,
      [exam.id]
    );

    const syllabusTree = [];
    for (const sub of subjectsRes.rows) {
      const unitsRes = await query(
        `SELECT u.id, u.unit_number, u.title, u.description
           FROM units u
          WHERE u.subject_id = $1
          ORDER BY u.unit_number ASC`,
        [sub.id]
      );

      const units = [];
      for (const u of unitsRes.rows) {
        // Topics for this subject
        const topicsRes = await query(
          `SELECT t.id, t.name,
                  (SELECT count(*)::int FROM quiz_tests q WHERE q.topic_id = t.id) AS quiz_count
             FROM topics t
            WHERE t.subject_id = $1
            ORDER BY t.name ASC`,
          [sub.id]
        );

        const topics = [];
        for (const top of topicsRes.rows) {
          const subtopicsRes = await query(
            `SELECT st.id, st.title, st.learning_outcomes
               FROM subtopics st
              WHERE st.topic_id = $1
              ORDER BY st.id ASC`,
            [top.id]
          );
          topics.push({ ...top, subtopics: subtopicsRes.rows });
        }
        units.push({ ...u, topics });
      }

      syllabusTree.push({
        subject_id: sub.id,
        subject_name: sub.name,
        weightage_percent: sub.weightage_percent,
        units,
      });
    }

    return ok(res, {
      exam: { id: exam.id, title: exam.title, slug: exam.slug },
      syllabusTree,
    });
  } catch (err) {
    return serverError(res, 'getExamSyllabus:', err);
  }
}

// ── 04. Cross-Exam Comparison Engine ──────────────────────────────────────────
export async function compareExams(req: Request, res: Response) {
  const slugsParam = typeof req.query.exams === 'string' ? req.query.exams : '';
  const slugs = slugsParam.split(',').map((s) => s.trim()).filter(Boolean);

  if (slugs.length < 2) {
    return fail(res, 'Please provide at least 2 exam slugs to compare (e.g. ?exams=tnpsc-group-2,ssc-cgl)');
  }

  try {
    const examsRes = await query(
      `SELECT e.id, e.code, e.title, e.slug, e.description, e.eligibility_summary,
              a.code AS authority_code, a.name AS authority_name,
              s.name AS state_name, s.code AS state_code, s.is_national,
              c.name AS category_name
         FROM exams e
         JOIN exam_authorities a ON a.id = e.authority_id
         LEFT JOIN states s ON s.id = a.state_id
         LEFT JOIN exam_categories c ON c.id = e.category_id
        WHERE e.slug = ANY($1::text[])`,
      [slugs]
    );

    if (examsRes.rows.length < 2) {
      return fail(res, 'Could not find at least 2 valid examinations from the provided slugs');
    }

    const comparedExams = [];
    const examIds = examsRes.rows.map((e: any) => e.id);

    for (const e of examsRes.rows) {
      const stagesRes = await query(
        `SELECT st.id, st.stage_order, st.name, st.pattern_summary
           FROM exam_stages st
          WHERE st.exam_id = $1
          ORDER BY st.stage_order ASC`,
        [e.id]
      );
      const papersRes = await query(
        `SELECT p.id, p.paper_number, p.title, p.duration_minutes, p.total_marks, p.negative_marking_ratio
           FROM papers p
           JOIN exam_stages st ON st.id = p.stage_id
          WHERE st.exam_id = $1
          ORDER BY st.stage_order, p.paper_number`,
        [e.id]
      );
      const subjectsRes = await query(
        `SELECT DISTINCT s.id, s.name
           FROM exam_subject_map esm
           JOIN subjects s ON s.id = esm.subject_id
          WHERE esm.exam_id = $1`,
        [e.id]
      );

      comparedExams.push({
        ...e,
        stages: stagesRes.rows,
        papers: papersRes.rows,
        subjects: subjectsRes.rows,
      });
    }

    // Calculate common overlapping subjects
    const commonSubjectsRes = await query(
      `SELECT s.id, s.name, count(DISTINCT esm.exam_id)::int AS appearing_in_exams_count
         FROM exam_subject_map esm
         JOIN subjects s ON s.id = esm.subject_id
        WHERE esm.exam_id = ANY($1::int[])
        GROUP BY s.id, s.name
       HAVING count(DISTINCT esm.exam_id) >= 2`,
      [examIds]
    );

    const overlapPercentage = Math.round(
      (commonSubjectsRes.rows.length / Math.max(1, comparedExams.reduce((acc, x) => acc + x.subjects.length, 0) / comparedExams.length)) * 100
    );

    return ok(res, {
      comparedExams,
      comparison: {
        totalCompared: comparedExams.length,
        commonSubjects: commonSubjectsRes.rows,
        overlapPercentage: Math.min(100, overlapPercentage),
        preparationSynergyNote:
          commonSubjectsRes.rows.length > 0
            ? `Preparing common subjects (${commonSubjectsRes.rows.map((s: any) => s.name).join(', ')}) covers syllabus requirements across all selected examinations.`
            : 'No direct subject overlaps detected in current mappings.',
      },
    });
  } catch (err) {
    return serverError(res, 'compareExams:', err);
  }
}
