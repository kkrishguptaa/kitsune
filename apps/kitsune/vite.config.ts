import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    sentryTanstackStart({
      org: "withciel",
      project: "kitsune",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});

export default config;
