import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useNavigate } from "react-router-dom";
import { Search, Pencil, Trash2, CircleDollarSign, Download, FileSpreadsheet, FileText, Plus, CalendarIcon, X, LayoutGrid, List, FileCheck } from "lucide-react";
import { ResponsiveButton } from "@/components/ui/responsive-button";
import RecordPaymentModal from "@/components/case-detail/RecordPaymentModal";
import { EditInvoiceDialog } from "@/components/case-detail/EditInvoiceDialog";
import { InvoiceFromExpenses } from "@/components/case-detail/InvoiceFromExpenses";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { useOrganization } from "@/contexts/OrganizationContext";
import html2pdf from "html2pdf.js";

import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { TableHeader, TableRow as TRow } from "@/components/ui/table";
import { ColumnVisibility } from "@/components/ui/column-visibility";
import { useColumnVisibility, ColumnDefinition } from "@/hooks/use-column-visibility";
import { useSortPreference } from "@/hooks/use-sort-preference";
import { InvoicesPageSkeleton } from "@/components/ui/list-page-skeleton";

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

interface Case {
  id: string;
  title: string;
  case_number: string;
}

const COLUMNS: ColumnDefinition[] = [
  { key: "invoice_number", label: "Invoice #" },
  { key: "case", label: "Case" },
  { key: "date", label: "Date" },
  { key: "due_date", label: "Due Date" },
  { key: "amount", label: "Total" },
  { key: "total_paid", label: "Paid" },
  { key: "balance_due", label: "Balance Due" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions", hideable: false },
];

const AllInvoices = () => {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [retainerMap, setRetainerMap] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  // Filter states
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [showPayModal, setShowPayModal] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<string | null>(null);
  
  // Create invoice dialog states
  const [showCreateInvoiceDialog, setShowCreateInvoiceDialog] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [showInvoiceFromExpenses, setShowInvoiceFromExpenses] = useState(false);
  
  // Sorting states
  const { sortColumn, sortDirection, handleSort } = useSortPreference("invoices", "date", "desc");

  const { visibility, isVisible, toggleColumn, resetToDefaults } = useColumnVisibility("invoices-columns", COLUMNS);

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

      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select("id, title, case_number")
        .eq("organization_id", orgId)
        .order("case_number", { ascending: false });

      if (casesError) throw casesError;

      setCases(casesData || []);
      const casesMap = new Map(casesData?.map(c => [c.id, c]) || []);

      const { data: retainerData, error: retainerError } = await supabase
        .from("retainer_funds")
        .select("case_id, amount")
        .eq("organization_id", orgId);

      if (retainerError) throw retainerError;

      const caseRetainerMap: Record<string, number> = {};
      retainerData?.forEach((fund: any) => {
        const caseId = fund.case_id;
        if (!caseRetainerMap[caseId]) {
          caseRetainerMap[caseId] = 0;
        }
        caseRetainerMap[caseId] += parseFloat(fund.amount);
      });
      setRetainerMap(caseRetainerMap);

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

  const filteredInvoices = invoices.filter((invoice) => {
    const searchLower = invoiceSearch.toLowerCase();
    const matchesSearch =
      invoice.case_title.toLowerCase().includes(searchLower) ||
      invoice.case_number.toLowerCase().includes(searchLower) ||
      (invoice.invoice_number?.toLowerCase().includes(searchLower) ?? false);
    
    const matchesStatus =
      invoiceStatusFilter === "all" ||
      invoice.status === invoiceStatusFilter;
    
    const invoiceDate = new Date(invoice.date);
    const matchesDateFrom = !dateFrom || invoiceDate >= dateFrom;
    const matchesDateTo = !dateTo || invoiceDate <= dateTo;
    
    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal: any;
    let bVal: any;
    
    switch (sortColumn) {
      case "invoice_number":
        aVal = a.invoice_number || "";
        bVal = b.invoice_number || "";
        break;
      case "case":
        aVal = a.case_number;
        bVal = b.case_number;
        break;
      case "date":
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
        break;
      case "due_date":
        aVal = a.due_date ? new Date(a.due_date).getTime() : 0;
        bVal = b.due_date ? new Date(b.due_date).getTime() : 0;
        break;
      case "amount":
        aVal = a.amount;
        bVal = b.amount;
        break;
      case "total_paid":
        aVal = a.total_paid || 0;
        bVal = b.total_paid || 0;
        break;
      case "balance_due":
        aVal = a.balance_due !== undefined ? a.balance_due : a.amount - (a.total_paid || 0);
        bVal = b.balance_due !== undefined ? b.balance_due : b.amount - (b.total_paid || 0);
        break;
      case "status":
        aVal = a.status || "";
        bVal = b.status || "";
        break;
      default:
        return 0;
    }
    
    if (aVal == null) return sortDirection === "asc" ? 1 : -1;
    if (bVal == null) return sortDirection === "asc" ? -1 : 1;
    
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "asc" 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    }
    
    return sortDirection === "asc" 
      ? (aVal as number) - (bVal as number) 
      : (bVal as number) - (aVal as number);
  });

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

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    
    try {
      await supabase
        .from("case_finances")
        .delete()
        .eq("invoice_id", invoiceId);
      
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceId);
      
      if (error) throw error;
      
      toast.success("Invoice deleted successfully");
      fetchInvoiceData();
    } catch (error: any) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice");
    }
  };

  const handleCaseSelect = () => {
    if (!selectedCaseId) {
      toast.error("Please select a case");
      return;
    }
    setShowCreateInvoiceDialog(false);
    setShowInvoiceFromExpenses(true);
  };

  if (loading) {
    return <InvoicesPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground mt-2">
            System-wide invoice overview
          </p>
        </div>
        <Button onClick={() => setShowCreateInvoiceDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Search and Filters - Outside Card */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-[0.625rem] h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice #, case..."
            value={invoiceSearch}
            onChange={(e) => setInvoiceSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
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
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-[140px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-[140px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "MMM d, yyyy") : "To date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        {(dateFrom || dateTo) && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              setDateFrom(undefined);
              setDateTo(undefined);
            }}
            title="Clear date filters"
            className="h-10 w-10"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <ColumnVisibility
          columns={COLUMNS}
          visibility={visibility}
          onToggle={toggleColumn}
          onReset={resetToDefaults}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ResponsiveButton
              icon={<Download className="h-4 w-4" />}
              label="Export"
              variant="outline"
              size="sm"
              className="h-10"
            />
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
        <div className="flex gap-1 border rounded-md p-1 h-10">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="h-7 w-7 p-0"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-7 w-7 p-0"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Entry count */}
      <div className="text-sm text-muted-foreground">
        Showing {sortedInvoices.length} invoice{sortedInvoices.length !== 1 ? 's' : ''}
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileCheck className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No invoices yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first invoice to get started
            </p>
            <Button className="gap-2" onClick={() => setShowCreateInvoiceDialog(true)}>
              <Plus className="w-4 h-4" />
              Create First Invoice
            </Button>
          </CardContent>
        </Card>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No invoices match your search criteria</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedInvoices.map((invoice) => {
            const balanceDue = invoice.balance_due !== undefined 
              ? invoice.balance_due 
              : invoice.amount - (invoice.total_paid || 0);
            
            return (
              <Card 
                key={invoice.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/invoices/${invoice.id}`)}
              >
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold">{invoice.invoice_number || "N/A"}</div>
                      <div className="text-sm text-muted-foreground">{invoice.case_number}</div>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      invoice.status === "paid"
                        ? "bg-green-100 text-green-700"
                        : invoice.status === "partial"
                        ? "bg-yellow-100 text-yellow-700"
                        : invoice.status === "sent"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {invoice.status || "Draft"}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span>{format(new Date(invoice.date), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-medium">${invoice.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Balance Due</span>
                      <span className="font-medium">${balanceDue.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPayModal(invoice)}
                    >
                      <CircleDollarSign className="h-4 w-4 mr-1" />
                      Pay
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingInvoice(invoice.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteInvoice(invoice.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-4">
            {sortedInvoices.map((invoice) => {
              const balanceDue = invoice.balance_due !== undefined 
                ? invoice.balance_due 
                : invoice.amount - (invoice.total_paid || 0);
              
              return (
                <Card 
                  key={invoice.id} 
                  className="p-4 cursor-pointer hover:shadow-md transition-all"
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{invoice.invoice_number || "N/A"}</div>
                        <div className="text-sm text-muted-foreground">{invoice.case_number} - {invoice.case_title}</div>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        invoice.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : invoice.status === "partial"
                          ? "bg-yellow-100 text-yellow-700"
                          : invoice.status === "sent"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {invoice.status || "Draft"}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>Date: {format(new Date(invoice.date), "MMM d, yyyy")}</div>
                      <div>Total: ${invoice.amount.toFixed(2)}</div>
                      <div className="font-medium">Balance: ${balanceDue.toFixed(2)}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden sm:block">
            <Table>
              <TableHeader>
                <TRow>
                  {isVisible("invoice_number") && (
                    <SortableTableHead
                      column="invoice_number"
                      label="Invoice #"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  )}
                  {isVisible("case") && (
                    <SortableTableHead
                      column="case"
                      label="Case"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  )}
                  {isVisible("date") && (
                    <SortableTableHead
                      column="date"
                      label="Date"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  )}
                  {isVisible("due_date") && (
                    <SortableTableHead
                      column="due_date"
                      label="Due Date"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  )}
                  {isVisible("amount") && (
                    <SortableTableHead
                      column="amount"
                      label="Total"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      className="text-right"
                    />
                  )}
                  {isVisible("total_paid") && (
                    <SortableTableHead
                      column="total_paid"
                      label="Paid"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      className="text-right"
                    />
                  )}
                  {isVisible("balance_due") && (
                    <SortableTableHead
                      column="balance_due"
                      label="Balance Due"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      className="text-right"
                    />
                  )}
                  {isVisible("status") && (
                    <SortableTableHead
                      column="status"
                      label="Status"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  )}
                  {isVisible("actions") && (
                    <th className="text-right p-2">Actions</th>
                  )}
                </TRow>
              </TableHeader>
              <TableBody>
                {sortedInvoices.map((invoice) => {
                  const balanceDue = invoice.balance_due !== undefined 
                    ? invoice.balance_due 
                    : invoice.amount - (invoice.total_paid || 0);
                  
                  return (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    >
                      <TableCell className="font-medium">
                        {invoice.invoice_number || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{invoice.case_number}</span>
                          <span className="text-xs text-muted-foreground">{invoice.case_title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {invoice.due_date
                          ? format(new Date(invoice.due_date), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${invoice.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${(invoice.total_paid || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${balanceDue.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          invoice.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : invoice.status === "partial"
                            ? "bg-yellow-100 text-yellow-700"
                            : invoice.status === "sent"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {invoice.status || "Draft"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowPayModal(invoice)}
                            title="Record Payment"
                          >
                            <CircleDollarSign className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingInvoice(invoice.id)}
                            title="Edit Invoice"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            title="Delete Invoice"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Create Invoice Dialog */}
      <Dialog open={showCreateInvoiceDialog} onOpenChange={setShowCreateInvoiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>
              Select a case to create an invoice from its uninvoiced expenses and time entries.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a case" />
              </SelectTrigger>
              <SelectContent>
                {cases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.case_number} - {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateInvoiceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCaseSelect}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showInvoiceFromExpenses && selectedCaseId && (
        <Dialog open={showInvoiceFromExpenses} onOpenChange={(open) => {
          setShowInvoiceFromExpenses(open);
          if (!open) setSelectedCaseId("");
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <InvoiceFromExpenses
              caseId={selectedCaseId}
              onSuccess={() => {
                setShowInvoiceFromExpenses(false);
                setSelectedCaseId("");
                fetchInvoiceData();
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {showPayModal && organization?.id && (
        <RecordPaymentModal
          invoice={{
            id: showPayModal.id,
            invoice_number: showPayModal.invoice_number || "",
            total: showPayModal.amount,
            balance_due: showPayModal.balance_due !== undefined 
              ? showPayModal.balance_due 
              : showPayModal.amount - (showPayModal.total_paid || 0),
            case_id: showPayModal.case_id,
          }}
          caseRetainerBalance={retainerMap[showPayModal.case_id] || 0}
          open={!!showPayModal}
          onClose={() => setShowPayModal(null)}
          onPaymentRecorded={() => {
            setShowPayModal(null);
            fetchInvoiceData();
          }}
          organizationId={organization.id}
        />
      )}

      {editingInvoice && (
        <EditInvoiceDialog
          invoiceId={editingInvoice}
          open={!!editingInvoice}
          onOpenChange={(open) => !open && setEditingInvoice(null)}
          onSuccess={() => {
            setEditingInvoice(null);
            fetchInvoiceData();
          }}
        />
      )}
    </div>
  );
};

export default AllInvoices;
