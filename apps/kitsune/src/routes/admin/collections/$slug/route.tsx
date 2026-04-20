import { Badge } from "@kitsune/ui";
import {
  Link,
  Outlet,
  createFileRoute,
  notFound,
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
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{collection.name}</h1>
          <p className="font-mono text-xs text-muted-foreground">
            /{collection.slug}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {schemaVersion ? (
            <Badge variant="secondary">v{schemaVersion.versionNumber}</Badge>
          ) : (
            <Badge variant="destructive">No schema</Badge>
          )}
        </div>
      </header>
      <nav className="flex gap-2 border-b">
        {tabs.map((t) => (
          <Link
            key={t.href}
            to={t.href}
            className={`px-3 py-2 text-sm transition-colors ${
              t.active
                ? "border-b-2 border-foreground font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
