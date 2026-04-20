import { and, eq } from "drizzle-orm";
import type { KitsuneDb } from "../db/client.ts";
import {
  type Collection,
  type CollectionSchemaVersion,
  collectionSchemaVersions,
  collections,
} from "../db/schema.ts";

const SLUG_REGEX = /^[a-z][a-z0-9-]*$/;

export function assertValidSlug(slug: string): void {
  if (!SLUG_REGEX.test(slug)) {
    throw new Error(
      `Invalid collection slug \`${slug}\`. Must match ${SLUG_REGEX}.`,
    );
  }
}

export async function createCollection(
  db: KitsuneDb,
  input: {
    workspaceId: string;
    slug: string;
    name: string;
    description?: string;
    createdBy: string;
  },
): Promise<Collection> {
  assertValidSlug(input.slug);
  const [row] = await db
    .insert(collections)
    .values({
      workspaceId: input.workspaceId,
      slug: input.slug,
      name: input.name,
      description: input.description,
      createdBy: input.createdBy,
    })
    .returning();
  if (!row) throw new Error("Failed to create collection.");
  return row;
}

export async function listCollections(
  db: KitsuneDb,
  workspaceId: string,
): Promise<Collection[]> {
  return db
    .select()
    .from(collections)
    .where(eq(collections.workspaceId, workspaceId))
    .orderBy(collections.name);
}

export async function getCollectionBySlug(
  db: KitsuneDb,
  workspaceId: string,
  slug: string,
): Promise<Collection | null> {
  const [row] = await db
    .select()
    .from(collections)
    .where(
      and(
        eq(collections.workspaceId, workspaceId),
        eq(collections.slug, slug),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getCollectionById(
  db: KitsuneDb,
  workspaceId: string,
  id: string,
): Promise<Collection | null> {
  const [row] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.workspaceId, workspaceId), eq(collections.id, id)))
    .limit(1);
  return row ?? null;
}

export async function deleteCollection(
  db: KitsuneDb,
  workspaceId: string,
  id: string,
): Promise<void> {
  await db
    .delete(collections)
    .where(and(eq(collections.workspaceId, workspaceId), eq(collections.id, id)));
}

/**
 * Resolve a collection together with its currently active schema version
 * in a single query. Returns null if the collection doesn't exist or if it
 * has no schema version yet (fresh collection).
 */
export async function getCollectionWithCurrentSchema(
  db: KitsuneDb,
  workspaceId: string,
  slug: string,
): Promise<
  | {
      collection: Collection;
      schemaVersion: CollectionSchemaVersion | null;
    }
  | null
> {
  const [row] = await db
    .select({
      collection: collections,
      schemaVersion: collectionSchemaVersions,
    })
    .from(collections)
    .leftJoin(
      collectionSchemaVersions,
      eq(collections.currentSchemaVersionId, collectionSchemaVersions.id),
    )
    .where(
      and(
        eq(collections.workspaceId, workspaceId),
        eq(collections.slug, slug),
      ),
    )
    .limit(1);
  if (!row) return null;
  return {
    collection: row.collection,
    schemaVersion: row.schemaVersion,
  };
}
