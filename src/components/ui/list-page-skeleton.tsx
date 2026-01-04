import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ListPageSkeletonProps {
  /** Number of rows to display */
  rows?: number;
  /** Column configuration for table skeleton */
  columns?: Array<{
    width?: string;
    hasIcon?: boolean;
    hasAvatar?: boolean;
    hasBadge?: boolean;
  }>;
  /** Page title for accessibility */
  title?: string;
  /** Show header section */
  showHeader?: boolean;
  /** Show filters section */
  showFilters?: boolean;
  /** Number of filter items */
  filterCount?: number;
  className?: string;
}

export function ListPageSkeleton({
  rows = 8,
  columns = [
    { width: "w-[120px]" },
    { width: "flex-1" },
    { width: "w-[100px]", hasBadge: true },
    { width: "w-[100px]" },
    { width: "w-[100px]" },
    { width: "w-[80px]" },
  ],
  title = "Loading content",
  showHeader = true,
  showFilters = true,
  filterCount = 4,
  className,
}: ListPageSkeletonProps) {
  return (
    <div 
      className={cn("space-y-6 animate-in fade-in duration-300", className)} 
      role="status" 
      aria-label={title}
    >
      {/* Page Header Skeleton */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-72" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      )}

      {/* Filters Skeleton */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 flex-1 max-w-md" />
          {Array.from({ length: filterCount - 1 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="h-10 w-[140px]"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      )}

      {/* Count Skeleton */}
      <Skeleton className="h-4 w-32" />

      {/* Table Skeleton */}
      <Card className="overflow-hidden">
        {/* Table Header */}
        <div className="flex gap-4 p-4 border-b bg-muted/30">
          {columns.map((col, i) => (
            <Skeleton 
              key={i} 
              className={cn("h-4", col.width || "flex-1")}
              style={{ animationDelay: `${i * 30}ms` }}
            />
          ))}
        </div>
        
        {/* Table Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div 
            key={rowIndex} 
            className={cn(
              "flex items-center gap-4 p-4",
              rowIndex < rows - 1 && "border-b"
            )}
          >
            {columns.map((col, colIndex) => (
              <div 
                key={colIndex} 
                className={cn("flex items-center gap-2", col.width || "flex-1")}
              >
                {col.hasAvatar && (
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                )}
                {col.hasIcon && (
                  <Skeleton className="h-4 w-4 rounded shrink-0" />
                )}
                {col.hasBadge ? (
                  <Skeleton className="h-6 w-16 rounded-full" />
                ) : (
                  <Skeleton 
                    className="h-4 flex-1"
                    style={{ 
                      animationDelay: `${(rowIndex * columns.length + colIndex) * 30}ms` 
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </Card>

      <span className="sr-only">Loading {title}...</span>
    </div>
  );
}

// Preset configurations for specific pages
export function CasesPageSkeleton() {
  return (
    <ListPageSkeleton
      title="cases"
      columns={[
        { width: "w-[120px]" },
        { width: "flex-1" },
        { width: "w-[100px]", hasBadge: true },
        { width: "w-[100px]" },
        { width: "w-[100px]" },
        { width: "w-[80px]" },
      ]}
      filterCount={5}
    />
  );
}

export function ContactsPageSkeleton() {
  return (
    <ListPageSkeleton
      title="contacts"
      columns={[
        { width: "w-[200px]", hasAvatar: true },
        { width: "flex-1" },
        { width: "w-[140px]" },
        { width: "w-[140px]" },
        { width: "w-[100px]" },
      ]}
      filterCount={3}
    />
  );
}

export function AccountsPageSkeleton() {
  return (
    <ListPageSkeleton
      title="accounts"
      columns={[
        { width: "w-[200px]", hasIcon: true },
        { width: "w-[140px]" },
        { width: "flex-1" },
        { width: "w-[140px]" },
        { width: "w-[140px]" },
        { width: "w-[100px]" },
      ]}
      filterCount={4}
    />
  );
}

export function InvoicesPageSkeleton() {
  return (
    <ListPageSkeleton
      title="invoices"
      columns={[
        { width: "w-[100px]" },
        { width: "flex-1" },
        { width: "w-[100px]" },
        { width: "w-[100px]" },
        { width: "w-[100px]" },
        { width: "w-[100px]" },
        { width: "w-[100px]" },
        { width: "w-[80px]", hasBadge: true },
        { width: "w-[100px]" },
      ]}
      filterCount={5}
    />
  );
}

export function ExpensesPageSkeleton() {
  return (
    <ListPageSkeleton
      title="expenses"
      columns={[
        { width: "w-[100px]" },
        { width: "flex-1" },
        { width: "w-[100px]" },
        { width: "w-[100px]" },
        { width: "w-[100px]" },
        { width: "w-[80px]", hasBadge: true },
        { width: "w-[80px]" },
      ]}
      filterCount={4}
    />
  );
}

export function FinancePageSkeleton() {
  return (
    <ListPageSkeleton
      title="retainer funds"
      columns={[
        { width: "flex-1" },        // Case title
        { width: "w-[120px]" },     // Case number
        { width: "w-[120px]" },     // Balance
        { width: "w-[120px]" },     // Last top-up
        { width: "w-[100px]" },     // Actions
      ]}
      filterCount={3}
    />
  );
}
