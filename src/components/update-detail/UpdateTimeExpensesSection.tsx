import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Receipt, Plus, Pencil, FileImage, ExternalLink } from "lucide-react";
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

import { 
  getStatusColor,
  getStatusLabel,
  getBadgeVariant,
  getStatusConfig
} from "@/utils/entryStatusConfig";

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

      // Fetch time entries
      const { data: timeData } = await supabase
        .from("time_entries")
        .select("*")
        .eq("update_id", updateId)
        .order("created_at", { ascending: false });

      // Fetch expense entries
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

  // Calculate totals
  const timeSubtotal = timeEntries.reduce((sum, e) => sum + (e.total || 0), 0);
  const totalHours = timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const expenseSubtotal = expenseEntries.reduce((sum, e) => sum + (e.total || 0), 0);
  const grandTotal = timeSubtotal + expenseSubtotal;

  const hasEntries = timeEntries.length > 0 || expenseEntries.length > 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time & Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 flex items-center justify-center text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time & Expenses
              {hasEntries && (
                <Badge variant="secondary">
                  {timeEntries.length + expenseEntries.length}
                </Badge>
              )}
            </CardTitle>
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
        <CardContent className="space-y-6">
          {!hasEntries ? (
            // Empty state
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                No time or expenses logged
              </p>
              {canEdit && (
                <Button onClick={() => setShowPanel(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time & Expenses
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Time Entries Table */}
              {timeEntries.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    Time Entries
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[100px]">Date</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right w-[80px]">Hours</TableHead>
                          <TableHead className="text-right w-[100px]">Rate</TableHead>
                          <TableHead className="text-right w-[100px]">Total</TableHead>
                          <TableHead className="w-[110px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timeEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(entry.created_at), "MMM d")}
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-medium">{entry.item_type}</span>
                                {entry.notes && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {entry.notes}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {entry.hours.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(entry.rate)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {formatCurrency(entry.total)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${getStatusColor(entry.status)}`}
                              >
                                {formatStatusLabel(entry.status)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Subtotal row */}
                        <TableRow className="bg-muted/30 font-medium">
                          <TableCell colSpan={2} className="text-right">
                            Time Subtotal
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {totalHours.toFixed(2)} hrs
                          </TableCell>
                          <TableCell />
                          <TableCell className="text-right font-mono">
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
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Receipt className="h-4 w-4" />
                    Expense Entries
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[100px]">Date</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right w-[60px]">Qty</TableHead>
                          <TableHead className="text-right w-[100px]">Rate</TableHead>
                          <TableHead className="text-right w-[100px]">Total</TableHead>
                          <TableHead className="w-[60px]">Receipt</TableHead>
                          <TableHead className="w-[110px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenseEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(entry.created_at), "MMM d")}
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-medium">{entry.item_type}</span>
                                {entry.notes && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {entry.notes}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {entry.quantity}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(entry.rate)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {formatCurrency(entry.total)}
                            </TableCell>
                            <TableCell>
                              {entry.receipt_url ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleViewReceipt(entry.receipt_url!)}
                                >
                                  <FileImage className="h-4 w-4" />
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${getStatusColor(entry.status)}`}
                              >
                                {formatStatusLabel(entry.status)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Subtotal row */}
                        <TableRow className="bg-muted/30 font-medium">
                          <TableCell colSpan={4} className="text-right">
                            Expenses Subtotal
                          </TableCell>
                          <TableCell className="text-right font-mono">
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
                  <span className="text-sm text-muted-foreground mr-4">
                    Grand Total:
                  </span>
                  <span className="text-lg font-bold">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Time & Expenses Panel */}
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
