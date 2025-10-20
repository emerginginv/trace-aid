import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium ring-offset-background shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:shadow-md disabled:cursor-not-allowed disabled:opacity-50 transition-shadow transition-colors duration-150 hover:border-primary/50",
          className,
        )}
        ref={ref}
        aria-invalid={props["aria-invalid"]}
        aria-describedby={props["aria-describedby"]}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
