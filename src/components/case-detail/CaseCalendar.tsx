import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { CalendarTabSkeleton } from "./CaseTabSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, CheckCircle2, Clock, AlertCircle, PanelRightClose, PanelRightOpen } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePanelVisibility } from "@/hooks/use-panel-visibility";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  startOfDay,
  endOfDay,
  startOfWeek as getWeekStart,
  endOfWeek as getWeekEnd,
  isBefore,
  isAfter,
} from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActivityForm } from "./ActivityForm";
import { useOrganization } from "@/contexts/OrganizationContext";

interface CalendarActivity {
  id: string;
  type: "task" | "event";
  title: string;
  date: string;
  case_id: string;
  status: string;
  assigned_user_id: string | null;
  due_date: string | null;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  color: string | null;
}

interface CaseCalendarProps {
  caseId?: string;
  filterCase?: string;
  filterUser?: string;
  filterUsers?: Set<string>;
  filterStatus?: string;
  onNeedCaseSelection?: (callback: (selectedCaseId: string) => void) => void;
  isClosedCase?: boolean;
  showTaskList?: boolean;
  onToggleTaskList?: () => void;
}

export const CaseCalendar = forwardRef<
  { triggerAddTask: () => void; triggerAddEvent: () => void },
  CaseCalendarProps
