import type * as React from "react";
import { cn } from "../lib/cn.ts";
import { Badge } from "../primitives/badge.tsx";

export interface DocumentRow {
  id: string;
  title: string;
  status: "draft" | "published";
  updatedAt: Date;
}

export interface DocumentTableProps {
  rows: DocumentRow[];
  onRowClick?: (id: string) => void;
  className?: string;
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function DocumentTable({
  rows,
  onRowClick,
  className,
}: DocumentTableProps): React.ReactElement {
  if (rows.length === 0) {
    return (
      <div
        className={cn(
          "admin-card flex flex-col items-center gap-2 border-dashed px-6 py-14 text-center",
          className,
        )}
      >
        <span className="admin-chip" data-tone="muted">
          Nothing yet
        </span>
        <p className="font-serif text-lg text-[var(--sea-ink)]">
          No documents yet.
        </p>
        <p className="max-w-sm text-sm text-[var(--sea-ink-soft)]">
          Create one to get started — it'll live here alongside its revisions.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("admin-card overflow-hidden p-0", className)}>
      <table className="w-full text-sm">
        <thead className="bg-[color-mix(in_oklab,var(--surface-strong)_80%,var(--lagoon)_4%)] text-left font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--kicker)]">
          <tr>
            <th className="px-5 py-3 font-normal">Title</th>
            <th className="px-5 py-3 font-normal">Status</th>
            <th className="px-5 py-3 font-normal">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.id}
              className={cn(
                "cursor-pointer transition-colors hover:bg-[color-mix(in_oklab,var(--lagoon)_7%,transparent)]",
                idx !== 0 &&
                  "border-t border-[color-mix(in_oklab,var(--line)_80%,transparent)]",
              )}
              onClick={() => onRowClick?.(row.id)}
            >
              <td className="px-5 py-3 font-medium text-[var(--sea-ink)]">
                {row.title || (
                  <span className="font-mono text-[12px] text-[var(--sea-ink-faint)]">
                    {row.id.slice(0, 8)}…
                  </span>
                )}
              </td>
              <td className="px-5 py-3">
                <Badge
                  variant={row.status === "published" ? "lagoon" : "secondary"}
                >
                  {row.status}
                </Badge>
              </td>
              <td className="px-5 py-3 font-mono text-[12px] text-[var(--sea-ink-soft)]">
                {formatDate(row.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
