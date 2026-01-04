import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md rounded-md",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md rounded-md",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/30 shadow-sm rounded-md",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/85 shadow-sm hover:shadow-md rounded-md",
        ghost: "hover:bg-accent hover:text-accent-foreground rounded-md",
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-sm hover:shadow-md rounded-md",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm hover:shadow-md rounded-md",
      },
      size: {
        xs: "h-7 px-2 text-xs gap-1 [&_svg]:size-3",      // 28px - Compact
        sm: "h-8 px-3 text-xs gap-1.5 [&_svg]:size-3.5",  // 32px - Small
        default: "h-10 px-4 text-sm gap-2 [&_svg]:size-4", // 40px - Standard
        lg: "h-12 px-5 text-base gap-2 [&_svg]:size-5",   // 48px - Large
        icon: "h-10 w-10 [&_svg]:size-5",                  // 40px square - Icon only
        "icon-sm": "h-8 w-8 [&_svg]:size-4",               // 32px square - Small icon
        "icon-xs": "h-7 w-7 [&_svg]:size-3.5",             // 28px square - Compact icon
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

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };