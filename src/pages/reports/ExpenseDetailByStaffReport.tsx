import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Printer, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface ExpenseRow {
  id: string;
  entryNumber: string;
  date: string;
  caseId: string;
  caseNumber: string;
  item: string;
  quantity: number;
  rate: number;
  total: number;
}

interface StaffExpenseGroup {
  staffId: string;
  staffName: string;
  expenses: ExpenseRow[];
  totalQty: number;
  totalAmount: number;
}

interface StaffMember {
  id: string;
  name: string;
}

interface Category {
  value: string;
  label: string;
}

export default function ExpenseDetailByStaffReport() {
  const { organization } = useOrganization();
  const organizationId = organization?.id;
  const [isLoading, setIsLoading] = useState(false);
  const [staffGroups, setStaffGroups] = useState<StaffExpenseGroup[]>([]);
  const [staffManagers, setStaffManagers] = useState<StaffMember[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Filters
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedStaffManager, setSelectedStaffManager] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [approvedOnly, setApprovedOnly] = useState(false);
  const [groupSimilar, setGroupSimilar] = useState(false);
  const [unbilledOnly, setUnbilledOnly] = useState(false);
  const [hideSearch, setHideSearch] = useState(false);
  
  // Pagination (by staff count)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      if (!organizationId) return;

      // Fetch staff managers via organization_members
      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId);

      if (members && members.length > 0) {
        const userIds = members.map((m) => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds)
          .order("full_name");

        if (profiles) {
          const managers = profiles.map((p) => ({
            id: p.id,
            name: p.full_name || "Unknown",
          }));
          setStaffManagers(managers);
        }
      }

      // Fetch unique categories from case_finances
      const { data: financeCategories } = await supabase
        .from("case_finances")
        .select("category")
        .eq("organization_id", organizationId)
        .eq("finance_type", "expense")
        .not("category", "is", null);

      if (financeCategories) {
        const uniqueCategories = [...new Set(financeCategories.map((f) => f.category).filter(Boolean))];
        setCategories(uniqueCategories.map((c) => ({ value: c!, label: c! })));
      }
    };

    fetchFilterOptions();
  }, [organizationId]);

  const fetchExpenses = async () => {
    if (!organizationId) return;
    setIsLoading(true);

    try {
      // Build query
      let query = supabase
        .from("case_finances")
        .select(`
          id,
          date,
          user_id,
          case_id,
          category,
          quantity,
          unit_price,
          amount,
          status,
          invoiced
        `)
        .eq("organization_id", organizationId)
        .eq("finance_type", "expense")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (approvedOnly) {
        query = query.eq("status", "approved");
      }

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      if (unbilledOnly) {
        query = query.eq("invoiced", false);
      }

      const { data: expenseData, error } = await query;

      if (error) throw error;

      if (!expenseData || expenseData.length === 0) {
        setStaffGroups([]);
        setIsLoading(false);
        return;
      }

      // Get unique IDs for related data
      const userIds = [...new Set(expenseData.map((e) => e.user_id).filter(Boolean))];
      const caseIds = [...new Set(expenseData.map((e) => e.case_id).filter(Boolean))];

      // Fetch related data in parallel
      const [profilesResult, casesResult] = await Promise.all([
        userIds.length > 0
          ? supabase.from("profiles").select("id, full_name").in("id", userIds)
          : Promise.resolve({ data: [] }),
        caseIds.length > 0
          ? supabase.from("cases").select("id, case_number").in("id", caseIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profilesMap = new Map(
        (profilesResult.data || []).map((p) => [p.id, p.full_name || "Unknown"])
      );
      const casesMap = new Map(
        (casesResult.data || []).map((c) => [c.id, c.case_number])
      );

      // Group expenses by staff
      const groupedByStaff: Record<string, StaffExpenseGroup> = {};
      let entryCounter = 1;

      expenseData.forEach((expense) => {
        const staffId = expense.user_id || "unknown";
        const staffName = expense.user_id ? (profilesMap.get(expense.user_id) || "Unknown") : "Unknown";
        
        if (!groupedByStaff[staffId]) {
          groupedByStaff[staffId] = {
            staffId,
            staffName: formatStaffName(staffName),
            expenses: [],
            totalQty: 0,
            totalAmount: 0,
          };
        }

        const expenseRow: ExpenseRow = {
          id: expense.id,
          entryNumber: `EXP-${String(entryCounter++).padStart(5, "0")}`,
          date: expense.date,
          caseId: expense.case_id || "",
          caseNumber: expense.case_id ? (casesMap.get(expense.case_id) || "-") : "-",
          item: expense.category || "-",
          quantity: expense.quantity || 1,
          rate: expense.unit_price || 0,
          total: expense.amount || 0,
        };

        groupedByStaff[staffId].expenses.push(expenseRow);
        groupedByStaff[staffId].totalQty += expenseRow.quantity;
        groupedByStaff[staffId].totalAmount += expenseRow.total;
      });

      // Convert to array and sort by staff name
      const sortedGroups = Object.values(groupedByStaff).sort((a, b) =>
        a.staffName.localeCompare(b.staffName)
      );

      setStaffGroups(sortedGroups);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount and when organization changes
  useEffect(() => {
    fetchExpenses();
  }, [organizationId]);

  // Paginate staff groups
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return staffGroups.slice(start, start + pageSize);
  }, [staffGroups, currentPage, pageSize]);

  const totalPages = Math.ceil(staffGroups.length / pageSize);
  const showingStart = staffGroups.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const showingEnd = Math.min(currentPage * pageSize, staffGroups.length);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  function formatStaffName(name: string): string {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}`;
    }
    return name;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "MMM d, yyyy");
  };

  return (
    <div className="space-y-4 print:space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/reports">
              <ArrowLeft className="h-4 w-4 mr-2" />
              All Reports
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Expense Detail by Staff</h1>
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

      {/* Print Header */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Expense Detail by Staff</h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(startDate), "MM/dd/yyyy")} - {format(new Date(endDate), "MM/dd/yyyy")}
        </p>
      </div>

      {/* Filters */}
      <Collapsible open={!hideSearch} onOpenChange={(open) => setHideSearch(!open)}>
        <Card className="print:hidden">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filters</CardTitle>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {hideSearch ? "Show Search" : "Hide Search"}
                  {hideSearch ? <ChevronDown className="h-4 w-4 ml-1" /> : <ChevronUp className="h-4 w-4 ml-1" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Date Range */}
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                {/* Staff Manager */}
                <div className="space-y-2">
                  <Label>Staff Manager</Label>
                  <Select value={selectedStaffManager} onValueChange={setSelectedStaffManager}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Managers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Managers</SelectItem>
                      {staffManagers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="approved"
                    checked={approvedOnly}
                    onCheckedChange={(checked) => setApprovedOnly(checked as boolean)}
                  />
                  <Label htmlFor="approved" className="cursor-pointer">
                    Only Show Approved Expenses
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="groupSimilar"
                    checked={groupSimilar}
                    onCheckedChange={(checked) => setGroupSimilar(checked as boolean)}
                  />
                  <Label htmlFor="groupSimilar" className="cursor-pointer">
                    Group Similar Items
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="unbilled"
                    checked={unbilledOnly}
                    onCheckedChange={(checked) => setUnbilledOnly(checked as boolean)}
                  />
                  <Label htmlFor="unbilled" className="cursor-pointer">
                    Only Show Unbilled Expenses
                  </Label>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={fetchExpenses} disabled={isLoading}>
                  {isLoading ? "Loading..." : "Update"}
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {showingStart} - {showingEnd} of {staffGroups.length} staff members
      </div>

      {/* Staff Groups */}
      <div className="space-y-6">
        {paginatedGroups.map((group) => (
          <Card key={group.staffId}>
            <CardHeader className="py-3 bg-muted/30">
              <CardTitle className="text-lg font-bold">{group.staffName}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Entry Number</TableHead>
                    <TableHead>Case</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell>
                        <span className="text-primary font-medium cursor-pointer hover:underline">
                          {expense.entryNumber}
                        </span>
                      </TableCell>
                      <TableCell>
                        {expense.caseId ? (
                          <Link
                            to={`/cases/${expense.caseId}`}
                            className="text-primary font-medium hover:underline"
                          >
                            {expense.caseNumber}
                          </Link>
                        ) : (
                          expense.caseNumber
                        )}
                      </TableCell>
                      <TableCell>{expense.item}</TableCell>
                      <TableCell className="text-right">{expense.quantity.toFixed(3)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(expense.rate)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(expense.total)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Subtotal Row */}
                  <TableRow className="bg-muted/30 font-bold">
                    <TableCell colSpan={4}></TableCell>
                    <TableCell className="text-right text-green-600">
                      {group.totalQty.toFixed(0)}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(group.totalAmount)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}

        {staffGroups.length === 0 && !isLoading && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No expenses found for the selected filters.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
