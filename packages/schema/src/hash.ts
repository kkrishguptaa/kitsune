import { createHash } from "node:crypto";
import type { Fields } from "./field-types.ts";

/**
 * Deterministically serialize a JSON-ish value with sorted object keys so two
 * semantically identical schemas produce the same bytes.
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(",")}}`;
}

/**
 * Stable SHA-256 hash of a fields tree. Used to key the GraphQL schema LRU
 * cache and to detect no-op schema updates.
 */
export function contentHash(fields: Fields): string {
  return createHash("sha256").update(canonicalize(fields)).digest("hex");
}

export function canonicalJson(value: unknown): string {
  return canonicalize(value);
}
