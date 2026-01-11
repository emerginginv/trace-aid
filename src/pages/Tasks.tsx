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
import { CheckSquare, Calendar, Clock, CheckCircle, Search, LayoutGrid, List, MoreVertical, Eye, ExternalLink, MapPin } from "lucide-react";
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
  event_subtype: string | null;
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

interface ActivityCounts {
  tasks: number;
  events: number;
  dueSoon: number;
  completed: number;
}

const STAT_CARDS = [
  { key: 'tasks' as const, label: 'Tasks', icon: CheckSquare, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { key: 'events' as const, label: 'Events', icon: Calendar, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  { key: 'dueSoon' as const, label: 'Due Soon', icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
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

export default function Tasks() {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { navigateWithSource } = useNavigationSource();

  const [activities, setActivities] = useState<ActivityWithCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'list' | 'cards'>(() => {
    return (localStorage.getItem('tasks-view-mode') as 'list' | 'cards') || 'cards';
  });

  const [counts, setCounts] = useState<ActivityCounts>({
    tasks: 0,
    events: 0,
    dueSoon: 0,
    completed: 0,
  });

  useEffect(() => {
    if (!organization?.id) return;
    fetchActivities();
  }, [organization?.id]);

  useEffect(() => {
    localStorage.setItem('tasks-view-mode', viewMode);
  }, [viewMode]);

  const fetchActivities = async () => {
    if (!organization?.id) return;
    setLoading(true);

    try {
      // Fetch activities first
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("case_activities")
        .select("*")
        .eq("organization_id", organization.id)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (activitiesError) throw activitiesError;

      // Fetch cases for the activities
      const caseIds = [...new Set((activitiesData || []).map(a => a.case_id))];
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
      const assignedUserIds = [...new Set((activitiesData || []).filter(a => a.assigned_user_id).map(a => a.assigned_user_id))];
      
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

      const enrichedActivities: ActivityWithCase[] = (activitiesData || [])
        .filter(a => casesMap[a.case_id]) // Only include activities with valid cases
        .map((a) => ({
          ...a,
          cases: casesMap[a.case_id],
          assigned_user: a.assigned_user_id ? usersMap[a.assigned_user_id] || null : null,
        }));

      setActivities(enrichedActivities);

      // Calculate counts
      const now = new Date();
      const inThreeDays = addDays(now, 3);
      
      const newCounts: ActivityCounts = {
        tasks: 0,
        events: 0,
        dueSoon: 0,
        completed: 0,
      };

      enrichedActivities.forEach((a) => {
        if (a.activity_type === 'task') newCounts.tasks++;
        if (a.activity_type === 'event') newCounts.events++;
        if (a.status === 'completed') newCounts.completed++;
        if (a.due_date && a.status !== 'completed' && a.status !== 'cancelled') {
          const dueDate = new Date(a.due_date);
          if (isAfter(dueDate, now) && isBefore(dueDate, inThreeDays)) {
            newCounts.dueSoon++;
          }
        }
      });

      setCounts(newCounts);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      // Type filter
      if (typeFilter !== "all" && activity.activity_type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && activity.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = activity.title.toLowerCase().includes(query);
        const matchesDescription = activity.description?.toLowerCase().includes(query);
        const matchesCaseNumber = activity.cases.case_number.toLowerCase().includes(query);
        const matchesCaseTitle = activity.cases.title.toLowerCase().includes(query);
        
        if (!matchesTitle && !matchesDescription && !matchesCaseNumber && !matchesCaseTitle) {
          return false;
        }
      }

      return true;
    });
  }, [activities, typeFilter, statusFilter, searchQuery]);

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
          <p className="text-muted-foreground mt-2">You don't have permission to view activities.</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tasks & Events</h1>
        <p className="text-muted-foreground">View and manage tasks and events across all cases</p>
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
                if (stat.key === 'tasks') setTypeFilter(typeFilter === 'task' ? 'all' : 'task');
                else if (stat.key === 'events') setTypeFilter(typeFilter === 'event' ? 'all' : 'event');
                else if (stat.key === 'completed') setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed');
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="task">Tasks</SelectItem>
            <SelectItem value="event">Events</SelectItem>
          </SelectContent>
        </Select>
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
      ) : filteredActivities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckSquare className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No tasks or events found</h3>
          <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your filters</p>
        </div>
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
                <TableHead>Assigned To</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((activity) => {
                const overdue = isOverdue(activity.due_date, activity.status);

                return (
                  <TableRow
                    key={activity.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigateToCase(activity.cases.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-9 w-9 rounded-full flex items-center justify-center",
                          activity.activity_type === 'task' ? 'bg-blue-500/10' : 'bg-green-500/10'
                        )}>
                          {activity.activity_type === 'task' ? (
                            <CheckSquare className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Calendar className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{activity.title}</div>
                          {activity.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[220px]">
                              {activity.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {activity.activity_type}
                        {activity.event_subtype && ` - ${activity.event_subtype}`}
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
                        {getStatusLabel(activity.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {activity.due_date ? (
                        <div className={cn("text-sm", overdue && "text-red-500 font-medium")}>
                          {format(new Date(activity.due_date), "MMM d, yyyy")}
                          {overdue && <span className="ml-1">(Overdue)</span>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {activity.assigned_user ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={activity.assigned_user.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(activity.assigned_user.full_name || "?")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate max-w-[100px]">
                            {activity.assigned_user.full_name || "Unassigned"}
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
                          <DropdownMenuItem onClick={() => navigateToCase(activity.cases.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View in Case
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/cases/${activity.cases.id}`)}>
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
          {filteredActivities.map((activity) => {
            const overdue = isOverdue(activity.due_date, activity.status);

            return (
              <Card
                key={activity.id}
                className={cn(
                  "relative overflow-hidden transition-shadow hover:shadow-md cursor-pointer group",
                  activity.status === 'completed' && "opacity-70"
                )}
                onClick={() => navigateToCase(activity.cases.id)}
              >
                {/* Type indicator strip */}
                <div className={cn(
                  "h-1",
                  activity.activity_type === 'task' ? 'bg-blue-500' : 'bg-green-500'
                )} />

                {/* Status Badge */}
                <Badge 
                  variant="outline" 
                  className={cn("absolute top-3 right-3 text-xs z-10", getStatusBadgeStyles(activity.status))}
                >
                  {getStatusLabel(activity.status)}
                </Badge>

                <CardContent className="pt-4 pb-4">
                  {/* Icon and Title */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                      activity.activity_type === 'task' ? 'bg-blue-500/10' : 'bg-green-500/10'
                    )}>
                      {activity.activity_type === 'task' ? (
                        <CheckSquare className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Calendar className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate pr-16">
                        {activity.title}
                      </h3>
                      <Badge variant="outline" className="mt-1 capitalize text-xs">
                        {activity.activity_type}
                        {activity.event_subtype && ` - ${activity.event_subtype}`}
                      </Badge>
                    </div>
                  </div>

                  {/* Description */}
                  {activity.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {activity.description}
                    </p>
                  )}

                  {/* Address for events */}
                  {activity.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{activity.address}</span>
                    </div>
                  )}

                  {/* Due date */}
                  {activity.due_date && (
                    <div className={cn(
                      "flex items-center gap-2 text-sm mb-3",
                      overdue ? "text-red-500" : "text-muted-foreground"
                    )}>
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(new Date(activity.due_date), "MMM d, yyyy")}
                        {overdue && " (Overdue)"}
                      </span>
                    </div>
                  )}

                  {/* Case reference */}
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground">Case</p>
                    <p className="text-sm font-medium truncate">{activity.cases.case_number}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.cases.title}</p>
                  </div>

                  {/* Assigned user */}
                  {activity.assigned_user && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={activity.assigned_user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(activity.assigned_user.full_name || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground truncate">
                        {activity.assigned_user.full_name}
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
      {!loading && filteredActivities.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredActivities.length} of {activities.length} activities
        </p>
      )}
    </div>
  );
}
