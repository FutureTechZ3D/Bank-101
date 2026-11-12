import fs from 'fs';
import path from 'path';
import http from 'http';
import { AddressInfo } from 'net';
import { newDb } from 'pg-mem';

// Set BEFORE the app modules are loaded
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-0123456789abcdef-test';
process.env.AUTH_RATE_MAX = process.env.AUTH_RATE_MAX || '1000';
delete process.env.GOOGLE_CLIENT_ID;
delete process.env.DATABASE_URL;

import { setPool } from '../src/config/db';
import { createApp } from '../src/app';

const DB_DIR = path.resolve(__dirname, '..', '..', 'database');

/** TEST_DB=pg runs the suite on a REAL PostgreSQL server (embedded-postgres, no install); default is pg-mem. */
export const USING_PG = process.env.TEST_DB === 'pg';

let pgServer: any = null;
let pgDbCounter = 0;
const pgPools: any[] = [];
let PG_PORT = Number(process.env.TEST_PG_PORT) || 0; // 0 = pick a free port (a leftover server from a killed run must not break the next run)

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = require('net').createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as AddressInfo).port;
      srv.close(() => resolve(port));
    });
  });
}

async function startPgServer() {
  if (pgServer) return pgServer;
  PG_PORT = await freePort();
  const EmbeddedPostgres = require('embedded-postgres').default || require('embedded-postgres');
  const os = require('os');
  const dir = path.join(os.tmpdir(), 'bank101_pg_' + process.pid + '_' + Date.now());
  const srv = new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: 'testpw', port: PG_PORT, persistent: false, initdbFlags: ['--encoding=UTF8', '--locale=C'], onLog: () => {}, onError: () => {} });
  await srv.initialise();
  await srv.start();
  pgServer = srv;
  return srv;
}

/** Stops the embedded server (and deletes its data directory). Call once when the test run ends. */
export async function stopPg() {
  // open client connections would keep the server (and node) alive: close every pool first
  await Promise.all(pgPools.splice(0).map((p) => p.end().catch(() => {})));
  if (pgServer) {
    const s = pgServer;
    pgServer = null;
    try {
      await s.stop();
    } catch {
      // On Windows, the process exit and temp directory rmdir may briefly race with file locks
    }
  }
}

