import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { FileText, DollarSign } from "lucide-react";

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

      // 1. Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          case_id: caseId,
          user_id: user.id,
          invoice_number: invoiceNumber,
          total: totalAmount,
          date: new Date().toISOString().split('T')[0],
          status: "unpaid",
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

      // 3. Done!
      toast({
        title: "Invoice created successfully!",
        description: `Invoice ${invoiceNumber} created with ${selectedItems.size} item(s) totaling $${totalAmount.toFixed(2)}`,
      });

      // Clear selection and refresh the list
      setSelectedItems(new Set());
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
          <div className="space-y-3">
            {billableItems.map((item) => {
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
                        checked={selectedItems.has(item.id)}
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
                              {item.subject_id && subjects[item.subject_id] && (
                                <span>Subject: {subjects[item.subject_id].name}</span>
                              )}
                              {item.activity_id && activities[item.activity_id] && (
                                <span>Activity: {activities[item.activity_id].title}</span>
                              )}
                            </div>
                            {item.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                            )}
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
              <CardContent>
                <div className="flex items-center justify-between">
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
                    {isCreatingInvoice ? "Creating..." : "Add Invoice"}
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
