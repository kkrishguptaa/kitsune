import { schema } from "@kitsune/cms-core";
import { createFileRoute } from "@tanstack/react-router";
import { db } from "#/lib/db";

const { sql } = schema;

async function check(): Promise<Response> {
  try {
    await db.execute(sql`select 1`);
    return new Response(
      JSON.stringify({ ok: true, ts: new Date().toISOString() }),
      { headers: { "content-type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 503, headers: { "content-type": "application/json" } },
    );
  }
}

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: () => check(),
    },
  },
});
