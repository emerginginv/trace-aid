import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Trash2, Check, X, CheckCircle2, XCircle, CalendarIcon, Clock, MoreVertical, Pencil } from "lucide-react";
import { ImportTemplateDropdown } from "@/components/ui/import-template-button";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useUserRole } from "@/hooks/useUserRole";
import html2pdf from "html2pdf.js";
import { SortableTableHead } from "@/components/ui/sortable-table-head";

import { ColumnVisibility } from "@/components/ui/column-visibility";
import { useColumnVisibility, ColumnDefinition } from "@/hooks/use-column-visibility";
import { useSortPreference } from "@/hooks/use-sort-preference";
import { ExpensesPageSkeleton } from "@/components/ui/list-page-skeleton";
import { TimeEntryEditDialog } from "@/components/time-entries/TimeEntryEditDialog";

interface TimeEntry {
  id: string;
  case_id: string;
  date: string;
  case_title: string;
  case_number: string;
  description: string;
  hours: number;
  pay_rate: number;
  pay_total: number;
  status: string;
  user_id: string;
  user_name: string | null;
}

interface Case {
  id: string;
  title: string;
  case_number: string;
}

const TimeEntries = () => {
  useSetBreadcrumbs([{ label: "Time Entries" }]);
  
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { isAdmin, isManager, isInvestigator, loading: roleLoading } = useUserRole();
  const canViewRates = isAdmin || isManager;
  
  const [loading, setLoading] = useState(true);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  
  // Filter states
  const [timeSearch, setTimeSearch] = useState("");
  const [timeStatusFilter, setTimeStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  
  // Sorting states
  const { sortColumn, sortDirection, handleSort } = useSortPreference("time-entries", "date", "desc");

  // Bulk selection state
  const [selectedTimeEntries, setSelectedTimeEntries] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Dynamic columns based on role
  const COLUMNS: ColumnDefinition[] = useMemo(() => {
    const baseColumns: ColumnDefinition[] = [
      { key: "select", label: "Select", hideable: false },
      { key: "date", label: "Date" },
      { key: "status", label: "Status" },
      { key: "case", label: "Case" },
      { key: "investigator", label: "Investigator" },
      { key: "description", label: "Description" },
      { key: "hours", label: "Hours" },
    ];
    
    // Only show pay rate/total columns to admin/manager
    if (canViewRates) {
      baseColumns.push(
        { key: "rate", label: "Pay Rate" },
        { key: "amount", label: "Pay Total" }
      );
    }
    
    baseColumns.push(
      { key: "actions", label: "Actions", hideable: false }
    );
    
    return baseColumns;
  }, [canViewRates]);

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

      // Fetch all time entries from the canonical time_entries table
      const { data: timeData, error: timeError } = await supabase
        .from("time_entries")
        .select("id, case_id, user_id, notes, hours, rate, total, status, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (timeError) throw timeError;

      // Fetch user profiles for display names
      const userIds = [...new Set((timeData || []).map(e => e.user_id))];
      let profilesMap = new Map<string, string | null>();
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        profilesMap = new Map((profilesData || []).map(p => [p.id, p.full_name]));
      }

      const formattedTimeEntries: TimeEntry[] = (timeData || []).map((entry: any) => {
        const caseInfo = casesMap.get(entry.case_id);
        return {
          id: entry.id,
          case_id: entry.case_id,
          date: entry.created_at,
          case_title: caseInfo?.title || "Unknown",
          case_number: caseInfo?.case_number || "N/A",
          description: entry.notes || "",
          hours: parseFloat(entry.hours) || 0,
          pay_rate: parseFloat(entry.rate) || 0,
          pay_total: parseFloat(entry.total) || 0,
          status: entry.status || "draft",
          user_id: entry.user_id,
          user_name: profilesMap.get(entry.user_id) || null,
        };
      });

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
      entry.description.toLowerCase().includes(searchLower) ||
      (entry.user_name?.toLowerCase().includes(searchLower) ?? false);
    
    const matchesStatus =
      timeStatusFilter === "all" ||
      (timeStatusFilter === "pending" && (entry.status === "pending" || entry.status === "draft")) ||
      (timeStatusFilter === "approved" && entry.status === "approved") ||
      (timeStatusFilter === "declined" && (entry.status === "declined" || entry.status === "rejected")) ||
      (timeStatusFilter === "paid" && entry.status === "paid");
    
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
      aVal = a.pay_rate;
      bVal = b.pay_rate;
    }
    if (sortColumn === "amount") {
      aVal = a.pay_total;
      bVal = b.pay_total;
    }
    if (sortColumn === "investigator") {
      aVal = a.user_name || "";
      bVal = b.user_name || "";
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
  const pendingTimeEntries = sortedTimeEntries.filter(entry => entry.status === "pending" || entry.status === "draft");
  const allPendingSelected = pendingTimeEntries.length > 0 && 
    pendingTimeEntries.every(entry => selectedTimeEntries.has(entry.id));

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
        .from("time_entries")
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
        .from("time_entries")
        .update({ status: "declined" })
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

  // Export functions - only include rate/amount if user can view them
  const exportToCSV = () => {
    const headers = ["Date", "Case Number", "Case Title", "Investigator", "Description", "Hours"];
    if (canViewRates) {
      headers.push("Pay Rate", "Pay Total");
    }
    headers.push("Status");
    
    const rows = filteredTimeEntries.map(entry => {
      const row = [
        format(new Date(entry.date), "yyyy-MM-dd"),
        entry.case_number,
        entry.case_title,
        entry.user_name || "Unknown",
        entry.description || "",
        entry.hours?.toFixed(1) || "",
      ];
      if (canViewRates) {
        row.push(
          entry.pay_rate ? `$${entry.pay_rate.toFixed(2)}` : "",
          entry.pay_total.toFixed(2)
        );
      }
      row.push(entry.status);
      return row;
    });
    
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
    const totalPayTotal = filteredTimeEntries.reduce((sum, e) => sum + e.pay_total, 0);
    
    const rateHeaders = canViewRates ? `
      <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Pay Rate</th>
      <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Pay Total</th>
    ` : '';
    
    const rateTotals = canViewRates ? `
      <td style="border: 1px solid #ddd; padding: 8px;"></td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${totalPayTotal.toFixed(2)}</td>
    ` : '';
    
    const printContent = document.createElement("div");
    printContent.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="margin-bottom: 8px; font-size: 24px;">Time Entries Report</h1>
        <p style="margin-bottom: 4px; color: #666; font-size: 14px;">Internal cost tracking for investigator compensation</p>
        <p style="margin-bottom: 20px; color: #666; font-size: 14px;">Generated: ${format(new Date(), "MMMM d, yyyy")}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Date</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Case</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Investigator</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Description</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Hours</th>
              ${rateHeaders}
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTimeEntries.map(entry => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${format(new Date(entry.date), "MMM d, yyyy")}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${entry.case_number} - ${entry.case_title}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${entry.user_name || "Unknown"}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${entry.description || "-"}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${entry.hours?.toFixed(1) || "-"}</td>
                ${canViewRates ? `
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${entry.pay_rate ? `$${entry.pay_rate.toFixed(2)}` : "-"}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${entry.pay_total.toFixed(2)}</td>
                ` : ''}
                <td style="border: 1px solid #ddd; padding: 8px;">${entry.status}</td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr style="background: #f3f4f6; font-weight: bold;">
              <td colspan="4" style="border: 1px solid #ddd; padding: 8px; text-align: right;">Totals:</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalHours.toFixed(1)} hrs</td>
              ${rateTotals}
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

  const handleDeleteTimeEntry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this time entry?")) return;
    
    try {
      const { error } = await supabase
        .from("time_entries")
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
        .from("time_entries")
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
        .from("time_entries")
        .update({ status: "declined" })
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
    switch (entry.status) {
      case "approved":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">Approved</span>;
      case "declined":
      case "rejected":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Declined</span>;
      case "paid":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Paid</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Pending</span>;
    }
  };

  // Calculate summary stats
  const totalHours = timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const totalPayTotal = timeEntries.reduce((sum, e) => sum + e.pay_total, 0);
  const pendingCount = timeEntries.filter(e => e.status === "pending" || e.status === "draft").length;
  const approvedPayTotal = timeEntries.filter(e => e.status === "approved").reduce((sum, e) => sum + e.pay_total, 0);

  if (loading || roleLoading) {
    return <ExpensesPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clock className="h-8 w-8" />
            Time Entries
          </h1>
          <p className="text-muted-foreground mt-2">
            Internal cost tracking for investigator compensation
          </p>
        </div>
      </div>

      {/* Stat Cards - Matching Subjects style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-blue-500/10">
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Total Hours</p>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={cn("cursor-pointer hover:shadow-md transition-shadow", timeStatusFilter === 'pending' && "ring-2 ring-primary")}
          onClick={() => setTimeStatusFilter(timeStatusFilter === 'pending' ? 'all' : 'pending')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-amber-500/10">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={cn("cursor-pointer hover:shadow-md transition-shadow", timeStatusFilter === 'approved' && "ring-2 ring-primary")}
          onClick={() => setTimeStatusFilter(timeStatusFilter === 'approved' ? 'all' : 'approved')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-emerald-500/10">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{timeEntries.filter(e => e.status === 'approved').length}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={cn("cursor-pointer hover:shadow-md transition-shadow", timeStatusFilter === 'declined' && "ring-2 ring-primary")}
          onClick={() => setTimeStatusFilter(timeStatusFilter === 'declined' ? 'all' : 'declined')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-red-500/10">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{timeEntries.filter(e => e.status === 'declined' || e.status === 'rejected').length}</p>
              <p className="text-sm text-muted-foreground">Declined</p>
            </div>
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
            placeholder="Search by case, investigator, description..."
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
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
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
          <ExportDropdown
            onExportCSV={exportToCSV}
            onExportPDF={exportToPDF}
          />
        </div>
      </div>

      {/* Entry count */}
      <div className="text-sm text-muted-foreground">
        Showing {sortedTimeEntries.length} time entr{sortedTimeEntries.length !== 1 ? 'ies' : 'y'}
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
                {isVisible("status") && (
                  <SortableTableHead
                    column="status"
                    label="Status"
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
                {isVisible("investigator") && (
                  <SortableTableHead
                    column="investigator"
                    label="Investigator"
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
                {canViewRates && isVisible("rate") && (
                  <SortableTableHead
                    column="rate"
                    label="Pay Rate"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-right"
                  />
                )}
                {canViewRates && isVisible("amount") && (
                  <SortableTableHead
                    column="amount"
                    label="Pay Total"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-right"
                  />
                )}
                {isVisible("actions") && <TableHead className="w-[60px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTimeEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canViewRates ? 10 : 8} className="text-center py-8 text-muted-foreground">
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
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedTimeEntries.has(entry.id)}
                          onCheckedChange={(checked) => handleSelectTimeEntry(entry.id, !!checked)}
                          disabled={entry.status !== "pending" && entry.status !== "draft"}
                          aria-label={`Select ${entry.description}`}
                        />
                      </TableCell>
                    )}
                    {isVisible("date") && (
                      <TableCell>{format(new Date(entry.date), "MMM d, yyyy")}</TableCell>
                    )}
                    {isVisible("status") && (
                      <TableCell>{getStatusBadge(entry)}</TableCell>
                    )}
                    {isVisible("case") && (
                      <TableCell>
                        <div className="font-medium">{entry.case_number}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{entry.case_title}</div>
                      </TableCell>
                    )}
                    {isVisible("investigator") && (
                      <TableCell>{entry.user_name || "Unknown"}</TableCell>
                    )}
                    {isVisible("description") && (
                      <TableCell className="max-w-[200px] truncate font-semibold">{entry.description || "-"}</TableCell>
                    )}
                    {isVisible("hours") && (
                      <TableCell className="text-right">{entry.hours?.toFixed(1) || "-"}</TableCell>
                    )}
                    {canViewRates && isVisible("rate") && (
                      <TableCell className="text-right">
                        {entry.pay_rate ? `$${entry.pay_rate.toFixed(2)}` : "-"}
                      </TableCell>
                    )}
                    {canViewRates && isVisible("amount") && (
                      <TableCell className="text-right font-medium">
                        ${entry.pay_total.toFixed(2)}
                      </TableCell>
                    )}
                    {isVisible("actions") && (
                      <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            <DropdownMenuItem 
                              onClick={() => {
                                setEditingEntry(entry);
                                setShowEditDialog(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {(entry.status === "pending" || entry.status === "draft") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleApprove(entry.id)}
                                  className="text-emerald-600"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleReject(entry.id)}
                                  className="text-red-600"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteTimeEntry(entry.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Time Entry Dialog */}
      <TimeEntryEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        entry={editingEntry}
        onSuccess={() => {
          fetchTimeData();
          setEditingEntry(null);
        }}
      />
    </div>
  );
};

export default TimeEntries;
