import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, History, DollarSign, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
interface RetainerFund {
  id: string;
  amount: number;
  note: string | null;
  created_at: string;
  invoice_id: string | null;
}
interface RetainerFundsWidgetProps {
  caseId: string;
}
export function RetainerFundsWidget({
  caseId
}: RetainerFundsWidgetProps) {
  const [balance, setBalance] = useState<number>(0);
  const [funds, setFunds] = useState<RetainerFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [editingFund, setEditingFund] = useState<RetainerFund | null>(null);
  const [fundToDelete, setFundToDelete] = useState<RetainerFund | null>(null);
  const {
    toast
  } = useToast();
  const fetchRetainerFunds = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("retainer_funds").select("*").eq("case_id", caseId).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setFunds(data || []);
      const total = (data || []).reduce((sum, fund) => sum + Number(fund.amount), 0);
      setBalance(total);
    } catch (error) {
      console.error("Error fetching retainer funds:", error);
      toast({
        title: "Error",
        description: "Failed to load retainer funds",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchRetainerFunds();
  }, [caseId]);
  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive amount",
        variant: "destructive"
      });
      return;
    }
    setSubmitting(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get organization_id
      const {
        data: orgMember
      } = await supabase.from('organization_members').select('organization_id').eq('user_id', user.id).limit(1).single();
      if (!orgMember?.organization_id) {
        throw new Error("User not in organization");
      }
      const {
        error
      } = await supabase.from("retainer_funds").insert({
        case_id: caseId,
        user_id: user.id,
        organization_id: orgMember.organization_id,
        amount: amountNum,
        note: note.trim() || null
      });
      if (error) throw error;
      toast({
        title: "Success",
        description: "Retainer funds added successfully"
      });
      setAmount("");
      setNote("");
      setAddDialogOpen(false);
      await fetchRetainerFunds();
    } catch (error) {
      console.error("Error adding funds:", error);
      toast({
        title: "Error",
        description: "Failed to add retainer funds",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };
  const handleEditFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFund) return;
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive amount",
        variant: "destructive"
      });
      return;
    }
    setSubmitting(true);
    try {
      const {
        error
      } = await supabase.from("retainer_funds").update({
        amount: amountNum,
        note: note.trim() || null
      }).eq("id", editingFund.id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Retainer fund updated successfully"
      });
      setAmount("");
      setNote("");
      setEditingFund(null);
      setEditDialogOpen(false);
      await fetchRetainerFunds();
    } catch (error) {
      console.error("Error updating fund:", error);
      toast({
        title: "Error",
        description: "Failed to update retainer fund",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };
  const handleDeleteFund = async () => {
    if (!fundToDelete) return;
    setSubmitting(true);
    try {
      const {
        error
      } = await supabase.from("retainer_funds").delete().eq("id", fundToDelete.id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Retainer fund deleted successfully"
      });
      setFundToDelete(null);
      setDeleteDialogOpen(false);
      await fetchRetainerFunds();
    } catch (error) {
      console.error("Error deleting fund:", error);
      toast({
        title: "Error",
        description: "Failed to delete retainer fund",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };
  const openEditDialog = (fund: RetainerFund) => {
    setEditingFund(fund);
    setAmount(Math.abs(fund.amount).toString());
    setNote(fund.note || "");
    setEditDialogOpen(true);
  };
  const openDeleteDialog = (fund: RetainerFund) => {
    setFundToDelete(fund);
    setDeleteDialogOpen(true);
  };
  if (loading) {
    return <div className="card-elevated p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>;
  }
  return <div className="card-elevated p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-heading-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Retainer Funds
        </h3>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Current Balance</div>
        <div className="text-2xl font-bold text-primary">
          ${balance.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}
        </div>
      </div>

      <div className="flex gap-2">
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Add Funds
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Retainer Funds</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddFunds} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input id="amount" type="number" step="0.01" min="0.01" placeholder="5000.00" value={amount} onChange={e => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note (Optional)</Label>
                <Textarea id="note" placeholder="Add any relevant notes..." value={note} onChange={e => setNote(e.target.value)} rows={3} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Funds
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-1">
              <History className="h-4 w-4 mr-2" />
              View History
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Retainer Funds History</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {funds.length === 0 ? <div className="empty-state py-8">
                  <p className="text-muted-foreground">No transactions yet</p>
                </div> : funds.map(fund => {
              const isDeduction = Number(fund.amount) < 0;
              const isLinkedToInvoice = !!fund.invoice_id;
              return <div key={fund.id} className="card-flat p-4 space-y-2 hover-lift transition-smooth">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className={`text-heading-5 ${isDeduction ? 'text-destructive' : 'text-success'}`}>
                            {isDeduction ? '-' : '+'}${Math.abs(Number(fund.amount)).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(fund.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </div>
                          {isDeduction && <div className="text-xs text-muted-foreground mt-1">
                              Applied to invoice
                            </div>}
                        </div>
                        {!isLinkedToInvoice && <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => {
                      e.stopPropagation();
                      openEditDialog(fund);
                    }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={e => {
                      e.stopPropagation();
                      openDeleteDialog(fund);
                    }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>}
                      </div>
                      {fund.note && <p className="text-sm text-foreground/80 mt-2">{fund.note}</p>}
                    </div>;
            })}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={open => {
      setEditDialogOpen(open);
      if (!open) {
        setEditingFund(null);
        setAmount("");
        setNote("");
      }
    }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Retainer Fund</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditFund} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount *</Label>
              <Input id="edit-amount" type="number" step="0.01" min="0.01" placeholder="5000.00" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-note">Note (Optional)</Label>
              <Textarea id="edit-note" placeholder="Add any relevant notes..." value={note} onChange={e => setNote(e.target.value)} rows={3} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} title="Delete Retainer Fund" description={`Are you sure you want to delete this $${fundToDelete ? Math.abs(fundToDelete.amount).toFixed(2) : '0.00'} retainer fund entry? This action cannot be undone.`} confirmLabel="Delete" onConfirm={handleDeleteFund} variant="destructive" />
    </div>;
}