import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FinanceForm } from "./FinanceForm";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  useEffect(() => {
    fetchFinances();
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Finances</h2>
          <p className="text-muted-foreground">Retainers, expenses, and invoices</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
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
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
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
        <div className="space-y-4">
          {filteredFinances.map((finance) => (
            <Card key={finance.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{finance.description}</CardTitle>
                      <Badge className={getTypeColor(finance.finance_type)}>
                        {finance.finance_type}
                      </Badge>
                      <Badge className={getStatusColor(finance.status)}>
                        {finance.status}
                      </Badge>
                      {finance.category && (
                        <Badge variant="outline">{finance.category}</Badge>
                      )}
                    </div>
                    {finance.notes && (
                      <p className="text-sm text-muted-foreground mb-2">{finance.notes}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div>Date: {new Date(finance.date).toLocaleDateString()}</div>
                      {finance.invoice_number && (
                        <div>Invoice #: {finance.invoice_number}</div>
                      )}
                      {finance.start_date && (
                        <div>Period: {new Date(finance.start_date).toLocaleDateString()} - {finance.end_date ? new Date(finance.end_date).toLocaleDateString() : 'Ongoing'}</div>
                      )}
                      {finance.billing_frequency && (
                        <div>Frequency: {finance.billing_frequency}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        ${Number(finance.amount).toFixed(2)}
                      </div>
                    </div>
                    <div className="flex gap-1">
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
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <FinanceForm
        caseId={caseId}
        open={formOpen}
        onOpenChange={handleFormClose}
        onSuccess={fetchFinances}
        editingFinance={editingFinance}
      />
    </>
  );
};