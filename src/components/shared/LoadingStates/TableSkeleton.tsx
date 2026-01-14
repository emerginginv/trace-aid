import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TableSkeletonProps {
  /** Number of rows to display */
  rows?: number;
  /** Number of columns to display */
  columns?: number;
  /** Whether to show a header row */
  showHeader?: boolean;
  /** Whether to wrap in a Card */
  withCard?: boolean;
}

/**
 * A reusable skeleton loader for tables.
 * 
 * @example
 * <TableSkeleton rows={5} columns={4} />
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  withCard = true,
}: TableSkeletonProps) {
  const tableContent = (
    <Table>
      {showHeader && (
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
      )}
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <TableCell key={colIndex}>
                <Skeleton 
                  className="h-4" 
                  style={{ width: `${60 + Math.random() * 40}%` }} 
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (withCard) {
    return <Card>{tableContent}</Card>;
  }

  return tableContent;
}

export default TableSkeleton;
