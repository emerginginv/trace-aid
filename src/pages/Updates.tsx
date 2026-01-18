import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigationSource } from "@/hooks/useNavigationSource";
import { useCaseUpdatesQuery, useDeleteCaseUpdate } from "@/hooks/queries";
import { useUpdateEnrichment } from "@/hooks/use-enriched-data";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Users, Bot, Clock, MoreVertical, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { getUpdateTypeBadgeClasses } from "@/lib/statusUtils";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { HelpfulHeader } from "@/components/help-center/ContextualHelp";
import { format, subDays, isAfter } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { CaseSelectorDialog } from "@/components/shared/CaseSelectorDialog";
import { UpdateForm } from "@/components/case-detail/UpdateForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCardsGrid, StatCardConfig, StatCardsGridSkeleton } from "@/components/shared/StatCardsGrid";
import { FilterToolbar } from "@/components/shared/FilterToolbar";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "sonner";

interface UpdateWithCase {
  id: string;
  case_id: string;
  organization_id?: string | null;
  title: string;
  description?: string | null;
  update_type: string;
  is_ai_summary?: boolean | null;
  created_at?: string | null;
  user_id: string;
  cases: { id: string; case_number: string; title: string };
  author: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

type UpdateCountKey = 'caseUpdates' | 'clientContacts' | 'aiSummaries' | 'thisWeek';

const STAT_CARDS: StatCardConfig<UpdateCountKey>[] = [
  { key: 'caseUpdates', label: 'Case Updates', icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-500/10', filterValue: 'Case Update' },
  { key: 'clientContacts', label: 'Client Contacts', icon: Users, color: 'text-green-500', bgColor: 'bg-green-500/10', filterValue: 'Client Contact' },
  { key: 'aiSummaries', label: 'AI Summaries', icon: Bot, color: 'text-purple-500', bgColor: 'bg-purple-500/10', filterValue: 'ai' },
  { key: 'thisWeek', label: 'This Week', icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-500/10', filterValue: 'week' },
];

const UPDATE_TYPES = [
  { value: "all", label: "All Types" },
  { value: "Case Update", label: "Case Update" },
  { value: "Client Contact", label: "Client Contact" },
  { value: "3rd-Party Contact", label: "3rd-Party Contact" },
  { value: "Surveillance", label: "Surveillance" },
  { value: "Accounting", label: "Accounting" },
  { value: "Other", label: "Other" },
];

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "title", label: "Title" },
  { key: "update_type", label: "Type" },
  { key: "case_number", label: "Case #", format: (_, row) => row.cases?.case_number || "-" },
  { key: "author", label: "Author", format: (_, row) => row.author?.full_name || "Unknown" },
  { key: "is_ai_summary", label: "AI Summary", format: (v) => v ? "Yes" : "No" },
  { key: "created_at", label: "Created", format: (v) => v ? format(new Date(v), "MMM d, yyyy") : "-" },
];

export default function Updates() {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { navigateWithSource } = useNavigationSource();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { data: user } = useCurrentUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [specialFilter, setSpecialFilter] = useState<string | null>(null);

  const [showCaseSelector, setShowCaseSelector] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<UpdateWithCase | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUpdateId, setDeletingUpdateId] = useState<string | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const { data: rawUpdates = [], isLoading } = useCaseUpdatesQuery({ limit: 500 });
  const deleteUpdateMutation = useDeleteCaseUpdate();
  
  // Use the shared enrichment hook
  const { enrichedData: enrichedUpdates, isEnriching: enriching } = useUpdateEnrichment(rawUpdates);

  // Permission checks
  const canEditUpdates = hasPermission('edit_updates');
  const canEditOwnUpdates = hasPermission('edit_own_updates');
  const canDeleteUpdates = hasPermission('delete_updates');
  const canDeleteOwnUpdates = hasPermission('delete_own_updates');
  const canBulkAction = canDeleteUpdates;

  // Check if user can edit/delete a specific update
  const canEditUpdate = useCallback((update: UpdateWithCase) => {
    const isOwner = update.user_id === user?.id;
    return canEditUpdates || (canEditOwnUpdates && isOwner);
  }, [canEditUpdates, canEditOwnUpdates, user?.id]);

