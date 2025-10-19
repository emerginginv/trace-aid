import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FinanceForm } from "./FinanceForm";
import { Badge } from "@/components/ui/badge";

interface Finance {
  id: string;
  finance_type: string;
  amount: number;
  description: string;
  date: string;
  status: string;
  created_at: string;
}

export const CaseFinances = ({ caseId }: { caseId: string }) => {
  const [finances, setFinances] = useState<Finance[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

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
      ) : (
        <div className="space-y-4">
          {finances.map((finance) => (
            <Card key={finance.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{finance.description}</CardTitle>
                    <Badge className={getTypeColor(finance.finance_type)}>
                      {finance.finance_type}
                    </Badge>
                    <Badge className={getStatusColor(finance.status)}>
                      {finance.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      ${Number(finance.amount).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(finance.date).toLocaleDateString()}
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
        onOpenChange={setFormOpen}
        onSuccess={fetchFinances}
      />
    </>
  );
};