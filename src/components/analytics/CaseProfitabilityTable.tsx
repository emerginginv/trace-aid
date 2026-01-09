import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { type TimeRange, resolveTimeRange } from "@/lib/analytics";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface CaseProfitabilityTableProps {
  organizationId: string;
  timeRange: TimeRange;
}

interface CaseProfitability {
  id: string;
  caseNumber: string;
  title: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
  status: "profit" | "break-even" | "loss";
}

type SortField = "revenue" | "costs" | "profit" | "margin";
type SortDirection = "asc" | "desc";

export function CaseProfitabilityTable({ organizationId, timeRange }: CaseProfitabilityTableProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<CaseProfitability[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("profit");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    async function fetchData() {
      if (!organizationId) return;
      setLoading(true);

      try {
        const { start, end } = resolveTimeRange(timeRange);

        // Fetch cases
        const { data: cases } = await supabase
          .from("cases")
          .select("id, case_number, title")
          .eq("organization_id", organizationId);

        if (!cases || cases.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        const caseIds = cases.map((c) => c.id);

        // Fetch invoices grouped by case
        const { data: invoices } = await supabase
          .from("invoices")
          .select("case_id, total")
          .in("case_id", caseIds)
          .gte("date", start.toISOString())
          .lte("date", end.toISOString());

        // Fetch costs grouped by case
        const { data: finances } = await supabase
          .from("case_finances")
          .select("case_id, amount, finance_type")
          .in("case_id", caseIds)
          .in("finance_type", ["time", "expense"])
          .gte("date", start.toISOString())
          .lte("date", end.toISOString());

        // Calculate profitability per case
        const revenueMap = new Map<string, number>();
        const costsMap = new Map<string, number>();

        (invoices || []).forEach((inv) => {
          revenueMap.set(inv.case_id, (revenueMap.get(inv.case_id) || 0) + (inv.total || 0));
        });

        (finances || []).forEach((f) => {
          costsMap.set(f.case_id, (costsMap.get(f.case_id) || 0) + (f.amount || 0));
        });

        const profitabilityData: CaseProfitability[] = cases
          .map((c) => {
            const revenue = revenueMap.get(c.id) || 0;
            const costs = costsMap.get(c.id) || 0;
            const profit = revenue - costs;
            const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

            let status: "profit" | "break-even" | "loss" = "break-even";
            if (profit > 0) status = "profit";
            else if (profit < 0) status = "loss";

            return {
              id: c.id,
              caseNumber: c.case_number,
              title: c.title,
              revenue,
              costs,
              profit,
              margin,
              status,
            };
          })
          .filter((c) => c.revenue > 0 || c.costs > 0); // Only show cases with financial activity

        setData(profitabilityData);
      } catch (error) {
        console.error("Error fetching case profitability:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [organizationId, timeRange]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const multiplier = sortDirection === "asc" ? 1 : -1;
    return (a[sortField] - b[sortField]) * multiplier;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: CaseProfitability["status"], margin: number) => {
    switch (status) {
      case "profit":
        return (
          <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25">
            <TrendingUp className="h-3 w-3 mr-1" />
            {margin.toFixed(1)}%
          </Badge>
        );
      case "loss":
        return (
          <Badge variant="destructive" className="bg-destructive/15 text-destructive hover:bg-destructive/25">
            <TrendingDown className="h-3 w-3 mr-1" />
            {margin.toFixed(1)}%
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Minus className="h-3 w-3 mr-1" />
            0%
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Case Profitability</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case Profitability</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No case financial data available for this period
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Case</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort("revenue")}
                    >
                      Revenue
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort("costs")}
                    >
                      Costs
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort("profit")}
                    >
                      Profit
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort("margin")}
                    >
                      Margin
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.slice(0, 10).map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/cases/${item.id}`)}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.caseNumber}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[250px]">
                          {item.title}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-chart-2 font-medium">
                      {formatCurrency(item.revenue)}
                    </TableCell>
                    <TableCell className="text-chart-1 font-medium">
                      {formatCurrency(item.costs)}
                    </TableCell>
                    <TableCell className={`font-bold ${item.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                      {formatCurrency(item.profit)}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status, item.margin)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {data.length > 10 && (
          <p className="text-sm text-muted-foreground mt-3 text-center">
            Showing top 10 of {data.length} cases with financial activity
          </p>
        )}
      </CardContent>
    </Card>
  );
}
