import {
  type Collection,
  canRole,
  getWorkspaceForUser,
  listWorkspacesForUser,
  type Workspace,
  type WorkspaceMember,
} from "@kitsune/cms-core";
import { redirect } from "@tanstack/react-router";
import { getAuth } from "@workos/authkit-tanstack-react-start";
import { db } from "#/lib/db";

export type AuthedUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

export interface AuthedRequest {
  user: AuthedUser;
}

export async function requireUser(): Promise<AuthedUser> {
  const auth = await getAuth();
  if (!auth.user) {
    throw redirect({ href: "/login" });
  }
  return {
    id: auth.user.id,
    email: auth.user.email,
    firstName: auth.user.firstName ?? null,
    lastName: auth.user.lastName ?? null,
  };
}

export interface WorkspaceContext {
  user: AuthedUser;
  workspace: Workspace & { role: WorkspaceMember["role"] };
}

/**
 * Resolve the currently active workspace for the signed-in user. For the
 * MVP we use the first workspace returned from `listWorkspacesForUser`.
 * A future iteration can replace this with an explicit picker stored in a
 * cookie or URL segment.
 */
export async function requireWorkspace(): Promise<WorkspaceContext> {
  const user = await requireUser();
  const workspaces = await listWorkspacesForUser(db, user.id);
  if (workspaces.length === 0) {
    throw redirect({ href: "/onboarding" });
  }
  const workspace = workspaces[0]!;
  return { user, workspace };
}

export async function requireWorkspaceRole(
  minimum: WorkspaceMember["role"],
): Promise<WorkspaceContext> {
  const ctx = await requireWorkspace();
  if (!canRole(ctx.workspace.role, minimum)) {
    throw new Error(
      `This action requires at least ${minimum} role. You have ${ctx.workspace.role}.`,
    );
  }
  return ctx;
}

export async function requireWorkspaceById(
  workspaceId: string,
): Promise<WorkspaceContext> {
  const user = await requireUser();
  const workspace = await getWorkspaceForUser(db, workspaceId, user.id);
  if (!workspace) {
    throw new Error("Workspace not found or access denied.");
  }
  return { user, workspace };
}

export type { Collection };
