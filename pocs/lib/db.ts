import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";

// One Postgres dialect everywhere (DECISIONS D1): `pg` against DATABASE_URL (Neon) when it is set, otherwise
// PGlite in data/pglite, in /tmp/pglite on Vercel (lost on cold start), or in memory with MAPLE_DB=memory (tests).

export type Row = Record<string, unknown>;
export type Query = <T = Row>(sql: string, params?: unknown[]) => Promise<T[]>;
type Db = { query: Query; tx: <T>(fn: (q: Query) => Promise<T>) => Promise<T> };

const url = process.env.DATABASE_URL;
const dir = process.env.MAPLE_DB ?? (process.env.VERCEL ? "/tmp/pglite" : path.join(process.cwd(), "data", "pglite"));

export const dbInfo = url
  ? { kind: "postgres" as const, persistent: true }
  : { kind: "pglite" as const, persistent: dir !== "memory" && !dir.startsWith("/tmp/") };

const SCHEMA = `
SELECT pg_advisory_xact_lock(727100); -- concurrent cold starts on one Postgres must not race the DDL
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS characters (
  name TEXT PRIMARY KEY,
  world TEXT NOT NULL,
  job TEXT NOT NULL,
  level INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  combat_power BIGINT NOT NULL,
  boss300_stat INTEGER NOT NULL,
  boss380_stat INTEGER NOT NULL,
  source TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS clear_rates (
  character_name TEXT NOT NULL REFERENCES characters(name) ON DELETE CASCADE,
  boss_id TEXT NOT NULL,
  clear_rate DOUBLE PRECISION NOT NULL,
  analytics TEXT NOT NULL,
  boss_stat INTEGER NOT NULL,
  PRIMARY KEY (character_name, boss_id)
);
CREATE TABLE IF NOT EXISTS party_requests (
  id SERIAL PRIMARY KEY,
  character_name TEXT NOT NULL,
  boss_id TEXT NOT NULL,
  party_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS party_requests_one_open ON party_requests (character_name, boss_id) WHERE status = 'open';
CREATE TABLE IF NOT EXISTS parties (
  id SERIAL PRIMARY KEY,
  boss_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS party_members (
  party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL,
  ratio DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (party_id, character_name)
);`;

async function open(): Promise<Db> {
  let db: Db & { exec: (sql: string) => Promise<unknown>; close: () => Promise<void> };
  if (url) {
    const { Pool } = await import("pg");
    // TLS with certificate checks for anything but a local server. Neon's `sslmode=require` already means
    // verify-full in pg 8; spelling it out keeps that in pg 9 and silences pg's warning.
    const local = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
    const connectionString = url.replace(/\bsslmode=(prefer|require|verify-ca)\b/, "sslmode=verify-full");
    const pool = new Pool({ connectionString, ssl: local ? undefined : true, max: 5 });
    pool.on("error", (e) => console.error("db: idle client error:", e.message)); // e.g. Neon closing idle connections
    db = {
      query: async (sql, params) => (await pool.query(sql, params)).rows,
      tx: async (fn) => {
        const c = await pool.connect();
        let broken: Error | undefined;
        try {
          await c.query("BEGIN");
          const out = await fn(async (sql, params) => (await c.query(sql, params)).rows);
          await c.query("COMMIT");
          return out;
        } catch (e) {
          await c.query("ROLLBACK").catch((err: Error) => (broken = err));
          throw e;
        } finally {
          c.release(broken); // a client that failed to roll back is discarded
        }
      },
      exec: (sql) => pool.query(sql),
      close: () => pool.end(),
    };
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    if (dir !== "memory") mkdirSync(path.dirname(dir), { recursive: true });
    const lite = new PGlite(dir === "memory" ? undefined : dir);
    const rows = (t: Pick<typeof lite, "query">): Query => async <T,>(sql: string, params?: unknown[]) => (await t.query<T>(sql, params)).rows;
    db = {
      query: rows(lite),
      tx: (fn) => lite.transaction((t) => fn(rows(t))),
      exec: (sql) => lite.exec(sql),
      close: () => lite.close(),
    };
  }
  try {
    await db.exec(SCHEMA);
  } catch (e) {
    await db.close().catch(() => {});
    throw e;
  }
  return db;
}

// On globalThis so `next dev` HMR reuses the one open PGlite directory; a failed open is retried next call.
const g = globalThis as unknown as { __mapleDb?: Promise<Db> };
const get = () =>
  (g.__mapleDb ??= open().catch((e) => {
    g.__mapleDb = undefined;
    throw e;
  }));

export const query: Query = async (sql, params) => (await get()).query(sql, params);

// Runs fn in one transaction; any throw rolls it back.
export const tx = async <T>(fn: (q: Query) => Promise<T>): Promise<T> => (await get()).tx(fn);
