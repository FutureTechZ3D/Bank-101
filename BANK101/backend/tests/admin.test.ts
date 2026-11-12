/**
 * Phase 3 — Admin panel API tests.
 *
 * Covers:
 *  - Dashboard stats endpoint
 *  - User management (list, get, update role, delete)
 *  - Exam categories CRUD
 *  - Question bank list + detail
 *  - Quiz tests list + update
 *  - Attempt management list
 *  - Admin analytics
 *  - Announcements CRUD
 *  - System settings get + upsert
 *  - Audit logs
 *  - Auth guards: anonymous and regular user are rejected on all admin routes
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { freshDb, startServer, call, register, uniqueName, PASSWORD, stopPg } from './helpers';

type Ctx = { base: string; pool: any; close: () => Promise<void>; adminToken: string; adminId: number };

async function boot(): Promise<Ctx> {
  const { pool } = await freshDb();
  const s = await startServer();
  // Create an admin user directly in the DB
  const hash = await bcrypt.hash(PASSWORD, 10);
  const name = uniqueName('admin');
  const r = await pool.query(
    "INSERT INTO users (username, password_hash, account_type, points, streak_days) VALUES ($1, $2, 'Admin', 0, 0) RETURNING id",
    [name, hash]
  );
  const adminId = r.rows[0].id;
  // Assign admin role
  await pool.query('INSERT INTO user_roles (user_id, role_id) SELECT $1::int, id FROM roles WHERE name = $2', [adminId, 'admin']);
  // Log in to get a token
  const login = await call(s.base, 'POST', '/api/v1/auth/login', { body: { username: name, password: PASSWORD } });
  assert.equal(login.status, 200, `Admin login failed: ${JSON.stringify(login.json)}`);
  return { base: s.base, pool, close: s.close, adminToken: login.json.token, adminId };
}

// ── auth guards ───────────────────────────────────────────────────────────────
describe('admin routes require authentication and admin role', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('anonymous call to /admin/stats returns 401', async () => {
    const r = await call(ctx.base, 'GET', '/api/v1/admin/stats', {});
    assert.equal(r.status, 401);
  });

  it('regular free user call to /admin/stats returns 403', async () => {
    const { token } = await register(ctx.base);
    const r = await call(ctx.base, 'GET', '/api/v1/admin/stats', { token });
    assert.equal(r.status, 403);
  });

  it('admin token gets through to /admin/stats', async () => {
    const r = await call(ctx.base, 'GET', '/api/v1/admin/stats', { token: ctx.adminToken });
    assert.equal(r.status, 200);
    assert.ok(r.json.success);
  });
});

// ── dashboard stats ───────────────────────────────────────────────────────────
describe('GET /admin/stats', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('returns all required stat fields', async () => {
    const r = await call(ctx.base, 'GET', '/api/v1/admin/stats', { token: ctx.adminToken });
    assert.equal(r.status, 200);
    assert.ok(typeof r.json.totalUsers === 'number');
    assert.ok(typeof r.json.totalQuizzes === 'number');
    assert.ok(typeof r.json.totalQuestions === 'number');
    assert.ok(typeof r.json.totalAttempts === 'number');
    assert.ok(Array.isArray(r.json.recentUsers));
    assert.ok(Array.isArray(r.json.topQuizzes));
    assert.ok(Array.isArray(r.json.activity));
  });

  it('totalUsers increments after a new registration', async () => {
    const before = (await call(ctx.base, 'GET', '/api/v1/admin/stats', { token: ctx.adminToken })).json.totalUsers;
    await register(ctx.base);
    const after = (await call(ctx.base, 'GET', '/api/v1/admin/stats', { token: ctx.adminToken })).json.totalUsers;
    assert.equal(after, before + 1);
  });
});

// ── user management ───────────────────────────────────────────────────────────
describe('admin user management', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('GET /admin/users returns paginated users', async () => {
    const r = await call(ctx.base, 'GET', '/api/v1/admin/users', { token: ctx.adminToken });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.json.users));
    assert.ok(typeof r.json.total === 'number');
    assert.ok(typeof r.json.page === 'number');
  });

  it('GET /admin/users/:id returns user detail with attempts', async () => {
    const { user } = await register(ctx.base);
    const r = await call(ctx.base, `GET`, `/api/v1/admin/users/${user.id}`, { token: ctx.adminToken });
    assert.equal(r.status, 200);
    assert.equal(r.json.user.id, user.id);
    assert.ok(Array.isArray(r.json.attempts));
  });

  it('PATCH /admin/users/:id updates account_type', async () => {
    const { user } = await register(ctx.base);
    const r = await call(ctx.base, 'PATCH', `/api/v1/admin/users/${user.id}`, {
      token: ctx.adminToken, body: { account_type: 'Pro' }
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.user.account_type, 'Pro');
  });

  it('PATCH rejects invalid account_type', async () => {
    const { user } = await register(ctx.base);
    const r = await call(ctx.base, 'PATCH', `/api/v1/admin/users/${user.id}`, {
      token: ctx.adminToken, body: { account_type: 'SuperAdmin' }
    });
    assert.equal(r.status, 400);
  });

  it('DELETE /admin/users/:id removes the user', async () => {
    const { user } = await register(ctx.base);
    const del = await call(ctx.base, 'DELETE', `/api/v1/admin/users/${user.id}`, { token: ctx.adminToken });
    assert.equal(del.status, 200);
    // Verify user is gone
    const check = await call(ctx.base, 'GET', `/api/v1/admin/users/${user.id}`, { token: ctx.adminToken });
    assert.equal(check.status, 404);
  });

  it('admin cannot delete own account', async () => {
    const r = await call(ctx.base, 'DELETE', `/api/v1/admin/users/${ctx.adminId}`, { token: ctx.adminToken });
    assert.equal(r.status, 403);
  });
});

// ── exam categories ───────────────────────────────────────────────────────────
describe('admin exam categories', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('GET /admin/categories lists categories with exam_type_count', async () => {
    const r = await call(ctx.base, 'GET', '/api/v1/admin/categories', { token: ctx.adminToken });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.json.categories));
    assert.ok(r.json.categories.length > 0, 'seeded categories must appear');
    assert.ok('exam_type_count' in r.json.categories[0]);
  });

  it('POST /admin/categories creates a category', async () => {
    const slug = `test-cat-${Date.now()}`;
    const r = await call(ctx.base, 'POST', '/api/v1/admin/categories', {
      token: ctx.adminToken, body: { name: `Test Category ${slug}`, icon: 'quiz', slug }
    });
    assert.equal(r.status, 201);
    assert.ok(r.json.category.id);
  });

  it('POST /admin/categories rejects duplicate slug', async () => {
    const slug = `dup-${Date.now()}`;
    await call(ctx.base, 'POST', '/api/v1/admin/categories', {
      token: ctx.adminToken, body: { name: `Cat A ${slug}`, slug }
    });
    const r = await call(ctx.base, 'POST', '/api/v1/admin/categories', {
      token: ctx.adminToken, body: { name: `Cat B ${slug}`, slug }
    });
    assert.equal(r.status, 409);
  });

  it('PATCH /admin/categories/:id updates name', async () => {
    const slug = `upd-${Date.now()}`;
    const created = await call(ctx.base, 'POST', '/api/v1/admin/categories', {
      token: ctx.adminToken, body: { name: `Before ${slug}`, slug }
    });
    const id = created.json.category.id;
    const r = await call(ctx.base, 'PATCH', `/api/v1/admin/categories/${id}`, {
      token: ctx.adminToken, body: { name: `After ${slug}` }
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.category.name, `After ${slug}`);
  });

  it('DELETE /admin/categories/:id removes the category', async () => {
    const slug = `del-${Date.now()}`;
    const created = await call(ctx.base, 'POST', '/api/v1/admin/categories', {
      token: ctx.adminToken, body: { name: `Del Cat ${slug}`, slug }
    });
    const id = created.json.category.id;
    const del = await call(ctx.base, 'DELETE', `/api/v1/admin/categories/${id}`, { token: ctx.adminToken });
    assert.equal(del.status, 200);
  });
});

// ── question bank ─────────────────────────────────────────────────────────────
describe('admin question bank', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('GET /admin/questions returns paginated questions', async () => {
    const r = await call(ctx.base, 'GET', '/api/v1/admin/questions', { token: ctx.adminToken });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.json.questions));
    assert.ok(r.json.questions.length > 0, 'seeded questions must appear');
    assert.ok('option_count' in r.json.questions[0]);
  });

  it('GET /admin/questions/:id returns question with options', async () => {
    const r = await call(ctx.base, 'GET', '/api/v1/admin/questions/1', { token: ctx.adminToken });
    assert.equal(r.status, 200);
    assert.ok(r.json.question.id);
    assert.ok(Array.isArray(r.json.options));
  });

  it('PATCH /admin/questions/:id updates question text', async () => {
    const r = await call(ctx.base, 'PATCH', '/api/v1/admin/questions/1', {
      token: ctx.adminToken, body: { question_text: 'Updated question text for test' }
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.question.question_text, 'Updated question text for test');
  });
});

// ── quiz management ───────────────────────────────────────────────────────────
describe('admin quiz management', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('GET /admin/quizzes returns paginated quizzes with real question count', async () => {
    const r = await call(ctx.base, 'GET', '/api/v1/admin/quizzes', { token: ctx.adminToken });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.json.quizzes));
    assert.ok(r.json.quizzes.length > 0);
    assert.ok('question_count' in r.json.quizzes[0]);
    assert.ok('negative_marks' in r.json.quizzes[0]);
  });

  it('PATCH /admin/quizzes/:id updates negative_marks', async () => {
    const r = await call(ctx.base, 'PATCH', '/api/v1/admin/quizzes/1', {
      token: ctx.adminToken, body: { negative_marks: 0.25 }
    });
    assert.equal(r.status, 200);
    // Reset for other tests
    await call(ctx.base, 'PATCH', '/api/v1/admin/quizzes/1', {
      token: ctx.adminToken, body: { negative_marks: 0 }
    });
  });
});

// ── attempts ──────────────────────────────────────────────────────────────────
describe('admin attempts', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('GET /admin/attempts returns attempt list', async () => {
    const r = await call(ctx.base, 'GET', '/api/v1/admin/attempts', { token: ctx.adminToken });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.json.attempts));
  });

  it('GET /admin/attempts?status=in_progress filters by status', async () => {
    // Create a live attempt
    const { token } = await register(ctx.base);
    await call(ctx.base, 'POST', '/api/v1/attempts/start', { token, body: { quiz_id: 1 } });

    const r = await call(ctx.base, 'GET', '/api/v1/admin/attempts?status=in_progress', { token: ctx.adminToken });
    assert.equal(r.status, 200);
    assert.ok(r.json.attempts.every((a: any) => a.status === 'in_progress'));
  });
});

// ── admin analytics ───────────────────────────────────────────────────────────
describe('GET /admin/analytics', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('returns analytics with required fields', async () => {
    const r = await call(ctx.base, 'GET', '/api/v1/admin/analytics', { token: ctx.adminToken });
    assert.equal(r.status, 200);
    assert.ok('passRate' in r.json);
    assert.ok('averagePercentage' in r.json);
    assert.ok(Array.isArray(r.json.topUsers));
    assert.ok(Array.isArray(r.json.hardestQuestions));
  });
});

// ── announcements ─────────────────────────────────────────────────────────────
describe('admin announcements', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('full CRUD cycle', async () => {
    // Create
    const created = await call(ctx.base, 'POST', '/api/v1/admin/announcements', {
      token: ctx.adminToken, body: { title: 'Test Announcement', body: 'Test body text', published: false }
    });
    assert.equal(created.status, 201);
    const id = created.json.announcement.id;

    // List
    const list = await call(ctx.base, 'GET', '/api/v1/admin/announcements', { token: ctx.adminToken });
    assert.ok(list.json.announcements.some((a: any) => a.id === id));

    // Update
    const updated = await call(ctx.base, 'PATCH', `/api/v1/admin/announcements/${id}`, {
      token: ctx.adminToken, body: { published: true }
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.json.announcement.published, true);

    // Delete
    const del = await call(ctx.base, 'DELETE', `/api/v1/admin/announcements/${id}`, { token: ctx.adminToken });
    assert.equal(del.status, 200);
  });
});

// ── system settings ───────────────────────────────────────────────────────────
describe('admin system settings', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('GET /admin/settings returns seeded defaults', async () => {
    const r = await call(ctx.base, 'GET', '/api/v1/admin/settings', { token: ctx.adminToken });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.json.settings));
    const keys = r.json.settings.map((s: any) => s.key);
    assert.ok(keys.includes('max_free_hints'));
  });

  it('PUT /admin/settings creates or updates a setting', async () => {
    const r = await call(ctx.base, 'PUT', '/api/v1/admin/settings', {
      token: ctx.adminToken, body: { key: 'test_setting', value: 'hello_world' }
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.setting.value, 'hello_world');

    // Update same key
    const r2 = await call(ctx.base, 'PUT', '/api/v1/admin/settings', {
      token: ctx.adminToken, body: { key: 'test_setting', value: 'updated' }
    });
    assert.equal(r2.status, 200);
    assert.equal(r2.json.setting.value, 'updated');
  });
});

// ── audit logs ────────────────────────────────────────────────────────────────
describe('GET /admin/audit-logs', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('returns audit log list (empty initially)', async () => {
    const r = await call(ctx.base, 'GET', '/api/v1/admin/audit-logs', { token: ctx.adminToken });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.json.logs));
    assert.ok(typeof r.json.total === 'number');
  });
});

// ── teardown ──────────────────────────────────────────────────────────────────
describe('teardown (admin)', () => {
  it('stops pg if running', async () => { await stopPg(); });
});
