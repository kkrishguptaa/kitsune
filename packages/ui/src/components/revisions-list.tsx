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
      <p className={cn("text-sm text-muted-foreground", className)}>
        No revisions yet.
      </p>
    );
  }
  return (
    <ul className={cn("flex flex-col divide-y", className)}>
      {revisions.map((r) => (
        <li
          key={r.revisionNumber}
          className="flex items-center gap-3 py-2 text-sm"
        >
          <span className="w-10 font-mono text-xs text-muted-foreground">
            #{r.revisionNumber}
          </span>
          <Badge variant={r.status === "published" ? "default" : "secondary"}>
            {r.status}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDate(r.createdAt)}
          </span>
          {r.createdBy ? (
            <span className="text-xs text-muted-foreground">
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
