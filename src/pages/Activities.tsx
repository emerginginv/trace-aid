import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigationSource } from "@/hooks/useNavigationSource";
import { useActivitiesQuery, isScheduledActivity, useDeleteActivity } from "@/hooks/queries";
import { useViewMode } from "@/hooks/use-view-mode";
import { useActivityEnrichment } from "@/hooks/use-enriched-data";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardList, Clock, CheckCircle, Calendar, MoreVertical, ExternalLink, MapPin, RefreshCw, X, Trash2, Pencil } from "lucide-react";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CaseSelectorDialog } from "@/components/shared/CaseSelectorDialog";
import { ActivityForm } from "@/components/case-detail/ActivityForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCardsGrid, StatCardConfig, StatCardsGridSkeleton } from "@/components/shared/StatCardsGrid";
import { FilterToolbar } from "@/components/shared/FilterToolbar";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { ActivityCard } from "@/components/shared/ActivityCard";
import { ActivityStatusPill, deriveActivityDisplayStatus } from "@/components/shared/ActivityStatusPill";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "sonner";

const UNDO_DELAY = 5000;

interface ActivityWithCase {
  id: string;
  case_id: string;
  activity_type: string;
  title: string;
  description?: string | null;
  status: string;
  due_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  address?: string | null;
  completed?: boolean | null;
  completed_at?: string | null;
  assigned_user_id?: string | null;
  created_at?: string;
  updated_at?: string;
  is_scheduled?: boolean;
  cases: { id: string; case_number: string; title: string };
  assigned_user?: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

type ActivityCountKey = 'total' | 'dueSoon' | 'inProgress' | 'completed';

// Stat cards will be dynamically generated based on typeFilter
const getStatCards = (typeFilter: string): StatCardConfig<ActivityCountKey>[] => [
  { key: 'total', label: 'Total Activities', icon: ClipboardList, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { 
    key: 'dueSoon', 
    label: typeFilter === 'scheduled' ? 'Upcoming' : 'Due Soon', 
    icon: Clock, 
    color: 'text-amber-500', 
    bgColor: 'bg-amber-500/10' 
  },
  { key: 'inProgress', label: 'In Progress', icon: Clock, color: 'text-purple-500', bgColor: 'bg-purple-500/10', filterValue: 'in_progress' },
  { key: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', filterValue: 'completed' },
];

// All valid statuses for filtering
const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'to_do', label: 'To Do' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Type-specific statuses for bulk actions
const TASK_STATUSES = [
  { value: 'to_do', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const SCHEDULED_STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'unscheduled', label: 'Unscheduled (Tasks)' },
];

// Status badge styles removed - now using unified ActivityStatusPill

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "title", label: "Title" },
  { key: "activity_type", label: "Type", format: (v) => v === 'task' ? 'Task' : 'Scheduled' },
  { key: "case_number", label: "Case #", format: (_, row) => row.cases?.case_number || "-" },
  { key: "case_title", label: "Case Title", format: (_, row) => row.cases?.title || "-" },
  { key: "status", label: "Status", format: (v) => STATUS_OPTIONS.find(s => s.value === v)?.label || v },
  { 
    key: "due_date", 
    label: "Date", 
    format: (v, row) => {
      if (!v) return "-";
      const dateStr = format(new Date(v), "MMM d, yyyy");
      // Include time for scheduled activities
      if (row.is_scheduled && row.start_time) {
        return `${dateStr} ${row.start_time}`;
      }
      return dateStr;
    }
  },
  { key: "address", label: "Location", format: (v) => v || "-" },
  { key: "assigned_to", label: "Assigned To", format: (_, row) => row.assigned_user?.full_name || "-" },
  { key: "created_at", label: "Created", format: (v) => v ? format(new Date(v), "MMM d, yyyy") : "-" },
];

export default function Activities() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { organization } = useOrganization();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { navigateWithSource } = useNavigationSource();
  const queryClient = useQueryClient();

  // Get initial type filter from URL params (for backwards compatibility with /tasks and /events redirects)
  const initialTypeFilter = searchParams.get('type') === 'task' ? 'unscheduled' 
    : searchParams.get('type') === 'event' ? 'scheduled' 
    : 'all';

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState(initialTypeFilter);
  const [viewMode, setViewMode] = useViewMode<'list' | 'cards'>('activities-view-mode', 'cards');

