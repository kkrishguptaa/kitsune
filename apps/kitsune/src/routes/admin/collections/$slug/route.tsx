import { Badge } from "@kitsune/ui";
import {
  createFileRoute,
  Link,
  notFound,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { getCollectionFn } from "#/server/cms-actions";

export const Route = createFileRoute("/admin/collections/$slug")({
  loader: async ({ params }) => {
    const data = await getCollectionFn({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  component: CollectionShell,
});

function CollectionShell() {
  const { collection, schemaVersion } = Route.useLoaderData();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const base = `/admin/collections/${collection.slug}`;
  const tabs = [
    { href: base, label: "Documents", active: pathname === base },
    {
      href: `${base}/schema`,
      label: "Schema",
      active: pathname.endsWith("/schema"),
    },
  ];

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to="/admin/collections"
            className="admin-eyebrow mb-2 inline-flex items-center gap-2 no-underline text-[var(--lagoon-deep)]"
          >
            ← Collections
          </Link>
          <h1 className="admin-heading">{collection.name}</h1>
          <p className="mt-1 font-mono text-[12px] text-[var(--sea-ink-soft)]">
            /{collection.slug}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {schemaVersion ? (
            <Badge variant="lagoon">v{schemaVersion.versionNumber}</Badge>
          ) : (
            <Badge variant="ember">No schema</Badge>
          )}
        </div>
      </header>

      <nav className="flex gap-1 border-b border-[var(--line)]">
        {tabs.map((t) => (
          <Link
            key={t.href}
            to={t.href}
            className={`px-4 py-2.5 text-sm transition-colors no-underline ${
              t.active
                ? "relative font-medium text-[var(--sea-ink)] after:absolute after:inset-x-3 after:-bottom-px after:h-[2px] after:bg-[var(--ember)]"
                : "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <Outlet />
    </>
  );
}
