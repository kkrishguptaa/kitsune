# @kitsune/schema

Pure-TypeScript, zero-DB utilities that describe the shape of a CMS
collection and reason about changes to it.

## Exports

- `Field`, `Fields`, `FieldType` — field-tree types.
- `compileZod(fields, options)` — produce a Zod schema for a document's
  stored `data` blob. Localized fields expect `{ _i18n: { [locale]: value } }`.
- `diffSchemas(prev, next, hints?)` — compute a changeset from one fields
  tree to another. Marks operations destructive when they would break
  existing documents unless the caller supplies resolution hints.
- `project(rawData, { fromVersion, toVersion, changesets, targetFields,
  locale?, preserveLocalizedEnvelopes? })` — apply a chain of changesets
  to a stored document and optionally resolve localized fields to a
  single locale.
- `contentHash(fields)` — stable SHA-256 of a fields tree, used as a
  cache key for the GraphQL schema LRU and to detect no-op publishes.
- `wrapLocale`, `mergeLocale`, `readLocale` — helpers for localized fields.

## Philosophy

Schemas evolve often. Rather than running Postgres DDL per edit, every
change becomes a new immutable `collection_schema_versions` row with a
`changeset`. Reads pass stored documents through `project()` so older
documents keep working until (and if) they're batch-rewritten.
