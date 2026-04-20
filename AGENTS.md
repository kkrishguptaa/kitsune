# Agent memory

## Learned User Preferences

- When maintaining env validation, keep `env.ts` and `.env.example` aligned with variables that are actually used by the app; drop unused entries instead of carrying dead configuration.

## Learned Workspace Facts

- This repository is a pnpm + Turbo monorepo: the headless CMS / TanStack Start product lives under `apps/kitsune`.
- Root `package.json` uses `pnpm.overrides` to pin `esbuild` to `0.27.7` so native optional `@esbuild/*` resolution stays consistent across Vite and tooling like `drizzle-kit` (avoids postinstall version mismatch failures during `pnpm install`).
- `apps/kitsune` uses WorkOS AuthKit with TanStack Start, Drizzle + Postgres, and T3-style `env.ts` for typed environment variables. For local sign-in, the WorkOS application must allow the same redirect URI as `WORKOS_REDIRECT_URI` (see `apps/kitsune/.env.example`), typically `http://localhost:3000/api/auth/callback`, or WorkOS returns `redirect-uri-invalid`.
- `API_KEY_PEPPER` is a server-only secret (16+ characters in `env.ts`) mixed into scrypt hashing for CMS workspace API keys; it is not used for WorkOS or session cookies.
