import * as React from "react";
import { cn } from "../lib/cn.ts";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[92px] w-full rounded-[10px] border border-[var(--line-strong)] bg-[var(--surface-inset)] px-3.5 py-2.5 text-sm text-[var(--sea-ink)]",
          "shadow-[0_1px_0_var(--inset-glint)_inset] transition-[border-color,box-shadow,background] duration-150",
          "placeholder:text-[var(--sea-ink-faint)]",
          "hover:border-[color-mix(in_oklab,var(--lagoon-deep)_35%,var(--line-strong))]",
          "focus-visible:outline-none focus-visible:border-[var(--lagoon-deep)] focus-visible:bg-[var(--surface-strong)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";
