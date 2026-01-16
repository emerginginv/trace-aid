import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBudgetCurrency, formatBudgetHours } from "@/lib/budgetUtils";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Download, Clock, Receipt } from "lucide-react";
import type { ResolvedTimeRange } from "@/lib/analytics/time-ranges";

interface TimeExpenseTableProps {
  organizationId: string;
  timeRange?: ResolvedTimeRange;
}

type EntryType = "all" | "time" | "expense";

export function TimeExpenseTable({ 
  organizationId,
  timeRange 
}: TimeExpenseTableProps) {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<EntryType>("all");
  const [caseSearch, setCaseSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const { data, isLoading } = useQuery({
    queryKey: ["time-expense-table", organizationId, timeRange, typeFilter],
    queryFn: async () => {
      // MIGRATED: Fetch from canonical tables instead of case_finances
      const results: any[] = [];

      // Fetch time entries if not filtering to expenses only
      if (typeFilter !== "expense") {
        let timeQuery = supabase
          .from("time_entries")
          .select("id, created_at, hours, rate, total, status, item_type, notes, case_id, user_id")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });

        if (timeRange) {
          timeQuery = timeQuery
            .gte("created_at", timeRange.start.toISOString())
            .lte("created_at", timeRange.end.toISOString());
        }

        const { data: timeData } = await timeQuery;
        (timeData || []).forEach(entry => {
          results.push({
            id: entry.id,
            date: entry.created_at.split('T')[0],
            finance_type: 'time',
            description: entry.notes || entry.item_type || 'Time Entry',
            category: entry.item_type,
            hours: entry.hours,
            hourly_rate: entry.rate,
            amount: entry.total,
            status: entry.status,
            invoiced: false, // TODO: Add invoice tracking to canonical tables
            case_id: entry.case_id,
            user_id: entry.user_id,
          });
        });
      }

      // Fetch expense entries if not filtering to time only
      if (typeFilter !== "time") {
        let expenseQuery = supabase
          .from("expense_entries")
          .select("id, created_at, quantity, rate, total, status, item_type, notes, case_id, user_id")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });

        if (timeRange) {
          expenseQuery = expenseQuery
            .gte("created_at", timeRange.start.toISOString())
            .lte("created_at", timeRange.end.toISOString());
        }

        const { data: expenseData } = await expenseQuery;
        (expenseData || []).forEach(entry => {
          results.push({
            id: entry.id,
            date: entry.created_at.split('T')[0],
            finance_type: 'expense',
            description: entry.notes || entry.item_type || 'Expense',
            category: entry.item_type,
            hours: null,
            hourly_rate: entry.rate,
            amount: entry.total,
            status: entry.status,
            invoiced: false,
            case_id: entry.case_id,
            user_id: entry.user_id,
          });
        });
      }

      // Sort by date descending
      results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Fetch case info
      const caseIds = [...new Set(results.map(e => e.case_id).filter(Boolean))];
      const { data: cases } = await supabase
        .from("cases")
        .select("id, case_number, title")
        .in("id", caseIds);

      const caseMap = new Map(cases?.map(c => [c.id, { case_number: c.case_number, title: c.title }]) || []);

      // Fetch user names
      const userIds = [...new Set(results.map(e => e.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name || p.email]) || []);

      return results.map(entry => {
        const caseInfo = caseMap.get(entry.case_id);
        return {
          ...entry,
          caseNumber: caseInfo?.case_number || "",
          caseTitle: caseInfo?.title || "",
          userName: profileMap.get(entry.user_id) || "Unknown",
        };
      });
    },
    enabled: !!organizationId,
  });

  // Filter by case search
  const filteredData = data?.filter(entry => {
    if (!caseSearch) return true;
    const search = caseSearch.toLowerCase();
    return (
      entry.caseNumber?.toLowerCase().includes(search) ||
      entry.caseTitle?.toLowerCase().includes(search) ||
      entry.description?.toLowerCase().includes(search)
    );
  }) || [];

  // Paginate
  const paginatedData = filteredData.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  const exportToCsv = () => {
    if (!filteredData.length) return;

    const headers = ["Date", "Case", "Type", "Description", "Category", "Hours", "Rate", "Amount", "Status", "User"];
    const rows = filteredData.map(entry => [
      entry.date,
      entry.caseNumber,
      entry.finance_type,
      entry.description,
      entry.category || "",
      entry.hours || "",
      entry.hourly_rate || "",
      entry.amount,
      entry.status || "",
      entry.userName,
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `time-expenses-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Time & Expense Details</CardTitle>
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Time & Expense Details</CardTitle>
          <Button variant="outline" size="sm" onClick={exportToCsv} disabled={!filteredData.length}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as EntryType); setPage(0); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="time">Time Only</SelectItem>
              <SelectItem value="expense">Expenses Only</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Search cases..."
            value={caseSearch}
            onChange={(e) => { setCaseSearch(e.target.value); setPage(0); }}
            className="max-w-[250px]"
          />
          <div className="ml-auto text-sm text-muted-foreground">
            {filteredData.length} entries
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No entries found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((entry) => (
                  <TableRow 
                    key={entry.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/cases/${entry.case_id}`)}
                  >
                    <TableCell className="font-medium">
                      {format(parseISO(entry.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{entry.caseNumber}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {entry.caseTitle}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.finance_type === "time" ? "default" : "secondary"}>
                        {entry.finance_type === "time" ? (
                          <><Clock className="h-3 w-3 mr-1" /> Time</>
                        ) : (
                          <><Receipt className="h-3 w-3 mr-1" /> Expense</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[250px]">
                      <div className="truncate">{entry.description}</div>
                      {entry.category && (
                        <div className="text-xs text-muted-foreground">{entry.category}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.hours ? formatBudgetHours(entry.hours) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatBudgetCurrency(entry.amount)}
                    </TableCell>
                    <TableCell>
                      {entry.invoiced ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Invoiced
                        </Badge>
                      ) : entry.status ? (
                        <Badge variant="outline">{entry.status}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
