import {
  type Collection,
  type CollectionSchemaVersion,
  canReadCollection,
  canWriteCollection,
  createDocument as coreCreateDocument,
  deleteDocument as coreDeleteDocument,
  publishDocument as corePublishDocument,
  updateDocument as coreUpdateDocument,
  getCollectionBySlug,
  type KitsuneDb,
  listDocuments,
  loadActiveCollectionsWithSchema,
  loadProjectedDocument,
  projectDocument,
} from "@kitsune/cms-core";
import { type Field, type Fields, contentHash } from "@kitsune/schema";
import {
  GraphQLBoolean,
  GraphQLEnumType,
  type GraphQLFieldConfig,
  type GraphQLFieldConfigMap,
  GraphQLFloat,
  GraphQLID,
  type GraphQLInputFieldConfigMap,
  type GraphQLInputType,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  Kind,
} from "graphql";
import { LRUCache } from "lru-cache";
import type { KitsuneGraphQLContext } from "./context.ts";

/* -------------------------------------------------------------------- *
 * Custom scalars
 * -------------------------------------------------------------------- */

const DateTimeScalar = new GraphQLScalarType<Date | string, string>({
  name: "DateTime",
  description: "ISO-8601 date-time string.",
  serialize(value) {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "string") return value;
    throw new TypeError("DateTime must be serialized from Date or string.");
  },
  parseValue(value) {
    if (typeof value !== "string") {
      throw new TypeError("DateTime must be a string.");
    }
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw new TypeError("DateTime must be a string literal.");
    }
    return new Date(ast.value);
  },
});

const JsonScalar = new GraphQLScalarType({
  name: "JSON",
  description: "Arbitrary JSON value.",
  serialize(value) {
    return value;
  },
  parseValue(value) {
    return value;
  },
});

const DocumentStatusEnum = new GraphQLEnumType({
  name: "DocumentStatus",
  values: {
    DRAFT: { value: "draft" },
    PUBLISHED: { value: "published" },
  },
});

/* -------------------------------------------------------------------- *
 * Name helpers
 * -------------------------------------------------------------------- */

