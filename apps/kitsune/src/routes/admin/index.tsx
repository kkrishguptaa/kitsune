import { Badge, Button } from "@kitsune/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import { listCollectionsFn } from "#/server/cms-actions";

export const Route = createFileRoute("/admin/")({
  loader: async () => {
    const collections = await listCollectionsFn();
    return { collections };
  },
  component: Dashboard,
});

function Dashboard() {
  const { collections } = Route.useLoaderData();
  const withSchema = collections.filter((c) => c.currentSchemaVersionId).length;

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="admin-eyebrow mb-2">Chapter 00 · Overview</p>
          <h1 className="admin-heading max-w-lg">
            Everything that lives inside this workspace, at a glance.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--sea-ink-soft)]">
            Collections are the only unit of content Kitsune tracks. Design
            their schema, author documents in Markdown, ship them over GraphQL.
          </p>
        </div>
        <Link to="/admin/collections" className="no-underline">
          <Button variant="outline">
            Manage collections
            <span aria-hidden>→</span>
          </Button>
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Collections" value={String(collections.length)} />
        <Stat
          label="With schema"
          value={`${withSchema} / ${collections.length || 0}`}
        />
        <Stat
          label="Uncommitted"
          value={String(collections.length - withSchema)}
          tone="ember"
        />
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="admin-eyebrow">Collections</p>
            <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
              {collections.length === 0
                ? "No collections yet. Start by creating one."
                : `${collections.length} collection${collections.length === 1 ? "" : "s"} in this workspace.`}
            </p>
          </div>
          <Link
            to="/admin/collections"
            className="text-xs font-mono uppercase tracking-[0.18em] text-[var(--lagoon-deep)] no-underline hover:text-[var(--sea-ink)]"
          >
            New collection →
          </Link>
        </div>

        {collections.length === 0 ? (
          <div className="admin-card flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="admin-chip" data-tone="ember">
              Empty atlas
            </span>
            <p className="font-serif text-xl text-[var(--sea-ink)]">
              Draw your first continent.
            </p>
            <p className="max-w-sm text-sm text-[var(--sea-ink-soft)]">
              Create a collection to define the shape of one kind of content —
              articles, releases, authors, anything.
            </p>
            <Link to="/admin/collections" className="no-underline">
              <Button>Create collection</Button>
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c, i) => (
              <li key={c.id}>
                <Link
                  to="/admin/collections/$slug"
                  params={{ slug: c.slug }}
                  className="admin-card group relative flex h-full flex-col gap-2 px-5 py-5 no-underline transition-all hover:-translate-y-0.5 hover:border-[var(--lagoon-deep)]"
                >
                  <span
                    aria-hidden
                    className="absolute right-4 top-3 select-none font-serif text-[2.6rem] font-light italic leading-none text-[var(--line)] transition-colors group-hover:text-[color-mix(in_oklab,var(--lagoon-deep)_35%,var(--line))]"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-serif text-[17px] font-semibold text-[var(--sea-ink)]">
                    {c.name}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--sea-ink-soft)]">
                    /{c.slug}
                  </span>
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
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "default" | "ember";
}) {
  return (
    <div className="admin-card flex flex-col gap-2 px-5 py-4">
      <p className="admin-eyebrow">{label}</p>
      <p
        className={
          tone === "ember"
            ? "font-serif text-3xl font-semibold text-[var(--ember-deep)]"
            : "font-serif text-3xl font-semibold text-[var(--sea-ink)]"
        }
      >
        {value}
      </p>
    </div>
  );
}
