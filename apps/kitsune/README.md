# apps/kitsune

The TanStack Start application that composes Kitsune: landing page, admin
console, GraphQL delivery endpoint, auth callbacks, CLI push endpoint, and
health check.

## Scripts

```bash
pnpm dev          # boot Vite dev server on :3000
pnpm build        # production build
pnpm start        # run production build
pnpm check        # Biome check
pnpm check-types  # tsc --noEmit across all packages this app depends on
pnpm db:generate  # regenerate Drizzle migrations (in @kitsune/cms-core)
pnpm db:migrate   # apply migrations
pnpm db:studio    # open Drizzle Studio
```

## Routes

- `/` — marketing landing.
- `/login` — redirects to WorkOS AuthKit.
- `/logout` — clears the session and redirects home.
- `/admin` — workspace dashboard (auth-gated).
  - `/admin/collections` — list + create.
  - `/admin/collections/$slug` — documents.
  - `/admin/collections/$slug/schema` — designer with diff-preview.
  - `/admin/collections/$slug/$id` — document editor with `MarkdownEditor`,
    locale switcher, publish bar, and revisions drawer.
  - `/admin/locales` — manage workspace locales.
  - `/admin/members` — invite members (by WorkOS user id + email for MVP).
  - `/admin/api-keys` — create / revoke. Full key shown once.
- `/api/auth/callback` — AuthKit OAuth callback; provisions a workspace
  on first sign-in.
- `/api/graphql` — Yoga. Bearer API key required, admins get GraphiQL.
- `/api/cms/schema/push` — POST from the future TS CLI; requires a key
  with `schemaWrite: true`.
- `/api/health` — cheap DB ping for uptime probes.

## Environment

See [`.env.example`](.env.example). Required:

- `DATABASE_URL`
- `API_KEY_PEPPER` (16+ chars — rotating invalidates every issued key)
- `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `WORKOS_REDIRECT_URI`, `WORKOS_COOKIE_PASSWORD` (32+)

Optional: `S3_*` for asset storage when not using the local-fs driver.
