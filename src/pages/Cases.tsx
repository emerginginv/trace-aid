import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Briefcase, Search, LayoutGrid, List, Trash2, Download, FileSpreadsheet, FileText, MoreVertical, Pencil } from "lucide-react";
import { ResponsiveButton } from "@/components/ui/responsive-button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "sonner";
import { CaseForm } from "@/components/CaseForm";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { ColumnVisibility } from "@/components/ui/column-visibility";
import { useColumnVisibility, ColumnDefinition } from "@/hooks/use-column-visibility";
import { useSortPreference } from "@/hooks/use-sort-preference";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { format } from "date-fns";
import { CasesPageSkeleton } from "@/components/ui/list-page-skeleton";
import { InlineEditCell } from "@/components/ui/inline-edit-cell";
import { CaseCardManagerDisplay } from "@/components/cases/CaseCardManagerDisplay";
import { CaseCardFinancialWidget } from "@/components/cases/CaseCardFinancialWidget";
import { CaseCardFinancialSummary } from "@/components/cases/CaseCardFinancialSummary";
import { getStatusStyleFromPicklist, isClosedStatus } from "@/lib/statusUtils";

interface CaseManager {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  color: string | null;
}

interface BudgetSummary {
  dollars_consumed: number;
  dollars_remaining: number;
  dollars_utilization_pct: number;
}

interface FinancialTotals {
  total_expenses: number;
  total_hours: number;
  total_retainer: number;
  total_invoiced: number;
}

interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string;
  status: string;
  due_date: string;
  created_at: string;
  case_manager_id: string | null;
  budget_dollars: number | null;
  case_manager?: CaseManager | null;
  budget_summary?: BudgetSummary | null;
  financial_totals?: FinancialTotals | null;
}

