import type { KitsuneDb, VerifiedApiKey } from "@kitsune/cms-core";
import {
  parseBearerApiKey,
  touchApiKeyUsed,
  verifyApiKey,
} from "@kitsune/cms-core";
import { createYoga, type YogaServerInstance } from "graphql-yoga";
import { buildWorkspaceSchema } from "./build-schema.ts";
import type { KitsuneGraphQLContext } from "./context.ts";
import { InMemoryRateLimiter } from "./rate-limit.ts";

export interface CreateYogaOptions {
  db: KitsuneDb;
  /** Pepper used to verify API key secrets. Must match `createApiKey`. */
  apiKeyPepper: string;
  /**
   * Hook that lets the admin console unlock GraphiQL for logged-in admins
   * even without an API key. Receives the incoming request and returns
   * `true` to allow GraphiQL UI + introspection with an admin context.
   */
  allowAdmin?: (request: Request) => Promise<
    | { workspaceId: string; userId: string }
    | null
  >;
  /**
   * Optional hook for rate-limiting / audit logging. Called after a key is
   * verified and before the resolver runs.
   */
  onAuthenticated?: (
    key: VerifiedApiKey,
    request: Request,
  ) => void | Promise<void>;
  /** Path this Yoga instance is mounted under. Defaults to `/api/graphql`. */
  graphqlEndpoint?: string;
  /**
   * Per-API-key rate limit. Defaults to 120 requests per minute. Set to
   * `false` to disable.
   */
  rateLimit?: { limit: number; windowMs: number } | false;
}

function readLocale(request: Request): string | null {
  const header = request.headers.get("x-kitsune-locale");
  if (header) return header;
  const url = new URL(request.url);
  return url.searchParams.get("locale");
}

function buildAdminApiKey(workspaceId: string, userId: string): VerifiedApiKey {
  return {
    id: `admin:${userId}`,
    workspaceId,
    scopes: {
      readOnly: false,
      write: true,
      schemaWrite: true,
      collectionSlugs: null,
    },
  };
}

export function createKitsuneYoga(
  options: CreateYogaOptions,
): YogaServerInstance<Record<string, unknown>, KitsuneGraphQLContext> {
  const limiter =
    options.rateLimit === false
      ? null
      : new InMemoryRateLimiter({
          limit: options.rateLimit?.limit ?? 120,
          windowMs: options.rateLimit?.windowMs ?? 60_000,
        });

  return createYoga<Record<string, unknown>, KitsuneGraphQLContext>({
    graphqlEndpoint: options.graphqlEndpoint ?? "/api/graphql",
    context: async ({ request }) => {
      const authHeader = request.headers.get("authorization");
      const parsed = parseBearerApiKey(authHeader);

      let apiKey: VerifiedApiKey | null = null;
      let isAdminSession = false;
      if (parsed) {
        apiKey = await verifyApiKey(
          options.db,
          options.apiKeyPepper,
          parsed.id,
          parsed.secret,
        );
      }

      if (!apiKey && options.allowAdmin) {
        const admin = await options.allowAdmin(request);
        if (admin) {
          apiKey = buildAdminApiKey(admin.workspaceId, admin.userId);
          isAdminSession = true;
        }
      }

      if (!apiKey) {
        throw new Response("Unauthorized", {
          status: 401,
          headers: {
            "www-authenticate":
              'Bearer realm="kitsune", error="invalid_token"',
          },
        });
      }

      if (limiter && !isAdminSession) {
        const res = limiter.check(apiKey.id);
        if (!res.allowed) {
          throw new Response("Rate limit exceeded", {
            status: 429,
            headers: {
              "retry-after": String(
                Math.max(1, Math.ceil((res.resetAt - Date.now()) / 1000)),
              ),
              "x-ratelimit-remaining": "0",
              "x-ratelimit-reset": String(Math.ceil(res.resetAt / 1000)),
            },
          });
        }
      }

      if (options.onAuthenticated) {
        await options.onAuthenticated(apiKey, request);
      }

      // Touch last_used_at asynchronously; never block a request on this.
      if (!isAdminSession) {
        void touchApiKeyUsed(options.db, apiKey.id).catch(() => {
          /* swallow */
        });
      }

      return {
        db: options.db,
        apiKey,
        workspaceId: apiKey.workspaceId,
        locale: readLocale(request),
      };
    },
    schema: async ({ context }) => {
      const ctx = context as KitsuneGraphQLContext;
      const { schema } = await buildWorkspaceSchema(options.db, ctx.workspaceId);
      return schema;
    },
    graphiql: async (request: Request) => {
      // Only expose the GraphiQL playground UI to logged-in admins.
      // Non-admin callers can still POST GraphQL documents with an API key.
      if (!options.allowAdmin) return false;
      const admin = await options.allowAdmin(request);
      if (!admin) return false;
      return {
        title: "Kitsune GraphQL",
        defaultQuery: `# Kitsune delivery API\n# Authenticated via API key or admin session.\n\nquery Health { _health }`,
        shouldPersistHeaders: true,
      };
    },
    maskedErrors: {
      isDev: process.env.NODE_ENV !== "production",
    },
    // Respect CORS for browser-based headless consumers.
    cors: {
      origin: "*",
      credentials: false,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: [
        "authorization",
        "content-type",
        "x-kitsune-locale",
      ],
    },
  });
}

export type { YogaServerInstance } from "graphql-yoga";
