import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    /** Used by the Sentry Vite plugin for release artifacts (optional locally). */
    SENTRY_AUTH_TOKEN: z.string().min(1).optional(),

    /** Postgres connection string. Required for anything CMS-related. */
    DATABASE_URL: z.string().min(1),

    /** Pepper mixed into scrypt hashing for API-key secrets. 16+ chars. */
    API_KEY_PEPPER: z.string().min(16),

    /** WorkOS AuthKit (admin auth). */
    WORKOS_CLIENT_ID: z.string().min(1),
    WORKOS_API_KEY: z.string().min(1),
    WORKOS_REDIRECT_URI: z.url(),
    WORKOS_COOKIE_PASSWORD: z.string().min(32),

    /** Optional S3-compatible object storage for assets (R2 works). */
    S3_ENDPOINT: z.url().optional(),
    S3_REGION: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_PUBLIC_URL: z.url().optional(),
  },

  clientPrefix: "VITE_",

  client: {
    VITE_POSTHOG_KEY: z.string().min(1).optional(),
    VITE_POSTHOG_HOST: z.url().optional(),

    VITE_SENTRY_DSN: z.url().optional(),
  },

  runtimeEnv: {
    ...process.env,
    ...import.meta.env,
  },

  emptyStringAsUndefined: true,
});
