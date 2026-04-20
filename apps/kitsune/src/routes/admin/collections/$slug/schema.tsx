import type { Fields } from "@kitsune/schema";
import { SchemaDesigner } from "@kitsune/ui";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { getCollectionFn, publishSchemaFn } from "#/server/cms-actions";

export const Route = createFileRoute("/admin/collections/$slug/schema")({
  loader: async ({ params }) => {
    const data = await getCollectionFn({ data: { slug: params.slug } });
    return data;
  },
  component: SchemaPage,
});

function SchemaPage() {
  const loaded = Route.useLoaderData();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loaded) return null;

  const { collection, schemaVersion } = loaded;
  const initial: Fields = (schemaVersion?.fields as Fields | undefined) ?? [];

  async function handleSave(next: Fields): Promise<void> {
    setError(null);
    setSaving(true);
    try {
      await publishSchemaFn({
        data: {
          collectionId: collection.id,
          nextFields: next,
        },
      });
      await router.invalidate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <SchemaDesigner initial={initial} onSave={handleSave} saving={saving} />
    </div>
  );
}
