import * as React from "react";
import { cn } from "../lib/cn.ts";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[10px] border border-[var(--line-strong)] bg-[var(--surface-inset)] px-3.5 py-2 text-sm text-[var(--sea-ink)]",
          "shadow-[0_1px_0_var(--inset-glint)_inset] transition-[border-color,box-shadow,background] duration-150",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-[var(--sea-ink-faint)]",
          "hover:border-[color-mix(in_oklab,var(--lagoon-deep)_35%,var(--line-strong))]",
          "focus-visible:outline-none focus-visible:border-[var(--lagoon-deep)] focus-visible:bg-[var(--surface-strong)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
