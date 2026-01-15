/**
 * CaseWorkLog Component
 * 
 * A unified timeline view that combines:
 * - Case updates (with linked activities)
 * - Time entries
 * - Expenses
 * 
 * All displayed chronologically with status indicators and filtering.
 */

import { useEffect, useState, useMemo } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Clock,
  DollarSign,
  FileText,
  Filter,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  Link2,
  Receipt,
  TrendingUp,
  Download,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, parseISO } from "date-fns";
import { RichTextDisplay } from "@/components/ui/rich-text-display";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";

// Types for unified work log entries
type WorkLogEntryType = "update" | "time" | "expense";

interface WorkLogEntry {
  id: string;
  type: WorkLogEntryType;
  date: string;
  title: string;
  description: string | null;
  amount: number | null;
  hours: number | null;
  status: string | null;
  createdBy: string;
  createdByName: string;
  linkedActivityTitle: string | null;
  linkedActivityId: string | null;
  updateType: string | null;
  category: string | null;
  isAiSummary: boolean;
  rawData: any;
}

interface CaseWorkLogProps {
  caseId: string;
  isClosedCase?: boolean;
}

const ENTRY_TYPE_ICONS: Record<WorkLogEntryType, React.ElementType> = {
  update: FileText,
  time: Clock,
  expense: DollarSign,
};

const ENTRY_TYPE_COLORS: Record<WorkLogEntryType, string> = {
  update: "bg-blue-500/10 text-blue-600 border-blue-200",
  time: "bg-green-500/10 text-green-600 border-green-200",
  expense: "bg-orange-500/10 text-orange-600 border-orange-200",
};

