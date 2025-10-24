import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign, Pencil, Trash2, Search, CheckCircle, XCircle, Eye, AlertCircle, Calendar, TrendingUp, Clock, MoreVertical, Edit, CheckCircle2, Trash2 as Trash2Icon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FinanceForm } from "./FinanceForm";
import { InvoiceFromExpenses } from "./InvoiceFromExpenses";
import { InvoiceDetail } from "./InvoiceDetail";
import { FinanceReports } from "./FinanceReports";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Finance {
  id: string;
  finance_type: string;
  amount: number;
  description: string;
  date: string;
  due_date?: string;
  status: string;
  created_at: string;
  subject_id?: string;
  activity_id?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  billing_frequency?: string;
  invoice_number?: string;
  notes?: string;
  hours?: number;
  hourly_rate?: number;
}

export const CaseFinances = ({ caseId }: { caseId: string }) => {
  const [finances, setFinances] = useState<Finance[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingFinance, setEditingFinance] = useState<Finance | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    fetchFinances();

    // Set up realtime subscription for finance updates
    const financesChannel = supabase
      .channel('case-finances-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'case_finances',
          filter: `case_id=eq.${caseId}`
        },
        () => {
          fetchFinances();
        }
      )
      .subscribe();

    // Set up realtime subscription for invoices updates
    const invoicesChannel = supabase
      .channel('invoices-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `case_id=eq.${caseId}`
        },
        () => {
          fetchFinances();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(financesChannel);
      supabase.removeChannel(invoicesChannel);
    };
  }, [caseId]);

  const fetchFinances = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("case_finances")
        .select("*")
        .eq("case_id", caseId)
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (error) throw error;
      setFinances(data || []);

      // Fetch invoices from the new invoices table
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .eq("case_id", caseId)
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);
    } catch (error) {
      console.error("Error fetching finances:", error);
      toast({
        title: "Error",
        description: "Failed to load finances",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      retainer: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      expense: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      time: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      invoice: "bg-green-500/10 text-green-500 border-green-500/20",
    };
    return colors[type] || "bg-muted";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-500/10 text-gray-500 border-gray-500/20",
      sent: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      approved: "bg-green-500/10 text-green-500 border-green-500/20",
      rejected: "bg-red-500/10 text-red-500 border-red-500/20",
      paid: "bg-green-500/10 text-green-500 border-green-500/20",
      partial: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      overdue: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return colors[status] || "bg-muted";
  };

  const calculateTotals = () => {
    const retainerTotal = finances
      .filter((f) => f.finance_type === "retainer" && f.status === "paid")
      .reduce((sum, f) => sum + Number(f.amount), 0);
    
    const expenseTotal = finances
      .filter((f) => f.finance_type === "expense")
      .reduce((sum, f) => sum + Number(f.amount), 0);
    
    const invoiceTotal = finances
      .filter((f) => f.finance_type === "invoice")
      .reduce((sum, f) => sum + Number(f.amount), 0);

    return { retainerTotal, expenseTotal, invoiceTotal };
  };

  const calculateInvoiceMetrics = () => {
    const invoices = finances.filter(f => f.finance_type === "invoice");
    
    // Unpaid invoices (pending, sent, partial, overdue)
    const unpaidInvoices = invoices.filter(inv => 
      inv.status === "pending" || inv.status === "sent" || inv.status === "partial" || inv.status === "overdue"
    );
    
    const unpaidCount = unpaidInvoices.length;
    const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    
    // Overdue invoices
    const overdueInvoices = invoices.filter(inv => inv.status === "overdue");
    const overdueCount = overdueInvoices.length;
    const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    
    // Upcoming invoices (due in next 7 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const upcomingInvoices = invoices
      .filter(inv => {
        if (!inv.due_date || inv.status === "paid") return false;
        const dueDate = new Date(inv.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today && dueDate <= nextWeek;
      })
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 5);
    
    return {
      unpaidCount,
      unpaidTotal,
      overdueCount,
      overdueTotal,
      upcomingInvoices,
    };
  };

  const totals = calculateTotals();
  const invoiceMetrics = calculateInvoiceMetrics();

  const getDueDateLabel = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Due Today";
    if (diffDays === 1) return "Due Tomorrow";
    if (diffDays > 1 && diffDays <= 7) return `Due in ${diffDays} days`;
    return "Upcoming";
  };

  const getDueDateColor = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "bg-red-500/10 text-red-500 border-red-500/20";
    if (diffDays === 1) return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  };

  const handleEdit = (finance: Finance) => {
    setEditingFinance(finance);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      const { error } = await supabase
        .from("case_finances")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
      fetchFinances();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingFinance(null);
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from("case_finances")
        .update({ status: "approved" })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense approved successfully",
      });
      fetchFinances();
    } catch (error) {
      console.error("Error approving expense:", error);
      toast({
        title: "Error",
        description: "Failed to approve expense",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from("case_finances")
        .update({ status: "rejected" })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense rejected",
      });
      fetchFinances();
    } catch (error) {
      console.error("Error rejecting expense:", error);
      toast({
        title: "Error",
        description: "Failed to reject expense",
        variant: "destructive",
      });
    }
  };

  const filteredFinances = finances.filter(finance => {
    const matchesSearch = searchQuery === '' || 
      finance.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      finance.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      finance.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || finance.finance_type === typeFilter;
    
    const matchesStatus = statusFilter === 'all' || finance.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const expenseFinances = filteredFinances.filter(
    (f) => f.finance_type === "retainer" || f.finance_type === "expense"
  );

  const timeFinances = filteredFinances.filter(
    (f) => f.finance_type === "time"
  );

  const timeMetrics = timeFinances.reduce(
    (acc, curr) => ({
      totalHours: acc.totalHours + (curr.hours || 0),
      totalAmount: acc.totalAmount + Number(curr.amount),
    }),
    { totalHours: 0, totalAmount: 0 }
  );

  if (loading) {
    return <p className="text-muted-foreground">Loading finances...</p>;
  }

  return (
    <>
      <Tabs defaultValue="expenses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="time">Time</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="create-invoice">Create Invoice</TabsTrigger>
          <TabsTrigger value="reports">Reports & Export</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Finances</h2>
              <p className="text-muted-foreground">Retainers, expenses, and invoices</p>
            </div>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Transaction
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search finances (description, invoice #, notes)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="retainer">Retainer</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="partial">Partially Paid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">Total Retainer</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">${totals.retainerTotal.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">Total Expenses</CardTitle>
                <DollarSign className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">${totals.expenseTotal.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">Total Invoiced</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">${totals.invoiceTotal.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Dashboard Widgets */}
          {invoiceMetrics.overdueCount > 0 && (
            <Card className="border-red-500/50 bg-red-500/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-500 mb-1">
                      {invoiceMetrics.overdueCount} {invoiceMetrics.overdueCount === 1 ? 'invoice is' : 'invoices are'} overdue
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Total outstanding: <span className="font-bold text-red-500">${invoiceMetrics.overdueTotal.toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {/* Unpaid Invoices Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Unpaid Invoices</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold">{invoiceMetrics.unpaidCount}</div>
                    <div className="text-sm text-muted-foreground">
                      {invoiceMetrics.unpaidCount === 1 ? 'invoice' : 'invoices'}
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total outstanding: </span>
                    <span className="font-bold">${invoiceMetrics.unpaidTotal.toFixed(2)}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => {
                      setTypeFilter("invoice");
                      setStatusFilter("all");
                    }}
                  >
                    View Invoices
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Due Dates Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Due Dates</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {invoiceMetrics.upcomingInvoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No invoices due in the next 7 days
                  </p>
                ) : (
                  <div className="space-y-3">
                    {invoiceMetrics.upcomingInvoices.map((invoice) => (
                      <div 
                        key={invoice.id}
                        className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {invoice.invoice_number || invoice.description}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getDueDateColor(invoice.due_date!)} variant="outline">
                              {getDueDateLabel(invoice.due_date!)}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <div className="font-bold">
                            ${Number(invoice.amount).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => {
                        setTypeFilter("invoice");
                      }}
                    >
                      View All
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {finances.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No financial records yet</p>
                <Button onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add First Transaction
                </Button>
              </CardContent>
            </Card>
          ) : filteredFinances.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No finances match your search criteria</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseFinances.map((finance) => (
                    <TableRow key={finance.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {new Date(finance.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{finance.description}</div>
                          {finance.notes && (
                            <div className="text-sm text-muted-foreground">{finance.notes}</div>
                          )}
                          {finance.invoice_number && (
                            <div className="text-sm text-muted-foreground">
                              Invoice #: {finance.invoice_number}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(finance.finance_type)}>
                          {finance.finance_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(finance.status)}>
                          {finance.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {finance.category && (
                          <Badge variant="outline">{finance.category}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ${Number(finance.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {finance.finance_type === "invoice" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedInvoiceId(finance.id)}
                              title="View invoice"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {finance.finance_type === "expense" && finance.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleApprove(finance.id)}
                                title="Approve expense"
                              >
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleReject(finance.id)}
                                title="Reject expense"
                              >
                                <XCircle className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(finance)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(finance.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="time" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hours Logged</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{timeMetrics.totalHours.toFixed(2)} hrs</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Time Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${timeMetrics.totalAmount.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Time Entries</CardTitle>
                <Button onClick={() => setFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Log Time
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search time entries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {timeFinances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mb-4 opacity-20" />
                  <p>No time entries yet</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeFinances.map((finance) => (
                        <TableRow key={finance.id}>
                          <TableCell>{new Date(finance.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{finance.description}</div>
                              {finance.category && (
                                <div className="text-sm text-muted-foreground">{finance.category}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {finance.subject_id ? (
                              <Badge variant="outline">Linked</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{finance.hours?.toFixed(2) || 0}</TableCell>
                          <TableCell className="text-right">${finance.hourly_rate?.toFixed(2) || 0}</TableCell>
                          <TableCell className="text-right font-medium">${Number(finance.amount).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(finance.status)}>
                              {finance.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(finance)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                {finance.status === "pending" && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleApprove(finance.id)}>
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                      Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleReject(finance.id)}>
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Reject
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleDelete(finance.id)}
                                  className="text-destructive"
                                >
                                  <Trash2Icon className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Invoices</h2>
              <p className="text-muted-foreground">View and manage all invoices</p>
            </div>

            {invoices.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">No invoices created yet</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => window.location.href = `/invoices/${invoice.id}`}
                      >
                        <TableCell className="font-medium">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-bold">${Number(invoice.total).toFixed(2)}</div>
                          {invoice.retainer_applied > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Retainer: -${Number(invoice.retainer_applied).toFixed(2)}
                            </div>
                          )}
                          {invoice.balance_due !== invoice.total && (
                            <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                              Due: ${Number(invoice.balance_due || invoice.total).toFixed(2)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.location.href = `/invoices/${invoice.id}`}
                              title="View invoice"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                // Convert invoice to finance format for editing
                                const financeData = {
                                  id: invoice.id,
                                  finance_type: 'invoice',
                                  amount: invoice.total,
                                  description: invoice.invoice_number,
                                  date: invoice.date,
                                  due_date: invoice.due_date,
                                  status: invoice.status,
                                  invoice_number: invoice.invoice_number,
                                  notes: invoice.notes,
                                  created_at: invoice.created_at
                                };
                                handleEdit(financeData);
                              }}
                              title="Edit invoice"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(invoice.id)}
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
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="create-invoice">
          <InvoiceFromExpenses caseId={caseId} />
        </TabsContent>

        <TabsContent value="reports">
          <FinanceReports caseId={caseId} />
        </TabsContent>
      </Tabs>

      <FinanceForm
        caseId={caseId}
        open={formOpen}
        onOpenChange={handleFormClose}
        onSuccess={fetchFinances}
        editingFinance={editingFinance}
      />

      {selectedInvoiceId && (
        <InvoiceDetail
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}
    </>
  );
};