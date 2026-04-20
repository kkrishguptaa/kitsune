import { eq } from "drizzle-orm";
import type { KitsuneDb } from "./client.ts";
import {
  apiKeys,
  assets,
  collections,
  documents,
  workspaceLocales,
  workspaceMembers,
} from "./schema.ts";

/**
 * A thin wrapper around the shared `db` client that injects a `workspaceId`
 * equality clause into every query this module owns. It is *not* a blanket
 * security boundary — services still have to opt in by going through the
 * helpers exposed here rather than `db.select(...)` directly.
 *
 * Pattern: every service function takes a `TenantDb` in its signature and
 * receives it from a per-request factory, so cross-tenant reads require a
 * deliberate code smell (reaching for the raw `db`).
 */
export interface TenantDb {
  readonly db: KitsuneDb;
  readonly workspaceId: string;
  /** Returns a scope predicate for any table that has a `workspaceId` column. */
  readonly whereWorkspace: (
    column: { workspaceId: typeof workspaces.workspaceId },
  ) => ReturnType<typeof eq>;
  readonly tables: {
    collections: typeof collections;
    documents: typeof documents;
    apiKeys: typeof apiKeys;
    assets: typeof assets;
    workspaceLocales: typeof workspaceLocales;
    workspaceMembers: typeof workspaceMembers;
  };
}

// Aliased shape so the `whereWorkspace` helper can reference workspaceId
// without importing every tenant-scoped table signature.
const workspaces = { workspaceId: collections.workspaceId };

export function createTenantDb(
  db: KitsuneDb,
  workspaceId: string,
): TenantDb {
  return {
    db,
    workspaceId,
    whereWorkspace: (column) => eq(column.workspaceId, workspaceId),
    tables: {
      collections,
      documents,
      apiKeys,
      assets,
      workspaceLocales,
      workspaceMembers,
    },
  };
}
