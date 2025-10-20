import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign, Pencil, Trash2, Search, CheckCircle, XCircle, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FinanceForm } from "./FinanceForm";
import { InvoiceFromExpenses } from "./InvoiceFromExpenses";
import { InvoiceDetail } from "./InvoiceDetail";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Finance {
  id: string;
  finance_type: string;
  amount: number;
  description: string;
  date: string;
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
}

export const CaseFinances = ({ caseId }: { caseId: string }) => {
  const [finances, setFinances] = useState<Finance[]>([]);
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
    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
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
      invoice: "bg-green-500/10 text-green-500 border-green-500/20",
    };
    return colors[type] || "bg-muted";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      approved: "bg-green-500/10 text-green-500 border-green-500/20",
      rejected: "bg-red-500/10 text-red-500 border-red-500/20",
      paid: "bg-green-500/10 text-green-500 border-green-500/20",
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

  const totals = calculateTotals();

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

  if (loading) {
    return <p className="text-muted-foreground">Loading finances...</p>;
  }

  return (
    <>
      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="create-invoice">Create Invoice</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-6">
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
                <SelectItem value="invoice">Invoice</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Retainer</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totals.retainerTotal.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totals.expenseTotal.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totals.invoiceTotal.toFixed(2)}</div>
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
                  {filteredFinances.map((finance) => (
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

        <TabsContent value="invoices">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Invoices</h2>
              <p className="text-muted-foreground">View and manage all invoices</p>
            </div>

            {finances.filter(f => f.finance_type === "invoice").length === 0 ? (
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
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {finances
                      .filter(f => f.finance_type === "invoice")
                      .map((invoice) => (
                        <TableRow key={invoice.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            {invoice.invoice_number}
                          </TableCell>
                          <TableCell>
                            {new Date(invoice.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{invoice.description}</div>
                              {invoice.notes && (
                                <div className="text-sm text-muted-foreground">{invoice.notes}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(invoice.status)}>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            ${Number(invoice.amount).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedInvoiceId(invoice.id)}
                                title="View invoice"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(invoice)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(invoice.id)}
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