  const [showCaseSelector, setShowCaseSelector] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityFormType, setActivityFormType] = useState<'task' | 'event'>('task');
  const [users, setUsers] = useState<{ id: string; email: string; full_name: string | null }[]>([]);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const pendingBulkDeletions = useRef<Map<string, { ids: string[]; timeoutId: NodeJS.Timeout }>>(new Map());

  // Edit and delete state
  const [editingActivity, setEditingActivity] = useState<ActivityWithCase | null>(null);
  const [deleteActivityId, setDeleteActivityId] = useState<string | null>(null);
  const deleteActivity = useDeleteActivity();

  // Use unified activities query
  const { data: rawActivities = [], isLoading } = useActivitiesQuery({ limit: 500 });

  // Use the shared enrichment hook
  const { enrichedData: enrichedActivities, isEnriching: enriching } = useActivityEnrichment(rawActivities);

  useEffect(() => {
    if (!organization?.id) return;
    fetchUsers();
  }, [organization?.id]);

  const fetchUsers = async () => {
    if (!organization?.id) return;
    try {
      const { data } = await supabase
        .from("organization_members")
        .select("user_id, profiles(id, email, full_name)")
        .eq("organization_id", organization.id);
      
      const usersList = (data || [])
        .map((m: any) => m.profiles)
        .filter(Boolean)
        .map((p: any) => ({ id: p.id, email: p.email || "", full_name: p.full_name }));
      
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Calculate counts
  const counts = useMemo(() => {
    const now = new Date();
    const inThreeDays = addDays(now, 3);
    
    return enrichedActivities.reduce((acc, a) => {
      acc.total++;
      if (a.status === 'completed' || a.status === 'done') acc.completed++;
      if (a.status === 'in_progress') acc.inProgress++;
      if (a.due_date && a.status !== 'completed' && a.status !== 'done' && a.status !== 'cancelled') {
        const dueDate = new Date(a.due_date);
        if (isAfter(dueDate, now) && isBefore(dueDate, inThreeDays)) {
          acc.dueSoon++;
        }
      }
      return acc;
    }, { total: 0, dueSoon: 0, inProgress: 0, completed: 0 } as Record<ActivityCountKey, number>);
  }, [enrichedActivities]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return enrichedActivities.filter((activity) => {
      // Status filter
      if (statusFilter !== "all" && activity.status !== statusFilter) return false;
      
      // Type filter (scheduled vs unscheduled)
      if (typeFilter === 'scheduled') {
        const scheduled = isScheduledActivity(activity as any);
        if (!scheduled) return false;
      } else if (typeFilter === 'unscheduled') {
        const scheduled = isScheduledActivity(activity as any);
        if (scheduled) return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!activity.title.toLowerCase().includes(query) &&
            !activity.description?.toLowerCase().includes(query) &&
            !activity.cases.case_number.toLowerCase().includes(query) &&
            !activity.cases.title.toLowerCase().includes(query) &&
            !activity.address?.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [enrichedActivities, statusFilter, typeFilter, searchQuery]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchQuery, statusFilter, typeFilter]);

  // Check if user can perform bulk actions
  const canBulkAction = hasPermission('edit_activities') || hasPermission('delete_activities');

  // Toggle individual selection
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

  // Toggle select all
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredActivities.length && filteredActivities.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredActivities.map(a => a.id)));
    }
  }, [selectedIds.size, filteredActivities]);

  // Get appropriate bulk status options based on selected activities
  const getBulkStatusOptions = useCallback(() => {
    const selectedActivities = filteredActivities.filter(a => selectedIds.has(a.id));
    const hasScheduled = selectedActivities.some(a => isScheduledActivity(a as any));
    const hasTasks = selectedActivities.some(a => !isScheduledActivity(a as any));
    
    if (hasScheduled && hasTasks) {
      // Mixed selection - only show common statuses
      return [
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ];
    } else if (hasScheduled) {
      return SCHEDULED_STATUSES;
    } else {
      return TASK_STATUSES;
    }
  }, [filteredActivities, selectedIds]);

  // Bulk status change handler
  const handleBulkStatusChange = useCallback(async (newStatus: string) => {
    const count = selectedIds.size;
    
    try {
      const { error } = await supabase
        .from("case_activities")
        .update({ 
          status: newStatus,
          ...(newStatus === 'completed' && { 
            completed: true, 
            completed_at: new Date().toISOString() 
          }),
          ...(newStatus !== 'completed' && { 
            completed: false, 
            completed_at: null 
          }),
        })
        .in("id", Array.from(selectedIds));
      
      if (error) throw error;
      
      toast.success(`Updated ${count} activit${count !== 1 ? 'ies' : 'y'} to "${STATUS_OPTIONS.find(s => s.value === newStatus)?.label || newStatus}"`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    } catch (error) {
      console.error("Bulk status update failed:", error);
      toast.error("Failed to update activities.");
    }
  }, [selectedIds, queryClient]);

  // Bulk delete handler
  const handleBulkDeleteConfirm = useCallback(() => {
    const idsToDelete = Array.from(selectedIds);
    const batchKey = idsToDelete.join(',');
    
    setBulkDeleteDialogOpen(false);
    
    const count = idsToDelete.length;
    toast(`${count} activit${count !== 1 ? 'ies' : 'y'} deleted`, {
      description: "Click undo to restore",
      action: {
        label: "Undo",
        onClick: () => {
          const pending = pendingBulkDeletions.current.get(batchKey);
          if (pending) {
            clearTimeout(pending.timeoutId);
            pendingBulkDeletions.current.delete(batchKey);
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            toast.success("Activities restored");
          }
        },
      },
      duration: UNDO_DELAY,
    });
    
    setSelectedIds(new Set());
    
    const timeoutId = setTimeout(async () => {
      const { error } = await supabase
        .from("case_activities")
        .delete()
        .in("id", idsToDelete);
      
      if (error) {
        toast.error("Failed to delete activities.");
      }
      pendingBulkDeletions.current.delete(batchKey);
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    }, UNDO_DELAY);
    
    pendingBulkDeletions.current.set(batchKey, {
      ids: idsToDelete,
      timeoutId,
    });
  }, [selectedIds, queryClient]);

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

  if (!hasPermission('view_activities')) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6 text-center">
          <h3 className="text-lg font-medium">Access Restricted</h3>
          <p className="text-muted-foreground mt-2">You don't have permission to view activities.</p>
        </Card>
      </div>
    );
  }

  const isOverdue = (dueDate: string | null | undefined, status: string) => {
    if (!dueDate || status === 'completed' || status === 'done' || status === 'cancelled') return false;
    return isBefore(new Date(dueDate), new Date());
  };

  const navigateToCase = (caseId: string) => navigateWithSource(navigate, `/cases/${caseId}`, 'activities_list');

  const handleStatClick = (key: ActivityCountKey, filterValue?: string) => {
    if (filterValue) {
      setStatusFilter(statusFilter === filterValue ? 'all' : filterValue);
    }
  };

  const handleAddActivity = (type: 'task' | 'event') => {
    setActivityFormType(type);
    setShowCaseSelector(true);
  };

  const handleDeleteActivity = useCallback(async () => {
    if (!deleteActivityId) return;
    
    try {
      await deleteActivity.mutateAsync(deleteActivityId);
      setDeleteActivityId(null);
      toast.success("Activity deleted successfully");
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete activity");
    }
  }, [deleteActivityId, deleteActivity]);

  // Removed type-based icon/color functions - using unified ActivityCard

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activities"
        description="View and manage all activities across cases"
        showAddButton={hasPermission('add_activities')}
        addButtonLabel="Add Activity"
        onAddClick={() => handleAddActivity('task')}
      />

      <StatCardsGrid
        stats={getStatCards(typeFilter)}
        counts={counts}
        activeFilter={statusFilter !== 'all' ? statusFilter : undefined}
        onStatClick={handleStatClick}
        isLoading={loading}
      />

      {/* Type Filter Tabs */}
      <Tabs value={typeFilter} onValueChange={setTypeFilter} className="w-full">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="unscheduled">Tasks</TabsTrigger>
        </TabsList>
      </Tabs>

      <FilterToolbar
        searchPlaceholder="Search activities or cases..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          { value: statusFilter, onChange: setStatusFilter, options: STATUS_OPTIONS, placeholder: "Status" }
        ]}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showViewToggle
        showExport
        onExportCSV={() => exportToCSV(filteredActivities, EXPORT_COLUMNS, "activities")}
        onExportPDF={() => exportToPDF(filteredActivities, EXPORT_COLUMNS, "Activities", "activities")}
        importTemplateFileName="15_Activities.csv"
        importEntityDisplayName="Activities"
      />

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} activit{selectedIds.size !== 1 ? 'ies' : 'y'} selected
          </span>
          <div className="flex flex-wrap gap-2">
            {hasPermission('edit_activities') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Change Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {getBulkStatusOptions().map(status => (
                    <DropdownMenuItem 
                      key={status.value}
                      onClick={() => handleBulkStatusChange(status.value)}
                    >
                      {status.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {hasPermission('delete_activities') && (
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
              Clear
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : filteredActivities.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No activities found" description="Try adjusting your filters" />
      ) : viewMode === 'list' ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {canBulkAction && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === filteredActivities.length && filteredActivities.length > 0}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                <TableHead className="w-[300px]">Title</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>{typeFilter === 'scheduled' ? 'Scheduled Date' : typeFilter === 'unscheduled' ? 'Due Date' : 'Date'}</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((activity) => {
                const displayStatus = deriveActivityDisplayStatus({
                  status: activity.status,
                  completed: activity.completed,
                  is_scheduled: activity.is_scheduled,
                  due_date: activity.due_date,
                });
                
                return (
                  <TableRow key={activity.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigateToCase(activity.cases.id)}>
                    {canBulkAction && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(activity.id)}
                          onCheckedChange={() => toggleSelect(activity.id)}
                          aria-label={`Select ${activity.title}`}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="font-semibold">{activity.title}</div>
                        {activity.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[280px]">{activity.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{activity.cases.case_number}</div>
                        <div className="text-muted-foreground truncate max-w-[180px]">{activity.cases.title}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ActivityStatusPill status={displayStatus} />
                    </TableCell>
                    <TableCell>
                      {activity.due_date ? (
                        <div className={cn(
                          "text-sm",
                          // Only show red "overdue" styling for TASKS, not scheduled activities
                          !activity.is_scheduled && displayStatus === 'overdue' && "text-red-500 font-medium"
                        )}>
                          {format(new Date(activity.due_date), "MMM d, yyyy")}
                          {/* Show time for scheduled activities */}
                          {activity.is_scheduled && activity.start_time && (
                            <div className="text-xs text-muted-foreground">
                              {activity.start_time}
                            </div>
                          )}
                        </div>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {activity.address ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground truncate max-w-[150px]">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {activity.address}
                        </div>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {activity.assigned_user ? (
                        <div className="flex items-center gap-2">
                          <UserAvatar name={activity.assigned_user.full_name} avatarUrl={activity.assigned_user.avatar_url} size="sm" />
                          <span className="text-sm truncate max-w-[100px]">{activity.assigned_user.full_name || "Unassigned"}</span>
                        </div>
                      ) : <span className="text-muted-foreground text-sm">Unassigned</span>}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/cases/${activity.cases.id}`)}>
                            <ExternalLink className="h-4 w-4 mr-2" />Go to Case
                          </DropdownMenuItem>
                          
                          {hasPermission('edit_activities') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setEditingActivity(activity)}>
                                <Pencil className="h-4 w-4 mr-2" />Edit
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          {hasPermission('delete_activities') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => setDeleteActivityId(activity.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={{
                id: activity.id,
                title: activity.title,
                due_date: activity.due_date,
                start_time: activity.start_time,
                end_time: activity.end_time,
                status: activity.status,
                is_scheduled: activity.is_scheduled,
                completed: activity.completed,
                address: activity.address,
                case_number: activity.cases.case_number,
                case_title: activity.cases.title,
                assigned_user_name: activity.assigned_user?.full_name,
                assigned_user_avatar: activity.assigned_user?.avatar_url,
              }}
              onClick={() => navigateToCase(activity.cases.id)}
              showCase={true}
            />
          ))}
        </div>
      )}

      <CaseSelectorDialog
        open={showCaseSelector}
        onOpenChange={setShowCaseSelector}
        onSelectCase={(caseId) => { setSelectedCaseId(caseId); setShowActivityForm(true); }}
        title="Select a Case"
        description={`Choose a case to add a new ${activityFormType === 'event' ? 'scheduled activity' : 'task'} to`}
      />

      {selectedCaseId && organization?.id && (
        <ActivityForm
          caseId={selectedCaseId}
          activityType={activityFormType}
          users={users}
          open={showActivityForm}
          onOpenChange={(open) => {
            setShowActivityForm(open);
            if (!open) {
              setSelectedCaseId(null);
            }
          }}
          onSuccess={() => {
            setShowActivityForm(false);
            setSelectedCaseId(null);
          }}
          organizationId={organization.id}
        />
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Delete Selected Activities"
        description={`Are you sure you want to delete ${selectedIds.size} activit${selectedIds.size !== 1 ? 'ies' : 'y'}? This action cannot be undone.`}
        onConfirm={handleBulkDeleteConfirm}
        variant="destructive"
        confirmLabel="Delete"
      />

      {/* Edit Activity Form */}
      {editingActivity && organization?.id && (
        <ActivityForm
          caseId={editingActivity.case_id}
          activityType={editingActivity.is_scheduled ? 'event' : 'task'}
          users={users}
          open={!!editingActivity}
          onOpenChange={(open) => {
            if (!open) setEditingActivity(null);
          }}
          onSuccess={() => {
            setEditingActivity(null);
            queryClient.invalidateQueries({ queryKey: ['activities'] });
          }}
          editingActivity={editingActivity}
          organizationId={organization.id}
        />
      )}

      {/* Single Activity Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={!!deleteActivityId}
        onOpenChange={(open) => {
          if (!open) setDeleteActivityId(null);
        }}
        title="Delete Activity"
        description="Are you sure you want to delete this activity? This action cannot be undone."
        onConfirm={handleDeleteActivity}
        variant="destructive"
        confirmLabel="Delete"
      />
    </div>
  );
}
