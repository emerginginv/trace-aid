import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface DetailPageSkeletonProps {
  className?: string;
}

// Case Detail Skeleton - Complex page with tabs and multiple sections
export function CaseDetailSkeleton({ className }: DetailPageSkeletonProps) {
  return (
    <div className={cn("space-y-6 animate-fade-in", className)} role="status" aria-label="Loading case details">
      {/* Header with back button and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-20" /> {/* Back button */}
          <Skeleton className="h-8 w-48" /> {/* Case number */}
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" /> {/* Status select */}
          <Skeleton className="h-9 w-9" /> {/* Action buttons */}
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      {/* Main content card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-64" /> {/* Title */}
              <Skeleton className="h-5 w-32" /> {/* Badge */}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
          <Skeleton className="h-20 w-full" /> {/* Description */}
        </CardContent>
      </Card>

      {/* Tabs skeleton */}
      <div className="space-y-4">
        <div className="flex gap-2 border-b pb-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
        </div>
        
        {/* Tab content skeleton */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <span className="sr-only">Loading case details...</span>
    </div>
  );
}

// Contact Detail Skeleton
export function ContactDetailSkeleton({ className }: DetailPageSkeletonProps) {
  return (
    <div className={cn("space-y-6 animate-fade-in", className)} role="status" aria-label="Loading contact details">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-20" /> {/* Back button */}
        <Skeleton className="h-9 w-32" /> {/* Edit button */}
      </div>

      {/* Main card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6" /> {/* Icon */}
            <Skeleton className="h-8 w-48" /> {/* Name */}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-5 w-40" />
              </div>
            ))}
          </div>
          
          {/* Notes section */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
      
      <span className="sr-only">Loading contact details...</span>
    </div>
  );
}

// Account Detail Skeleton
export function AccountDetailSkeleton({ className }: DetailPageSkeletonProps) {
  return (
    <div className={cn("space-y-6 animate-fade-in", className)} role="status" aria-label="Loading account details">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-20" /> {/* Back button */}
        <Skeleton className="h-9 w-32" /> {/* Edit button */}
      </div>

      {/* Main card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6" /> {/* Icon */}
            <Skeleton className="h-8 w-56" /> {/* Account name */}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-5 w-40" />
              </div>
            ))}
          </div>
          
          {/* Notes section */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Related contacts card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-36" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <span className="sr-only">Loading account details...</span>
    </div>
  );
}

// Invoice Detail Skeleton
export function InvoiceDetailSkeleton({ className }: DetailPageSkeletonProps) {
  return (
    <div className={cn("space-y-6 animate-fade-in", className)} role="status" aria-label="Loading invoice details">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-32" /> {/* Back button */}
          <Skeleton className="h-6 w-20" /> {/* Status badge */}
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" /> {/* Edit button */}
          <Skeleton className="h-9 w-32" /> {/* Export button */}
        </div>
      </div>

      {/* Invoice preview skeleton */}
      <div className="bg-card p-10 max-w-4xl mx-auto shadow-lg rounded-lg border">
        {/* Header with logo */}
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-2">
            <Skeleton className="h-9 w-36" /> {/* INVOICE title */}
            <Skeleton className="h-4 w-24" /> {/* Invoice number */}
          </div>
          <Skeleton className="h-16 w-32" /> {/* Logo */}
        </div>

        {/* From/To sections */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div className="space-y-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="h-3 w-24 ml-auto" />
            <Skeleton className="h-4 w-32 ml-auto" />
            <Skeleton className="h-4 w-28 ml-auto" />
          </div>
        </div>

        {/* Bill to */}
        <div className="mb-10 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-52" />
        </div>

        {/* Line items table */}
        <div className="mb-8 space-y-3">
          <div className="flex justify-between py-3 border-b">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex justify-between py-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-80 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex justify-between pt-2 border-t">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>
      </div>
      
      <span className="sr-only">Loading invoice details...</span>
    </div>
  );
}

// Expense Detail Skeleton
export function ExpenseDetailSkeleton({ className }: DetailPageSkeletonProps) {
  return (
    <div className={cn("space-y-6 animate-fade-in", className)} role="status" aria-label="Loading expense details">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24" /> {/* Back button */}
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" /> {/* Edit button */}
          <Skeleton className="h-9 w-24" /> {/* Delete button */}
        </div>
      </div>

      {/* Main card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-48" /> {/* Title */}
            <Skeleton className="h-6 w-20" /> {/* Badge */}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
          
          {/* Notes/Description section */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
      
      <span className="sr-only">Loading expense details...</span>
    </div>
  );
}
