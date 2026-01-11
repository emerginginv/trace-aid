import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Printer, Receipt, CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
}

interface TransactionRow {
  accountId: string;
  accountName: string;
  retainerReceived: number;
  retainerRefunded: number;
  paymentsReceived: number;
  creditIssued: number;
  netReceived: number;
  lessInvoiced: number;
  netActivity: number;
}

export default function TransactionSummaryReport() {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [caseTypes, setCaseTypes] = useState<string[]>([]);
  const [selectedCaseType, setSelectedCaseType] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [showAmountApplied, setShowAmountApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TransactionRow[]>([]);

  useSetBreadcrumbs([
    { label: "Reports", href: "/reports" },
    { label: "Transaction Summary" },
  ]);

  // Fetch case types for filter
  useEffect(() => {
    if (!organizationId) return;

    const fetchCaseTypes = async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("case_type_tag")
        .eq("organization_id", organizationId)
        .not("case_type_tag", "is", null);

      if (!error && data) {
        const uniqueTypes = [...new Set(data.map((c) => c.case_type_tag).filter(Boolean))] as string[];
        setCaseTypes(uniqueTypes);
      }
    };

    fetchCaseTypes();
  }, [organizationId]);

  // Fetch accounts for reference
  useEffect(() => {
    if (!organizationId) return;

    const fetchAccounts = async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("organization_id", organizationId)
        .order("name");

      if (!error && data) {
        setAccounts(data);
      }
    };

    fetchAccounts();
  }, [organizationId]);

  // Fetch transaction data
  useEffect(() => {
    if (!organizationId || !startDate || !endDate) return;

    const fetchData = async () => {
      setLoading(true);

      try {
        // Build case type filter for cases query
        let casesQuery = supabase
          .from("cases")
          .select("id, account_id, case_type_tag")
          .eq("organization_id", organizationId);

        if (selectedCaseType !== "all") {
          casesQuery = casesQuery.eq("case_type_tag", selectedCaseType);
        }

        const { data: casesData, error: casesError } = await casesQuery;

        if (casesError) {
          console.error("Error fetching cases:", casesError);
          setLoading(false);
          return;
        }

        if (!casesData || casesData.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        const caseIds = casesData.map((c) => c.id);
        const caseToAccountMap: Record<string, string | null> = {};
        casesData.forEach((c) => {
          caseToAccountMap[c.id] = c.account_id;
        });

        // Fetch retainer funds within date range
        const { data: retainerData, error: retainerError } = await supabase
          .from("retainer_funds")
          .select("case_id, amount, invoice_id, created_at")
          .eq("organization_id", organizationId)
          .gte("created_at", format(startDate, "yyyy-MM-dd"))
          .lte("created_at", format(endDate, "yyyy-MM-dd'T'23:59:59"))
          .in("case_id", caseIds);

        if (retainerError) {
          console.error("Error fetching retainer funds:", retainerError);
        }

        // Fetch invoices within date range
        const { data: invoiceData, error: invoiceError } = await supabase
          .from("invoices")
          .select("case_id, total, total_paid, date")
          .eq("organization_id", organizationId)
          .gte("date", format(startDate, "yyyy-MM-dd"))
          .lte("date", format(endDate, "yyyy-MM-dd"))
          .in("case_id", caseIds);

        if (invoiceError) {
          console.error("Error fetching invoices:", invoiceError);
        }

        // Aggregate by client (account)
        const grouped: Record<string, TransactionRow> = {};

        // Initialize accounts found in cases
        accounts.forEach((acc) => {
          grouped[acc.id] = {
            accountId: acc.id,
            accountName: acc.name,
            retainerReceived: 0,
            retainerRefunded: 0,
            paymentsReceived: 0,
            creditIssued: 0,
            netReceived: 0,
            lessInvoiced: 0,
            netActivity: 0,
          };
        });

        // Add a "No Client" bucket
        grouped["no-client"] = {
          accountId: "no-client",
          accountName: "No Client",
          retainerReceived: 0,
          retainerRefunded: 0,
          paymentsReceived: 0,
          creditIssued: 0,
          netReceived: 0,
          lessInvoiced: 0,
          netActivity: 0,
        };

        // Process retainer funds
        retainerData?.forEach((rf) => {
          const accountId = caseToAccountMap[rf.case_id] || "no-client";
          const amount = Number(rf.amount) || 0;

          if (!grouped[accountId]) {
            const account = accounts.find((a) => a.id === accountId);
            grouped[accountId] = {
              accountId,
              accountName: account?.name || "Unknown",
              retainerReceived: 0,
              retainerRefunded: 0,
              paymentsReceived: 0,
              creditIssued: 0,
              netReceived: 0,
              lessInvoiced: 0,
              netActivity: 0,
            };
          }

          if (amount > 0) {
            grouped[accountId].retainerReceived += amount;
          } else if (amount < 0 && !rf.invoice_id) {
            // Only count as refunded if not linked to an invoice (pure refund)
            grouped[accountId].retainerRefunded += Math.abs(amount);
          }
        });

        // Process invoices
        invoiceData?.forEach((inv) => {
          const accountId = caseToAccountMap[inv.case_id] || "no-client";
          const total = Number(inv.total) || 0;
          const totalPaid = Number(inv.total_paid) || 0;

          if (!grouped[accountId]) {
            const account = accounts.find((a) => a.id === accountId);
            grouped[accountId] = {
              accountId,
              accountName: account?.name || "Unknown",
              retainerReceived: 0,
              retainerRefunded: 0,
              paymentsReceived: 0,
              creditIssued: 0,
              netReceived: 0,
              lessInvoiced: 0,
              netActivity: 0,
            };
          }

          grouped[accountId].paymentsReceived += totalPaid;
          grouped[accountId].lessInvoiced += total;
        });

        // Calculate derived fields and filter out empty rows
        const rows: TransactionRow[] = Object.values(grouped)
          .map((row) => ({
            ...row,
            netReceived: row.retainerReceived - row.retainerRefunded + row.paymentsReceived,
            netActivity: row.retainerReceived - row.retainerRefunded + row.paymentsReceived - row.lessInvoiced,
          }))
          .filter(
            (row) =>
              row.retainerReceived > 0 ||
              row.retainerRefunded > 0 ||
              row.paymentsReceived > 0 ||
              row.lessInvoiced > 0
          )
          .sort((a, b) => a.accountName.localeCompare(b.accountName));

        setData(rows);
      } catch (error) {
        console.error("Error fetching transaction summary:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId, selectedCaseType, startDate, endDate, accounts]);

  // Calculate grand totals
  const totals = useMemo(() => {
    return data.reduce(
      (acc, row) => ({
        retainerReceived: acc.retainerReceived + row.retainerReceived,
        retainerRefunded: acc.retainerRefunded + row.retainerRefunded,
        paymentsReceived: acc.paymentsReceived + row.paymentsReceived,
        creditIssued: acc.creditIssued + row.creditIssued,
        netReceived: acc.netReceived + row.netReceived,
        lessInvoiced: acc.lessInvoiced + row.lessInvoiced,
        netActivity: acc.netActivity + row.netActivity,
      }),
      {
        retainerReceived: 0,
        retainerRefunded: 0,
        paymentsReceived: 0,
        creditIssued: 0,
        netReceived: 0,
        lessInvoiced: 0,
        netActivity: 0,
      }
    );
  }, [data]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatNegativeCurrency = (value: number) => {
    const formatted = formatCurrency(Math.abs(value));
    return `(${formatted})`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link to="/reports">
              <ArrowLeft className="h-4 w-4 mr-2" />
              All Reports
            </Link>
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Receipt className="h-8 w-8" />
            Transaction Summary
          </h1>
          <p className="text-muted-foreground mt-1">
            Client transaction totals including retainers, payments, and invoicing
          </p>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Print Header */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Transaction Summary Report</h1>
        <p className="text-sm text-muted-foreground">
          Grouped by Client |{" "}
          {startDate && endDate
            ? `${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`
            : "All Dates"}
          {selectedCaseType !== "all" && ` | Case Type: ${selectedCaseType}`}
        </p>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Start Date */}
            <div className="space-y-2">
              <Label>From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Case Type Filter */}
            <div className="space-y-2">
              <Label>Case Type</Label>
              <Select value={selectedCaseType} onValueChange={setSelectedCaseType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select case type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Case Types</SelectItem>
                  {caseTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Group By - Fixed to Client for now */}
            <div className="space-y-2">
              <Label>Group By</Label>
              <Select value="client" disabled>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Show Amount Applied */}
            <div className="flex items-center space-x-2 pb-2">
              <Checkbox
                id="showAmountApplied"
                checked={showAmountApplied}
                onCheckedChange={(checked) => setShowAmountApplied(checked as boolean)}
              />
              <Label htmlFor="showAmountApplied" className="font-normal cursor-pointer">
                Show Amount Applied
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader className="print:pb-2">
          <CardTitle className="text-lg">Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Retainer Received</TableHead>
                    <TableHead className="text-right">Retainer Refunded</TableHead>
                    <TableHead className="text-right">Payments Received</TableHead>
                    <TableHead className="text-right">Credit Issued</TableHead>
                    <TableHead className="text-right">Net Received</TableHead>
                    <TableHead className="text-right">Less Invoiced</TableHead>
                    <TableHead className="text-right">Net Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.accountId}>
                      <TableCell>
                        {row.accountId !== "no-client" ? (
                          <Link
                            to={`/accounts/${row.accountId}`}
                            className="text-primary hover:underline"
                          >
                            {row.accountName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{row.accountName}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.retainerReceived)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.retainerRefunded)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.paymentsReceived)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.creditIssued)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.netReceived)}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatNegativeCurrency(row.lessInvoiced)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right",
                          row.netActivity < 0 && "text-destructive"
                        )}
                      >
                        {row.netActivity < 0
                          ? formatNegativeCurrency(row.netActivity)
                          : formatCurrency(row.netActivity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-bold">
                    <TableCell>Grand Total</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totals.retainerReceived)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totals.retainerRefunded)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totals.paymentsReceived)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totals.creditIssued)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totals.netReceived)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatNegativeCurrency(totals.lessInvoiced)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right",
                        totals.netActivity < 0 && "text-destructive"
                      )}
                    >
                      {totals.netActivity < 0
                        ? formatNegativeCurrency(totals.netActivity)
                        : formatCurrency(totals.netActivity)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
