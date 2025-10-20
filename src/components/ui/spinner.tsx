import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export function Spinner({ size = "md", className, label = "Loading" }: SpinnerProps) {
  return (
    <div className="flex items-center justify-center" role="status" aria-label={label}>
      <div
        className={cn(
          "spinner",
          {
            "spinner-sm": size === "sm",
            "spinner-lg": size === "lg",
          },
          className
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{label}...</span>
    </div>
  );
}
