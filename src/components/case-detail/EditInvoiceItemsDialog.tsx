import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, DollarSign } from "lucide-react";

interface BillableItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  finance_type: 'expense' | 'time';
  hours?: number;
  hourly_rate?: number;
  category?: string;
}

interface EditInvoiceItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  caseId: string;
  currentItems: BillableItem[];
  onSuccess: () => void;
}

export function EditInvoiceItemsDialog({
  open,
  onOpenChange,
  invoiceId,
  caseId,
  currentItems,
  onSuccess,
}: EditInvoiceItemsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableItems, setAvailableItems] = useState<BillableItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      fetchAvailableItems();
      // Pre-select current items
      setSelectedIds(new Set(currentItems.map(item => item.id)));
    }
  }, [open, currentItems]);

  const fetchAvailableItems = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all approved, unbilled items from this case
      // Plus items already on this invoice
      const { data: itemsData, error } = await supabase
        .from("case_finances")
        .select("id, description, amount, date, finance_type, hours, hourly_rate, category, invoice_id")
        .eq("case_id", caseId)
        .eq("user_id", user.id)
        .in("finance_type", ["expense", "time"])
        .eq("status", "approved")
        .or(`invoice_id.is.null,invoice_id.eq.${invoiceId}`)
        .order("date", { ascending: false });

      if (error) throw error;

      setAvailableItems((itemsData || []) as BillableItem[]);
    } catch (error) {
      console.error("Error fetching available items:", error);
      toast({
        title: "Error",
        description: "Failed to load available items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedIds(newSelected);
  };

  const calculateTotal = () => {
    return availableItems
      .filter(item => selectedIds.has(item.id))
      .reduce((sum, item) => sum + Number(item.amount), 0);
  };

  const updateInvoiceItems = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item for the invoice",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const selectedIdsArray = Array.from(selectedIds);
      const total = calculateTotal();

      // 1. Unlink all existing items from this invoice
      const { error: unlinkError } = await supabase
        .from("case_finances")
        .update({ invoice_id: null })
        .eq("invoice_id", invoiceId)
        .eq("user_id", user.id);

      if (unlinkError) throw unlinkError;

      // 2. Link new selected items
      const { error: linkError } = await supabase
        .from("case_finances")
        .update({ invoice_id: invoiceId })
        .in("id", selectedIdsArray)
        .eq("user_id", user.id);

      if (linkError) throw linkError;

      // 3. Update invoice total
      const { error: updateError } = await supabase
        .from("invoices")
        .update({ total })
        .eq("id", invoiceId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "Invoice updated!",
        description: `${selectedIds.size} item(s) linked, total: $${total.toFixed(2)}`,
      });

      onSuccess();
      onOpenChange(false);

    } catch (error) {
      console.error("Error updating invoice items:", error);
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const total = calculateTotal();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Invoice Items</DialogTitle>
          <DialogDescription>
            Select time and expense entries to include in this invoice
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {availableItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No approved, unbilled items available for this case
              </p>
            ) : (
              <>
                <div className="space-y-3">
                  {availableItems.map((item) => {
                    const isTime = item.finance_type === 'time';
                    return (
                      <Card 
                        key={item.id} 
                        className="hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => toggleItem(item.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedIds.has(item.id)}
                              onCheckedChange={() => toggleItem(item.id)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant={isTime ? "default" : "secondary"} className="text-xs">
                                      {isTime ? 'TIME' : 'EXPENSE'}
                                    </Badge>
                                    <h4 className="font-medium">{item.description}</h4>
                                    {item.category && (
                                      <Badge variant="outline" className="text-xs">
                                        {item.category}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                    <span>Date: {new Date(item.date).toLocaleDateString()}</span>
                                    {isTime && item.hours && item.hourly_rate && (
                                      <span>{item.hours} hrs @ ${item.hourly_rate}/hr</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold">
                                    ${Number(item.amount).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Summary */}
                {selectedIds.size > 0 && (
                  <Card className="border-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="h-5 w-5 text-primary" />
                            <span className="text-lg font-semibold">Updated Total</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
                          </p>
                        </div>
                        <div className="text-2xl font-bold">
                          ${total.toFixed(2)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={updateInvoiceItems}
                disabled={saving || selectedIds.size === 0}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Update Invoice"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
