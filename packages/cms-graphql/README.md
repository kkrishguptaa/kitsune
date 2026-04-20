# @kitsune/cms-graphql

Dynamic GraphQL delivery API for Kitsune, built on `graphql` + `graphql-yoga`.

## What it does

`buildWorkspaceSchema(db, workspaceId)` loads every active collection for
the workspace, generates:

- one `GraphQLObjectType` per collection, with inherited `_id`, `_status`,
  `_publishedAt`, `_updatedAt`, `_createdAt` fields and one field per entry
  in the collection's current `fields` tree,
- `Query.{slug}(id, locale)` and `Query.{slugPlural}(limit, offset, status, locale)`
  with locale projection applied on read,
- `Mutation.create{Slug}`, `update{Slug}`, `publish{Slug}`, `delete{Slug}`
  that check the API key's `write` + `collectionSlugs` scopes at runtime.

The result is cached in an `LRUCache` keyed by `${workspaceId}:${snapshotHash}`.
`clearWorkspaceSchemaCache(workspaceId?)` evicts after a schema change.

## Yoga adapter

`createKitsuneYoga({ db, apiKeyPepper, allowAdmin?, rateLimit?, onAuthenticated? })`
returns a Yoga instance. Authentication accepts:

- a Bearer API key (`Authorization: Bearer kits:<uuid>:<secret>`), or
- an admin session via the optional `allowAdmin(request)` hook (used to
  unlock GraphiQL for logged-in admins).

Rate limiting is done per API key in-process (LRU token buckets) — swap in
a Redis-backed limiter when deploying horizontally.

## Locale

Clients pick a locale via `X-Kitsune-Locale` or `?locale=xx`. Each query
field also exposes a `locale` argument that takes precedence.
