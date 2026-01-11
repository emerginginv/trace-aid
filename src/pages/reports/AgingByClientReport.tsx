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
import { ArrowLeft, Printer, CalendarIcon, ChevronDown, ChevronUp } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/contexts/OrganizationContext";

interface AgingRow {
  clientId: string;
  clientName: string;
  "0-30": number;
  "31-60": number;
  "61-90": number;
  "91+": number;
  total: number;
}

interface Salesperson {
  id: string;
  full_name: string;
}

const AgingByClientReport = () => {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const organizationId = organization?.id;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AgingRow[]>([]);
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);

  // Filters
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>("all");
  const [periodEnding, setPeriodEnding] = useState<Date>(new Date());
  const [hideSearch, setHideSearch] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<keyof AgingRow>("total");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Fetch salespersons for filter
  useEffect(() => {
    const fetchSalespersons = async () => {
      if (!organizationId) return;

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
    };

    fetchSalespersons();
  }, [organizationId]);

  // Fetch and calculate aging data
  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId) return;

      setLoading(true);

      // Fetch unpaid invoices with case and account info
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select(`
          id,
          date,
          balance_due,
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
          accounts(id, name)
        `)
        .in("id", caseIds);

      const caseMap = new Map(cases?.map((c) => [c.id, c]) || []);

      // Filter by salesperson if selected
      let filteredInvoices = invoices;
      if (selectedSalespersonId !== "all") {
        filteredInvoices = invoices.filter((inv) => {
          const caseData = caseMap.get(inv.case_id);
          return caseData?.case_manager_id === selectedSalespersonId;
        });
      }

      // Calculate aging buckets
      const clientAgingMap = new Map<string, AgingRow>();

      filteredInvoices.forEach((invoice) => {
        const caseData = caseMap.get(invoice.case_id);
        if (!caseData?.accounts) return;

        const account = caseData.accounts as { id: string; name: string };
        const clientId = account.id;
        const clientName = account.name;
        const invoiceDate = parseISO(invoice.date);
        const daysOld = differenceInDays(periodEnding, invoiceDate);

        if (!clientAgingMap.has(clientId)) {
          clientAgingMap.set(clientId, {
            clientId,
            clientName,
            "0-30": 0,
            "31-60": 0,
            "61-90": 0,
            "91+": 0,
            total: 0,
          });
        }

        const row = clientAgingMap.get(clientId)!;
        const amount = invoice.balance_due;

        if (daysOld < 0) {
          // Future invoice - skip
        } else if (daysOld <= 30) {
          row["0-30"] += amount;
        } else if (daysOld <= 60) {
          row["31-60"] += amount;
        } else if (daysOld <= 90) {
          row["61-90"] += amount;
        } else {
          row["91+"] += amount;
        }

        row.total = row["0-30"] + row["31-60"] + row["61-90"] + row["91+"];
      });

      setData(Array.from(clientAgingMap.values()));
      setLoading(false);
    };

    fetchData();
  }, [organizationId, selectedSalespersonId, periodEnding]);

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

  // Calculate totals
  const totals = useMemo(() => {
    return data.reduce(
      (acc, row) => ({
        "0-30": acc["0-30"] + row["0-30"],
        "31-60": acc["31-60"] + row["31-60"],
        "61-90": acc["61-90"] + row["61-90"],
        "91+": acc["91+"] + row["91+"],
        total: acc.total + row.total,
      }),
      { "0-30": 0, "31-60": 0, "61-90": 0, "91+": 0, total: 0 }
    );
  }, [data]);

  const handleSort = (field: keyof AgingRow) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const formatCurrency = (value: number) => {
    if (value === 0) return "";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
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
            <h1 className="text-2xl font-bold">Aging by Client</h1>
            <p className="text-muted-foreground">
              Outstanding invoice amounts by aging buckets
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

                {/* Group By */}
                <div className="space-y-2">
                  <Label>Group By</Label>
                  <Select value="client" disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

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
            <Table>
              <TableHeader>
                <TableRow>
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
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("0-30")}
                  >
                    0 - 30 days
                    {sortField === "0-30" && (
                      <span className="ml-1">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("31-60")}
                  >
                    31 - 60 days
                    {sortField === "31-60" && (
                      <span className="ml-1">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("61-90")}
                  >
                    61 - 90 days
                    {sortField === "61-90" && (
                      <span className="ml-1">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("91+")}
                  >
                    91+ days
                    {sortField === "91+" && (
                      <span className="ml-1">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </TableHead>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No outstanding invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {sortedData.map((row) => (
                      <TableRow key={row.clientId}>
                        <TableCell>
                          <Button
                            variant="link"
                            className="p-0 h-auto text-foreground hover:text-primary"
                            onClick={() => navigate(`/accounts/${row.clientId}`)}
                          >
                            {row.clientName}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right text-blue-600">
                          {formatCurrency(row["0-30"])}
                        </TableCell>
                        <TableCell className="text-right text-blue-600">
                          {formatCurrency(row["31-60"])}
                        </TableCell>
                        <TableCell className="text-right text-blue-600">
                          {formatCurrency(row["61-90"])}
                        </TableCell>
                        <TableCell className="text-right text-blue-600">
                          {formatCurrency(row["91+"])}
                        </TableCell>
                        <TableCell className="text-right text-blue-600 font-medium">
                          {formatCurrency(row.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right text-blue-600">
                        {formatCurrency(totals["0-30"])}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {formatCurrency(totals["31-60"])}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {formatCurrency(totals["61-90"])}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {formatCurrency(totals["91+"])}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {formatCurrency(totals.total)}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgingByClientReport;
