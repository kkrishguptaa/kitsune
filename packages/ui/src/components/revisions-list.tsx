import type * as React from "react";
import { cn } from "../lib/cn.ts";
import { Badge } from "../primitives/badge.tsx";
import { Button } from "../primitives/button.tsx";

export interface Revision {
  revisionNumber: number;
  status: "draft" | "published";
  createdAt: Date;
  createdBy?: string | null;
}

export interface RevisionsListProps {
  revisions: readonly Revision[];
  onRevert: (revisionNumber: number) => void;
  className?: string;
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function RevisionsList({
  revisions,
  onRevert,
  className,
}: RevisionsListProps): React.ReactElement {
  if (revisions.length === 0) {
    return (
      <p className={cn("text-sm text-[var(--sea-ink-soft)]", className)}>
        No revisions yet.
      </p>
    );
  }
  return (
    <ul
      className={cn(
        "flex flex-col divide-y divide-[color-mix(in_oklab,var(--line)_80%,transparent)]",
        className,
      )}
    >
      {revisions.map((r) => (
        <li
          key={r.revisionNumber}
          className="flex items-center gap-3 py-2.5 text-sm"
        >
          <span className="w-10 font-mono text-[11.5px] text-[var(--sea-ink-soft)]">
            #{r.revisionNumber}
          </span>
          <Badge variant={r.status === "published" ? "lagoon" : "secondary"}>
            {r.status}
          </Badge>
          <span className="font-mono text-[11.5px] text-[var(--sea-ink-soft)]">
            {formatDate(r.createdAt)}
          </span>
          {r.createdBy ? (
            <span className="text-[12.5px] text-[var(--sea-ink-soft)]">
              by {r.createdBy}
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => onRevert(r.revisionNumber)}
          >
            Revert
          </Button>
        </li>
      ))}
    </ul>
  );
}
