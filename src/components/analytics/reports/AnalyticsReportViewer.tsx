import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { getReport, ReportDefinition, ReportColumn } from "@/lib/analytics/reports";
import { calculateReportTotals } from "@/lib/analytics/reports/totals";
import { executeReportQuery } from "@/lib/analytics/reports/queryBuilder";
import { TimeRange } from "@/lib/analytics/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReportFilters } from "./ReportFilters";
import { ReportTotalsBar } from "./ReportTotalsBar";
import { ReportExportMenu } from "./ReportExportMenu";

interface AnalyticsReportViewerProps {
  reportId: string;
  initialFilters?: Record<string, unknown>;
}

const PAGE_SIZES = [10, 25, 50, 100];

/**
 * Parse date range from URL JSON string
 */
function parseDateRangeFromUrl(value: string): { start?: Date; end?: Date } | undefined {
  try {
    const parsed = JSON.parse(value);
    return {
      start: parsed.start ? new Date(parsed.start) : undefined,
      end: parsed.end ? new Date(parsed.end) : undefined,
    };
  } catch {
    return undefined;
  }
}

export function AnalyticsReportViewer({ reportId, initialFilters = {} }: AnalyticsReportViewerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { organization } = useOrganization();
  
  // Get report definition
  const report = useMemo(() => getReport(reportId), [reportId]);
  
  // Parse filters from URL or use initial
  const [filters, setFilters] = useState<Record<string, unknown>>(() => {
    const urlFilters: Record<string, unknown> = {};
    searchParams.forEach((value, key) => {
      if (key !== "page" && key !== "pageSize" && key !== "sortField" && key !== "sortDir") {
        // Parse date_range as JSON
        if (key === "date_range") {
          const parsed = parseDateRangeFromUrl(value);
          if (parsed) urlFilters[key] = parsed;
        } else {
          urlFilters[key] = value;
        }
      }
    });
    return { ...initialFilters, ...urlFilters };
  });
  
  // Pagination state
  const [page, setPage] = useState(() => {
    const urlPage = searchParams.get("page");
    return urlPage ? parseInt(urlPage, 10) : 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    const urlPageSize = searchParams.get("pageSize");
    return urlPageSize ? parseInt(urlPageSize, 10) : 25;
  });
  
  // Sort state - use actual DB field for sorting
  const [sort, setSort] = useState<{ field: string; direction: "asc" | "desc" }>(() => ({
    field: searchParams.get("sortField") || report?.defaultSort.field || "created_at",
    direction: (searchParams.get("sortDir") as "asc" | "desc") || report?.defaultSort.direction || "desc",
  }));
  
  // Build time range from filters
  const timeRange = useMemo<TimeRange | undefined>(() => {
    const dateRange = filters.date_range as { start?: Date; end?: Date } | undefined;
    if (dateRange?.start && dateRange?.end) {
      return {
        type: "custom",
        start: dateRange.start,
        end: dateRange.end,
      };
    }
    return undefined;
  }, [filters]);
  
  // Sync filters to URL
  useEffect(() => {
    const newParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        if (typeof value === "object" && value !== null) {
          newParams.set(key, JSON.stringify(value));
        } else {
          newParams.set(key, String(value));
        }
      }
    });
    newParams.set("page", String(page));
    newParams.set("pageSize", String(pageSize));
    newParams.set("sortField", sort.field);
    newParams.set("sortDir", sort.direction);
    setSearchParams(newParams, { replace: true });
  }, [filters, page, pageSize, sort, setSearchParams]);
  
  // Fetch report data using queryBuilder
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ["report", reportId, organization?.id, filters, page, pageSize, sort],
    queryFn: async () => {
      if (!organization?.id || !report) return { data: [], count: 0 };
      
      return executeReportQuery(report, {
        organizationId: organization.id,
        filters,
        sort,
        page,
        pageSize,
        timeRange: timeRange ? { start: timeRange.start, end: timeRange.end } : undefined,
      });
    },
    enabled: !!organization?.id && !!report,
  });
  
  // Fetch totals separately
  const { data: totals } = useQuery({
    queryKey: ["report-totals", reportId, organization?.id, filters, timeRange],
    queryFn: async () => {
      if (!organization?.id || !report) return {};
      
      return calculateReportTotals(report, {
        filters,
        sort,
        page: 1,
        pageSize: 1000,
        organizationId: organization.id,
        timeRange,
      });
    },
    enabled: !!organization?.id && !!report,
  });
  
  // Handlers
  const handleFilterChange = useCallback((newFilters: Record<string, unknown>) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page on filter change
  }, []);
  
  const handleSort = useCallback((columnKey: string) => {
    // Find the column to get the actual sort field
    const column = report?.columns.find(c => c.key === columnKey);
    const sortField = column?.sortField || columnKey;
    
    setSort((prev) => ({
      field: sortField,
      direction: prev.field === sortField && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, [report]);
  
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);
  
  const handlePageSizeChange = useCallback((newSize: string) => {
    setPageSize(parseInt(newSize, 10));
    setPage(1);
  }, []);
  
  // Format cell value
  const formatCellValue = (column: ReportColumn, row: Record<string, unknown>): React.ReactNode => {
    const rawValue = typeof column.accessor === "function" 
      ? column.accessor(row) 
      : row[column.accessor];
    
    if (rawValue === null || rawValue === undefined) return "—";
    
    switch (column.format) {
      case "date":
        return rawValue ? format(new Date(rawValue as string), "MMM d, yyyy") : "—";
      case "datetime":
        return rawValue ? format(new Date(rawValue as string), "MMM d, yyyy h:mm a") : "—";
      case "currency":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(rawValue as number);
      case "hours":
        return `${(rawValue as number).toFixed(1)}h`;
      case "percentage":
        return `${(rawValue as number).toFixed(1)}%`;
      case "status":
        return <Badge variant="secondary" className="capitalize">{String(rawValue)}</Badge>;
      default:
        return String(rawValue);
    }
  };
  
  if (!report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Report Not Found</CardTitle>
          <CardDescription>The requested report could not be found.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  const totalPages = Math.ceil((reportData?.count || 0) / pageSize);
  
  // Check if current sort field matches column (handle both key and sortField)
  const isSortedByColumn = (column: ReportColumn): boolean => {
    const sortField = column.sortField || column.key;
    return sort.field === sortField || sort.field === column.key;
  };
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{report.name}</h1>
          <p className="text-muted-foreground">{report.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <ReportExportMenu
            report={report}
            data={reportData?.data || []}
            totals={totals || {}}
            filters={filters}
            organizationId={organization?.id}
            timeRange={timeRange ? { start: timeRange.start, end: timeRange.end } : undefined}
            sort={sort}
          />
        </div>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <ReportFilters
            config={report.filters}
            values={filters}
            onChange={handleFilterChange}
            onReset={() => handleFilterChange({})}
          />
        </CardContent>
      </Card>
      
      {/* Totals Bar */}
      {totals && Object.keys(totals).length > 0 && (
        <ReportTotalsBar totals={totals} config={report.totals} />
      )}
      
      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {report.columns.map((column) => (
                    <TableHead
                      key={column.key}
                      className={column.sortable ? "cursor-pointer hover:bg-muted/50" : ""}
                      style={{ width: column.width, textAlign: column.align }}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div className="flex items-center gap-1">
                        {column.header}
                        {column.sortable && isSortedByColumn(column) && (
                          <span className="text-xs">{sort.direction === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {report.columns.map((column) => (
                        <TableCell key={column.key}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : reportData?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={report.columns.length} className="text-center py-8 text-muted-foreground">
                      No data found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData?.data.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {report.columns.map((column) => (
                        <TableCell
                          key={column.key}
                          style={{ textAlign: column.align }}
                        >
                          {formatCellValue(column, row as Record<string, unknown>)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Showing</span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>of {reportData?.count || 0} results</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
