import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Mail, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface InvoiceDetailProps {
  invoiceId: string;
  onClose: () => void;
}

interface Invoice {
  id: string;
  invoice_number: string;
  description: string;
  amount: number;
  date: string;
  status: string;
  subject_id?: string;
  notes?: string;
}

interface LineItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
}

interface Subject {
  name: string;
  details?: any;
}

interface CaseData {
  case_number: string;
  title: string;
}

export const InvoiceDetail = ({ invoiceId, onClose }: InvoiceDetailProps) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoiceDetails();
  }, [invoiceId]);

  const fetchInvoiceDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("case_finances")
        .select("*")
        .eq("id", invoiceId)
        .eq("user_id", user.id)
        .single();

      if (invoiceError) throw invoiceError;
      
      setInvoice(invoiceData);

      // Fetch case data separately
      if (invoiceData.case_id) {
        const { data: caseDataResult } = await supabase
          .from("cases")
          .select("case_number, title")
          .eq("id", invoiceData.case_id)
          .eq("user_id", user.id)
          .single();

        if (caseDataResult) setCaseData(caseDataResult);
      }

      // Fetch line items (expenses linked to this invoice)
      const { data: lineItemsData, error: lineItemsError } = await supabase
        .from("case_finances")
        .select("id, description, amount, date, category")
        .eq("invoice_id", invoiceId)
        .eq("user_id", user.id);

      if (lineItemsError) throw lineItemsError;
      setLineItems(lineItemsData || []);

      // Fetch subject if available
      if (invoiceData.subject_id) {
        const { data: subjectData } = await supabase
          .from("case_subjects")
          .select("name, details")
          .eq("id", invoiceData.subject_id)
          .eq("user_id", user.id)
          .single();

        if (subjectData) setSubject(subjectData);
      }

    } catch (error) {
      console.error("Error fetching invoice details:", error);
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    toast({
      title: "Email sending",
      description: "This feature will be available soon",
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      paid: "bg-green-500/10 text-green-500 border-green-500/20",
      overdue: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return colors[status] || "bg-muted";
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="text-muted-foreground">Invoice not found</div>;
  }

  const invoiceDate = new Date(invoice.date);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 30); // 30 days payment terms

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Action buttons - hidden on print */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4" />
              Print / Export PDF
            </Button>
            <Button onClick={handleSendEmail} variant="outline">
              <Mail className="h-4 w-4" />
              Send Invoice
            </Button>
          </div>
          <Button onClick={onClose} variant="ghost" size="icon">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Invoice Document */}
        <Card className="p-8 bg-card print:shadow-none print:border-none">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">INVOICE</h1>
              <p className="text-lg text-muted-foreground">{invoice.invoice_number}</p>
            </div>
            <Badge className={getStatusColor(invoice.status)} variant="outline">
              {invoice.status.toUpperCase()}
            </Badge>
          </div>

          <Separator className="my-6" />

          {/* Bill To / From Section */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">BILL TO</h3>
              <div className="space-y-1">
                {subject ? (
                  <>
                    <p className="font-semibold text-lg">{subject.name}</p>
                    {subject.details?.email && (
                      <p className="text-sm text-muted-foreground">{subject.details.email}</p>
                    )}
                    {subject.details?.phone && (
                      <p className="text-sm text-muted-foreground">{subject.details.phone}</p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Client details not available</p>
                )}
              </div>
            </div>

            <div className="text-right">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">INVOICE DETAILS</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Date:</span>
                  <span className="font-medium">{invoiceDate.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-medium">{dueDate.toLocaleDateString()}</span>
                </div>
                {caseData && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Case:</span>
                    <span className="font-medium">{caseData.case_number}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Line Items */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">ITEMS</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold">Description</th>
                    <th className="text-left p-3 text-sm font-semibold">Category</th>
                    <th className="text-left p-3 text-sm font-semibold">Date</th>
                    <th className="text-right p-3 text-sm font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.length > 0 ? (
                    lineItems.map((item, index) => (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <td className="p-3">{item.description}</td>
                        <td className="p-3">
                          {item.category && (
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(item.date).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right font-medium">
                          ${Number(item.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-muted-foreground">
                        {invoice.description}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-80 space-y-3">
              <Separator />
              <div className="flex justify-between items-center py-2">
                <span className="text-lg font-semibold">TOTAL</span>
                <span className="text-2xl font-bold">
                  ${Number(invoice.amount).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">NOTES</h3>
              <p className="text-sm text-muted-foreground">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t text-center text-sm text-muted-foreground">
            <p>Payment due within 30 days. Thank you for your business.</p>
          </div>
        </Card>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:border-none {
            border: none !important;
          }
          
          @page {
            margin: 1cm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
};