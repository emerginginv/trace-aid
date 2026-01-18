import { Loader2 } from "lucide-react";

/**
 * Lightweight fallback component for React.lazy suspense boundaries.
 * Used during code-split chunk loading.
 */
export function LazyLoadFallback() {
  return (
    <div className="flex items-center justify-center min-h-[200px] w-full">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Full-page fallback for route-level lazy loading.
 */
export function PageLoadFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
