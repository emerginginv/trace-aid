import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Edit, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import html2pdf from "html2pdf.js";
import { EditInvoiceItemsDialog } from "@/components/case-detail/EditInvoiceItemsDialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { InvoiceDetailSkeleton } from "@/components/ui/detail-page-skeleton";

interface Invoice {
  id: string;
  case_id: string;
  invoice_number: string;
  total: number;
  retainer_applied: number;
  balance_due: number;
  total_paid: number;
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
  account_id: string | null;
  contact_id: string | null;
}

interface AccountInfo {
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  email: string | null;
  phone: string | null;
}

interface ContactInfo {
  first_name: string;
  last_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  email: string | null;
  phone: string | null;
}

interface OrgSettings {
  company_name: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  billing_email: string | null;
  agency_license_number: string | null;
  fein_number: string | null;
  terms: string | null;
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useSetBreadcrumbs([
    { label: "Finance", href: "/finance" },
    { label: "Invoices", href: "/invoices" },
    { label: invoice?.invoice_number || "Invoice" },
  ]);

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

      // Get user's organization
      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!orgMember) {
        setLoading(false);
        return;
      }

      // Fetch invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .eq("organization_id", orgMember.organization_id)
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
        .select("title, case_number, account_id, contact_id")
        .eq("id", invoiceData.case_id)
        .maybeSingle();

      if (caseError) throw caseError;
      setCaseInfo(caseData);

      // Fetch account info if available
      if (caseData?.account_id) {
        const { data: accountData, error: accountError } = await supabase
          .from("accounts")
          .select("name, address, city, state, zip_code, email, phone")
          .eq("id", caseData.account_id)
          .eq("organization_id", orgMember.organization_id)
          .maybeSingle();

        if (!accountError && accountData) {
          setAccountInfo(accountData);
        }
      }

      // Fetch contact info if available
      if (caseData?.contact_id) {
        const { data: contactData, error: contactError } = await supabase
          .from("contacts")
          .select("first_name, last_name, address, city, state, zip_code, email, phone")
          .eq("id", caseData.contact_id)
          .eq("organization_id", orgMember.organization_id)
          .maybeSingle();

        if (!contactError && contactData) {
          setContactInfo(contactData);
        }
      }

      // Fetch invoice items
      const { data: itemsData, error: itemsError } = await supabase
        .from("case_finances")
        .select("id, description, amount, date, finance_type, hours, hourly_rate, category")
        .eq("invoice_id", id)
        .eq("organization_id", orgMember.organization_id)
        .order("date", { ascending: true });

      if (itemsError) throw itemsError;
      setItems((itemsData || []) as InvoiceItem[]);

      // Fetch organization settings
      const { data: orgData, error: orgError } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("organization_id", orgMember.organization_id)
        .maybeSingle();

      if (!orgError && orgData) {
        setOrgSettings(orgData);
      }

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
    return <InvoiceDetailSkeleton />;
  }

  if (!invoice || !caseInfo) {
    return <div>Invoice not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate("/finance")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Finance
          </Button>
          <StatusBadge status={invoice.status} />
        </div>
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
      <div id="invoice-preview" className="bg-white p-10 text-sm text-gray-900 max-w-4xl mx-auto shadow-lg">
        {/* Header with Logo and Invoice Title */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
            <p className="text-sm text-gray-500 mt-1">#{invoice.invoice_number}</p>
          </div>
          {orgSettings?.logo_url && (
            <img 
              src={orgSettings.logo_url} 
              alt="Company Logo" 
              className="h-16 object-contain"
            />
          )}
        </div>

        {/* From/To Section */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">From</h3>
            <p className="font-semibold text-base">{orgSettings?.company_name || "Your Company"}</p>
            {orgSettings?.address && (
              <p className="text-sm text-gray-600 whitespace-pre-line">{orgSettings.address}</p>
            )}
            {orgSettings?.billing_email && (
              <p className="text-sm text-gray-600">{orgSettings.billing_email}</p>
            )}
            {orgSettings?.phone && (
              <p className="text-sm text-gray-600">{orgSettings.phone}</p>
            )}
            {orgSettings?.agency_license_number && (
              <p className="text-xs text-gray-500 mt-2">License: {orgSettings.agency_license_number}</p>
            )}
            {orgSettings?.fein_number && (
              <p className="text-xs text-gray-500">FEIN: {orgSettings.fein_number}</p>
            )}
          </div>
          <div className="text-right">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Invoice Details</h3>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Invoice Date:</span>
                <span className="font-medium">{format(new Date(invoice.date), "MMM d, yyyy")}</span>
              </div>
              {invoice.due_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Due Date:</span>
                  <span className="font-medium">{format(new Date(invoice.due_date), "MMM d, yyyy")}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Case:</span>
                <span className="font-medium">{caseInfo.case_number}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To Section */}
        <div className="mb-10">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
          {accountInfo ? (
            <>
              <p className="font-semibold text-base">{accountInfo.name}</p>
              {accountInfo.address && <p className="text-sm text-gray-600">{accountInfo.address}</p>}
              {(accountInfo.city || accountInfo.state || accountInfo.zip_code) && (
                <p className="text-sm text-gray-600">
                  {[accountInfo.city, accountInfo.state, accountInfo.zip_code].filter(Boolean).join(", ")}
                </p>
              )}
              {accountInfo.email && <p className="text-sm text-gray-600">{accountInfo.email}</p>}
              {accountInfo.phone && <p className="text-sm text-gray-600">{accountInfo.phone}</p>}
            </>
          ) : contactInfo ? (
            <>
              <p className="font-semibold text-base">{contactInfo.first_name} {contactInfo.last_name}</p>
              {contactInfo.address && <p className="text-sm text-gray-600">{contactInfo.address}</p>}
              {(contactInfo.city || contactInfo.state || contactInfo.zip_code) && (
                <p className="text-sm text-gray-600">
                  {[contactInfo.city, contactInfo.state, contactInfo.zip_code].filter(Boolean).join(", ")}
                </p>
              )}
              {contactInfo.email && <p className="text-sm text-gray-600">{contactInfo.email}</p>}
              {contactInfo.phone && <p className="text-sm text-gray-600">{contactInfo.phone}</p>}
            </>
          ) : (
            <p className="font-semibold text-base">{caseInfo.title}</p>
          )}
        </div>

        {/* Line Items Table */}
        <div className="mb-8">
          <table className="w-full border-t border-b border-gray-300">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-500 bg-gray-50">
                <th className="py-3 px-2 font-semibold">Description</th>
                <th className="py-3 px-2 font-semibold text-center">Qty</th>
                <th className="py-3 px-2 font-semibold text-right">Rate</th>
                <th className="py-3 px-2 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr className="border-t border-gray-200">
                  <td className="py-3 px-2" colSpan={3}>General Invoice</td>
                  <td className="py-3 px-2 text-right font-medium">${Number(invoice.total).toFixed(2)}</td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-3 px-2">
                      <div className="font-medium">{item.description}</div>
                      {item.category && (
                        <div className="text-xs text-gray-500">{item.category}</div>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {item.finance_type === 'time' && item.hours ? item.hours : 1}
                    </td>
                    <td className="py-3 px-2 text-right">
                      ${item.finance_type === 'time' && item.hourly_rate 
                        ? Number(item.hourly_rate).toFixed(2) 
                        : Number(item.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-right font-medium">
                      ${Number(item.amount).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end mb-10">
          <div className="w-80">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">${Number(invoice.total).toFixed(2)}</span>
              </div>
              {invoice.retainer_applied > 0 && (
                <div className="flex justify-between text-sm text-blue-600">
                  <span>Retainer Applied:</span>
                  <span className="font-medium">-${Number(invoice.retainer_applied).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-300">
                <span>Total:</span>
                <span>${Number(invoice.total).toFixed(2)}</span>
              </div>
              {(() => {
                // Calculate correct balance: total - total_paid (retainer is already included in total_paid)
                const totalPaid = Number((invoice as any).total_paid || 0);
                const balanceDue = Math.max(0, Number(invoice.total) - totalPaid);
                return balanceDue > 0 ? (
                  <div className="flex justify-between text-red-600 font-semibold">
                    <span>Balance Due:</span>
                    <span>${balanceDue.toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Balance Due:</span>
                    <span>$0.00</span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Terms and Notes */}
        {(orgSettings?.terms || invoice.notes) && (
          <div className="text-sm text-gray-600 border-t border-gray-300 pt-6">
            {orgSettings?.terms && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-1">Payment Terms</h4>
                <p className="whitespace-pre-line">{orgSettings.terms}</p>
              </div>
            )}
            {invoice.notes && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Notes</h4>
                <p className="whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}
          </div>
        )}
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
