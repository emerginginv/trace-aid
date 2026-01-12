import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { Printer, Download, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import { startOfWeek, addDays, format, parseISO } from "date-fns";

type MethodType = "hours" | "wages" | "expenses";
type SortDirection = "asc" | "desc";

interface StaffDayData {
  staffId: string;
  staffName: string;
  days: Record<number, number>;
  total: number;
}

interface DayColumn {
  dayIndex: number;
  dayName: string;
  date: Date;
  formattedDate: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

export default function ExpensesByDayReport() {
  const { organization } = useOrganization();
  const [weekBegin, setWeekBegin] = useState(() => {
    const today = new Date();
    const sunday = startOfWeek(today, { weekStartsOn: 0 });
    return format(sunday, "yyyy-MM-dd");
  });
  const [method, setMethod] = useState<MethodType>("hours");
  const [staffManager, setStaffManager] = useState<string>("all");
  const [onlyApproved, setOnlyApproved] = useState(false);
  const [hideSearch, setHideSearch] = useState(false);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Calculate week columns
  const dayColumns = useMemo<DayColumn[]>(() => {
    const start = startOfWeek(parseISO(weekBegin), { weekStartsOn: 0 });
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName, i) => ({
      dayIndex: i,
      dayName,
      date: addDays(start, i),
      formattedDate: format(addDays(start, i), "M/d/yy"),
    }));
  }, [weekBegin]);

  const weekStart = dayColumns[0]?.date;
  const weekEnd = dayColumns[6]?.date;

  // Fetch organization members
  const { data: orgMembers } = useQuery({
    queryKey: ["org-members", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organization.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id,
  });

  // Fetch profiles for staff names
  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-expenses-by-day", orgMembers],
    queryFn: async () => {
      if (!orgMembers || orgMembers.length === 0) return [];
      const userIds = orgMembers.map((m) => m.user_id);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgMembers && orgMembers.length > 0,
  });

  // Fetch expense data for the week
  const { data: expenseData, isLoading } = useQuery({
    queryKey: [
      "expenses-by-day",
      organization?.id,
      weekStart,
      weekEnd,
      onlyApproved,
    ],
    queryFn: async () => {
      if (!organization?.id || !weekStart || !weekEnd) return [];

      let query = supabase
        .from("case_finances")
        .select("id, date, user_id, quantity, amount, status")
        .eq("organization_id", organization.id)
        .eq("finance_type", "expense")
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"));

      if (onlyApproved) {
        query = query.eq("status", "approved");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id && !!weekStart && !!weekEnd,
  });

  // Group data by staff and day
  const staffData = useMemo<StaffDayData[]>(() => {
    if (!expenseData || !profiles) return [];

    const profileMap = new Map(profiles.map((p) => [p.id, p.full_name || "Unknown"]));
    const grouped: Record<string, StaffDayData> = {};

    expenseData.forEach((expense) => {
      const staffId = expense.user_id;
      if (!staffId) return;

      const expenseDate = parseISO(expense.date);
      const dayIndex = expenseDate.getDay();

      if (!grouped[staffId]) {
        grouped[staffId] = {
          staffId,
          staffName: profileMap.get(staffId) || "Unknown",
          days: {},
          total: 0,
        };
      }

      const value = method === "hours" ? (expense.quantity || 0) : (expense.amount || 0);
      grouped[staffId].days[dayIndex] = (grouped[staffId].days[dayIndex] || 0) + value;
      grouped[staffId].total += value;
    });

    // Convert to array and sort
    const result = Object.values(grouped);
    result.sort((a, b) => {
      const comparison = a.staffName.localeCompare(b.staffName);
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [expenseData, profiles, method, sortDirection]);

  // Calculate day totals
  const dayTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    for (let i = 0; i < 7; i++) {
      totals[i] = staffData.reduce((sum, staff) => sum + (staff.days[i] || 0), 0);
    }
    return totals;
  }, [staffData]);

  // Calculate grand total
  const grandTotal = useMemo(() => {
    return staffData.reduce((sum, staff) => sum + staff.total, 0);
  }, [staffData]);

  const toggleSort = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const formatValue = (value: number) => {
    if (method === "hours") {
      return value.toFixed(2);
    }
    return formatCurrency(value);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses by Day</h1>
          <p className="text-muted-foreground">
            Weekly calendar view of expenses by staff
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
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
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHideSearch(!hideSearch)}
            >
              {hideSearch ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
              {hideSearch ? "Show Search" : "Hide Search"}
            </Button>
          </div>
        </CardHeader>
        {!hideSearch && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Week Begin */}
              <div className="space-y-2">
                <Label>Week Begin</Label>
                <Input
                  type="date"
                  value={weekBegin}
                  onChange={(e) => setWeekBegin(e.target.value)}
                />
              </div>

              {/* Method */}
              <div className="space-y-2">
                <Label>Method</Label>
                <RadioGroup
                  value={method}
                  onValueChange={(v) => setMethod(v as MethodType)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hours" id="method-hours" />
                    <Label htmlFor="method-hours" className="cursor-pointer">
                      Hours
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="wages" id="method-wages" />
                    <Label htmlFor="method-wages" className="cursor-pointer">
                      Wages
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="expenses" id="method-expenses" />
                    <Label htmlFor="method-expenses" className="cursor-pointer">
                      Expenses
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Staff Manager */}
              <div className="space-y-2">
                <Label>Staff Manager</Label>
                <Select value={staffManager} onValueChange={setStaffManager}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Managers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Managers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Staff Tags */}
              <div className="space-y-2">
                <Label>Staff Tags</Label>
                <Input placeholder="Enter tags..." />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Tracking Category */}
              <div className="space-y-2">
                <Label>Tracking Category</Label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Only Show Approved */}
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="approved-only"
                  checked={onlyApproved}
                  onCheckedChange={(checked) => setOnlyApproved(checked === true)}
                />
                <Label htmlFor="approved-only" className="cursor-pointer">
                  Only Show Approved Expenses
                </Label>
              </div>
            </div>

            <div className="flex justify-end">
              <Button>Update</Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={toggleSort}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  {dayColumns.map((col) => (
                    <TableHead key={col.dayIndex} className="text-center min-w-[80px]">
                      <div className="flex flex-col">
                        <span>{col.dayName}</span>
                        <span className="text-xs text-muted-foreground">
                          {col.formattedDate}
                        </span>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : staffData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No data available for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {staffData.map((staff) => (
                      <TableRow key={staff.staffId}>
                        <TableCell className="font-medium">{staff.staffName}</TableCell>
                        {dayColumns.map((col) => (
                          <TableCell key={col.dayIndex} className="text-center">
                            {staff.days[col.dayIndex] ? (
                              <span className="text-blue-600 cursor-pointer hover:underline">
                                {formatValue(staff.days[col.dayIndex])}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="text-right">
                          <span className="text-blue-600 cursor-pointer hover:underline font-medium">
                            {formatValue(staff.total)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-muted/30 font-bold">
                      <TableCell></TableCell>
                      {dayColumns.map((col) => (
                        <TableCell key={col.dayIndex} className="text-center">
                          {dayTotals[col.dayIndex] ? (
                            <span className="text-blue-600">
                              {formatValue(dayTotals[col.dayIndex])}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <span className="text-blue-600">
                          {formatValue(grandTotal)}
                        </span>
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
