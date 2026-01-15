import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Note: Dialog removed - billing now initiated only from Update Details page
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Pencil, Trash2, Check, X, Download, FileSpreadsheet, FileText, CheckCircle2, XCircle, CalendarIcon, LayoutGrid, List, Clock } from "lucide-react";
import { ImportTemplateDropdown } from "@/components/ui/import-template-button";

// Note: FinanceForm removed - billing now initiated only from Update Details page
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { useOrganization } from "@/contexts/OrganizationContext";
import html2pdf from "html2pdf.js";
import { SortableTableHead } from "@/components/ui/sortable-table-head";

import { ColumnVisibility } from "@/components/ui/column-visibility";
import { useColumnVisibility, ColumnDefinition } from "@/hooks/use-column-visibility";
import { useSortPreference } from "@/hooks/use-sort-preference";
import { ExpensesPageSkeleton } from "@/components/ui/list-page-skeleton";

interface TimeEntry {
  id: string;
  case_id: string;
  date: string;
  case_title: string;
  case_number: string;
  description: string;
  hours: number | null;
  hourly_rate: number | null;
  amount: number;
  status: string | null;
  invoiced: boolean;
}

interface Case {
  id: string;
  title: string;
  case_number: string;
}

const COLUMNS: ColumnDefinition[] = [
  { key: "select", label: "Select", hideable: false },
  { key: "date", label: "Date" },
  { key: "case", label: "Case" },
  { key: "description", label: "Description" },
  { key: "hours", label: "Hours" },
  { key: "rate", label: "Rate" },
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions", hideable: false },
];

