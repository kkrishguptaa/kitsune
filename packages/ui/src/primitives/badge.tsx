import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../lib/cn.ts";

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5",
    "font-mono text-[10.5px] uppercase tracking-[0.14em]",
    "transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border-[var(--line-strong)] bg-[var(--sea-ink)] text-[var(--paper)]",
        secondary:
          "border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink)]",
        destructive:
          "border-[color-mix(in_oklab,var(--destructive)_60%,var(--line))] bg-[color-mix(in_oklab,var(--destructive)_12%,var(--surface))] text-[var(--destructive)]",
        outline:
          "border-[var(--line-strong)] bg-transparent text-[var(--sea-ink-soft)]",
        ember:
          "border-[color-mix(in_oklab,var(--ember)_45%,var(--line))] bg-[var(--ember-soft)] text-[var(--ember-deep)]",
        lagoon:
          "border-[color-mix(in_oklab,var(--lagoon-deep)_35%,var(--line))] bg-[color-mix(in_oklab,var(--lagoon)_12%,var(--surface-strong))] text-[var(--lagoon-deep)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
