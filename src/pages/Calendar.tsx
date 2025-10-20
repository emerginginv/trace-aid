import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CalendarActivity {
  id: string;
  type: "task" | "event";
  title: string;
  date: string;
  case_id: string;
  status: string;
  assigned_user_id: string | null;
  case_title?: string;
}

interface Case {
  id: string;
  title: string;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activities, setActivities] = useState<CalendarActivity[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterCase, setFilterCase] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all cases
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select("id, title")
        .eq("user_id", user.id);

      if (casesError) throw casesError;
      setCases(casesData || []);

      // Fetch all tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("case_activities")
        .select("id, title, due_date, case_id, status, assigned_user_id, activity_type")
        .eq("user_id", user.id)
        .eq("activity_type", "task")
        .not("due_date", "is", null);

      if (tasksError) throw tasksError;

      // Fetch all events
      const { data: eventsData, error: eventsError } = await supabase
        .from("case_activities")
        .select("id, title, due_date, case_id, status, assigned_user_id, activity_type")
        .eq("user_id", user.id)
        .eq("activity_type", "event")
        .not("due_date", "is", null);

      if (eventsError) throw eventsError;

      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, email, full_name");

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Combine tasks and events
      const allActivities: CalendarActivity[] = [
        ...(tasksData || []).map(task => ({
          id: task.id,
          type: "task" as const,
          title: task.title,
          date: task.due_date!,
          case_id: task.case_id,
          status: task.status,
          assigned_user_id: task.assigned_user_id,
        })),
        ...(eventsData || []).map(event => ({
          id: event.id,
          type: "event" as const,
          title: event.title,
          date: event.due_date!,
          case_id: event.case_id,
          status: event.status,
          assigned_user_id: event.assigned_user_id,
        })),
      ];

      // Add case titles
      const activitiesWithCases = allActivities.map(activity => ({
        ...activity,
        case_title: casesData?.find(c => c.id === activity.case_id)?.title,
      }));

      setActivities(activitiesWithCases);
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
      const matchesCase = filterCase === "all" || activity.case_id === filterCase;
      const matchesUser = filterUser === "all" || activity.assigned_user_id === filterUser;
      const matchesType = filterType === "all" || activity.type === filterType;
      
      return matchesDate && matchesCase && matchesUser && matchesType;
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

  const calendarDays = getCalendarDays();
  const selectedDayActivities = selectedDate ? getActivitiesForDay(selectedDate) : [];

  if (loading) {
    return <div className="p-8">Loading calendar...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground mt-1">
            View all tasks and events across cases
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterCase} onValueChange={setFilterCase}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Cases" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cases</SelectItem>
            {cases.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {users.map(u => (
              <SelectItem key={u.id} value={u.id}>
                {u.full_name || u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="task">Tasks</SelectItem>
            <SelectItem value="event">Events</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
                onClick={() => setSelectedDate(day)}
                className={`min-h-[120px] border-b border-r p-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                  !isCurrentMonth ? "bg-muted/20 text-muted-foreground" : ""
                } ${isToday ? "bg-primary/5" : ""}`}
              >
                <div className={`text-sm font-medium mb-2 ${isToday ? "text-primary" : ""}`}>
                  {format(day, "d")}
                </div>

                <div className="space-y-1">
                  {dayActivities.slice(0, 3).map(activity => (
                    <div
                      key={activity.id}
                      className={`text-xs rounded px-1.5 py-0.5 truncate ${
                        activity.type === "task"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-green-50 text-green-700 border border-green-200"
                      }`}
                      title={`${activity.title} - ${activity.case_title}`}
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

      {/* Day Detail Modal */}
      <Dialog open={selectedDate !== null} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, "MMMM d, yyyy")}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            {selectedDayActivities.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No activities scheduled for this day
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDayActivities.map(activity => (
                  <div
                    key={activity.id}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={
                              activity.type === "task"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-green-50 text-green-700 border-green-200"
                            }
                          >
                            {activity.type === "task" ? "Task" : "Event"}
                          </Badge>
                          <Badge variant="outline">{activity.status.replace('_', ' ')}</Badge>
                        </div>
                        <h4 className="font-medium">{activity.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Case: {activity.case_title}
                        </p>
                        {activity.assigned_user_id && (
                          <p className="text-sm text-muted-foreground">
                            Assigned to: {getUserName(activity.assigned_user_id)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