const TimeEntries = () => {
  useSetBreadcrumbs([{ label: "Time Entries" }]);
  
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  // Filter states
  const [timeSearch, setTimeSearch] = useState("");
  const [timeStatusFilter, setTimeStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  // Note: Add Time Entry removed - billing now initiated only from Update Details page
  
  // Sorting states
  const { sortColumn, sortDirection, handleSort } = useSortPreference("time-entries", "date", "desc");

  // Bulk selection state
  const [selectedTimeEntries, setSelectedTimeEntries] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Note: Add time dialog removed - billing now initiated only from Update Details page

  const { visibility, isVisible, toggleColumn, resetToDefaults } = useColumnVisibility("time-entries-columns", COLUMNS);

  // Refetch when organization changes
  useEffect(() => {
    if (organization?.id) {
      fetchTimeData();
    }
  }, [organization?.id]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedTimeEntries(new Set());
  }, [timeSearch, timeStatusFilter, dateFrom, dateTo]);

  const fetchTimeData = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      const orgId = organization.id;

      // Fetch all cases first (needed for joins and dropdown)
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select("id, title, case_number")
        .eq("organization_id", orgId)
        .order("case_number", { ascending: false });

      if (casesError) throw casesError;

      setCases(casesData || []);
      const casesMap = new Map(casesData?.map(c => [c.id, c]) || []);

      // Fetch all time entries
      const { data: timeData, error: timeError } = await supabase
        .from("case_finances")
        .select("id, case_id, date, amount, description, status, invoiced, hours, hourly_rate")
        .eq("organization_id", orgId)
        .eq("finance_type", "time")
        .order("date", { ascending: false });

      if (timeError) throw timeError;

      const formattedTimeEntries: TimeEntry[] = timeData?.map((entry: any) => {
        const caseInfo = casesMap.get(entry.case_id);
        return {
          id: entry.id,
          case_id: entry.case_id,
          date: entry.date,
          case_title: caseInfo?.title || "Unknown",
          case_number: caseInfo?.case_number || "N/A",
          description: entry.description || "",
          hours: entry.hours ? parseFloat(entry.hours) : null,
          hourly_rate: entry.hourly_rate ? parseFloat(entry.hourly_rate) : null,
          amount: parseFloat(entry.amount),
          status: entry.status,
          invoiced: entry.invoiced,
        };
      }) || [];

      setTimeEntries(formattedTimeEntries);
    } catch (error: any) {
      console.error("Error fetching time data:", error);
      toast.error("Failed to load time entry data");
    } finally {
      setLoading(false);
    }
  };

  // Filter functions
  const filteredTimeEntries = timeEntries.filter((entry) => {
    const searchLower = timeSearch.toLowerCase();
    const matchesSearch =
      entry.case_title.toLowerCase().includes(searchLower) ||
      entry.case_number.toLowerCase().includes(searchLower) ||
      entry.description.toLowerCase().includes(searchLower);
    
    const matchesStatus =
      timeStatusFilter === "all" ||
      (timeStatusFilter === "invoiced" && entry.invoiced) ||
      (timeStatusFilter === "approved" && !entry.invoiced && entry.status === "approved") ||
      (timeStatusFilter === "rejected" && entry.status === "rejected") ||
      (timeStatusFilter === "pending" && !entry.invoiced && entry.status === "pending");
    
    // Date range filter
    const entryDate = new Date(entry.date);
    const matchesDateFrom = !dateFrom || entryDate >= dateFrom;
    const matchesDateTo = !dateTo || entryDate <= dateTo;
    
    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  // Sorted data
  const sortedTimeEntries = [...filteredTimeEntries].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal: any = a[sortColumn as keyof TimeEntry];
    let bVal: any = b[sortColumn as keyof TimeEntry];
    
    if (sortColumn === "case") {
      aVal = a.case_title;
      bVal = b.case_title;
    }
    if (sortColumn === "rate") {
      aVal = a.hourly_rate;
      bVal = b.hourly_rate;
    }
    
    if (aVal == null) return sortDirection === "asc" ? 1 : -1;
    if (bVal == null) return sortDirection === "asc" ? -1 : 1;
    
    if (sortColumn === "date") {
      return sortDirection === "asc"
        ? new Date(aVal).getTime() - new Date(bVal).getTime()
        : new Date(bVal).getTime() - new Date(aVal).getTime();
    }
    
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    }
    
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "asc" 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    }
    
    return 0;
  });

  // Get pending time entries for bulk selection
  const pendingTimeEntries = sortedTimeEntries.filter(entry => entry.status === "pending" && !entry.invoiced);
  const allPendingSelected = pendingTimeEntries.length > 0 && 
    pendingTimeEntries.every(entry => selectedTimeEntries.has(entry.id));
  const somePendingSelected = pendingTimeEntries.some(entry => selectedTimeEntries.has(entry.id));

  const handleSelectAll = (checked: boolean) => {
    const newSelected = new Set(selectedTimeEntries);
    pendingTimeEntries.forEach(entry => {
      if (checked) {
        newSelected.add(entry.id);
      } else {
        newSelected.delete(entry.id);
      }
    });
    setSelectedTimeEntries(newSelected);
  };

  const handleSelectTimeEntry = (entryId: string, checked: boolean) => {
    const newSelected = new Set(selectedTimeEntries);
    if (checked) {
      newSelected.add(entryId);
    } else {
      newSelected.delete(entryId);
    }
    setSelectedTimeEntries(newSelected);
  };

  const handleBulkApprove = async () => {
    if (selectedTimeEntries.size === 0) return;
    
    setIsBulkProcessing(true);
    try {
      const ids = Array.from(selectedTimeEntries);
      const { error } = await supabase
        .from("case_finances")
        .update({ status: "approved" })
        .in("id", ids);

      if (error) throw error;

      toast.success(`${ids.length} time entr${ids.length > 1 ? 'ies' : 'y'} approved`);
      setSelectedTimeEntries(new Set());
      fetchTimeData();
    } catch (error) {
      console.error("Error approving time entries:", error);
      toast.error("Failed to approve time entries");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedTimeEntries.size === 0) return;
    
    setIsBulkProcessing(true);
    try {
      const ids = Array.from(selectedTimeEntries);
      const { error } = await supabase
        .from("case_finances")
        .update({ status: "rejected" })
        .in("id", ids);

      if (error) throw error;

      toast.success(`${ids.length} time entr${ids.length > 1 ? 'ies' : 'y'} rejected`);
      setSelectedTimeEntries(new Set());
      fetchTimeData();
    } catch (error) {
      console.error("Error rejecting time entries:", error);
      toast.error("Failed to reject time entries");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Export functions
  const exportToCSV = () => {
    const headers = ["Date", "Case Number", "Case Title", "Description", "Hours", "Rate", "Amount", "Status"];
    const rows = filteredTimeEntries.map(entry => [
      format(new Date(entry.date), "yyyy-MM-dd"),
      entry.case_number,
      entry.case_title,
      entry.description || "",
      entry.hours || "",
      entry.hourly_rate ? `$${entry.hourly_rate.toFixed(2)}` : "",
      entry.amount.toFixed(2),
      entry.invoiced ? "Invoiced" : (entry.status || "Pending")
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `time-entries-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Time entries exported to CSV");
  };

  const exportToPDF = () => {
    const totalHours = filteredTimeEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
    const printContent = document.createElement("div");
    printContent.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="margin-bottom: 8px; font-size: 24px;">Time Entries Report</h1>
        <p style="margin-bottom: 20px; color: #666; font-size: 14px;">Generated: ${format(new Date(), "MMMM d, yyyy")}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Date</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Case</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Description</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Hours</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Rate</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Amount</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTimeEntries.map(entry => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${format(new Date(entry.date), "MMM d, yyyy")}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${entry.case_number} - ${entry.case_title}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${entry.description || "-"}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${entry.hours || "-"}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${entry.hourly_rate ? `$${entry.hourly_rate.toFixed(2)}` : "-"}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${entry.amount.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${entry.invoiced ? "Invoiced" : (entry.status || "Pending")}</td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr style="background: #f3f4f6; font-weight: bold;">
              <td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: right;">Totals:</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalHours.toFixed(1)} hrs</td>
              <td style="border: 1px solid #ddd; padding: 8px;"></td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${filteredTimeEntries.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 8px;"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
    
    html2pdf()
      .set({
        margin: 10,
        filename: `time-entries-${format(new Date(), "yyyy-MM-dd")}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }
      })
      .from(printContent)
      .save();
    
    toast.success("Time entries exported to PDF");
  };

  // Note: Add time functions removed - billing now initiated only from Update Details page

  const handleDeleteTimeEntry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this time entry?")) return;
    
    try {
      const { error } = await supabase
        .from("case_finances")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Time entry deleted");
      fetchTimeData();
    } catch (error) {
      console.error("Error deleting time entry:", error);
      toast.error("Failed to delete time entry");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from("case_finances")
        .update({ status: "approved" })
        .eq("id", id);

      if (error) throw error;

      toast.success("Time entry approved");
      fetchTimeData();
    } catch (error) {
      console.error("Error approving time entry:", error);
      toast.error("Failed to approve time entry");
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from("case_finances")
        .update({ status: "rejected" })
        .eq("id", id);

      if (error) throw error;

      toast.success("Time entry rejected");
      fetchTimeData();
    } catch (error) {
      console.error("Error rejecting time entry:", error);
      toast.error("Failed to reject time entry");
    }
  };

  const getStatusBadge = (entry: TimeEntry) => {
    if (entry.invoiced) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Invoiced</span>;
    }
    switch (entry.status) {
      case "approved":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">Approved</span>;
      case "rejected":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Rejected</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Pending</span>;
    }
  };

  // Calculate summary stats
  const totalHours = timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const totalAmount = timeEntries.reduce((sum, e) => sum + e.amount, 0);
  const pendingCount = timeEntries.filter(e => e.status === "pending" && !e.invoiced).length;
  const approvedAmount = timeEntries.filter(e => e.status === "approved" && !e.invoiced).reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return <ExpensesPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Time Entries</h1>
          <p className="text-muted-foreground mt-2">
            Manage time entries across all cases
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Note: Add Time Entry button removed - billing now initiated only from Update Details page */}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Total Hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Total Amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-600">${approvedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Approved (Unbilled)</p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedTimeEntries.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedTimeEntries.size} time entr{selectedTimeEntries.size > 1 ? 'ies' : 'y'} selected
              </span>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={handleBulkApprove}
                  disabled={isBulkProcessing}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approve All
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={handleBulkReject}
                  disabled={isBulkProcessing}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject All
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setSelectedTimeEntries(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-[0.625rem] h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by case, description..."
            value={timeSearch}
            onChange={(e) => setTimeSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={timeStatusFilter} onValueChange={setTimeStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="invoiced">Invoiced</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto justify-start">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {dateFrom ? format(dateFrom, "MMM d") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto justify-start">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {dateTo ? format(dateTo, "MMM d") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
            Clear dates
          </Button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <ColumnVisibility
            columns={COLUMNS}
            visibility={visibility}
            onToggle={toggleColumn}
            onReset={resetToDefaults}
          />
          <ImportTemplateDropdown 
            options={[
              { fileName: "09_TimeEntries.csv", label: "Time Entries" }
            ]}
          />
          <Button variant="outline" size="icon" onClick={exportToCSV} title="Export CSV">
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={exportToPDF} title="Export PDF">
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Time Entries Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {isVisible("select") && (
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={allPendingSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all pending"
                      disabled={pendingTimeEntries.length === 0}
                    />
                  </TableHead>
                )}
                {isVisible("date") && (
                  <SortableTableHead
                    column="date"
                    label="Date"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("case") && (
                  <SortableTableHead
                    column="case"
                    label="Case"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("description") && (
                  <SortableTableHead
                    column="description"
                    label="Description"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("hours") && (
                  <SortableTableHead
                    column="hours"
                    label="Hours"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-right"
                  />
                )}
                {isVisible("rate") && (
                  <SortableTableHead
                    column="rate"
                    label="Rate"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-right"
                  />
                )}
                {isVisible("amount") && (
                  <SortableTableHead
                    column="amount"
                    label="Amount"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-right"
                  />
                )}
                {isVisible("status") && (
                  <SortableTableHead
                    column="status"
                    label="Status"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("actions") && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTimeEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No time entries found
                  </TableCell>
                </TableRow>
              ) : (
                sortedTimeEntries.map((entry) => (
                  <TableRow 
                    key={entry.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/time-entries/${entry.id}`)}
                  >
                    {isVisible("select") && (
                      <TableCell>
                        <Checkbox
                          checked={selectedTimeEntries.has(entry.id)}
                          onCheckedChange={(checked) => handleSelectTimeEntry(entry.id, !!checked)}
                          disabled={entry.status !== "pending" || entry.invoiced}
                          aria-label={`Select ${entry.description}`}
                        />
                      </TableCell>
                    )}
                    {isVisible("date") && (
                      <TableCell>{format(new Date(entry.date), "MMM d, yyyy")}</TableCell>
                    )}
                    {isVisible("case") && (
                      <TableCell>
                        <div className="font-medium">{entry.case_number}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{entry.case_title}</div>
                      </TableCell>
                    )}
                    {isVisible("description") && (
                      <TableCell className="max-w-[200px] truncate">{entry.description || "-"}</TableCell>
                    )}
                    {isVisible("hours") && (
                      <TableCell className="text-right">{entry.hours?.toFixed(1) || "-"}</TableCell>
                    )}
                    {isVisible("rate") && (
                      <TableCell className="text-right">
                        {entry.hourly_rate ? `$${entry.hourly_rate.toFixed(2)}` : "-"}
                      </TableCell>
                    )}
                    {isVisible("amount") && (
                      <TableCell className="text-right font-medium">
                        ${entry.amount.toFixed(2)}
                      </TableCell>
                    )}
                    {isVisible("status") && (
                      <TableCell>{getStatusBadge(entry)}</TableCell>
                    )}
                    {isVisible("actions") && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {entry.status === "pending" && !entry.invoiced && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleApprove(entry.id)}
                                className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                title="Approve"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleReject(entry.id)}
                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Reject"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTimeEntry(entry.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Note: Case Selection and Time Entry Form dialogs removed - billing now initiated only from Update Details page */}
    </div>
  );
};

export default TimeEntries;