/** A new, empty database on the real server, loaded with the UNMODIFIED schema.sql, seed.sql and migration. */
async function freshPgDb() {
  await startPgServer();
  const { Pool, Client } = require('pg');
  const name = `t_${Date.now().toString(36)}_${++pgDbCounter}`;
  const admin = new Client({ host: '127.0.0.1', port: PG_PORT, user: 'postgres', password: 'testpw', database: 'postgres' });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name} ENCODING 'UTF8' TEMPLATE template0`); // the app stores symbols such as the square-root sign: the database MUST be UTF8
  await admin.end();
  const conn = { host: '127.0.0.1', port: PG_PORT, user: 'postgres', password: 'testpw', database: name };
  const loader = new Client(conn);
  await loader.connect();
  for (const f of ['schema.sql', 'seed.sql', path.join('migrations', '001_hardening.sql'), path.join('migrations', '002_rbac.sql'), path.join('migrations', '003_schema_hardening.sql'), path.join('migrations', '004_universal_taxonomy.sql'), path.join('migrations', '005_exam_engine_and_ingestion.sql'), path.join('migrations', '006_digital_library_and_pyq.sql'), path.join('migrations', '007_ai_learning_and_predictions.sql'), path.join('migrations', '008_national_and_tamilnadu_expansion.sql'), path.join('migrations', '009_institutions_offline_and_dpdp.sql')]) await loader.query(fs.readFileSync(path.join(DB_DIR, f), 'utf8'));
  await loader.end();
  const pool = new Pool({ ...conn, max: 10 });
  pgPools.push(pool);
  setPool(pool);
  return { db: null as any, pool };
}

/**
 * Default engine: pg-mem loaded with the project's REAL schema.sql, seed.sql and migrations/001_hardening.sql.
 * One test adaptation: pg-mem cannot parse DECIMAL(5,2), so the precision is dropped there.
 */
export async function freshDb() {
  if (USING_PG) return freshPgDb();
  const db = newDb();
  const rawSchema = fs.readFileSync(path.join(DB_DIR, 'schema.sql'), 'utf8');
  const schema = rawSchema
    .replace(/(DECIMAL|NUMERIC)\(\s*\d+\s*,\s*\d+\s*\)/gi, 'NUMERIC')       // pg-mem can't parse DECIMAL(5,2)
    .replace(/CREATE TABLE IF NOT EXISTS/gi, 'CREATE TABLE');                   // pg-mem doesn't support IF NOT EXISTS on CREATE TABLE
  db.public.none(schema);
  db.public.none(fs.readFileSync(path.join(DB_DIR, 'seed.sql'), 'utf8'));

  // For pg-mem: schema.sql already contains all Phase 1+2 tables.
  // Load migration 001 for the unique index on attempt_answers (needed for ON CONFLICT upsert).
  // Strip CREATE INDEX IF NOT EXISTS → CREATE INDEX to work with pg-mem.
  const migration001 = fs.readFileSync(path.join(DB_DIR, 'migrations', '001_hardening.sql'), 'utf8')
    .replace(/CREATE (UNIQUE )?INDEX IF NOT EXISTS/gi, 'CREATE $1INDEX');
  db.public.none(migration001);
  // We only seed the RBAC data (roles, permissions, role_permissions) and system_settings here.
  db.public.none(`
    INSERT INTO roles (name, description) VALUES ('admin', 'Full platform administration') ON CONFLICT (name) DO NOTHING;
    INSERT INTO roles (name, description) VALUES ('pro_user', 'Paid subscriber with unlimited hints') ON CONFLICT (name) DO NOTHING;
    INSERT INTO roles (name, description) VALUES ('free_user', 'Standard registered user') ON CONFLICT (name) DO NOTHING;
    INSERT INTO permissions (name) VALUES ('admin.dashboard.read') ON CONFLICT (name) DO NOTHING;
    INSERT INTO permissions (name) VALUES ('admin.users.read') ON CONFLICT (name) DO NOTHING;
    INSERT INTO permissions (name) VALUES ('admin.users.manage') ON CONFLICT (name) DO NOTHING;
    INSERT INTO permissions (name) VALUES ('admin.exams.create') ON CONFLICT (name) DO NOTHING;
    INSERT INTO permissions (name) VALUES ('admin.exams.publish') ON CONFLICT (name) DO NOTHING;
    INSERT INTO permissions (name) VALUES ('admin.questions.import') ON CONFLICT (name) DO NOTHING;
    INSERT INTO permissions (name) VALUES ('admin.analytics.read') ON CONFLICT (name) DO NOTHING;
    INSERT INTO permissions (name) VALUES ('user.exams.attempt') ON CONFLICT (name) DO NOTHING;
    INSERT INTO permissions (name) VALUES ('user.results.read') ON CONFLICT (name) DO NOTHING;
    INSERT INTO permissions (name) VALUES ('user.profile.update') ON CONFLICT (name) DO NOTHING;
    INSERT INTO permissions (name) VALUES ('user.hints.unlimited') ON CONFLICT (name) DO NOTHING;
    INSERT INTO role_permissions VALUES (1,1) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions VALUES (1,2) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions VALUES (1,3) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions VALUES (1,4) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions VALUES (1,5) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions VALUES (1,6) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions VALUES (1,7) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions VALUES (1,8) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions VALUES (1,9) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions VALUES (1,10) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions VALUES (1,11) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions VALUES (2,8) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions VALUES (2,9) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions VALUES (2,10) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions VALUES (2,11) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions VALUES (3,8) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions VALUES (3,9) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions VALUES (3,10) ON CONFLICT DO NOTHING;
    INSERT INTO system_settings (key, value, description) VALUES ('daily_mock_enabled', 'false', 'Enable daily mock') ON CONFLICT (key) DO NOTHING;
    INSERT INTO system_settings (key, value, description) VALUES ('max_free_hints', '10', 'Free user hint limit') ON CONFLICT (key) DO NOTHING;
    INSERT INTO system_settings (key, value, description) VALUES ('cert_pass_threshold', '80', 'Certificate threshold') ON CONFLICT (key) DO NOTHING;
  `);
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  setPool(pool);
  return { db, pool };
}

export async function startServer(app = createApp()) {
  const server: http.Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, close: () => new Promise<void>((r) => server.close(() => r())) };
}

export interface Reply {
  status: number;
  json: any;
  headers: Headers;
}

export async function call(base: string, method: string, url: string, opts: { token?: string; body?: unknown; headers?: Record<string, string>; raw?: string } = {}): Promise<Reply> {
  const headers: Record<string, string> = { ...(opts.headers || {}) };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let body: string | undefined;
  if (opts.raw !== undefined) {
    body = opts.raw;
    headers['Content-Type'] = 'application/json';
  } else if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(base + url, { method, headers, body });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text };
  }
  return { status: res.status, json, headers: res.headers };
}

let counter = 0;
export function uniqueName(prefix = 'user') {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

export const PASSWORD = 'correct-horse-battery';

export async function register(base: string, username = uniqueName(), password = PASSWORD) {
  const r = await call(base, 'POST', '/api/v1/auth/register', { body: { username, password } });
  if (r.status !== 201) throw new Error('register failed: ' + JSON.stringify(r.json));
  return { token: r.json.token as string, user: r.json.user, username, password };
}
