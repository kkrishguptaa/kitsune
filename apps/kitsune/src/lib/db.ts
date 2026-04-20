import { getDb } from "@kitsune/cms-core";
import { env } from "#/env";

/**
 * Singleton Drizzle client for the TanStack Start runtime. Uses a small
 * connection pool (`max: 1`) so serverless-friendly environments don't
 * leak connections across cold starts.
 */
export const db = getDb(env.DATABASE_URL);
