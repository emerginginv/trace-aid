import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Printer, PieChart as PieChartIcon, CalendarIcon } from "lucide-react";
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

interface DistributionRow {
  id: string;
  name: string;
  total: number;
  percentage: number;
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

export default function IncomeDistributionReport() {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<"client" | "salesperson">("client");
  const [chartType, setChartType] = useState<"pie" | "bar">("pie");
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DistributionRow[]>([]);
  const [chartOpen, setChartOpen] = useState(true);

  useSetBreadcrumbs([
    { label: "Reports", href: "/reports" },
    { label: "Income Distribution" },
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

  // Fetch distribution data
  useEffect(() => {
    if (!organizationId || !startDate || !endDate) return;

    const fetchData = async () => {
      setLoading(true);

      try {
        // Query invoices with total_paid (collected revenue)
        let query = supabase
          .from("invoices")
          .select(`
            id,
            total_paid,
            case_id,
            cases!inner(
              account_id,
              case_manager_id,
              organization_id,
              accounts(id, name)
            )
          `)
          .eq("cases.organization_id", organizationId)
          .gte("date", format(startDate, "yyyy-MM-dd"))
          .lte("date", format(endDate, "yyyy-MM-dd"))
          .gt("total_paid", 0);

        if (selectedAccountId !== "all") {
          query = query.eq("cases.account_id", selectedAccountId);
        }

        if (selectedSalespersonId !== "all") {
          query = query.eq("cases.case_manager_id", selectedSalespersonId);
        }

        const { data: invoiceData, error: invoiceError } = await query;

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

        // Group by selected dimension
        const grouped: Record<string, { id: string; name: string; total: number }> = {};

        if (groupBy === "client") {
          invoiceData.forEach((inv) => {
            const caseData = inv.cases as any;
            const accountId = caseData?.account_id || "no-client";
            const accountName = caseData?.accounts?.name || "No Client";
            const paid = Number(inv.total_paid) || 0;

            if (!grouped[accountId]) {
              grouped[accountId] = { id: accountId, name: accountName, total: 0 };
            }
            grouped[accountId].total += paid;
          });
        } else {
          // Group by salesperson (case manager)
          const managerIds = new Set(
            invoiceData
              .map((inv) => (inv.cases as any)?.case_manager_id)
              .filter(Boolean)
          );

          // Fetch manager names
          const { data: managers } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", Array.from(managerIds));

          const managerMap: Record<string, string> = {};
          managers?.forEach((m) => {
            managerMap[m.id] = m.full_name || "Unknown";
          });

          invoiceData.forEach((inv) => {
            const caseData = inv.cases as any;
            const managerId = caseData?.case_manager_id || "no-manager";
            const managerName = managerMap[managerId] || "Unassigned";
            const paid = Number(inv.total_paid) || 0;

            if (!grouped[managerId]) {
              grouped[managerId] = { id: managerId, name: managerName, total: 0 };
            }
            grouped[managerId].total += paid;
          });
        }

        // Calculate percentages and sort by total descending
        const grandTotal = Object.values(grouped).reduce((sum, g) => sum + g.total, 0);
        const rows: DistributionRow[] = Object.values(grouped)
          .map((g) => ({
            id: g.id,
            name: g.name,
            total: g.total,
            percentage: grandTotal > 0 ? (g.total / grandTotal) * 100 : 0,
          }))
          .sort((a, b) => b.total - a.total);

        setData(rows);
      } catch (error) {
        console.error("Error fetching income distribution data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId, selectedAccountId, selectedSalespersonId, groupBy, startDate, endDate]);

  // Grand total
  const grandTotal = useMemo(() => {
    return data.reduce((sum, row) => sum + row.total, 0);
  }, [data]);

  // Top 10 for chart
  const chartData = useMemo(() => {
    return data.slice(0, 10).map((row) => ({
      name: row.name,
      value: row.total,
      percentage: row.percentage,
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

  const getSalespersonName = (person: Salesperson) => {
    return person.full_name || "Unknown";
  };

  const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show label for small slices
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
            Income Distribution
          </h1>
          <p className="text-muted-foreground mt-1">
            Payment totals grouped by client or salesperson
          </p>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Print Header */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Income Distribution Report</h1>
        <p className="text-sm text-muted-foreground">
          Grouped by {groupBy === "client" ? "Client" : "Salesperson"} |{" "}
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

            {/* Group By */}
            <div className="space-y-2">
              <Label>Group By</Label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as "client" | "salesperson")}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="salesperson">Salesperson</SelectItem>
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

            {/* Chart Type */}
            <div className="space-y-2">
              <Label>Chart Type</Label>
              <RadioGroup
                value={chartType}
                onValueChange={(v) => setChartType(v as "pie" | "bar")}
                className="flex gap-4 pt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pie" id="pie" />
                  <Label htmlFor="pie" className="font-normal cursor-pointer">
                    Pie
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bar" id="bar" />
                  <Label htmlFor="bar" className="font-normal cursor-pointer">
                    Bar
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

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
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                    <Legend
                      formatter={(value, entry: any) => {
                        const item = chartData.find((d) => d.name === value);
                        return `${value} (${item ? formatPercent(item.percentage) : ""})`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      width={100}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar dataKey="value" name="Payment Total" radius={[0, 4, 4, 0]}>
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
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No data found for the selected filters.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{groupBy === "client" ? "Client" : "Salesperson"}</TableHead>
                    <TableHead className="text-right">Payment Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {groupBy === "client" && row.id !== "no-client" ? (
                          <Link
                            to={`/clients/${row.id}`}
                            className="text-primary hover:underline"
                          >
                            {row.name}
                          </Link>
                        ) : (
                          <span>{row.name}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-primary font-medium">
                        {formatCurrency(row.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Grand Total Row */}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(grandTotal)}</TableCell>
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
