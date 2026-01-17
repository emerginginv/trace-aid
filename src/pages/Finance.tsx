import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Search, Download, FileSpreadsheet, FileText, DollarSign, Pencil, Trash2, Loader2, History, Plus, MoreVertical, ExternalLink } from "lucide-react";
import { ImportTemplateButton } from "@/components/ui/import-template-button";

import { toast } from "sonner";
import { format } from "date-fns";
import { useOrganization } from "@/contexts/OrganizationContext";

import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { ColumnVisibility } from "@/components/ui/column-visibility";
import { useColumnVisibility, ColumnDefinition } from "@/hooks/use-column-visibility";
import { useSortPreference } from "@/hooks/use-sort-preference";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { FinancePageSkeleton } from "@/components/ui/list-page-skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
interface RetainerBalance {
  case_id: string;
  case_title: string;
  case_number: string;
  balance: number;
  last_topup: string | null;
}

interface RetainerFund {
  id: string;
  amount: number;
  note: string | null;
  created_at: string;
  invoice_id: string | null;
  case_id: string;
}

interface CaseOption {
  id: string;
  title: string;
  case_number: string;
}

const COLUMNS: ColumnDefinition[] = [
  { key: "case_title", label: "Case" },
  { key: "case_number", label: "Case Number" },
  { key: "balance", label: "Current Balance" },
  { key: "last_topup", label: "Last Top-Up" },
  { key: "actions", label: "Actions", hideable: false },
];

