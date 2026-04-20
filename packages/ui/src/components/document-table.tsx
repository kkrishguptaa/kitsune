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
          "rounded-lg border border-dashed border-input p-8 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        No documents yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border", className)}>
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2">Title</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer border-t hover:bg-muted/30"
              onClick={() => onRowClick?.(row.id)}
            >
              <td className="px-4 py-2 font-medium">{row.title || row.id}</td>
              <td className="px-4 py-2">
                <Badge
                  variant={row.status === "published" ? "default" : "secondary"}
                >
                  {row.status}
                </Badge>
              </td>
              <td className="px-4 py-2 text-muted-foreground">
                {formatDate(row.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
