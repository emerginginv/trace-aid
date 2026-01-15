import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, AlertTriangle, Info } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  date: string;
  total: number;
  retainer_applied: number | null;
  total_paid: number | null;
  notes: string | null;
}

interface TimeEntry {
  id: string;
  case_id: string;
  user_id: string;
  item_type: string;
  notes: string | null;
  hours: number;
  rate: number;
  total: number;
  status: string;
  created_at: string;
}

interface ExpenseEntry {
  id: string;
  case_id: string;
  user_id: string;
  item_type: string;
  notes: string | null;
  quantity: number;
  rate: number;
  total: number;
  receipt_url: string | null;
  status: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
}

interface CaseBillingTabProps {
  caseId: string;
  organizationId: string;
}

export function CaseBillingTab({ caseId, organizationId }: CaseBillingTabProps) {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);
  const [users, setUsers] = useState<Map<string, UserProfile>>(new Map());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  useEffect(() => {
    fetchData();
  }, [caseId, organizationId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .eq("case_id", caseId)
        .eq("organization_id", organizationId)
        .order("date", { ascending: false });

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);

      // Fetch approved time entries (ready for billing)
      const { data: timeData, error: timeError } = await supabase
        .from("time_entries")
        .select("*")
        .eq("case_id", caseId)
        .eq("organization_id", organizationId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (timeError) throw timeError;
      setTimeEntries(timeData || []);

      // Fetch approved expense entries (ready for billing)
      const { data: expenseData, error: expenseError } = await supabase
        .from("expense_entries")
        .select("*")
        .eq("case_id", caseId)
        .eq("organization_id", organizationId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (expenseError) throw expenseError;
      setExpenseEntries(expenseData || []);

      // Count pending review entries
      const { count: pendingTimeCount } = await supabase
        .from("time_entries")
        .select("*", { count: "exact", head: true })
        .eq("case_id", caseId)
        .eq("organization_id", organizationId)
        .eq("status", "pending_review");

      const { count: pendingExpenseCount } = await supabase
        .from("expense_entries")
        .select("*", { count: "exact", head: true })
        .eq("case_id", caseId)
        .eq("organization_id", organizationId)
        .eq("status", "pending_review");

      setPendingReviewCount((pendingTimeCount || 0) + (pendingExpenseCount || 0));

      // Fetch user profiles for approved entries
      const userIds = new Set([
        ...(timeData || []).map(t => t.user_id),
        ...(expenseData || []).map(e => e.user_id),
      ]);

      if (userIds.size > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", Array.from(userIds));

        const userMap = new Map<string, UserProfile>();
        (profilesData || []).forEach(p => userMap.set(p.id, p));
        setUsers(userMap);
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
      toast({
        title: "Error",
        description: "Failed to load billing data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (userId: string) => {
    const user = users.get(userId);
    return user?.full_name || "Unknown";
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; className: string }> = {
      draft: { variant: "secondary", className: "bg-muted text-muted-foreground" },
      sent: { variant: "default", className: "bg-blue-500/10 text-blue-600 border-blue-200" },
      paid: { variant: "default", className: "bg-green-500/10 text-green-600 border-green-200" },
      partial: { variant: "outline", className: "bg-orange-500/10 text-orange-600 border-orange-200" },
      overdue: { variant: "destructive", className: "bg-red-500/10 text-red-600 border-red-200" },
      pending: { variant: "outline", className: "bg-yellow-500/10 text-yellow-600 border-yellow-200" },
    };
    const { variant, className } = config[status] || { variant: "outline" as const, className: "" };
    return (
      <Badge variant={variant} className={className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Calculate invoice metrics
  const invoiceTotals = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const discounts = invoices.reduce((sum, inv) => sum + Number(inv.retainer_applied || 0), 0);
    const paid = invoices.reduce((sum, inv) => sum + Number(inv.total_paid || 0), 0);
    const net = total - discounts;
    return { total, discounts, paid, net };
  }, [invoices]);

  // Combine approved entries for selection
  type CombinedEntry = (TimeEntry | ExpenseEntry) & { entryType: "time" | "expense" };
  const unbilledItems: CombinedEntry[] = useMemo(() => {
    const items: CombinedEntry[] = [
      ...timeEntries.map(t => ({ ...t, entryType: "time" as const })),
      ...expenseEntries.map(e => ({ ...e, entryType: "expense" as const })),
    ];
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [timeEntries, expenseEntries]);

  const toggleItem = (itemKey: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemKey)) {
      newSelected.delete(itemKey);
    } else {
      newSelected.add(itemKey);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    setSelectedItems(new Set(unbilledItems.map(item => `${item.entryType}-${item.id}`)));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const selectedTotal = useMemo(() => {
    return unbilledItems
      .filter(item => selectedItems.has(`${item.entryType}-${item.id}`))
      .reduce((sum, item) => sum + Number(item.total), 0);
  }, [unbilledItems, selectedItems]);

  const handleConvertToInvoice = async () => {
    if (selectedItems.size === 0) return;

    try {
      setConverting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate invoice number
      const { data: lastInvoice } = await supabase
        .from("invoices")
        .select("invoice_number")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (lastInvoice && lastInvoice.length > 0) {
        const match = lastInvoice[0].invoice_number.match(/(\d+)$/);
        if (match) nextNumber = parseInt(match[1], 10) + 1;
      }
      const invoiceNumber = `INV-${String(nextNumber).padStart(5, "0")}`;

      // Calculate total from selected items
      const selectedEntries = unbilledItems.filter(item => 
        selectedItems.has(`${item.entryType}-${item.id}`)
      );
      const invoiceTotal = selectedEntries.reduce((sum, item) => sum + Number(item.total), 0);

      // Create invoice
      const { data: newInvoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          case_id: caseId,
          organization_id: organizationId,
          user_id: user.id,
          invoice_number: invoiceNumber,
          date: new Date().toISOString().split("T")[0],
          total: invoiceTotal,
          balance_due: invoiceTotal,
          status: "draft",
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Update time entries to billed status
      const selectedTimeIds = selectedEntries
        .filter(e => e.entryType === "time")
        .map(e => e.id);
      
      if (selectedTimeIds.length > 0) {
        const { error: timeUpdateError } = await supabase
          .from("time_entries")
          .update({ status: "billed" })
          .in("id", selectedTimeIds);
        
        if (timeUpdateError) throw timeUpdateError;
      }

      // Update expense entries to billed status
      const selectedExpenseIds = selectedEntries
        .filter(e => e.entryType === "expense")
        .map(e => e.id);
      
      if (selectedExpenseIds.length > 0) {
        const { error: expenseUpdateError } = await supabase
          .from("expense_entries")
          .update({ status: "billed" })
          .in("id", selectedExpenseIds);
        
        if (expenseUpdateError) throw expenseUpdateError;
      }

      toast({
        title: "Invoice Created",
        description: `Invoice ${invoiceNumber} created with ${selectedItems.size} item(s) totaling $${invoiceTotal.toFixed(2)}`,
      });

      setSelectedItems(new Set());
      fetchData();
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Billing</h2>
        <p className="text-muted-foreground">Invoice history and approved entries ready for billing</p>
      </div>

      {/* Pending Review Alert */}
      {pendingReviewCount > 0 && (
        <Alert className="border-yellow-500/50 bg-yellow-500/5">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-700 dark:text-yellow-400">
            Entries Awaiting Review
          </AlertTitle>
          <AlertDescription className="text-yellow-600 dark:text-yellow-300">
            There are <strong>{pendingReviewCount}</strong> time & expense entries awaiting review.{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-yellow-700 dark:text-yellow-400 underline"
              onClick={() => {
                // Switch to Time & Expenses tab - we'll dispatch a custom event
                const event = new CustomEvent("switchFinancesTab", { detail: "time-expenses" });
                window.dispatchEvent(event);
              }}
            >
              Review them in the Expenses tab
            </Button>{" "}
            before billing.
          </AlertDescription>
        </Alert>
      )}

      {/* Invoice History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No invoices created yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Discounts</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const net = Number(invoice.total) - Number(invoice.retainer_applied || 0);
                  return (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    >
                      <TableCell className="font-medium text-primary underline">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>{format(new Date(invoice.date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">${Number(invoice.total).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {invoice.retainer_applied ? `-$${Number(invoice.retainer_applied).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        ${Number(invoice.total_paid || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">${net.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
                {/* Totals Row */}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={3}>Totals</TableCell>
                  <TableCell className="text-right">${invoiceTotals.total.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    {invoiceTotals.discounts > 0 ? `-$${invoiceTotals.discounts.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right">${invoiceTotals.paid.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${invoiceTotals.net.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Unbilled Items Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Approved Time & Expenses Ready for Billing</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {unbilledItems.length} approved item{unbilledItems.length !== 1 ? "s" : ""} ready for invoicing
              </p>
            </div>
            {unbilledItems.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {unbilledItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No approved entries ready for billing</p>
              <p className="text-sm text-muted-foreground mt-2">
                Entries must be approved in the Expenses tab before they appear here
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedItems.size === unbilledItems.length && unbilledItems.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) selectAll();
                          else clearSelection();
                        }}
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-center">Hrs/Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unbilledItems.map((item) => {
                    const itemKey = `${item.entryType}-${item.id}`;
                    const isTime = item.entryType === "time";
                    const qtyOrHours = isTime ? (item as TimeEntry).hours : (item as ExpenseEntry).quantity;
                    
                    return (
                      <TableRow
                        key={itemKey}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => toggleItem(itemKey)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedItems.has(itemKey)}
                            onCheckedChange={() => toggleItem(itemKey)}
                          />
                        </TableCell>
                        <TableCell>{format(new Date(item.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={isTime ? "default" : "secondary"} className="text-xs">
                              {isTime ? "Time" : "Expense"}
                            </Badge>
                            <span>{item.item_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getUserName(item.user_id)}</TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {item.notes || "—"}
                        </TableCell>
                        <TableCell className="text-center">{qtyOrHours}</TableCell>
                        <TableCell className="text-right">${Number(item.rate).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">${Number(item.total).toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {selectedItems.size > 0 && (
                <div className="border-t p-4 bg-muted/30 flex items-center justify-between">
                  <div>
                    <span className="font-medium">{selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""} selected</span>
                    <span className="text-lg font-bold ml-4">${selectedTotal.toFixed(2)}</span>
                  </div>
                  <Button onClick={handleConvertToInvoice} disabled={converting}>
                    <FileText className="h-4 w-4 mr-2" />
                    {converting ? "Creating Invoice..." : "Convert to Invoice"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> This tab is for invoice preparation and history.
          To add time or expenses, create or edit an Update and check "Add time & expenses after saving".
        </AlertDescription>
      </Alert>
    </div>
  );
}
