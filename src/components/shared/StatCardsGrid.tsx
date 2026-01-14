import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface StatCardConfig<T extends string> {
  key: T;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  filterValue?: string;
}

interface StatCardsGridProps<T extends string> {
  stats: StatCardConfig<T>[];
  counts: Record<T, number>;
  activeFilter?: string | null;
  onStatClick?: (key: T, filterValue?: string) => void;
  isLoading?: boolean;
}

export function StatCardsGrid<T extends string>({
  stats,
  counts,
  activeFilter,
  onStatClick,
  isLoading = false,
}: StatCardsGridProps<T>) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Skeleton key={stat.key} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const isActive = activeFilter === stat.filterValue || activeFilter === stat.key;
        
        return (
          <Card
            key={stat.key}
            className={cn(
              "cursor-pointer hover:shadow-md transition-shadow",
              isActive && "ring-2 ring-primary"
            )}
            onClick={() => onStatClick?.(stat.key, stat.filterValue)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center", stat.bgColor)}>
                <Icon className={cn("h-6 w-6", stat.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts[stat.key] ?? 0}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function StatCardsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}
