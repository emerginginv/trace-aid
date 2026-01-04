import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, Pencil, Trash2, CircleDollarSign, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText } from "lucide-react";
import RecordPaymentModal from "@/components/case-detail/RecordPaymentModal";
import { EditInvoiceDialog } from "@/components/case-detail/EditInvoiceDialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { useOrganization } from "@/contexts/OrganizationContext";
import html2pdf from "html2pdf.js";

interface Invoice {
  id: string;
  invoice_number: string | null;
  case_title: string;
  case_number: string;
  case_id: string;
  date: string;
  amount: number;
  status: string | null;
  due_date: string | null;
  balance_due?: number;
  total_paid?: number;
}

const AllInvoices = () => {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [retainerMap, setRetainerMap] = useState<Record<string, number>>({});
  
  // Filter states
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");
  const [showPayModal, setShowPayModal] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<string | null>(null);
  
  // Pagination states
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(15);

  // Refetch when organization changes
  useEffect(() => {
    if (organization?.id) {
      fetchInvoiceData();
    }
  }, [organization?.id]);

  const fetchInvoiceData = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      const orgId = organization.id;

      // Fetch all cases first (needed for joins)
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select("id, title, case_number")
        .eq("organization_id", orgId);

      if (casesError) throw casesError;

      const casesMap = new Map(casesData?.map(c => [c.id, c]) || []);

      // Fetch retainer balances for payment modal
      const { data: retainerData, error: retainerError } = await supabase
        .from("retainer_funds")
        .select("case_id, amount")
        .eq("organization_id", orgId);

      if (retainerError) throw retainerError;

      // Aggregate retainer balances by case
      const caseRetainerMap: Record<string, number> = {};
      retainerData?.forEach((fund: any) => {
        const caseId = fund.case_id;
        if (!caseRetainerMap[caseId]) {
          caseRetainerMap[caseId] = 0;
        }
        caseRetainerMap[caseId] += parseFloat(fund.amount);
      });
      setRetainerMap(caseRetainerMap);

      // Fetch all invoices from invoices table
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("id, case_id, invoice_number, date, total, status, due_date, balance_due, total_paid")
        .eq("organization_id", orgId)
        .order("date", { ascending: false });

      if (invoiceError) throw invoiceError;

      const formattedInvoices: Invoice[] = invoiceData?.map((inv: any) => {
        const caseInfo = casesMap.get(inv.case_id);
        return {
          id: inv.id,
          invoice_number: inv.invoice_number,
          case_title: caseInfo?.title || "Unknown",
          case_number: caseInfo?.case_number || "N/A",
          case_id: inv.case_id,
          date: inv.date,
          amount: parseFloat(inv.total),
          status: inv.status,
          due_date: inv.due_date,
          balance_due: inv.balance_due ? parseFloat(inv.balance_due) : undefined,
          total_paid: inv.total_paid ? parseFloat(inv.total_paid) : 0,
        };
      }) || [];

      setInvoices(formattedInvoices);
    } catch (error: any) {
      console.error("Error fetching invoice data:", error);
      toast.error("Failed to load invoice data");
    } finally {
      setLoading(false);
    }
  };

  // Filter functions
  const filteredInvoices = invoices.filter((invoice) => {
    const searchLower = invoiceSearch.toLowerCase();
    const matchesSearch =
      invoice.case_title.toLowerCase().includes(searchLower) ||
      invoice.case_number.toLowerCase().includes(searchLower) ||
      (invoice.invoice_number?.toLowerCase().includes(searchLower) ?? false);
    
    const matchesStatus =
      invoiceStatusFilter === "all" ||
      invoice.status === invoiceStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Paginated data
  const paginatedInvoices = filteredInvoices.slice(
    (invoicePage - 1) * invoicePageSize,
    invoicePage * invoicePageSize
  );
  const invoiceTotalPages = Math.ceil(filteredInvoices.length / invoicePageSize);

  // Export functions
  const exportToCSV = () => {
    const headers = ["Invoice #", "Case Number", "Case Title", "Date", "Due Date", "Total", "Paid", "Balance Due", "Status"];
    const rows = filteredInvoices.map(inv => [
      inv.invoice_number || "",
      inv.case_number,
      inv.case_title,
      format(new Date(inv.date), "yyyy-MM-dd"),
      inv.due_date ? format(new Date(inv.due_date), "yyyy-MM-dd") : "",
      inv.amount.toFixed(2),
      (inv.total_paid || 0).toFixed(2),
      (inv.balance_due !== undefined ? inv.balance_due : inv.amount - (inv.total_paid || 0)).toFixed(2),
      inv.status || "Draft"
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Invoices exported to CSV");
  };

  const exportToPDF = () => {
    const printContent = document.createElement("div");
    printContent.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="margin-bottom: 8px; font-size: 24px;">Invoices Report</h1>
        <p style="margin-bottom: 20px; color: #666; font-size: 14px;">Generated: ${format(new Date(), "MMMM d, yyyy")}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Invoice #</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Case</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Date</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Due Date</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Paid</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Balance</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredInvoices.map(inv => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${inv.invoice_number || "N/A"}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${inv.case_number} - ${inv.case_title}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${format(new Date(inv.date), "MMM d, yyyy")}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${inv.due_date ? format(new Date(inv.due_date), "MMM d, yyyy") : "-"}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${inv.amount.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${(inv.total_paid || 0).toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${(inv.balance_due !== undefined ? inv.balance_due : inv.amount - (inv.total_paid || 0)).toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${inv.status || "Draft"}</td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr style="background: #f3f4f6; font-weight: bold;">
              <td colspan="4" style="border: 1px solid #ddd; padding: 8px; text-align: right;">Totals:</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${filteredInvoices.reduce((sum, i) => sum + i.amount, 0).toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${filteredInvoices.reduce((sum, i) => sum + (i.total_paid || 0), 0).toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${filteredInvoices.reduce((sum, i) => sum + (i.balance_due !== undefined ? i.balance_due : i.amount - (i.total_paid || 0)), 0).toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 8px;"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
    
    html2pdf()
      .set({
        margin: 10,
        filename: `invoices-${format(new Date(), "yyyy-MM-dd")}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }
      })
      .from(printContent)
      .save();
    
    toast.success("Invoices exported to PDF");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground">
          System-wide invoice overview
        </p>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>
            {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-[0.625rem] h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice #, case..."
                value={invoiceSearch}
                onChange={(e) => {
                  setInvoiceSearch(e.target.value);
                  setInvoicePage(1);
                }}
                className="pl-8"
              />
            </div>
            <Select value={invoiceStatusFilter} onValueChange={(v) => {
              setInvoiceStatusFilter(v);
              setInvoicePage(1);
            }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={invoicePageSize.toString()} onValueChange={(v) => {
              setInvoicePageSize(parseInt(v));
              setInvoicePage(1);
            }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export to CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export to PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {filteredInvoices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No matching invoices found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total / Paid</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.map((invoice) => (
                  <TableRow 
                    key={invoice.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/invoices/${invoice.id}`);
                      }
                    }}
                  >
                    <TableCell className="font-medium">
                      {invoice.invoice_number || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.case_title}</div>
                        <div className="text-sm text-muted-foreground">
                          {invoice.case_number}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(invoice.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-y-0.5">
                        <div className="font-medium">${invoice.amount.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">
                          Paid: ${(invoice.total_paid || 0).toFixed(2)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${(invoice.balance_due !== undefined && invoice.balance_due !== null ? invoice.balance_due : (invoice.amount - (invoice.total_paid || 0))).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          invoice.status === "paid"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : invoice.status === "partial"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : invoice.status === "unpaid"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                        }`}
                      >
                        {invoice.status || "Draft"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {invoice.status !== "paid" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPayModal(invoice);
                            }}
                            title="Record payment"
                          >
                            <CircleDollarSign className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingInvoice(invoice.id);
                          }}
                          title="Edit invoice"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm("Are you sure you want to delete this invoice?")) {
                              const { error } = await supabase
                                .from("invoices")
                                .delete()
                                .eq("id", invoice.id);
                              
                              if (error) {
                                toast.error("Failed to delete invoice");
                              } else {
                                toast.success("Invoice deleted");
                                fetchInvoiceData();
                              }
                            }
                          }}
                          title="Delete invoice"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filteredInvoices.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((invoicePage - 1) * invoicePageSize) + 1} to {Math.min(invoicePage * invoicePageSize, filteredInvoices.length)} of {filteredInvoices.length} entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInvoicePage(p => Math.max(1, p - 1))}
                  disabled={invoicePage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm">
                  Page {invoicePage} of {invoiceTotalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInvoicePage(p => Math.min(invoiceTotalPages, p + 1))}
                  disabled={invoicePage === invoiceTotalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Modal */}
      {showPayModal && (
        <RecordPaymentModal
          invoice={{
            id: showPayModal.id,
            invoice_number: showPayModal.invoice_number || "",
            case_id: showPayModal.case_id,
            total: showPayModal.amount,
            balance_due: showPayModal.balance_due ?? showPayModal.amount,
          }}
          caseRetainerBalance={retainerMap[showPayModal.case_id] || 0}
          open={!!showPayModal}
          onClose={() => setShowPayModal(null)}
          onPaymentRecorded={fetchInvoiceData}
        />
      )}

      {/* Edit Invoice Dialog */}
      {editingInvoice && (
        <EditInvoiceDialog
          invoiceId={editingInvoice}
          open={!!editingInvoice}
          onOpenChange={(open) => !open && setEditingInvoice(null)}
          onSuccess={fetchInvoiceData}
        />
      )}
    </div>
  );
};

export default AllInvoices;
