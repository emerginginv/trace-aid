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
  staffName: string;
  staffId: string;
  caseId: string;
  caseNumber: string;
  item: string;
  quantity: number;
  rate: number;
  total: number;
  invoiceId: string | null;
  invoiceNumber: string | null;
  status: string | null;
}

interface StaffMember {
  id: string;
  name: string;
}

interface Category {
  value: string;
  label: string;
}

export default function ExpenseDetailReport() {
  const { organization } = useOrganization();
  const organizationId = organization?.id;
  const [isLoading, setIsLoading] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [caseManagers, setCaseManagers] = useState<StaffMember[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Filters
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedStaff, setSelectedStaff] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCaseManager, setSelectedCaseManager] = useState("all");
  const [unbilledOnly, setUnbilledOnly] = useState(false);
  const [hideSearch, setHideSearch] = useState(false);
  
  // Sorting
  const [sortField, setSortField] = useState<keyof ExpenseRow>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Fetch staff members and case managers
  useEffect(() => {
    const fetchFilterOptions = async () => {
      if (!organizationId) return;

      // Fetch staff members via organization_members
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
          const staff = profiles.map((p) => ({
            id: p.id,
            name: p.full_name || "Unknown",
          }));
          setStaffMembers(staff);
          setCaseManagers(staff);
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
          invoiced,
          invoice_id
        `)
        .eq("organization_id", organizationId)
        .eq("finance_type", "expense")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (selectedStaff !== "all") {
        query = query.eq("user_id", selectedStaff);
      }

      if (selectedStatus !== "all") {
        query = query.eq("status", selectedStatus);
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
        setExpenses([]);
        setIsLoading(false);
        return;
      }

      // Get unique IDs for related data
      const userIds = [...new Set(expenseData.map((e) => e.user_id).filter(Boolean))];
      const caseIds = [...new Set(expenseData.map((e) => e.case_id).filter(Boolean))];
      const invoiceIds = [...new Set(expenseData.map((e) => e.invoice_id).filter(Boolean))];

      // Fetch related data in parallel
      const [profilesResult, casesResult, invoicesResult] = await Promise.all([
        userIds.length > 0
          ? supabase.from("profiles").select("id, full_name").in("id", userIds)
          : Promise.resolve({ data: [] }),
        caseIds.length > 0
          ? supabase.from("cases").select("id, case_number, case_manager_id").in("id", caseIds)
          : Promise.resolve({ data: [] }),
        invoiceIds.length > 0
          ? supabase.from("invoices").select("id, invoice_number").in("id", invoiceIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profilesMap = new Map(
        (profilesResult.data || []).map((p) => [p.id, p.full_name || "Unknown"])
      );
      const casesMap = new Map(
        (casesResult.data || []).map((c) => [c.id, { caseNumber: c.case_number, caseManagerId: c.case_manager_id }])
      );
      const invoicesMap = new Map(
        (invoicesResult.data || []).map((i) => [i.id, i.invoice_number])
      );

      // Filter by case manager if selected
      let filteredExpenses = expenseData;
      if (selectedCaseManager !== "all") {
        const caseManagerCaseIds = new Set(
          (casesResult.data || [])
            .filter((c) => c.case_manager_id === selectedCaseManager)
            .map((c) => c.id)
        );
        filteredExpenses = expenseData.filter((e) => e.case_id && caseManagerCaseIds.has(e.case_id));
      }

      // Map to ExpenseRow format
      const mappedExpenses: ExpenseRow[] = filteredExpenses.map((expense, index) => {
        const caseInfo = expense.case_id ? casesMap.get(expense.case_id) : null;
        return {
          id: expense.id,
          entryNumber: `EXP-${String(index + 1).padStart(5, "0")}`,
          date: expense.date,
          staffName: expense.user_id ? (profilesMap.get(expense.user_id) || "Unknown") : "Unknown",
          staffId: expense.user_id || "",
          caseId: expense.case_id || "",
          caseNumber: caseInfo?.caseNumber || "-",
          item: expense.category || "-",
          quantity: expense.quantity || 1,
          rate: expense.unit_price || 0,
          total: expense.amount || 0,
          invoiceId: expense.invoice_id,
          invoiceNumber: expense.invoice_id ? (invoicesMap.get(expense.invoice_id) || null) : null,
          status: expense.status,
        };
      });

      setExpenses(mappedExpenses);
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

  // Sort data
  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });
  }, [expenses, sortField, sortDirection]);

  // Paginate data
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedExpenses.slice(start, start + pageSize);
  }, [sortedExpenses, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedExpenses.length / pageSize);
  const showingStart = sortedExpenses.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const showingEnd = Math.min(currentPage * pageSize, sortedExpenses.length);

  const handleSort = (field: keyof ExpenseRow) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatStaffName = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}`;
    }
    return name;
  };

  const SortIcon = ({ field }: { field: keyof ExpenseRow }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
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
          <h1 className="text-2xl font-bold">Expense Detail</h1>
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
        <h1 className="text-xl font-bold">Expense Detail</h1>
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
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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

                {/* Staff */}
                <div className="space-y-2">
                  <Label>Staff</Label>
                  <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Staff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff</SelectItem>
                      {staffMembers.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Entry Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
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

                {/* Case Manager */}
                <div className="space-y-2">
                  <Label>Case Manager</Label>
                  <Select value={selectedCaseManager} onValueChange={setSelectedCaseManager}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Case Managers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Case Managers</SelectItem>
                      {caseManagers.map((cm) => (
                        <SelectItem key={cm.id} value={cm.id}>
                          {cm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
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
        Showing {showingStart} - {showingEnd} of {sortedExpenses.length}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("entryNumber")}
                >
                  Entry <SortIcon field="entryNumber" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("date")}
                >
                  Date <SortIcon field="date" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("staffName")}
                >
                  Staff <SortIcon field="staffName" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("caseNumber")}
                >
                  Case <SortIcon field="caseNumber" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("item")}
                >
                  Item <SortIcon field="item" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort("quantity")}
                >
                  Qty <SortIcon field="quantity" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort("rate")}
                >
                  Rate <SortIcon field="rate" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort("total")}
                >
                  Total <SortIcon field="total" />
                </TableHead>
                <TableHead>Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {isLoading ? "Loading expenses..." : "No expenses found for the selected filters."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <span className="text-primary hover:underline cursor-pointer">
                        {expense.entryNumber}
                      </span>
                    </TableCell>
                    <TableCell>{format(new Date(expense.date), "MM/dd/yyyy")}</TableCell>
                    <TableCell>{formatStaffName(expense.staffName)}</TableCell>
                    <TableCell>
                      {expense.caseId ? (
                        <Link 
                          to={`/cases/${expense.caseId}`}
                          className="text-primary hover:underline"
                        >
                          {expense.caseNumber}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{expense.item}</TableCell>
                    <TableCell className="text-right">{expense.quantity.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(expense.rate)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(expense.total)}</TableCell>
                    <TableCell>
                      {expense.invoiceNumber ? (
                        <Link 
                          to={`/invoices/${expense.invoiceId}`}
                          className="text-primary hover:underline"
                        >
                          {expense.invoiceNumber}
                        </Link>
                      ) : (
                        ""
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
                  className="w-8"
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
