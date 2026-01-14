import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigationSource } from "@/hooks/useNavigationSource";
import { useTasksQuery } from "@/hooks/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CheckSquare, Clock, CheckCircle, MoreVertical, Eye, ExternalLink } from "lucide-react";
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

interface TaskWithCase {
  id: string;
  case_id: string;
  activity_type: string;
  title: string;
  description?: string | null;
  status: string;
  due_date?: string | null;
  address?: string | null;
  completed?: boolean | null;
  completed_at?: string | null;
  assigned_user_id?: string | null;
  created_at?: string;
  updated_at?: string;
  cases: { id: string; case_number: string; title: string };
  assigned_user?: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

type TaskCountKey = 'total' | 'dueSoon' | 'inProgress' | 'completed';

const STAT_CARDS: StatCardConfig<TaskCountKey>[] = [
  { key: 'total', label: 'Total Tasks', icon: CheckSquare, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { key: 'dueSoon', label: 'Due Soon', icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  { key: 'inProgress', label: 'In Progress', icon: Clock, color: 'text-purple-500', bgColor: 'bg-purple-500/10', filterValue: 'in_progress' },
  { key: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', filterValue: 'completed' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const getStatusBadgeStyles = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'in_progress': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-500/20';
    default: return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
  }
};

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "title", label: "Title" },
  { key: "case_number", label: "Case #", format: (_, row) => row.cases?.case_number || "-" },
  { key: "case_title", label: "Case Title", format: (_, row) => row.cases?.title || "-" },
  { key: "status", label: "Status", format: (v) => STATUS_OPTIONS.find(s => s.value === v)?.label || v },
  { key: "due_date", label: "Due Date", format: (v) => v ? format(new Date(v), "MMM d, yyyy") : "-" },
  { key: "assigned_to", label: "Assigned To", format: (_, row) => row.assigned_user?.full_name || "-" },
  { key: "created_at", label: "Created", format: (v) => v ? format(new Date(v), "MMM d, yyyy") : "-" },
];

export default function Tasks() {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { navigateWithSource } = useNavigationSource();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<'list' | 'cards'>(() => {
    return (localStorage.getItem('tasks-view-mode') as 'list' | 'cards') || 'cards';
  });

  const [showCaseSelector, setShowCaseSelector] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [users, setUsers] = useState<{ id: string; email: string; full_name: string | null }[]>([]);

  // Use React Query for tasks
  const { data: rawTasks = [], isLoading } = useTasksQuery({ limit: 500 });

  // Enrich tasks with case and user data
  const [enrichedTasks, setEnrichedTasks] = useState<TaskWithCase[]>([]);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    localStorage.setItem('tasks-view-mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!organization?.id) return;
    fetchUsers();
  }, [organization?.id]);

  // Enrich raw tasks with case and user data
  useEffect(() => {
    const enrichTasks = async () => {
      if (rawTasks.length === 0) {
        setEnrichedTasks([]);
        return;
      }
      
      setEnriching(true);
      try {
        const caseIds = [...new Set(rawTasks.map(t => t.case_id))];
        const userIds = [...new Set(rawTasks.filter(t => t.assigned_user_id).map(t => t.assigned_user_id!))];

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

        const enriched = rawTasks
          .filter(t => casesMap[t.case_id])
          .map(t => ({
            ...t,
            cases: casesMap[t.case_id],
            assigned_user: t.assigned_user_id ? usersMap[t.assigned_user_id] || null : null,
          }));

        setEnrichedTasks(enriched);
      } catch (error) {
        console.error("Error enriching tasks:", error);
      } finally {
        setEnriching(false);
      }
    };

    enrichTasks();
  }, [rawTasks]);

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
    