const Finance = () => {
  useSetBreadcrumbs([{ label: "Client Retainers" }]);
  
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [retainerBalances, setRetainerBalances] = useState<RetainerBalance[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  // Filter states
  const [retainerSearch, setRetainerSearch] = useState("");
  
  // Sorting states
  const { sortColumn, sortDirection, handleSort } = useSortPreference("finance", "case_title", "asc");

  const { visibility, isVisible, toggleColumn, resetToDefaults } = useColumnVisibility("finance-columns", COLUMNS);

  // History/Edit/Delete dialog states
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<RetainerBalance | null>(null);
  const [caseFunds, setCaseFunds] = useState<RetainerFund[]>([]);
  const [loadingFunds, setLoadingFunds] = useState(false);
  const [editingFund, setEditingFund] = useState<RetainerFund | null>(null);
  const [fundToDelete, setFundToDelete] = useState<RetainerFund | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Add retainer dialog states
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [showRetainerForm, setShowRetainerForm] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newNote, setNewNote] = useState("");
  // Refetch when organization changes
  useEffect(() => {
    if (organization?.id) {
      fetchRetainerData();
    }
  }, [organization?.id]);

  const fetchRetainerData = async () => {
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

      // Fetch retainer balances by case - filter by selected organization
      const { data: retainerData, error: retainerError } = await supabase
        .from("retainer_funds")
        .select("case_id, amount, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (retainerError) throw retainerError;

      // Aggregate retainer balances by case
      const balanceMap = new Map<string, RetainerBalance>();
      retainerData?.forEach((fund: any) => {
        const caseId = fund.case_id;
        const caseInfo = casesMap.get(caseId);
        
        if (!balanceMap.has(caseId)) {
          balanceMap.set(caseId, {
            case_id: caseId,
            case_title: caseInfo?.title || "Unknown",
            case_number: caseInfo?.case_number || "N/A",
            balance: 0,
            last_topup: null,
          });
        }
        const current = balanceMap.get(caseId)!;
        current.balance += parseFloat(fund.amount);
        if (!current.last_topup || fund.created_at > current.last_topup) {
          current.last_topup = fund.created_at;
        }
      });

      const balances = Array.from(balanceMap.values());
      setRetainerBalances(balances);
      
      // Store cases for the add retainer dropdown
      setCases(casesData || []);
    } catch (error: any) {
      console.error("Error fetching retainer data:", error);
      toast.error("Failed to load retainer data");
    } finally {
      setLoading(false);
    }
  };

  const fetchCaseFunds = async (caseId: string) => {
    setLoadingFunds(true);
    try {
      const { data, error } = await supabase
        .from("retainer_funds")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCaseFunds(data || []);
    } catch (error) {
      console.error("Error fetching case funds:", error);
      toast.error("Failed to load retainer history");
    } finally {
      setLoadingFunds(false);
    }
  };

  const openHistoryDialog = (balance: RetainerBalance) => {
    setSelectedCase(balance);
    setHistoryDialogOpen(true);
    fetchCaseFunds(balance.case_id);
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

  const handleEditFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFund) return;
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("retainer_funds")
        .update({
          amount: amountNum,
          note: note.trim() || null,
        })
        .eq("id", editingFund.id);

      if (error) throw error;

      toast.success("Retainer fund updated successfully");

      setAmount("");
      setNote("");
      setEditingFund(null);
      setEditDialogOpen(false);
      
      // Refresh data
      if (selectedCase) {
        await fetchCaseFunds(selectedCase.case_id);
      }
      await fetchRetainerData();
    } catch (error) {
      console.error("Error updating fund:", error);
      toast.error("Failed to update retainer fund");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFund = async () => {
    if (!fundToDelete) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("retainer_funds")
        .delete()
        .eq("id", fundToDelete.id);

      if (error) throw error;

      toast.success("Retainer fund deleted successfully");

      setFundToDelete(null);
      setDeleteDialogOpen(false);
      
      // Refresh data
      if (selectedCase) {
        await fetchCaseFunds(selectedCase.case_id);
      }
      await fetchRetainerData();
    } catch (error) {
      console.error("Error deleting fund:", error);
      toast.error("Failed to delete retainer fund");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCaseSelected = () => {
    setShowAddDialog(false);
    setShowRetainerForm(true);
  };

  const handleAddRetainer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountNum = parseFloat(newAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("You must be logged in");
        return;
      }

      const { error } = await supabase
        .from("retainer_funds")
        .insert({
          case_id: selectedCaseId,
          amount: amountNum,
          note: newNote.trim() || null,
          organization_id: organization?.id,
          user_id: userData.user.id,
        });

      if (error) throw error;

      toast.success("Retainer fund added successfully");
      
      // Reset form
      setNewAmount("");
      setNewNote("");
      setSelectedCaseId("");
      setShowRetainerForm(false);
      
      // Refresh data
      await fetchRetainerData();
    } catch (error) {
      console.error("Error adding retainer:", error);
      toast.error("Failed to add retainer fund");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter functions
  const filteredRetainerBalances = retainerBalances.filter((balance) => {
    const searchLower = retainerSearch.toLowerCase();
    return (
      balance.case_title.toLowerCase().includes(searchLower) ||
      balance.case_number.toLowerCase().includes(searchLower)
    );
  });

  // Sort data
  const sortedRetainerBalances = [...filteredRetainerBalances].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal: any;
    let bVal: any;
    
    switch (sortColumn) {
      case "case_title":
        aVal = a.case_title;
        bVal = b.case_title;
        break;
      case "case_number":
        aVal = a.case_number;
        bVal = b.case_number;
        break;
      case "balance":
        aVal = a.balance;
        bVal = b.balance;
        break;
      case "last_topup":
        aVal = a.last_topup ? new Date(a.last_topup).getTime() : 0;
        bVal = b.last_topup ? new Date(b.last_topup).getTime() : 0;
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

  // Export columns definition
  const EXPORT_COLUMNS: ExportColumn[] = [
    { key: "case_title", label: "Case" },
    { key: "case_number", label: "Case Number" },
    { key: "balance", label: "Balance", format: (v) => `$${(v || 0).toFixed(2)}`, align: "right" },
    { key: "last_topup", label: "Last Top-Up", format: (v) => v ? format(new Date(v), "MMM d, yyyy") : "-" },
  ];

  const handleExportCSV = () => exportToCSV(sortedRetainerBalances, EXPORT_COLUMNS, "retainers");
  const handleExportPDF = () => exportToPDF(
    sortedRetainerBalances, 
    EXPORT_COLUMNS, 
    "Retainer Funds Report", 
    "retainers",
    [{ label: "Total", value: `$${sortedRetainerBalances.reduce((sum, r) => sum + r.balance, 0).toFixed(2)}` }]
  );

  if (loading) {
    return <FinancePageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Client Retainers</h1>
          <p className="text-muted-foreground mt-2">
            Manage client pre-payment funds across all cases
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Retainer
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-[0.625rem] h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by case name or number..."
            value={retainerSearch}
            onChange={(e) => setRetainerSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <ColumnVisibility
          columns={COLUMNS}
          visibility={visibility}
          onToggle={toggleColumn}
          onReset={resetToDefaults}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-10">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Export to PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ImportTemplateButton templateFileName="13_Retainers.csv" entityDisplayName="Retainers" />
      </div>

      {/* Entry count */}
      <div className="text-sm text-muted-foreground">
        Showing {sortedRetainerBalances.length} case{sortedRetainerBalances.length !== 1 ? 's' : ''} with retainer funds
      </div>

      {retainerBalances.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <DollarSign className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No retainer funds yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Retainer funds will appear here once added to cases
            </p>
          </CardContent>
        </Card>
      ) : filteredRetainerBalances.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No retainer funds match your search criteria</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-4">
            {sortedRetainerBalances.map((balance) => (
              <Card 
                key={balance.case_id} 
                className="p-4 cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate(`/cases/${balance.case_id}`)}
              >
                <div className="space-y-3">
                  <div>
                    <div className="font-semibold">{balance.case_title}</div>
                    <div className="text-sm text-muted-foreground">{balance.case_number}</div>
                  </div>
                  <div className="text-xl font-bold text-primary">
                    ${balance.balance.toFixed(2)}
                  </div>
                  {balance.last_topup && (
                    <div className="text-xs text-muted-foreground">
                      Last top-up: {format(new Date(balance.last_topup), "MMM d, yyyy")}
                    </div>
                  )}
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4 mr-1" />
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => openHistoryDialog(balance)}>
                            <History className="h-4 w-4 mr-2" />
                            View History
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedCaseId(balance.case_id);
                            setShowRetainerForm(true);
                          }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Funds
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigate(`/cases/${balance.case_id}`)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Case
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {isVisible("case_title") && (
                    <SortableTableHead
                      column="case_title"
                      label="Case"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      className="w-[200px]"
                    />
                  )}
                  {isVisible("case_number") && (
                    <SortableTableHead
                      column="case_number"
                      label="Case Number"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      className="w-[140px]"
                    />
                  )}
                  {isVisible("balance") && (
                    <SortableTableHead
                      column="balance"
                      label="Current Balance"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      className="w-[140px]"
                    />
                  )}
                  {isVisible("last_topup") && (
                    <SortableTableHead
                      column="last_topup"
                      label="Last Top-Up"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      className="w-[140px]"
                    />
                  )}
                  {isVisible("actions") && (
                    <TableHead className="w-[60px]">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRetainerBalances.map((balance) => (
                  <TableRow
                    key={balance.case_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/cases/${balance.case_id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/cases/${balance.case_id}`);
                      }
                    }}
                  >
                    {isVisible("case_title") && (
                      <TableCell className="font-medium w-[200px]">{balance.case_title}</TableCell>
                    )}
                    {isVisible("case_number") && (
                      <TableCell className="w-[140px]">{balance.case_number}</TableCell>
                    )}
                    {isVisible("balance") && (
                      <TableCell className="w-[140px] font-medium">
                        ${balance.balance.toFixed(2)}
                      </TableCell>
                    )}
                    {isVisible("last_topup") && (
                      <TableCell className="w-[140px]">
                        {balance.last_topup
                          ? format(new Date(balance.last_topup), "MMM d, yyyy")
                          : "N/A"}
                      </TableCell>
                    )}
                    {isVisible("actions") && (
                      <TableCell className="w-[60px]" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            <DropdownMenuItem onClick={() => openHistoryDialog(balance)}>
                              <History className="h-4 w-4 mr-2" />
                              View History
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedCaseId(balance.case_id);
                              setShowRetainerForm(true);
                            }}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Funds
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate(`/cases/${balance.case_id}`)}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Case
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={(open) => {
        setHistoryDialogOpen(open);
        if (!open) {
          setSelectedCase(null);
          setCaseFunds([]);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Retainer History - {selectedCase?.case_title}
            </DialogTitle>
          </DialogHeader>
          {loadingFunds ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : caseFunds.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {caseFunds.map((fund) => {
                const isDeduction = Number(fund.amount) < 0;
                const isLinkedToInvoice = !!fund.invoice_id;
                return (
                  <div
                    key={fund.id}
                    className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className={`text-lg font-semibold ${isDeduction ? 'text-destructive' : 'text-green-600 dark:text-green-500'}`}>
                          {isDeduction ? '-' : '+'}${Math.abs(Number(fund.amount)).toLocaleString("en-US", { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(fund.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                        {isDeduction && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Applied to invoice
                          </div>
                        )}
                      </div>
                      {!isLinkedToInvoice && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(fund)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(fund)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {fund.note && (
                      <p className="text-sm text-muted-foreground mt-2">{fund.note}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
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
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="5000.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-note">Note (Optional)</Label>
              <Textarea
                id="edit-note"
                placeholder="Add any relevant notes..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={submitting}
              >
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
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Retainer Fund"
        description={`Are you sure you want to delete this $${fundToDelete ? Math.abs(fundToDelete.amount).toFixed(2) : '0.00'} retainer fund entry? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteFund}
        variant="destructive"
        loading={submitting}
      />

      {/* Add Retainer - Case Selection Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Retainer Funds</DialogTitle>
            <DialogDescription>
              Select a case to add retainer funds to
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a case..." />
            </SelectTrigger>
            <SelectContent>
              {cases.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.case_number} - {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button disabled={!selectedCaseId} onClick={handleCaseSelected}>Continue</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Retainer - Amount Form Dialog */}
      <Dialog open={showRetainerForm} onOpenChange={setShowRetainerForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Retainer Funds</DialogTitle>
            <DialogDescription>
              {selectedCaseId && cases.find(c => c.id === selectedCaseId)?.case_number} - {selectedCaseId && cases.find(c => c.id === selectedCaseId)?.title}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddRetainer} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-retainer-amount">Amount ($)</Label>
              <Input
                id="new-retainer-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="Enter amount..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-retainer-note">Note (optional)</Label>
              <Textarea
                id="new-retainer-note"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter a note..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowRetainerForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Funds
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Finance;