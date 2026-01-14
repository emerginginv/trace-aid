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
import { Clock, DollarSign, Receipt, TrendingUp, Search, Download, FileText, Link, CheckCircle, Lock } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { exportToCSV, ExportColumn } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";

// --- Data Types ---

interface ServiceInstance {
  id: string;
  case_id: string;
  status: string;
  billable: boolean | null;
  billed_at: string | null;
  locked_at: string | null;
  quantity_actual: number | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  invoice_line_item_id: string | null;
  case_service_id: string;
  case_services: {
    id: string;
    name: string;
    code: string | null;
    is_billable: boolean | null;
    default_rate: number | null;
    budget_unit: string | null;
  } | null;
}

interface Activity {
  id: string;
  title: string;
  activity_type: string;
  completed: boolean | null;
  completed_at: string | null;
  due_date: string | null;
  start_time: string | null;
  end_time: string | null;
  end_date: string | null;
  case_service_instance_id: string | null;
  address: string | null;
  status: string;
}

interface InvoiceLineItem {
  id: string;
  case_service_instance_id: string;
  amount: number;
  quantity: number;
  rate: number;
  service_name: string;
  service_code: string | null;
  pricing_model: string;
  invoice_id: string;
  activity_ids: string[] | null;
}

interface PricingRule {
  case_service_id: string;
  rate: number;
  pricing_model: string;
  pricing_profile_id: string;
  is_billable: boolean | null;
}

interface DerivedTimeEntry {
  id: string;
  date: string;
  description: string;
  hours: number;
  rate: number;
  amount: number;
  status: "unbilled" | "pending" | "billed";
  service_name: string;
  service_code: string | null;
  service_instance_id: string;
  pricing_source: string;
  pricing_model: string;
  invoice_line_item_id?: string | null;
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
  invoice_id?: string | null;
}

interface ServiceBreakdown {
  serviceInstanceId: string;
  serviceName: string;
  serviceCode: string | null;
  status: string;
  pricingModel: string;
  totalTime: number;
  totalExpenses: number;
  billableAmount: number;
  isBilled: boolean;
  billedAt: string | null;
  isLocked: boolean;
}

interface TimeExpenseDetailProps {
  caseId: string;
  organizationId?: string;
}

// --- Helper Functions ---

function calculateActivityDuration(activity: Activity): number | null {
  // Only calculate for event-type activities with proper time fields
  if (
    activity.activity_type !== "event" ||
    !activity.due_date ||
    !activity.start_time ||
    !activity.end_time
  ) {
    return null;
  }

  try {
    const startDt = new Date(`${activity.due_date}T${activity.start_time}`);
    const endDt = new Date(`${activity.end_date || activity.due_date}T${activity.end_time}`);
    
    const diffMinutes = differenceInMinutes(endDt, startDt);
    if (diffMinutes <= 0) return null;

    // Return hours, minimum 0.25 (15 minutes)
    return Math.max(0.25, diffMinutes / 60);
  } catch {
    return null;
  }
}

function resolvePricingForService(
  caseServiceId: string,
  pricingRules: PricingRule[],
  fallbackRate: number | null
): { rate: number; pricingModel: string; source: string } {
  const rule = pricingRules.find(r => r.case_service_id === caseServiceId);
  
  if (rule) {
    return {
      rate: rule.rate,
      pricingModel: rule.pricing_model,
      source: "pricing_profile"
    };
  }
  
  return {
    rate: fallbackRate || 0,
    pricingModel: "hourly",
    source: "service_default"
  };
}

// --- Main Component ---

