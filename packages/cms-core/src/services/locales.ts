import { and, asc, eq, ne } from "drizzle-orm";
import type { KitsuneDb } from "../db/client.ts";
import {
  type WorkspaceLocale,
  workspaceLocales,
  workspaces,
} from "../db/schema.ts";

export async function listLocales(
  db: KitsuneDb,
  workspaceId: string,
): Promise<WorkspaceLocale[]> {
  return db
    .select()
    .from(workspaceLocales)
    .where(eq(workspaceLocales.workspaceId, workspaceId))
    .orderBy(
      asc(workspaceLocales.sortOrder),
      asc(workspaceLocales.code),
    );
}

export async function addLocale(
  db: KitsuneDb,
  input: {
    workspaceId: string;
    code: string;
    label: string;
    isDefault?: boolean;
  },
): Promise<WorkspaceLocale> {
  return db.transaction(async (tx) => {
    if (input.isDefault) {
      await tx
        .update(workspaceLocales)
        .set({ isDefault: false })
        .where(eq(workspaceLocales.workspaceId, input.workspaceId));
      await tx
        .update(workspaces)
        .set({ defaultLocale: input.code })
        .where(eq(workspaces.id, input.workspaceId));
    }
    const [row] = await tx
      .insert(workspaceLocales)
      .values({
        workspaceId: input.workspaceId,
        code: input.code,
        label: input.label,
        isDefault: input.isDefault ?? false,
      })
      .onConflictDoUpdate({
        target: [workspaceLocales.workspaceId, workspaceLocales.code],
        set: {
          label: input.label,
          isDefault: input.isDefault ?? false,
        },
      })
      .returning();
    if (!row) throw new Error("Failed to upsert locale.");
    return row;
  });
}

export async function setDefaultLocale(
  db: KitsuneDb,
  workspaceId: string,
  code: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(workspaceLocales)
      .set({ isDefault: false })
      .where(
        and(
          eq(workspaceLocales.workspaceId, workspaceId),
          ne(workspaceLocales.code, code),
        ),
      );
    await tx
      .update(workspaceLocales)
      .set({ isDefault: true })
      .where(
        and(
          eq(workspaceLocales.workspaceId, workspaceId),
          eq(workspaceLocales.code, code),
        ),
      );
    await tx
      .update(workspaces)
      .set({ defaultLocale: code })
      .where(eq(workspaces.id, workspaceId));
  });
}

export async function removeLocale(
  db: KitsuneDb,
  workspaceId: string,
  code: string,
): Promise<void> {
  const [row] = await db
    .select({ isDefault: workspaceLocales.isDefault })
    .from(workspaceLocales)
    .where(
      and(
        eq(workspaceLocales.workspaceId, workspaceId),
        eq(workspaceLocales.code, code),
      ),
    )
    .limit(1);
  if (row?.isDefault) {
    throw new Error("Cannot remove the default locale.");
  }
  await db
    .delete(workspaceLocales)
    .where(
      and(
        eq(workspaceLocales.workspaceId, workspaceId),
        eq(workspaceLocales.code, code),
      ),
    );
}

export async function getDefaultLocaleCode(
  db: KitsuneDb,
  workspaceId: string,
): Promise<string> {
  const [row] = await db
    .select({ code: workspaceLocales.code })
    .from(workspaceLocales)
    .where(
      and(
        eq(workspaceLocales.workspaceId, workspaceId),
        eq(workspaceLocales.isDefault, true),
      ),
    )
    .limit(1);
  if (row) return row.code;
  const [ws] = await db
    .select({ defaultLocale: workspaces.defaultLocale })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  return ws?.defaultLocale ?? "en";
}
