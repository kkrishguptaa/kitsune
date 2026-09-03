# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/graphql/package.json packages/graphql/
COPY packages/mcp/package.json packages/mcp/
COPY packages/server/package.json packages/server/
COPY packages/provisioning/package.json packages/provisioning/
COPY packages/ui/package.json packages/ui/
COPY packages/client/package.json packages/client/
COPY packages/cli/package.json packages/cli/
COPY packages/codegen/package.json packages/codegen/
COPY packages/acceptance/package.json packages/acceptance/
COPY apps/app/package.json apps/app/
COPY apps/site/package.json apps/site/
COPY infra/package.json infra/
RUN pnpm install --frozen-lockfile --filter @kitsuneos/app...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/infra ./infra
COPY . .
RUN pnpm --filter @kitsuneos/core build \
 && pnpm --filter @kitsuneos/graphql build \
 && pnpm --filter @kitsuneos/mcp build \
 && pnpm --filter @kitsuneos/server build \
 && pnpm --filter @kitsuneos/provisioning build \
 && pnpm --filter @kitsuneos/ui build \
 && pnpm --filter @kitsuneos/app build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/app/public ./apps/app/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/app/.next/static ./apps/app/.next/static
COPY --from=builder /app/scripts/docker-entrypoint.mjs ./scripts/docker-entrypoint.mjs
COPY --from=builder /app/scripts/bootstrap-rds.mjs ./scripts/bootstrap-rds.mjs
COPY --from=builder /app/scripts/docker-seed-demo.mjs ./scripts/docker-seed-demo.mjs
COPY --from=builder /app/packages/core/package.json ./packages/core/package.json
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/provisioning/package.json ./packages/provisioning/package.json
COPY --from=builder /app/packages/provisioning/dist ./packages/provisioning/dist
COPY --from=builder /app/node_modules/pg ./node_modules/pg
COPY --from=builder /app/node_modules/pg-protocol ./node_modules/pg-protocol
COPY --from=builder /app/node_modules/pgpass ./node_modules/pgpass
COPY --from=builder /app/node_modules/pg-int8 ./node_modules/pg-int8
COPY --from=builder /app/node_modules/pg-types ./node_modules/pg-types
COPY --from=builder /app/node_modules/postgres-array ./node_modules/postgres-array
COPY --from=builder /app/node_modules/postgres-bytea ./node_modules/postgres-bytea
COPY --from=builder /app/node_modules/postgres-date ./node_modules/postgres-date
COPY --from=builder /app/node_modules/postgres-interval ./node_modules/postgres-interval
COPY --from=builder /app/node_modules/split2 ./node_modules/split2
COPY --from=builder /app/node_modules/xtend ./node_modules/xtend
COPY --from=builder /app/node_modules/uuid ./node_modules/uuid
USER root
RUN mkdir -p node_modules/@kitsuneos \
  && ln -s ../../packages/core node_modules/@kitsuneos/core \
  && ln -s ../../packages/provisioning node_modules/@kitsuneos/provisioning \
  && chown -R nextjs:nodejs scripts packages node_modules
USER nextjs
EXPOSE 8080
CMD ["node", "scripts/docker-entrypoint.mjs"]
