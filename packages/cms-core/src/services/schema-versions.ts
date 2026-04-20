import {
  type Changeset,
  type DiffHints,
  type Fields,
  contentHash,
  diffSchemas,
} from "@kitsune/schema";
import { and, asc, eq } from "drizzle-orm";
import type { KitsuneDb } from "../db/client.ts";
import {
  type Collection,
  type CollectionSchemaVersion,
  collectionSchemaVersions,
  collections,
} from "../db/schema.ts";

export interface PublishNewVersionInput {
  workspaceId: string;
  collectionId: string;
  nextFields: Fields;
  hints?: DiffHints;
  createdBy: string;
}

export interface PublishNewVersionResult {
  version: CollectionSchemaVersion;
  /**
   * The diff from the previously active version. Null on the first publish
   * (collection had no schema yet).
   */
  changeset: Changeset | null;
}

/**
 * Publish a new schema version:
 * 1. Diff against the currently-active version.
 * 2. Reject if destructive bits are unresolved.
 * 3. Insert an immutable `collection_schema_versions` row.
 * 4. Flip `collections.current_schema_version_id` to the new row.
 *
 * Document rewrites are handled lazily on read via the `project()` helper
 * from `@kitsune/schema` — see `services/documents.ts`. An optional
 * background rewrite endpoint can batch-apply the changeset later.
 */
export async function publishNewVersion(
  db: KitsuneDb,
  input: PublishNewVersionInput,
): Promise<PublishNewVersionResult> {
  return db.transaction(async (tx) => {
    const [collection] = await tx
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.workspaceId, input.workspaceId),
          eq(collections.id, input.collectionId),
        ),
      )
      .limit(1);
    if (!collection) {
      throw new Error(`Collection ${input.collectionId} not found.`);
    }

    const [currentVersion] = collection.currentSchemaVersionId
      ? await tx
          .select()
          .from(collectionSchemaVersions)
          .where(
            eq(
              collectionSchemaVersions.id,
              collection.currentSchemaVersionId,
            ),
          )
          .limit(1)
      : [];

    let changeset: Changeset | null = null;
    if (currentVersion) {
      changeset = diffSchemas(
        currentVersion.fields,
        input.nextFields,
        input.hints,
      );
      if (changeset.destructive) {
        throw new DestructiveChangeError(
          "Schema change is destructive. Provide resolution hints (renames, defaults, confirmDrops, confirmRetypes) to proceed.",
          changeset,
        );
      }
      const nextHash = contentHash(input.nextFields);
      if (nextHash === currentVersion.contentHash) {
        return { version: currentVersion, changeset: null };
      }
    }

    const nextVersionNumber = (currentVersion?.versionNumber ?? 0) + 1;
    const hash = contentHash(input.nextFields);

    const [inserted] = await tx
      .insert(collectionSchemaVersions)
      .values({
        collectionId: input.collectionId,
        versionNumber: nextVersionNumber,
        fields: input.nextFields,
        changeset,
        contentHash: hash,
        createdBy: input.createdBy,
      })
      .returning();
    if (!inserted) {
      throw new Error("Failed to insert collection schema version.");
    }

    await tx
      .update(collections)
      .set({
        currentSchemaVersionId: inserted.id,
        updatedAt: new Date(),
      })
      .where(eq(collections.id, input.collectionId));

    return { version: inserted, changeset };
  });
}

export class DestructiveChangeError extends Error {
  readonly changeset: Changeset;
  constructor(message: string, changeset: Changeset) {
    super(message);
    this.name = "DestructiveChangeError";
    this.changeset = changeset;
  }
}

export async function listVersions(
  db: KitsuneDb,
  collectionId: string,
): Promise<CollectionSchemaVersion[]> {
  return db
    .select()
    .from(collectionSchemaVersions)
    .where(eq(collectionSchemaVersions.collectionId, collectionId))
    .orderBy(asc(collectionSchemaVersions.versionNumber));
}

export async function getVersion(
  db: KitsuneDb,
  id: string,
): Promise<CollectionSchemaVersion | null> {
  const [row] = await db
    .select()
    .from(collectionSchemaVersions)
    .where(eq(collectionSchemaVersions.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Build a `changesets` map suitable for the schema projector:
 * `{ [versionNumber]: Changeset }` covering every version after `fromVersion`
 * up to and including the collection's current version.
 */
export async function loadChangesetChain(
  db: KitsuneDb,
  collectionId: string,
  fromVersion: number,
): Promise<Record<number, Changeset>> {
  const rows = await db
    .select()
    .from(collectionSchemaVersions)
    .where(eq(collectionSchemaVersions.collectionId, collectionId))
    .orderBy(asc(collectionSchemaVersions.versionNumber));
  const out: Record<number, Changeset> = {};
  for (const row of rows) {
    if (row.versionNumber > fromVersion && row.changeset) {
      out[row.versionNumber] = row.changeset;
    }
  }
  return out;
}

export interface CollectionWithSchema {
  collection: Collection;
  currentVersion: CollectionSchemaVersion;
}

/**
 * Load every collection in a workspace together with its currently-active
 * schema version. Used by the GraphQL builder to synthesize the tenant's
 * dynamic schema in one DB round trip.
 */
export async function loadActiveCollectionsWithSchema(
  db: KitsuneDb,
  workspaceId: string,
): Promise<CollectionWithSchema[]> {
  const rows = await db
    .select({
      collection: collections,
      currentVersion: collectionSchemaVersions,
    })
    .from(collections)
    .innerJoin(
      collectionSchemaVersions,
      eq(collections.currentSchemaVersionId, collectionSchemaVersions.id),
    )
    .where(eq(collections.workspaceId, workspaceId))
    .orderBy(asc(collections.slug));
  return rows.map((row) => ({
    collection: row.collection,
    currentVersion: row.currentVersion,
  }));
}

export async function requireCurrentSchema(
  db: KitsuneDb,
  workspaceId: string,
  collectionId: string,
): Promise<CollectionWithSchema> {
  const [row] = await db
    .select({
      collection: collections,
      version: collectionSchemaVersions,
    })
    .from(collections)
    .innerJoin(
      collectionSchemaVersions,
      eq(collections.currentSchemaVersionId, collectionSchemaVersions.id),
    )
    .where(
      and(
        eq(collections.workspaceId, workspaceId),
        eq(collections.id, collectionId),
      ),
    )
    .limit(1);
  if (!row) {
    throw new Error(
      `Collection ${collectionId} has no current schema version. Publish one first.`,
    );
  }
  return { collection: row.collection, currentVersion: row.version };
}
