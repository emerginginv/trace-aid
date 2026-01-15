import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigationSource } from "@/hooks/useNavigationSource";
import { useActivitiesQuery, isScheduledActivity } from "@/hooks/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Clock, CheckCircle, Calendar, MoreVertical, Eye, ExternalLink, MapPin, CheckSquare } from "lucide-react";
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

const getStatusBadgeStyles = (status: string) => {
  switch (status) {
    case 'completed': 
    case 'done': 
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'in_progress': 
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'cancelled': 
      return 'bg-red-500/10 text-red-600 border-red-500/20';
    case 'scheduled': 
      return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    default: 
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
  }
};

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
  const [viewMode, setViewMode] = useState<'list' | 'cards'>(() => {
    return (localStorage.getItem('activities-view-mode') as 'list' | 'cards') || 'cards';
  });

  const [showCaseSelector, setShowCaseSelector] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityFormType, setActivityFormType] = useState<'task' | 'event'>('task');
  const [users, setUsers] = useState<{ id: string; email: string; full_name: string | null }[]>([]);

  // Use unified activities query
  const { data: rawActivities = [], isLoading } = useActivitiesQuery({ limit: 500 });

  // Enrich activities with case and user data
  const [enrichedActivities, setEnrichedActivities] = useState<ActivityWithCase[]>([]);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    localStorage.setItem('activities-view-mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!organization?.id) return;
    fetchUsers();
  }, [organization?.id]);

  // Enrich raw activities with case and user data
  useEffect(() => {
    const enrichActivities = async () => {
      if (rawActivities.length === 0) {
        setEnrichedActivities([]);
        return;
      }
      
      setEnriching(true);
      try {
        const caseIds = [...new Set(rawActivities.map(a => a.case_id))];
        const userIds = [...new Set(rawActivities.filter(a => a.assigned_user_id).map(a => a.assigned_user_id!))];

        const [casesResult, usersResult] = await Promise.all([
          caseIds.length > 0 
            ? supabase.from("cases").select("id, case_number, title").in("id", caseIds)
            : { data: [] },
          userIds.length > 0
            ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds)
            : { data: [] },
        ]);

        const casesMap = (casesResult.data || []).reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as Record<string, any>);
        const usersMap = (usersResult.data || []).reduce((acc, u) => ({ ...acc, [u.id]: u }), {} as Record<string, any>);

        const enriched = rawActivities
          .filter(a => casesMap[a.case_id])
          .map(a => ({
            ...a,
            cases: casesMap[a.case_id],
            assigned_user: a.assigned_user_id ? usersMap[a.assigned_user_id] || null : null,
          }));

        setEnrichedActivities(enriched);
      } catch (error) {
        console.error("Error enriching activities:", error);
      } finally {
        setEnriching(false);
      }
    };

    enrichActivities();
  }, [rawActivities]);

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

  const getActivityIcon = (activity: ActivityWithCase) => {
    const scheduled = isScheduledActivity(activity as any);
    return scheduled ? Calendar : CheckSquare;
  };

  const getActivityColor = (activity: ActivityWithCase) => {
    const scheduled = isScheduledActivity(activity as any);
    return scheduled ? 'text-green-500' : 'text-blue-500';
  };

  const getActivityBgColor = (activity: ActivityWithCase) => {
    const scheduled = isScheduledActivity(activity as any);
    return scheduled ? 'bg-green-500/10' : 'bg-blue-500/10';
  };

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
                  <CheckSquare className="h-4 w-4 mr-2" />
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
                <TableHead>Type</TableHead>
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
                const overdue = isOverdue(activity.due_date, activity.status);
                const ActivityIcon = getActivityIcon(activity);
                const scheduled = isScheduledActivity(activity as any);
                
                return (
                  <TableRow key={activity.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigateToCase(activity.cases.id)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn("h-9 w-9 rounded-full flex items-center justify-center", getActivityBgColor(activity))}>
                          <ActivityIcon className={cn("h-4 w-4", getActivityColor(activity))} />
                        </div>
                        <div>
                          <div className="font-medium">{activity.title}</div>
                          {activity.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[220px]">{activity.description}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {scheduled ? 'Scheduled' : 'Task'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{activity.cases.case_number}</div>
                        <div className="text-muted-foreground truncate max-w-[180px]">{activity.cases.title}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadgeStyles(activity.status)}>
                        {STATUS_OPTIONS.find(s => s.value === activity.status)?.label || activity.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {activity.due_date ? (
                        <div className={cn("text-sm", overdue && "text-red-500 font-medium")}>
                          {format(new Date(activity.due_date), "MMM d, yyyy")}
                          {overdue && <span className="ml-1">(Overdue)</span>}
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
          {filteredActivities.map((activity) => {
            const overdue = isOverdue(activity.due_date, activity.status);
            const ActivityIcon = getActivityIcon(activity);
            const scheduled = isScheduledActivity(activity as any);
            const isCompleted = activity.status === 'completed' || activity.status === 'done';
            
            return (
              <Card 
                key={activity.id} 
                className={cn(
                  "relative overflow-hidden transition-shadow hover:shadow-md cursor-pointer group", 
                  isCompleted && "opacity-70"
                )} 
                onClick={() => navigateToCase(activity.cases.id)}
              >
                <div className={cn("h-1", scheduled ? "bg-green-500" : "bg-blue-500")} />
                <div className="absolute top-3 right-3 flex gap-2 z-10">
                  <Badge variant="outline" className="text-xs">
                    {scheduled ? 'Scheduled' : 'Task'}
                  </Badge>
                  <Badge variant="outline" className={cn("text-xs", getStatusBadgeStyles(activity.status))}>
                    {STATUS_OPTIONS.find(s => s.value === activity.status)?.label || activity.status}
                  </Badge>
                </div>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", getActivityBgColor(activity))}>
                      <ActivityIcon className={cn("h-5 w-5", getActivityColor(activity))} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate pr-24">{activity.title}</h3>
                    </div>
                  </div>
                  {activity.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{activity.description}</p>}
                  {activity.due_date && (
                    <div className={cn("flex items-center gap-2 text-sm mb-3", overdue ? "text-red-500" : "text-muted-foreground")}>
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(activity.due_date), "MMM d, yyyy")}{overdue && " (Overdue)"}</span>
                    </div>
                  )}
                  {activity.address && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{activity.address}</span>
                    </div>
                  )}
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground">Case</p>
                    <p className="text-sm font-medium truncate">{activity.cases.case_number}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.cases.title}</p>
                  </div>
                  {activity.assigned_user && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-2">
                      <UserAvatar name={activity.assigned_user.full_name} avatarUrl={activity.assigned_user.avatar_url} size="sm" />
                      <span className="text-sm text-muted-foreground">{activity.assigned_user.full_name}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
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
