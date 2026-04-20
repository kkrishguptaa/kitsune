import {
  type Changeset,
  type Fields,
  compileZod,
  project,
} from "@kitsune/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import type { KitsuneDb } from "../db/client.ts";
import {
  type Collection,
  type CollectionSchemaVersion,
  type Document,
  type DocumentRevision,
  collectionSchemaVersions,
  collections,
  documentRevisions,
  documents,
} from "../db/schema.ts";
import { loadChangesetChain } from "./schema-versions.ts";

export interface DocumentContext {
  workspaceId: string;
  collectionId: string;
  userId: string;
}

async function resolveCurrentSchema(
  db: KitsuneDb,
  workspaceId: string,
  collectionId: string,
): Promise<{ collection: Collection; currentVersion: CollectionSchemaVersion }> {
  const [row] = await db
    .select({
      collection: collections,
      currentVersion: collectionSchemaVersions,
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
      "Collection does not have a current schema version yet. Publish a schema first.",
    );
  }
  return row;
}

function validateOrThrow(fields: Fields, data: unknown): Record<string, unknown> {
  const zod = compileZod(fields);
  const parsed = zod.safeParse(data);
  if (!parsed.success) {
    throw new ValidationError(
      "Document data does not match the current schema.",
      parsed.error.issues,
    );
  }
  return parsed.data as Record<string, unknown>;
}

export class ValidationError extends Error {
  readonly issues: unknown;
  constructor(message: string, issues: unknown) {
    super(message);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

export interface CreateDocumentInput extends DocumentContext {
  data: Record<string, unknown>;
  status?: "draft" | "published";
}

export async function createDocument(
  db: KitsuneDb,
  input: CreateDocumentInput,
): Promise<Document> {
  return db.transaction(async (tx) => {
    const { currentVersion } = await resolveCurrentSchema(
      tx as unknown as KitsuneDb,
      input.workspaceId,
      input.collectionId,
    );

    const data = validateOrThrow(currentVersion.fields, input.data);

    const status = input.status ?? "draft";
    const publishedAt = status === "published" ? new Date() : null;

    const [row] = await tx
      .insert(documents)
      .values({
        workspaceId: input.workspaceId,
        collectionId: input.collectionId,
        schemaVersionId: currentVersion.id,
        data,
        status,
        publishedAt,
        createdBy: input.userId,
        updatedBy: input.userId,
      })
      .returning();
    if (!row) throw new Error("Failed to insert document.");

    await tx.insert(documentRevisions).values({
      documentId: row.id,
      revisionNumber: 1,
      schemaVersionId: currentVersion.id,
      status,
      data,
      createdBy: input.userId,
    });

    return row;
  });
}

export interface UpdateDocumentInput extends DocumentContext {
  documentId: string;
  data: Record<string, unknown>;
}

export async function updateDocument(
  db: KitsuneDb,
  input: UpdateDocumentInput,
): Promise<Document> {
  return db.transaction(async (tx) => {
    const { currentVersion } = await resolveCurrentSchema(
      tx as unknown as KitsuneDb,
      input.workspaceId,
      input.collectionId,
    );

    const data = validateOrThrow(currentVersion.fields, input.data);

    const [updated] = await tx
      .update(documents)
      .set({
        data,
        schemaVersionId: currentVersion.id,
        updatedBy: input.userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(documents.workspaceId, input.workspaceId),
          eq(documents.id, input.documentId),
        ),
      )
      .returning();
    if (!updated) throw new Error("Document not found.");

    const [last] = await tx
      .select({ revisionNumber: documentRevisions.revisionNumber })
      .from(documentRevisions)
      .where(eq(documentRevisions.documentId, input.documentId))
      .orderBy(desc(documentRevisions.revisionNumber))
      .limit(1);

    await tx.insert(documentRevisions).values({
      documentId: updated.id,
      revisionNumber: (last?.revisionNumber ?? 0) + 1,
      schemaVersionId: currentVersion.id,
      status: updated.status,
      data,
      createdBy: input.userId,
    });

    return updated;
  });
}

export async function publishDocument(
  db: KitsuneDb,
  input: DocumentContext & { documentId: string },
): Promise<Document> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [updated] = await tx
      .update(documents)
      .set({ status: "published", publishedAt: now, updatedBy: input.userId, updatedAt: now })
      .where(
        and(
          eq(documents.workspaceId, input.workspaceId),
          eq(documents.id, input.documentId),
        ),
      )
      .returning();
    if (!updated) throw new Error("Document not found.");

    const [last] = await tx
      .select({ revisionNumber: documentRevisions.revisionNumber })
      .from(documentRevisions)
      .where(eq(documentRevisions.documentId, input.documentId))
      .orderBy(desc(documentRevisions.revisionNumber))
      .limit(1);

    await tx.insert(documentRevisions).values({
      documentId: updated.id,
      revisionNumber: (last?.revisionNumber ?? 0) + 1,
      schemaVersionId: updated.schemaVersionId,
      status: "published",
      data: updated.data,
      createdBy: input.userId,
    });

    return updated;
  });
}