const COLUMNS: ColumnDefinition[] = [
  { key: "case_number", label: "Case Number" },
  { key: "title", label: "Title" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Created" },
  { key: "due_date", label: "Due Date" },
  { key: "actions", label: "Actions", hideable: false },
];

const Cases = () => {
  useSetBreadcrumbs([{ label: "Cases" }]);
  
  const navigate = useNavigate();
  const { isVendor } = useUserRole();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { organization } = useOrganization();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [financialsLoaded, setFinancialsLoaded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);
  const [statusPicklists, setStatusPicklists] = useState<Array<{
    id: string;
    value: string;
    color: string;
    status_type?: string;
  }>>([]);
  const [statusTypeFilter, setStatusTypeFilter] = useState<string>('all');
  const { sortColumn, sortDirection, handleSort } = useSortPreference("cases", "case_number", "desc");
  const [editingCase, setEditingCase] = useState<Case | null>(null);

  const { visibility, isVisible, toggleColumn, resetToDefaults } = useColumnVisibility("cases-columns", COLUMNS);

  // Stage A: Fetch cases when organization changes
  useEffect(() => {
    if (organization?.id) {
      setFinancialsLoaded(false);
      fetchCases();
      fetchPicklists();
    }
  }, [organization?.id]);

  // Stage B: Fetch financial data once permissions are loaded and user has view_finances permission
  const canViewFinances = hasPermission('view_finances');
  useEffect(() => {
    if (!permissionsLoading && canViewFinances && cases.length > 0 && !financialsLoaded) {
      fetchFinancialData();
    }
  }, [permissionsLoading, canViewFinances, cases.length, financialsLoaded]);

  const fetchPicklists = async () => {
    if (!organization?.id) return;
    
    try {
      const { data: statusData } = await supabase
        .from("picklists")
        .select("id, value, color, status_type")
        .eq("type", "case_status")
        .eq("is_active", true)
        .or(`organization_id.eq.${organization.id},organization_id.is.null`)
        .order("display_order");
      
      if (statusData) {
        setStatusPicklists(statusData);
      }
    } catch (error) {
      console.error("Error fetching picklists:", error);
    }
  };

  const fetchCases = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      // Fetch cases with case manager profile (no financial data yet)
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select(`
          id, case_number, title, description, status, due_date, created_at,
          case_manager_id, budget_dollars,
          case_manager:profiles!cases_case_manager_id_fkey(
            id, full_name, avatar_url, color
          )
        `)
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
        
      if (casesError) throw casesError;
      
      const enrichedCases: Case[] = (casesData || []).map(c => ({
        ...c,
        case_manager: c.case_manager as CaseManager | null,
        budget_summary: null,
        financial_totals: null,
      }));
      
      setCases(enrichedCases);
    } catch (error) {
      console.error("Error fetching cases:", error);
      toast.error("Error fetching cases");
    } finally {
      setLoading(false);
    }
  };

  // Stage B: Fetch financial data separately after permissions are loaded
  const fetchFinancialData = async () => {
    if (cases.length === 0) return;
    
    try {
      const caseIds = cases.map(c => c.id);
      
      // Fetch budget summaries for cases with budgets
      const budgetPromises = cases
        .filter(c => c.budget_dollars && c.budget_dollars > 0)
        .map(async (c) => {
          const { data, error } = await supabase.rpc('get_case_budget_summary', { p_case_id: c.id });
          if (error) console.error(`Error fetching budget for case ${c.id}:`, error);
          return { caseId: c.id, summary: data?.[0] || null };
        });
      
      // Fetch financial totals from case_finances
      const { data: financialData, error: financialError } = await supabase
        .from("case_finances")
        .select("case_id, finance_type, amount, hours")
        .in("case_id", caseIds);
      
      if (financialError) {
        console.error("Error fetching financial data:", financialError);
      }
      
      // Aggregate financial totals by case
      const totalsMap = new Map<string, FinancialTotals>();
      financialData?.forEach(entry => {
        const existing = totalsMap.get(entry.case_id) || {
          total_expenses: 0,
          total_hours: 0,
          total_retainer: 0,
          total_invoiced: 0,
        };
        
        switch (entry.finance_type) {
          case 'expense':
            existing.total_expenses += entry.amount || 0;
            break;
          case 'time':
            existing.total_hours += entry.hours || 0;
            break;
          case 'retainer':
            existing.total_retainer += entry.amount || 0;
            break;
          case 'invoice':
            existing.total_invoiced += entry.amount || 0;
            break;
        }
        
        totalsMap.set(entry.case_id, existing);
      });
      
      const budgetResults = await Promise.all(budgetPromises);
      const budgetMap = new Map(budgetResults.map(r => [r.caseId, r.summary]));
      
      // Merge financial data into existing cases
      setCases(prevCases => prevCases.map(c => ({
        ...c,
        budget_summary: budgetMap.get(c.id) ? {
          dollars_consumed: budgetMap.get(c.id)!.dollars_consumed || 0,
          dollars_remaining: budgetMap.get(c.id)!.dollars_remaining || 0,
          dollars_utilization_pct: budgetMap.get(c.id)!.dollars_utilization_pct || 0,
        } : null,
        financial_totals: totalsMap.get(c.id) || null,
      })));
      
      setFinancialsLoaded(true);
    } catch (error) {
      console.error("Error fetching financial data:", error);
    }
  };

  const getStatusStyle = (status: string) => getStatusStyleFromPicklist(status, statusPicklists);

  const isClosedCase = (status: string) => isClosedStatus(status, statusPicklists);

  // Inline status update handler with optimistic UI
  const handleInlineStatusChange = useCallback(async (caseId: string, newStatus: string): Promise<boolean> => {
    const caseItem = cases.find(c => c.id === caseId);
    if (!caseItem) return false;
    
    const oldStatus = caseItem.status;
    if (oldStatus === newStatus) return true;
    
    // Optimistic update
    setCases(prev => prev.map(c => 
      c.id === caseId ? { ...c, status: newStatus } : c
    ));
    
    toast.success(`Status updated to ${newStatus}`);
    
    try {
      const { error } = await supabase
        .from("cases")
        .update({ status: newStatus })
        .eq("id", caseId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      // Rollback on error
      setCases(prev => prev.map(c => 
        c.id === caseId ? { ...c, status: oldStatus } : c
      ));
      toast.error("Failed to update status. Change reverted.");
      return false;
    }
  }, [cases]);

  // Get status options for inline editing
  const statusOptions = statusPicklists.map(s => ({
    value: s.value,
    label: s.value,
    color: s.color
  }));

  const handleDeleteClick = (caseId: string) => {
    setCaseToDelete(caseId);
    setDeleteDialogOpen(true);
  };

  // Pending deletion tracking for undo functionality
  const pendingDeletions = useRef<Map<string, { item: Case; timeoutId: NodeJS.Timeout }>>(new Map());
  const UNDO_DELAY = 5000;

  const handleDeleteConfirm = async () => {
    if (!caseToDelete) return;
    
    const caseItem = cases.find(c => c.id === caseToDelete);
    if (!caseItem) return;
    
    // Close dialog and clear state immediately
    setDeleteDialogOpen(false);
    const deletedId = caseToDelete;
    setCaseToDelete(null);
    
    // Optimistically remove from UI
    setCases(prev => prev.filter(c => c.id !== deletedId));
    
    // Show toast with undo action
    toast("Case deleted", {
      description: "Click undo to restore",
      action: {
        label: "Undo",
        onClick: () => {
          const pending = pendingDeletions.current.get(deletedId);
          if (pending) {
            clearTimeout(pending.timeoutId);
            setCases(prev => [...prev, pending.item]);
            pendingDeletions.current.delete(deletedId);
            toast.success("Case restored");
          }
        },
      },
      duration: UNDO_DELAY,
    });
    
    // Schedule actual deletion
    const timeoutId = setTimeout(async () => {
      const { error } = await supabase.from("cases").delete().eq("id", deletedId);
      if (error) {
        const pending = pendingDeletions.current.get(deletedId);
        if (pending) {
          setCases(prev => [...prev, pending.item]);
          toast.error("Failed to delete case. Item restored.");
        }
      }
      pendingDeletions.current.delete(deletedId);
    }, UNDO_DELAY);
    
    pendingDeletions.current.set(deletedId, {
      item: caseItem,
      timeoutId,
    });
  };


  const filteredCases = cases.filter(caseItem => {
    const matchesSearch = searchQuery === '' || caseItem.title.toLowerCase().includes(searchQuery.toLowerCase()) || caseItem.case_number.toLowerCase().includes(searchQuery.toLowerCase()) || caseItem.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || caseItem.status === statusFilter;
    const statusPicklist = statusPicklists.find(s => s.value === caseItem.status);
    const matchesStatusType = statusTypeFilter === 'all' || statusPicklist?.status_type === statusTypeFilter;
    return matchesSearch && matchesStatus && matchesStatusType;
  });

  const sortedCases = [...filteredCases].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal = a[sortColumn as keyof Case];
    let bVal = b[sortColumn as keyof Case];
    
    if (aVal == null) return sortDirection === "asc" ? 1 : -1;
    if (bVal == null) return sortDirection === "asc" ? -1 : 1;
    
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "asc" 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    }
    
    return 0;
  });

  // Export columns definition
  const EXPORT_COLUMNS: ExportColumn[] = [
    { key: "case_number", label: "Case Number" },
    { key: "title", label: "Title" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Created", format: (v) => v ? format(new Date(v), "MMM d, yyyy") : "-" },
    { key: "due_date", label: "Due Date", format: (v) => v ? format(new Date(v), "MMM d, yyyy") : "-" },
  ];

  const handleExportCSV = () => exportToCSV(sortedCases, EXPORT_COLUMNS, "cases");
  const handleExportPDF = () => exportToPDF(sortedCases, EXPORT_COLUMNS, "Cases Report", "cases");

  if (loading) {
    return <CasesPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {isVendor && <Alert className="bg-muted/50 border-primary/20">
          <Info className="h-4 w-4" />
          <AlertDescription>
            You are viewing cases assigned to you. You can only see and update your assigned work.
          </AlertDescription>
        </Alert>}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{isVendor ? 'My Cases' : 'Cases'}</h1>
          <p className="text-muted-foreground mt-2">
            {isVendor ? 'View and update your assigned cases' : 'Manage and track your investigation cases'}
          </p>
        </div>
        {!isVendor && hasPermission('add_cases') && <Button className="gap-2" onClick={() => navigate('/cases/new')}>
            <Plus className="w-4 h-4" />
            New Case
          </Button>}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search cases by title, number, or description..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusTypeFilter} onValueChange={setStatusTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Case Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cases</SelectItem>
            <SelectItem value="open">🔵 Open Cases</SelectItem>
            <SelectItem value="closed">⚪ Closed Cases</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statusPicklists.map(status => <SelectItem key={status.id} value={status.value}>{status.value}</SelectItem>)}
          </SelectContent>
        </Select>
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
        <div className="flex gap-1 border rounded-md p-1 h-10">
          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="h-7 w-7 p-0">
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="h-7 w-7 p-0">
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Entry count */}
      <div className="text-sm text-muted-foreground">
        Showing {sortedCases.length} case{sortedCases.length !== 1 ? 's' : ''}
      </div>

      {cases.length === 0 ? <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No cases yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by creating your first case
            </p>
            <Button className="gap-2" onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4" />
              Create First Case
            </Button>
          </CardContent>
        </Card> : filteredCases.length === 0 ? <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No cases match your search criteria</p>
          </CardContent>
        </Card> : viewMode === 'grid' ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedCases.map(caseItem => <Card 
              key={caseItem.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/cases/${caseItem.id}`)}
            >
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <CardTitle className="text-xl truncate">{caseItem.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Case #{caseItem.case_number}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className="border" style={getStatusStyle(caseItem.status)}>
                      {caseItem.status}
                    </Badge>
                    {(hasPermission('edit_cases') || hasPermission('delete_cases')) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          {hasPermission('edit_cases') && (
                            <DropdownMenuItem onClick={() => {
                              setEditingCase(caseItem);
                              setFormOpen(true);
                            }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {hasPermission('delete_cases') && (
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(caseItem.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                <div className="pt-2">
                  <CaseCardManagerDisplay manager={caseItem.case_manager || null} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {caseItem.description || "No description provided"}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Created: {new Date(caseItem.created_at).toLocaleDateString()}</span>
                  {caseItem.due_date && <span>Due: {new Date(caseItem.due_date).toLocaleDateString()}</span>}
                </div>
                
                {hasPermission('view_finances') && (
                  <>
                    {caseItem.budget_summary && (
                      <CaseCardFinancialWidget
                        budgetDollars={caseItem.budget_dollars}
                        dollarsConsumed={caseItem.budget_summary.dollars_consumed}
                        dollarsRemaining={caseItem.budget_summary.dollars_remaining}
                        utilizationPct={caseItem.budget_summary.dollars_utilization_pct}
                      />
                    )}
                    {caseItem.financial_totals && (
                      <CaseCardFinancialSummary
                        totalExpenses={caseItem.financial_totals.total_expenses}
                        totalHours={caseItem.financial_totals.total_hours}
                        totalRetainer={caseItem.financial_totals.total_retainer}
                        totalInvoiced={caseItem.financial_totals.total_invoiced}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>)}
        </div> : <>
          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-4">
          {sortedCases.map(caseItem => {
          const isClosed = isClosedCase(caseItem.status);
          return <Card key={caseItem.id} className={`p-4 ${isClosed ? 'opacity-60' : ''} cursor-pointer hover:shadow-md transition-all`}
                  onClick={() => navigate(`/cases/${caseItem.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/cases/${caseItem.id}`);
                    }
                  }}
                >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{caseItem.case_number}</div>
                      <div className={`font-medium mt-1 flex items-center gap-2 ${isClosed ? 'text-muted-foreground' : 'text-foreground'}`}>
                        <span className="truncate">{caseItem.title}</span>
                        {isClosed && <Badge variant="secondary" className="text-xs shrink-0">
                            Closed
                          </Badge>}
                      </div>
                    </div>
                    {(hasPermission('edit_cases') || hasPermission('delete_cases')) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          {hasPermission('edit_cases') && (
                            <DropdownMenuItem onClick={() => {
                              setEditingCase(caseItem);
                              setFormOpen(true);
                            }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {hasPermission('delete_cases') && (
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(caseItem.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Badge className="border" style={getStatusStyle(caseItem.status)}>
                      {caseItem.status}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Created: {new Date(caseItem.created_at).toLocaleDateString()}</div>
                    {caseItem.due_date && <div>Due: {new Date(caseItem.due_date).toLocaleDateString()}</div>}
                  </div>
                </div>
              </Card>;
        })}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {isVisible("case_number") && (
                    <SortableTableHead
                      column="case_number"
                      label="Case Number"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  )}
                  {isVisible("title") && (
                    <SortableTableHead
                      column="title"
                      label="Title"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
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
                  {isVisible("created_at") && (
                    <SortableTableHead
                      column="created_at"
                      label="Created"
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
                  {isVisible("actions") && (
                    <SortableTableHead
                      column=""
                      label="Actions"
                      sortColumn=""
                      sortDirection="asc"
                      onSort={() => {}}
                      className="text-right"
                    />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCases.map(caseItem => {
              const isClosed = isClosedCase(caseItem.status);
              return <TableRow 
                  key={caseItem.id} 
                  className={`cursor-pointer hover:bg-muted/50 ${isClosed ? 'opacity-60' : ''}`}
                  onClick={() => navigate(`/cases/${caseItem.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/cases/${caseItem.id}`);
                    }
                  }}
                >
                    {isVisible("case_number") && (
                      <TableCell className={`font-medium ${isClosed ? 'text-muted-foreground' : ''}`}>
                        {caseItem.case_number}
                      </TableCell>
                    )}
                    {isVisible("title") && (
                      <TableCell className={isClosed ? 'text-muted-foreground' : ''}>
                        <div className="flex items-center gap-2">
                          {caseItem.title}
                          {isClosed && <Badge variant="secondary" className="text-xs">
                              Closed
                            </Badge>}
                        </div>
                      </TableCell>
                    )}
                    {isVisible("status") && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {hasPermission('edit_cases') ? (
                          <InlineEditCell
                            value={caseItem.status}
                            options={statusOptions}
                            type="select"
                            onSave={(newValue) => handleInlineStatusChange(caseItem.id, newValue)}
                            displayAs="badge"
                            badgeStyle={getStatusStyle(caseItem.status)}
                          />
                        ) : (
                          <Badge className="border" style={getStatusStyle(caseItem.status)}>
                            {caseItem.status}
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    {isVisible("created_at") && (
                      <TableCell>{new Date(caseItem.created_at).toLocaleDateString()}</TableCell>
                    )}
                    {isVisible("due_date") && (
                      <TableCell>
                        {caseItem.due_date ? new Date(caseItem.due_date).toLocaleDateString() : "-"}
                      </TableCell>
                    )}
                    {isVisible("actions") && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {hasPermission('delete_cases') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(caseItem.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>;
            })}
              </TableBody>
            </Table>
          </Card>
        </>}

      <CaseForm 
        open={formOpen} 
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingCase(null);
        }} 
        onSuccess={() => {
          fetchCases();
          setEditingCase(null);
        }}
        editingCase={editingCase ? {
          id: editingCase.id,
          title: editingCase.title,
          case_number: editingCase.case_number,
          description: editingCase.description,
          status: editingCase.status,
          account_id: null,
          contact_id: null,
          due_date: editingCase.due_date,
          budget_dollars: editingCase.budget_dollars,
        } : undefined}
      />

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Case"
        description="Are you sure you want to delete this case? This action cannot be undone."
      />
    </div>
  );
};

export default Cases;