  const canDeleteUpdate = useCallback((update: UpdateWithCase) => {
    const isOwner = update.user_id === user?.id;
    return canDeleteUpdates || (canDeleteOwnUpdates && isOwner);
  }, [canDeleteUpdates, canDeleteOwnUpdates, user?.id]);

  const counts = useMemo(() => {
    const oneWeekAgo = subDays(new Date(), 7);
    return enrichedUpdates.reduce((acc, u) => {
      if (u.update_type === 'Case Update') acc.caseUpdates++;
      if (u.update_type === 'Client Contact') acc.clientContacts++;
      if (u.is_ai_summary) acc.aiSummaries++;
      if (u.created_at && isAfter(new Date(u.created_at), oneWeekAgo)) acc.thisWeek++;
      return acc;
    }, { caseUpdates: 0, clientContacts: 0, aiSummaries: 0, thisWeek: 0 } as Record<UpdateCountKey, number>);
  }, [enrichedUpdates]);

  const handleStatCardClick = (key: UpdateCountKey, filterValue?: string) => {
    if (filterValue === 'ai' || filterValue === 'week') {
      setSpecialFilter(specialFilter === filterValue ? null : filterValue);
      setTypeFilter('all');
    } else if (filterValue) {
      setTypeFilter(typeFilter === filterValue ? 'all' : filterValue);
      setSpecialFilter(null);
    }
  };

  const filteredUpdates = useMemo(() => {
    const oneWeekAgo = subDays(new Date(), 7);
    return enrichedUpdates.filter((update) => {
      if (typeFilter !== "all" && update.update_type !== typeFilter) return false;
      if (specialFilter === 'ai' && !update.is_ai_summary) return false;
      if (specialFilter === 'week' && (!update.created_at || !isAfter(new Date(update.created_at), oneWeekAgo))) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!update.title.toLowerCase().includes(query) &&
            !update.description?.toLowerCase().includes(query) &&
            !update.cases.case_number.toLowerCase().includes(query) &&
            !update.author?.full_name?.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [enrichedUpdates, typeFilter, specialFilter, searchQuery]);

  // Selection handlers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredUpdates.length && filteredUpdates.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUpdates.map(u => u.id)));
    }
  }, [selectedIds.size, filteredUpdates]);

  // Delete handlers
  const handleDeleteClick = (updateId: string) => {
    setDeletingUpdateId(updateId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUpdateId) return;
    await deleteUpdateMutation.mutateAsync(deletingUpdateId);
    setDeleteDialogOpen(false);
    setDeletingUpdateId(null);
  };

  const handleBulkDeleteConfirm = async () => {
    const count = selectedIds.size;
    for (const id of selectedIds) {
      await deleteUpdateMutation.mutateAsync(id);
    }
    toast.success(`Deleted ${count} update${count !== 1 ? 's' : ''}`);
    setSelectedIds(new Set());
    setBulkDeleteDialogOpen(false);
  };

  // Edit handler
  const handleEditClick = (update: UpdateWithCase) => {
    setEditingUpdate(update);
    setShowUpdateForm(true);
  };

  const loading = isLoading || enriching;

