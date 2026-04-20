import { createFileRoute } from "@tanstack/react-router";
import { handleCallbackRoute } from "@workos/authkit-tanstack-react-start";
import { createWorkspace, listWorkspacesForUser } from "@kitsune/cms-core";
import { db } from "#/lib/db";

/**
 * WorkOS AuthKit OAuth callback. On first successful sign-in, provision
 * a personal workspace for the new user (slugged by their email local
 * part) and seat them as the owner. Subsequent sign-ins just pass through
 * because `createWorkspace` is idempotent on `(slug)`.
 */
export const Route = createFileRoute("/api/auth/callback")({
  server: {
    handlers: {
      GET: handleCallbackRoute({
        onSuccess: async ({ user }) => {
          const existing = await listWorkspacesForUser(db, user.id);
          if (existing.length > 0) return;
          const localPart = user.email.split("@")[0] ?? "workspace";
          const slug = `${localPart.toLowerCase().replace(/[^a-z0-9-]+/g, "-")}-${user.id.slice(-6)}`;
          const name =
            (user.firstName ? `${user.firstName}'s workspace` : null) ??
            `${user.email}'s workspace`;
          await createWorkspace(db, {
            slug,
            name,
            ownerUserId: user.id,
            ownerEmail: user.email,
          });
        },
      }),
    },
  },
});
