import { Badge, Button, Input, Label } from "@kitsune/ui";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { createCollectionFn, listCollectionsFn } from "#/server/cms-actions";

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
    <>
      <header>
        <p className="admin-eyebrow mb-2">Chapter 01 · Schema</p>
        <h1 className="admin-heading">Collections</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--sea-ink-soft)]">
          Collections group documents under a shared schema. Create one, then
          shape its fields.
        </p>
      </header>

      <form
        onSubmit={handleCreate}
        className="admin-card flex flex-wrap items-end gap-4 px-5 py-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.currentTarget.value)}
            placeholder="articles"
            pattern="[a-z][a-z0-9-]*"
            required
            className="w-56 font-mono"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Display name</Label>
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
          <p className="w-full text-xs text-[var(--destructive)]">{error}</p>
        ) : null}
      </form>

      {collections.length === 0 ? (
        <div className="admin-card flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span className="admin-chip" data-tone="muted">
            Empty
          </span>
          <p className="font-serif text-lg text-[var(--sea-ink)]">
            No collections yet.
          </p>
          <p className="max-w-sm text-sm text-[var(--sea-ink-soft)]">
            Use the form above to create one — pick a URL-safe slug and a human
            display name.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c, i) => (
            <li key={c.id}>
              <Link
                to="/admin/collections/$slug"
                params={{ slug: c.slug }}
                className="admin-card group relative flex h-full flex-col gap-2 px-5 py-5 no-underline transition-all hover:-translate-y-0.5 hover:border-[var(--lagoon-deep)]"
              >
                <span
                  aria-hidden
                  className="absolute right-4 top-3 select-none font-serif text-[2.2rem] font-light italic leading-none text-[var(--line)] group-hover:text-[color-mix(in_oklab,var(--lagoon-deep)_35%,var(--line))]"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="font-serif text-[17px] font-semibold text-[var(--sea-ink)]">
                  {c.name}
                </p>
                <p className="font-mono text-[11px] text-[var(--sea-ink-soft)]">
                  /{c.slug}
                </p>
                <div className="mt-auto pt-2">
                  {c.currentSchemaVersionId ? (
                    <Badge variant="lagoon">Schema ready</Badge>
                  ) : (
                    <Badge variant="ember">No schema</Badge>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
