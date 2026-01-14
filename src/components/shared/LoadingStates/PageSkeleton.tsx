import { Skeleton } from '@/components/ui/skeleton';
import { CardGridSkeleton } from './CardSkeleton';
import { TableSkeleton } from './TableSkeleton';

interface PageSkeletonProps {
  /** Page variant determines the layout */
  variant?: 'list' | 'detail' | 'dashboard' | 'form';
}

/**
 * Full page skeleton loaders for different page types.
 * 
 * @example
 * if (loading) return <PageSkeleton variant="list" />;
 */
export function PageSkeleton({ variant = 'list' }: PageSkeletonProps) {
  switch (variant) {
    case 'dashboard':
      return (
        <div className="space-y-6 animate-pulse">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          
          {/* Stats cards */}
          <CardGridSkeleton count={4} columns={4} />
          
          {/* Content panels */}
          <div className="grid md:grid-cols-2 gap-6">
            <TableSkeleton rows={4} columns={3} />
            <TableSkeleton rows={4} columns={3} />
          </div>
        </div>
      );

    case 'detail':
      return (
        <div className="space-y-6 animate-pulse">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          
          {/* Info cards */}
          <CardGridSkeleton count={3} columns={3} cardProps={{ lines: 1 }} />
          
          {/* Tabs */}
          <div className="space-y-4">
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-28" />
              ))}
            </div>
            <TableSkeleton rows={6} columns={5} />
          </div>
        </div>
      );

    case 'form':
      return (
        <div className="space-y-6 animate-pulse max-w-2xl mx-auto">
          {/* Header */}
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          
          {/* Form fields */}
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      );

    case 'list':
    default:
      return (
        <div className="space-y-6 animate-pulse">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          
          {/* Table */}
          <TableSkeleton rows={8} columns={6} />
        </div>
      );
  }
}

export default PageSkeleton;
