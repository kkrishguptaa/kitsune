import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { KitsuneDb } from "../db/client.ts";
import { type Asset, assets } from "../db/schema.ts";
import type { StorageDriver } from "../storage/driver.ts";

export interface CreateAssetInput {
  workspaceId: string;
  filename: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  alt?: string;
  body: Uint8Array | Buffer;
  createdBy: string;
}

/**
 * Upload an asset blob via the configured driver and record it in the
 * `assets` table. Returns the DB row plus the public URL.
 */
export async function uploadAsset(
  db: KitsuneDb,
  driver: StorageDriver,
  input: CreateAssetInput,
): Promise<{ asset: Asset; url: string }> {
  const id = crypto.randomUUID();
  const ext = extname(input.filename);
  const random = randomBytes(6).toString("hex");
  const key = `${id.slice(0, 2)}/${id}-${random}${ext}`;

  const { storageKey, publicUrl } = await driver.put({
    workspaceId: input.workspaceId,
    key,
    contentType: input.mime,
    body: input.body,
  });

  const [row] = await db
    .insert(assets)
    .values({
      id,
      workspaceId: input.workspaceId,
      storageKey,
      filename: input.filename,
      mime: input.mime,
      size: input.size,
      width: input.width ?? null,
      height: input.height ?? null,
      alt: input.alt ?? null,
      createdBy: input.createdBy,
    })
    .returning();
  if (!row) throw new Error("Failed to insert asset row.");
  return { asset: row, url: publicUrl };
}

export async function listAssets(
  db: KitsuneDb,
  workspaceId: string,
): Promise<Asset[]> {
  return db
    .select()
    .from(assets)
    .where(eq(assets.workspaceId, workspaceId));
}

export async function getAsset(
  db: KitsuneDb,
  workspaceId: string,
  id: string,
): Promise<Asset | null> {
  const [row] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.workspaceId, workspaceId), eq(assets.id, id)))
    .limit(1);
  return row ?? null;
}

export async function deleteAsset(
  db: KitsuneDb,
  driver: StorageDriver,
  workspaceId: string,
  id: string,
): Promise<void> {
  const existing = await getAsset(db, workspaceId, id);
  if (!existing) return;
  await driver.delete(existing.storageKey);
  await db
    .delete(assets)
    .where(and(eq(assets.workspaceId, workspaceId), eq(assets.id, id)));
}

function extname(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx < 0) return "";
  return filename.slice(idx);
}