  if (permissionsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <StatCardsGridSkeleton />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!hasPermission('view_updates')) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6 text-center">
          <h3 className="text-lg font-medium">Access Restricted</h3>
          <p className="text-muted-foreground mt-2">You don't have permission to view updates.</p>
        </Card>
      </div>
    );
  }

  const navigateToUpdate = (update: UpdateWithCase) => navigateWithSource(navigate, `/updates/${update.id}`, 'updates_list');

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Updates"
        titleComponent={
          <HelpfulHeader feature="global_updates">
            <h1 className="text-2xl font-bold tracking-tight">All Updates</h1>
          </HelpfulHeader>
        }
        description="View and manage updates across all cases"
        showAddButton={hasPermission('add_updates')}
        addButtonLabel="Add Update"
        onAddClick={() => setShowCaseSelector(true)}
      />

      <StatCardsGrid
        stats={STAT_CARDS}
        counts={counts}
        activeFilter={specialFilter || (typeFilter !== 'all' ? typeFilter : undefined)}
        onStatClick={handleStatCardClick}
        isLoading={loading}
      />

      <FilterToolbar
        searchPlaceholder="Search updates, cases, or authors..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[{ value: typeFilter, onChange: (v) => { setTypeFilter(v); setSpecialFilter(null); }, options: UPDATE_TYPES, placeholder: "Update Type", width: "w-[180px]" }]}
        showExport
        onExportCSV={() => exportToCSV(filteredUpdates, EXPORT_COLUMNS, "updates")}
        onExportPDF={() => exportToPDF(filteredUpdates, EXPORT_COLUMNS, "All Updates", "updates")}
        importTemplateFileName="07_Updates.csv"
        importEntityDisplayName="Updates"
      />

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} update{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex flex-wrap gap-2">
            {canDeleteUpdates && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setBulkDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Entry count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredUpdates.length} update{filteredUpdates.length !== 1 ? 's' : ''}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : filteredUpdates.length === 0 ? (
        <EmptyState icon={FileText} title="No updates found" description="Try adjusting your filters" />
      ) : (
        <div className="border rounded-lg overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {canBulkAction && (
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedIds.size === filteredUpdates.length && filteredUpdates.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead className="w-[300px]">Update</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUpdates.map((update) => (
                <TableRow key={update.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigateToUpdate(update)}>
                  {canBulkAction && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(update.id)}
                        onCheckedChange={() => toggleSelect(update.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar name={update.author?.full_name} avatarUrl={update.author?.avatar_url} size="md" />
                      <div>
                        <div className="font-medium line-clamp-1">{update.title}</div>
                        {update.is_ai_summary && (
                          <div className="flex items-center gap-1 text-xs text-[hsl(270,85%,55%)] dark:text-[hsl(270,85%,65%)]">
                            <Bot className="h-3 w-3" />AI Summary
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className={getUpdateTypeBadgeClasses(update.update_type)}>{update.update_type}</Badge></TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{update.cases.case_number}</div>
                      <div className="text-muted-foreground truncate max-w-[200px]">{update.cases.title}</div>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-sm">{update.author?.full_name || "Unknown"}</span></TableCell>
                  <TableCell className="text-muted-foreground">{update.created_at ? format(new Date(update.created_at), "MMM d, yyyy") : "-"}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/cases/${update.cases.id}`)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Go to Case
                        </DropdownMenuItem>
                        {canEditUpdate(update) && (
                          <DropdownMenuItem onClick={() => handleEditClick(update)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Update
                          </DropdownMenuItem>
                        )}
                        {canDeleteUpdate(update) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(update.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Update
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CaseSelectorDialog
        open={showCaseSelector}
        onOpenChange={setShowCaseSelector}
        onSelectCase={(caseId) => { setSelectedCaseId(caseId); setShowUpdateForm(true); }}
        title="Select a Case"
        description="Choose a case to add a new update to"
      />

      {(selectedCaseId || editingUpdate) && organization?.id && (
        <UpdateForm
          caseId={selectedCaseId || editingUpdate?.case_id || ''}
          open={showUpdateForm}
          onOpenChange={(open) => { 
            setShowUpdateForm(open); 
            if (!open) {
              setSelectedCaseId(null);
              setEditingUpdate(null);
            }
          }}
          onSuccess={() => { 
            setShowUpdateForm(false); 
            setSelectedCaseId(null);
            setEditingUpdate(null);
          }}
          editingUpdate={editingUpdate}
          organizationId={organization.id}
        />
      )}

      {/* Single Delete Confirmation */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Update"
        description="Are you sure you want to delete this update? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        variant="destructive"
        confirmLabel="Delete"
        loading={deleteUpdateMutation.isPending}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Delete Selected Updates"
        description={`Are you sure you want to delete ${selectedIds.size} update${selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.`}
        onConfirm={handleBulkDeleteConfirm}
        variant="destructive"
        confirmLabel="Delete All"
        loading={deleteUpdateMutation.isPending}
      />
    </div>
  );
}
