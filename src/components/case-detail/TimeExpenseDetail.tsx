import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, DollarSign, Receipt, TrendingUp, Search, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { exportToCSV, ExportColumn } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";

interface TimeEntry {
  id: string;
  date: string;
  description: string;
  hours: number | null;
  hourly_rate: number | null;
  amount: number;
  status: string;
  case_service_instance_id: string | null;
  service_name?: string;
  service_code?: string;
}

interface ExpenseEntry {
  id: string;
  date: string;
  description: string;
  category: string | null;
  quantity: number | null;
  unit_price: number | null;
  amount: number;
  status: string;
  expense_user_id: string | null;
  expense_user_name?: string;
  case_service_instance_id: string | null;
  service_name?: string;
  service_code?: string;
}

interface ServiceBreakdown {
  serviceId: string;
  serviceName: string;
  serviceCode: string | null;
  totalHours: number;
  timeAmount: number;
  expenseAmount: number;
  combinedTotal: number;
}

interface TimeExpenseDetailProps {
  caseId: string;
  organizationId?: string;
}

export function TimeExpenseDetail({ caseId, organizationId }: TimeExpenseDetailProps) {
  const { organization } = useOrganization();
  const orgId = organizationId || organization?.id;
  
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (orgId) {
      fetchTimeExpenseData();
    }
  }, [caseId, orgId]);

  const fetchTimeExpenseData = async () => {
    setLoading(true);
    try {
      // Fetch time entries
      const { data: timeData, error: timeError } = await supabase
        .from("case_finances")
        .select(`
          id,
          date,
          description,
          hours,
          hourly_rate,
          amount,
          status,
          case_service_instance_id
        `)
        .eq("case_id", caseId)
        .eq("organization_id", orgId)
        .eq("finance_type", "time")
        .order("date", { ascending: false });

      if (timeError) throw timeError;

      // Fetch service instance info for time entries
      const timeWithServices = await enrichWithServiceInfo(timeData || []);
      setTimeEntries(timeWithServices);

      // Fetch expenses
      const { data: expenseData, error: expenseError } = await supabase
        .from("case_finances")
        .select(`
          id,
          date,
          description,
          category,
          quantity,
          unit_price,
          amount,
          status,
          expense_user_id,
          case_service_instance_id
        `)
        .eq("case_id", caseId)
        .eq("organization_id", orgId)
        .eq("finance_type", "expense")
        .order("date", { ascending: false });

      if (expenseError) throw expenseError;

      // Enrich expenses with user and service info
      const expensesWithDetails = await enrichExpenseData(expenseData || []);
      setExpenses(expensesWithDetails);
    } catch (error) {
      console.error("Error fetching time/expense data:", error);
    } finally {
      setLoading(false);
    }
  };

  const enrichWithServiceInfo = async (entries: any[]): Promise<TimeEntry[]> => {
    const instanceIds = entries
      .filter(e => e.case_service_instance_id)
      .map(e => e.case_service_instance_id);
    
    if (instanceIds.length === 0) return entries;

    const { data: instances } = await supabase
      .from("case_service_instances")
      .select(`
        id,
        case_services (id, name, code)
      `)
      .in("id", instanceIds);

    const instanceMap = new Map(
      (instances || []).map(inst => [
        inst.id,
        {
          name: inst.case_services?.name || "Unknown Service",
          code: inst.case_services?.code || null
        }
      ])
    );

    return entries.map(entry => ({
      ...entry,
      service_name: entry.case_service_instance_id 
        ? instanceMap.get(entry.case_service_instance_id)?.name 
        : undefined,
      service_code: entry.case_service_instance_id 
        ? instanceMap.get(entry.case_service_instance_id)?.code 
        : undefined,
    }));
  };

  const enrichExpenseData = async (entries: any[]): Promise<ExpenseEntry[]> => {
    // Get user info
    const userIds = entries
      .filter(e => e.expense_user_id)
      .map(e => e.expense_user_id);
    
    let userMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      
      userMap = new Map(
        (users || []).map(u => [u.id, u.full_name || u.email || "Unknown"])
      );
    }

    // Get service info
    const instanceIds = entries
      .filter(e => e.case_service_instance_id)
      .map(e => e.case_service_instance_id);

    let instanceMap = new Map<string, { name: string; code: string | null }>();
    if (instanceIds.length > 0) {
      const { data: instances } = await supabase
        .from("case_service_instances")
        .select(`
          id,
          case_services (id, name, code)
        `)
        .in("id", instanceIds);

      instanceMap = new Map(
        (instances || []).map(inst => [
          inst.id,
          {
            name: inst.case_services?.name || "Unknown Service",
            code: inst.case_services?.code || null
          }
        ])
      );
    }

    return entries.map(entry => ({
      ...entry,
      expense_user_name: entry.expense_user_id 
        ? userMap.get(entry.expense_user_id) 
        : undefined,
      service_name: entry.case_service_instance_id 
        ? instanceMap.get(entry.case_service_instance_id)?.name 
        : undefined,
      service_code: entry.case_service_instance_id 
        ? instanceMap.get(entry.case_service_instance_id)?.code 
        : undefined,
    }));
  };

  // Calculate totals
  const totalHours = timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const totalTimeValue = timeEntries.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const grandTotal = totalTimeValue + totalExpenses;

  // Calculate service breakdown
  const calculateServiceBreakdown = (): ServiceBreakdown[] => {
    const breakdown = new Map<string, ServiceBreakdown>();

    // Process time entries
    timeEntries.forEach(entry => {
      const key = entry.case_service_instance_id || "unassigned";
      const existing = breakdown.get(key) || {
        serviceId: key,
        serviceName: entry.service_name || "Unassigned",
        serviceCode: entry.service_code || null,
        totalHours: 0,
        timeAmount: 0,
        expenseAmount: 0,
        combinedTotal: 0,
      };
      existing.totalHours += entry.hours || 0;
      existing.timeAmount += Number(entry.amount);
      existing.combinedTotal = existing.timeAmount + existing.expenseAmount;
      breakdown.set(key, existing);
    });

    // Process expenses
    expenses.forEach(entry => {
      const key = entry.case_service_instance_id || "unassigned";
      const existing = breakdown.get(key) || {
        serviceId: key,
        serviceName: entry.service_name || "Unassigned",
        serviceCode: entry.service_code || null,
        totalHours: 0,
        timeAmount: 0,
        expenseAmount: 0,
        combinedTotal: 0,
      };
      existing.expenseAmount += Number(entry.amount);
      existing.combinedTotal = existing.timeAmount + existing.expenseAmount;
      breakdown.set(key, existing);
    });

    return Array.from(breakdown.values())
      .sort((a, b) => b.combinedTotal - a.combinedTotal);
  };

  const serviceBreakdown = calculateServiceBreakdown();

  // Filter entries
  const filteredTimeEntries = timeEntries.filter(entry => {
    const matchesSearch = searchQuery === "" ||
      entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.service_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredExpenses = expenses.filter(entry => {
    const matchesSearch = searchQuery === "" ||
      entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.expense_user_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      approved: "bg-green-500/10 text-green-600 border-green-500/20",
      rejected: "bg-red-500/10 text-red-600 border-red-500/20",
      invoiced: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    };
    return (
      <Badge variant="outline" className={cn("capitalize", variants[status] || "")}>
        {status}
      </Badge>
    );
  };

  const handleExportTimeCSV = () => {
    const columns: ExportColumn[] = [
      { key: "date", label: "Date" },
      { key: "service_name", label: "Service" },
      { key: "description", label: "Description" },
      { key: "hours", label: "Hours" },
      { key: "hourly_rate", label: "Rate" },
      { key: "amount", label: "Amount" },
      { key: "status", label: "Status" },
    ];
    exportToCSV(
      filteredTimeEntries.map(e => ({
        ...e,
        date: format(new Date(e.date), "yyyy-MM-dd"),
        hourly_rate: e.hourly_rate ? `$${e.hourly_rate.toFixed(2)}` : "",
        amount: `$${e.amount.toFixed(2)}`,
      })),
      columns,
      `time-entries-${caseId}`
    );
  };

  const handleExportExpensesCSV = () => {
    const columns: ExportColumn[] = [
      { key: "date", label: "Date" },
      { key: "category", label: "Category" },
      { key: "description", label: "Description" },
      { key: "expense_user_name", label: "Submitted By" },
      { key: "quantity", label: "Qty" },
      { key: "unit_price", label: "Unit Price" },
      { key: "amount", label: "Amount" },
      { key: "status", label: "Status" },
    ];
    exportToCSV(
      filteredExpenses.map(e => ({
        ...e,
        date: format(new Date(e.date), "yyyy-MM-dd"),
        unit_price: e.unit_price ? `$${e.unit_price.toFixed(2)}` : "",
        amount: `$${e.amount.toFixed(2)}`,
      })),
      columns,
      `expenses-${caseId}`
    );
  };

  if (loading) {
    return <TimeExpenseDetailSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Time</p>
                <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time Value</p>
                <p className="text-2xl font-bold">${totalTimeValue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Receipt className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold">${totalExpenses.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Grand Total</p>
                <p className="text-2xl font-bold">${grandTotal.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="invoiced">Invoiced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Time Entries Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Entries
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportTimeCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTimeEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No time entries recorded for this case.
            </p>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTimeEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(entry.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {entry.service_name ? (
                          <div>
                            <span>{entry.service_name}</span>
                            {entry.service_code && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({entry.service_code})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                      <TableCell className="text-right">{entry.hours?.toFixed(2) || "—"}</TableCell>
                      <TableCell className="text-right">
                        {entry.hourly_rate ? `$${entry.hourly_rate.toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${Number(entry.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Subtotal Row */}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell colSpan={3}>Subtotal</TableCell>
                    <TableCell className="text-right">
                      {filteredTimeEntries.reduce((sum, e) => sum + (e.hours || 0), 0).toFixed(2)}
                    </TableCell>
                    <TableCell />
                    <TableCell className="text-right">
                      ${filteredTimeEntries.reduce((sum, e) => sum + Number(e.amount), 0).toFixed(2)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenses Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expenses
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportExpensesCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No expenses recorded for this case.
            </p>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(entry.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {entry.category ? (
                          <Badge variant="outline" className="capitalize">
                            {entry.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                      <TableCell>{entry.expense_user_name || "—"}</TableCell>
                      <TableCell className="text-right">{entry.quantity || "—"}</TableCell>
                      <TableCell className="text-right">
                        {entry.unit_price ? `$${entry.unit_price.toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${Number(entry.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Subtotal Row */}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell colSpan={6}>Subtotal</TableCell>
                    <TableCell className="text-right">
                      ${filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0).toFixed(2)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Breakdown Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Breakdown by Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          {serviceBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No service data available.
            </p>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Total Hours</TableHead>
                    <TableHead className="text-right">Time Amount</TableHead>
                    <TableHead className="text-right">Expense Amount</TableHead>
                    <TableHead className="text-right">Combined Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceBreakdown.map((service) => (
                    <TableRow key={service.serviceId}>
                      <TableCell>
                        <div>
                          <span>{service.serviceName}</span>
                          {service.serviceCode && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({service.serviceCode})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{service.totalHours.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${service.timeAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${service.expenseAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${service.combinedTotal.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Grand Total Row */}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell>Grand Total</TableCell>
                    <TableCell className="text-right">{totalHours.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${totalTimeValue.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${totalExpenses.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${grandTotal.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Skeleton Component
function TimeExpenseDetailSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-7 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-10 flex-1 max-w-sm" />
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Time Entries Skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-28" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <div className="p-3 border-b bg-muted/30">
              <div className="flex gap-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 flex-1" />
                ))}
              </div>
            </div>
            <div className="divide-y">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 flex items-center gap-4">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <Skeleton key={j} className="h-5 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <div className="p-3 border-b bg-muted/30">
              <div className="flex gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 flex-1" />
                ))}
              </div>
            </div>
            <div className="divide-y">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 flex items-center gap-4">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <Skeleton key={j} className="h-5 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
