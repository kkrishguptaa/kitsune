# @kitsune/cms-core

Drizzle schema, migrations, and tenant-scoped services for the Kitsune CMS.

## Tables

- `workspaces`, `workspace_members`, `workspace_locales`
- `collections` (`current_schema_version_id` pointer) + `collection_schema_versions` (immutable)
- `documents` (`jsonb data`, GIN-indexed) + `document_revisions` (append-only)
- `api_keys` (scrypt + pepper hashing, scoped) and `assets`

## Services

All services accept the Drizzle `db` as the first argument so they can be
injected in tests or tenant-scoped request contexts:

- `workspaces.ts` — create/list/switch, role checks.
- `collections.ts` — CRUD + slug validation.
- `schema-versions.ts` — `publishNewVersion` with destructive-change
  rejection, `loadChangesetChain` for the projector.
- `documents.ts` — create/update/publish/unpublish/delete + revisions +
  `projectDocument` which runs the schema projector on read.
- `locales.ts` — add/remove/set-default workspace locales.
- `assets.ts` — upload / list / delete backed by a `StorageDriver`.
- `auth/api-keys.ts` — create/list/revoke/verify API keys.

## Storage drivers

`StorageDriver` is implemented by `LocalFsDriver` for dev. An S3-compatible
driver can be added without touching service code.

## Scripts

- `db:generate` — regenerate migrations from `src/db/schema.ts`.
- `db:migrate` — apply migrations.
- `db:studio` — launch Drizzle Studio.
- `seed` — create a demo workspace, `articles` collection, and a sample post.
