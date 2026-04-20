import {
  BookOpenText,
  Boxes,
  Globe,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";
import type * as React from "react";
import { cn } from "../lib/cn.ts";

export interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  hint?: string;
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
  renderLink: (item: NavItem, children: React.ReactNode) => React.ReactNode;
  /** Optional sign-out link URL, rendered in the footer of the sidebar. */
  signOutHref?: string;
  /** Optional element rendered at the top-left (e.g. wordmark). */
  brand?: React.ReactNode;
}

export const DEFAULT_NAV_ICONS = {
  dashboard: <LayoutDashboard className="h-4 w-4" strokeWidth={1.75} />,
  collections: <BookOpenText className="h-4 w-4" strokeWidth={1.75} />,
  assets: <Boxes className="h-4 w-4" strokeWidth={1.75} />,
  locales: <Globe className="h-4 w-4" strokeWidth={1.75} />,
  members: <Users className="h-4 w-4" strokeWidth={1.75} />,
  apiKeys: <KeyRound className="h-4 w-4" strokeWidth={1.75} />,
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
  signOutHref,
  brand,
}: AdminShellProps): React.ReactElement {
  const initials =
    userLabel
      .split(/[\s@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "·";

  return (
    <div className={cn("admin-surface flex min-h-screen", className)}>
      <aside className="relative flex w-64 shrink-0 flex-col border-r border-[var(--line)] bg-[color-mix(in_oklab,var(--surface-strong)_90%,transparent)] px-4 py-5 backdrop-blur-sm">
        <div className="mb-5 flex items-center justify-between">
          {brand ?? (
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--sea-ink-soft)]">
              Kitsune
            </span>
          )}
          <span className="admin-chip" data-tone="muted">
            Atlas
          </span>
        </div>

        <div className="workspace-card mb-5 px-3.5 py-3">
          <p className="admin-eyebrow">Workspace</p>
          <p className="mt-1 font-serif text-[17px] font-semibold leading-tight text-[var(--sea-ink)]">
            {workspaceName}
          </p>
          <p className="font-mono text-[11px] text-[var(--sea-ink-soft)]">
            /{workspaceSlug}
          </p>
        </div>

        <nav className="flex flex-col gap-1 px-2">
          <p className="admin-eyebrow mb-2 px-1">Navigate</p>
          {nav.map((item) =>
            renderLink(
              item,
              <span
                className="nav-link-pill"
                data-active={item.active ? "true" : "false"}
              >
                <span
                  className={cn(
                    "shrink-0",
                    item.active
                      ? "text-[var(--sea-ink)]"
                      : "text-[var(--sea-ink-faint)]",
                  )}
                >
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.hint ? (
                  <span className="admin-kbd">{item.hint}</span>
                ) : null}
              </span>,
            ),
          )}
        </nav>

        <div className="mt-auto px-1 pt-6">
          <div className="admin-divider mb-4" />
          <div className="flex items-center gap-3 px-1">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--surface-strong)] font-mono text-[11px] text-[var(--sea-ink)]"
              aria-hidden
            >
              {initials}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="admin-eyebrow">Signed in</span>
              <span className="truncate text-[13px] text-[var(--sea-ink)]">
                {userLabel}
              </span>
            </div>
            {signOutHref ? (
              <a
                href={signOutHref}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-[var(--sea-ink-soft)] hover:border-[var(--line-strong)] hover:text-[var(--ember-deep)]"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
              </a>
            ) : null}
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--header-bg)_92%,transparent)] px-6 backdrop-blur">
          <div className="flex items-center gap-3 text-[12.5px] text-[var(--sea-ink-soft)]">
            <span className="admin-eyebrow">{workspaceSlug} ·</span>
            {topBar}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[var(--sea-ink-faint)]">
            <span>Press</span>
            <span className="admin-kbd">⌘</span>
            <span className="admin-kbd">K</span>
            <span>for quick nav</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto px-6 py-8 sm:px-10">
          <div className="mx-auto flex max-w-5xl flex-col gap-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
