import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users, Building2, TrendingUp, CheckCircle2, Calendar, Bell, DollarSign, Clock, AlertCircle, X, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatDistanceToNow, format, isToday, isYesterday, isTomorrow, isPast, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import VendorDashboard from "./VendorDashboard";
interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "completed";
}
interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
}
interface Update {
  id: string;
  message: string;
  timestamp: string;
  type: "info" | "success" | "warning";
}
interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}
const Dashboard = () => {
  const {
    toast
  } = useToast();
  const {
    isVendor,
    loading: roleLoading
  } = useUserRole();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [expandedUpdate, setExpandedUpdate] = useState<string | null>(null);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalCases: 0,
    activeCases: 0,
    openCases: 0,
    closedCases: 0,
    totalContacts: 0,
    totalAccounts: 0
  });
  useEffect(() => {
    const fetchDashboardData = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch stats
      const [casesResult, contactsResult, accountsResult] = await Promise.all([supabase.from("cases").select("*", {
        count: "exact",
        head: true
      }).eq("user_id", user.id), supabase.from("contacts").select("*", {
        count: "exact",
        head: true
      }).eq("user_id", user.id), supabase.from("accounts").select("*", {
        count: "exact",
        head: true
      }).eq("user_id", user.id)]);
      
      // Fetch all cases to categorize by status_type
      const { data: allCases } = await supabase
        .from("cases")
        .select("status")
        .eq("user_id", user.id);

      // Fetch status picklists to get status_type
      const { data: statusPicklists } = await supabase
        .from("picklists")
        .select("value, status_type")
        .eq("user_id", user.id)
        .eq("type", "case_status")
        .eq("is_active", true);

      let openCasesCount = 0;
      let closedCasesCount = 0;

      if (allCases && statusPicklists) {
        allCases.forEach(caseItem => {
          const statusPicklist = statusPicklists.find(s => s.value === caseItem.status);
          if (statusPicklist?.status_type === "open") {
            openCasesCount++;
          } else if (statusPicklist?.status_type === "closed") {
            closedCasesCount++;
          }
        });
      }

      const activeCasesResult = await supabase.from("cases").select("*", {
        count: "exact",
        head: true
      }).eq("user_id", user.id).eq("status", "open");
      
      setStats({
        totalCases: casesResult.count || 0,
        activeCases: activeCasesResult.count || 0,
        openCases: openCasesCount,
        closedCases: closedCasesCount,
        totalContacts: contactsResult.count || 0,
        totalAccounts: accountsResult.count || 0
      });

      // Fetch tasks from case_activities
      const {
        data: activitiesData
      } = await supabase.from("case_activities").select("id, title, due_date, status, completed, description").eq("user_id", user.id).not("due_date", "is", null).order("due_date", {
        ascending: true
      }).limit(10);
      if (activitiesData) {
        const tasksData: Task[] = activitiesData.map(activity => ({
          id: activity.id,
          title: activity.title,
          dueDate: activity.due_date,
          priority: activity.status === "urgent" ? "high" : activity.status === "in_progress" ? "medium" : "low",
          status: activity.completed ? "completed" : "pending"
        }));
        setTasks(tasksData);
      }

      // Fetch calendar events from case_activities with future dates
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const {
        data: eventsData
      } = await supabase.from("case_activities").select("id, title, due_date, activity_type").eq("user_id", user.id).not("due_date", "is", null).gte("due_date", yesterday.toISOString().split('T')[0]).lte("due_date", tomorrow.toISOString().split('T')[0]).order("due_date", {
        ascending: true
      });
      if (eventsData) {
        const calendarEvents: CalendarEvent[] = eventsData.map(event => ({
          id: event.id,
          title: event.title,
          date: event.due_date,
          time: "All Day",
          type: event.activity_type || "task"
        }));
        setEvents(calendarEvents);
      }

      // Fetch recent updates from case_updates
      const {
        data: updatesData
      } = await supabase.from("case_updates").select("id, title, description, created_at, update_type").eq("user_id", user.id).order("created_at", {
        ascending: false
      }).limit(5);
      if (updatesData) {
        const recentUpdates: Update[] = updatesData.map(update => ({
          id: update.id,
          message: update.title || update.description || "Update",
          timestamp: update.created_at,
          type: update.update_type === "status_change" ? "warning" : "info"
        }));
        setUpdates(recentUpdates);
      }

      // Fetch recent expenses from case_finances
      const {
        data: expensesData
      } = await supabase.from("case_finances").select("id, description, amount, date, category").eq("user_id", user.id).eq("finance_type", "expense").order("date", {
        ascending: false
      }).limit(5);
      if (expensesData) {
        const recentExpenses: Expense[] = expensesData.map(expense => ({
          id: expense.id,
          description: expense.description,
          amount: typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount || '0'),
          date: expense.date,
          category: expense.category || "General"
        }));
        setExpenses(recentExpenses);
      }
    };
    fetchDashboardData();
  }, []);
  const handleTaskToggle = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === "completed" ? "pending" : "completed";

    // Update in database
    const {
      error
    } = await supabase.from("case_activities").update({
      completed: newStatus === "completed"
    }).eq("id", taskId);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive"
      });
      return;
    }

    // Update local state
    setTasks(prev => prev.map(t => t.id === taskId ? {
      ...t,
      status: newStatus
    } : t));
    toast({
      title: newStatus === "completed" ? "Task completed!" : "Task reopened",
      description: task.title
    });
  };

  // Sort and filter tasks
  const dueTasks = tasks.filter(task => task.status === "pending").sort((a, b) => {
    const aOverdue = isPast(parseISO(a.dueDate)) && !isToday(parseISO(a.dueDate));
    const bOverdue = isPast(parseISO(b.dueDate)) && !isToday(parseISO(b.dueDate));
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  // Filter events for today, yesterday, tomorrow
  const relevantEvents = events.filter(event => {
    const eventDate = parseISO(event.date);
    return isYesterday(eventDate) || isToday(eventDate) || isTomorrow(eventDate);
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const getEventDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM dd");
  };
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };
  const getUpdateIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-warning" />;
      default:
        return <Bell className="w-4 h-4 text-info" />;
    }
  };
  const statCards = [{
    title: "Open Cases",
    value: stats.openCases,
    icon: Briefcase,
    color: "text-primary",
    bgColor: "bg-primary/10"
  }, {
    title: "Closed Cases",
    value: stats.closedCases,
    icon: CheckCircle2,
    color: "text-success",
    bgColor: "bg-success/10"
  }, {
    title: "Total Cases",
    value: stats.totalCases,
    icon: TrendingUp,
    color: "text-secondary",
    bgColor: "bg-secondary/10"
  }, {
    title: "Accounts",
    value: stats.totalAccounts,
    icon: Building2,
    color: "text-accent",
    bgColor: "bg-accent/10"
  }];
  // Show loading state while checking role
  if (roleLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>;
  }

  // Show vendor dashboard if user is a vendor
  if (isVendor) {
    return <VendorDashboard />;
  }
  return <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
          Welcome back! Here's an overview of your day.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {statCards.map(stat => {
        const Icon = stat.icon;
        return <Card key={stat.title} className="rounded bg-transparent">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="bg-transparent">
                <div className="text-3xl font-bold bg-transparent">{stat.value}</div>
              </CardContent>
            </Card>;
      })}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        {/* Due Tasks */}
        <Card className="rounded bg-transparent">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Due Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
            {dueTasks.length === 0 ? <p className="text-sm text-muted-foreground">No pending tasks</p> : dueTasks.map(task => {
            const taskDate = parseISO(task.dueDate);
            const isOverdue = isPast(taskDate) && !isToday(taskDate);
            return <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border transition-colors bg-slate-600">
                    <Checkbox checked={task.status === "completed"} onCheckedChange={() => handleTaskToggle(task.id)} className="mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-slate-50">{task.title}</p>
                        <Badge variant={getPriorityColor(task.priority) as any} className="text-xs">
                          {task.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {isOverdue ? <span className="flex items-center gap-1 text-destructive font-medium">
                            <AlertCircle className="w-3 h-3" />
                            Overdue by {formatDistanceToNow(taskDate)}
                          </span> : isToday(taskDate) ? <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Due today
                          </span> : <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Due {formatDistanceToNow(taskDate, {
                      addSuffix: true
                    })}
                          </span>}
                      </div>
                    </div>
                  </div>;
          })}
          </CardContent>
        </Card>

        {/* Calendar Events */}
        <Card className="bg-transparent">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
            {relevantEvents.length === 0 ? <p className="text-sm text-muted-foreground bg-gray-300">No upcoming events</p> : relevantEvents.map(event => <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setSelectedEvent(event)}>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-sm text-gray-800">{event.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs bg-blue-700">
                        {getEventDateLabel(event.date)}
                      </Badge>
                      <span className="text-gray-800">{event.time}</span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>)}
          </CardContent>
        </Card>

        {/* Recent Updates */}
        <Card className="bg-transparent">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Recent Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
            {updates.length === 0 ? <p className="text-sm text-muted-foreground">No recent updates</p> : updates.map(update => <div key={update.id} className="rounded-lg border bg-card">
                  <div onClick={() => setExpandedUpdate(expandedUpdate === update.id ? null : update.id)} className="flex items-start gap-3 p-3 transition-colors cursor-pointer bg-zinc-300 rounded-sm">
                    <div className="mt-0.5">
                      {getUpdateIcon(update.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm text-gray-800">{update.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(parseISO(update.timestamp), {
                    addSuffix: true
                  })}
                      </p>
                    </div>
                    {expandedUpdate === update.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  {expandedUpdate === update.id && <div className="px-3 pb-3 text-sm text-muted-foreground border-t pt-3 mt-2">
                      <p className="font-medium mb-2">Update Details:</p>
                      <div className="space-y-1">
                        <p>Type: <Badge variant="outline">{update.type}</Badge></p>
                        <p>Time: {format(parseISO(update.timestamp), "PPpp")}</p>
                        <p>Status: Active</p>
                      </div>
                    </div>}
                </div>)}
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card className="bg-transparent">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Recent Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
            {expenses.length === 0 ? <p className="text-sm text-muted-foreground">No recent expenses</p> : <>
                {expenses.map(expense => <div key={expense.id} className="rounded-lg border bg-card">
                    <div onClick={() => setExpandedExpense(expandedExpense === expense.id ? null : expense.id)} className="flex items-start justify-between gap-3 p-3 transition-colors cursor-pointer bg-gray-300 rounded-sm">
                      <div className="flex-1 space-y-1">
                        <p className="font-medium text-sm text-gray-800">{expense.description}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs bg-green-600">
                            {expense.category}
                          </Badge>
                          <span className="text-xs text-blue-700">
                            {formatDistanceToNow(parseISO(expense.date), {
                        addSuffix: true
                      })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-sm bg-transparent">
                          ${expense.amount.toFixed(2)}
                        </div>
                        {expandedExpense === expense.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                    {expandedExpense === expense.id && <div className="px-3 pb-3 text-sm text-muted-foreground border-t pt-3 mt-2">
                        <p className="font-medium mb-2">Expense Details:</p>
                        <div className="space-y-1">
                          <p>Amount: <span className="font-semibold text-foreground">${expense.amount.toFixed(2)}</span></p>
                          <p>Category: <Badge variant="outline">{expense.category}</Badge></p>
                          <p>Date: {format(parseISO(expense.date), "PPP")}</p>
                          <p>Status: Recorded</p>
                        </div>
                      </div>}
                  </div>)}
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-lg font-bold">
                      ${expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </>}
          </CardContent>
        </Card>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={open => !open && setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
            <DialogDescription>
              {selectedEvent && getEventDateLabel(selectedEvent.date)} at {selectedEvent?.time}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">{selectedEvent.title}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{format(parseISO(selectedEvent.date), "PPPP")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedEvent.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedEvent.type}</Badge>
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Additional details about this event would appear here. This could include location, participants, related case information, and any notes or attachments.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                  Close
                </Button>
                <Button onClick={() => {
              toast({
                title: "Event action",
                description: "Edit functionality would be implemented here"
              });
              setSelectedEvent(null);
            }}>
                  Edit Event
                </Button>
              </div>
            </div>}
        </DialogContent>
      </Dialog>
    </div>;
};
export default Dashboard;