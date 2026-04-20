import {
  addLocale as coreAddLocale,
  assertValidSlug,
  canRole,
  createApiKey,
  createCollection,
  createDocument,
  deleteDocument,
  deleteCollection,
  inviteMember,
  listApiKeys,
  listCollections,
  listDocuments,
  listLocales,
  listMembers,
  listRevisions,
  loadProjectedDocument,
  publishDocument,
  publishNewVersion,
  removeLocale,
  revertToRevision,
  revokeApiKey,
  setDefaultLocale,
  unpublishDocument,
  updateDocument,
  type Collection,
  type CollectionSchemaVersion,
  type Document,
} from "@kitsune/cms-core";
import { getCollectionWithCurrentSchema } from "@kitsune/cms-core";
import type { DiffHints, Fields } from "@kitsune/schema";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { env } from "#/env";
import { db } from "#/lib/db";
import { clearWorkspaceSchemaCache } from "@kitsune/cms-graphql";
import { requireWorkspace, requireWorkspaceRole } from "./workspace";

/* ------------------------------------------------------------------ *
 * Collections
 * ------------------------------------------------------------------ */

export const listCollectionsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { workspace } = await requireWorkspace();
    return listCollections(db, workspace.id);
  },
);

const createCollectionInput = z.object({
  slug: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
});

export const createCollectionFn = createServerFn({ method: "POST" })
  .inputValidator(createCollectionInput)
  .handler(async ({ data }) => {
    assertValidSlug(data.slug);
    const { user, workspace } = await requireWorkspaceRole("editor");
    const collection = await createCollection(db, {
      workspaceId: workspace.id,
      slug: data.slug,
      name: data.name,
      description: data.description,
      createdBy: user.id,
    });
    clearWorkspaceSchemaCache(workspace.id);
    return collection;
  });

export const deleteCollectionFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { workspace } = await requireWorkspaceRole("admin");
    await deleteCollection(db, workspace.id, data.id);
    clearWorkspaceSchemaCache(workspace.id);
    return { ok: true };
  });

export const getCollectionFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }): Promise<{
    collection: Collection;
    schemaVersion: CollectionSchemaVersion | null;
  } | null> => {
    const { workspace } = await requireWorkspace();
    return getCollectionWithCurrentSchema(db, workspace.id, data.slug);
  });

/* ------------------------------------------------------------------ *
 * Schema versions
 * ------------------------------------------------------------------ */

const publishSchemaInput = z.object({
  collectionId: z.string().uuid(),
  nextFields: z.any().transform((v) => v as Fields),
  hints: z
    .object({
      renames: z.record(z.string(), z.string()).optional(),
      defaults: z.record(z.string(), z.unknown()).optional(),
      confirmDrops: z.array(z.string()).optional(),
      confirmRetypes: z.array(z.string()).optional(),
    })
    .optional(),
});

export const publishSchemaFn = createServerFn({ method: "POST" })
  .inputValidator(publishSchemaInput)
  .handler(async ({ data }) => {
    const { user, workspace } = await requireWorkspaceRole("editor");
    const result = await publishNewVersion(db, {
      workspaceId: workspace.id,
      collectionId: data.collectionId,
      nextFields: data.nextFields,
      hints: data.hints as DiffHints | undefined,
      createdBy: user.id,
    });
    clearWorkspaceSchemaCache(workspace.id);
    return result;
  });

/* ------------------------------------------------------------------ *
 * Documents
 * ------------------------------------------------------------------ */

export const listDocumentsFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      collectionId: z.string().uuid(),
      status: z.enum(["draft", "published"]).optional(),
      limit: z.number().int().optional(),
      offset: z.number().int().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { workspace } = await requireWorkspace();
    return listDocuments(db, {
      workspaceId: workspace.id,
      ...data,
    });
  });

export const getDocumentFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { workspace } = await requireWorkspace();
    return loadProjectedDocument(db, workspace.id, data.id, {
      preserveLocalizedEnvelopes: true,
    });
  });

const createDocumentInput = z.object({
  collectionId: z.string().uuid(),
  data: z.record(z.string(), z.unknown()),
  status: z.enum(["draft", "published"]).optional(),
});

export const createDocumentFn = createServerFn({ method: "POST" })
  .inputValidator(createDocumentInput)
  .handler(async ({ data }) => {
    const { user, workspace } = await requireWorkspaceRole("editor");
    return createDocument(db, {
      workspaceId: workspace.id,
      collectionId: data.collectionId,
      userId: user.id,
      data: data.data,
      status: data.status,
    });
  });

const updateDocumentInput = z.object({
  collectionId: z.string().uuid(),
  documentId: z.string().uuid(),
  data: z.record(z.string(), z.unknown()),
});

export const updateDocumentFn = createServerFn({ method: "POST" })
  .inputValidator(updateDocumentInput)
  .handler(async ({ data }) => {
    const { user, workspace } = await requireWorkspaceRole("editor");
    return updateDocument(db, {
      workspaceId: workspace.id,
      collectionId: data.collectionId,
      userId: user.id,
      documentId: data.documentId,
      data: data.data,
    });
  });

