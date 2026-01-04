import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";
import { cn } from "@/lib/utils";

export function HeaderProgressIndicator() {
  const { isLoading, isFetching, isMutating } = useGlobalLoading();
  const isActive = isLoading || isFetching || isMutating;

  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden",
        "transition-opacity duration-200",
        isActive ? "opacity-100" : "opacity-0"
      )}
      role="progressbar"
      aria-busy={isActive}
      aria-label="Loading"
    >
      <div className="h-full w-1/3 bg-primary animate-header-progress rounded-full" />
    </div>
  );
}