    return enrichedTasks.reduce((acc, t) => {
      acc.total++;
      if (t.status === 'completed') acc.completed++;
      if (t.status === 'in_progress') acc.inProgress++;
      if (t.due_date && t.status !== 'completed' && t.status !== 'cancelled') {
        const dueDate = new Date(t.due_date);
        if (isAfter(dueDate, now) && isBefore(dueDate, inThreeDays)) {
          acc.dueSoon++;
        }
      }
      return acc;
    }, { total: 0, dueSoon: 0, inProgress: 0, completed: 0 } as Record<TaskCountKey, number>);
  }, [enrichedTasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return enrichedTasks.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!task.title.toLowerCase().includes(query) &&
            !task.description?.toLowerCase().includes(query) &&
            !task.cases.case_number.toLowerCase().includes(query) &&
            !task.cases.title.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [enrichedTasks, statusFilter, searchQuery]);

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
          <p className="text-muted-foreground mt-2">You don't have permission to view tasks.</p>
        </Card>
      </div>
    );
  }

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'completed' || status === 'cancelled') return false;
    return isBefore(new Date(dueDate), new Date());
  };

  const navigateToCase = (caseId: string) => navigateWithSource(navigate, `/cases/${caseId}`, 'tasks_list');

  const handleStatClick = (key: TaskCountKey, filterValue?: string) => {
    if (filterValue) {
      setStatusFilter(statusFilter === filterValue ? 'all' : filterValue);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="View and manage tasks across all cases"
        showAddButton={hasPermission('add_activities')}
        addButtonLabel="Add Task"
        onAddClick={() => setShowCaseSelector(true)}
      />

      <StatCardsGrid
        stats={STAT_CARDS}
        counts={counts}
        activeFilter={statusFilter !== 'all' ? statusFilter : undefined}
        onStatClick={handleStatClick}
        isLoading={loading}
      />

      <FilterToolbar
        searchPlaceholder="Search tasks or cases..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          { value: statusFilter, onChange: setStatusFilter, options: STATUS_OPTIONS, placeholder: "Status" }
        ]}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showViewToggle
        showExport
        onExportCSV={() => exportToCSV(filteredTasks, EXPORT_COLUMNS, "tasks")}
        onExportPDF={() => exportToPDF(filteredTasks, EXPORT_COLUMNS, "Tasks", "tasks")}
        importTemplateFileName="16_Tasks.csv"
        importEntityDisplayName="Tasks"
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No tasks found" description="Try adjusting your filters" />
      ) : viewMode === 'list' ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Title</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => {
                const overdue = isOverdue(task.due_date, task.status);
                return (
                  <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigateToCase(task.cases.id)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full flex items-center justify-center bg-blue-500/10">
                          <CheckSquare className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <div className="font-medium">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[220px]">{task.description}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{task.cases.case_number}</div>
                        <div className="text-muted-foreground truncate max-w-[180px]">{task.cases.title}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadgeStyles(task.status)}>
                        {STATUS_OPTIONS.find(s => s.value === task.status)?.label || task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.due_date ? (
                        <div className={cn("text-sm", overdue && "text-red-500 font-medium")}>
                          {format(new Date(task.due_date), "MMM d, yyyy")}
                          {overdue && <span className="ml-1">(Overdue)</span>}
                        </div>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {task.assigned_user ? (
                        <div className="flex items-center gap-2">
                          <UserAvatar name={task.assigned_user.full_name} avatarUrl={task.assigned_user.avatar_url} size="sm" />
                          <span className="text-sm truncate max-w-[100px]">{task.assigned_user.full_name || "Unassigned"}</span>
                        </div>
                      ) : <span className="text-muted-foreground text-sm">Unassigned</span>}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigateToCase(task.cases.id)}>
                            <Eye className="h-4 w-4 mr-2" />View in Case
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/cases/${task.cases.id}`)}>
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
          {filteredTasks.map((task) => {
            const overdue = isOverdue(task.due_date, task.status);
            return (
              <Card key={task.id} className={cn("relative overflow-hidden transition-shadow hover:shadow-md cursor-pointer group", task.status === 'completed' && "opacity-70")} onClick={() => navigateToCase(task.cases.id)}>
                <div className="h-1 bg-blue-500" />
                <Badge variant="outline" className={cn("absolute top-3 right-3 text-xs z-10", getStatusBadgeStyles(task.status))}>
                  {STATUS_OPTIONS.find(s => s.value === task.status)?.label || task.status}
                </Badge>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-500/10">
                      <CheckSquare className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate pr-16">{task.title}</h3>
                    </div>
                  </div>
                  {task.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{task.description}</p>}
                  {task.due_date && (
                    <div className={cn("flex items-center gap-2 text-sm mb-3", overdue ? "text-red-500" : "text-muted-foreground")}>
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(task.due_date), "MMM d, yyyy")}{overdue && " (Overdue)"}</span>
                    </div>
                  )}
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground">Case</p>
                    <p className="text-sm font-medium truncate">{task.cases.case_number}</p>
                    <p className="text-xs text-muted-foreground truncate">{task.cases.title}</p>
                  </div>
                  {task.assigned_user && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-2">
                      <UserAvatar name={task.assigned_user.full_name} avatarUrl={task.assigned_user.avatar_url} size="sm" />
                      <span className="text-sm text-muted-foreground truncate">{task.assigned_user.full_name}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && filteredTasks.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredTasks.length} of {enrichedTasks.length} tasks
        </p>
      )}

      <CaseSelectorDialog
        open={showCaseSelector}
        onOpenChange={setShowCaseSelector}
        onSelectCase={(caseId) => { setSelectedCaseId(caseId); setShowActivityForm(true); }}
        title="Select a Case"
        description="Choose a case to add a new task to"
      />

      {selectedCaseId && organization?.id && (
        <ActivityForm
          caseId={selectedCaseId}
          activityType="task"
          users={users}
          open={showActivityForm}
          onOpenChange={(open) => { setShowActivityForm(open); if (!open) setSelectedCaseId(null); }}
          onSuccess={() => { setShowActivityForm(false); setSelectedCaseId(null); }}
          organizationId={organization.id}
        />
      )}
    </div>
  );
}
