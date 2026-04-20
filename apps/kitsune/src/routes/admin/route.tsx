import { AdminShell, DEFAULT_NAV_ICONS } from "@kitsune/ui";
import {
  Link,
  Outlet,
  createFileRoute,
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
      renderLink={(item, children) => (
        <Link key={item.href} to={item.href} className="block">
          {children}
        </Link>
      )}
    >
      <Outlet />
    </AdminShell>
  );
}
