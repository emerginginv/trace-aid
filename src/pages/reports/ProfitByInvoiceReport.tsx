import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Printer, FileText, ChevronDown, ChevronUp, CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
}

interface Salesperson {
  id: string;
  full_name: string | null;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: string;
  created_on: string;
  total: number;
  case_number: string;
  case_id: string;
  client_name: string;
  account_id: string | null;
  billed_expenses: number;
  profit: number;
  profit_percent: number;
}

interface Totals {
  invoiced: number;
  billed_expenses: number;
  profit: number;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status?.toLowerCase()) {
    case "paid":
      return "default";
    case "overdue":
      return "destructive";
    case "sent":
    case "open":
      return "secondary";
    default:
      return "outline";
  }
};

export default function ProfitByInvoiceReport() {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [totalsOpen, setTotalsOpen] = useState(true);
  const [sortField, setSortField] = useState<keyof InvoiceRow>("created_on");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useSetBreadcrumbs([
    { label: "Reports", href: "/reports" },
    { label: "Profit By Invoice" },
  ]);

  // Fetch accounts for filter
  useEffect(() => {
    if (!organizationId) return;

    const fetchAccounts = async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("organization_id", organizationId)
        .order("name");

      if (!error && data) {
        setAccounts(data);
      }
    };

    fetchAccounts();
  }, [organizationId]);

  // Fetch salespeople (case managers) for filter
  useEffect(() => {
    if (!organizationId) return;

    const fetchSalespeople = async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("user_id, profiles(id, full_name)")
        .eq("organization_id", organizationId);

      if (!error && data) {
        const people = data
          .filter((m) => m.profiles)
          .map((m) => ({
            id: (m.profiles as any).id,
            full_name: (m.profiles as any).full_name,
          }));
        setSalespeople(people);
      }
    };

    fetchSalespeople();
  }, [organizationId]);

  // Fetch invoice data
  useEffect(() => {
    if (!organizationId || !startDate || !endDate) return;

    const fetchData = async () => {
      setLoading(true);

      try {
        // Build query for invoices
        let query = supabase
          .from("invoices")
          .select(`
            id,
            invoice_number,
            status,
            date,
            total,
            case_id,
            cases!inner(
              case_number,
              account_id,
              case_manager_id,
              organization_id,
              accounts(id, name)
            )
          `)
          .eq("cases.organization_id", organizationId)
          .gte("date", format(startDate, "yyyy-MM-dd"))
          .lte("date", format(endDate, "yyyy-MM-dd"));

        if (selectedAccountId !== "all") {
          query = query.eq("cases.account_id", selectedAccountId);
        }

        if (selectedSalespersonId !== "all") {
          query = query.eq("cases.case_manager_id", selectedSalespersonId);
        }

        if (selectedStatus !== "all") {
          query = query.eq("status", selectedStatus);
        }

        const { data: invoiceData, error: invoiceError } = await query;

        if (invoiceError) {
          console.error("Error fetching invoices:", invoiceError);
          setLoading(false);
          return;
        }

        if (!invoiceData || invoiceData.length === 0) {
          setInvoices([]);
          setLoading(false);
          return;
        }

        // Get billed expenses for each invoice
        const invoiceIds = invoiceData.map((inv) => inv.id);

        const { data: expensesData, error: expensesError } = await supabase
          .from("case_finances")
          .select("invoice_id, amount")
          .in("invoice_id", invoiceIds)
          .in("finance_type", ["time", "expense"]);

        // Create expense map
        const expenseMap: Record<string, number> = {};
        if (!expensesError && expensesData) {
          expensesData.forEach((exp) => {
            if (exp.invoice_id) {
              expenseMap[exp.invoice_id] = (expenseMap[exp.invoice_id] || 0) + (Number(exp.amount) || 0);
            }
          });
        }

        // Map invoice data to rows
        const rows: InvoiceRow[] = invoiceData.map((inv) => {
          const caseData = inv.cases as any;
          const accountData = caseData?.accounts;
          const total = Number(inv.total) || 0;
          const billedExpenses = expenseMap[inv.id] || 0;
          const profit = total - billedExpenses;
          const profitPercent = total > 0 ? (profit / total) * 100 : 0;

          return {
            id: inv.id,
            invoice_number: inv.invoice_number || "",
            status: inv.status || "draft",
            created_on: inv.date,
            total,
            case_number: caseData?.case_number || "",
            case_id: inv.case_id,
            client_name: accountData?.name || "No Client",
            account_id: caseData?.account_id,
            billed_expenses: billedExpenses,
            profit,
            profit_percent: profitPercent,
          };
        });

        setInvoices(rows);
      } catch (error) {
        console.error("Error fetching profit by invoice data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId, selectedAccountId, selectedSalespersonId, selectedStatus, startDate, endDate]);

  // Calculate totals
  const totals: Totals = useMemo(() => {
    return invoices.reduce(
      (acc, inv) => ({
        invoiced: acc.invoiced + inv.total,
        billed_expenses: acc.billed_expenses + inv.billed_expenses,
        profit: acc.profit + inv.profit,
      }),
      { invoiced: 0, billed_expenses: 0, profit: 0 }
    );
  }, [invoices]);

  // Sort invoices
  const sortedInvoices = useMemo(() => {
    return [...invoices].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });
  }, [invoices, sortField, sortDirection]);

  const handleSort = (field: keyof InvoiceRow) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handlePrint = () => {
    window.print();
  };

  const getSalespersonName = (person: Salesperson) => {
    return person.full_name || "Unknown";
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link to="/reports">
              <ArrowLeft className="h-4 w-4 mr-2" />
              All Reports
            </Link>
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Profit By Invoice
          </h1>
          <p className="text-muted-foreground mt-1">
            Invoice-level profit analysis with client and status filtering
          </p>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Print Header */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Profit By Invoice Report</h1>
        <p className="text-sm text-muted-foreground">
          {selectedAccountId === "all" ? "All Clients" : accounts.find((a) => a.id === selectedAccountId)?.name} |{" "}
          {startDate && endDate
            ? `${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`
            : "All Dates"}
        </p>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {/* Client Filter */}
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Salesperson Filter */}
            <div className="space-y-2">
              <Label>Salesperson</Label>
              <Select value={selectedSalespersonId} onValueChange={setSelectedSalespersonId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select salesperson..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Salespeople</SelectItem>
                  {salespeople.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {getSalespersonName(person)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label>From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Totals Summary */}
      <Collapsible open={totalsOpen} onOpenChange={setTotalsOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <CardTitle className="text-lg">Summary Totals</CardTitle>
                <Button variant="ghost" size="sm">
                  {totalsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Invoiced</p>
                    <p className="text-xl font-bold">{formatCurrency(totals.invoiced)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Billed Expenses</p>
                    <p className="text-xl font-bold">{formatCurrency(totals.billed_expenses)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10">
                    <p className="text-sm text-muted-foreground">Profit</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(totals.profit)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Data Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invoices found for the selected filters.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("invoice_number")}
                    >
                      Invoice
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("status")}
                    >
                      Status
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("client_name")}
                    >
                      Client
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("case_number")}
                    >
                      Case
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("created_on")}
                    >
                      Created On
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("billed_expenses")}
                    >
                      Billed Expenses
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("total")}
                    >
                      Total
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("profit")}
                    >
                      Profit
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedInvoices.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link 
                          to={`/cases/${row.case_id}/billing`} 
                          className="text-primary hover:underline font-medium"
                        >
                          {row.invoice_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(row.status)} className="capitalize">
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.account_id ? (
                          <Link 
                            to={`/clients/${row.account_id}`}
                            className="text-primary hover:underline"
                          >
                            {row.client_name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{row.client_name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link 
                          to={`/cases/${row.case_id}`}
                          className="text-primary hover:underline"
                        >
                          {row.case_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {row.created_on ? format(new Date(row.created_on), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(row.billed_expenses)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(row.total)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className={`font-medium ${row.profit >= 0 ? "text-green-600" : "text-destructive"}`}>
                            {formatCurrency(row.profit)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatPercent(row.profit_percent)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
