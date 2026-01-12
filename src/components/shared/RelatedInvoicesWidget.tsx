import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Button } from "@/components/ui/button";
import { Receipt, Search, ExternalLink, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface RelatedInvoicesWidgetProps {
  entityType: "account" | "contact";
  entityId: string;
}

interface InvoiceItem {
  id: string;
  invoice_number: string;
  case_id: string;
  case_number: string;
  case_title: string;
  date: string;
  due_date: string | null;
  total: number;
  balance_due: number | null;
  status: string;
}

type SortColumn = "invoice_number" | "case_number" | "date" | "due_date" | "total" | "balance_due" | "status";
type SortDirection = "asc" | "desc";

const INITIAL_LIMIT = 25;
const LOAD_MORE_LIMIT = 25;

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "partial", label: "Partial" },
  { value: "void", label: "Void" },
];

const getStatusStyle = (status: string) => {
  switch (status.toLowerCase()) {
    case "paid":
      return { backgroundColor: "hsl(var(--chart-2) / 0.15)", color: "hsl(var(--chart-2))", borderColor: "hsl(var(--chart-2) / 0.3)" };
    case "sent":
      return { backgroundColor: "hsl(var(--chart-1) / 0.15)", color: "hsl(var(--chart-1))", borderColor: "hsl(var(--chart-1) / 0.3)" };
    case "overdue":
      return { backgroundColor: "hsl(var(--destructive) / 0.15)", color: "hsl(var(--destructive))", borderColor: "hsl(var(--destructive) / 0.3)" };
    case "draft":
      return { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" };
    case "partial":
      return { backgroundColor: "hsl(var(--chart-4) / 0.15)", color: "hsl(var(--chart-4))", borderColor: "hsl(var(--chart-4) / 0.3)" };
    case "void":
      return { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" };
    default:
      return { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" };
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export function RelatedInvoicesWidget({ entityType, entityId }: RelatedInvoicesWidgetProps) {
  const { organization } = useOrganization();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [displayLimit, setDisplayLimit] = useState(INITIAL_LIMIT);

  useEffect(() => {
    if (organization?.id && entityId) {
      fetchInvoices();
    }
  }, [organization?.id, entityId, entityType]);

  const fetchInvoices = async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      // First, get all cases for this entity
      let casesQuery = supabase
        .from("cases")
        .select("id, case_number, title")
        .eq("organization_id", organization.id);

      if (entityType === "account") {
        casesQuery = casesQuery.eq("account_id", entityId);
      } else {
        casesQuery = casesQuery.eq("contact_id", entityId);
      }

      const { data: casesData, error: casesError } = await casesQuery;

      if (casesError) throw casesError;

      if (!casesData || casesData.length === 0) {
        setInvoices([]);
        setLoading(false);
        return;
      }

      const caseIds = casesData.map((c) => c.id);
      const caseMap = new Map(casesData.map((c) => [c.id, { case_number: c.case_number, title: c.title }]));

      // Now get invoices for those cases
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("id, invoice_number, case_id, date, due_date, total, balance_due, status")
        .in("case_id", caseIds)
        .order("date", { ascending: false });

      if (invoicesError) throw invoicesError;

      const enrichedInvoices: InvoiceItem[] = (invoicesData || []).map((inv) => {
        const caseInfo = caseMap.get(inv.case_id);
        return {
          ...inv,
          case_number: caseInfo?.case_number || "",
          case_title: caseInfo?.title || "",
        };
      });

      setInvoices(enrichedInvoices);
    } catch (error) {
      console.error("Error fetching related invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedInvoices = useMemo(() => {
    let result = [...invoices];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.invoice_number.toLowerCase().includes(query) ||
          inv.case_number.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((inv) => inv.status.toLowerCase() === statusFilter.toLowerCase());
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case "invoice_number":
          comparison = a.invoice_number.localeCompare(b.invoice_number);
          break;
        case "case_number":
          comparison = a.case_number.localeCompare(b.case_number);
          break;
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "due_date":
          const aDueDate = a.due_date ? new Date(a.due_date).getTime() : 0;
          const bDueDate = b.due_date ? new Date(b.due_date).getTime() : 0;
          comparison = aDueDate - bDueDate;
          break;
        case "total":
          comparison = a.total - b.total;
          break;
        case "balance_due":
          comparison = (a.balance_due || 0) - (b.balance_due || 0);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [invoices, searchQuery, statusFilter, sortColumn, sortDirection]);

  const displayedInvoices = useMemo(() => {
    return filteredAndSortedInvoices.slice(0, displayLimit);
  }, [filteredAndSortedInvoices, displayLimit]);

  const hasMore = filteredAndSortedInvoices.length > displayLimit;

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const handleLoadMore = () => {
    setDisplayLimit((prev) => prev + LOAD_MORE_LIMIT);
  };

  const SortableHeader = ({
    column,
    children,
  }: {
    column: SortColumn;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      </div>
    </TableHead>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Related Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const entityLabel = entityType === "account" ? "account" : "contact";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Related Invoices
          <Badge variant="secondary" className="ml-2">
            {invoices.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Invoices Table */}
        {invoices.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No invoices are currently associated with this {entityLabel}.
          </p>
        ) : filteredAndSortedInvoices.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No invoices match the selected filters.
          </p>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader column="invoice_number">Invoice #</SortableHeader>
                    <SortableHeader column="case_number">Case</SortableHeader>
                    <SortableHeader column="date">Date</SortableHeader>
                    <SortableHeader column="due_date">Due Date</SortableHeader>
                    <SortableHeader column="total">Total</SortableHeader>
                    <SortableHeader column="balance_due">Balance</SortableHeader>
                    <SortableHeader column="status">Status</SortableHeader>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/cases/${invoice.case_id}?tab=finances`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {invoice.invoice_number}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={invoice.case_title}>
                        <Link
                          to={`/cases/${invoice.case_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {invoice.case_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(invoice.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invoice.due_date ? format(new Date(invoice.due_date), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(invoice.total)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(invoice.balance_due || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={getStatusStyle(invoice.status)}
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/cases/${invoice.case_id}?tab=finances`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={handleLoadMore}>
                  Load More ({filteredAndSortedInvoices.length - displayLimit} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
