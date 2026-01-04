import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circle" | "text";
  animated?: boolean;
}

function Skeleton({
  className,
  variant = "default",
  animated = true,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-muted",
        animated && "skeleton-animated",
        variant === "circle" && "rounded-full",
        variant === "text" && "rounded h-4",
        variant === "default" && "rounded-md",
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

// Pre-built skeleton components for common use cases

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div 
      className={cn("rounded-lg border bg-card p-6 space-y-4", className)}
      aria-label="Loading content"
      role="status"
    >
      <div className="flex items-center gap-4">
        <Skeleton variant="circle" className="h-12 w-12" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="h-4 w-3/4" />
          <Skeleton variant="text" className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" className="h-4 w-full" />
        <Skeleton variant="text" className="h-4 w-5/6" />
        <Skeleton variant="text" className="h-4 w-4/6" />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

function SkeletonAvatar({ 
  size = "md" 
}: { 
  size?: "sm" | "md" | "lg" | "xl" 
}) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
    xl: "h-20 w-20",
  };

  return (
    <Skeleton 
      variant="circle" 
      className={sizes[size]} 
      aria-label="Loading avatar"
    />
  );
}

function SkeletonText({ 
  lines = 3,
  className 
}: { 
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} role="status" aria-label="Loading text">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i}
          variant="text" 
          className="h-4" 
          style={{ width: `${Math.max(60, 100 - i * 15)}%` }}
        />
      ))}
      <span className="sr-only">Loading text content...</span>
    </div>
  );
}

function SkeletonTable({ 
  rows = 5,
  columns = 4 
}: { 
  rows?: number;
  columns?: number;
}) {
  return (
    <div 
      className="w-full border rounded-lg overflow-hidden" 
      role="status" 
      aria-label="Loading table"
    >
      {/* Header */}
      <div className="flex gap-4 p-4 border-b bg-muted/30">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton 
            key={i} 
            variant="text" 
            className="h-4 flex-1" 
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={rowIndex} 
          className={cn(
            "flex gap-4 p-4",
            rowIndex < rows - 1 && "border-b"
          )}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex}
              variant="text" 
              className="h-4 flex-1"
              style={{ 
                animationDelay: `${(rowIndex * columns + colIndex) * 50}ms` 
              }}
            />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading table data...</span>
    </div>
  );
}

function SkeletonList({ 
  items = 3,
  showAvatar = true 
}: { 
  items?: number;
  showAvatar?: boolean;
}) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading list">
      {Array.from({ length: items }).map((_, i) => (
        <div 
          key={i} 
          className="flex items-center gap-4"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {showAvatar && <SkeletonAvatar size="md" />}
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-4 w-3/4" />
            <Skeleton variant="text" className="h-3 w-1/2" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading list items...</span>
    </div>
  );
}

function SkeletonForm({ 
  fields = 4 
}: { 
  fields?: number;
}) {
  return (
    <div className="space-y-6" role="status" aria-label="Loading form">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="text" className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
      <span className="sr-only">Loading form...</span>
    </div>
  );
}

function SkeletonStats({ 
  count = 4 
}: { 
  count?: number;
}) {
  return (
    <div 
      className="grid grid-cols-2 md:grid-cols-4 gap-4" 
      role="status" 
      aria-label="Loading statistics"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
          <Skeleton variant="text" className="h-3 w-20" />
          <Skeleton variant="text" className="h-8 w-16" />
        </div>
      ))}
      <span className="sr-only">Loading statistics...</span>
    </div>
  );
}

export { 
  Skeleton, 
  SkeletonCard, 
  SkeletonAvatar, 
  SkeletonText, 
  SkeletonTable, 
  SkeletonList,
  SkeletonForm,
  SkeletonStats
};