function pascal(input: string): string {
  return input
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

function pluralizeSlug(slug: string): string {
  if (slug.endsWith("s") || slug.endsWith("x")) return `${slug}es`;
  if (slug.endsWith("y")) return `${slug.slice(0, -1)}ies`;
  return `${slug}s`;
}

/* -------------------------------------------------------------------- *
 * Field -> GraphQL type generation
 * -------------------------------------------------------------------- */

function buildOutputForField(
  field: Field,
  typePath: string[],
): GraphQLOutputType {
  let base: GraphQLOutputType;
  switch (field.type) {
    case "string":
    case "text":
    case "markdown":
      base = GraphQLString;
      break;
    case "number":
      base = field.integer ? GraphQLInt : GraphQLFloat;
      break;
    case "boolean":
      base = GraphQLBoolean;
      break;
    case "date":
      base = DateTimeScalar;
      break;
    case "select":
      base = field.multiple
        ? new GraphQLList(new GraphQLNonNull(GraphQLString))
        : GraphQLString;
      break;
    case "reference":
      base = field.many
        ? new GraphQLList(new GraphQLNonNull(GraphQLID))
        : GraphQLID;
      break;
    case "asset":
      base = GraphQLID;
      break;
    case "array": {
      const inner = buildOutputForField(field.of, [
        ...typePath,
        `${pascal(field.name)}Item`,
      ]);
      base = new GraphQLList(new GraphQLNonNull(inner));
      break;
    }
    case "object": {
      const objectName = typePath.concat(pascal(field.name)).join("");
      base = new GraphQLObjectType<unknown, KitsuneGraphQLContext>({
        name: objectName,
        fields: () => {
          const out: GraphQLFieldConfigMap<unknown, KitsuneGraphQLContext> = {};
          for (const f of field.fields) {
            out[f.name] = {
              type: buildOutputForField(f, [...typePath, pascal(field.name)]),
            };
          }
          return out;
        },
      });
      break;
    }
    default: {
      const _exhaustive: never = field;
      base = _exhaustive;
    }
  }
  return field.required ? new GraphQLNonNull(base) : base;
}

function buildInputForField(field: Field): GraphQLInputType {
  let base: GraphQLInputType;
  switch (field.type) {
    case "string":
    case "text":
    case "markdown":
      base = GraphQLString;
      break;
    case "number":
      base = field.integer ? GraphQLInt : GraphQLFloat;
      break;
    case "boolean":
      base = GraphQLBoolean;
      break;
    case "date":
      base = DateTimeScalar;
      break;
    case "select":
      base = field.multiple
        ? new GraphQLList(new GraphQLNonNull(GraphQLString))
        : GraphQLString;
      break;
    case "reference":
      base = field.many
        ? new GraphQLList(new GraphQLNonNull(GraphQLID))
        : GraphQLID;
      break;
    case "asset":
      base = GraphQLID;
      break;
    case "array":
    case "object":
      // MVP: nested shapes are accepted as JSON and validated at runtime
      // by the Zod schema compiled in `cms-core`.
      base = JsonScalar;
      break;
    default: {
      const _exhaustive: never = field;
      base = _exhaustive;
    }
  }
  return field.required ? new GraphQLNonNull(base) : base;
}

/* -------------------------------------------------------------------- *
 * Collection types
 * -------------------------------------------------------------------- */

function buildCollectionType(
  collection: Collection,
  version: CollectionSchemaVersion,
): GraphQLObjectType<unknown, KitsuneGraphQLContext> {
  const typeName = pascal(collection.slug);
  return new GraphQLObjectType<unknown, KitsuneGraphQLContext>({
    name: typeName,
    description: collection.description ?? undefined,
    fields: () => {
      const out: GraphQLFieldConfigMap<unknown, KitsuneGraphQLContext> = {
        _id: { type: new GraphQLNonNull(GraphQLID) },
        _status: { type: new GraphQLNonNull(DocumentStatusEnum) },
        _publishedAt: { type: DateTimeScalar },
        _updatedAt: { type: new GraphQLNonNull(DateTimeScalar) },
        _createdAt: { type: new GraphQLNonNull(DateTimeScalar) },
      };
      for (const field of version.fields as Fields) {
        out[field.name] = { type: buildOutputForField(field, [typeName]) };
      }
      return out;
    },
  });
}

function buildCreateInput(
  collection: Collection,
  version: CollectionSchemaVersion,
): GraphQLInputObjectType {
  const typeName = `${pascal(collection.slug)}Input`;
  return new GraphQLInputObjectType({
    name: typeName,
    fields: () => {
      const out: GraphQLInputFieldConfigMap = {};
      for (const f of version.fields as Fields) {
        out[f.name] = { type: buildInputForField(f) };
      }
      return out;
    },
  });
}

/* -------------------------------------------------------------------- *
 * Snapshot hash
 * -------------------------------------------------------------------- */

function computeSnapshotHash(
  rows: Array<{
    collection: Collection;
    currentVersion: CollectionSchemaVersion;
  }>,
): string {
  const sorted = [...rows].sort((a, b) =>
    a.collection.slug < b.collection.slug ? -1 : 1,
  );
  const parts = sorted
    .map((r) => `${r.collection.slug}:${r.currentVersion.contentHash}`)
    .join("|");
  return contentHash([
    {
      name: "__snapshot__",
      type: "string",
      description: parts,
    } as Field,
  ]);
}

/* -------------------------------------------------------------------- *
 * Response shaping
 * -------------------------------------------------------------------- */

function shapeDocument(row: {
  id: string;
  status: "draft" | "published";
  publishedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
  data: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    _id: row.id,
    _status: row.status,
    _publishedAt: row.publishedAt,
    _updatedAt: row.updatedAt,
    _createdAt: row.createdAt,
    ...row.data,
  };
}

/* -------------------------------------------------------------------- *
 * Build + cache
 * -------------------------------------------------------------------- */

export interface BuildSchemaResult {
  schema: GraphQLSchema;
  snapshotHash: string;
  collectionSlugs: string[];
}

const cache = new LRUCache<string, BuildSchemaResult>({
  max: 256,
  ttl: 1000 * 60 * 10,
});

export function clearWorkspaceSchemaCache(workspaceId?: string): void {
  if (!workspaceId) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${workspaceId}:`)) cache.delete(key);
  }
}

export async function buildWorkspaceSchema(
  db: KitsuneDb,
  workspaceId: string,
): Promise<BuildSchemaResult> {
  const rows = await loadActiveCollectionsWithSchema(db, workspaceId);
  const snapshotHash = computeSnapshotHash(rows);
  const cacheKey = `${workspaceId}:${snapshotHash}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const queryFields: GraphQLFieldConfigMap<unknown, KitsuneGraphQLContext> =
    {};
  const mutationFields: GraphQLFieldConfigMap<unknown, KitsuneGraphQLContext> =
    {};

  for (const { collection, currentVersion } of rows) {
    const outputType = buildCollectionType(collection, currentVersion);
    const inputType = buildCreateInput(collection, currentVersion);
    const singular = collection.slug;
    const plural = pluralizeSlug(collection.slug);

    const singularField: GraphQLFieldConfig<
      unknown,
      KitsuneGraphQLContext
    > = {
      type: outputType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        locale: { type: GraphQLString },
      },
      resolve: async (_, args, ctx) => {
        if (!canReadCollection(ctx.apiKey.scopes, collection.slug)) return null;
        const doc = await loadProjectedDocument(
          ctx.db,
          ctx.workspaceId,
          args.id as string,
          {
            locale: (args.locale as string | undefined) ?? ctx.locale ?? undefined,
          },
        );
        if (!doc || doc.collectionId !== collection.id) return null;
        return shapeDocument(doc);
      },
    };
    queryFields[singular] = singularField;

    const pluralField: GraphQLFieldConfig<unknown, KitsuneGraphQLContext> = {
      type: new GraphQLList(new GraphQLNonNull(outputType)),
      args: {
        locale: { type: GraphQLString },
        status: { type: DocumentStatusEnum },
        limit: { type: GraphQLInt },
        offset: { type: GraphQLInt },
      },
      resolve: async (_, args, ctx) => {
        if (!canReadCollection(ctx.apiKey.scopes, collection.slug)) return [];
        const rows = await listDocuments(ctx.db, {
          workspaceId: ctx.workspaceId,
          collectionId: collection.id,
          status:
            (args.status as "draft" | "published" | undefined) ?? "published",
          limit: (args.limit as number | undefined) ?? 50,
          offset: (args.offset as number | undefined) ?? 0,
        });
        const locale =
          (args.locale as string | undefined) ?? ctx.locale ?? undefined;
        const projected = await Promise.all(
          rows.map((r) => projectDocument(ctx.db, r, { locale })),
        );
        return projected.map(shapeDocument);
      },
    };
    queryFields[plural] = pluralField;

    const mutationBaseArgs = {
      data: { type: new GraphQLNonNull(inputType) },
    } as const;

    mutationFields[`create${pascal(singular)}`] = {
      type: outputType,
      args: {
        ...mutationBaseArgs,
        status: { type: DocumentStatusEnum },
      },
      resolve: async (_, args, ctx) => {
        if (!canWriteCollection(ctx.apiKey.scopes, collection.slug)) {
          throw new Error(
            `API key does not have write scope on ${collection.slug}.`,
          );
        }
        const created = await coreCreateDocument(ctx.db, {
          workspaceId: ctx.workspaceId,
          collectionId: collection.id,
          userId: `api-key:${ctx.apiKey.id}`,
          data: args.data as Record<string, unknown>,
          status: args.status as "draft" | "published" | undefined,
        });
        const projected = await projectDocument(ctx.db, created, {
          locale: ctx.locale ?? undefined,
        });
        return shapeDocument(projected);
      },
    };

    mutationFields[`update${pascal(singular)}`] = {
      type: outputType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        data: { type: new GraphQLNonNull(inputType) },
      },
      resolve: async (_, args, ctx) => {
        if (!canWriteCollection(ctx.apiKey.scopes, collection.slug)) {
          throw new Error(
            `API key does not have write scope on ${collection.slug}.`,
          );
        }
        const updated = await coreUpdateDocument(ctx.db, {
          workspaceId: ctx.workspaceId,
          collectionId: collection.id,
          userId: `api-key:${ctx.apiKey.id}`,
          documentId: args.id as string,
          data: args.data as Record<string, unknown>,
        });
        const projected = await projectDocument(ctx.db, updated, {
          locale: ctx.locale ?? undefined,
        });
        return shapeDocument(projected);
      },
    };

    mutationFields[`publish${pascal(singular)}`] = {
      type: outputType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: async (_, args, ctx) => {
        if (!canWriteCollection(ctx.apiKey.scopes, collection.slug)) {
          throw new Error(
            `API key does not have write scope on ${collection.slug}.`,
          );
        }
        const updated = await corePublishDocument(ctx.db, {
          workspaceId: ctx.workspaceId,
          collectionId: collection.id,
          userId: `api-key:${ctx.apiKey.id}`,
          documentId: args.id as string,
        });
        const projected = await projectDocument(ctx.db, updated, {
          locale: ctx.locale ?? undefined,
        });
        return shapeDocument(projected);
      },
    };

    mutationFields[`delete${pascal(singular)}`] = {
      type: new GraphQLNonNull(GraphQLBoolean),
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: async (_, args, ctx) => {
        if (!canWriteCollection(ctx.apiKey.scopes, collection.slug)) {
          throw new Error(
            `API key does not have write scope on ${collection.slug}.`,
          );
        }
        await coreDeleteDocument(ctx.db, ctx.workspaceId, args.id as string);
        return true;
      },
    };
  }

  // Always-available utility fields so introspection works even for an
  // empty workspace.
  queryFields._health = {
    type: new GraphQLNonNull(GraphQLBoolean),
    resolve: async () => true,
  };

  const schema = new GraphQLSchema({
    query: new GraphQLObjectType<unknown, KitsuneGraphQLContext>({
      name: "Query",
      fields: queryFields,
    }),
    mutation:
      Object.keys(mutationFields).length > 0
        ? new GraphQLObjectType<unknown, KitsuneGraphQLContext>({
            name: "Mutation",
            fields: mutationFields,
          })
        : undefined,
    types: [DateTimeScalar, JsonScalar, DocumentStatusEnum],
  });

  const result: BuildSchemaResult = {
    schema,
    snapshotHash,
    collectionSlugs: rows.map((r) => r.collection.slug),
  };
  cache.set(cacheKey, result);
  return result;
}

export { getCollectionBySlug };
