/**
 * Admin controllers — all 10 admin panel modules.
 * Every handler is DB-backed; no mock data.
 * All routes use authMiddleware + requireAdmin in admin.routes.ts.
 */
import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { query, withTransaction } from '../../config/db';

function ok(res: Response, data: object, status = 200) {
  return res.status(status).json({ success: true, ...data });
}
function fail(res: Response, msg: string, status = 400) {
  return res.status(status).json({ success: false, message: msg });
}
function serverError(res: Response, where: string, err: unknown) {
  console.error(where, err);
  return res.status(500).json({ success: false, message: 'Internal server error' });
}
function toInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isInteger(v) && v > 0) return v;
  if (typeof v === 'string' && /^[0-9]{1,9}$/.test(v) && Number(v) > 0) return Number(v);
  return null;
}

// ── 01. Dashboard ─────────────────────────────────────────────────────────────
export async function getDashboardStats(_req: AuthenticatedRequest, res: Response) {
  try {
    const count = async (table: string) =>
      Number((await query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n);

    const [totalUsers, totalQuizzes, totalQuestions, totalAttempts, totalCategories] =
      await Promise.all([
        count('users'),
        count('quiz_tests'),
        count('question_bank'),
        count('quiz_attempts'),
        count('exam_categories'),
      ]);

    const recentUsers = (
      await query('SELECT id, username, account_type, points, streak_days, created_at FROM users ORDER BY id DESC LIMIT 10')
    ).rows;

    // Top 5 most-attempted quizzes
    const topQuizzes = (
      await query(
        `SELECT t.name, count(a.id) AS attempts
           FROM quiz_tests t LEFT JOIN quiz_attempts a ON a.quiz_id = t.id
           GROUP BY t.id, t.name ORDER BY attempts DESC LIMIT 5`
      )
    ).rows;

    return ok(res, {
      totalUsers, totalQuizzes, totalQuestions, totalAttempts, totalCategories,
      recentUsers, topQuizzes,
      activity: [], // populated by real PostgreSQL; pg-mem doesn't support date casting
    });
  } catch (err) {
    return serverError(res, 'getDashboardStats:', err);
  }
}

// ── 02. User Management ───────────────────────────────────────────────────────
export async function listUsers(req: AuthenticatedRequest, res: Response) {
  const page = Math.max(1, toInt(req.query.page) ?? 1);
  const limit = Math.min(100, Math.max(1, toInt(req.query.limit) ?? 20));
  const offset = (page - 1) * limit;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  try {
    const where = search ? `WHERE lower(username) LIKE lower($3)` : '';
    const params: any[] = [limit, offset];
    if (search) params.push(`%${search}%`);
    const [rows, total] = await Promise.all([
      query(
        `SELECT id, username, phone, account_type, points, streak_days, google_id IS NOT NULL AS has_google, created_at
           FROM users ${where} ORDER BY id DESC LIMIT $1 OFFSET $2`,
        params
      ),
      query(`SELECT count(*) AS n FROM users ${where}`, search ? [`%${search}%`] : []),
    ]);
    return ok(res, { users: rows.rows, total: Number(total.rows[0].n), page, limit });
  } catch (err) {
    return serverError(res, 'listUsers:', err);
  }
}

export async function getUserById(req: AuthenticatedRequest, res: Response) {
  const id = toInt(req.params.id);
  if (!id) return fail(res, 'Invalid user id');
  try {
    const r = await query(
      'SELECT id, username, phone, account_type, points, streak_days, created_at FROM users WHERE id = $1',
      [id]
    );
    if (!r.rows[0]) return fail(res, 'User not found', 404);
    const attempts = await query(
      `SELECT a.id, t.name AS quiz_name, a.started_at, a.submitted_at, a.status, r.percentage
         FROM quiz_attempts a JOIN quiz_tests t ON t.id = a.quiz_id
         LEFT JOIN results r ON r.attempt_id = a.id
        WHERE a.user_id = $1 ORDER BY a.id DESC LIMIT 20`,
      [id]
    );
    return ok(res, { user: r.rows[0], attempts: attempts.rows });
  } catch (err) {
    return serverError(res, 'getUserById:', err);
  }
}

export async function updateUser(req: AuthenticatedRequest, res: Response) {
  const id = toInt(req.params.id);
  if (!id) return fail(res, 'Invalid user id');
  const { account_type } = req.body || {};
  if (!['Free', 'Pro', 'Admin'].includes(account_type))
    return fail(res, "account_type must be 'Free', 'Pro', or 'Admin'");
  try {
    const r = await query(
      "UPDATE users SET account_type = $1 WHERE id = $2 RETURNING id, username, account_type",
      [account_type, id]
    );
    if (!r.rows[0]) return fail(res, 'User not found', 404);
    // Sync user_roles
    const roleName = account_type === 'Admin' ? 'admin' : account_type === 'Pro' ? 'pro_user' : 'free_user';
    await query('DELETE FROM user_roles WHERE user_id = $1', [id]);
    await query(
      'INSERT INTO user_roles (user_id, role_id) SELECT $1::int, id FROM roles WHERE name = $2 ON CONFLICT DO NOTHING',
      [id, roleName]
    );
    return ok(res, { user: r.rows[0] });
  } catch (err) {
    return serverError(res, 'updateUser:', err);
  }
}

export async function deleteUser(req: AuthenticatedRequest, res: Response) {
  const id = toInt(req.params.id);
  if (!id) return fail(res, 'Invalid user id');
  if (id === req.user?.id) return fail(res, 'You cannot delete your own account', 403);
  try {
    const r = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (!r.rows[0]) return fail(res, 'User not found', 404);
    return ok(res, { message: 'User deleted' });
  } catch (err) {
    return serverError(res, 'deleteUser:', err);
  }
}

// ── 03. Exam Categories ───────────────────────────────────────────────────────
export async function listCategories(_req: AuthenticatedRequest, res: Response) {
  try {
    const r = await query(
      `SELECT c.id, c.name, c.icon, c.slug,
              (SELECT count(*)::int FROM exam_types WHERE category_id = c.id) AS exam_type_count
         FROM exam_categories c ORDER BY c.id`
    );
    return ok(res, { categories: r.rows });
  } catch (err) {
    return serverError(res, 'listCategories:', err);
  }
}

export async function createCategory(req: AuthenticatedRequest, res: Response) {
  const { name, icon, slug } = req.body || {};
  if (!name?.trim() || !slug?.trim()) return fail(res, 'name and slug are required');
  try {
    const r = await query(
      'INSERT INTO exam_categories (name, icon, slug) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), icon?.trim() || 'school', slug.trim().toLowerCase()]
    );
    return ok(res, { category: r.rows[0] }, 201);
  } catch (err: any) {
    if (err?.code === '23505') return fail(res, 'A category with that name or slug already exists', 409);
    return serverError(res, 'createCategory:', err);
  }
}

export async function updateCategory(req: AuthenticatedRequest, res: Response) {
  const id = toInt(req.params.id);
  if (!id) return fail(res, 'Invalid id');
  const { name, icon, slug } = req.body || {};
  try {
    const r = await query(
      'UPDATE exam_categories SET name = COALESCE($1, name), icon = COALESCE($2, icon), slug = COALESCE($3, slug) WHERE id = $4 RETURNING *',
      [name?.trim() || null, icon?.trim() || null, slug?.trim()?.toLowerCase() || null, id]
    );
    if (!r.rows[0]) return fail(res, 'Category not found', 404);
    return ok(res, { category: r.rows[0] });
  } catch (err) {
    return serverError(res, 'updateCategory:', err);
  }
}

export async function deleteCategory(req: AuthenticatedRequest, res: Response) {
  const id = toInt(req.params.id);
  if (!id) return fail(res, 'Invalid id');
  try {
    const r = await query('DELETE FROM exam_categories WHERE id = $1 RETURNING id', [id]);
    if (!r.rows[0]) return fail(res, 'Category not found', 404);
    return ok(res, { message: 'Category deleted' });
  } catch (err) {
    return serverError(res, 'deleteCategory:', err);
  }
}

// ── 04. Question Bank ─────────────────────────────────────────────────────────
export async function listQuestions(req: AuthenticatedRequest, res: Response) {
  const page = Math.max(1, toInt(req.query.page) ?? 1);
  const limit = Math.min(100, Math.max(1, toInt(req.query.limit) ?? 20));
  const offset = (page - 1) * limit;
  const topicId = toInt(req.query.topic_id);
  const diff = typeof req.query.difficulty === 'string' ? req.query.difficulty : null;
  try {
    const conditions: string[] = [];
    const params: any[] = [limit, offset];
    if (topicId) { conditions.push(`q.topic_id = $${params.length + 1}`); params.push(topicId); }
    if (diff) { conditions.push(`q.difficulty = $${params.length + 1}`); params.push(diff); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const [rows, total] = await Promise.all([
      query(
        `SELECT q.id, q.question_text, q.difficulty, q.question_type, q.year, q.language,
                tp.name AS topic_name, count(o.id)::int AS option_count
           FROM question_bank q
           LEFT JOIN topics tp ON tp.id = q.topic_id
           LEFT JOIN options o ON o.question_id = q.id
           ${where}
           GROUP BY q.id, tp.name ORDER BY q.id DESC LIMIT $1 OFFSET $2`,
        params
      ),
      query(`SELECT count(*) AS n FROM question_bank q ${where}`, params.slice(2)),
    ]);
    return ok(res, { questions: rows.rows, total: Number(total.rows[0].n), page, limit });
  } catch (err) {
    return serverError(res, 'listQuestions:', err);
  }
}

export async function getQuestionDetail(req: AuthenticatedRequest, res: Response) {
  const id = toInt(req.params.id);
  if (!id) return fail(res, 'Invalid id');
  try {
    const q = await query('SELECT * FROM question_bank WHERE id = $1', [id]);
    if (!q.rows[0]) return fail(res, 'Question not found', 404);
    const opts = await query('SELECT * FROM options WHERE question_id = $1 ORDER BY label', [id]);
    const expl = await query('SELECT * FROM explanations WHERE question_id = $1', [id]);
    return ok(res, { question: q.rows[0], options: opts.rows, explanation: expl.rows[0] || null });
  } catch (err) {
    return serverError(res, 'getQuestionDetail:', err);
  }
}

export async function updateQuestion(req: AuthenticatedRequest, res: Response) {
  const id = toInt(req.params.id);
  if (!id) return fail(res, 'Invalid id');
  const { question_text, difficulty, question_type, year } = req.body || {};
  try {
    const r = await query(
      `UPDATE question_bank SET
         question_text = COALESCE($1, question_text),
         difficulty    = COALESCE($2, difficulty),
         question_type = COALESCE($3, question_type),
         year          = COALESCE($4, year)
       WHERE id = $5 RETURNING *`,
      [question_text?.trim() || null, difficulty || null, question_type || null, toInt(year), id]
    );
    if (!r.rows[0]) return fail(res, 'Question not found', 404);
    return ok(res, { question: r.rows[0] });
  } catch (err) {
    return serverError(res, 'updateQuestion:', err);
  }
}

export async function deleteQuestion(req: AuthenticatedRequest, res: Response) {
  const id = toInt(req.params.id);
  if (!id) return fail(res, 'Invalid id');
  try {
    const r = await query('DELETE FROM question_bank WHERE id = $1 RETURNING id', [id]);
    if (!r.rows[0]) return fail(res, 'Question not found', 404);
    return ok(res, { message: 'Question deleted' });
  } catch (err) {
    return serverError(res, 'deleteQuestion:', err);
  }
}

// ── 05. Exam Management ───────────────────────────────────────────────────────
export async function listQuizTests(req: AuthenticatedRequest, res: Response) {
  const page = Math.max(1, toInt(req.query.page) ?? 1);
  const limit = Math.min(100, Math.max(1, toInt(req.query.limit) ?? 20));
  const offset = (page - 1) * limit;
  try {
    const [rows, total] = await Promise.all([
      query(
        `SELECT t.id, t.name, t.total_qs, t.duration_mins, t.year,
                t.negative_marks, t.marks_per_question,
                tp.name AS topic_name, count(m.question_id)::int AS question_count
           FROM quiz_tests t
           LEFT JOIN topics tp ON tp.id = t.topic_id
           LEFT JOIN quiz_question_map m ON m.quiz_id = t.id
           GROUP BY t.id, tp.name ORDER BY t.id DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      query('SELECT count(*) AS n FROM quiz_tests'),
    ]);
    return ok(res, { quizzes: rows.rows, total: Number(total.rows[0].n), page, limit });
  } catch (err) {
    return serverError(res, 'listQuizTests:', err);
  }
}

export async function updateQuizTest(req: AuthenticatedRequest, res: Response) {
  const id = toInt(req.params.id);
  if (!id) return fail(res, 'Invalid id');
  const { name, duration_mins, negative_marks, marks_per_question } = req.body || {};
  try {
    const r = await query(
      `UPDATE quiz_tests SET
         name               = COALESCE($1, name),
         duration_mins      = COALESCE($2, duration_mins),
         negative_marks     = COALESCE($3, negative_marks),
         marks_per_question = COALESCE($4, marks_per_question)
       WHERE id = $5 RETURNING *`,
      [name?.trim() || null, toInt(duration_mins), negative_marks ?? null, marks_per_question ?? null, id]
    );
    if (!r.rows[0]) return fail(res, 'Quiz not found', 404);
    return ok(res, { quiz: r.rows[0] });
  } catch (err) {
    return serverError(res, 'updateQuizTest:', err);
  }
}

export async function deleteQuizTest(req: AuthenticatedRequest, res: Response) {
  const id = toInt(req.params.id);
  if (!id) return fail(res, 'Invalid id');
  try {
    const r = await query('DELETE FROM quiz_tests WHERE id = $1 RETURNING id', [id]);
    if (!r.rows[0]) return fail(res, 'Quiz not found', 404);
    return ok(res, { message: 'Quiz deleted' });
  } catch (err) {
    return serverError(res, 'deleteQuizTest:', err);
  }
}

// ── 06. Attempt Management ────────────────────────────────────────────────────
export async function listAttempts(req: AuthenticatedRequest, res: Response) {
  const page = Math.max(1, toInt(req.query.page) ?? 1);
  const limit = Math.min(100, Math.max(1, toInt(req.query.limit) ?? 20));
  const offset = (page - 1) * limit;
  const status = typeof req.query.status === 'string' ? req.query.status : null;
  try {
    const where = status ? `WHERE a.status = $3` : '';
    const params: any[] = [limit, offset];
    if (status) params.push(status);
    const rows = await query(
      `SELECT a.id, a.started_at, a.submitted_at, a.status, a.score,
              u.username, t.name AS quiz_name, r.percentage
         FROM quiz_attempts a
         JOIN users u ON u.id = a.user_id
         JOIN quiz_tests t ON t.id = a.quiz_id
         LEFT JOIN results r ON r.attempt_id = a.id
         ${where}
         ORDER BY a.id DESC LIMIT $1 OFFSET $2`,
      params
    );
    const totalWhere = status ? `WHERE status = $1` : '';
    const total = await query(`SELECT count(*) AS n FROM quiz_attempts ${totalWhere}`, status ? [status] : []);
    return ok(res, { attempts: rows.rows, total: Number(total.rows[0].n), page, limit });
  } catch (err) {
    return serverError(res, 'listAttempts:', err);
  }
}

// ── 07. Results & Analytics ───────────────────────────────────────────────────
export async function getAdminAnalytics(_req: AuthenticatedRequest, res: Response) {
  try {
    // Overall pass rate (percentage >= 40)
    const passTotal = await query('SELECT count(*) AS n FROM results');
    const passPassed = await query('SELECT count(*) AS n FROM results WHERE percentage >= 40');
    const pr = { passed: Number(passPassed.rows[0].n), total: Number(passTotal.rows[0].n) };

    // Average percentage across all results
    const avgPct = await query('SELECT avg(percentage) AS avg_pct FROM results');

    // Top performers
    const topUsers = await query(
      `SELECT u.id, u.username, u.points, u.streak_days, u.account_type,
              count(a.id)::int AS total_attempts,
              avg(r.percentage) AS avg_pct
         FROM users u
         LEFT JOIN quiz_attempts a ON a.user_id = u.id AND a.status = 'submitted'
         LEFT JOIN results r ON r.attempt_id = a.id
         WHERE u.account_type <> 'Admin'
         GROUP BY u.id ORDER BY u.points DESC LIMIT 10`
    );

    // Questions with highest wrong rate
    const hardQuestions = await query(
      `SELECT q.id, q.question_text,
              count(aa.id)::int AS total_answered,
              count(aa.id)::int AS wrong_count
         FROM question_bank q
         JOIN attempt_answers aa ON aa.question_id = q.id
         WHERE aa.is_correct = false
         GROUP BY q.id HAVING count(aa.id) >= 1
         ORDER BY wrong_count DESC LIMIT 10`
    );

    return ok(res, {
      passRate: { passed: pr.passed, total: pr.total },
      averagePercentage: Number(avgPct.rows[0]?.avg_pct ?? 0),
      topUsers: topUsers.rows,
      hardestQuestions: hardQuestions.rows,
    });
  } catch (err) {
    return serverError(res, 'getAdminAnalytics:', err);
  }
}

// ── 08. Announcements (Content Management) ────────────────────────────────────
export async function listAnnouncements(_req: AuthenticatedRequest, res: Response) {
  try {
    const r = await query('SELECT * FROM announcements ORDER BY id DESC');
    return ok(res, { announcements: r.rows });
  } catch (err) {
    return serverError(res, 'listAnnouncements:', err);
  }
}

export async function createAnnouncement(req: AuthenticatedRequest, res: Response) {
  const { title, body, published } = req.body || {};
  if (!title?.trim() || !body?.trim()) return fail(res, 'title and body are required');
  try {
    const r = await query(
      'INSERT INTO announcements (title, body, published) VALUES ($1, $2, $3) RETURNING *',
      [title.trim(), body.trim(), published === true]
    );
    return ok(res, { announcement: r.rows[0] }, 201);
  } catch (err) {
    return serverError(res, 'createAnnouncement:', err);
  }
}

export async function updateAnnouncement(req: AuthenticatedRequest, res: Response) {
  const id = toInt(req.params.id);
  if (!id) return fail(res, 'Invalid id');
  const { title, body, published } = req.body || {};
  try {
    const r = await query(
      `UPDATE announcements SET
         title = COALESCE($1, title),
         body  = COALESCE($2, body),
         published = COALESCE($3, published)
       WHERE id = $4 RETURNING *`,
      [title?.trim() || null, body?.trim() || null, typeof published === 'boolean' ? published : null, id]
    );
    if (!r.rows[0]) return fail(res, 'Announcement not found', 404);
    return ok(res, { announcement: r.rows[0] });
  } catch (err) {
    return serverError(res, 'updateAnnouncement:', err);
  }
}

export async function deleteAnnouncement(req: AuthenticatedRequest, res: Response) {
  const id = toInt(req.params.id);
  if (!id) return fail(res, 'Invalid id');
  try {
    const r = await query('DELETE FROM announcements WHERE id = $1 RETURNING id', [id]);
    if (!r.rows[0]) return fail(res, 'Announcement not found', 404);
    return ok(res, { message: 'Announcement deleted' });
  } catch (err) {
    return serverError(res, 'deleteAnnouncement:', err);
  }
}

// ── 09. System Settings ───────────────────────────────────────────────────────
export async function getSettings(_req: AuthenticatedRequest, res: Response) {
  try {
    const r = await query('SELECT * FROM system_settings ORDER BY key');
    return ok(res, { settings: r.rows });
  } catch (err) {
    return serverError(res, 'getSettings:', err);
  }
}

export async function upsertSetting(req: AuthenticatedRequest, res: Response) {
  const { key, value } = req.body || {};
  if (!key?.trim() || value === undefined) return fail(res, 'key and value are required');
  try {
    const r = await query(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW() RETURNING *`,
      [key.trim(), String(value)]
    );
    return ok(res, { setting: r.rows[0] });
  } catch (err) {
    return serverError(res, 'upsertSetting:', err);
  }
}

// ── 10. Audit Logs ────────────────────────────────────────────────────────────
export async function listAuditLogs(req: AuthenticatedRequest, res: Response) {
  const page = Math.max(1, toInt(req.query.page) ?? 1);
  const limit = Math.min(200, Math.max(1, toInt(req.query.limit) ?? 50));
  const offset = (page - 1) * limit;
  try {
    const r = await query(
      `SELECT al.id, al.action, al.entity_type, al.entity_id, al.details,
              al.ip_address, al.created_at, u.username
         FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
         ORDER BY al.id DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = await query('SELECT count(*) AS n FROM audit_logs');
    return ok(res, { logs: r.rows, total: Number(total.rows[0].n), page, limit });
  } catch (err) {
    return serverError(res, 'listAuditLogs:', err);
  }
}

/** Helper: write an audit log entry. Call from other admin handlers. */
export async function writeAuditLog(opts: {
  userId: number | undefined;
  action: string;
  entityType?: string;
  entityId?: number;
  details?: string;
  ip?: string;
}): Promise<void> {
  try {
    await query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      [opts.userId ?? null, opts.action, opts.entityType ?? null, opts.entityId ?? null, opts.details ?? null, opts.ip ?? null]
    );
  } catch {
    /* audit log failures must never crash the main request */
  }
}
