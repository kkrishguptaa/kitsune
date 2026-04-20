import { and, eq } from "drizzle-orm";
import type { KitsuneDb } from "../db/client.ts";
import {
  type NewWorkspace,
  type Workspace,
  type WorkspaceMember,
  workspaceLocales,
  workspaceMembers,
  workspaces,
} from "../db/schema.ts";

export interface CreateWorkspaceInput {
  slug: string;
  name: string;
  ownerUserId: string;
  ownerEmail: string;
  defaultLocale?: string;
  workosOrganizationId?: string | null;
}

/**
 * Create a workspace and seed it with the owner, a default locale, and an
 * empty collection list. Idempotent on (slug).
 */
export async function createWorkspace(
  db: KitsuneDb,
  input: CreateWorkspaceInput,
): Promise<Workspace> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(workspaces)
      .where(eq(workspaces.slug, input.slug))
      .limit(1);

    let workspace: Workspace | undefined = existing[0];

    if (!workspace) {
      const insert: NewWorkspace = {
        slug: input.slug,
        name: input.name,
        defaultLocale: input.defaultLocale ?? "en",
        workosOrganizationId: input.workosOrganizationId ?? null,
      };
      const [created] = await tx
        .insert(workspaces)
        .values(insert)
        .returning();
      if (!created) {
        throw new Error("Failed to create workspace.");
      }
      workspace = created;
    }

    const existingLocales = await tx
      .select()
      .from(workspaceLocales)
      .where(eq(workspaceLocales.workspaceId, workspace.id))
      .limit(1);
    if (existingLocales.length === 0) {
      await tx.insert(workspaceLocales).values({
        workspaceId: workspace.id,
        code: workspace.defaultLocale,
        label: workspace.defaultLocale.toUpperCase(),
        isDefault: true,
      });
    }

    await tx
      .insert(workspaceMembers)
      .values({
        workspaceId: workspace.id,
        userId: input.ownerUserId,
        email: input.ownerEmail,
        role: "owner",
      })
      .onConflictDoNothing();

    return workspace;
  });
}

export async function listWorkspacesForUser(
  db: KitsuneDb,
  userId: string,
): Promise<Array<Workspace & { role: WorkspaceMember["role"] }>> {
  const rows = await db
    .select({
      workspace: workspaces,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(workspaces.name);
  return rows.map((row) => ({ ...row.workspace, role: row.role }));
}

export async function getWorkspaceForUser(
  db: KitsuneDb,
  workspaceId: string,
  userId: string,
): Promise<(Workspace & { role: WorkspaceMember["role"] }) | null> {
  const [row] = await db
    .select({ workspace: workspaces, role: workspaceMembers.role })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  if (!row) return null;
  return { ...row.workspace, role: row.role };
}

export async function inviteMember(
  db: KitsuneDb,
  workspaceId: string,
  input: {
    userId: string;
    email: string;
    role: WorkspaceMember["role"];
  },
): Promise<WorkspaceMember> {
  const [row] = await db
    .insert(workspaceMembers)
    .values({
      workspaceId,
      userId: input.userId,
      email: input.email,
      role: input.role,
    })
    .onConflictDoUpdate({
      target: [workspaceMembers.workspaceId, workspaceMembers.userId],
      set: { role: input.role, email: input.email },
    })
    .returning();
  if (!row) {
    throw new Error("Failed to upsert workspace member.");
  }
  return row;
}

export async function listMembers(
  db: KitsuneDb,
  workspaceId: string,
): Promise<WorkspaceMember[]> {
  return db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(workspaceMembers.createdAt);
}

export async function removeMember(
  db: KitsuneDb,
  workspaceId: string,
  userId: string,
): Promise<void> {
  await db
    .delete(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    );
}

/**
 * Role precedence helper used for authorizing admin actions.
 */
const ROLE_RANK: Record<WorkspaceMember["role"], number> = {
  owner: 3,
  admin: 2,
  editor: 1,
  viewer: 0,
};

export function canRole(
  actual: WorkspaceMember["role"],
  minimum: WorkspaceMember["role"],
): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[minimum];
}

export function requireRole(
  actual: WorkspaceMember["role"],
  minimum: WorkspaceMember["role"],
): void {
  if (!canRole(actual, minimum)) {
    throw new Error(
      `Action requires role \`${minimum}\` but member has \`${actual}\`.`,
    );
  }
}
