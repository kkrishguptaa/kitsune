import type {
  KitsuneDb,
  VerifiedApiKey,
} from "@kitsune/cms-core";

/**
 * Context object passed to every resolver. The Yoga adapter constructs it
 * per request from the `Authorization` header.
 */
export interface KitsuneGraphQLContext {
  db: KitsuneDb;
  apiKey: VerifiedApiKey;
  /** Copied from api key for convenience. */
  workspaceId: string;
  /** Preferred locale from the `X-Kitsune-Locale` header or `?locale=`. */
  locale: string | null;
}