export function TimeExpenseDetail({ caseId, organizationId }: TimeExpenseDetailProps) {
  const { organization } = useOrganization();
  const orgId = organizationId || organization?.id;
  
  const [timeEntries, setTimeEntries] = useState<DerivedTimeEntry[]>([]);
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
      // 1. Fetch the case to get pricing_profile_id and account_id
      const { data: caseData } = await supabase
        .from("cases")
        .select("pricing_profile_id, account_id")
        .eq("id", caseId)
        .single();

      // 2. Resolve pricing profile using waterfall: Case → Account → Org Default
      let pricingProfileId = caseData?.pricing_profile_id;
      
      if (!pricingProfileId && caseData?.account_id) {
        const { data: account } = await supabase
          .from("accounts")
          .select("default_pricing_profile_id")
          .eq("id", caseData.account_id)
          .single();
        pricingProfileId = account?.default_pricing_profile_id;
      }
      
      if (!pricingProfileId) {
        const { data: defaultProfile } = await supabase
          .from("pricing_profiles")
          .select("id")
          .eq("organization_id", orgId!)
          .eq("is_default", true)
          .single();
        pricingProfileId = defaultProfile?.id;
      }

      // 3. Fetch pricing rules for the resolved profile
      let pricingRules: PricingRule[] = [];
      if (pricingProfileId) {
        const { data: rules } = await supabase
          .from("service_pricing_rules")
          .select("case_service_id, rate, pricing_model, pricing_profile_id, is_billable")
          .eq("pricing_profile_id", pricingProfileId);
        pricingRules = rules || [];
      }

      // 4. Fetch case service instances with their service definitions
      const { data: instances } = await supabase
        .from("case_service_instances")
        .select(`
          id, case_id, status, billable, billed_at, locked_at,
          quantity_actual, scheduled_start, scheduled_end,
          invoice_line_item_id, case_service_id,
          case_services (id, name, code, is_billable, default_rate, budget_unit)
        `)
        .eq("case_id", caseId)
        .eq("organization_id", orgId!);

      // 5. Fetch activities linked to service instances
      const { data: activities } = await supabase
        .from("case_activities")
        .select(`
          id, title, activity_type, completed, completed_at,
          due_date, start_time, end_time, end_date,
          case_service_instance_id, address, status
        `)
        .eq("case_id", caseId)
        .not("case_service_instance_id", "is", null);

      // 6. Fetch invoice line items for billed status
      const { data: invoiceItems } = await supabase
        .from("invoice_line_items")
        .select("id, case_service_instance_id, amount, quantity, rate, service_name, service_code, pricing_model, invoice_id, activity_ids")
        .eq("case_id", caseId);

      // 7. Derive time entries from activities and service instances
      const derivedEntries = deriveTimeEntries(
        instances || [],
        activities || [],
        invoiceItems || [],
        pricingRules
      );
      setTimeEntries(derivedEntries);

      // 8. Fetch expenses from case_finances (still the source for expense data)
      const { data: expenseData } = await supabase
        .from("case_finances")
        .select(`
          id, date, description, category, quantity, unit_price, amount, status,
          expense_user_id, case_service_instance_id, invoice_id
        `)
        .eq("case_id", caseId)
        .eq("organization_id", orgId!)
        .eq("finance_type", "expense")
        .order("date", { ascending: false });

      const expensesWithDetails = await enrichExpenseData(expenseData || [], instances || []);
      setExpenses(expensesWithDetails);

    } catch (error) {
      console.error("Error fetching time/expense data:", error);
    } finally {
      setLoading(false);
    }
  };

  const deriveTimeEntries = (
    instances: ServiceInstance[],
    activities: Activity[],
    invoiceItems: InvoiceLineItem[],
    pricingRules: PricingRule[]
  ): DerivedTimeEntry[] => {
    const entries: DerivedTimeEntry[] = [];

    // Create maps for faster lookup
    const invoiceItemMap = new Map(
      invoiceItems.map(item => [item.case_service_instance_id, item])
    );
    const activitiesForInstance = new Map<string, Activity[]>();
    activities.forEach(act => {
      if (act.case_service_instance_id) {
        const existing = activitiesForInstance.get(act.case_service_instance_id) || [];
        existing.push(act);
        activitiesForInstance.set(act.case_service_instance_id, existing);
      }
    });

    for (const instance of instances) {
      const service = instance.case_services;
      if (!service) continue;

      const invoiceItem = invoiceItemMap.get(instance.id);
      const instanceActivities = activitiesForInstance.get(instance.id) || [];
      
      // Check for completed activities to derive time entries
      const completedActivities = instanceActivities.filter(a => a.completed);
      
      if (completedActivities.length > 0) {
        // Derive from completed activities
        for (const activity of completedActivities) {
          const durationHours = calculateActivityDuration(activity);
          if (durationHours === null) continue;

          const pricing = resolvePricingForService(
            instance.case_service_id,
            pricingRules,
            service.default_rate
          );

          // Determine status based on invoice linkage
          let status: "unbilled" | "pending" | "billed" = "unbilled";
          if (invoiceItem && invoiceItem.activity_ids?.includes(activity.id)) {
            status = "billed";
          } else if (instance.locked_at || instance.billed_at) {
            status = "pending";
          }

          entries.push({
            id: `${instance.id}-${activity.id}`,
            date: activity.completed_at || activity.due_date || new Date().toISOString(),
            description: activity.title,
            hours: durationHours,
            rate: status === "billed" && invoiceItem ? invoiceItem.rate : pricing.rate,
            amount: status === "billed" && invoiceItem 
              ? invoiceItem.amount / Math.max(invoiceItem.quantity, 1) 
              : durationHours * pricing.rate,
            status,
            service_name: service.name,
            service_code: service.code,
            service_instance_id: instance.id,
            pricing_source: status === "billed" ? "invoice" : pricing.source,
            pricing_model: status === "billed" && invoiceItem ? invoiceItem.pricing_model : pricing.pricingModel,
            invoice_line_item_id: invoiceItem?.id,
          });
        }
      } else if (instance.quantity_actual && instance.quantity_actual > 0) {
        // Use quantity_actual from service instance if no activities with duration
        const pricing = resolvePricingForService(
          instance.case_service_id,
          pricingRules,
          service.default_rate
        );

        let status: "unbilled" | "pending" | "billed" = "unbilled";
        if (invoiceItem) {
          status = "billed";
        } else if (instance.locked_at || instance.billed_at) {
          status = "pending";
        }

        entries.push({
          id: instance.id,
          date: instance.scheduled_start || instance.billed_at || new Date().toISOString(),
          description: `${service.name}${instance.status !== "completed" ? ` (${instance.status})` : ""}`,
          hours: instance.quantity_actual,
          rate: status === "billed" && invoiceItem ? invoiceItem.rate : pricing.rate,
          amount: status === "billed" && invoiceItem 
            ? invoiceItem.amount 
            : instance.quantity_actual * pricing.rate,
          status,
          service_name: service.name,
          service_code: service.code,
          service_instance_id: instance.id,
          pricing_source: status === "billed" ? "invoice" : pricing.source,
          pricing_model: status === "billed" && invoiceItem ? invoiceItem.pricing_model : pricing.pricingModel,
          invoice_line_item_id: invoiceItem?.id,
        });
      } else if (invoiceItem) {
        // Billed service instance without activity data - use invoice data
        entries.push({
          id: instance.id,
          date: instance.scheduled_start || instance.billed_at || new Date().toISOString(),
          description: invoiceItem.service_name,
          hours: invoiceItem.quantity,
          rate: invoiceItem.rate,
          amount: invoiceItem.amount,
          status: "billed",
          service_name: invoiceItem.service_name,
          service_code: invoiceItem.service_code,
          service_instance_id: instance.id,
          pricing_source: "invoice",
          pricing_model: invoiceItem.pricing_model,
          invoice_line_item_id: invoiceItem.id,
        });
      }
    }

    // Sort by date descending
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const enrichExpenseData = async (
    entries: any[],
    instances: ServiceInstance[]
  ): Promise<ExpenseEntry[]> => {
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

    // Create instance map for service info
    const instanceMap = new Map(
      instances.map(inst => [
        inst.id,
        {
          name: inst.case_services?.name || "Unknown Service",
          code: inst.case_services?.code || null
        }
      ])
    );

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
      status: entry.invoice_id ? "invoiced" : (entry.status || "pending"),
    }));
  };

  // Calculate totals
  const totalHours = timeEntries.reduce((sum, e) => sum + e.hours, 0);
  const totalTimeValue = timeEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const grandTotal = totalTimeValue + totalExpenses;

  // Calculate service breakdown
  const calculateServiceBreakdown = (): ServiceBreakdown[] => {
    const breakdown = new Map<string, ServiceBreakdown>();

    // Process time entries - group by service instance
    timeEntries.forEach(entry => {
      const key = entry.service_instance_id || "unassigned";
      const existing = breakdown.get(key);
      
      if (existing) {
        existing.totalTime += entry.hours;
        existing.billableAmount += entry.amount;
        // Update billed status if any entry is billed
        if (entry.status === "billed") {
          existing.isBilled = true;
        }
      } else {
        breakdown.set(key, {
          serviceInstanceId: key,
          serviceName: entry.service_name || "Unassigned",
          serviceCode: entry.service_code || null,
          status: entry.status === "billed" ? "completed" : "in_progress",
          pricingModel: entry.pricing_model || "hourly",
          totalTime: entry.hours,
          totalExpenses: 0,
          billableAmount: entry.amount,
          isBilled: entry.status === "billed",
          billedAt: null,
          isLocked: entry.status === "pending",
        });
      }
    });

    // Process expenses - add to existing or create new
    expenses.forEach(entry => {
      const key = entry.case_service_instance_id || "unassigned";
      const existing = breakdown.get(key);
      
      if (existing) {
        existing.totalExpenses += Number(entry.amount);
        existing.billableAmount += Number(entry.amount);
        if (entry.status === "invoiced") {
          existing.isBilled = true;
        }
      } else {
        breakdown.set(key, {
          serviceInstanceId: key,
          serviceName: entry.service_name || "Unassigned",
          serviceCode: entry.service_code || null,
          status: entry.status === "invoiced" ? "completed" : "in_progress",
          pricingModel: "expense",
          totalTime: 0,
          totalExpenses: Number(entry.amount),
          billableAmount: Number(entry.amount),
          isBilled: entry.status === "invoiced",
          billedAt: null,
          isLocked: false,
        });
      }
    });

    return Array.from(breakdown.values())
      .sort((a, b) => b.billableAmount - a.billableAmount);
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
      unbilled: "bg-muted text-muted-foreground border-border",
      pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      approved: "bg-green-500/10 text-green-600 border-green-500/20",
      rejected: "bg-red-500/10 text-red-600 border-red-500/20",
      billed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      invoiced: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    };
    return (
      <Badge variant="outline" className={cn("capitalize", variants[status] || "")}>
        {status === "billed" || status === "invoiced" ? (
          <span className="flex items-center gap-1">
            <Link className="h-3 w-3" />
            {status}
          </span>
        ) : status}
      </Badge>
    );
  };

  const handleExportTimeCSV = () => {
    const columns: ExportColumn[] = [
      { key: "date", label: "Date" },
      { key: "service_name", label: "Service" },
      { key: "description", label: "Description" },
      { key: "hours", label: "Hours" },
      { key: "rate", label: "Rate" },
      { key: "amount", label: "Amount" },
      { key: "status", label: "Status" },
      { key: "pricing_source", label: "Pricing Source" },
    ];
    exportToCSV(
      filteredTimeEntries.map(e => ({
        ...e,
        date: format(new Date(e.date), "yyyy-MM-dd"),
        rate: `$${e.rate.toFixed(2)}`,
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
        amount: `$${Number(e.amount).toFixed(2)}`,
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
            <SelectItem value="unbilled">Unbilled</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="billed">Billed</SelectItem>
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
                      <TableCell className="text-right">{entry.hours.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        ${entry.rate.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${entry.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Subtotal Row */}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell colSpan={3}>Subtotal</TableCell>
                    <TableCell className="text-right">
                      {filteredTimeEntries.reduce((sum, e) => sum + e.hours, 0).toFixed(2)}
                    </TableCell>
                    <TableCell />
                    <TableCell className="text-right">
                      ${filteredTimeEntries.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
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
                    <TableHead>Status</TableHead>
                    <TableHead>Pricing Model</TableHead>
                    <TableHead className="text-right">Total Time</TableHead>
                    <TableHead className="text-right">Total Expenses</TableHead>
                    <TableHead className="text-right">Billable Amount</TableHead>
                    <TableHead>Billed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceBreakdown.map((service) => (
                    <TableRow key={service.serviceInstanceId}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{service.serviceName}</span>
                          {service.serviceCode && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({service.serviceCode})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "capitalize",
                            service.status === "completed" && "bg-green-500/10 text-green-600 border-green-500/20",
                            service.status === "in_progress" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                            service.status === "scheduled" && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                            service.status === "unscheduled" && "bg-muted text-muted-foreground"
                          )}
                        >
                          {service.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {service.pricingModel.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {service.totalTime > 0 ? `${service.totalTime.toFixed(2)}h` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {service.totalExpenses > 0 ? `$${service.totalExpenses.toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${service.billableAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {service.isBilled ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Billed
                          </Badge>
                        ) : service.isLocked ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-500/20">
                            <Lock className="h-3 w-3 mr-1" />
                            Locked
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Grand Total Row */}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell colSpan={3}>Grand Total</TableCell>
                    <TableCell className="text-right">{totalHours.toFixed(2)}h</TableCell>
                    <TableCell className="text-right">${totalExpenses.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${grandTotal.toFixed(2)}</TableCell>
                    <TableCell />
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
