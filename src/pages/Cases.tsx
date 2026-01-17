import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Briefcase, Search, Trash2, Download, FileSpreadsheet, FileText, MoreVertical, Pencil, RefreshCw, X } from "lucide-react";
import { ImportTemplateButton } from "@/components/ui/import-template-button";
import { ResponsiveButton } from "@/components/ui/responsive-button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "sonner";
import { CaseForm } from "@/components/CaseForm";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { useStatusDisplay } from "@/hooks/use-status-display";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useCaseLifecycleStatuses } from "@/hooks/use-case-lifecycle-statuses";
import { useCaseStatuses } from "@/hooks/use-case-statuses";

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
  status_key: string | null;
  due_date: string;
  created_at: string;
  case_manager_id: string | null;
  budget_dollars: number | null;
  case_manager?: CaseManager | null;
  budget_summary?: BudgetSummary | null;
  financial_totals?: FinancialTotals | null;
  reference_number?: string | null;
  reference_number_2?: string | null;
  reference_number_3?: string | null;
}

const COLUMNS: ColumnDefinition[] = [
  { key: "select", label: "", hideable: false },
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
  // viewMode state removed - always use list view
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);
  const [statusTypeFilter, setStatusTypeFilter] = useState<string>('all');
  const { sortColumn, sortDirection, handleSort } = useSortPreference("cases", "case_number", "desc");
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  
  // Use the new lifecycle statuses system
  const { 
    executionStatuses, 
    getStatusByKey, 
    getDisplayName, 
    getStatusColor: getLifecycleStatusColor,
    isClosedStatus: isClosedLifecycleStatus,
    isLoading: statusesLoading 
  } = useCaseLifecycleStatuses();
  
  // Permission-aware status display
  const {
    canViewExactStatus,
    getDisplayName: getPermissionAwareDisplayName,
    getDisplayStyle: getPermissionAwareDisplayStyle,
  } = useStatusDisplay();
  
  // New case statuses for current_status_id based cases
  const { getStatusById } = useCaseStatuses();

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const { visibility, isVisible, toggleColumn, resetToDefaults } = useColumnVisibility("cases-columns", COLUMNS);

  // Stage A: Fetch cases when organization changes
  useEffect(() => {
    if (organization?.id) {
      setFinancialsLoaded(false);
      fetchCases();
    }
  }, [organization?.id]);

  // Stage B: Fetch financial data once permissions are loaded and user has view_finances permission
  const canViewFinances = hasPermission('view_finances');
  useEffect(() => {
    if (!permissionsLoading && canViewFinances && cases.length > 0 && !financialsLoaded) {
      fetchFinancialData();
    }
  }, [permissionsLoading, canViewFinances, cases.length, financialsLoaded]);

  const fetchCases = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      // Fetch cases with case manager profile (no financial data yet)
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select(`
          id, case_number, title, description, status, status_key, due_date, created_at,
          case_manager_id, budget_dollars,
          reference_number, reference_number_2, reference_number_3,
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
      
      // Fetch financial totals from canonical tables
      const [{ data: timeData, error: timeError }, { data: expenseData, error: expenseError }] = await Promise.all([
        supabase
          .from("time_entries")
          .select("case_id, hours, total")
          .in("case_id", caseIds),
        supabase
          .from("expense_entries")
          .select("case_id, total")
          .in("case_id", caseIds),
      ]);
      
      if (timeError) {
        console.error("Error fetching time data:", timeError);
      }
      if (expenseError) {
        console.error("Error fetching expense data:", expenseError);
      }
      
      // Aggregate financial totals by case
      const totalsMap = new Map<string, FinancialTotals>();
      
      // Process time entries
      timeData?.forEach(entry => {
        const existing = totalsMap.get(entry.case_id) || {
          total_expenses: 0,
          total_hours: 0,
          total_retainer: 0,
          total_invoiced: 0,
        };
        existing.total_hours += entry.hours || 0;
        totalsMap.set(entry.case_id, existing);
      });
      
      // Process expense entries
      expenseData?.forEach(entry => {
        const existing = totalsMap.get(entry.case_id) || {
          total_expenses: 0,
          total_hours: 0,
          total_retainer: 0,
          total_invoiced: 0,
        };
        existing.total_expenses += entry.total || 0;
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

  // Helper to get status style for display (using lifecycle statuses)
  // For legacy status_key based cases
  const getStatusStyle = (statusKey: string | null) => {
    if (!statusKey) return {};
    const color = getLifecycleStatusColor(statusKey);
    if (color) {
      return {
        backgroundColor: `${color}20`,
        color: color,
        borderColor: color,
      };
    }
    return {};
  };
  
  // Permission-aware status display name for list view
  const getCaseDisplayName = (caseItem: Case): string => {
    // If case has current_status_id (new system), use permission-aware display
    if (caseItem.id && getStatusById) {
      // Try to check if this case uses the new status system
      // For now, fall back to legacy display name with permission check
    }
    // Legacy: use lifecycle status display name
    return getDisplayName(caseItem.status_key || '') || caseItem.status;
  };

  const isClosedCase = (statusKey: string | null) => {
    if (!statusKey) return false;
    return isClosedLifecycleStatus(statusKey);
  };

  // Inline status update handler with optimistic UI
  const handleInlineStatusChange = useCallback(async (caseId: string, newStatusKey: string): Promise<boolean> => {
    const caseItem = cases.find(c => c.id === caseId);
    if (!caseItem) return false;
    
    const oldStatusKey = caseItem.status_key;
    if (oldStatusKey === newStatusKey) return true;
    
    const newStatusItem = getStatusByKey(newStatusKey);
    const displayName = newStatusItem?.display_name || newStatusKey;
    
    // Optimistic update
    setCases(prev => prev.map(c => 
      c.id === caseId ? { ...c, status: displayName, status_key: newStatusKey } : c
    ));
    
    toast.success(`Status updated to ${displayName}`);
    
    try {
      const { error } = await supabase
        .from("cases")
        .update({ status: displayName, status_key: newStatusKey })
        .eq("id", caseId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      // Rollback on error
      setCases(prev => prev.map(c => 
        c.id === caseId ? { ...c, status: caseItem.status, status_key: oldStatusKey } : c
      ));
      toast.error("Failed to update status. Change reverted.");
      return false;
    }
  }, [cases, getStatusByKey]);

  // Get status options for inline editing - using lifecycle statuses
  const statusOptions = executionStatuses.map(s => ({
    value: s.status_key,
    label: s.display_name,
    color: s.color || undefined
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

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchQuery, statusFilter, statusTypeFilter]);

  // Bulk selection handlers
  const canBulkAction = hasPermission('edit_cases') || hasPermission('delete_cases');

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Bulk status change handler
  const handleBulkStatusChange = useCallback(async (newStatusKey: string) => {
    const selectedCases = cases.filter(c => selectedIds.has(c.id));
    const oldStatuses = new Map(selectedCases.map(c => [c.id, { status: c.status, status_key: c.status_key }]));
    
    const newStatusItem = getStatusByKey(newStatusKey);
    const displayName = newStatusItem?.display_name || newStatusKey;
    
    // Optimistic update
    setCases(prev => prev.map(c => 
      selectedIds.has(c.id) ? { ...c, status: displayName, status_key: newStatusKey } : c
    ));
    
    const count = selectedIds.size;
    toast.success(`Updated ${count} case${count !== 1 ? 's' : ''} to "${displayName}"`);
    
    try {
      const { error } = await supabase
        .from("cases")
        .update({ status: displayName, status_key: newStatusKey })
        .in("id", Array.from(selectedIds));
      
      if (error) throw error;
      
      setSelectedIds(new Set()); // Clear selection on success
    } catch (error) {
      // Rollback on error
      setCases(prev => prev.map(c => {
        const old = oldStatuses.get(c.id);
        return old ? { ...c, status: old.status, status_key: old.status_key } : c;
      }));
      toast.error("Failed to update cases. Changes reverted.");
    }
  }, [cases, selectedIds, getStatusByKey]);

  // Bulk delete handler
  const pendingBulkDeletions = useRef<Map<string, { items: Case[]; timeoutId: NodeJS.Timeout }>>(new Map());

  const handleBulkDeleteConfirm = useCallback(() => {
    const selectedCasesList = cases.filter(c => selectedIds.has(c.id));
    const idsToDelete = Array.from(selectedIds);
    const batchKey = idsToDelete.join(',');
    
    // Close dialog and optimistically remove from UI
    setBulkDeleteDialogOpen(false);
    setCases(prev => prev.filter(c => !selectedIds.has(c.id)));
    
    const count = idsToDelete.length;
    toast(`${count} case${count !== 1 ? 's' : ''} deleted`, {
      description: "Click undo to restore",
      action: {
        label: "Undo",
        onClick: () => {
          const pending = pendingBulkDeletions.current.get(batchKey);
          if (pending) {
            clearTimeout(pending.timeoutId);
            setCases(prev => [...prev, ...pending.items]);
            pendingBulkDeletions.current.delete(batchKey);
            toast.success("Cases restored");
          }
        },
      },
      duration: UNDO_DELAY,
    });
    
    setSelectedIds(new Set());
    
    // Schedule actual deletion
    const timeoutId = setTimeout(async () => {
      const { error } = await supabase
        .from("cases")
        .delete()
        .in("id", idsToDelete);
      
      if (error) {
        const pending = pendingBulkDeletions.current.get(batchKey);
        if (pending) {
          setCases(prev => [...prev, ...pending.items]);
          toast.error("Failed to delete cases. Items restored.");
        }
      }
      pendingBulkDeletions.current.delete(batchKey);
    }, UNDO_DELAY);
    
    pendingBulkDeletions.current.set(batchKey, {
      items: selectedCasesList,
      timeoutId,
    });
  }, [cases, selectedIds]);


  const filteredCases = cases.filter(caseItem => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      caseItem.title.toLowerCase().includes(query) || 
      caseItem.case_number.toLowerCase().includes(query) || 
      caseItem.description?.toLowerCase().includes(query) ||
      caseItem.reference_number?.toLowerCase().includes(query) ||
      caseItem.reference_number_2?.toLowerCase().includes(query) ||
      caseItem.reference_number_3?.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || caseItem.status_key === statusFilter;
    const statusInfo = caseItem.status_key ? getStatusByKey(caseItem.status_key) : null;
    const matchesStatusType = statusTypeFilter === 'all' || statusInfo?.status_type === statusTypeFilter;
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

  // Toggle select all - defined after sortedCases
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === sortedCases.length && sortedCases.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedCases.map(c => c.id)));
    }
  }, [selectedIds.size, sortedCases]);

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
          <Input placeholder="Search cases by title, number, description, or reference..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
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
            {executionStatuses.map(status => (
              <SelectItem key={status.id} value={status.status_key}>{status.display_name}</SelectItem>
            ))}
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
        <ImportTemplateButton templateFileName="04_Cases.csv" entityDisplayName="Cases" />
      </div>

      {/* Entry count */}
      <div className="text-sm text-muted-foreground">
        Showing {sortedCases.length} case{sortedCases.length !== 1 ? 's' : ''}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} case{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex flex-wrap gap-2">
            {hasPermission('edit_cases') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Change Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {executionStatuses.map(status => (
                    <DropdownMenuItem 
                      key={status.id}
                      onClick={() => handleBulkStatusChange(status.status_key)}
                    >
                      <Badge className="border mr-2" style={getStatusStyle(status.status_key)}>
                        {status.display_name}
                      </Badge>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {hasPermission('delete_cases') && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setBulkDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="h-4 w-4 mr-2" />
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {cases.length === 0 ? (
        <Card>
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
        </Card>
      ) : filteredCases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No cases match your search criteria</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {canBulkAction && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.size === sortedCases.length && sortedCases.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                  )}
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
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
              {sortedCases.map(caseItem => {
              const isClosed = isClosedCase(caseItem.status_key);
              return <TableRow 
                  key={caseItem.id} 
                  className={`cursor-pointer hover:bg-muted/50 ${isClosed ? 'opacity-60' : ''} ${selectedIds.has(caseItem.id) ? 'bg-muted/30' : ''}`}
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
                    {canBulkAction && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(caseItem.id)}
                          onCheckedChange={() => toggleSelect(caseItem.id)}
                          aria-label={`Select case ${caseItem.case_number}`}
                        />
                      </TableCell>
                    )}
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
                        {hasPermission('edit_cases') && canViewExactStatus ? (
                          <InlineEditCell
                            value={caseItem.status_key || ''}
                            options={statusOptions}
                            type="select"
                            onSave={(newValue) => handleInlineStatusChange(caseItem.id, newValue)}
                            displayAs="badge"
                            badgeStyle={getStatusStyle(caseItem.status_key)}
                          />
                        ) : (
                          <Badge className="border" style={getStatusStyle(caseItem.status_key)}>
                            {canViewExactStatus 
                              ? (getDisplayName(caseItem.status_key || '') || caseItem.status)
                              : (getStatusByKey(caseItem.status_key || '')?.phase || caseItem.status)
                            }
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
          </div>
        </Card>
      )}

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

      <ConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        onConfirm={handleBulkDeleteConfirm}
        title="Delete Selected Cases"
        description={`Are you sure you want to delete ${selectedIds.size} case${selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.`}
      />
    </div>
  );
};

export default Cases;
