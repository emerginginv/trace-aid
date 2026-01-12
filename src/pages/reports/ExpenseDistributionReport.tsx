import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowUpDown, Printer, Download, ChevronDown, ChevronUp } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

type GroupByOption = "staff" | "category" | "case";
type ChartMetric = "hours" | "money" | "entries";
type ChartType = "pie" | "bar";
type SortField = "name" | "entries" | "hours" | "total";
type SortDirection = "asc" | "desc";

interface ExpenseDistributionGroup {
  id: string;
  name: string;
  entries: number;
  hours: number;
  total: number;
  percentage: number;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#7c3aed",
  "#06b6d4",
  "#ec4899",
  "#eab308",
  "#64748b",
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

export default function ExpenseDistributionReport() {
  const { organization } = useOrganization();
  const [showFilters, setShowFilters] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<GroupByOption>("staff");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("money");
  const [chartType, setChartType] = useState<ChartType>("pie");
  const [onlyApproved, setOnlyApproved] = useState(false);
  const [onlyUnbilled, setOnlyUnbilled] = useState(false);
  const [startDate, setStartDate] = useState(() =>
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(() =>
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Fetch staff for filter dropdown
  const { data: staffMembers } = useQuery({
    queryKey: ["staff-members", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organization.id);
      
      if (!data) return [];
      
      // Fetch profiles separately
      const userIds = data.map(m => m.user_id).filter(Boolean) as string[];
      if (userIds.length === 0) return [];
      
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      
      return data.map(m => {
        const profile = profilesData?.find(p => p.id === m.user_id);
        return {
          user_id: m.user_id,
          full_name: profile?.full_name || "Unknown"
        };
      });
    },
    enabled: !!organization?.id,
  });

  // Fetch expense categories
  const { data: categories } = useQuery({
    queryKey: ["expense-categories", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data } = await supabase
        .from("case_finances")
        .select("category")
        .eq("organization_id", organization.id)
        .eq("finance_type", "expense")
        .not("category", "is", null);
      const uniqueCategories = [...new Set(data?.map((d) => d.category))];
      return uniqueCategories.filter(Boolean) as string[];
    },
    enabled: !!organization?.id,
  });

  // Fetch expenses
  const { data: expenseData, isLoading } = useQuery({
    queryKey: [
      "expense-distribution",
      organization?.id,
      startDate,
      endDate,
      selectedUser,
      selectedCategory,
      onlyApproved,
      onlyUnbilled,
    ],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from("case_finances")
        .select(`
          id,
          user_id,
          case_id,
          category,
          quantity,
          amount,
          status,
          invoiced
        `)
        .eq("organization_id", organization.id)
        .eq("finance_type", "expense")
        .gte("date", startDate)
        .lte("date", endDate);

      if (selectedUser !== "all") {
        query = query.eq("user_id", selectedUser);
      }
      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }
      if (onlyApproved) {
        query = query.eq("status", "approved");
      }
      if (onlyUnbilled) {
        query = query.eq("invoiced", false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id,
  });

  // Fetch profiles for staff names
  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-expenses", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return {};
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name");
      const profileMap: Record<string, string> = {};
      data?.forEach((p) => {
        profileMap[p.id] = p.full_name || "Unknown";
      });
      return profileMap;
    },
    enabled: !!organization?.id,
  });

  // Fetch cases for case grouping
  const { data: casesMap } = useQuery({
    queryKey: ["cases-for-expenses", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return {};
      const { data } = await supabase
        .from("cases")
        .select("id, case_number, title")
        .eq("organization_id", organization.id);
      const caseMap: Record<string, string> = {};
      data?.forEach((c) => {
        caseMap[c.id] = c.case_number || c.title || "Unknown Case";
      });
      return caseMap;
    },
    enabled: !!organization?.id,
  });

  // Group and aggregate data
  const groupedData = useMemo(() => {
    if (!expenseData || !profiles) return [];

    const grouped: Record<string, ExpenseDistributionGroup> = {};

    expenseData.forEach((expense) => {
      let key: string;
      let name: string;

      switch (groupBy) {
        case "staff":
          key = expense.user_id || "unknown";
          name = profiles[key] || "Unknown Staff";
          break;
        case "category":
          key = expense.category || "uncategorized";
          name = expense.category || "Uncategorized";
          break;
        case "case":
          key = expense.case_id || "unknown";
          name = casesMap?.[key] || "Unknown Case";
          break;
        default:
          key = "unknown";
          name = "Unknown";
      }

      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          name,
          entries: 0,
          hours: 0,
          total: 0,
          percentage: 0,
        };
      }

      grouped[key].entries += 1;
      grouped[key].hours += expense.quantity || 0;
      grouped[key].total += expense.amount || 0;
    });

    const groups = Object.values(grouped);

    // Calculate percentages based on chart metric
    const totalValue = groups.reduce((sum, g) => {
      switch (chartMetric) {
        case "entries":
          return sum + g.entries;
        case "hours":
          return sum + g.hours;
        case "money":
        default:
          return sum + g.total;
      }
    }, 0);

    groups.forEach((g) => {
      const value =
        chartMetric === "entries"
          ? g.entries
          : chartMetric === "hours"
          ? g.hours
          : g.total;
      g.percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
    });

    // Sort groups
    groups.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case "entries":
          aVal = a.entries;
          bVal = b.entries;
          break;
        case "hours":
          aVal = a.hours;
          bVal = b.hours;
          break;
        case "total":
          aVal = a.total;
          bVal = b.total;
          break;
        case "name":
        default:
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return groups;
  }, [expenseData, profiles, casesMap, groupBy, chartMetric, sortField, sortDirection]);

  // Chart data (top 10)
  const chartData = useMemo(() => {
    const sortedByMetric = [...groupedData].sort((a, b) => {
      const aVal =
        chartMetric === "entries"
          ? a.entries
          : chartMetric === "hours"
          ? a.hours
          : a.total;
      const bVal =
        chartMetric === "entries"
          ? b.entries
          : chartMetric === "hours"
          ? b.hours
          : b.total;
      return bVal - aVal;
    });

    return sortedByMetric.slice(0, 10).map((g, index) => ({
      name: g.name,
      value:
        chartMetric === "entries"
          ? g.entries
          : chartMetric === "hours"
          ? g.hours
          : g.total,
      percentage: g.percentage,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [groupedData, chartMetric]);

  // Grand totals
  const grandTotals = useMemo(() => {
    return groupedData.reduce(
      (acc, g) => ({
        entries: acc.entries + g.entries,
        hours: acc.hours + g.hours,
        total: acc.total + g.total,
      }),
      { entries: 0, hours: 0, total: 0 }
    );
  }, [groupedData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getChartMetricLabel = () => {
    switch (chartMetric) {
      case "entries":
        return "Entries";
      case "hours":
        return "Hours";
      case "money":
      default:
        return "Money";
    }
  };

  const getGroupByLabel = () => {
    switch (groupBy) {
      case "category":
        return "Category";
      case "case":
        return "Case";
      case "staff":
      default:
        return "Staff";
    }
  };

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ percentage }) => `${percentage.toFixed(0)}%`}
          outerRadius={100}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) =>
            chartMetric === "money" ? formatCurrency(value) : value.toFixed(2)
          }
        />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical">
        <XAxis type="number" />
        <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number) =>
            chartMetric === "money" ? formatCurrency(value) : value.toFixed(2)
          }
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Expense Distribution</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {showFilters ? "Hide Search" : "Show Search"}
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {staffMembers?.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id || ""}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Group By</Label>
                <Select
                  value={groupBy}
                  onValueChange={(v) => setGroupBy(v as GroupByOption)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="case">Case</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories?.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Chart</Label>
                <RadioGroup
                  value={chartMetric}
                  onValueChange={(v) => setChartMetric(v as ChartMetric)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hours" id="hours" />
                    <Label htmlFor="hours" className="font-normal">Hours</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="money" id="money" />
                    <Label htmlFor="money" className="font-normal">Money</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="entries" id="entries" />
                    <Label htmlFor="entries" className="font-normal">Entries</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Chart Type</Label>
                <RadioGroup
                  value={chartType}
                  onValueChange={(v) => setChartType(v as ChartType)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pie" id="pie" />
                    <Label htmlFor="pie" className="font-normal">Pie</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bar" id="bar" />
                    <Label htmlFor="bar" className="font-normal">Bar</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="flex items-end gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="approved"
                    checked={onlyApproved}
                    onCheckedChange={(checked) => setOnlyApproved(checked === true)}
                  />
                  <Label htmlFor="approved" className="font-normal">
                    Only Show Approved Expenses
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="unbilled"
                    checked={onlyUnbilled}
                    onCheckedChange={(checked) => setOnlyUnbilled(checked === true)}
                  />
                  <Label htmlFor="unbilled" className="font-normal">
                    Only Show Unbilled Expenses
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button>Update</Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Chart Section */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Results ({getChartMetricLabel()})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                {chartType === "pie" ? renderPieChart() : renderBarChart()}
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Legend</h4>
                {chartData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="truncate">
                      {item.name} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    {getGroupByLabel()}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort("entries")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Entries
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort("hours")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Hours
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort("total")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Total
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedData.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell className="text-right">
                    <span className="text-primary cursor-pointer hover:underline">
                      {group.entries}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{group.hours.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(group.total)}</TableCell>
                </TableRow>
              ))}
              {/* Grand Total Row */}
              <TableRow className="bg-muted/30 font-bold">
                <TableCell>Grand Total</TableCell>
                <TableCell className="text-right">{grandTotals.entries}</TableCell>
                <TableCell className="text-right">{grandTotals.hours.toFixed(2)}</TableCell>
                <TableCell className="text-right">{formatCurrency(grandTotals.total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
