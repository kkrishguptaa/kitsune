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
 && pnpm --filter @kitsuneos/app build \
 && mkdir -p /runtime/node_modules \
 && for dep in pg uuid pg-protocol pgpass pg-int8 pg-types postgres-array postgres-bytea postgres-date postgres-interval split2 xtend; do \
      src="$(find /app/node_modules -type d -path "*/node_modules/${dep}" ! -path "*/.bin/*" | head -n1)"; \
      if [ -z "$src" ]; then echo "missing runtime dep: ${dep}" >&2; exit 1; fi; \
      mkdir -p "/runtime/node_modules/${dep}" && cp -aL "$src/." "/runtime/node_modules/${dep}/"; \
    done

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
COPY --from=builder /runtime/node_modules ./node_modules
USER root
RUN mkdir -p node_modules/@kitsuneos \
  && ln -s ../../packages/core node_modules/@kitsuneos/core \
  && ln -s ../../packages/provisioning node_modules/@kitsuneos/provisioning \
  && chown -R nextjs:nodejs scripts packages node_modules apps
USER nextjs
EXPOSE 8080
CMD ["node", "scripts/docker-entrypoint.mjs"]
