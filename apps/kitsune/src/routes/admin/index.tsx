import { Link, createFileRoute } from "@tanstack/react-router";
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
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Workspace overview</h1>
        <p className="text-sm text-muted-foreground">
          {collections.length === 0
            ? "No collections yet. Start by creating one."
            : `${collections.length} collection${
                collections.length === 1 ? "" : "s"
              } in this workspace.`}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => (
          <Link
            key={c.id}
            to="/admin/collections/$slug"
            params={{ slug: c.slug }}
            className="flex flex-col gap-1 rounded-lg border p-4 transition-colors hover:bg-muted/40"
          >
            <span className="text-sm font-semibold">{c.name}</span>
            <span className="font-mono text-xs text-muted-foreground">
              /{c.slug}
            </span>
          </Link>
        ))}
        <Link
          to="/admin/collections"
          className="flex items-center justify-center rounded-lg border border-dashed p-4 text-sm text-muted-foreground transition-colors hover:bg-muted/40"
        >
          Manage collections →
        </Link>
      </div>
    </div>
  );
}
