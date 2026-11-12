import { Pool } from 'pg';
import './env';

/**
 * Real PostgreSQL only. The old version silently fell back to an in-memory mock when the
 * connection failed (and on any single query error), which lost data and hid outages.
 * Now a missing/failed database is a hard error. Tests inject a pg-mem pool with setPool().
 */
export interface Queryable {
  query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount?: number | null }>;
  connect?: () => Promise<any>;
}

let pool: Queryable | null = null;

export function setPool(p: Queryable | null): void {
  pool = p;
}

export function initPool(): Queryable {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (see backend/.env.example)');
  pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5000 }) as unknown as Queryable;
  return pool;
}

export async function query(text: string, params?: any[]): Promise<any> {
  return initPool().query(text, params);
}

export async function checkDb(): Promise<void> {
  await query('SELECT 1');
}

type Q = (text: string, params?: any[]) => Promise<any>;

/** Run several statements atomically. Rolls back on any error. */
export async function withTransaction<T>(fn: (q: Q) => Promise<T>): Promise<T> {
  const p = initPool();
  if (!p.connect) throw new Error('This database pool does not support transactions');
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const out = await fn((t, params) => client.query(t, params));
    await client.query('COMMIT');
    return out;
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore rollback failure, rethrow the original error */
    }
    throw e;
  } finally {
    client.release();
  }
}
