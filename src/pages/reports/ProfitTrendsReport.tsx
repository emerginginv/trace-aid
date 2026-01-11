import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Printer, TrendingUp } from "lucide-react";
import { format, startOfYear, endOfYear, eachMonthOfInterval, parseISO } from "date-fns";
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
import {
  LineChart,
  Line,
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

interface MonthlyData {
  month: string;
  monthIndex: number;
  expensed: number;
  invoiced: number;
  margin: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ProfitTrendsReport() {
  const { organization } = useOrganization();
  const organizationId = organization?.id;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [method, setMethod] = useState<"billed" | "collected">("billed");
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  
  useSetBreadcrumbs([
    { label: "Reports", href: "/reports" },
    { label: "Profit Trends" },
  ]);

  // Get available years (current year and 5 years back)
  const availableYears = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

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

  // Fetch data when filters change
  useEffect(() => {
    if (!organizationId) return;
    
    const fetchData = async () => {
      setLoading(true);
      
      const yearStart = startOfYear(new Date(selectedYear, 0, 1));
      const yearEnd = endOfYear(new Date(selectedYear, 0, 1));
      
      // Initialize monthly data structure
      const monthlyResults: MonthlyData[] = MONTHS.map((month, index) => ({
        month,
        monthIndex: index,
        expensed: 0,
        invoiced: 0,
        margin: 0,
      }));
      
      try {
        // Fetch expenses (time + expenses from case_finances)
        let expenseQuery = supabase
          .from("case_finances")
          .select(`
            amount,
            date,
            cases!inner(account_id, organization_id)
          `)
          .eq("cases.organization_id", organizationId)
          .gte("date", format(yearStart, "yyyy-MM-dd"))
          .lte("date", format(yearEnd, "yyyy-MM-dd"))
          .in("finance_type", ["time", "expense"]);
        
        if (selectedAccountId !== "all") {
          expenseQuery = expenseQuery.eq("cases.account_id", selectedAccountId);
        }
        
        const { data: expenseData, error: expenseError } = await expenseQuery;
        
        if (!expenseError && expenseData) {
          expenseData.forEach((item) => {
            const monthIndex = parseISO(item.date).getMonth();
            monthlyResults[monthIndex].expensed += Number(item.amount) || 0;
          });
        }
        
        // Fetch invoices
        let invoiceQuery = supabase
          .from("invoices")
          .select(`
            total,
            total_paid,
            date,
            cases!inner(account_id, organization_id)
          `)
          .eq("cases.organization_id", organizationId)
          .gte("date", format(yearStart, "yyyy-MM-dd"))
          .lte("date", format(yearEnd, "yyyy-MM-dd"));
        
        if (selectedAccountId !== "all") {
          invoiceQuery = invoiceQuery.eq("cases.account_id", selectedAccountId);
        }
        
        const { data: invoiceData, error: invoiceError } = await invoiceQuery;
        
        if (!invoiceError && invoiceData) {
          invoiceData.forEach((item) => {
            const monthIndex = parseISO(item.date).getMonth();
            const amount = method === "billed" 
              ? (Number(item.total) || 0) 
              : (Number(item.total_paid) || 0);
            monthlyResults[monthIndex].invoiced += amount;
          });
        }
        
        // Calculate margins
        monthlyResults.forEach((month) => {
          if (month.invoiced > 0) {
            month.margin = ((month.invoiced - month.expensed) / month.invoiced) * 100;
          } else {
            month.margin = 0;
          }
        });
        
        setMonthlyData(monthlyResults);
      } catch (error) {
        console.error("Error fetching profit trends data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [organizationId, selectedAccountId, selectedYear, method]);

  // Calculate totals
  const totals = monthlyData.reduce(
    (acc, month) => ({
      expensed: acc.expensed + month.expensed,
      invoiced: acc.invoiced + month.invoiced,
    }),
    { expensed: 0, invoiced: 0 }
  );
  
  const totalMargin = totals.invoiced > 0 
    ? ((totals.invoiced - totals.expensed) / totals.invoiced) * 100 
    : 0;

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
            <TrendingUp className="h-8 w-8" />
            Profit Trends
          </h1>
          <p className="text-muted-foreground mt-1">
            Monthly expensed vs invoiced comparison with profit margins
          </p>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Print Header */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Profit Trends Report</h1>
        <p className="text-sm text-muted-foreground">
          {selectedAccountId === "all" ? "All Clients" : accounts.find(a => a.id === selectedAccountId)?.name} | {selectedYear} | {method === "billed" ? "Billed" : "Collected"}
        </p>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6">
            {/* Client Filter */}
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="w-[200px]">
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

            {/* Year Filter */}
            <div className="space-y-2">
              <Label>Year</Label>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Method Toggle */}
            <div className="space-y-2">
              <Label>Method</Label>
              <RadioGroup
                value={method}
                onValueChange={(v) => setMethod(v as "billed" | "collected")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="billed" id="billed" />
                  <Label htmlFor="billed" className="font-normal cursor-pointer">
                    Billed
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="collected" id="collected" />
                  <Label htmlFor="collected" className="font-normal cursor-pointer">
                    Collected
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expensed vs Invoiced Profit Trends</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelClassName="font-medium"
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="expensed"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  name="Expensed"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="invoiced"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  name="Invoiced"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Expensed</TableHead>
                    <TableHead className="text-right">Invoiced</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.expensed)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.invoiced)}</TableCell>
                      <TableCell className="text-right">{formatPercent(row.margin)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.expensed)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.invoiced)}</TableCell>
                    <TableCell className="text-right">{formatPercent(totalMargin)}</TableCell>
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
