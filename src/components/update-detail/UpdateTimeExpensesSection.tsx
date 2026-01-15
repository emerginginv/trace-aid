import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Receipt, Plus, FileImage } from "lucide-react";
import { format } from "date-fns";
import { TimeExpensesPanel } from "@/components/case-detail/TimeExpensesPanel";

interface TimeEntry {
  id: string;
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
  item_type: string;
  notes: string | null;
  quantity: number;
  rate: number;
  total: number;
  receipt_url: string | null;
  status: string;
  created_at: string;
}

interface UpdateTimeExpensesSectionProps {
  updateId: string;
  caseId: string;
  organizationId: string;
  canEdit: boolean;
  onDataChange?: () => void;
}

import { getStatusColor } from "@/utils/entryStatusConfig";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatStatusLabel = (status: string) => {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const UpdateTimeExpensesSection = ({
  updateId,
  caseId,
  organizationId,
  canEdit,
  onDataChange,
}: UpdateTimeExpensesSectionProps) => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, [updateId]);

  const fetchEntries = async () => {
    try {
      setLoading(true);

      const { data: timeData } = await supabase
        .from("time_entries")
        .select("*")
        .eq("update_id", updateId)
        .order("created_at", { ascending: false });

      const { data: expenseData } = await supabase
        .from("expense_entries")
        .select("*")
        .eq("update_id", updateId)
        .order("created_at", { ascending: false });

      setTimeEntries(timeData || []);
      setExpenseEntries(expenseData || []);
    } catch (error) {
      console.error("Error fetching entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipt = async (receiptUrl: string) => {
    try {
      const { data } = await supabase.storage
        .from("case-attachments")
        .createSignedUrl(receiptUrl, 3600);

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (error) {
      console.error("Error getting receipt URL:", error);
    }
  };

  const handlePanelClose = () => {
    setShowPanel(false);
    fetchEntries();
    onDataChange?.();
  };

  const timeSubtotal = timeEntries.reduce((sum, e) => sum + (e.total || 0), 0);
  const totalHours = timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const expenseSubtotal = expenseEntries.reduce((sum, e) => sum + (e.total || 0), 0);
  const grandTotal = timeSubtotal + expenseSubtotal;

  const hasEntries = timeEntries.length > 0 || expenseEntries.length > 0;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Time & Expenses
          </h2>
        </CardHeader>
        <CardContent>
          <div className="h-20 flex items-center justify-center text-muted-foreground text-sm">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Time & Expenses
              </h2>
              {hasEntries && (
                <Badge variant="secondary" className="text-xs">
                  {timeEntries.length + expenseEntries.length}
                </Badge>
              )}
            </div>
            {canEdit && hasEntries && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPanel(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add More
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasEntries ? (
            <div className="text-center py-6">
              <div className="flex justify-center mb-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                No time or expenses logged
              </p>
              {canEdit && (
                <Button size="sm" onClick={() => setShowPanel(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Time & Expenses
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Time Entries Table */}
              {timeEntries.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Time Entries
                  </div>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="h-8 text-xs w-[80px]">Date</TableHead>
                          <TableHead className="h-8 text-xs">Item</TableHead>
                          <TableHead className="h-8 text-xs text-right w-[60px]">Hours</TableHead>
                          <TableHead className="h-8 text-xs text-right w-[80px]">Rate</TableHead>
                          <TableHead className="h-8 text-xs text-right w-[80px]">Pay</TableHead>
                          <TableHead className="h-8 text-xs w-[90px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timeEntries.map((entry) => (
                          <TableRow key={entry.id} className="text-sm">
                            <TableCell className="py-2 text-muted-foreground">
                              {format(new Date(entry.created_at), "MMM d")}
                            </TableCell>
                            <TableCell className="py-2">
                              <span className="font-medium">{entry.item_type}</span>
                              {entry.notes && (
                                <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                  {entry.notes}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="py-2 text-right font-mono text-xs">
                              {entry.hours.toFixed(2)}
                            </TableCell>
                            <TableCell className="py-2 text-right font-mono text-xs">
                              {formatCurrency(entry.rate)}
                            </TableCell>
                            <TableCell className="py-2 text-right font-mono text-xs font-medium">
                              {formatCurrency(entry.total)}
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge
                                variant="outline"
                                className={`text-xs ${getStatusColor(entry.status)}`}
                              >
                                {formatStatusLabel(entry.status)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/30 font-medium text-sm">
                          <TableCell colSpan={2} className="py-2 text-right">
                            Time Pay
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono text-xs">
                            {totalHours.toFixed(2)} hrs
                          </TableCell>
                          <TableCell />
                          <TableCell className="py-2 text-right font-mono text-xs">
                            {formatCurrency(timeSubtotal)}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Expense Entries Table */}
              {expenseEntries.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Receipt className="h-3.5 w-3.5" />
                    Expense Entries
                  </div>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="h-8 text-xs w-[80px]">Date</TableHead>
                          <TableHead className="h-8 text-xs">Item</TableHead>
                          <TableHead className="h-8 text-xs text-right w-[50px]">Qty</TableHead>
                          <TableHead className="h-8 text-xs text-right w-[80px]">Rate</TableHead>
                          <TableHead className="h-8 text-xs text-right w-[80px]">Pay</TableHead>
                          <TableHead className="h-8 text-xs w-[50px]"></TableHead>
                          <TableHead className="h-8 text-xs w-[90px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenseEntries.map((entry) => (
                          <TableRow key={entry.id} className="text-sm">
                            <TableCell className="py-2 text-muted-foreground">
                              {format(new Date(entry.created_at), "MMM d")}
                            </TableCell>
                            <TableCell className="py-2">
                              <span className="font-medium">{entry.item_type}</span>
                              {entry.notes && (
                                <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                  {entry.notes}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="py-2 text-right font-mono text-xs">
                              {entry.quantity}
                            </TableCell>
                            <TableCell className="py-2 text-right font-mono text-xs">
                              {formatCurrency(entry.rate)}
                            </TableCell>
                            <TableCell className="py-2 text-right font-mono text-xs font-medium">
                              {formatCurrency(entry.total)}
                            </TableCell>
                            <TableCell className="py-2">
                              {entry.receipt_url ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleViewReceipt(entry.receipt_url!)}
                                >
                                  <FileImage className="h-3.5 w-3.5" />
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge
                                variant="outline"
                                className={`text-xs ${getStatusColor(entry.status)}`}
                              >
                                {formatStatusLabel(entry.status)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/30 font-medium text-sm">
                          <TableCell colSpan={4} className="py-2 text-right">
                            Expense Pay
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono text-xs">
                            {formatCurrency(expenseSubtotal)}
                          </TableCell>
                          <TableCell colSpan={2} />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Grand Total */}
              <div className="flex justify-end pt-2 border-t">
                <div className="text-right">
                  <span className="text-xs text-muted-foreground mr-3">
                    Total Pay:
                  </span>
                  <span className="text-base font-semibold font-mono">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <TimeExpensesPanel
        open={showPanel}
        onOpenChange={setShowPanel}
        updateId={updateId}
        caseId={caseId}
        organizationId={organizationId}
        onSaveComplete={handlePanelClose}
      />
    </>
  );
};
