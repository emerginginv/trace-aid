import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Edit, Download, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import html2pdf from "html2pdf.js";
import { EditInvoiceItemsDialog } from "@/components/case-detail/EditInvoiceItemsDialog";

interface Invoice {
  id: string;
  case_id: string;
  invoice_number: string;
  total: number;
  date: string;
  due_date: string | null;
  status: string;
  notes: string | null;
}

interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  finance_type: 'expense' | 'time';
  hours?: number;
  hourly_rate?: number;
  category?: string;
}

interface CaseInfo {
  title: string;
  case_number: string;
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchInvoiceData();
    }
  }, [id]);

  const fetchInvoiceData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (invoiceError) throw invoiceError;
      if (!invoiceData) {
        toast({
          title: "Invoice not found",
          variant: "destructive",
        });
        navigate("/finance");
        return;
      }

      setInvoice(invoiceData);

      // Fetch case info
      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .select("title, case_number")
        .eq("id", invoiceData.case_id)
        .maybeSingle();

      if (caseError) throw caseError;
      setCaseInfo(caseData);

      // Fetch invoice items
      const { data: itemsData, error: itemsError } = await supabase
        .from("case_finances")
        .select("id, description, amount, date, finance_type, hours, hourly_rate, category")
        .eq("invoice_id", id)
        .eq("user_id", user.id)
        .order("date", { ascending: true });

      if (itemsError) throw itemsError;
      setItems((itemsData || []) as InvoiceItem[]);

    } catch (error) {
      console.error("Error fetching invoice:", error);
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const invoiceElement = document.getElementById("invoice-preview");
    if (!invoiceElement) return;

    html2pdf()
      .from(invoiceElement)
      .set({
        margin: 0.5,
        filename: `${invoice?.invoice_number || 'invoice'}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      })
      .save();

    toast({
      title: "PDF exported",
      description: "Invoice has been downloaded",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice || !caseInfo) {
    return <div>Invoice not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate("/finance")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Finance
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setEditDialogOpen(true)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Items
          </Button>
          <Button
            onClick={exportToPDF}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export to PDF
          </Button>
        </div>
      </div>

      {/* Invoice Preview */}
      <div id="invoice-preview" className="bg-background p-8 shadow-md border rounded-lg">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl mb-2">
                  {invoice.invoice_number}
                </CardTitle>
                <p className="text-muted-foreground">
                  Case: {caseInfo.title} ({caseInfo.case_number})
                </p>
              </div>
              <Badge
                variant={
                  invoice.status === "paid"
                    ? "default"
                    : invoice.status === "unpaid"
                    ? "destructive"
                    : "secondary"
                }
              >
                {invoice.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Invoice Date</p>
                <p className="font-medium">
                  {format(new Date(invoice.date), "MMMM d, yyyy")}
                </p>
              </div>
              {invoice.due_date && (
                <div>
                  <p className="text-muted-foreground">Due Date</p>
                  <p className="font-medium">
                    {format(new Date(invoice.due_date), "MMMM d, yyyy")}
                  </p>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div>
              <h3 className="text-lg font-semibold mb-4">📋 Line Items</h3>
              {items.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No items attached to this invoice
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant={item.finance_type === "time" ? "default" : "secondary"}>
                            {item.finance_type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.description}
                        </TableCell>
                        <TableCell>
                          {format(new Date(item.date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.finance_type === "time" && item.hours && item.hourly_rate
                            ? `${item.hours} hrs @ $${item.hourly_rate}/hr`
                            : item.category || "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${Number(item.amount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between items-center text-2xl font-bold">
                    <span>Total:</span>
                    <span>${Number(invoice.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      {invoice && (
        <EditInvoiceItemsDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          invoiceId={invoice.id}
          caseId={invoice.case_id}
          currentItems={items}
          onSuccess={fetchInvoiceData}
        />
      )}
    </div>
  );
}