>(({ caseId, filterCase, filterUser, filterUsers, filterStatus: externalFilterStatus, onNeedCaseSelection, isClosedCase = false, showTaskList: externalShowTaskList, onToggleTaskList }, ref) => {
  const { organization } = useOrganization();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activities, setActivities] = useState<CalendarActivity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [internalFilterStatus, setInternalFilterStatus] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [activityType, setActivityType] = useState<"task" | "event">("task");
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>(caseId);
  const [taskListFilter, setTaskListFilter] = useState<string>("all");
  
  // Internal task list visibility state (used when parent doesn't control it)
  const { isVisible: internalShowTaskList, toggle: internalToggleTaskList } = usePanelVisibility(
    "calendar-task-list",
    true
  );
  
  // Use external props if provided, otherwise use internal state
  const showTaskList = externalShowTaskList !== undefined ? externalShowTaskList : internalShowTaskList;
  const toggleTaskList = onToggleTaskList || internalToggleTaskList;

  const filterStatus = externalFilterStatus || internalFilterStatus;

  // Refetch when organization changes
  useEffect(() => {
    if (organization?.id) {
      fetchData();
    }
  }, [caseId, filterCase, filterUser, filterUsers, filterStatus, organization?.id]);

  const fetchData = async () => {
    if (!organization?.id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const orgId = organization.id;

      // Build query for tasks - filter by selected organization
      let tasksQuery = supabase
        .from("case_activities")
        .select("id, title, due_date, case_id, status, assigned_user_id, activity_type")
        .eq("organization_id", orgId)
        .eq("activity_type", "task")
        .not("due_date", "is", null);

      // Build query for events - filter by selected organization
      let eventsQuery = supabase
        .from("case_activities")
        .select("id, title, due_date, case_id, status, assigned_user_id, activity_type")
        .eq("organization_id", orgId)
        .eq("activity_type", "event")
        .not("due_date", "is", null);

      // Filter by case if caseId or filterCase is provided
      const activeCaseFilter = caseId || (filterCase && filterCase !== "all" ? filterCase : null);
      if (activeCaseFilter) {
        tasksQuery = tasksQuery.eq("case_id", activeCaseFilter);
        eventsQuery = eventsQuery.eq("case_id", activeCaseFilter);
      }

      // Apply user filter - support both single user (filterUser) and multiple users (filterUsers)
      const activeUserFilter = filterUsers?.size 
        ? Array.from(filterUsers) 
        : (filterUser && filterUser !== "all" ? [filterUser] : null);
      
      if (activeUserFilter && activeUserFilter.length > 0) {
        tasksQuery = tasksQuery.in("assigned_user_id", activeUserFilter);
        eventsQuery = eventsQuery.in("assigned_user_id", activeUserFilter);
      }

      // Apply status filter
      if (filterStatus && filterStatus !== "all") {
        tasksQuery = tasksQuery.eq("status", filterStatus);
        eventsQuery = eventsQuery.eq("status", filterStatus);
      }

      // Get organization users for profiles
      const { data: orgMembers } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", orgId);
      const orgUserIds = orgMembers?.map(m => m.user_id) || [];

      const [tasksResult, eventsResult, usersResult] = await Promise.all([
        tasksQuery,
        eventsQuery,
        orgUserIds.length > 0 
          ? supabase.from("profiles").select("id, email, full_name, color").in("id", orgUserIds)
          : supabase.from("profiles").select("id, email, full_name, color").eq("id", user.id),
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (eventsResult.error) throw eventsResult.error;
      if (usersResult.error) throw usersResult.error;

      setUsers(usersResult.data || []);
      const currentUserData = usersResult.data?.find(u => u.id === user.id);
      setCurrentUser(currentUserData || null);

      // Combine tasks and events
      const allActivities: CalendarActivity[] = [
        ...(tasksResult.data || []).map(task => ({
          id: task.id,
          type: "task" as const,
          title: task.title,
          date: task.due_date!,
          case_id: task.case_id,
          status: task.status,
          assigned_user_id: task.assigned_user_id,
          due_date: task.due_date,
        })),
        ...(eventsResult.data || []).map(event => ({
          id: event.id,
          type: "event" as const,
          title: event.title,
          date: event.due_date!,
          case_id: event.case_id,
          status: event.status,
          assigned_user_id: event.assigned_user_id,
          due_date: event.due_date,
        })),
      ];

      setActivities(allActivities);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
      toast({
        title: "Error",
        description: "Failed to load calendar data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCalendarDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  };

  // Only show EVENTS in calendar grid
  const getEventsForDay = (date: Date) => {
    return activities.filter(activity => {
      const activityDate = new Date(activity.date);
      return activity.type === "event" && isSameDay(activityDate, date);
    });
  };

  const getUserColor = (userId: string | null) => {
    if (!userId) return "#6366f1";
    const user = users.find(u => u.id === userId);
    return user?.color || "#6366f1";
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const user = users.find(u => u.id === userId);
    return user?.full_name || user?.email || "Unknown";
  };

  const getUserInitials = (userId: string | null) => {
    const name = getUserName(userId);
    if (!name || name === "Unassigned" || name === "Unknown") return null;
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusIcon = (status: string, isPast: boolean) => {
    if (status === "completed" || status === "done") return "✅";
    if (isPast && status !== "completed" && status !== "done") return "🕒";
    if (status === "blocked") return "🚫";
    if (status === "cancelled") return "❌";
    return "🔜";
  };

  const handleDayClick = (day: Date) => {
    setCreateDate(day);
    
    // If no caseId, we need to ask user to select a case
    if (!caseId && onNeedCaseSelection) {
      onNeedCaseSelection((selectedCase: string) => {
        setSelectedCaseId(selectedCase);
        setCreateDialogOpen(true);
      });
    } else {
      setSelectedCaseId(caseId);
      setCreateDialogOpen(true);
    }
  };

  const handleActivityClick = async (activity: CalendarActivity) => {
    try {
      // Fetch full activity details
      const { data, error } = await supabase
        .from("case_activities")
        .select("*")
        .eq("id", activity.id)
        .single();

      if (error) throw error;

      if (data) {
        setEditingActivity(data);
        setSelectedCaseId(data.case_id);
        setActivityType(data.activity_type as "task" | "event");
        setActivityFormOpen(true);
      }
    } catch (error) {
      console.error("Error fetching activity details:", error);
      toast({
        title: "Error",
        description: "Failed to load activity details",
        variant: "destructive",
      });
    }
  };

  const handleCreateTask = () => {
    setEditingActivity(null);
    setActivityType("task");
    setCreateDialogOpen(false);
    setActivityFormOpen(true);
  };

  const handleCreateEvent = () => {
    setEditingActivity(null);
    setActivityType("event");
    setCreateDialogOpen(false);
    setActivityFormOpen(true);
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    triggerAddTask: () => {
      if (!caseId && onNeedCaseSelection) {
        onNeedCaseSelection((selectedCase: string) => {
          setSelectedCaseId(selectedCase);
          setEditingActivity(null);
          setActivityType("task");
          setActivityFormOpen(true);
        });
      } else {
        setSelectedCaseId(caseId);
        setEditingActivity(null);
        setActivityType("task");
        setActivityFormOpen(true);
      }
    },
    triggerAddEvent: () => {
      if (!caseId && onNeedCaseSelection) {
        onNeedCaseSelection((selectedCase: string) => {
          setSelectedCaseId(selectedCase);
          setEditingActivity(null);
          setActivityType("event");
          setActivityFormOpen(true);
        });
      } else {
        setSelectedCaseId(caseId);
        setEditingActivity(null);
        setActivityType("event");
        setActivityFormOpen(true);
      }
    },
  }));

  const handleToggleTaskComplete = async (activity: CalendarActivity) => {
    try {
      const newStatus = activity.status === "done" ? "to_do" : "done";
      
      const { error } = await supabase
        .from('case_activities')
        .update({ 
          status: newStatus,
          completed: newStatus === "done",
          completed_at: newStatus === "done" ? new Date().toISOString() : null
        })
        .eq('id', activity.id);

      if (error) throw error;

      // Refresh the calendar data
      fetchData();

      toast({
        title: "Success",
        description: `Task ${newStatus === "done" ? "completed" : "reopened"}`,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  // Filter tasks for the sidebar (only tasks, not events)
  const getFilteredTasks = () => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = getWeekStart(now);
    const weekEnd = getWeekEnd(now);

    return activities.filter(activity => {
      // Only show tasks, not events
      if (activity.type !== "task") return false;
      
      const activityDate = activity.date ? new Date(activity.date) : null;
      
      // Apply time-based filter
      switch (taskListFilter) {
        case "today":
          if (!activityDate || !isSameDay(activityDate, now)) return false;
          break;
        case "week":
          if (!activityDate || isBefore(activityDate, weekStart) || isAfter(activityDate, weekEnd)) return false;
          break;
        case "me":
          if (activity.assigned_user_id !== currentUser?.id) return false;
          break;
        // "all" - no additional filter
      }
      
      return true;
    }).sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });
  };

  const calendarDays = getCalendarDays();

  if (loading) {
    return <CalendarTabSkeleton />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <ActivityForm
        open={activityFormOpen}
        onOpenChange={(open) => {
          setActivityFormOpen(open);
          if (!open) {
            setEditingActivity(null);
          }
        }}
        caseId={selectedCaseId || ""}
        editingActivity={editingActivity}
        onSuccess={() => {
          setActivityFormOpen(false);
          setEditingActivity(null);
          fetchData();
        }}
        activityType={activityType}
        users={users}
        prefilledDate={createDate || undefined}
      />

      {/* Create Activity Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Create Activity for {createDate && format(createDate, "MMMM d, yyyy")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Button
              onClick={handleCreateTask}
              className="w-full justify-start h-auto py-4"
              variant="outline"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                  <Plus className="h-5 w-5 text-blue-700" />
                </div>
                <div className="text-left">
                  <div className="font-medium">New Task</div>
                  <div className="text-sm text-muted-foreground">
                    Create a task with due date on this day
                  </div>
                </div>
              </div>
            </Button>

            <Button
              onClick={handleCreateEvent}
              className="w-full justify-start h-auto py-4"
              variant="outline"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center shrink-0">
                  <Plus className="h-5 w-5 text-green-700" />
                </div>
                <div className="text-left">
                  <div className="font-medium">New Event</div>
                  <div className="text-sm text-muted-foreground">
                    Schedule an event on this day
                  </div>
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calendar View - Left Side */}
      <div className="flex-1 space-y-4">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Calendar</h2>
            <p className="text-muted-foreground">Events and activities timeline</p>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between bg-card border rounded-lg p-4">
          <Button
            variant="outline"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h3 className="text-xl font-semibold">
            {format(currentDate, "MMMM yyyy")}
          </h3>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              onClick={toggleTaskList}
              title={showTaskList ? "Hide task list" : "Show task list"}
              className="hidden lg:flex"
            >
              {showTaskList ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Calendar Grid - EVENTS ONLY */}
        <div className="border rounded-lg overflow-hidden bg-card">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isDayToday = isToday(day);

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-[100px] border-b border-r p-2 cursor-pointer hover:bg-muted/50 transition-colors relative group ${
                    !isCurrentMonth ? "bg-muted/20 text-muted-foreground" : ""
                  } ${isDayToday ? "bg-primary/5 ring-1 ring-primary/20" : ""}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-sm font-medium ${isDayToday ? "text-primary font-bold" : ""}`}>
                      {format(day, "d")}
                    </div>
                    <Plus className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                  </div>

                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(event => {
                      const userColor = getUserColor(event.assigned_user_id);
                      return (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivityClick(event);
                          }}
                          className="text-xs rounded px-2 py-1 truncate cursor-pointer hover:opacity-80 transition-opacity border-l-2"
                          style={{
                            backgroundColor: `${userColor}20`,
                            borderLeftColor: userColor,
                            color: userColor
                          }}
                          title={`${event.title} - ${getUserName(event.assigned_user_id)}`}
                        >
                          📅 {event.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground px-1.5">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* User Legend */}
        <div className="flex flex-wrap gap-2 p-4 bg-card border rounded-lg">
          <div className="text-sm font-medium mr-2">Team:</div>
          {users.map(user => (
            <div key={user.id} className="flex items-center gap-2 text-xs bg-muted/50 px-2 py-1 rounded">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: user.color || "#6366f1" }}
              />
              <span>{user.full_name || user.email}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Task List - Right Side */}
      {showTaskList && (
      <div className="w-full lg:w-96 border rounded-lg bg-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg mb-3">Tasks</h3>
          
          {/* Task List Filters */}
          <Select value={taskListFilter} onValueChange={setTaskListFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter tasks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="me">Assigned to Me</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
          {getFilteredTasks().length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No tasks found
            </p>
          ) : (
            getFilteredTasks().map(activity => {
              const userColor = getUserColor(activity.assigned_user_id);
              const activityDate = activity.date ? new Date(activity.date) : null;
              const isPast = activityDate && isBefore(activityDate, new Date());
              const statusIcon = getStatusIcon(activity.status, isPast);
              
              return (
                <div
                  key={activity.id}
                  className="p-3 border rounded hover:bg-muted/50 transition-colors"
                  style={{ borderLeftWidth: '3px', borderLeftColor: userColor }}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={activity.status === "done"}
                      onCheckedChange={() => handleToggleTaskComplete(activity)}
                      disabled={isClosedCase}
                      className="mt-1"
                    />
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleActivityClick(activity)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-sm font-medium truncate flex-1 ${
                          activity.status === "done" ? "line-through text-muted-foreground" : ""
                        }`}>
                          {activity.title}
                        </p>
                      </div>
                      
                      {activityDate && (
                        <p className="text-xs text-muted-foreground mb-1">
                          {format(activityDate, "MMM d, yyyy")}
                          {isPast && activity.status !== "completed" && activity.status !== "done" && (
                            <span className="text-red-500 ml-2">⚠️ Overdue</span>
                          )}
                        </p>
                      )}
                      
                      <p className="text-xs font-medium" style={{ color: userColor }}>
                        {getUserName(activity.assigned_user_id)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      )}
    </div>
  );
});

CaseCalendar.displayName = "CaseCalendar";