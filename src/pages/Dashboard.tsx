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
import { ActivityForm } from "@/components/case-detail/ActivityForm";
import { UpdateForm } from "@/components/case-detail/UpdateForm";
import { FinanceForm } from "@/components/case-detail/FinanceForm";
interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "completed";
  caseId: string;
  activityData: any;
}
interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  caseId: string;
  activityData: any;
}
interface Update {
  id: string;
  message: string;
  timestamp: string;
  type: "info" | "success" | "warning";
  caseId: string;
  updateData: any;
}
interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  caseId: string;
  financeData: any;
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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingUpdate, setEditingUpdate] = useState<Update | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [users, setUsers] = useState<any[]>([]);
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
      } = await supabase.from("case_activities").select("*, cases!inner(id)").eq("user_id", user.id).not("due_date", "is", null).order("due_date", {
        ascending: true
      }).limit(10);
      if (activitiesData) {
        const tasksData: Task[] = activitiesData.map(activity => ({
          id: activity.id,
          title: activity.title,
          dueDate: activity.due_date,
          priority: activity.status === "urgent" ? "high" : activity.status === "in_progress" ? "medium" : "low",
          status: activity.completed ? "completed" : "pending",
          caseId: activity.case_id,
          activityData: activity
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
      } = await supabase.from("case_activities").select("*, cases!inner(id)").eq("user_id", user.id).not("due_date", "is", null).gte("due_date", yesterday.toISOString().split('T')[0]).lte("due_date", tomorrow.toISOString().split('T')[0]).order("due_date", {
        ascending: true
      });
      if (eventsData) {
        const calendarEvents: CalendarEvent[] = eventsData.map(event => ({
          id: event.id,
          title: event.title,
          date: event.due_date,
          time: "All Day",
          type: event.activity_type || "task",
          caseId: event.case_id,
          activityData: event
        }));
        setEvents(calendarEvents);
      }

      // Fetch recent updates from case_updates
      const {
        data: updatesData
      } = await supabase.from("case_updates").select("*").eq("user_id", user.id).order("created_at", {
        ascending: false
      }).limit(5);
      if (updatesData) {
        const recentUpdates: Update[] = updatesData.map(update => ({
          id: update.id,
          message: update.title || update.description || "Update",
          timestamp: update.created_at,
          type: update.update_type === "status_change" ? "warning" : "info",
          caseId: update.case_id,
          updateData: update
        }));
        setUpdates(recentUpdates);
      }

      // Fetch recent expenses from case_finances
      const {
        data: expensesData
      } = await supabase.from("case_finances").select("*").eq("user_id", user.id).eq("finance_type", "expense").order("date", {
        ascending: false
      }).limit(5);
      if (expensesData) {
        const recentExpenses: Expense[] = expensesData.map(expense => ({
          id: expense.id,
          description: expense.description,
          amount: typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount || '0'),
          date: expense.date,
          category: expense.category || "General",
          caseId: expense.case_id,
          financeData: expense
        }));
        setExpenses(recentExpenses);
      }

      // Fetch users for assignments
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (orgMember) {
        const { data: orgUsers } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', 
            (await supabase
              .from('organization_members')
              .select('user_id')
              .eq('organization_id', orgMember.organization_id)
            ).data?.map(m => m.user_id) || []
          );

        if (orgUsers) {
          setUsers(orgUsers.map(u => ({
            id: u.id,
            email: u.email,
            full_name: u.full_name
          })));
        }
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
  return <div className="space-y-6">
      {/* Header Section with Gradient Background */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-8 border border-border/50">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here's an overview of your day.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-0" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-3xl -z-0" />
      </div>

      {/* Stats Overview with Modern Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(stat => {
        const Icon = stat.icon;
        return <Card key={stat.title} className="group hover-lift border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2.5 rounded-lg transition-transform group-hover:scale-110`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>;
      })}
      </div>

      {/* Main Dashboard Grid with Enhanced Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Due Tasks */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/80 shadow-lg">
          <CardHeader className="pb-4 border-b border-border/50">
            <CardTitle className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <span className="text-lg font-semibold">Due Tasks</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {dueTasks.length === 0 ? 
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No pending tasks</p>
                <p className="text-xs text-muted-foreground/70 mt-1">You're all caught up!</p>
              </div>
            : dueTasks.map(task => {
            const taskDate = parseISO(task.dueDate);
            const isOverdue = isPast(taskDate) && !isToday(taskDate);
            return <div 
                    key={task.id} 
                    className="group flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-accent/30 hover:border-primary/20 transition-all hover:shadow-md cursor-pointer"
                    onClick={() => setEditingTask(task)}
                  >
                    <Checkbox 
                      checked={task.status === "completed"} 
                      onCheckedChange={() => handleTaskToggle(task.id)} 
                      className="mt-1" 
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm leading-tight">{task.title}</p>
                        <Badge variant={getPriorityColor(task.priority) as any} className="text-xs shrink-0">
                          {task.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {isOverdue ? 
                          <span className="flex items-center gap-1.5 text-destructive font-medium bg-destructive/10 px-2 py-1 rounded-md">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Overdue by {formatDistanceToNow(taskDate)}
                          </span> 
                        : isToday(taskDate) ? 
                          <span className="flex items-center gap-1.5 text-warning bg-warning/10 px-2 py-1 rounded-md">
                            <Clock className="w-3.5 h-3.5" />
                            Due today
                          </span> 
                        : <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            Due {formatDistanceToNow(taskDate, { addSuffix: true })}
                          </span>
                        }
                      </div>
                    </div>
                  </div>;
          })}
          </CardContent>
        </Card>

        {/* Calendar Events */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/80 shadow-lg">
          <CardHeader className="pb-4 border-b border-border/50">
            <CardTitle className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Calendar className="w-5 h-5 text-secondary" />
              </div>
              <span className="text-lg font-semibold">Upcoming Events</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {relevantEvents.length === 0 ? 
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No upcoming events</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Your calendar is clear</p>
              </div>
            : relevantEvents.map(event => 
              <div 
                key={event.id} 
                className="group flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-accent/30 hover:border-secondary/20 transition-all cursor-pointer hover:shadow-md" 
                onClick={() => setEditingEvent(event)}
              >
                <div className="flex-1 space-y-2">
                  <p className="font-medium text-sm leading-tight group-hover:text-primary transition-colors">
                    {event.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="bg-secondary/10 border-secondary/20 text-secondary">
                      {getEventDateLabel(event.date)}
                    </Badge>
                    <span className="text-muted-foreground">{event.time}</span>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Updates */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/80 shadow-lg">
          <CardHeader className="pb-4 border-b border-border/50">
            <CardTitle className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-info-50">
                <Bell className="w-5 h-5 text-info-500" />
              </div>
              <span className="text-lg font-semibold">Recent Updates</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {updates.length === 0 ? 
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <Bell className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No recent updates</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Updates will appear here</p>
              </div>
            : updates.map(update => 
              <div key={update.id} className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                <div 
                  onClick={() => setEditingUpdate(update)} 
                  className="flex items-start gap-3 p-4 hover:bg-accent/30 transition-colors cursor-pointer"
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-background">
                    {getUpdateIcon(update.type)}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <p className="text-sm font-medium leading-tight">{update.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(parseISO(update.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                  {expandedUpdate === update.id ? 
                    <ChevronUp className="w-4 h-4 text-muted-foreground mt-1" /> : 
                    <ChevronDown className="w-4 h-4 text-muted-foreground mt-1" />
                  }
                </div>
                {expandedUpdate === update.id && 
                  <div className="px-4 pb-4 text-sm border-t border-border/50 pt-4 bg-muted/30">
                    <p className="font-semibold mb-3 text-foreground">Update Details</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <Badge variant="outline" className="capitalize">{update.type}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Time:</span>
                        <span className="text-xs">{format(parseISO(update.timestamp), "PPpp")}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">Active</Badge>
                      </div>
                    </div>
                  </div>
                }
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/80 shadow-lg">
          <CardHeader className="pb-4 border-b border-border/50">
            <CardTitle className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-warning/10">
                <DollarSign className="w-5 h-5 text-warning" />
              </div>
              <span className="text-lg font-semibold">Recent Expenses</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {expenses.length === 0 ? 
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <DollarSign className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No recent expenses</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Expenses will appear here</p>
              </div>
            : <>
                {expenses.map(expense => 
                  <div key={expense.id} className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                    <div 
                      onClick={() => setEditingExpense(expense)} 
                      className="flex items-start gap-3 p-4 hover:bg-accent/30 transition-colors cursor-pointer"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium text-sm leading-tight flex-1">{expense.description}</p>
                          <p className="font-bold text-base text-warning shrink-0">
                            ${expense.amount.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="outline" className="bg-primary/5 border-primary/20">
                            {expense.category}
                          </Badge>
                          <span className="text-muted-foreground">
                            {format(parseISO(expense.date), "MMM dd, yyyy")}
                          </span>
                        </div>
                      </div>
                      {expandedExpense === expense.id ? 
                        <ChevronUp className="w-4 h-4 text-muted-foreground mt-1" /> : 
                        <ChevronDown className="w-4 h-4 text-muted-foreground mt-1" />
                      }
                    </div>
                    {expandedExpense === expense.id && 
                      <div className="px-4 pb-4 text-sm border-t border-border/50 pt-4 bg-muted/30">
                        <p className="font-semibold mb-3 text-foreground">Expense Details</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Amount:</span>
                            <span className="font-bold text-warning">${expense.amount.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Category:</span>
                            <Badge variant="outline" className="capitalize">{expense.category}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span className="text-xs">{format(parseISO(expense.date), "PPP")}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20">Recorded</Badge>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                )}
                <div className="pt-3 mt-3 border-t border-border/50 bg-muted/20 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-foreground">Total Expenses</span>
                    <span className="text-xl font-bold text-warning">
                      ${expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </>
            }
          </CardContent>
        </Card>
      </div>

      {/* Edit Forms */}
      {editingTask && (
        <ActivityForm
          caseId={editingTask.caseId}
          activityType="task"
          users={users}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          onSuccess={() => {
            setEditingTask(null);
            window.location.reload();
          }}
          editingActivity={editingTask.activityData}
        />
      )}

      {editingEvent && (
        <ActivityForm
          caseId={editingEvent.caseId}
          activityType="event"
          users={users}
          open={!!editingEvent}
          onOpenChange={(open) => !open && setEditingEvent(null)}
          onSuccess={() => {
            setEditingEvent(null);
            window.location.reload();
          }}
          editingActivity={editingEvent.activityData}
        />
      )}

      {editingUpdate && (
        <UpdateForm
          caseId={editingUpdate.caseId}
          open={!!editingUpdate}
          onOpenChange={(open) => !open && setEditingUpdate(null)}
          onSuccess={() => {
            setEditingUpdate(null);
            window.location.reload();
          }}
          editingUpdate={editingUpdate.updateData}
        />
      )}

      {editingExpense && (
        <FinanceForm
          caseId={editingExpense.caseId}
          open={!!editingExpense}
          onOpenChange={(open) => !open && setEditingExpense(null)}
          onSuccess={() => {
            setEditingExpense(null);
            window.location.reload();
          }}
          editingFinance={editingExpense.financeData}
        />
      )}

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