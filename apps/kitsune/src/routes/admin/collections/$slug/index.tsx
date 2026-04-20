import { Button, DocumentTable } from "@kitsune/ui";
import {
  Link,
  createFileRoute,
  useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import {
  createDocumentFn,
  getCollectionFn,
  listDocumentsFn,
} from "#/server/cms-actions";

export const Route = createFileRoute("/admin/collections/$slug/")({
  loader: async ({ params }) => {
    const collection = await getCollectionFn({ data: { slug: params.slug } });
    if (!collection) return { collection: null, documents: [] };
    const documents = await listDocumentsFn({
      data: { collectionId: collection.collection.id },
    });
    return { ...collection, documents };
  },
  component: DocumentsPage,
});

function firstStringValue(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  for (const v of Object.values(data as Record<string, unknown>)) {
    if (typeof v === "string" && v) return v;
    if (
      v &&
      typeof v === "object" &&
      "_i18n" in (v as Record<string, unknown>)
    ) {
      const map = (v as { _i18n: Record<string, unknown> })._i18n;
      for (const candidate of Object.values(map)) {
        if (typeof candidate === "string" && candidate) return candidate;
      }
    }
  }
  return "";
}

function DocumentsPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  if (!data.collection) {
    return <p className="text-sm text-muted-foreground">Collection missing.</p>;
  }

  const { collection, schemaVersion, documents } = data;

  async function handleCreate(): Promise<void> {
    if (!schemaVersion) return;
    setCreating(true);
    try {
      const doc = await createDocumentFn({
        data: {
          collectionId: collection.id,
          data: {},
        },
      });
      router.navigate({
        to: "/admin/collections/$slug/$id",
        params: { slug: collection.slug, id: doc.id },
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {documents.length} document{documents.length === 1 ? "" : "s"}
        </p>
        {schemaVersion ? (
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? "Creating…" : "New document"}
          </Button>
        ) : (
          <Link
            to="/admin/collections/$slug/schema"
            params={{ slug: collection.slug }}
            className="text-sm underline"
          >
            Create schema first →
          </Link>
        )}
      </div>
      <DocumentTable
        rows={documents.map((d) => ({
          id: d.id,
          title: firstStringValue(d.data),
          status: d.status,
          updatedAt: new Date(d.updatedAt),
        }))}
        onRowClick={(id) =>
          router.navigate({
            to: "/admin/collections/$slug/$id",
            params: { slug: collection.slug, id },
          })
        }
      />
    </div>
  );
}
