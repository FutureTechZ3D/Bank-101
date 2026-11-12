/**
 * Phase 1 — Identity & Access Management tests.
 *
 * Covers:
 *  - /auth/logout  (revokes session, token still valid for 15-min access but refresh is dead)
 *  - /auth/refresh (happy path, rotation, replay rejected)
 *  - /auth/me      (returns user + roles + permissions)
 *  - RBAC guards   (requireRole / requirePermission on admin routes)
 *  - Role assignment on register/login
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb, startServer, call, register, uniqueName, PASSWORD, stopPg } from './helpers';

type Ctx = { base: string; pool: any; close: () => Promise<void> };

async function boot(): Promise<Ctx> {
  const { pool } = await freshDb();
  const s = await startServer();
  return { base: s.base, pool, close: s.close };
}

// ── /auth/me ─────────────────────────────────────────────────────────────────
describe('/auth/me', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('returns user profile with roles and permissions', async () => {
    const { token } = await register(ctx.base);
    const r = await call(ctx.base, 'GET', '/api/v1/auth/me', { token });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.ok(r.json.success);
    assert.ok(r.json.user?.id);
    assert.ok(Array.isArray(r.json.roles), 'roles must be an array');
    assert.ok(Array.isArray(r.json.permissions), 'permissions must be an array');
    assert.ok(r.json.roles.includes('free_user'), 'new user must have free_user role');
    assert.ok(r.json.permissions.includes('user.exams.attempt'));
  });

  it('requires authentication', async () => {
    const r = await call(ctx.base, 'GET', '/api/v1/auth/me', {});
    assert.equal(r.status, 401);
  });
});

// ── /auth/logout ─────────────────────────────────────────────────────────────
describe('/auth/logout', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('revokes the refresh token so it cannot be reused', async () => {
    // Register returns a refresh_token now
    const regRes = await call(ctx.base, 'POST', '/api/v1/auth/register', {
      body: { username: uniqueName(), password: PASSWORD },
    });
    assert.equal(regRes.status, 201);
    const { token, refresh_token } = regRes.json;

    // Logout
    const logoutRes = await call(ctx.base, 'POST', '/api/v1/auth/logout', {
      token,
      body: { refresh_token },
    });
    assert.equal(logoutRes.status, 200);
    assert.ok(logoutRes.json.success);

    // Trying to refresh with the revoked token should fail
    const refreshRes = await call(ctx.base, 'POST', '/api/v1/auth/refresh', {
      body: { refresh_token },
    });
    assert.equal(refreshRes.status, 401, 'revoked refresh token must be rejected');
  });

  it('requires authentication', async () => {
    const r = await call(ctx.base, 'POST', '/api/v1/auth/logout', { body: {} });
    assert.equal(r.status, 401);
  });
});

// ── /auth/refresh ─────────────────────────────────────────────────────────────
describe('/auth/refresh', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('issues a new access token and rotates the refresh token', async () => {
    const regRes = await call(ctx.base, 'POST', '/api/v1/auth/register', {
      body: { username: uniqueName(), password: PASSWORD },
    });
    assert.equal(regRes.status, 201);
    const { refresh_token: rt1 } = regRes.json;

    const r1 = await call(ctx.base, 'POST', '/api/v1/auth/refresh', { body: { refresh_token: rt1 } });
    assert.equal(r1.status, 200, JSON.stringify(r1.json));
    assert.ok(r1.json.token, 'must return a new access token');
    assert.ok(r1.json.refresh_token, 'must return a new refresh token');
    assert.notEqual(r1.json.refresh_token, rt1, 'refresh token must be rotated');

    // Old refresh token must now be invalid (rotation)
    const r2 = await call(ctx.base, 'POST', '/api/v1/auth/refresh', { body: { refresh_token: rt1 } });
    assert.equal(r2.status, 401, 'old refresh token must be rejected after rotation');
  });

  it('rejects a missing refresh token', async () => {
    const r = await call(ctx.base, 'POST', '/api/v1/auth/refresh', { body: {} });
    assert.equal(r.status, 400);
  });

  it('rejects a fabricated refresh token', async () => {
    const r = await call(ctx.base, 'POST', '/api/v1/auth/refresh', {
      body: { refresh_token: 'aaaa'.repeat(32) },
    });
    assert.equal(r.status, 401);
  });
});

// ── register / login now return refresh_token ─────────────────────────────────
describe('register and login include refresh_token', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('register returns both token and refresh_token', async () => {
    const r = await call(ctx.base, 'POST', '/api/v1/auth/register', {
      body: { username: uniqueName(), password: PASSWORD },
    });
    assert.equal(r.status, 201);
    assert.ok(r.json.token, 'must return access token');
    assert.ok(r.json.refresh_token, 'must return refresh token');
  });

  it('login returns both token and refresh_token', async () => {
    const name = uniqueName();
    await call(ctx.base, 'POST', '/api/v1/auth/register', { body: { username: name, password: PASSWORD } });
    const r = await call(ctx.base, 'POST', '/api/v1/auth/login', { body: { username: name, password: PASSWORD } });
    assert.equal(r.status, 200);
    assert.ok(r.json.token);
    assert.ok(r.json.refresh_token);
  });
});

// ── RBAC: role assignment ─────────────────────────────────────────────────────
describe('RBAC: role assignment', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('a new user gets the free_user role', async () => {
    const { token } = await register(ctx.base);
    const r = await call(ctx.base, 'GET', '/api/v1/auth/me', { token });
    assert.equal(r.status, 200);
    assert.ok(r.json.roles.includes('free_user'));
    assert.ok(!r.json.roles.includes('admin'));
  });

  it('free_user does NOT have admin permissions', async () => {
    const { token } = await register(ctx.base);
    const me = await call(ctx.base, 'GET', '/api/v1/auth/me', { token });
    assert.ok(!me.json.permissions.includes('admin.users.read'));
    assert.ok(!me.json.permissions.includes('admin.exams.create'));
  });

  it('free_user has basic user permissions', async () => {
    const { token } = await register(ctx.base);
    const me = await call(ctx.base, 'GET', '/api/v1/auth/me', { token });
    assert.ok(me.json.permissions.includes('user.exams.attempt'));
    assert.ok(me.json.permissions.includes('user.results.read'));
    assert.ok(me.json.permissions.includes('user.profile.update'));
  });

  it('free_user does NOT have unlimited hints permission', async () => {
    const { token } = await register(ctx.base);
    const me = await call(ctx.base, 'GET', '/api/v1/auth/me', { token });
    assert.ok(!me.json.permissions.includes('user.hints.unlimited'));
  });
});

// ── RBAC: admin route protection ──────────────────────────────────────────────
describe('RBAC: admin routes require admin role', () => {
  let ctx: Ctx;
  before(async () => { ctx = await boot(); });
  after(async () => { await ctx.close(); });

  it('anonymous caller is rejected with 401', async () => {
    const r = await call(ctx.base, 'GET', '/api/v1/admin/stats', {});
    assert.equal(r.status, 401);
  });

  it('free_user is rejected with 403', async () => {
    const { token } = await register(ctx.base);
    const r = await call(ctx.base, 'GET', '/api/v1/admin/stats', { token });
    assert.equal(r.status, 403);
  });
});

// ── teardown ──────────────────────────────────────────────────────────────────
describe('teardown (rbac)', () => {
  it('stops pg if running', async () => { await stopPg(); });
});