const docIdAndCollection = z.object({
  collectionId: z.string().uuid(),
  documentId: z.string().uuid(),
});

export const publishDocumentFn = createServerFn({ method: "POST" })
  .inputValidator(docIdAndCollection)
  .handler(async ({ data }) => {
    const { user, workspace } = await requireWorkspaceRole("editor");
    return publishDocument(db, {
      workspaceId: workspace.id,
      collectionId: data.collectionId,
      userId: user.id,
      documentId: data.documentId,
    });
  });

export const unpublishDocumentFn = createServerFn({ method: "POST" })
  .inputValidator(docIdAndCollection)
  .handler(async ({ data }) => {
    const { user, workspace } = await requireWorkspaceRole("editor");
    return unpublishDocument(db, {
      workspaceId: workspace.id,
      collectionId: data.collectionId,
      userId: user.id,
      documentId: data.documentId,
    });
  });

export const deleteDocumentFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ documentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { workspace } = await requireWorkspaceRole("editor");
    await deleteDocument(db, workspace.id, data.documentId);
    return { ok: true };
  });

export const listRevisionsFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ documentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { workspace } = await requireWorkspace();
    return listRevisions(db, workspace.id, data.documentId);
  });

export const revertToRevisionFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      collectionId: z.string().uuid(),
      documentId: z.string().uuid(),
      revisionNumber: z.number().int().positive(),
    }),
  )
  .handler(async ({ data }) => {
    const { user, workspace } = await requireWorkspaceRole("editor");
    return revertToRevision(db, {
      workspaceId: workspace.id,
      collectionId: data.collectionId,
      userId: user.id,
      documentId: data.documentId,
      revisionNumber: data.revisionNumber,
    });
  });

/* ------------------------------------------------------------------ *
 * Locales
 * ------------------------------------------------------------------ */

export const listLocalesFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { workspace } = await requireWorkspace();
    return listLocales(db, workspace.id);
  },
);

const localeInput = z.object({
  code: z.string().min(2).max(10),
  label: z.string().min(1),
  isDefault: z.boolean().optional(),
});

export const addLocaleFn = createServerFn({ method: "POST" })
  .inputValidator(localeInput)
  .handler(async ({ data }) => {
    const { workspace } = await requireWorkspaceRole("admin");
    return coreAddLocale(db, { workspaceId: workspace.id, ...data });
  });

export const setDefaultLocaleFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string() }))
  .handler(async ({ data }) => {
    const { workspace } = await requireWorkspaceRole("admin");
    await setDefaultLocale(db, workspace.id, data.code);
    return { ok: true };
  });

export const removeLocaleFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string() }))
  .handler(async ({ data }) => {
    const { workspace } = await requireWorkspaceRole("admin");
    await removeLocale(db, workspace.id, data.code);
    return { ok: true };
  });

/* ------------------------------------------------------------------ *
 * API keys
 * ------------------------------------------------------------------ */

export const listApiKeysFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { workspace } = await requireWorkspace();
    return listApiKeys(db, workspace.id);
  },
);

export const createApiKeyFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      readOnly: z.boolean().optional(),
      write: z.boolean().optional(),
      schemaWrite: z.boolean().optional(),
      collectionSlugs: z.array(z.string()).nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { user, workspace } = await requireWorkspaceRole("admin");
    return createApiKey(db, env.API_KEY_PEPPER, {
      workspaceId: workspace.id,
      name: data.name,
      createdByUserId: user.id,
      scopes: {
        readOnly: data.readOnly ?? !(data.write || data.schemaWrite),
        write: data.write ?? false,
        schemaWrite: data.schemaWrite ?? false,
        collectionSlugs: data.collectionSlugs ?? null,
      },
    });
  });

export const revokeApiKeyFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { workspace } = await requireWorkspaceRole("admin");
    await revokeApiKey(db, workspace.id, data.id);
    return { ok: true };
  });

/* ------------------------------------------------------------------ *
 * Members
 * ------------------------------------------------------------------ */

export const listMembersFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { workspace } = await requireWorkspace();
    return listMembers(db, workspace.id);
  },
);

const inviteMemberInput = z.object({
  userId: z.string(),
  email: z.email(),
  role: z.enum(["owner", "admin", "editor", "viewer"]),
});

export const inviteMemberFn = createServerFn({ method: "POST" })
  .inputValidator(inviteMemberInput)
  .handler(async ({ data }) => {
    const { workspace } = await requireWorkspaceRole("admin");
    return inviteMember(db, workspace.id, data);
  });

/* ------------------------------------------------------------------ *
 * Re-export for callers that want to use helpers without direct imports.
 * ------------------------------------------------------------------ */

export { canRole };
export type { Collection, CollectionSchemaVersion, Document };
