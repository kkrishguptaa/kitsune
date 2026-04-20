import { listWorkspacesForUser } from "@kitsune/cms-core";
import { createKitsuneYoga } from "@kitsune/cms-graphql";
import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "@workos/authkit-tanstack-react-start";
import { env } from "#/env";
import { db } from "#/lib/db";

/**
 * Mount `graphql-yoga` at `/api/graphql`. Consumers authenticate with a
 * Bearer API key; admin sessions get to use GraphiQL without an API key
 * via the `allowAdmin` hook. The hook looks up the first workspace the
 * admin belongs to — good enough for MVP.
 */
const yoga = createKitsuneYoga({
  db,
  apiKeyPepper: env.API_KEY_PEPPER,
  graphqlEndpoint: "/api/graphql",
  allowAdmin: async () => {
    const auth = await getAuth();
    if (!auth.user) return null;
    const workspaces = await listWorkspacesForUser(db, auth.user.id);
    const workspace = workspaces[0];
    if (!workspace) return null;
    return { workspaceId: workspace.id, userId: auth.user.id };
  },
});

export const Route = createFileRoute("/api/graphql")({
  server: {
    handlers: {
      GET: ({ request }) => yoga.fetch(request),
      POST: ({ request }) => yoga.fetch(request),
      OPTIONS: ({ request }) => yoga.fetch(request),
    },
  },
});
