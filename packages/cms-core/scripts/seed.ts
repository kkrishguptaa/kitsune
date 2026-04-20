/**
 * Local-dev seed script. Creates a demo workspace, an `articles` collection,
 * and a published document so `pnpm dev` has content to look at.
 *
 * Usage (from repo root):
 *   pnpm --filter @kitsune/cms-core seed
 *
 * Requires DATABASE_URL to be set and migrations to have been applied.
 */
import {
  createCollection,
  createDocument,
  createWorkspace,
  getCollectionBySlug,
  getDb,
  publishNewVersion,
} from "../src/index.ts";
import type { Fields } from "@kitsune/schema";

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }
  const db = getDb(connectionString);

  const workspace = await createWorkspace(db, {
    slug: "demo",
    name: "Demo workspace",
    ownerUserId: "user_demo",
    ownerEmail: "demo@example.com",
  });

  let collection = await getCollectionBySlug(db, workspace.id, "articles");
  if (!collection) {
    collection = await createCollection(db, {
      workspaceId: workspace.id,
      slug: "articles",
      name: "Articles",
      description: "Demo blog posts.",
      createdBy: "user_demo",
    });
  }

  const fields: Fields = [
    { name: "title", type: "string", required: true, localized: true },
    { name: "slug", type: "string", required: true },
    { name: "summary", type: "text", localized: true },
    { name: "body", type: "markdown", required: true, localized: true },
  ];

  const { version } = await publishNewVersion(db, {
    workspaceId: workspace.id,
    collectionId: collection.id,
    nextFields: fields,
    createdBy: "user_demo",
  });
  console.log(`Published articles schema v${version.versionNumber}.`);

  await createDocument(db, {
    workspaceId: workspace.id,
    collectionId: collection.id,
    userId: "user_demo",
    data: {
      title: { _i18n: { en: "Hello, Kitsune" } },
      slug: "hello-kitsune",
      summary: { _i18n: { en: "A quick tour of the headless CMS." } },
      body: {
        _i18n: {
          en: "# Hello\n\nWelcome to your Kitsune workspace. Edit me in the admin UI.",
        },
      },
    },
    status: "published",
  });

  console.log("Seeded demo workspace, articles collection, and one post.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
