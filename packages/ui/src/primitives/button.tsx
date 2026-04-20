import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../lib/cn.ts";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium",
    "transition-[background,color,border-color,transform,box-shadow] duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]",
    "disabled:pointer-events-none disabled:opacity-55",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-[var(--sea-ink)] text-[var(--paper)] shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_6px_16px_rgba(16,51,58,0.22)] hover:-translate-y-[1px] hover:bg-[color-mix(in_oklab,var(--sea-ink)_82%,var(--ember)_18%)]",
        destructive:
          "bg-[var(--destructive)] text-[var(--destructive-foreground)] shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_6px_16px_rgba(184,74,58,0.22)] hover:-translate-y-[1px] hover:bg-[color-mix(in_oklab,var(--destructive)_88%,black_12%)]",
        outline:
          "border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--sea-ink)] backdrop-blur-sm hover:border-[var(--sea-ink)] hover:bg-[var(--link-bg-hover)]",
        secondary:
          "border border-[var(--line)] bg-[color-mix(in_oklab,var(--surface-strong)_84%,var(--lagoon)_6%)] text-[var(--sea-ink)] hover:border-[var(--lagoon-deep)]",
        ghost:
          "text-[var(--sea-ink-soft)] hover:bg-[color-mix(in_oklab,var(--sea-ink)_5%,transparent)] hover:text-[var(--sea-ink)]",
        link: "text-[var(--lagoon-deep)] underline-offset-4 hover:underline rounded-none px-0",
        ember:
          "bg-[var(--ember)] text-[var(--paper)] shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_6px_16px_rgba(199,107,59,0.3)] hover:-translate-y-[1px] hover:bg-[var(--ember-deep)]",
      },
      size: {
        default: "h-10 px-5 text-sm",
        sm: "h-8 px-3.5 text-[12.5px]",
        lg: "h-11 px-7 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
