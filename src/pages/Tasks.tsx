import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigationSource } from "@/hooks/useNavigationSource";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ImportTemplateButton } from "@/components/ui/import-template-button";
import { CheckSquare, Calendar, Clock, CheckCircle, Search, LayoutGrid, List, MoreVertical, Eye, ExternalLink, MapPin, Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityWithCase {
  id: string;
  case_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  address: string | null;
  completed: boolean | null;
  completed_at: string | null;
  assigned_user_id: string | null;
  created_at: string;
  updated_at: string;
  cases: {
    id: string;
    case_number: string;
    title: string;
  };
  assigned_user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface TaskCounts {
  total: number;
  dueSoon: number;
  inProgress: number;
  completed: number;
}

const STAT_CARDS = [
  { key: 'total' as const, label: 'Total Tasks', icon: CheckSquare, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { key: 'dueSoon' as const, label: 'Due Soon', icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  { key: 'inProgress' as const, label: 'In Progress', icon: Clock, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { key: 'completed' as const, label: 'Completed', icon: CheckCircle, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const getStatusBadgeStyles = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'in_progress':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'cancelled':
      return 'bg-red-500/10 text-red-600 border-red-500/20';
    default:
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
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

  const [tasks, setTasks] = useState<ActivityWithCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'list' | 'cards'>(() => {
    return (localStorage.getItem('tasks-view-mode') as 'list' | 'cards') || 'cards';
  });

  const [counts, setCounts] = useState<TaskCounts>({
    total: 0,
    dueSoon: 0,
    inProgress: 0,
    completed: 0,
  });

  useEffect(() => {
    if (!organization?.id) return;
    fetchTasks();
  }, [organization?.id]);

  useEffect(() => {
    localStorage.setItem('tasks-view-mode', viewMode);
  }, [viewMode]);

  const fetchTasks = async () => {
    if (!organization?.id) return;
    setLoading(true);

    try {
      // Fetch only tasks (activity_type = 'task')
      const { data: tasksData, error: tasksError } = await supabase
        .from("case_activities")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("activity_type", "task")
        .order("due_date", { ascending: true, nullsFirst: false });

      if (tasksError) throw tasksError;

      // Fetch cases for the tasks
      const caseIds = [...new Set((tasksData || []).map(a => a.case_id))];
      let casesMap: Record<string, { id: string; case_number: string; title: string }> = {};
      
      if (caseIds.length > 0) {
        const { data: cases } = await supabase
          .from("cases")
          .select("id, case_number, title")
          .in("id", caseIds);
        
        if (cases) {
          casesMap = cases.reduce((acc, c) => {
            acc[c.id] = c;
            return acc;
          }, {} as typeof casesMap);
        }
      }

      // Fetch assigned users separately
      const assignedUserIds = [...new Set((tasksData || []).filter(a => a.assigned_user_id).map(a => a.assigned_user_id))];
      
      let usersMap: Record<string, { id: string; full_name: string | null; avatar_url: string | null }> = {};
      if (assignedUserIds.length > 0) {
        const { data: users } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", assignedUserIds);
        
        if (users) {
          usersMap = users.reduce((acc, u) => {
            acc[u.id] = u;
            return acc;
          }, {} as typeof usersMap);
        }
      }

      const enrichedTasks: ActivityWithCase[] = ((tasksData || []) as any[])
        .filter(a => casesMap[a.case_id])
        .map((a) => ({
          ...a,
          cases: casesMap[a.case_id],
          assigned_user: a.assigned_user_id ? usersMap[a.assigned_user_id] || null : null,
        }));

      setTasks(enrichedTasks);

      // Calculate counts
      const now = new Date();
      const inThreeDays = addDays(now, 3);
      
      const newCounts: TaskCounts = {
        total: enrichedTasks.length,
        dueSoon: 0,
        inProgress: 0,
        completed: 0,
      };

      enrichedTasks.forEach((t) => {
        if (t.status === 'completed') newCounts.completed++;
        if (t.status === 'in_progress') newCounts.inProgress++;
        if (t.due_date && t.status !== 'completed' && t.status !== 'cancelled') {
          const dueDate = new Date(t.due_date);
          if (isAfter(dueDate, now) && isBefore(dueDate, inThreeDays)) {
            newCounts.dueSoon++;
          }
        }
      });

      setCounts(newCounts);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Status filter
      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDescription = task.description?.toLowerCase().includes(query);
        const matchesCaseNumber = task.cases.case_number.toLowerCase().includes(query);
        const matchesCaseTitle = task.cases.title.toLowerCase().includes(query);
        
        if (!matchesTitle && !matchesDescription && !matchesCaseNumber && !matchesCaseTitle) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, statusFilter, searchQuery]);

  if (permissionsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
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

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getStatusLabel = (status: string) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found?.label || status;
  };

  const navigateToCase = (caseId: string) => {
    navigateWithSource(navigate, `/cases/${caseId}`, 'tasks_list');
  };

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'completed' || status === 'cancelled') return false;
    return isBefore(new Date(dueDate), new Date());
  };

  const handleExportCSV = () => {
    exportToCSV(filteredTasks, EXPORT_COLUMNS, "tasks");
  };

  const handleExportPDF = () => {
    exportToPDF(filteredTasks, EXPORT_COLUMNS, "Tasks", "tasks");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground">View and manage tasks across all cases</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.key} 
              className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => {
                if (stat.key === 'completed') setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed');
                else if (stat.key === 'inProgress') setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress');
              }}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center", stat.bgColor)}>
                  <Icon className={cn("h-6 w-6", stat.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{counts[stat.key]}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks, events, or cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <ImportTemplateButton templateFileName="16_Tasks.csv" entityDisplayName="Tasks" />
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('cards')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckSquare className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No tasks found</h3>
          <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your filters</p>
        </div>
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
                  <TableRow
                    key={task.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigateToCase(task.cases.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full flex items-center justify-center bg-blue-500/10">
                          <CheckSquare className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <div className="font-medium">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[220px]">
                              {task.description}
                            </div>
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
                        {getStatusLabel(task.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.due_date ? (
                        <div className={cn("text-sm", overdue && "text-red-500 font-medium")}>
                          {format(new Date(task.due_date), "MMM d, yyyy")}
                          {overdue && <span className="ml-1">(Overdue)</span>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.assigned_user ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={task.assigned_user.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(task.assigned_user.full_name || "?")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate max-w-[100px]">
                            {task.assigned_user.full_name || "Unassigned"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigateToCase(task.cases.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View in Case
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/cases/${task.cases.id}`)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Go to Case
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
              <Card
                key={task.id}
                className={cn(
                  "relative overflow-hidden transition-shadow hover:shadow-md cursor-pointer group",
                  task.status === 'completed' && "opacity-70"
                )}
                onClick={() => navigateToCase(task.cases.id)}
              >
                {/* Type indicator strip */}
                <div className="h-1 bg-blue-500" />

                {/* Status Badge */}
                <Badge 
                  variant="outline" 
                  className={cn("absolute top-3 right-3 text-xs z-10", getStatusBadgeStyles(task.status))}
                >
                  {getStatusLabel(task.status)}
                </Badge>

                <CardContent className="pt-4 pb-4">
                  {/* Icon and Title */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-500/10">
                      <CheckSquare className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate pr-16">
                        {task.title}
                      </h3>
                    </div>
                  </div>

                  {/* Description */}
                  {task.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {task.description}
                    </p>
                  )}

                  {/* Due date */}
                  {task.due_date && (
                    <div className={cn(
                      "flex items-center gap-2 text-sm mb-3",
                      overdue ? "text-red-500" : "text-muted-foreground"
                    )}>
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(new Date(task.due_date), "MMM d, yyyy")}
                        {overdue && " (Overdue)"}
                      </span>
                    </div>
                  )}

                  {/* Case reference */}
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground">Case</p>
                    <p className="text-sm font-medium truncate">{task.cases.case_number}</p>
                    <p className="text-xs text-muted-foreground truncate">{task.cases.title}</p>
                  </div>

                  {/* Assigned user */}
                  {task.assigned_user && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={task.assigned_user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(task.assigned_user.full_name || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground truncate">
                        {task.assigned_user.full_name}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Results count */}
      {!loading && filteredTasks.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredTasks.length} of {tasks.length} tasks
        </p>
      )}
    </div>
  );
}