export function CaseWorkLog({ caseId, isClosedCase = false }: CaseWorkLogProps) {
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<WorkLogEntry[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Fetch all data
  useEffect(() => {
    if (!organization?.id) return;
    fetchWorkLogData();
  }, [caseId, organization?.id]);

  const fetchWorkLogData = async () => {
    setLoading(true);
    try {
      // Fetch updates
      const { data: updates, error: updatesError } = await supabase
        .from("case_updates")
        .select(`
          id,
          title,
          description,
          created_at,
          update_type,
          user_id,
          is_ai_summary,
          linked_activity_id,
          case_activities (
            id,
            title
          )
        `)
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (updatesError) throw updatesError;

      // Fetch time entries and expenses
      const { data: finances, error: financesError } = await supabase
        .from("case_finances")
        .select(`
          id,
          finance_type,
          amount,
          description,
          date,
          status,
          created_at,
          user_id,
          hours,
          hourly_rate,
          category,
          activity_id,
          update_id,
          case_activities (
            id,
            title
          )
        `)
        .eq("case_id", caseId)
        .in("finance_type", ["time", "expense"])
        .order("date", { ascending: false });

      if (financesError) throw financesError;

      // Collect unique user IDs
      const userIds = new Set<string>();
      updates?.forEach((u) => userIds.add(u.user_id));
      finances?.forEach((f) => userIds.add(f.user_id));

      // Fetch user profiles
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", Array.from(userIds));

        const profileMap: Record<string, string> = {};
        profiles?.forEach((p) => {
          profileMap[p.id] = p.full_name || p.email || "Unknown";
        });
        setUserProfiles(profileMap);
      }

      // Transform updates to WorkLogEntry
      const updateEntries: WorkLogEntry[] = (updates || []).map((u) => ({
        id: `update-${u.id}`,
        type: "update" as WorkLogEntryType,
        date: u.created_at,
        title: u.title,
        description: u.description,
        amount: null,
        hours: null,
        status: null,
        createdBy: u.user_id,
        createdByName: "",
        linkedActivityTitle: u.case_activities?.title || null,
        linkedActivityId: u.linked_activity_id,
        updateType: u.update_type,
        category: null,
        isAiSummary: u.is_ai_summary || false,
        rawData: u,
      }));

      // Transform finances to WorkLogEntry
      const financeEntries: WorkLogEntry[] = (finances || []).map((f) => ({
        id: `${f.finance_type}-${f.id}`,
        type: f.finance_type as WorkLogEntryType,
        date: f.date || f.created_at,
        title: f.description || (f.finance_type === "time" ? "Time Entry" : "Expense"),
        description: null,
        amount: f.amount,
        hours: f.hours,
        status: f.status,
        createdBy: f.user_id,
        createdByName: "",
        linkedActivityTitle: f.case_activities?.title || null,
        linkedActivityId: f.activity_id,
        updateType: null,
        category: f.category,
        isAiSummary: false,
        rawData: f,
      }));

      // Combine and sort by date
      const allEntries = [...updateEntries, ...financeEntries].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setEntries(allEntries);
    } catch (error) {
      console.error("Error fetching work log data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Type filter
      if (typeFilter !== "all" && entry.type !== typeFilter) return false;

      // Status filter (only for time/expense)
      if (statusFilter !== "all") {
        if (entry.type === "update") {
          if (statusFilter !== "update") return false;
        } else if (entry.status !== statusFilter) {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = entry.title?.toLowerCase().includes(query);
        const matchesDescription = entry.description?.toLowerCase().includes(query);
        const matchesCategory = entry.category?.toLowerCase().includes(query);
        const matchesActivity = entry.linkedActivityTitle?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription && !matchesCategory && !matchesActivity) {
          return false;
        }
      }

      return true;
    });
  }, [entries, typeFilter, statusFilter, searchQuery]);

  // Calculate totals
  const totals = useMemo(() => {
    const timeEntries = filteredEntries.filter((e) => e.type === "time");
    const expenseEntries = filteredEntries.filter((e) => e.type === "expense");

    return {
      updates: filteredEntries.filter((e) => e.type === "update").length,
      timeEntries: timeEntries.length,
      totalHours: timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0),
      totalTime: timeEntries.reduce((sum, e) => sum + (e.amount || 0), 0),
      expenses: expenseEntries.length,
      totalExpenses: expenseEntries.reduce((sum, e) => sum + (e.amount || 0), 0),
    };
  }, [filteredEntries]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleExportCSV = () => {
    const columns: ExportColumn[] = [
      { key: "date", label: "Date", format: (v) => v ? format(parseISO(v), "MMM d, yyyy") : "" },
      { key: "type", label: "Type" },
      { key: "title", label: "Title/Description" },
      { key: "category", label: "Category", format: (v) => v || "-" },
      { key: "hours", label: "Hours", format: (v) => v ? v.toFixed(2) : "-" },
      { key: "amount", label: "Amount", format: (v) => v ? formatCurrency(v) : "-" },
      { key: "status", label: "Status", format: (v) => v || "-" },
      { key: "createdByName", label: "Created By", format: (_, row) => userProfiles[row.createdBy] || "Unknown" },
    ];
    exportToCSV(filteredEntries, columns, "work-log");
  };

  const handleExportPDF = () => {
    const columns: ExportColumn[] = [
      { key: "date", label: "Date", format: (v) => v ? format(parseISO(v), "MMM d, yyyy") : "" },
      { key: "type", label: "Type" },
      { key: "title", label: "Description" },
      { key: "hours", label: "Hours", format: (v) => v ? v.toFixed(2) : "-", align: "right" },
      { key: "amount", label: "Amount", format: (v) => v ? formatCurrency(v) : "-", align: "right" },
      { key: "status", label: "Status" },
    ];
    exportToPDF(filteredEntries, columns, "Work Log", "work-log", [
      { label: "Total Time", value: formatCurrency(totals.totalTime) },
      { label: "Total Expenses", value: formatCurrency(totals.totalExpenses) },
    ]);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Updates</p>
                <p className="text-2xl font-bold">{totals.updates}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Time Entries</p>
                <p className="text-2xl font-bold">{totals.totalHours.toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(totals.totalTime)}</p>
              </div>
              <Clock className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.totalExpenses)}</p>
                <p className="text-xs text-muted-foreground">{totals.expenses} entries</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Billable</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totals.totalTime + totals.totalExpenses)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search work log..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="update">Updates</SelectItem>
            <SelectItem value="time">Time Entries</SelectItem>
            <SelectItem value="expense">Expenses</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="invoiced">Invoiced</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleExportCSV}>Export to CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF}>Export to PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Timeline */}
      <Card>
        <CardContent className="p-0">
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No work log entries found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Updates, time entries, and expenses will appear here"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredEntries.map((entry) => {
                const Icon = ENTRY_TYPE_ICONS[entry.type];
                const isExpanded = expandedRows.has(entry.id);
                const userName = userProfiles[entry.createdBy] || "Unknown";

                return (
                  <div key={entry.id} className="group">
                    {/* Main Row */}
                    <div
                      className={cn(
                        "flex items-start gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                        isExpanded && "bg-muted/30"
                      )}
                      onClick={() => entry.description && toggleRow(entry.id)}
                    >
                      {/* Type Icon */}
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                          ENTRY_TYPE_COLORS[entry.type]
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{entry.title}</span>
                            {entry.isAiSummary && (
                              <Badge variant="secondary" className="text-xs">AI Summary</Badge>
                            )}
                            {entry.updateType && (
                              <Badge variant="outline" className="text-xs">
                                {entry.updateType}
                              </Badge>
                            )}
                            {entry.category && (
                              <Badge variant="outline" className="text-xs">
                                {entry.category}
                              </Badge>
                            )}
                          </div>

                          {/* Amount/Hours */}
                          <div className="flex items-center gap-3 shrink-0">
                            {entry.hours !== null && (
                              <span className="text-sm font-medium text-green-600">
                                {entry.hours.toFixed(2)}h
                              </span>
                            )}
                            {entry.amount !== null && (
                              <span className="text-sm font-semibold">
                                {formatCurrency(entry.amount)}
                              </span>
                            )}
                            {entry.status && (
                              <StatusBadge status={entry.status} size="sm" />
                            )}
                          </div>
                        </div>

                        {/* Meta Info */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(entry.date), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {userName}
                          </span>
                          {entry.linkedActivityTitle && (
                            <span className="flex items-center gap-1 text-primary">
                              <Link2 className="h-3 w-3" />
                              {entry.linkedActivityTitle}
                            </span>
                          )}
                        </div>

                        {/* Expand indicator */}
                        {entry.description && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                            <span>{isExpanded ? "Hide details" : "Show details"}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && entry.description && (
                      <div className="px-4 pb-4 pl-16">
                        <div className="rounded-lg bg-muted/50 p-4">
                          <RichTextDisplay html={entry.description} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
