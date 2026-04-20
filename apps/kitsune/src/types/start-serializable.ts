/**
 * Allow TanStack Start's server-function serializability check to accept
 * our CMS types, which carry `Record<string, unknown>` payloads (document
 * data blobs) and `Date` values (row timestamps).
 *
 * Everything we return over a server-function boundary is JSON-serialized
 * by the runtime anyway, so it's safe to widen the compile-time check.
 */

declare module "@tanstack/router-core" {
  interface SerializableExtensions {
    unknown: unknown;
  }
}

export {};
