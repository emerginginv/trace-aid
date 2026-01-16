import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigationSource } from "@/hooks/useNavigationSource";
import { useActivitiesQuery, isScheduledActivity } from "@/hooks/queries";
import { useViewMode } from "@/hooks/use-view-mode";
import { useActivityEnrichment } from "@/hooks/use-enriched-data";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Clock, CheckCircle, Calendar, MoreVertical, Eye, ExternalLink, MapPin } from "lucide-react";
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

const STAT_CARDS: StatCardConfig<ActivityCountKey>[] = [
  { key: 'total', label: 'Total Activities', icon: ClipboardList, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { key: 'dueSoon', label: 'Due Soon', icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  { key: 'inProgress', label: 'In Progress', icon: Clock, color: 'text-purple-500', bgColor: 'bg-purple-500/10', filterValue: 'in_progress' },
  { key: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', filterValue: 'completed' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'to_do', label: 'To Do' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
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
  { key: "due_date", label: "Due Date", format: (v) => v ? format(new Date(v), "MMM d, yyyy") : "-" },
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

  // Removed type-based icon/color functions - using unified ActivityCard

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activities"
        description="View and manage all activities across cases"
        showAddButton={hasPermission('add_activities')}
        addButtonLabel="Add Activity"
        onAddClick={() => handleAddActivity('task')}
        actions={
          hasPermission('add_activities') ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Add Scheduled
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleAddActivity('event')}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Scheduled Activity
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddActivity('task')}>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : undefined
        }
      />

      <StatCardsGrid
        stats={STAT_CARDS}
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
                <TableHead className="w-[300px]">Title</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
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
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="font-medium">{activity.title}</div>
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
                        <div className={cn("text-sm", displayStatus === 'overdue' && "text-red-500 font-medium")}>
                          {format(new Date(activity.due_date), "MMM d, yyyy")}
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
                          <DropdownMenuItem onClick={() => navigateToCase(activity.cases.id)}>
                            <Eye className="h-4 w-4 mr-2" />View in Case
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/cases/${activity.cases.id}`)}>
                            <ExternalLink className="h-4 w-4 mr-2" />Go to Case
                          </DropdownMenuItem>
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
    </div>
  );
}
