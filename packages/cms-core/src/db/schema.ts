import type { Changeset } from "@kitsune/schema";
import type { Fields } from "@kitsune/schema";
import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ *
 * Enums
 * ------------------------------------------------------------------ */

export const memberRoleEnum = pgEnum("workspace_member_role", [
  "owner",
  "admin",
  "editor",
  "viewer",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "draft",
  "published",
]);

/* ------------------------------------------------------------------ *
 * Workspaces (tenants)
 * ------------------------------------------------------------------ */

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    defaultLocale: text("default_locale").notNull().default("en"),
    workosOrganizationId: text("workos_organization_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("workspaces_slug_uq").on(t.slug)],
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** WorkOS user id. */
    userId: text("user_id").notNull(),
    email: text("email").notNull(),
    role: memberRoleEnum("role").notNull().default("editor"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.userId] }),
    index("workspace_members_user_idx").on(t.userId),
  ],
);

export const workspaceLocales = pgTable(
  "workspace_locales",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    label: text("label").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.code] })],
);

/* ------------------------------------------------------------------ *
 * Collections & schema versions
 * ------------------------------------------------------------------ */

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    /** Points at the active `collection_schema_versions` row. */
    currentSchemaVersionId: uuid("current_schema_version_id"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("collections_workspace_slug_uq").on(t.workspaceId, t.slug),
  ],
);

export const collectionSchemaVersions = pgTable(
  "collection_schema_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    fields: jsonb("fields").notNull().$type<Fields>(),
    /** Changeset from the immediately previous version. Null on v1. */
    changeset: jsonb("changeset").$type<Changeset | null>(),
    contentHash: text("content_hash").notNull(),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("collection_schema_versions_col_ver_uq").on(
      t.collectionId,
      t.versionNumber,
    ),
  ],
);

/* ------------------------------------------------------------------ *
 * Documents & revisions
 * ------------------------------------------------------------------ */

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    schemaVersionId: uuid("schema_version_id")
      .notNull()
      .references(() => collectionSchemaVersions.id),
    status: documentStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    data: jsonb("data").notNull().$type<Record<string, unknown>>(),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("documents_workspace_collection_status_updated_idx").on(
      t.workspaceId,
      t.collectionId,
      t.status,
      t.updatedAt,
    ),
    // GIN index on `data` for JSONB filtering (where/containment queries).
    index("documents_data_gin").using("gin", t.data),
  ],
);

export const documentRevisions = pgTable(
  "document_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    schemaVersionId: uuid("schema_version_id")
      .notNull()
      .references(() => collectionSchemaVersions.id),
    status: documentStatusEnum("status").notNull(),
    data: jsonb("data").notNull().$type<Record<string, unknown>>(),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("document_revisions_doc_rev_uq").on(
      t.documentId,
      t.revisionNumber,
    ),
  ],
);

/* ------------------------------------------------------------------ *
 * API keys
 * ------------------------------------------------------------------ */

export interface ApiKeyScopes {
  readOnly: boolean;
  write: boolean;
  /** Null = all collections allowed; array restricts to these slugs. */
  collectionSlugs: string[] | null;
  /** When true, the key can push new schema versions (CLI use). */
  schemaWrite?: boolean;
}

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  secretSalt: text("secret_salt").notNull(),
  keyHash: text("key_hash").notNull(),
  scopes: jsonb("scopes").notNull().$type<ApiKeyScopes>(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdByUserId: text("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ------------------------------------------------------------------ *
 * Assets
 * ------------------------------------------------------------------ */

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    filename: text("filename").notNull(),
    mime: text("mime").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    width: integer("width"),
    height: integer("height"),
    alt: text("alt"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("assets_workspace_storage_key_uq").on(
      t.workspaceId,
      t.storageKey,
    ),
  ],
);

/* ------------------------------------------------------------------ *
 * Relations
 * ------------------------------------------------------------------ */

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  locales: many(workspaceLocales),
  collections: many(collections),
  documents: many(documents),
  apiKeys: many(apiKeys),
  assets: many(assets),
}));

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
  }),
);

export const workspaceLocalesRelations = relations(
  workspaceLocales,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceLocales.workspaceId],
      references: [workspaces.id],
    }),
  }),
);

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [collections.workspaceId],
    references: [workspaces.id],
  }),
  currentSchemaVersion: one(collectionSchemaVersions, {
    fields: [collections.currentSchemaVersionId],
    references: [collectionSchemaVersions.id],
  }),
  schemaVersions: many(collectionSchemaVersions),
  documents: many(documents),
}));

export const collectionSchemaVersionsRelations = relations(
  collectionSchemaVersions,
  ({ one }) => ({
    collection: one(collections, {
      fields: [collectionSchemaVersions.collectionId],
      references: [collections.id],
    }),
  }),
);

export const documentsRelations = relations(documents, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [documents.workspaceId],
    references: [workspaces.id],
  }),
  collection: one(collections, {
    fields: [documents.collectionId],
    references: [collections.id],
  }),
  schemaVersion: one(collectionSchemaVersions, {
    fields: [documents.schemaVersionId],
    references: [collectionSchemaVersions.id],
  }),
  revisions: many(documentRevisions),
}));

export const documentRevisionsRelations = relations(
  documentRevisions,
  ({ one }) => ({
    document: one(documents, {
      fields: [documentRevisions.documentId],
      references: [documents.id],
    }),
  }),
);

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [apiKeys.workspaceId],
    references: [workspaces.id],
  }),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [assets.workspaceId],
    references: [workspaces.id],
  }),
}));

/* ------------------------------------------------------------------ *
 * Inferred row types
 * ------------------------------------------------------------------ */

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type WorkspaceLocale = typeof workspaceLocales.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type CollectionSchemaVersion =
  typeof collectionSchemaVersions.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentRevision = typeof documentRevisions.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type Asset = typeof assets.$inferSelect;

/** Re-exported to make `sql` available to downstream consumers. */
export { sql };
