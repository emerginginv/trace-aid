import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subQuarters, subYears } from "date-fns";
import { ArrowLeft, Printer, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

interface PeriodData {
  [period: string]: number;
}

interface ClientTrendData {
  clientId: string;
  clientName: string;
  periodData: PeriodData;
  total: number;
  avgChangePercent: number;
  dollarChange: number;
  trendDirection: "up" | "down" | "neutral";
}

type IntervalUnit = "months" | "quarters" | "years";
type ShowType = "billed" | "collected";

export default function SalesTrendDetailReport() {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  
  // Filter states
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>("all");
  const [showType, setShowType] = useState<ShowType>("billed");
  const [intervalCount, setIntervalCount] = useState<number>(3);
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>("months");
  const [endingPeriod, setEndingPeriod] = useState<string>("last");
  const [hideSearch, setHideSearch] = useState(false);
  
  // Data states
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [salespeople, setSalespeople] = useState<Array<{ id: string; name: string }>>([]);
  const [trendData, setTrendData] = useState<ClientTrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [periods, setPeriods] = useState<string[]>([]);

  // Fetch filter options
  useEffect(() => {
    if (!organization?.id) return;

    const fetchFilterOptions = async () => {
      // Fetch clients
      const { data: accountsData } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("organization_id", organization.id)
        .order("name");

      if (accountsData) {
        setClients(accountsData);
      }

      // Fetch salespeople (case managers)
      const { data: membersData } = await supabase
        .from("organization_members")
        .select("user_id, profiles(id, first_name, last_name)")
        .eq("organization_id", organization.id);

      if (membersData) {
        const salesList = membersData
          .filter((m: any) => m.profiles)
          .map((m: any) => ({
            id: m.profiles.id,
            name: `${m.profiles.first_name || ""} ${m.profiles.last_name || ""}`.trim() || "Unknown",
          }));
        setSalespeople(salesList);
      }
    };

    fetchFilterOptions();
  }, [organization?.id]);

  // Calculate periods based on interval settings
  const calculatePeriods = useMemo(() => {
    const now = new Date();
    const periodsArray: string[] = [];
    
    for (let i = intervalCount - 1; i >= 0; i--) {
      let periodDate: Date;
      let periodLabel: string;
      
      if (intervalUnit === "months") {
        // For "last" period, use the previous complete month
        const baseDate = endingPeriod === "last" ? subMonths(now, 1) : now;
        periodDate = subMonths(baseDate, i);
        periodLabel = format(periodDate, "yyyy-MM");
      } else if (intervalUnit === "quarters") {
        const baseDate = endingPeriod === "last" ? subQuarters(now, 1) : now;
        periodDate = subQuarters(baseDate, i);
        const quarter = Math.ceil((periodDate.getMonth() + 1) / 3);
        periodLabel = `${format(periodDate, "yyyy")}-Q${quarter}`;
      } else {
        const baseDate = endingPeriod === "last" ? subYears(now, 1) : now;
        periodDate = subYears(baseDate, i);
        periodLabel = format(periodDate, "yyyy");
      }
      
      periodsArray.push(periodLabel);
    }
    
    return periodsArray;
  }, [intervalCount, intervalUnit, endingPeriod]);

  // Fetch report data
  const fetchReportData = async () => {
    if (!organization?.id) return;
    
    setIsLoading(true);
    setPeriods(calculatePeriods);
    
    try {
      // Calculate date range
      const now = new Date();
      let startDate: Date;
      let endDate: Date;
      
      if (intervalUnit === "months") {
        const baseDate = endingPeriod === "last" ? subMonths(now, 1) : now;
        startDate = startOfMonth(subMonths(baseDate, intervalCount - 1));
        endDate = endOfMonth(baseDate);
      } else if (intervalUnit === "quarters") {
        const baseDate = endingPeriod === "last" ? subQuarters(now, 1) : now;
        startDate = startOfQuarter(subQuarters(baseDate, intervalCount - 1));
        endDate = endOfQuarter(baseDate);
      } else {
        const baseDate = endingPeriod === "last" ? subYears(now, 1) : now;
        startDate = startOfYear(subYears(baseDate, intervalCount - 1));
        endDate = endOfYear(baseDate);
      }

      // Build query
      let query = supabase
        .from("invoices")
        .select(`
          id,
          total,
          total_paid,
          date,
          case_id,
          cases!inner(
            id,
            account_id,
            case_manager_id,
            accounts(id, name)
          )
        `)
        .eq("organization_id", organization.id)
        .gte("date", format(startDate, "yyyy-MM-dd"))
        .lte("date", format(endDate, "yyyy-MM-dd"));

      if (selectedClient !== "all") {
        query = query.eq("cases.account_id", selectedClient);
      }

      if (selectedSalesperson !== "all") {
        query = query.eq("cases.case_manager_id", selectedSalesperson);
      }

      const { data: invoicesData, error } = await query;

      if (error) {
        console.error("Error fetching invoices:", error);
        setTrendData([]);
        setIsLoading(false);
        return;
      }

      // Group by client and period
      const clientPeriodMap = new Map<string, { name: string; periods: PeriodData }>();

      invoicesData?.forEach((invoice: any) => {
        const account = invoice.cases?.accounts;
        const clientId = account?.id || "no-client";
        const clientName = account?.name || "No Client";
        const invoiceDate = new Date(invoice.date);
        
        let periodLabel: string;
        if (intervalUnit === "months") {
          periodLabel = format(invoiceDate, "yyyy-MM");
        } else if (intervalUnit === "quarters") {
          const quarter = Math.ceil((invoiceDate.getMonth() + 1) / 3);
          periodLabel = `${format(invoiceDate, "yyyy")}-Q${quarter}`;
        } else {
          periodLabel = format(invoiceDate, "yyyy");
        }

        const amount = showType === "billed" ? (invoice.total || 0) : (invoice.total_paid || 0);

        if (!clientPeriodMap.has(clientId)) {
          clientPeriodMap.set(clientId, { name: clientName, periods: {} });
        }

        const clientData = clientPeriodMap.get(clientId)!;
        clientData.periods[periodLabel] = (clientData.periods[periodLabel] || 0) + amount;
      });

      // Calculate trends for each client
      const trendResults: ClientTrendData[] = [];
      const periodsList = calculatePeriods;

      clientPeriodMap.forEach((data, clientId) => {
        const periodValues = periodsList.map(p => data.periods[p] || 0);
        const total = periodValues.reduce((sum, val) => sum + val, 0);

        // Calculate period-over-period changes
        const changes: number[] = [];
        for (let i = 1; i < periodValues.length; i++) {
          if (periodValues[i - 1] !== 0) {
            const change = ((periodValues[i] - periodValues[i - 1]) / periodValues[i - 1]) * 100;
            changes.push(change);
          }
        }

        const avgChangePercent = changes.length > 0 
          ? changes.reduce((sum, val) => sum + val, 0) / changes.length 
          : 0;

        // Dollar change: last period - first period
        const dollarChange = periodValues[periodValues.length - 1] - periodValues[0];

        const trendDirection: "up" | "down" | "neutral" = 
          avgChangePercent > 0 ? "up" : avgChangePercent < 0 ? "down" : "neutral";

        trendResults.push({
          clientId,
          clientName: data.name,
          periodData: data.periods,
          total,
          avgChangePercent,
          dollarChange,
          trendDirection,
        });
      });

      // Sort by average change descending
      trendResults.sort((a, b) => b.avgChangePercent - a.avgChangePercent);

      setTrendData(trendResults);
    } catch (err) {
      console.error("Error fetching report data:", err);
      setTrendData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [organization?.id]);

  // Calculate grand totals
  const grandTotals = useMemo(() => {
    const periodTotals: PeriodData = {};
    periods.forEach(p => {
      periodTotals[p] = trendData.reduce((sum, row) => sum + (row.periodData[p] || 0), 0);
    });

    const grandTotal = trendData.reduce((sum, row) => sum + row.total, 0);
    const avgDollarChange = trendData.length > 0
      ? trendData.reduce((sum, row) => sum + row.dollarChange, 0) / trendData.length
      : 0;

    // Calculate overall avg change from period totals
    const periodValues = periods.map(p => periodTotals[p] || 0);
    const changes: number[] = [];
    for (let i = 1; i < periodValues.length; i++) {
      if (periodValues[i - 1] !== 0) {
        const change = ((periodValues[i] - periodValues[i - 1]) / periodValues[i - 1]) * 100;
        changes.push(change);
      }
    }
    const avgChangePercent = changes.length > 0 
      ? changes.reduce((sum, val) => sum + val, 0) / changes.length 
      : 0;

    return {
      periodTotals,
      grandTotal,
      avgDollarChange,
      avgChangePercent,
    };
  }, [trendData, periods]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "" : ""}${value.toFixed(1)}%`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Sales Trend Detail</h1>
            <p className="text-muted-foreground">
              Period-over-period sales trends with change indicators by client
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Filters */}
      {!hideSearch && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Client Filter */}
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
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

              {/* Salesperson Filter */}
              <div className="space-y-2">
                <Label>Salesperson</Label>
                <Select value={selectedSalesperson} onValueChange={setSelectedSalesperson}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Salespeople" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Salespeople</SelectItem>
                    {salespeople.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id}>
                        {sp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Interval */}
              <div className="space-y-2">
                <Label>Interval</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={intervalCount}
                    onChange={(e) => setIntervalCount(parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                  <Select value={intervalUnit} onValueChange={(v) => setIntervalUnit(v as IntervalUnit)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="quarters">Quarters</SelectItem>
                      <SelectItem value="years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Ending Period */}
              <div className="space-y-2">
                <Label>Ending</Label>
                <Select value={endingPeriod} onValueChange={setEndingPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last">Last Period</SelectItem>
                    <SelectItem value="current">Current Period</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              {/* Show Radio */}
              <div className="space-y-2">
                <Label>Show</Label>
                <RadioGroup
                  value={showType}
                  onValueChange={(v) => setShowType(v as ShowType)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="billed" id="billed" />
                    <Label htmlFor="billed" className="font-normal">Billed</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="collected" id="collected" />
                    <Label htmlFor="collected" className="font-normal">Collected</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Hide Search Toggle */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hideSearch"
                  checked={hideSearch}
                  onCheckedChange={(checked) => setHideSearch(checked === true)}
                />
                <Label htmlFor="hideSearch" className="font-normal">Hide Search</Label>
              </div>

              <Button onClick={fetchReportData}>Update</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {hideSearch && (
        <Button variant="link" onClick={() => setHideSearch(false)} className="text-primary">
          Show Filters
        </Button>
      )}

      {/* Data Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : trendData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No data found for the selected criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Trend</TableHead>
                    <TableHead className="text-right">Avg. Change</TableHead>
                    <TableHead className="text-right">$ Change</TableHead>
                    <TableHead>Client</TableHead>
                    {periods.map((period) => (
                      <TableHead key={period} className="text-right">
                        {period}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trendData.map((row) => (
                    <TableRow key={row.clientId}>
                      <TableCell>
                        {row.trendDirection === "up" ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : row.trendDirection === "down" ? (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell 
                        className={`text-right ${
                          row.avgChangePercent > 0 
                            ? "text-green-600" 
                            : row.avgChangePercent < 0 
                            ? "text-destructive" 
                            : ""
                        }`}
                      >
                        {formatPercent(row.avgChangePercent)}
                      </TableCell>
                      <TableCell 
                        className={`text-right ${
                          row.dollarChange > 0 
                            ? "text-green-600" 
                            : row.dollarChange < 0 
                            ? "text-destructive" 
                            : ""
                        }`}
                      >
                        ({formatCurrency(Math.abs(row.dollarChange))})
                      </TableCell>
                      <TableCell>
                        {row.clientId !== "no-client" ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto text-primary"
                            onClick={() => navigate(`/accounts/${row.clientId}`)}
                          >
                            {row.clientName}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">{row.clientName}</span>
                        )}
                      </TableCell>
                      {periods.map((period) => {
                        const value = row.periodData[period] || 0;
                        return (
                          <TableCell 
                            key={period} 
                            className={`text-right ${value === 0 ? "text-destructive" : ""}`}
                          >
                            {formatCurrency(value)}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.total)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>
                      {grandTotals.avgChangePercent > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : grandTotals.avgChangePercent < 0 ? (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      ) : (
                        <span>—</span>
                      )}
                    </TableCell>
                    <TableCell 
                      className={`text-right ${
                        grandTotals.avgChangePercent > 0 
                          ? "text-green-600" 
                          : grandTotals.avgChangePercent < 0 
                          ? "text-destructive" 
                          : ""
                      }`}
                    >
                      {formatPercent(grandTotals.avgChangePercent)}
                    </TableCell>
                    <TableCell 
                      className={`text-right ${
                        grandTotals.avgDollarChange > 0 
                          ? "text-green-600" 
                          : grandTotals.avgDollarChange < 0 
                          ? "text-destructive" 
                          : ""
                      }`}
                    >
                      ({formatCurrency(Math.abs(grandTotals.avgDollarChange))})
                    </TableCell>
                    <TableCell>Totals</TableCell>
                    {periods.map((period) => (
                      <TableCell key={period} className="text-right">
                        {formatCurrency(grandTotals.periodTotals[period] || 0)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      {formatCurrency(grandTotals.grandTotal)}
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
