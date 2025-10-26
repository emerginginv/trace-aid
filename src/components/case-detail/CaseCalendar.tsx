import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
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
} from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActivityForm } from "./ActivityForm";

interface CalendarActivity {
  id: string;
  type: "task" | "event";
  title: string;
  date: string;
  case_id: string;
  status: string;
  assigned_user_id: string | null;
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
  filterStatus?: string;
  onNeedCaseSelection?: (callback: (selectedCaseId: string) => void) => void;
  isClosedCase?: boolean;
}

export function CaseCalendar({ caseId, filterCase, filterUser, filterStatus: externalFilterStatus, onNeedCaseSelection, isClosedCase = false }: CaseCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activities, setActivities] = useState<CalendarActivity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [internalFilterStatus, setInternalFilterStatus] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [activityType, setActivityType] = useState<"task" | "event">("task");
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>(caseId);

  const filterStatus = externalFilterStatus || internalFilterStatus;

  useEffect(() => {
    fetchData();
  }, [caseId]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Build query for tasks
      let tasksQuery = supabase
        .from("case_activities")
        .select("id, title, due_date, case_id, status, assigned_user_id, activity_type")
        .eq("user_id", user.id)
        .eq("activity_type", "task")
        .not("due_date", "is", null);

      // Build query for events
      let eventsQuery = supabase
        .from("case_activities")
        .select("id, title, due_date, case_id, status, assigned_user_id, activity_type")
        .eq("user_id", user.id)
        .eq("activity_type", "event")
        .not("due_date", "is", null);

      // Filter by case if caseId or filterCase is provided
      const activeCaseFilter = caseId || (filterCase && filterCase !== "all" ? filterCase : null);
      if (activeCaseFilter) {
        tasksQuery = tasksQuery.eq("case_id", activeCaseFilter);
        eventsQuery = eventsQuery.eq("case_id", activeCaseFilter);
      }

      const [tasksResult, eventsResult, usersResult] = await Promise.all([
        tasksQuery,
        eventsQuery,
        supabase.from("profiles").select("id, email, full_name"),
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (eventsResult.error) throw eventsResult.error;
      if (usersResult.error) throw usersResult.error;

      setUsers(usersResult.data || []);

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
        })),
        ...(eventsResult.data || []).map(event => ({
          id: event.id,
          type: "event" as const,
          title: event.title,
          date: event.due_date!,
          case_id: event.case_id,
          status: event.status,
          assigned_user_id: event.assigned_user_id,
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

  const getActivitiesForDay = (date: Date) => {
    return activities.filter(activity => {
      const activityDate = new Date(activity.date);
      const matchesDate = isSameDay(activityDate, date);
      const matchesStatus = filterStatus === "all" || activity.status === filterStatus;
      const matchesUser = !filterUser || filterUser === "all" || activity.assigned_user_id === filterUser;
      
      return matchesDate && matchesStatus && matchesUser;
    });
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return null;
    const user = users.find(u => u.id === userId);
    return user?.full_name || user?.email || null;
  };

  const getUserInitials = (userId: string | null) => {
    const name = getUserName(userId);
    if (!name) return null;
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getActivityColor = (activity: CalendarActivity) => {
    // Cancelled/blocked tasks - red
    if (activity.status === "cancelled" || activity.status === "blocked") {
      return "bg-red-50 text-red-700 border-red-200 line-through";
    }
    // Completed/done - faded
    if (activity.status === "done" || activity.status === "completed") {
      return activity.type === "task"
        ? "bg-blue-50/50 text-blue-600/60 border-blue-200/50 line-through"
        : "bg-green-50/50 text-green-600/60 border-green-200/50 line-through";
    }
    // Active items - normal colors
    return activity.type === "task"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-green-50 text-green-700 border-green-200";
  };

  const handleDayClick = (day: Date, event: React.MouseEvent) => {
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

  const handleActivityClick = async (activity: CalendarActivity, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent day click handler
    
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
        setSelectedCaseId(data.case_id); // Use the case_id from the activity
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

  const calendarDays = getCalendarDays();

  if (loading) {
    return <div className="p-4">Loading calendar...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filter by Status - only show when caseId is provided and no external filter */}
      {caseId && !externalFilterStatus && (
        <div className="flex gap-3">
          <Select value={internalFilterStatus} onValueChange={setInternalFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="to_do">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Calendar Header */}
      <div className="flex items-center justify-between bg-card border rounded-lg p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-xl font-semibold">
          {format(currentDate, "MMMM yyyy")}
        </h2>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
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
            const dayActivities = getActivitiesForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={idx}
                onClick={(e) => handleDayClick(day, e)}
                className={`min-h-[120px] border-b border-r p-2 cursor-pointer hover:bg-muted/50 transition-colors relative group ${
                  !isCurrentMonth ? "bg-muted/20 text-muted-foreground" : ""
                } ${isToday ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}>
                    {format(day, "d")}
                  </div>
                  <Plus className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                </div>

                <div className="space-y-1">
                  {dayActivities.slice(0, 3).map(activity => (
                    <div
                      key={activity.id}
                      onClick={(e) => handleActivityClick(activity, e)}
                      className={`text-xs rounded px-1.5 py-0.5 truncate cursor-pointer hover:opacity-80 transition-opacity ${getActivityColor(activity)}`}
                      title={`Click to view details: ${activity.title}`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="truncate flex-1">{activity.title}</span>
                        {activity.assigned_user_id && (
                          <span className="text-[10px] font-medium bg-white/50 px-1 rounded shrink-0">
                            {getUserInitials(activity.assigned_user_id)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {dayActivities.length > 3 && (
                    <div className="text-xs text-muted-foreground px-1.5">
                      +{dayActivities.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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

      {/* Activity Form */}
      {selectedCaseId && (
        <ActivityForm
          caseId={selectedCaseId}
          activityType={activityType}
          users={users}
          open={activityFormOpen}
          onOpenChange={(open) => {
            setActivityFormOpen(open);
            if (!open) {
              setEditingActivity(null);
              setCreateDate(null);
              setSelectedCaseId(caseId); // Reset to prop caseId
            }
          }}
          onSuccess={() => {
            fetchData();
            setActivityFormOpen(false);
            setEditingActivity(null);
            setCreateDate(null);
            setSelectedCaseId(caseId); // Reset to prop caseId
          }}
          editingActivity={editingActivity}
          prefilledDate={createDate || undefined}
        />
      )}
    </div>
  );
}
