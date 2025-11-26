import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { FileText, DollarSign } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BillableItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
  notes?: string;
  subject_id?: string;
  activity_id?: string;
  finance_type: 'expense' | 'time';
  hours?: number;
  hourly_rate?: number;
}

interface Subject {
  id: string;
  name: string;
}

interface Activity {
  id: string;
  title: string;
}

export const InvoiceFromExpenses = ({ caseId }: { caseId: string }) => {
  const [billableItems, setBillableItems] = useState<BillableItem[]>([]);
  const [subjects, setSubjects] = useState<Record<string, Subject>>({});
  const [activities, setActivities] = useState<Record<string, Activity>>({});
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [retainerBalance, setRetainerBalance] = useState(0);
  const [retainerUsed, setRetainerUsed] = useState(0);

  useEffect(() => {
    fetchBillableItems();
  }, [caseId]);

  const fetchBillableItems = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch approved, uninvoiced time and expense entries
      const { data: itemsData, error: itemsError } = await supabase
        .from("case_finances")
        .select("*")
        .eq("case_id", caseId)
        .eq("user_id", user.id)
        .in("finance_type", ["expense", "time"])
        .eq("status", "approved")
        .is("invoice_id", null)
        .order("date", { ascending: false });

      if (itemsError) throw itemsError;

      // Fetch related subjects
      const { data: subjectsData } = await supabase
        .from("case_subjects")
        .select("id, name")
        .eq("case_id", caseId)
        .eq("user_id", user.id);

      // Fetch related activities
      const { data: activitiesData } = await supabase
        .from("case_activities")
        .select("id, title")
        .eq("case_id", caseId)
        .eq("user_id", user.id);

      // Calculate available retainer balance
      const { data: retainerData } = await supabase
        .from("retainer_funds")
        .select("amount")
        .eq("case_id", caseId)
        .eq("user_id", user.id);

      const balance = retainerData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      setRetainerBalance(balance);

      setBillableItems((itemsData || []) as BillableItem[]);
      
      // Create lookup maps for subjects and activities
      const subjectsMap: Record<string, Subject> = {};
      subjectsData?.forEach(s => { subjectsMap[s.id] = s; });
      setSubjects(subjectsMap);

      const activitiesMap: Record<string, Activity> = {};
      activitiesData?.forEach(a => { activitiesMap[a.id] = a; });
      setActivities(activitiesMap);

    } catch (error) {
      console.error("Error fetching billable items:", error);
      toast({
        title: "Error",
        description: "Failed to load billable items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const calculateSubtotal = () => {
    return billableItems
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => sum + Number(item.amount), 0);
  };

  const generateInvoiceNumber = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get the count of existing invoices to generate a unique number
    const { count } = await supabase
      .from("invoices")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id);

    const invoiceNumber = `INV-${String((count || 0) + 1).padStart(5, '0')}`;
    return invoiceNumber;
  };

  const submitInvoice = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to create an invoice",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingInvoice(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Calculate total from selected items
      const selectedItemsList = billableItems.filter(item => selectedItems.has(item.id));
      const totalAmount = selectedItemsList.reduce((sum, item) => sum + Number(item.amount), 0);

      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber();
      if (!invoiceNumber) throw new Error("Failed to generate invoice number");

      // Calculate balance due
      const balanceDue = totalAmount - retainerUsed;

      // 1. Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          case_id: caseId,
          user_id: user.id,
          invoice_number: invoiceNumber,
          total: totalAmount,
          retainer_applied: retainerUsed,
          date: new Date().toISOString().split('T')[0],
          status: "draft",
          notes: "",
          due_date: (() => {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);
            return dueDate.toISOString().split('T')[0];
          })(),
        })
        .select()
        .maybeSingle();

      if (invoiceError || !invoice) {
        console.error("Failed to create invoice:", invoiceError);
        throw new Error("Error creating invoice");
      }

      // 2. Link the selected finance records to this invoice
      const selectedIds = Array.from(selectedItems);
      const { error: linkError } = await supabase
        .from("case_finances")
        .update({ invoice_id: invoice.id })
        .in("id", selectedIds);

      if (linkError) {
        console.error("Failed to link items to invoice:", linkError);
        throw new Error("Invoice created, but failed to link items");
      }

      // 3. If retainer funds were applied, record the transaction
      if (retainerUsed > 0) {
        // Get organization_id
        const { data: orgMember } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();

        if (!orgMember?.organization_id) {
          console.error("User not in organization");
        } else {
          const { error: retainerError } = await supabase
            .from("retainer_funds")
            .insert({
              case_id: caseId,
              user_id: user.id,
              organization_id: orgMember.organization_id,
              amount: -retainerUsed,
              invoice_id: invoice.id,
              note: `Applied to invoice ${invoiceNumber}`,
            });

          if (retainerError) {
            console.error("Failed to record retainer usage:", retainerError);
          }
        }
      }

      // 4. Done!
      toast({
        title: "Invoice created successfully!",
        description: `Invoice ${invoiceNumber} created with ${selectedItems.size} item(s). ${retainerUsed > 0 ? `$${retainerUsed.toFixed(2)} retainer applied. ` : ''}Balance due: $${balanceDue.toFixed(2)}`,
      });

      // Clear selection and refresh the list
      setSelectedItems(new Set());
      setRetainerUsed(0);
      fetchBillableItems();

    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading billable items...</p>;
  }

  const subtotal = calculateSubtotal();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Create Invoice from Time + Expenses</h3>
          <p className="text-sm text-muted-foreground">
            Select approved time and expense entries to include in a new invoice
          </p>
        </div>
      </div>

      {billableItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No approved, unbilled items available</p>
            <p className="text-sm text-muted-foreground mt-2">
              Time and expense entries must be approved before they can be added to an invoice
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.size === billableItems.length && billableItems.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedItems(new Set(billableItems.map(item => item.id)));
                        } else {
                          setSelectedItems(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billableItems.map((item) => {
                  const isTime = item.finance_type === 'time';
                  return (
                    <TableRow 
                      key={item.id}
                      className="cursor-pointer hover:bg-accent/50"
                      onClick={() => toggleItem(item.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={isTime ? "default" : "secondary"}>
                          {isTime ? 'Time' : 'Expense'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.description}</div>
                          {item.notes && (
                            <div className="text-xs text-muted-foreground mt-1">{item.notes}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(item.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {isTime && item.hours && item.hourly_rate && (
                            <div>{item.hours} hrs @ ${item.hourly_rate}/hr</div>
                          )}
                          {item.subject_id && subjects[item.subject_id] && (
                            <div className="text-muted-foreground">
                              Subject: {subjects[item.subject_id].name}
                            </div>
                          )}
                          {item.activity_id && activities[item.activity_id] && (
                            <div className="text-muted-foreground">
                              Activity: {activities[item.activity_id].title}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.category && (
                          <Badge variant="outline">{item.category}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${Number(item.amount).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {selectedItems.size > 0 && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Invoice Summary
                  </span>
                  <span className="text-2xl">${subtotal.toFixed(2)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {retainerBalance > 0 && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium mb-2">
                      This case has <strong>${retainerBalance.toFixed(2)}</strong> in available retainer funds.
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Would you like to apply some or all of it to this invoice?
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">$</span>
                      <input
                        type="number"
                        placeholder="Amount to apply"
                        value={retainerUsed || ""}
                        max={Math.min(subtotal, retainerBalance)}
                        min={0}
                        step={0.01}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          const maxApply = Math.min(subtotal, retainerBalance);
                          setRetainerUsed(Math.min(value, maxApply));
                        }}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  {retainerUsed > 0 && (
                    <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400">
                      <span>Retainer Applied:</span>
                      <span className="font-medium">-${retainerUsed.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold pt-2 border-t">
                    <span>Balance Due:</span>
                    <span>${(subtotal - retainerUsed).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                  <Button 
                    onClick={submitInvoice} 
                    size="lg"
                    disabled={isCreatingInvoice}
                  >
                    <FileText className="h-4 w-4" />
                    {isCreatingInvoice ? "Creating..." : "Create Invoice"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
