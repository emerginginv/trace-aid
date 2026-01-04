import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles - 40px height (h-10) for consistency with buttons
          "flex h-10 w-full rounded-md border bg-background px-3 py-2",
          // Typography
          "text-sm font-normal placeholder:text-muted-foreground",
          // Border & Focus states
          "border-input ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          // Transitions
          "transition-all duration-fast",
          // Hover state
          "hover:border-primary/40",
          // Error state
          error && "border-destructive focus-visible:ring-destructive",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50",
          // File input styling
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className,
        )}
        ref={ref}
        aria-invalid={error || props["aria-invalid"]}
        aria-describedby={props["aria-describedby"]}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };