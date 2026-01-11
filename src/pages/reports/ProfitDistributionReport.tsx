import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Printer, PieChart as PieChartIcon, CalendarIcon, ChevronDown, ChevronUp } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Account {
  id: string;
  name: string;
}

interface Salesperson {
  id: string;
  full_name: string | null;
}

interface ProfitRow {
  id: string;
  name: string;
  billableExpenses: number;
  nonBillableExpenses: number;
  totalExpenses: number;
  discounts: number;
  tax: number;
  invoiced: number;
  profit: number;
  profitPercent: number;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(210, 70%, 50%)",
  "hsl(280, 70%, 50%)",
  "hsl(30, 70%, 50%)",
  "hsl(150, 70%, 50%)",
  "hsl(330, 70%, 50%)",
];

export default function ProfitDistributionReport() {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<"client">("client");
  const [chartType, setChartType] = useState<"pie" | "bar">("pie");
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [excludeSalesTax, setExcludeSalesTax] = useState(false);
  const [hideSearch, setHideSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfitRow[]>([]);
  const [chartOpen, setChartOpen] = useState(true);
  const [sortField, setSortField] = useState<keyof ProfitRow>("profit");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useSetBreadcrumbs([
    { label: "Reports", href: "/reports" },
    { label: "Profit Distribution" },
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

  // Fetch salespeople for filter
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

  // Fetch profit distribution data
  useEffect(() => {
    if (!organizationId || !startDate || !endDate) return;

    const fetchData = async () => {
      setLoading(true);

      try {
        // Fetch invoices within date range
        let invoiceQuery = supabase
          .from("invoices")
          .select(`
            id,
            total,
            case_id,
            cases!inner(
              id,
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
          invoiceQuery = invoiceQuery.eq("cases.account_id", selectedAccountId);
        }

        if (selectedSalespersonId !== "all") {
          invoiceQuery = invoiceQuery.eq("cases.case_manager_id", selectedSalespersonId);
        }

        const { data: invoiceData, error: invoiceError } = await invoiceQuery;

        if (invoiceError) {
          console.error("Error fetching invoices:", invoiceError);
          setLoading(false);
          return;
        }

        if (!invoiceData || invoiceData.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        // Get all invoice IDs and case IDs
        const invoiceIds = invoiceData.map((inv) => inv.id);
        const caseIds = [...new Set(invoiceData.map((inv) => inv.case_id))];

        // Fetch expenses linked to these invoices
        const { data: expenseData, error: expenseError } = await supabase
          .from("case_finances")
          .select("id, case_id, invoice_id, amount, invoiced, finance_type")
          .in("case_id", caseIds)
          .in("finance_type", ["expense", "time"]);

        if (expenseError) {
          console.error("Error fetching expenses:", expenseError);
        }

        // Group by client
        const grouped: Record<string, {
          id: string;
          name: string;
          invoiced: number;
          billableExpenses: number;
          nonBillableExpenses: number;
        }> = {};

        // First, aggregate invoiced amounts by client
        invoiceData.forEach((inv) => {
          const caseData = inv.cases as any;
          const accountId = caseData?.account_id || "no-client";
          const accountName = caseData?.accounts?.name || "No Client";
          const invoicedAmount = Number(inv.total) || 0;

          if (!grouped[accountId]) {
            grouped[accountId] = {
              id: accountId,
              name: accountName,
              invoiced: 0,
              billableExpenses: 0,
              nonBillableExpenses: 0,
            };
          }
          grouped[accountId].invoiced += invoicedAmount;
        });

        // Then, aggregate expenses by client (via case)
        if (expenseData) {
          // Create a map of case_id -> account_id for lookup
          const caseToAccount: Record<string, string> = {};
          invoiceData.forEach((inv) => {
            const caseData = inv.cases as any;
            if (caseData?.id && caseData?.account_id) {
              caseToAccount[caseData.id] = caseData.account_id;
            }
          });

          expenseData.forEach((exp) => {
            const accountId = caseToAccount[exp.case_id] || "no-client";
            const amount = Number(exp.amount) || 0;

            if (grouped[accountId]) {
              if (exp.invoiced) {
                grouped[accountId].billableExpenses += amount;
              } else {
                grouped[accountId].nonBillableExpenses += amount;
              }
            }
          });
        }

        // Calculate profit and create rows
        const rows: ProfitRow[] = Object.values(grouped).map((g) => {
          const totalExpenses = g.billableExpenses + g.nonBillableExpenses;
          const profit = g.invoiced - totalExpenses;
          const profitPercent = g.invoiced > 0 ? (profit / g.invoiced) * 100 : 0;

          return {
            id: g.id,
            name: g.name,
            billableExpenses: g.billableExpenses,
            nonBillableExpenses: g.nonBillableExpenses,
            totalExpenses,
            discounts: 0, // Not in schema
            tax: 0, // Not in schema
            invoiced: g.invoiced,
            profit,
            profitPercent,
          };
        });

        setData(rows);
      } catch (error) {
        console.error("Error fetching profit distribution data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId, selectedAccountId, selectedSalespersonId, startDate, endDate]);

  // Sorted data
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortDirection === "asc" 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [data, sortField, sortDirection]);

  // Grand totals
  const totals = useMemo(() => {
    return data.reduce(
      (acc, row) => ({
        billableExpenses: acc.billableExpenses + row.billableExpenses,
        nonBillableExpenses: acc.nonBillableExpenses + row.nonBillableExpenses,
        totalExpenses: acc.totalExpenses + row.totalExpenses,
        discounts: acc.discounts + row.discounts,
        tax: acc.tax + row.tax,
        invoiced: acc.invoiced + row.invoiced,
        profit: acc.profit + row.profit,
      }),
      {
        billableExpenses: 0,
        nonBillableExpenses: 0,
        totalExpenses: 0,
        discounts: 0,
        tax: 0,
        invoiced: 0,
        profit: 0,
      }
    );
  }, [data]);

  const totalProfitPercent = totals.invoiced > 0 ? (totals.profit / totals.invoiced) * 100 : 0;

  // Top 10 for chart (by profit)
  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10)
      .map((row) => ({
        name: row.name,
        value: row.profit,
        percentage: row.profitPercent,
      }));
  }, [data]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSort = (field: keyof ProfitRow) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortHeader = ({ field, children }: { field: keyof ProfitRow; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  );

  const getSalespersonName = (person: Salesperson) => {
    return person.full_name || "Unknown";
  };

  const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
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
            <PieChartIcon className="h-8 w-8" />
            Profit Distribution
          </h1>
          <p className="text-muted-foreground mt-1">
            Profit breakdown by client with expense analysis
          </p>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Print Header */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Profit Distribution Report</h1>
        <p className="text-sm text-muted-foreground">
          Grouped by Client |{" "}
          {startDate && endDate
            ? `${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`
            : "All Dates"}
        </p>
      </div>

      {/* Filters */}
      <Collapsible open={!hideSearch} onOpenChange={(open) => setHideSearch(!open)}>
        <Card className="print:hidden">
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <CardTitle className="text-lg">Filters</CardTitle>
                <Button variant="ghost" size="sm">
                  {hideSearch ? "Show" : "Hide"} Search
                </Button>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Left column filters */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Clients" />
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

                  <div className="space-y-2">
                    <Label>Salesperson</Label>
                    <Select value={selectedSalespersonId} onValueChange={setSelectedSalespersonId}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Salespeople" />
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

                  <div className="space-y-2">
                    <Label>Tracking Category</Label>
                    <Select value="all" disabled>
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="exclude-tax"
                      checked={excludeSalesTax}
                      onCheckedChange={(checked) => setExcludeSalesTax(checked as boolean)}
                      disabled
                    />
                    <Label htmlFor="exclude-tax" className="text-sm text-muted-foreground">
                      Exclude Sales Tax
                    </Label>
                  </div>
                </div>

                {/* Middle column filters */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Group By</Label>
                    <Select value={groupBy} disabled>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Show</Label>
                    <Select value="all" disabled>
                      <SelectTrigger>
                        <SelectValue placeholder="All Case Expenses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Case Expenses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Date filters */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>From</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
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

                  <div className="space-y-2">
                    <Label>To</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
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

                {/* Chart type */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Chart Type</Label>
                    <RadioGroup
                      value={chartType}
                      onValueChange={(v) => setChartType(v as "pie" | "bar")}
                      className="flex gap-4 pt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pie" id="profit-pie" />
                        <Label htmlFor="profit-pie" className="font-normal cursor-pointer">
                          Pie
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="bar" id="profit-bar" />
                        <Label htmlFor="profit-bar" className="font-normal cursor-pointer">
                          Bar
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Chart Section */}
      <Collapsible open={chartOpen} onOpenChange={setChartOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <CardTitle className="text-lg">Top 10 Results</CardTitle>
                <Button variant="ghost" size="sm">
                  {chartOpen ? "−" : "+"}
                </Button>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : chartData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No data available for the selected filters.
                </div>
              ) : chartType === "pie" ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={CustomPieLabel}
                      outerRadius={130}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" name="Profit">
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No data available for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader field="name">Client</SortHeader>
                    <SortHeader field="billableExpenses">Billable Expenses</SortHeader>
                    <SortHeader field="nonBillableExpenses">Non-Billable Expenses</SortHeader>
                    <SortHeader field="totalExpenses">Total Expenses</SortHeader>
                    <SortHeader field="discounts">Discounts</SortHeader>
                    <SortHeader field="tax">Tax</SortHeader>
                    <SortHeader field="invoiced">Invoiced</SortHeader>
                    <SortHeader field="profit">Profit</SortHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {row.id !== "no-client" ? (
                          <Link
                            to={`/accounts/${row.id}`}
                            className="text-primary hover:underline"
                          >
                            {row.name}
                          </Link>
                        ) : (
                          row.name
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.billableExpenses)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.nonBillableExpenses)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.totalExpenses)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(row.discounts)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(row.tax)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatCurrency(row.invoiced)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={row.profit >= 0 ? "text-foreground" : "text-destructive"}>
                          {formatCurrency(row.profit)}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          ({formatPercent(row.profitPercent)})
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totals.billableExpenses)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totals.nonBillableExpenses)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totals.totalExpenses)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(totals.discounts)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(totals.tax)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(totals.invoiced)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={totals.profit >= 0 ? "text-foreground" : "text-destructive"}>
                        {formatCurrency(totals.profit)}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        ({formatPercent(totalProfitPercent)})
                      </span>
                    </TableCell>
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
