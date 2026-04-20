import {
  assertSchemaWrite,
  DestructiveChangeError,
  getCollectionBySlug,
  parseBearerApiKey,
  publishNewVersion,
  touchApiKeyUsed,
  verifyApiKey,
} from "@kitsune/cms-core";
import { clearWorkspaceSchemaCache } from "@kitsune/cms-graphql";
import type { DiffHints, Fields } from "@kitsune/schema";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { env } from "#/env";
import { db } from "#/lib/db";

const payloadSchema = z.object({
  collection: z.object({
    slug: z.string(),
    name: z.string().min(1),
    description: z.string().optional(),
  }),
  fields: z.array(z.any()).transform((v) => v as Fields),
  hints: z
    .object({
      renames: z.record(z.string(), z.string()).optional(),
      defaults: z.record(z.string(), z.unknown()).optional(),
      confirmDrops: z.array(z.string()).optional(),
      confirmRetypes: z.array(z.string()).optional(),
    })
    .optional(),
});

async function handle(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const parsedToken = parseBearerApiKey(request.headers.get("authorization"));
  if (!parsedToken) {
    return new Response("Missing API key", { status: 401 });
  }
  const apiKey = await verifyApiKey(
    db,
    env.API_KEY_PEPPER,
    parsedToken.id,
    parsedToken.secret,
  );
  if (!apiKey) {
    return new Response("Invalid API key", { status: 401 });
  }

  try {
    assertSchemaWrite(apiKey.scopes);
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid payload", issues: parsed.error.issues }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const collection = await getCollectionBySlug(
    db,
    apiKey.workspaceId,
    parsed.data.collection.slug,
  );
  if (!collection) {
    return new Response(
      JSON.stringify({
        error:
          "Collection not found. Create it through the admin UI before pushing a schema from the CLI.",
      }),
      { status: 404, headers: { "content-type": "application/json" } },
    );
  }

  try {
    const result = await publishNewVersion(db, {
      workspaceId: apiKey.workspaceId,
      collectionId: collection.id,
      nextFields: parsed.data.fields,
      hints: parsed.data.hints as DiffHints | undefined,
      createdBy: `api-key:${apiKey.id}`,
    });
    clearWorkspaceSchemaCache(apiKey.workspaceId);
    void touchApiKeyUsed(db, apiKey.id).catch(() => {
      /* fire and forget */
    });
    return new Response(
      JSON.stringify({
        ok: true,
        version: result.version.versionNumber,
        changeset: result.changeset,
      }),
      { headers: { "content-type": "application/json" } },
    );
  } catch (e) {
    if (e instanceof DestructiveChangeError) {
      return new Response(
        JSON.stringify({
          error: e.message,
          changeset: e.changeset,
        }),
        { status: 409, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/cms/schema/push")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
