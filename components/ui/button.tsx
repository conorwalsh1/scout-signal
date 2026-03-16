"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const BASE =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

const VARIANT: Record<string, string> = {
  default: "bg-foreground text-background hover:opacity-90",
  destructive: "bg-danger text-white hover:opacity-90",
  outline: "border border-border bg-background hover:bg-muted hover:text-foreground",
  secondary: "bg-muted text-muted-foreground hover:bg-muted/80",
  ghost: "hover:bg-muted hover:text-foreground",
  link: "text-foreground underline-offset-4 hover:underline",
};

const SIZE: Record<string, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3",
  lg: "h-11 rounded-md px-8",
  icon: "h-10 w-10",
};

function buttonVariants(opts: { variant?: string; size?: string; className?: string }) {
  const v = opts.variant ?? "default";
  const s = opts.size ?? "default";
  return cn(BASE, VARIANT[v] ?? VARIANT.default, SIZE[s] ?? SIZE.default, opts.className);
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANT;
  size?: keyof typeof SIZE;
  asChild?: boolean;
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const classes = buttonVariants({ variant, size, className });

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ className?: string; ref?: React.Ref<unknown> }>, {
        className: cn((children as React.ReactElement<{ className?: string }>).props?.className, classes),
        ref,
      });
    }

    return (
      <button className={classes} ref={ref} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
