import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Download, FileText, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FinanceReportsProps {
  caseId: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  description: string;
  amount: number;
  date: string;
  due_date?: string;
  status: string;
  subject_id?: string;
  notes?: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Payment {
  invoice_id: string;
  amount: number;
}

export const FinanceReports = ({ caseId }: FinanceReportsProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [dateFilterType, setDateFilterType] = useState<"created" | "due">("created");

  useEffect(() => {
    fetchData();
  }, [caseId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("case_finances")
        .select("*")
        .eq("case_id", caseId)
        .eq("user_id", user.id)
        .eq("finance_type", "invoice")
        .order("date", { ascending: false });

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);

      // Fetch subjects
      const { data: subjectsData } = await supabase
        .from("case_subjects")
        .select("id, name")
        .eq("case_id", caseId)
        .eq("user_id", user.id);

      setSubjects(subjectsData || []);

      // Fetch all payments
      const { data: paymentsData } = await supabase
        .from("invoice_payments")
        .select("invoice_id, amount")
        .eq("user_id", user.id);

      setPayments(paymentsData || []);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load invoice data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredInvoices = () => {
    return invoices.filter(invoice => {
      // Status filter
      if (statusFilter !== "all" && invoice.status !== statusFilter) {
        return false;
      }

      // Subject filter
      if (subjectFilter !== "all" && invoice.subject_id !== subjectFilter) {
        return false;
      }

      // Date range filter
      if (startDate || endDate) {
        const invoiceDate = new Date(dateFilterType === "created" ? invoice.date : (invoice.due_date || invoice.date));
        
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (invoiceDate < start) return false;
        }
        
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (invoiceDate > end) return false;
        }
      }

      return true;
    });
  };

  const calculateTotalPaid = (invoiceId: string) => {
    return payments
      .filter(p => p.invoice_id === invoiceId)
      .reduce((sum, p) => sum + Number(p.amount), 0);
  };

  const filteredInvoices = getFilteredInvoices();
  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const totalPaid = filteredInvoices.reduce((sum, inv) => sum + calculateTotalPaid(inv.id), 0);
  const totalRemaining = totalAmount - totalPaid;

  const exportToCSV = async () => {
    if (filteredInvoices.length === 0) {
      toast({
        title: "No data to export",
        description: "Please adjust your filters to include invoices",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create subject lookup
      const subjectLookup: Record<string, string> = {};
      subjects.forEach(s => {
        subjectLookup[s.id] = s.name;
      });

      // Prepare CSV data
      const headers = [
        "Invoice Number",
        "Client Name",
        "Description",
        "Invoice Date",
        "Due Date",
        "Total Amount",
        "Status",
        "Amount Paid",
        "Balance Remaining",
        "Notes"
      ];

      const rows = filteredInvoices.map(invoice => {
        const totalPaidAmount = calculateTotalPaid(invoice.id);
        const balance = Number(invoice.amount) - totalPaidAmount;
        const clientName = invoice.subject_id ? (subjectLookup[invoice.subject_id] || "N/A") : "N/A";

        return [
          invoice.invoice_number || "N/A",
          clientName,
          invoice.description,
          new Date(invoice.date).toLocaleDateString(),
          invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "N/A",
          `$${Number(invoice.amount).toFixed(2)}`,
          invoice.status,
          `$${totalPaidAmount.toFixed(2)}`,
          `$${balance.toFixed(2)}`,
          invoice.notes || ""
        ];
      });

      // Create CSV content
      const csvContent = [
        headers.join(","),
        ...rows.map(row => 
          row.map(cell => 
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
              ? `"${cell.replace(/"/g, '""')}"`
              : cell
          ).join(",")
        )
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      const filename = `invoices_export_${format(new Date(), "yyyy-MM-dd_HHmmss")}.csv`;
      
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `Downloaded ${filteredInvoices.length} invoice(s) to ${filename}`,
      });

    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast({
        title: "Export failed",
        description: "Failed to generate CSV file",
        variant: "destructive",
      });
    }
  };

  const applyPresetFilter = (preset: "this-month" | "last-90-days" | "this-year") => {
    const today = new Date();
    
    switch (preset) {
      case "this-month":
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        setStartDate(firstDayOfMonth);
        setEndDate(lastDayOfMonth);
        break;
      
      case "last-90-days":
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        setStartDate(ninetyDaysAgo);
        setEndDate(today);
        break;
      
      case "this-year":
        const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
        const lastDayOfYear = new Date(today.getFullYear(), 11, 31);
        setStartDate(firstDayOfYear);
        setEndDate(lastDayOfYear);
        break;
    }

    toast({
      title: "Filter applied",
      description: `Showing invoices for ${preset.replace("-", " ")}`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Reports & Export</h2>
        <p className="text-muted-foreground">Filter and export invoice data</p>
      </div>

      {/* Quick Preset Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Quick Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPresetFilter("this-month")}
            >
              This Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPresetFilter("last-90-days")}
            >
              Last 90 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPresetFilter("this-year")}
            >
              This Fiscal Year
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartDate(undefined);
                setEndDate(undefined);
                setStatusFilter("all");
                setSubjectFilter("all");
              }}
            >
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Advanced Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Date Filter Type */}
            <div className="space-y-2">
              <Label>Date Filter By</Label>
              <Select value={dateFilterType} onValueChange={(value: "created" | "due") => setDateFilterType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Invoice Date</SelectItem>
                  <SelectItem value="due">Due Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partially Paid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Subject/Client Filter */}
            {subjects.length > 0 && (
              <div className="space-y-2 md:col-span-2">
                <Label>Client/Subject</Label>
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {subjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Filter Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <div className="text-sm text-muted-foreground">Invoices</div>
              <div className="text-2xl font-bold">{filteredInvoices.length}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Paid</div>
              <div className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Balance Remaining</div>
              <div className="text-2xl font-bold text-orange-600">${totalRemaining.toFixed(2)}</div>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Button
              onClick={exportToCSV}
              disabled={loading || filteredInvoices.length === 0}
              className="flex-1"
            >
              <Download className="h-4 w-4" />
              Export to CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {filteredInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Preview (First 10 invoices)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredInvoices.slice(0, 10).map(invoice => {
                const totalPaidAmount = calculateTotalPaid(invoice.id);
                const balance = Number(invoice.amount) - totalPaidAmount;
                const subject = subjects.find(s => s.id === invoice.subject_id);

                return (
                  <div key={invoice.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex-1">
                      <div className="font-medium">{invoice.invoice_number || invoice.description}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {subject && <span>{subject.name}</span>}
                        <span>•</span>
                        <span>{new Date(invoice.date).toLocaleDateString()}</span>
                        <Badge variant="outline" className="ml-2">
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">${Number(invoice.amount).toFixed(2)}</div>
                      {totalPaidAmount > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Balance: ${balance.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredInvoices.length > 10 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  ...and {filteredInvoices.length - 10} more invoice{filteredInvoices.length - 10 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};