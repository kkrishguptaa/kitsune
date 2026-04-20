import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import type { KitsuneDb } from "../db/client.ts";
import { apiKeys, type ApiKeyScopes } from "../db/schema.ts";

export const apiKeyScopesSchema = z.object({
  readOnly: z.boolean().optional().default(true),
  write: z.boolean().optional().default(false),
  schemaWrite: z.boolean().optional().default(false),
  /** When null or empty, all collections are allowed. */
  collectionSlugs: z.array(z.string()).nullable().optional(),
});

export type ParsedApiKeyScopes = z.infer<typeof apiKeyScopesSchema>;

const KEY_REGEX = /^kits:([0-9a-f-]{36}):(.+)$/i;

export function parseBearerApiKey(
  authorization: string | null | undefined,
): { id: string; secret: string } | null {
  if (!authorization?.toLowerCase().startsWith("bearer ")) return null;
  const token = authorization.slice(7).trim();
  const m = KEY_REGEX.exec(token);
  if (!m) return null;
  return { id: m[1] as string, secret: m[2] as string };
}

function hashSecret(secret: string, salt: Buffer, pepper: string): Buffer {
  return scryptSync(`${pepper}:${secret}`, salt, 64);
}

export interface CreateApiKeyInput {
  workspaceId: string;
  name: string;
  scopes?: unknown;
  createdByUserId: string;
  expiresAt?: Date;
}

export interface CreateApiKeyResult {
  id: string;
  /** The full bearer token. Only returned at creation time. */
  fullKey: string;
  keyPrefix: string;
  scopes: ApiKeyScopes;
}

export async function createApiKey(
  db: KitsuneDb,
  pepper: string,
  input: CreateApiKeyInput,
): Promise<CreateApiKeyResult> {
  const scopes = apiKeyScopesSchema.parse(input.scopes ?? {});
  const id = crypto.randomUUID();
  const secret = randomBytes(24).toString("base64url");
  const salt = randomBytes(16);
  const digest = hashSecret(secret, salt, pepper);
  const keyHash = digest.toString("hex");
  const secretSalt = salt.toString("hex");
  const fullKey = `kits:${id}:${secret}`;
  const keyPrefix = `kits:${id.slice(0, 8)}…`;

  const normalized: ApiKeyScopes = {
    readOnly: scopes.readOnly ?? true,
    write: scopes.write ?? false,
    schemaWrite: scopes.schemaWrite ?? false,
    collectionSlugs: scopes.collectionSlugs ?? null,
  };

  await db.insert(apiKeys).values({
    id,
    workspaceId: input.workspaceId,
    name: input.name.trim(),
    keyPrefix,
    secretSalt,
    keyHash,
    scopes: normalized,
    createdByUserId: input.createdByUserId,
    expiresAt: input.expiresAt,
  });

  return { id, fullKey, keyPrefix, scopes: normalized };
}

export async function listApiKeys(
  db: KitsuneDb,
  workspaceId: string,
) {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      expiresAt: apiKeys.expiresAt,
      revokedAt: apiKeys.revokedAt,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.workspaceId, workspaceId))
    .orderBy(apiKeys.createdAt);
}

export async function revokeApiKey(
  db: KitsuneDb,
  workspaceId: string,
  keyId: string,
): Promise<void> {
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.workspaceId, workspaceId)));
}

export interface VerifiedApiKey {
  id: string;
  workspaceId: string;
  scopes: ApiKeyScopes;
}

export async function verifyApiKey(
  db: KitsuneDb,
  pepper: string,
  id: string,
  secret: string,
): Promise<VerifiedApiKey | null> {
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (!row) return null;

  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;

  const salt = Buffer.from(row.secretSalt, "hex");
  const expected = Buffer.from(row.keyHash, "hex");
  const actual = hashSecret(secret, salt, pepper);
  if (expected.length !== actual.length) return null;
  if (!timingSafeEqual(expected, actual)) return null;

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    scopes: row.scopes,
  };
}

export async function touchApiKeyUsed(
  db: KitsuneDb,
  keyId: string,
): Promise<void> {
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyId));
}

export function canReadCollection(
  scopes: ApiKeyScopes,
  collectionSlug: string,
): boolean {
  if (!scopes.collectionSlugs?.length) return true;
  return scopes.collectionSlugs.includes(collectionSlug);
}

export function canWriteCollection(
  scopes: ApiKeyScopes,
  collectionSlug: string,
): boolean {
  if (scopes.readOnly && !scopes.write) return false;
  return canReadCollection(scopes, collectionSlug);
}

export function assertCanMutate(scopes: ApiKeyScopes): void {
  if (scopes.readOnly && !scopes.write) {
    throw new Error("This API key is read-only.");
  }
}

export function assertSchemaWrite(scopes: ApiKeyScopes): void {
  if (!scopes.schemaWrite) {
    throw new Error(
      "This API key does not have the `schemaWrite` scope required to push schema changes.",
    );
  }
}