export async function unpublishDocument(
  db: KitsuneDb,
  input: DocumentContext & { documentId: string },
): Promise<Document> {
  const [updated] = await db
    .update(documents)
    .set({
      status: "draft",
      publishedAt: null,
      updatedBy: input.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documents.workspaceId, input.workspaceId),
        eq(documents.id, input.documentId),
      ),
    )
    .returning();
  if (!updated) throw new Error("Document not found.");
  return updated;
}

export async function deleteDocument(
  db: KitsuneDb,
  workspaceId: string,
  documentId: string,
): Promise<void> {
  await db
    .delete(documents)
    .where(and(eq(documents.workspaceId, workspaceId), eq(documents.id, documentId)));
}

export interface ListDocumentsInput {
  workspaceId: string;
  collectionId: string;
  status?: "draft" | "published";
  limit?: number;
  offset?: number;
}

export async function listDocuments(
  db: KitsuneDb,
  input: ListDocumentsInput,
): Promise<Document[]> {
  const conditions = [
    eq(documents.workspaceId, input.workspaceId),
    eq(documents.collectionId, input.collectionId),
  ];
  if (input.status) conditions.push(eq(documents.status, input.status));

  return db
    .select()
    .from(documents)
    .where(and(...conditions))
    .orderBy(desc(documents.updatedAt))
    .limit(input.limit ?? 50)
    .offset(input.offset ?? 0);
}

export async function getDocument(
  db: KitsuneDb,
  workspaceId: string,
  documentId: string,
): Promise<Document | null> {
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.workspaceId, workspaceId), eq(documents.id, documentId)))
    .limit(1);
  return row ?? null;
}

export async function countDocuments(
  db: KitsuneDb,
  workspaceId: string,
  collectionId: string,
  status?: "draft" | "published",
): Promise<number> {
  const conditions = [
    eq(documents.workspaceId, workspaceId),
    eq(documents.collectionId, collectionId),
  ];
  if (status) conditions.push(eq(documents.status, status));
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documents)
    .where(and(...conditions));
  return row?.count ?? 0;
}

export async function listRevisions(
  db: KitsuneDb,
  workspaceId: string,
  documentId: string,
): Promise<DocumentRevision[]> {
  // Indirectly scoped by workspace through the document row.
  const doc = await getDocument(db, workspaceId, documentId);
  if (!doc) return [];
  return db
    .select()
    .from(documentRevisions)
    .where(eq(documentRevisions.documentId, documentId))
    .orderBy(desc(documentRevisions.revisionNumber));
}

