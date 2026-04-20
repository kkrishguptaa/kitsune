import { Button, Input, Label } from "@kitsune/ui";
import {
  Link,
  createFileRoute,
  useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import {
  createCollectionFn,
  listCollectionsFn,
} from "#/server/cms-actions";

export const Route = createFileRoute("/admin/collections/")({
  loader: async () => ({ collections: await listCollectionsFn() }),
  component: CollectionsPage,
});

function CollectionsPage() {
  const { collections } = Route.useLoaderData();
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createCollectionFn({ data: { slug, name } });
      setSlug("");
      setName("");
      await router.invalidate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Collections</h1>
        <p className="text-sm text-muted-foreground">
          Collections group documents under a shared schema. Create one, then
          design its fields.
        </p>
      </header>

      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-lg border p-4"
      >
        <div className="flex flex-col gap-1">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.currentTarget.value)}
            placeholder="articles"
            pattern="[a-z][a-z0-9-]*"
            required
            className="w-56"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="Articles"
            required
            className="w-56"
          />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create collection"}
        </Button>
        {error ? (
          <p className="w-full text-xs text-destructive">{error}</p>
        ) : null}
      </form>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => (
          <li key={c.id}>
            <Link
              to="/admin/collections/$slug"
              params={{ slug: c.slug }}
              className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
            >
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="font-mono text-xs text-muted-foreground">
                /{c.slug}
              </p>
              {c.currentSchemaVersionId ? null : (
                <p className="mt-1 text-xs text-amber-600">No schema yet</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
