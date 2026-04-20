import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

/**
 * Drizzle client over `postgres.js`. A single connection pool is memoized
 * across hot reloads in dev and created once per runtime in prod.
 *
 * Serverless / Vercel note: keep `max: 1` and `idle_timeout` small so
 * lambdas don't hold connections open after they're done. Longer-lived
 * servers can bump `max` per deployment topology.
 */
export type KitsuneDb = ReturnType<typeof drizzle<typeof schema>>;

let cached: KitsuneDb | null = null;

export interface CreateDbOptions {
  connectionString: string;
  /** postgres.js pool size. Defaults to 1 for serverless-friendliness. */
  max?: number;
  /** Idle timeout (seconds). */
  idleTimeout?: number;
}

export function createDb(options: CreateDbOptions): KitsuneDb {
  const sql = postgres(options.connectionString, {
    max: options.max ?? 1,
    idle_timeout: options.idleTimeout ?? 20,
    prepare: false,
  });
  return drizzle(sql, { schema, casing: "snake_case" });
}

/**
 * Lazy accessor that creates the client on first use. Safe for import-time
 * module evaluation because it does not connect until a query runs.
 */
export function getDb(connectionString: string): KitsuneDb {
  if (!cached) {
    cached = createDb({ connectionString });
  }
  return cached;
}

/**
 * Reset the cached client. Exposed for tests and local scripts that need
 * to rebuild the pool with a different connection string.
 */
export function resetDbCache(): void {
  cached = null;
}

export { schema };
