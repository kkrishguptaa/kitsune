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
        "sticky top-14 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[var(--line)] bg-[color-mix(in_oklab,var(--surface-strong)_88%,transparent)] px-4 py-3 backdrop-blur",
        "shadow-[0_1px_0_var(--inset-glint)_inset,0_10px_24px_rgba(16,51,58,0.06)]",
        className,
      )}
    >
      <div className="flex items-center gap-3 text-sm">
        <Badge variant={status === "published" ? "lagoon" : "secondary"}>
          {status}
        </Badge>
        <span className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-[var(--sea-ink-soft)]">
          {status === "published"
            ? `Published ${formatDate(publishedAt)}`
            : `Edited ${formatDate(updatedAt)}`}
        </span>
        {dirty ? (
          <span className="admin-chip" data-tone="ember">
            Unsaved
          </span>
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
          <Button variant="ember" size="sm" onClick={onPublish}>
            Publish
          </Button>
        )}
      </div>
    </div>
  );
}
