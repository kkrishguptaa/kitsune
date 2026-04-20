import { AdminShell, DEFAULT_NAV_ICONS } from "@kitsune/ui";
import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { requireWorkspace } from "#/server/workspace";

export const Route = createFileRoute("/admin")({
  loader: async () => {
    const { user, workspace } = await requireWorkspace();
    return { user, workspace };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { user, workspace } = Route.useLoaderData();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const nav = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: DEFAULT_NAV_ICONS.dashboard,
      active: pathname === "/admin",
    },
    {
      href: "/admin/collections",
      label: "Collections",
      icon: DEFAULT_NAV_ICONS.collections,
      active: pathname.startsWith("/admin/collections"),
    },
    {
      href: "/admin/locales",
      label: "Locales",
      icon: DEFAULT_NAV_ICONS.locales,
      active: pathname.startsWith("/admin/locales"),
    },
    {
      href: "/admin/members",
      label: "Members",
      icon: DEFAULT_NAV_ICONS.members,
      active: pathname.startsWith("/admin/members"),
    },
    {
      href: "/admin/api-keys",
      label: "API keys",
      icon: DEFAULT_NAV_ICONS.apiKeys,
      active: pathname.startsWith("/admin/api-keys"),
    },
  ];

  const userLabel =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  return (
    <AdminShell
      workspaceName={workspace.name}
      workspaceSlug={workspace.slug}
      userLabel={userLabel}
      nav={nav}
      signOutHref="/logout"
      brand={
        <Link
          to="/"
          className="flex items-center gap-2 no-underline hover:opacity-80"
        >
          <span
            aria-hidden
            className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--sea-ink)] text-[var(--sea-ink)]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              role="img"
              aria-labelledby="admin-brand-title"
            >
              <title id="admin-brand-title">Kitsune</title>
              <path
                d="M4 20L12 4L20 20"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 20L12 12L16 20"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--sea-ink)]">
            Kitsune
          </span>
        </Link>
      }
      topBar={
        <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
          {describePath(pathname)}
        </span>
      }
      renderLink={(item, children) => (
        <Link key={item.href} to={item.href} className="block no-underline">
          {children}
        </Link>
      )}
    >
      <Outlet />
    </AdminShell>
  );
}

function describePath(pathname: string): string {
  if (pathname === "/admin") return "Overview";
  if (pathname.startsWith("/admin/collections")) return "Collections";
  if (pathname.startsWith("/admin/locales")) return "Locales";
  if (pathname.startsWith("/admin/members")) return "Members";
  if (pathname.startsWith("/admin/api-keys")) return "API keys";
  return "Admin";
}
