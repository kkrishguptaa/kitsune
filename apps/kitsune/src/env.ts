import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    /** Used by the Sentry Vite plugin for release artifacts (optional locally). */
    SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
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
