import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CaseTabSkeletonProps {
  title: string;
  subtitle?: string;
  showTable?: boolean;
  showCards?: boolean;
  rows?: number;
  columns?: number;
}

// Stagger delay utility - creates smooth wave effect
const getStaggerDelay = (index: number, baseDelay = 50) => ({
  animationDelay: `${index * baseDelay}ms`,
});

// Animated skeleton with stagger support
function StaggeredSkeleton({ 
  className, 
  delay = 0 
}: { 
  className?: string; 
  delay?: number;
}) {
  return (
    <Skeleton 
      className={cn("animate-pulse", className)}
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

export function CaseTabSkeleton({ 
  title, 
  subtitle = "Loading...",
  showTable = true,
  showCards = false,
  rows = 5,
  columns = 4
}: CaseTabSkeletonProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <StaggeredSkeleton className="h-10 w-24" delay={0} />
          <StaggeredSkeleton className="h-10 w-32" delay={50} />
        </div>
      </div>

      {/* Search/Filter Skeleton */}
      <div className="flex flex-col sm:flex-row gap-3">
        <StaggeredSkeleton className="h-10 flex-1" delay={100} />
        <StaggeredSkeleton className="h-10 w-32" delay={150} />
      </div>

      {/* Table Skeleton */}
      {showTable && (
        <div className="rounded-lg border">
          <div className="p-4 border-b bg-muted/30">
            <div className="flex gap-4">
              {Array.from({ length: columns }).map((_, i) => (
                <StaggeredSkeleton key={i} className="h-4 flex-1" delay={200 + i * 30} />
              ))}
            </div>
          </div>
          <div className="divide-y">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <div key={rowIndex} className="p-4">
                <div className="flex items-center gap-4">
                  {Array.from({ length: columns }).map((_, colIndex) => (
                    <StaggeredSkeleton 
                      key={colIndex} 
                      className={`h-5 ${colIndex === 0 ? 'w-8' : 'flex-1'}`}
                      delay={300 + rowIndex * 75 + colIndex * 25}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card Grid Skeleton */}
      {showCards && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: rows }).map((_, i) => (
            <div 
              key={i} 
              className="rounded-lg border p-4 space-y-3 animate-in fade-in"
              style={getStaggerDelay(i, 100)}
            >
              <div className="flex items-center gap-3">
                <StaggeredSkeleton className="h-12 w-12 rounded-full" delay={i * 100} />
                <div className="flex-1 space-y-2">
                  <StaggeredSkeleton className="h-4 w-3/4" delay={i * 100 + 30} />
                  <StaggeredSkeleton className="h-3 w-1/2" delay={i * 100 + 60} />
                </div>
              </div>
              <StaggeredSkeleton className="h-20 w-full" delay={i * 100 + 90} />
              <div className="flex gap-2">
                <StaggeredSkeleton className="h-6 w-16" delay={i * 100 + 120} />
                <StaggeredSkeleton className="h-6 w-16" delay={i * 100 + 150} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CalendarTabSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Calendar</h2>
          <p className="text-muted-foreground">Loading events...</p>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between bg-card border rounded-lg p-4">
        <StaggeredSkeleton className="h-10 w-10" delay={0} />
        <StaggeredSkeleton className="h-6 w-36" delay={50} />
        <div className="flex gap-2">
          <StaggeredSkeleton className="h-10 w-10" delay={100} />
          <StaggeredSkeleton className="h-10 w-10" delay={150} />
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 bg-muted/30">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
            <div 
              key={day} 
              className="p-2 text-center text-sm font-medium text-muted-foreground animate-in fade-in"
              style={getStaggerDelay(i, 30)}
            >
              {day}
            </div>
          ))}
        </div>
        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <div 
              key={i} 
              className="h-24 border-t border-l p-1 animate-in fade-in"
              style={getStaggerDelay(i, 15)}
            >
              <StaggeredSkeleton className="h-6 w-6 mb-1" delay={200 + i * 10} />
              {i % 4 === 0 && <StaggeredSkeleton className="h-4 w-full mb-1" delay={200 + i * 10 + 50} />}
              {i % 7 === 2 && <StaggeredSkeleton className="h-4 w-3/4" delay={200 + i * 10 + 75} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AttachmentsTabSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Attachments</h2>
          <p className="text-muted-foreground">Loading files...</p>
        </div>
        <div className="flex gap-2">
          <StaggeredSkeleton className="h-10 w-24" delay={0} />
          <StaggeredSkeleton className="h-10 w-32" delay={50} />
        </div>
      </div>

      {/* Upload Zone Skeleton */}
      <div 
        className="border-2 border-dashed rounded-lg p-8 animate-in fade-in"
        style={getStaggerDelay(1, 100)}
      >
        <div className="flex flex-col items-center gap-3">
          <StaggeredSkeleton className="h-12 w-12 rounded-full" delay={100} />
          <StaggeredSkeleton className="h-4 w-48" delay={150} />
          <StaggeredSkeleton className="h-3 w-32" delay={200} />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <StaggeredSkeleton className="h-10 flex-1" delay={250} />
        <StaggeredSkeleton className="h-10 w-32" delay={300} />
        <StaggeredSkeleton className="h-10 w-32" delay={350} />
      </div>

      {/* File List */}
      <div className="rounded-lg border divide-y">
        {Array.from({ length: 4 }).map((_, i) => (
          <div 
            key={i} 
            className="p-4 flex items-center gap-4 animate-in fade-in slide-in-from-left-2"
            style={getStaggerDelay(i, 75)}
          >
            <StaggeredSkeleton className="h-10 w-10 rounded" delay={400 + i * 75} />
            <div className="flex-1 space-y-2">
              <StaggeredSkeleton className="h-4 w-48" delay={400 + i * 75 + 25} />
              <StaggeredSkeleton className="h-3 w-24" delay={400 + i * 75 + 50} />
            </div>
            <StaggeredSkeleton className="h-6 w-16" delay={400 + i * 75 + 75} />
            <StaggeredSkeleton className="h-8 w-8" delay={400 + i * 75 + 100} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinancesTabSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <StaggeredSkeleton className="h-9 w-24" delay={0} />
        <StaggeredSkeleton className="h-9 w-20" delay={40} />
        <StaggeredSkeleton className="h-9 w-24" delay={80} />
        <StaggeredSkeleton className="h-9 w-32" delay={120} />
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Finances</h2>
          <p className="text-muted-foreground">Loading transactions...</p>
        </div>
        <div className="flex gap-2">
          <StaggeredSkeleton className="h-10 w-24" delay={160} />
          <StaggeredSkeleton className="h-10 w-32" delay={200} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div 
            key={i} 
            className="rounded-lg border p-4 space-y-2 animate-in fade-in scale-in"
            style={getStaggerDelay(i, 100)}
          >
            <StaggeredSkeleton className="h-4 w-24" delay={250 + i * 100} />
            <StaggeredSkeleton className="h-8 w-32" delay={250 + i * 100 + 50} />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <div className="p-4 border-b bg-muted/30">
          <div className="flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <StaggeredSkeleton key={i} className="h-4 flex-1" delay={500 + i * 30} />
            ))}
          </div>
        </div>
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <div 
              key={rowIndex} 
              className="p-4 flex items-center gap-4 animate-in fade-in"
              style={getStaggerDelay(rowIndex, 60)}
            >
              <StaggeredSkeleton className="h-5 flex-1" delay={600 + rowIndex * 60} />
              <StaggeredSkeleton className="h-5 flex-1" delay={600 + rowIndex * 60 + 15} />
              <StaggeredSkeleton className="h-5 flex-1" delay={600 + rowIndex * 60 + 30} />
              <StaggeredSkeleton className="h-5 w-24" delay={600 + rowIndex * 60 + 45} />
              <StaggeredSkeleton className="h-6 w-16" delay={600 + rowIndex * 60 + 60} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Finance Sub-Tab Skeletons
export function ExpensesTabSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <StaggeredSkeleton className="h-8 w-32" delay={0} />
          <StaggeredSkeleton className="h-4 w-48" delay={50} />
        </div>
        <div className="flex gap-2">
          <StaggeredSkeleton className="h-10 w-24" delay={100} />
          <StaggeredSkeleton className="h-10 w-36" delay={150} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div 
            key={i} 
            className="rounded-lg border bg-card p-4 space-y-2"
            style={getStaggerDelay(i, 80)}
          >
            <div className="flex items-center gap-2">
              <StaggeredSkeleton className="h-4 w-4 rounded" delay={200 + i * 80} />
              <StaggeredSkeleton className="h-4 w-24" delay={200 + i * 80 + 20} />
            </div>
            <StaggeredSkeleton className="h-7 w-28" delay={200 + i * 80 + 40} />
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <StaggeredSkeleton className="h-10 flex-1 max-w-sm" delay={450} />
        <StaggeredSkeleton className="h-10 w-32" delay={500} />
        <StaggeredSkeleton className="h-10 w-32" delay={550} />
        <StaggeredSkeleton className="h-10 w-10" delay={600} />
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <div className="p-3 border-b bg-muted/30">
          <div className="flex gap-4">
            {["Date", "Category", "Description", "Amount", "Status", "Actions"].map((_, i) => (
              <StaggeredSkeleton key={i} className="h-4 flex-1" delay={650 + i * 25} />
            ))}
          </div>
        </div>
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <div 
              key={rowIndex} 
              className="p-3 flex items-center gap-4"
              style={getStaggerDelay(rowIndex, 50)}
            >
              <StaggeredSkeleton className="h-5 w-20" delay={800 + rowIndex * 50} />
              <StaggeredSkeleton className="h-5 w-24" delay={800 + rowIndex * 50 + 10} />
              <StaggeredSkeleton className="h-5 flex-1" delay={800 + rowIndex * 50 + 20} />
              <StaggeredSkeleton className="h-5 w-20" delay={800 + rowIndex * 50 + 30} />
              <StaggeredSkeleton className="h-6 w-20 rounded-full" delay={800 + rowIndex * 50 + 40} />
              <StaggeredSkeleton className="h-8 w-8 rounded" delay={800 + rowIndex * 50 + 50} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TimeTabSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <StaggeredSkeleton className="h-8 w-36" delay={0} />
          <StaggeredSkeleton className="h-4 w-40" delay={50} />
        </div>
        <div className="flex gap-2">
          <StaggeredSkeleton className="h-10 w-24" delay={100} />
          <StaggeredSkeleton className="h-10 w-28" delay={150} />
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div 
            key={i} 
            className="rounded-lg border bg-card p-4"
            style={getStaggerDelay(i, 100)}
          >
            <div className="flex items-center gap-3">
              <StaggeredSkeleton className="h-10 w-10 rounded-lg" delay={200 + i * 100} />
              <div className="space-y-1">
                <StaggeredSkeleton className="h-4 w-24" delay={200 + i * 100 + 30} />
                <StaggeredSkeleton className="h-7 w-20" delay={200 + i * 100 + 60} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <StaggeredSkeleton className="h-10 flex-1 max-w-sm" delay={450} />
        <StaggeredSkeleton className="h-10 w-32" delay={500} />
        <StaggeredSkeleton className="h-10 w-10" delay={550} />
      </div>

      {/* Time Entries Table */}
      <div className="rounded-lg border">
        <div className="p-3 border-b bg-muted/30">
          <div className="flex gap-4">
            {["Date", "Description", "Hours", "Rate", "Amount", "Status", "Actions"].map((_, i) => (
              <StaggeredSkeleton key={i} className="h-4 flex-1" delay={600 + i * 25} />
            ))}
          </div>
        </div>
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <div 
              key={rowIndex} 
              className="p-3 flex items-center gap-4"
              style={getStaggerDelay(rowIndex, 50)}
            >
              <StaggeredSkeleton className="h-5 w-20" delay={750 + rowIndex * 50} />
              <StaggeredSkeleton className="h-5 flex-1" delay={750 + rowIndex * 50 + 10} />
              <StaggeredSkeleton className="h-5 w-12" delay={750 + rowIndex * 50 + 20} />
              <StaggeredSkeleton className="h-5 w-16" delay={750 + rowIndex * 50 + 30} />
              <StaggeredSkeleton className="h-5 w-20" delay={750 + rowIndex * 50 + 40} />
              <StaggeredSkeleton className="h-6 w-20 rounded-full" delay={750 + rowIndex * 50 + 50} />
              <StaggeredSkeleton className="h-8 w-8 rounded" delay={750 + rowIndex * 50 + 60} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function InvoicesTabSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <StaggeredSkeleton className="h-8 w-28" delay={0} />
          <StaggeredSkeleton className="h-4 w-24" delay={50} />
        </div>
        <StaggeredSkeleton className="h-10 w-24" delay={100} />
      </div>

      {/* Invoice Cards */}
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div 
            key={i} 
            className="rounded-lg border bg-card p-4"
            style={getStaggerDelay(i, 100)}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <StaggeredSkeleton className="h-12 w-12 rounded-lg" delay={200 + i * 100} />
                <div className="space-y-1">
                  <StaggeredSkeleton className="h-5 w-28" delay={200 + i * 100 + 25} />
                  <StaggeredSkeleton className="h-4 w-20" delay={200 + i * 100 + 50} />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right space-y-1">
                  <StaggeredSkeleton className="h-6 w-24" delay={200 + i * 100 + 75} />
                  <StaggeredSkeleton className="h-4 w-20" delay={200 + i * 100 + 100} />
                </div>
                <StaggeredSkeleton className="h-6 w-16 rounded-full" delay={200 + i * 100 + 125} />
                <StaggeredSkeleton className="h-8 w-8 rounded" delay={200 + i * 100 + 150} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CreateInvoiceTabSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <StaggeredSkeleton className="h-8 w-36" delay={0} />
        <StaggeredSkeleton className="h-4 w-64" delay={50} />
      </div>

      {/* Selection Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Time Entries Section */}
        <div 
          className="rounded-lg border bg-card p-4 space-y-4"
          style={getStaggerDelay(0, 100)}
        >
          <div className="flex items-center justify-between">
            <StaggeredSkeleton className="h-5 w-28" delay={100} />
            <StaggeredSkeleton className="h-6 w-16 rounded-full" delay={150} />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded border">
                <StaggeredSkeleton className="h-4 w-4 rounded" delay={200 + i * 40} />
                <StaggeredSkeleton className="h-4 flex-1" delay={200 + i * 40 + 15} />
                <StaggeredSkeleton className="h-4 w-16" delay={200 + i * 40 + 30} />
              </div>
            ))}
          </div>
        </div>

        {/* Expenses Section */}
        <div 
          className="rounded-lg border bg-card p-4 space-y-4"
          style={getStaggerDelay(1, 100)}
        >
          <div className="flex items-center justify-between">
            <StaggeredSkeleton className="h-5 w-24" delay={350} />
            <StaggeredSkeleton className="h-6 w-16 rounded-full" delay={400} />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded border">
                <StaggeredSkeleton className="h-4 w-4 rounded" delay={450 + i * 40} />
                <StaggeredSkeleton className="h-4 flex-1" delay={450 + i * 40 + 15} />
                <StaggeredSkeleton className="h-4 w-16" delay={450 + i * 40 + 30} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice Preview */}
      <div 
        className="rounded-lg border bg-card p-4 space-y-4"
        style={getStaggerDelay(2, 100)}
      >
        <StaggeredSkeleton className="h-5 w-32" delay={600} />
        <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
          <StaggeredSkeleton className="h-4 w-24" delay={650} />
          <StaggeredSkeleton className="h-6 w-28" delay={700} />
        </div>
        <div className="flex gap-3">
          <StaggeredSkeleton className="h-10 flex-1" delay={750} />
          <StaggeredSkeleton className="h-10 w-32" delay={800} />
        </div>
      </div>
    </div>
  );
}
