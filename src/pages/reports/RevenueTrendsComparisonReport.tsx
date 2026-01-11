import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Printer, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from "lucide-react";
import { format, parseISO, getMonth, getYear } from "date-fns";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/contexts/OrganizationContext";
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

interface MonthlyData {
  month: string;
  monthIndex: number;
  year1Value: number;
  year2Value: number;
  change: number;
}

interface Salesperson {
  id: string;
  full_name: string;
}

interface Client {
  id: string;
  name: string;
}

type Method = "billed" | "collected";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const RevenueTrendsComparisonReport = () => {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const organizationId = organization?.id;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MonthlyData[]>([]);
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Current year for default selection
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Filters
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>("all");
  const [year1, setYear1] = useState<number>(currentYear - 1);
  const [year2, setYear2] = useState<number>(currentYear);
  const [method, setMethod] = useState<Method>("billed");
  const [hideSearch, setHideSearch] = useState(false);

  // Available years (last 10 years)
  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= currentYear - 10; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      if (!organizationId) return;

      // Fetch salespersons
      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId);

      if (members && members.length > 0) {
        const userIds = members.map((m) => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        if (profiles) {
          setSalespersons(
            profiles.map((p) => ({
              id: p.id,
              full_name: p.full_name || "Unknown",
            }))
          );
        }
      }

      // Fetch clients
      const { data: accounts } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("organization_id", organizationId)
        .order("name");

      if (accounts) {
        setClients(accounts);
      }
    };

    fetchFilterOptions();
  }, [organizationId]);

  // Fetch revenue data
  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId) return;

      setLoading(true);

      // Initialize monthly totals
      const year1Totals: number[] = Array(12).fill(0);
      const year2Totals: number[] = Array(12).fill(0);

      if (method === "billed") {
        // Fetch invoices for both years
        const startDate1 = `${year1}-01-01`;
        const endDate1 = `${year1}-12-31`;
        const startDate2 = `${year2}-01-01`;
        const endDate2 = `${year2}-12-31`;

        const { data: invoices, error } = await supabase
          .from("invoices")
          .select(`
            id,
            date,
            total,
            case_id
          `)
          .eq("organization_id", organizationId)
          .or(`and(date.gte.${startDate1},date.lte.${endDate1}),and(date.gte.${startDate2},date.lte.${endDate2})`);

        if (error) {
          console.error("Error fetching invoices:", error);
          setLoading(false);
          return;
        }

        if (invoices && invoices.length > 0) {
          // Get case info for filtering
          const caseIds = [...new Set(invoices.map((inv) => inv.case_id).filter(Boolean))];
          
          let caseMap = new Map<string, { account_id: string; case_manager_id: string | null }>();
          
          if (caseIds.length > 0) {
            const { data: cases } = await supabase
              .from("cases")
              .select("id, account_id, case_manager_id")
              .in("id", caseIds);

            if (cases) {
              caseMap = new Map(cases.map((c) => [c.id, { account_id: c.account_id || "", case_manager_id: c.case_manager_id }]));
            }
          }

          // Process invoices
          invoices.forEach((invoice) => {
            const caseData = caseMap.get(invoice.case_id);
            
            // Apply filters
            if (selectedClientId !== "all" && caseData?.account_id !== selectedClientId) {
              return;
            }
            if (selectedSalespersonId !== "all" && caseData?.case_manager_id !== selectedSalespersonId) {
              return;
            }

            const invoiceDate = parseISO(invoice.date);
            const invoiceYear = getYear(invoiceDate);
            const invoiceMonth = getMonth(invoiceDate);

            if (invoiceYear === year1) {
              year1Totals[invoiceMonth] += invoice.total;
            } else if (invoiceYear === year2) {
              year2Totals[invoiceMonth] += invoice.total;
            }
          });
        }
      } else {
        // Collected - fetch payments from case_finances
        const startDate1 = `${year1}-01-01`;
        const endDate1 = `${year1}-12-31`;
        const startDate2 = `${year2}-01-01`;
        const endDate2 = `${year2}-12-31`;

        const { data: payments, error } = await supabase
          .from("case_finances")
          .select(`
            id,
            date,
            amount,
            case_id,
            finance_type
          `)
          .eq("organization_id", organizationId)
          .eq("finance_type", "payment")
          .or(`and(date.gte.${startDate1},date.lte.${endDate1}),and(date.gte.${startDate2},date.lte.${endDate2})`);

        if (error) {
          console.error("Error fetching payments:", error);
          setLoading(false);
          return;
        }

        if (payments && payments.length > 0) {
          // Get case info for filtering
          const caseIds = [...new Set(payments.map((p) => p.case_id).filter(Boolean))];
          
          let caseMap = new Map<string, { account_id: string; case_manager_id: string | null }>();
          
          if (caseIds.length > 0) {
            const { data: cases } = await supabase
              .from("cases")
              .select("id, account_id, case_manager_id")
              .in("id", caseIds);

            if (cases) {
              caseMap = new Map(cases.map((c) => [c.id, { account_id: c.account_id || "", case_manager_id: c.case_manager_id }]));
            }
          }

          // Process payments
          payments.forEach((payment) => {
            const caseData = caseMap.get(payment.case_id);
            
            // Apply filters
            if (selectedClientId !== "all" && caseData?.account_id !== selectedClientId) {
              return;
            }
            if (selectedSalespersonId !== "all" && caseData?.case_manager_id !== selectedSalespersonId) {
              return;
            }

            const paymentDate = parseISO(payment.date);
            const paymentYear = getYear(paymentDate);
            const paymentMonth = getMonth(paymentDate);

            // Payments are typically negative, so use absolute value
            const amount = Math.abs(payment.amount);

            if (paymentYear === year1) {
              year1Totals[paymentMonth] += amount;
            } else if (paymentYear === year2) {
              year2Totals[paymentMonth] += amount;
            }
          });
        }
      }

      // Build monthly data
      const monthlyData: MonthlyData[] = MONTHS.map((month, index) => {
        const year1Value = year1Totals[index];
        const year2Value = year2Totals[index];
        const change = year1Value > 0 
          ? ((year2Value - year1Value) / year1Value) * 100 
          : year2Value > 0 ? 100 : 0;

        return {
          month,
          monthIndex: index,
          year1Value,
          year2Value,
          change,
        };
      });

      setData(monthlyData);
      setLoading(false);
    };

    fetchData();
  }, [organizationId, selectedClientId, selectedSalespersonId, year1, year2, method]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    // Month to date (current month comparison)
    const mtdYear1 = data[currentMonth]?.year1Value || 0;
    const mtdYear2 = data[currentMonth]?.year2Value || 0;
    const mtdChange = mtdYear1 > 0 ? ((mtdYear2 - mtdYear1) / mtdYear1) * 100 : mtdYear2 > 0 ? 100 : 0;

    // Year to date
    const ytdYear1 = data.slice(0, currentMonth + 1).reduce((sum, m) => sum + m.year1Value, 0);
    const ytdYear2 = data.slice(0, currentMonth + 1).reduce((sum, m) => sum + m.year2Value, 0);
    const ytdChange = ytdYear1 > 0 ? ((ytdYear2 - ytdYear1) / ytdYear1) * 100 : ytdYear2 > 0 ? 100 : 0;

    return {
      mtdYear1,
      mtdYear2,
      mtdChange,
      ytdYear1,
      ytdYear2,
      ytdChange,
    };
  }, [data, currentMonth]);

  // Chart data
  const chartData = useMemo(() => {
    return data.map((d) => ({
      month: d.month,
      [year1]: d.year1Value,
      [year2]: d.year2Value,
    }));
  }, [data, year1, year2]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/reports")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Revenue Trends Comparison</h1>
            <p className="text-muted-foreground">
              Year-over-year revenue comparison
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Filters */}
      <Collapsible open={!hideSearch} onOpenChange={(open) => setHideSearch(!open)}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filters</CardTitle>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {hideSearch ? (
                    <>
                      Show Filters <ChevronDown className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Hide Filters <ChevronUp className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Client */}
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select
                    value={selectedClientId}
                    onValueChange={setSelectedClientId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Compare Years */}
                <div className="space-y-2">
                  <Label>Compare</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={year1.toString()}
                      onValueChange={(v) => setYear1(parseInt(v))}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map((y) => (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">vs</span>
                    <Select
                      value={year2.toString()}
                      onValueChange={(v) => setYear2(parseInt(v))}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map((y) => (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Method */}
                <div className="space-y-2">
                  <Label>Method</Label>
                  <RadioGroup
                    value={method}
                    onValueChange={(v) => setMethod(v as Method)}
                    className="flex items-center gap-4 h-10"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="billed" id="billed" />
                      <Label htmlFor="billed" className="font-normal cursor-pointer">Billed</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="collected" id="collected" />
                      <Label htmlFor="collected" className="font-normal cursor-pointer">Collected</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Salesperson */}
                <div className="space-y-2">
                  <Label>Salesperson</Label>
                  <Select
                    value={selectedSalespersonId}
                    onValueChange={setSelectedSalespersonId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Salespeople" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Salespeople</SelectItem>
                      {salespersons.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id}>
                          {sp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[400px] w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-[300px] w-full" />
        </div>
      ) : (
        <>
          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                {year1} vs {year2} Revenue Trends Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis 
                    tickFormatter={(value) => 
                      new Intl.NumberFormat("en-US", {
                        notation: "compact",
                        compactDisplay: "short",
                      }).format(value)
                    }
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ fontWeight: "bold" }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={year1}
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={{ fill: "#06b6d4", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey={year2}
                    stroke="#ec4899"
                    strokeWidth={2}
                    dot={{ fill: "#ec4899", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Month to Date */}
            <Card>
              <CardContent className="pt-6 text-center">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Month to Date</h3>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-bold">{formatCurrency(summaryStats.mtdYear2)}</span>
                  <span className={cn(
                    "text-sm font-medium flex items-center",
                    summaryStats.mtdChange >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    ({Math.abs(summaryStats.mtdChange).toFixed(2)}%
                    {summaryStats.mtdChange >= 0 ? (
                      <TrendingUp className="h-3 w-3 ml-0.5" />
                    ) : (
                      <TrendingDown className="h-3 w-3 ml-0.5" />
                    )}
                    )
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  vs {formatCurrency(summaryStats.mtdYear1)} in {year1}
                </p>
              </CardContent>
            </Card>

            {/* Year to Date */}
            <Card>
              <CardContent className="pt-6 text-center">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Year to Date</h3>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-bold">{formatCurrency(summaryStats.ytdYear2)}</span>
                  <span className={cn(
                    "text-sm font-medium flex items-center",
                    summaryStats.ytdChange >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    ({Math.abs(summaryStats.ytdChange).toFixed(2)}%
                    {summaryStats.ytdChange >= 0 ? (
                      <TrendingUp className="h-3 w-3 ml-0.5" />
                    ) : (
                      <TrendingDown className="h-3 w-3 ml-0.5" />
                    )}
                    )
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  vs {formatCurrency(summaryStats.ytdYear1)} in {year1}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Data Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{year1}</TableHead>
                    <TableHead className="text-right">{year1}</TableHead>
                    <TableHead className="text-right">{year2}</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.year1Value)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.year2Value)}</TableCell>
                      <TableCell className={cn(
                        "text-right",
                        row.change >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {row.year1Value > 0 || row.year2Value > 0 ? (
                          `${row.change >= 0 ? "" : ""}${row.change.toFixed(2)}%`
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default RevenueTrendsComparisonReport;
