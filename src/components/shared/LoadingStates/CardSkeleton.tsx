import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface CardSkeletonProps {
  /** Whether to show a header section */
  showHeader?: boolean;
  /** Number of content lines */
  lines?: number;
  /** Card class name for custom styling */
  className?: string;
}

/**
 * A reusable skeleton loader for cards.
 * 
 * @example
 * <CardSkeleton showHeader lines={3} />
 */
export function CardSkeleton({
  showHeader = true,
  lines = 2,
  className,
}: CardSkeletonProps) {
  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </CardHeader>
      )}
      <CardContent className={!showHeader ? 'pt-6' : undefined}>
        <Skeleton className="h-7 w-20 mb-2" />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="h-3 mt-1" 
            style={{ width: `${50 + Math.random() * 30}%` }} 
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface CardGridSkeletonProps {
  /** Number of cards to display */
  count?: number;
  /** Number of columns in the grid */
  columns?: 2 | 3 | 4;
  /** Props passed to each CardSkeleton */
  cardProps?: Omit<CardSkeletonProps, 'className'>;
}

/**
 * A grid of card skeletons for loading states.
 * 
 * @example
 * <CardGridSkeleton count={4} columns={4} />
 */
export function CardGridSkeleton({
  count = 4,
  columns = 4,
  cardProps,
}: CardGridSkeletonProps) {
  const gridClass = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  }[columns];

  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} {...cardProps} />
      ))}
    </div>
  );
}

export default CardSkeleton;
