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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ArrowLeft, Printer, CalendarIcon, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/contexts/OrganizationContext";

interface AgingDetailRow {
  invoiceId: string;
  invoiceNumber: string;
  createdOn: string;
  clientId: string;
  clientName: string;
  referenceNo: string;
  category: string;
  total: number;
  balance: number;
  dueOn: string;
  daysOutstanding: number;
}

interface Salesperson {
  id: string;
  full_name: string;
}

interface Client {
  id: string;
  name: string;
}

type AgingPeriod = "all" | "0-30" | "31-60" | "61-90" | "91+";

const AgingDetailReport = () => {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const organizationId = organization?.id;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AgingDetailRow[]>([]);
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Filters
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>("all");
  const [periodEnding, setPeriodEnding] = useState<Date>(new Date());
  const [showPeriod, setShowPeriod] = useState<AgingPeriod>("all");
  const [hideSearch, setHideSearch] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<keyof AgingDetailRow>("daysOutstanding");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Fetch salespersons and clients for filters
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

      // Fetch clients (accounts)
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

  // Fetch and calculate aging data
  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId) return;

      setLoading(true);

      // Fetch unpaid invoices
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          date,
          total,
          balance_due,
          due_date,
          case_id
        `)
        .eq("organization_id", organizationId)
        .gt("balance_due", 0);

      if (error) {
        console.error("Error fetching invoices:", error);
        setLoading(false);
        return;
      }

      if (!invoices || invoices.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // Get case IDs to fetch case details
      const caseIds = [...new Set(invoices.map((inv) => inv.case_id).filter(Boolean))];

      // Fetch cases with account info
      const { data: cases } = await supabase
        .from("cases")
        .select(`
          id,
          account_id,
          case_manager_id,
          reference_number,
          accounts(id, name)
        `)
        .in("id", caseIds);

      const caseMap = new Map(cases?.map((c) => [c.id, c]) || []);

      // Build detail rows
      const detailRows: AgingDetailRow[] = [];

      invoices.forEach((invoice) => {
        const caseData = caseMap.get(invoice.case_id);
        if (!caseData?.accounts) return;

        const account = caseData.accounts as { id: string; name: string };
        const invoiceDate = parseISO(invoice.date);
        const daysOutstanding = differenceInDays(periodEnding, invoiceDate);

        // Skip future invoices
        if (daysOutstanding < 0) return;

        // Filter by salesperson
        if (selectedSalespersonId !== "all" && caseData.case_manager_id !== selectedSalespersonId) {
          return;
        }

        // Filter by client
        if (selectedClientId !== "all" && account.id !== selectedClientId) {
          return;
        }

        // Filter by aging period
        if (showPeriod !== "all") {
          const inPeriod = isInAgingPeriod(daysOutstanding, showPeriod);
          if (!inPeriod) return;
        }

        detailRows.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number || `INV-${invoice.id.slice(0, 6)}`,
          createdOn: invoice.date,
          clientId: account.id,
          clientName: account.name,
          referenceNo: caseData.reference_number || "",
          category: "", // Stub for future use
          total: invoice.total,
          balance: invoice.balance_due,
          dueOn: invoice.due_date || "",
          daysOutstanding,
        });
      });

      setData(detailRows);
      setLoading(false);
      setCurrentPage(1); // Reset to first page on filter change
    };

    fetchData();
  }, [organizationId, selectedSalespersonId, selectedClientId, periodEnding, showPeriod]);

  const isInAgingPeriod = (days: number, period: AgingPeriod): boolean => {
    switch (period) {
      case "0-30":
        return days >= 0 && days <= 30;
      case "31-60":
        return days >= 31 && days <= 60;
      case "61-90":
        return days >= 61 && days <= 90;
      case "91+":
        return days > 90;
      default:
        return true;
    }
  };

  // Sort data
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [data, sortField, sortDirection]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (field: keyof AgingDetailRow) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      return format(parseISO(dateStr), "MM/dd/yyyy");
    } catch {
      return dateStr;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const showingStart = (currentPage - 1) * pageSize + 1;
  const showingEnd = Math.min(currentPage * pageSize, sortedData.length);

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
            <h1 className="text-2xl font-bold">Aging Detail</h1>
            <p className="text-muted-foreground">
              Individual outstanding invoices with days aging
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
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

                {/* Tracking Category (stub) */}
                <div className="space-y-2">
                  <Label>Tracking Category</Label>
                  <Select disabled value="all">
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Period Ending */}
                <div className="space-y-2">
                  <Label>Period Ending</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !periodEnding && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {periodEnding ? format(periodEnding, "MMM d, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={periodEnding}
                        onSelect={(date) => date && setPeriodEnding(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Show (Aging Period) */}
                <div className="space-y-2">
                  <Label>Show</Label>
                  <Select
                    value={showPeriod}
                    onValueChange={(value) => setShowPeriod(value as AgingPeriod)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Periods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Periods</SelectItem>
                      <SelectItem value="0-30">0 - 30 days</SelectItem>
                      <SelectItem value="31-60">31 - 60 days</SelectItem>
                      <SelectItem value="61-90">61 - 90 days</SelectItem>
                      <SelectItem value="91+">91+ days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Pagination Info */}
      {!loading && sortedData.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {showingStart} - {showingEnd} of {sortedData.length}
        </div>
      )}

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("invoiceNumber")}
                    >
                      Invoice
                      {sortField === "invoiceNumber" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("createdOn")}
                    >
                      Created On
                      {sortField === "createdOn" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("clientName")}
                    >
                      Client
                      {sortField === "clientName" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("referenceNo")}
                    >
                      Reference No.
                      {sortField === "referenceNo" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead
                      className="text-right cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("total")}
                    >
                      Total
                      {sortField === "total" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </TableHead>
                    <TableHead
                      className="text-right cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("balance")}
                    >
                      Balance
                      {sortField === "balance" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("dueOn")}
                    >
                      Due On
                      {sortField === "dueOn" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </TableHead>
                    <TableHead
                      className="text-right cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("daysOutstanding")}
                    >
                      Days Outstanding
                      {sortField === "daysOutstanding" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No outstanding invoices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((row) => (
                      <TableRow key={row.invoiceId}>
                        <TableCell>
                          <Button
                            variant="link"
                            className="p-0 h-auto text-blue-600 hover:text-blue-800"
                            onClick={() => navigate(`/invoices/${row.invoiceId}`)}
                          >
                            {row.invoiceNumber}
                          </Button>
                        </TableCell>
                        <TableCell>{formatDate(row.createdOn)}</TableCell>
                        <TableCell>{row.clientName}</TableCell>
                        <TableCell>{row.referenceNo}</TableCell>
                        <TableCell className="text-muted-foreground">{row.category || "-"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.total)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.balance)}</TableCell>
                        <TableCell>{formatDate(row.dueOn)}</TableCell>
                        <TableCell className="text-right">{row.daysOutstanding}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 p-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgingDetailReport;
