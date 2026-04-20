# Kitsune

A **multi-tenant, schema-in-DB, Markdown-first, GraphQL-headless CMS** built on top of TanStack Start. Admins design schemas and author content in the console; machine clients read (and optionally write) over a per-tenant GraphQL API; a future TypeScript CLI can push schema versions without leaving the repo.

## Layout

- `apps/kitsune` — TanStack Start app. Landing page, `/admin/*` console, `/api/auth/*`, `/api/graphql`, `/api/cms/schema/push`, `/api/health`.
- `packages/schema` — Pure TS: field types, Zod compiler, schema diff, document projector, content-hash. Future CLI depends only on this.
- `packages/cms-core` — Drizzle + Postgres schema, services (workspaces, collections, schema versions, documents, revisions, locales, API keys, assets) and a pluggable storage driver.
- `packages/cms-graphql` — Per-workspace dynamic GraphQL schema builder, LRU-cached by `(workspaceId, snapshotHash)`, served with `graphql-yoga`.
- `packages/ui` — shadcn-style primitives + CMS composites: `SchemaDesigner`, `DocumentForm`, `MarkdownEditor`, `PublishBar`, `ApiKeyCreateDialog`, etc.
- `packages/tsconfig` — Shared `tsconfig` bases.

## Getting started

1. `pnpm install`
2. Start Postgres locally (any means).
3. Copy `apps/kitsune/.env.example` to `apps/kitsune/.env.local` and fill it in.
4. `pnpm db:generate` — regenerate Drizzle migrations from the schema (already generated, safe to re-run).
5. `pnpm db:migrate` — apply migrations.
6. `pnpm --filter @kitsune/cms-core seed` — optional, creates a demo workspace.
7. `pnpm dev` — boot the app.

## Architecture decisions

- **Generic document storage** with a single `documents.data jsonb` column. Schema versions are first-class rows; reads apply lazy projections through the stored changeset chain to the currently active schema version. No runtime DDL, serverless-friendly.
- **Draft / published + revisions + per-locale** from day one. Localized fields store values under `{ _i18n: { [locale]: value } }` inside `data`.
- **Two audiences of auth**:
  - admin humans sign in with WorkOS AuthKit (via `@workos/authkit-tanstack-react-start`),
  - machine clients use Bearer API keys (`kits:{uuid}:{secret}`) scoped to a workspace, with `readOnly` / `write` / `schemaWrite` bits and an optional per-collection allowlist.
- **GraphQL delivery** compiles a fresh schema per workspace + snapshot hash and caches it in an in-memory LRU. Mutations are only added for keys that have `write` scope on the collection.
- **Destructive schema changes** (drops, narrowings, new-required-without-default) are rejected unless the caller opts in with explicit hints (`confirmDrops`, `confirmRetypes`, `defaults`, `renames`). The admin UI surfaces the diff before save; the CLI endpoint echoes the diff in a `409` response.

## Vercel-readiness

- No runtime DDL; background work is idempotent row-by-row.
- `postgres.js` client is created with `max: 1` and `prepare: false` by default.
- All sessions live in sealed cookies (no server-side session store).
- Blob storage is behind a `StorageDriver` interface; `LocalFsDriver` is shipped for dev, S3 can slot in for prod.