export async function revertToRevision(
  db: KitsuneDb,
  input: DocumentContext & { documentId: string; revisionNumber: number },
): Promise<Document> {
  return db.transaction(async (tx) => {
    const [rev] = await tx
      .select()
      .from(documentRevisions)
      .where(
        and(
          eq(documentRevisions.documentId, input.documentId),
          eq(documentRevisions.revisionNumber, input.revisionNumber),
        ),
      )
      .limit(1);
    if (!rev) throw new Error("Revision not found.");

    const [updated] = await tx
      .update(documents)
      .set({
        data: rev.data,
        status: "draft",
        publishedAt: null,
        updatedBy: input.userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(documents.workspaceId, input.workspaceId),
          eq(documents.id, input.documentId),
        ),
      )
      .returning();
    if (!updated) throw new Error("Document not found.");

    const [last] = await tx
      .select({ revisionNumber: documentRevisions.revisionNumber })
      .from(documentRevisions)
      .where(eq(documentRevisions.documentId, input.documentId))
      .orderBy(desc(documentRevisions.revisionNumber))
      .limit(1);

    await tx.insert(documentRevisions).values({
      documentId: input.documentId,
      revisionNumber: (last?.revisionNumber ?? 0) + 1,
      schemaVersionId: updated.schemaVersionId,
      status: updated.status,
      data: updated.data,
      createdBy: input.userId,
    });

    return updated;
  });
}

/**
 * Load a document and project its data through the schema-version chain to
 * the current version. This is the read path used by both the admin UI
 * (with `preserveLocalizedEnvelopes: true`) and the GraphQL delivery API
 * (with a single requested locale).
 */
export interface ProjectedDocument extends Omit<Document, "data"> {
  data: Record<string, unknown>;
}

export interface ProjectOptions {
  locale?: string;
  preserveLocalizedEnvelopes?: boolean;
}

export async function loadProjectedDocument(
  db: KitsuneDb,
  workspaceId: string,
  documentId: string,
  options: ProjectOptions = {},
): Promise<ProjectedDocument | null> {
  const doc = await getDocument(db, workspaceId, documentId);
  if (!doc) return null;
  return projectDocument(db, doc, options);
}

export async function projectDocument(
  db: KitsuneDb,
  doc: Document,
  options: ProjectOptions = {},
): Promise<ProjectedDocument> {
  const { currentVersion, collection } = await resolveCurrentSchema(
    db,
    doc.workspaceId,
    doc.collectionId,
  );
  void collection;

  if (doc.schemaVersionId === currentVersion.id) {
    // Still need to apply locale resolution for localized fields.
    return {
      ...doc,
      data: applyLocaleOnly(
        doc.data,
        currentVersion.fields,
        options,
      ),
    };
  }

  const [storedVersion] = await db
    .select({ versionNumber: collectionSchemaVersions.versionNumber })
    .from(collectionSchemaVersions)
    .where(eq(collectionSchemaVersions.id, doc.schemaVersionId))
    .limit(1);

  const fromVersion = storedVersion?.versionNumber ?? 1;
  const toVersion = currentVersion.versionNumber;
  const changesets = await loadChangesetChain(db, doc.collectionId, fromVersion);

  const projected = project(doc.data, {
    fromVersion,
    toVersion,
    changesets,
    targetFields: currentVersion.fields,
    locale: options.locale,
    preserveLocalizedEnvelopes: options.preserveLocalizedEnvelopes,
  });

  return { ...doc, data: projected };
}

/**
 * Fast path when the document is already on the current schema version:
 * only apply locale resolution without running the full diff pipeline.
 */
function applyLocaleOnly(
  raw: Record<string, unknown>,
  fields: Fields,
  options: ProjectOptions,
): Record<string, unknown> {
  // Reuse `project` with a no-op chain — it still runs `resolveLocalized`.
  return project(raw, {
    fromVersion: 0,
    toVersion: 0,
    changesets: {} satisfies Record<number, Changeset>,
    targetFields: fields,
    locale: options.locale,
    preserveLocalizedEnvelopes: options.preserveLocalizedEnvelopes,
  });
}
