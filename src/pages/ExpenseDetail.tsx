import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, DollarSign, FileText, Tag, User } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Expense {
  id: string;
  case_id: string;
  user_id: string;
  finance_type: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  status: string;
  notes: string;
  invoiced: boolean;
  invoice_id: string | null;
  created_at: string;
  quantity: number | null;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

const ExpenseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useSetBreadcrumbs([
    { label: "Finance", href: "/finance" },
    { label: "Expenses", href: "/expenses" },
    { label: expense?.description || "Expense" },
  ]);

  useEffect(() => {
    fetchExpense();
  }, [id]);

  const fetchExpense = async () => {
    try {
      setLoading(true);
      
      const { data: expenseData, error: expenseError } = await supabase
        .from("case_finances")
        .select("*")
        .eq("id", id)
        .eq("finance_type", "expense")
        .maybeSingle();

      if (expenseError) throw expenseError;

      if (!expenseData) {
        toast({
          title: "Expense not found",
          description: "The requested expense could not be found.",
          variant: "destructive",
        });
        navigate("/finance");
        return;
      }

      setExpense(expenseData);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", expenseData.user_id)
        .maybeSingle();

      if (profileData) {
        setUserProfile(profileData);
      }
    } catch (error) {
      console.error("Error fetching expense:", error);
      toast({
        title: "Error",
        description: "Failed to load expense details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      approved: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-6 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!expense) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate(`/cases/${expense.case_id}`)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Case
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{expense.description}</CardTitle>
              <div className="flex gap-2">
                {getStatusBadge(expense.status)}
                {expense.invoiced && <Badge variant="outline">Invoiced</Badge>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                ${expense.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Date: {format(new Date(expense.date), "PPP")}</span>
            </div>

            {expense.category && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Tag className="h-4 w-4" />
                <span>Category: {expense.category}</span>
              </div>
            )}

            {expense.quantity && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Quantity: {expense.quantity.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
              </div>
            )}

            {userProfile && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>
                  Created by {userProfile.full_name || userProfile.email}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Submitted on {format(new Date(expense.created_at), "PPP")}
              </span>
            </div>
          </div>

          {expense.notes && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <FileText className="h-4 w-4" />
                Notes
              </div>
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {expense.notes}
                </p>
              </div>
            </div>
          )}

          {expense.invoice_id && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <DollarSign className="h-4 w-4" />
                Invoice Information
              </div>
              <Button
                variant="outline"
                onClick={() => navigate(`/invoices/${expense.invoice_id}`)}
              >
                View Invoice
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseDetail;
