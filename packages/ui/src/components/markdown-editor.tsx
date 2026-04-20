import type * as React from "react";
import MDEditor, { type MDEditorProps } from "@uiw/react-md-editor";
import { cn } from "../lib/cn.ts";

export interface MarkdownEditorProps
  extends Omit<MDEditorProps, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
  className?: string;
  id?: string;
}

/**
 * Markdown-in / Markdown-out editor for the content editor. This component
 * is intentionally not a rich-text WYSIWYG — the CMS stores plain Markdown,
 * and delivery consumers render it however they like.
 */
export function MarkdownEditor({
  value,
  onChange,
  minRows = 12,
  className,
  ...rest
}: MarkdownEditorProps): React.ReactElement {
  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background shadow-sm",
        className,
      )}
      data-color-mode="light"
    >
      <MDEditor
        value={value}
        onChange={(next) => onChange(next ?? "")}
        preview="live"
        height={minRows * 20}
        visibleDragbar={false}
        {...rest}
      />
    </div>
  );
}
