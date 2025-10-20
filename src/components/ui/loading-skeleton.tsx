import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  variant?: "text" | "circle" | "card" | "table";
  className?: string;
  rows?: number;
}

export function LoadingSkeleton({ variant = "text", className, rows = 3 }: LoadingSkeletonProps) {
  if (variant === "text") {
    return (
      <div className={cn("space-y-3", className)} role="status" aria-label="Loading content">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="skeleton-text"
            style={{ width: `${100 - (i * 10)}%` }}
          />
        ))}
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (variant === "circle") {
    return (
      <div className={cn("skeleton-circle h-12 w-12", className)} role="status" aria-label="Loading">
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("card-flat space-y-4", className)} role="status" aria-label="Loading card">
        <div className="flex items-center gap-4">
          <div className="skeleton-circle h-12 w-12" />
          <div className="flex-1 space-y-2">
            <div className="skeleton-text w-3/4" />
            <div className="skeleton-text w-1/2" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="skeleton-text" />
          <div className="skeleton-text w-5/6" />
          <div className="skeleton-text w-4/6" />
        </div>
        <span className="sr-only">Loading card content...</span>
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={cn("space-y-3", className)} role="status" aria-label="Loading table">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="skeleton-text w-1/4" />
            <div className="skeleton-text w-2/4" />
            <div className="skeleton-text w-1/4" />
          </div>
        ))}
        <span className="sr-only">Loading table data...</span>
      </div>
    );
  }

  return null;
}
