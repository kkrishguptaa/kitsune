import {
  BookOpenText,
  Boxes,
  Globe,
  KeyRound,
  LayoutDashboard,
  Users,
} from "lucide-react";
import type * as React from "react";
import { cn } from "../lib/cn.ts";

export interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
}

export interface AdminShellProps {
  workspaceName: string;
  workspaceSlug: string;
  userLabel: string;
  nav: readonly NavItem[];
  children: React.ReactNode;
  topBar?: React.ReactNode;
  className?: string;
  /** Rendered for each nav item so host apps can use their router's <Link>. */
  renderLink: (
    item: NavItem,
    children: React.ReactNode,
  ) => React.ReactNode;
}

export const DEFAULT_NAV_ICONS = {
  dashboard: <LayoutDashboard className="h-4 w-4" />,
  collections: <BookOpenText className="h-4 w-4" />,
  assets: <Boxes className="h-4 w-4" />,
  locales: <Globe className="h-4 w-4" />,
  members: <Users className="h-4 w-4" />,
  apiKeys: <KeyRound className="h-4 w-4" />,
} as const;

export function AdminShell({
  workspaceName,
  workspaceSlug,
  userLabel,
  nav,
  children,
  topBar,
  className,
  renderLink,
}: AdminShellProps): React.ReactElement {
  return (
    <div className={cn("flex min-h-screen bg-background", className)}>
      <aside className="flex w-60 flex-col border-r bg-muted/20 px-3 py-4">
        <div className="mb-6 px-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Workspace
          </p>
          <p className="mt-0.5 text-sm font-semibold">{workspaceName}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {workspaceSlug}
          </p>
        </div>
        <nav className="flex flex-col gap-0.5">
          {nav.map((item) =>
            renderLink(
              item,
              <span
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  item.active
                    ? "bg-foreground/10 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                )}
              >
                {item.icon}
                {item.label}
              </span>,
            ),
          )}
        </nav>
        <div className="mt-auto px-2 text-xs text-muted-foreground">
          Signed in as
          <br />
          <span className="text-foreground">{userLabel}</span>
        </div>
      </aside>
      <main className="flex flex-1 flex-col">
        {topBar ? (
          <div className="flex items-center justify-between border-b px-6 py-3">
            {topBar}
          </div>
        ) : null}
        <div className="flex-1 overflow-auto px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
