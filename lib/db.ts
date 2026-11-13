import { SCHEMA } from "./schema";

/**
 * One tiny query function over two drivers:
 *
 * - DATABASE_URL set (production: Supabase or Neon free tier) → postgres.js
 * - otherwise → PGlite, a real Postgres compiled to WASM, persisted under
 *   .data/pglite. No install, no account, same SQL.
 *
 * PGlite is single-process, so list syncs run inside the Next server (admin
 * buttons / cron routes) rather than as separate CLI scripts.
 */
type Row = Record<string, unknown>;
type Driver = { query: <T = Row>(text: string, params?: unknown[]) => Promise<T[]> };

const g = globalThis as unknown as { __dwDb?: Promise<Driver> };

async function connect(): Promise<Driver> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    // prepare: false keeps it compatible with Supabase's transaction pooler.
    const sql = postgres(url, { max: 5, prepare: false, onnotice: () => {} });
    await sql.unsafe(SCHEMA);
    return {
      query: async <T,>(text: string, params: unknown[] = []) =>
        (await sql.unsafe(text, params as never[])) as unknown as T[],
    };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { mkdirSync } = await import("node:fs");
  const dir = process.env.PGLITE_DIR ?? ".data/pglite";
  mkdirSync(dir, { recursive: true });
  const pg = new PGlite(dir);
  await pg.exec(SCHEMA);
  return {
    query: async <T,>(text: string, params: unknown[] = []) =>
      (await pg.query<T>(text, params)).rows,
  };
}

export function db(): Promise<Driver> {
  g.__dwDb ??= connect().catch((err) => {
    g.__dwDb = undefined;
    throw err;
  });
  return g.__dwDb;
}

export async function q<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await db()).query<T>(text, params);
}

export async function one<T = Row>(text: string, params: unknown[] = []): Promise<T | undefined> {
  return (await q<T>(text, params))[0];
}

/** A text[] parameter, as a Postgres array literal. Pair with `$n::text[]`. */
export function pgArray(values: readonly (string | number)[]): string {
  return `{${values.map((v) => `"${String(v).replace(/["\\]/g, "\\$&")}"`).join(",")}}`;
}

/** A jsonb parameter. Pair with `$n::jsonb`. */
export function pgJson(value: unknown): string {
  return JSON.stringify(value ?? {});
}
