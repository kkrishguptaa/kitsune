import type * as React from "react";
import { cn } from "../lib/cn.ts";
import { Badge } from "../primitives/badge.tsx";
import { Button } from "../primitives/button.tsx";

export interface PublishBarProps {
  status: "draft" | "published";
  publishedAt?: Date | null;
  updatedAt?: Date;
  dirty?: boolean;
  saving?: boolean;
  onSave: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onOpenRevisions?: () => void;
  className?: string;
}

function formatDate(d?: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function PublishBar({
  status,
  publishedAt,
  updatedAt,
  dirty,
  saving,
  onSave,
  onPublish,
  onUnpublish,
  onOpenRevisions,
  className,
}: PublishBarProps): React.ReactElement {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/80 p-3 shadow-sm backdrop-blur",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm">
        <Badge variant={status === "published" ? "default" : "secondary"}>
          {status}
        </Badge>
        <span className="text-muted-foreground">
          {status === "published"
            ? `Last published ${formatDate(publishedAt)}`
            : `Last edited ${formatDate(updatedAt)}`}
        </span>
        {dirty ? (
          <span className="text-xs font-medium text-amber-600">Unsaved</span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {onOpenRevisions ? (
          <Button variant="ghost" size="sm" onClick={onOpenRevisions}>
            History
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={!dirty || saving}
        >
          {saving ? "Saving…" : "Save draft"}
        </Button>
        {status === "published" ? (
          <Button variant="destructive" size="sm" onClick={onUnpublish}>
            Unpublish
          </Button>
        ) : (
          <Button size="sm" onClick={onPublish}>
            Publish
          </Button>
        )}
      </div>
    </div>
  );
}
