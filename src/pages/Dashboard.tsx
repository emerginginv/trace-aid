import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users, Building2, TrendingUp, CheckCircle2, Calendar, Bell, DollarSign, Clock, AlertCircle, X, ChevronDown, ChevronUp, Wallet, Receipt, FileText } from "lucide-react";
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
import { useOrganization } from "@/contexts/OrganizationContext";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "completed";
  taskStatus: string;
  caseId: string;
  activityData: any;
  assignedUserId: string | null;
  assignedUserName: string | null;
}
interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  eventSubtype: string | null;
  eventStatus: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
  caseId: string;
  activityData: any;
}
interface Update {
  id: string;
  message: string;
  timestamp: string;
  type: "info" | "success" | "warning";
  updateType: string;
  authorId: string;
  authorName: string | null;
  caseId: string;
  updateData: any;
}
interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  userId: string;
  submittedByName: string | null;
  caseId: string;
  financeData: any;
}
const Dashboard = () => {
  const { toast } = useToast();
  const { isVendor, isAdmin, isManager, loading: roleLoading } = useUserRole();
  const { organization } = useOrganization();
  
  // Filter states for each container
  const [tasksFilter, setTasksFilter] = useState<'my' | 'all'>('my');
  const [eventsFilter, setEventsFilter] = useState<'my' | 'all'>('my');
  const [updatesFilter, setUpdatesFilter] = useState<'my' | 'all'>('my');
  const [expensesFilter, setExpensesFilter] = useState<'my' | 'all'>('my');
  
  const canViewAll = isAdmin || isManager;
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
  const [financialSummary, setFinancialSummary] = useState({
    totalRetainerFunds: 0,
    outstandingExpenses: 0,
    unpaidInvoices: 0
  });
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [updateTypePicklists, setUpdateTypePicklists] = useState<{value: string, color: string | null}[]>([]);

  useEffect(() => {
    if (!organization?.id) return;

    const fetchDashboardData = async () => {
      setIsDataLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const orgId = organization.id;

      // Fetch stats filtered by organization
      const [casesResult, contactsResult, accountsResult] = await Promise.all([
        supabase.from("cases").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("contacts").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("accounts").select("*", { count: "exact", head: true }).eq("organization_id", orgId)
      ]);

      // Fetch all cases to categorize by status_type
      const { data: allCases } = await supabase
        .from("cases")
        .select("status")
        .eq("organization_id", orgId);

      // Fetch status picklists filtered by organization
      const [statusPicklistsResult, updateTypePicklistsResult] = await Promise.all([
        supabase
          .from("picklists")
          .select("value, status_type")
          .eq("type", "case_status")
          .eq("is_active", true)
          .or(`organization_id.eq.${orgId},organization_id.is.null`),
        supabase
          .from("picklists")
          .select("value, color")
          .eq("type", "update_type")
          .eq("is_active", true)
          .or(`organization_id.eq.${orgId},organization_id.is.null`)
      ]);
      
      const statusPicklists = statusPicklistsResult.data;
      if (updateTypePicklistsResult.data) {
        setUpdateTypePicklists(updateTypePicklistsResult.data);
      }

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

      const activeCasesResult = await supabase
        .from("cases")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "open");

      setStats({
        totalCases: casesResult.count || 0,
        activeCases: activeCasesResult.count || 0,
        openCases: openCasesCount,
        closedCases: closedCasesCount,
        totalContacts: contactsResult.count || 0,
        totalAccounts: accountsResult.count || 0
      });

      // Fetch users for assignments filtered by organization (moved earlier for task mapping)
      const { data: orgUsers } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', (await supabase.from('organization_members').select('user_id').eq('organization_id', orgId)).data?.map(m => m.user_id) || []);

      if (orgUsers) {
        setUsers(orgUsers.map(u => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name
        })));
      }

      // Fetch tasks from case_activities (pending tasks only) filtered by organization
      let tasksQuery = supabase
        .from("case_activities")
        .select("*")
        .eq("organization_id", orgId)
        .eq("activity_type", "task")
        .eq("completed", false)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(50);

      // Apply user filter if "My Tasks" is selected
      if (tasksFilter === 'my') {
        tasksQuery = tasksQuery.or(`user_id.eq.${user.id},assigned_user_id.eq.${user.id}`);
      }

      const { data: activitiesData, error: tasksError } = await tasksQuery;

      if (activitiesData) {
        const tasksData: Task[] = activitiesData.map(activity => {
          const assignedUser = orgUsers?.find(u => u.id === activity.assigned_user_id);
          return {
            id: activity.id,
            title: activity.title,
            dueDate: activity.due_date || new Date().toISOString().split('T')[0],
            priority: activity.status === "urgent" ? "high" : activity.status === "in_progress" ? "medium" : "low",
            status: activity.completed ? "completed" : "pending",
            taskStatus: activity.status || "to_do",
            caseId: activity.case_id,
            activityData: activity,
            assignedUserId: activity.assigned_user_id,
            assignedUserName: assignedUser?.full_name || assignedUser?.email || null
          };
        });
        setTasks(tasksData);
      }

      // Fetch calendar events from case_activities (upcoming events in next 30 days) filtered by organization
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      let eventsQuery = supabase
        .from("case_activities")
        .select("*")
        .eq("organization_id", orgId)
        .eq("activity_type", "event")
        .not("due_date", "is", null)
        .gte("due_date", today.toISOString().split('T')[0])
        .lte("due_date", futureDate.toISOString().split('T')[0])
        .order("due_date", { ascending: true })
        .limit(50);

      // Apply user filter if "My Events" is selected
      if (eventsFilter === 'my') {
        eventsQuery = eventsQuery.or(`user_id.eq.${user.id},assigned_user_id.eq.${user.id}`);
      }

      const { data: eventsData } = await eventsQuery;

      if (eventsData) {
        const calendarEvents: CalendarEvent[] = eventsData.map(event => {
          // Find assigned user name from users array
          const assignedUser = orgUsers?.find(u => u.id === event.assigned_user_id);
          
          return {
            id: event.id,
            title: event.title,
            date: event.due_date,
            time: "All Day",
            type: event.activity_type || "event",
            eventSubtype: event.event_subtype,
            eventStatus: event.status || "to_do",
            assignedUserId: event.assigned_user_id,
            assignedUserName: assignedUser?.full_name || assignedUser?.email || null,
            caseId: event.case_id,
            activityData: event
          };
        });
        setEvents(calendarEvents);
      }

      // Fetch recent updates from case_updates filtered by organization
      let updatesQuery = supabase
        .from("case_updates")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(5);

      // Apply user filter if "My Updates" is selected
      if (updatesFilter === 'my') {
        updatesQuery = updatesQuery.eq("user_id", user.id);
      }

      const { data: updatesData } = await updatesQuery;

      if (updatesData) {
        const recentUpdates: Update[] = updatesData.map(update => {
          const author = orgUsers?.find(u => u.id === update.user_id);
          return {
            id: update.id,
            message: update.title || update.description || "Update",
            timestamp: update.created_at,
            type: update.update_type === "status_change" ? "warning" : "info",
            updateType: update.update_type || "general",
            authorId: update.user_id,
            authorName: author?.full_name || author?.email || null,
            caseId: update.case_id,
            updateData: update
          };
        });
        setUpdates(recentUpdates);
      }

      // Fetch recent expenses from case_finances filtered by organization
      let expensesQuery = supabase
        .from("case_finances")
        .select("*")
        .eq("organization_id", orgId)
        .eq("finance_type", "expense")
        .order("date", { ascending: false })
        .limit(5);

      // Apply user filter if "My Expenses" is selected
      if (expensesFilter === 'my') {
        expensesQuery = expensesQuery.eq("user_id", user.id);
      }

      const { data: expensesData } = await expensesQuery;

      if (expensesData) {
        const recentExpenses: Expense[] = expensesData.map(expense => {
          const submitter = orgUsers?.find(u => u.id === expense.user_id);
          return {
            id: expense.id,
            description: expense.description,
            amount: typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount || '0'),
            date: expense.date,
            category: expense.category || "General",
            userId: expense.user_id,
            submittedByName: submitter?.full_name || submitter?.email || null,
            caseId: expense.case_id,
            financeData: expense
          };
        });
        setExpenses(recentExpenses);
      }

      // Users already fetched earlier for task mapping

      // Fetch financial summary data
      const [retainerResult, pendingExpensesResult, unpaidInvoicesResult] = await Promise.all([
        supabase
          .from("retainer_funds")
          .select("amount")
          .eq("organization_id", orgId),
        supabase
          .from("case_finances")
          .select("amount")
          .eq("organization_id", orgId)
          .eq("finance_type", "expense")
          .eq("status", "pending"),
        supabase
          .from("invoices")
          .select("balance_due")
          .eq("organization_id", orgId)
          .gt("balance_due", 0)
      ]);

      const totalRetainer = retainerResult.data?.reduce((sum, r) => 
        sum + parseFloat(String(r.amount) || '0'), 0) || 0;
      const outstandingExpenses = pendingExpensesResult.data?.reduce((sum, e) => 
        sum + parseFloat(String(e.amount) || '0'), 0) || 0;
      const unpaidInvoicesTotal = unpaidInvoicesResult.data?.reduce((sum, i) => 
        sum + parseFloat(String(i.balance_due) || '0'), 0) || 0;

      setFinancialSummary({
        totalRetainerFunds: totalRetainer,
        outstandingExpenses: outstandingExpenses,
        unpaidInvoices: unpaidInvoicesTotal
      });
      setIsDataLoading(false);
    };

    fetchDashboardData();
  }, [organization?.id, tasksFilter, eventsFilter, updatesFilter, expensesFilter]);
  const handleTaskToggle = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === "completed" ? "pending" : "completed";
    const previousTasks = [...tasks];

    // Optimistic update - instant feedback
    setTasks(prev => prev.map(t => t.id === taskId ? {
      ...t,
      status: newStatus
    } : t));
    
    toast({
      title: newStatus === "completed" ? "Task completed!" : "Task reopened",
      description: task.title
    });

    // Update in database
    const {
      error
    } = await supabase.from("case_activities").update({
      completed: newStatus === "completed"
    }).eq("id", taskId);
    
    if (error) {
      // Rollback on error
      setTasks(previousTasks);
      toast({
        title: "Error",
        description: "Failed to update task. Change reverted.",
        variant: "destructive"
      });
    }
  };

  // Sort and filter tasks
  const dueTasks = tasks.filter(task => task.status === "pending").sort((a, b) => {
    const aOverdue = isPast(parseISO(a.dueDate)) && !isToday(parseISO(a.dueDate));
    const bOverdue = isPast(parseISO(b.dueDate)) && !isToday(parseISO(b.dueDate));
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  // Show all upcoming events (up to 30 days) sorted by date
  const upcomingEvents = events.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
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

  const getStatusDotDisplay = (status: string, type: 'task' | 'event' = 'task') => {
    switch (status) {
      case 'in_progress':
        return { label: 'In Progress', dotColor: 'bg-blue-500', textColor: 'text-blue-500' };
      case 'done':
      case 'completed':
        return { label: 'Done', dotColor: 'bg-emerald-500', textColor: 'text-emerald-500' };
      case 'scheduled':
        return { label: 'Scheduled', dotColor: 'bg-purple-500', textColor: 'text-purple-500' };
      case 'cancelled':
        return { label: 'Cancelled', dotColor: 'bg-red-500', textColor: 'text-red-500' };
      case 'on_hold':
        return { label: 'On Hold', dotColor: 'bg-orange-500', textColor: 'text-orange-500' };
      case 'to_do':
      default:
        if (type === 'event') {
          return { label: 'Scheduled', dotColor: 'bg-purple-500', textColor: 'text-purple-500' };
        }
        return { label: 'To Do', dotColor: 'bg-amber-500', textColor: 'text-amber-500' };
    }
  };

  const StatusDot = ({ status, type = 'task' }: { status: string; type?: 'task' | 'event' }) => {
    const { label, dotColor, textColor } = getStatusDotDisplay(status, type);
    return (
      <span className={`flex items-center gap-1.5 text-xs shrink-0 font-medium ${textColor}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} aria-hidden="true" />
        {label}
      </span>
    );
  };

  const UpdateTypeDot = ({ updateType }: { updateType: string }) => {
    const picklist = updateTypePicklists.find(p => p.value === updateType);
    const color = picklist?.color || '#6b7280';
    const label = updateType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    
    return (
      <span 
        className="flex items-center gap-1.5 text-xs shrink-0 font-medium"
        style={{ color }}
      >
        <span 
          className="w-1.5 h-1.5 rounded-full" 
          style={{ backgroundColor: color }}
          aria-hidden="true" 
        />
        {label}
      </span>
    );
  };

  const getUserInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
  // Show loading state while checking role or loading data
  if (roleLoading || isDataLoading) {
    return <DashboardSkeleton />;
  }

  // Show vendor dashboard if user is a vendor
  if (isVendor) {
    return <VendorDashboard />;
  }
  return <div className="space-y-6">
      {/* Header Section with Gradient Background */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-8 border border-border">
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

      {/* Stats Overview + Financial Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border border-border rounded-lg p-4">
        {/* Stats Cards - Left Half */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map(stat => {
            const Icon = stat.icon;
            return <Card key={stat.title} className="group hover-lift border-border bg-gradient-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 relative z-10">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-1.5 rounded-lg transition-transform group-hover:scale-110`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10 pb-3 px-3">
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>;
          })}
        </div>

        {/* Financial Summary Card - Right Half */}
        <Card className="border-border bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 shadow-lg h-full">
          <CardHeader className="pb-3 pt-3">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <Wallet className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-base font-semibold">Financial Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Retainer Funds */}
              <div className="p-3 rounded-xl bg-card/80 border border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Retainer Funds</span>
                </div>
                <p className="text-xl font-bold text-emerald-500">
                  ${financialSummary.totalRetainerFunds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              
              {/* Outstanding Expenses */}
              <div className="p-3 rounded-xl bg-card/80 border border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Outstanding Expenses</span>
                </div>
                <p className="text-xl font-bold text-amber-500">
                  ${financialSummary.outstandingExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              
              {/* Unpaid Invoices */}
              <div className="p-3 rounded-xl bg-card/80 border border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Unpaid Invoices</span>
                </div>
                <p className="text-xl font-bold text-blue-500">
                  ${financialSummary.unpaidInvoices.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Grid with Enhanced Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border border-border rounded-lg p-4">
        {/* Due Tasks */}
        <Card className="border-border bg-gradient-to-br from-card to-card/80 shadow-lg">
          <CardHeader className="pb-4 border-b border-border">
            <CardTitle className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <span className="text-lg font-semibold">Tasks</span>
              </div>
              <Select value={tasksFilter} onValueChange={(v) => setTasksFilter(v as 'my' | 'all')}>
                <SelectTrigger className="h-7 w-auto text-xs gap-1 px-2 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="my">My Tasks</SelectItem>
                  {canViewAll && <SelectItem value="all">All Tasks</SelectItem>}
                </SelectContent>
              </Select>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {dueTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No pending tasks</p>
                <p className="text-xs text-muted-foreground/70 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
                {dueTasks.map(task => {
                  const taskDate = parseISO(task.dueDate);
                  const isOverdue = isPast(taskDate) && !isToday(taskDate);
                  
                  return (
                    <div 
                      key={task.id} 
                      onClick={() => setEditingTask(task)} 
                      className="group flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/20 transition-all hover:shadow-sm cursor-pointer bg-muted/30 hover:bg-muted/50"
                    >
                      {/* Checkbox */}
                      <Checkbox 
                        checked={task.status === "completed"} 
                        onCheckedChange={() => handleTaskToggle(task.id)} 
                        onClick={e => e.stopPropagation()} 
                      />
                      
                      {/* Title - Primary anchor */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{task.title}</p>
                      </div>
                      
                      {/* Status Dot */}
                      <StatusDot status={task.taskStatus} type="task" />
                      
                      {/* Due Date */}
                      <span className={`flex items-center gap-1 text-xs shrink-0 ${
                        isOverdue ? 'text-destructive font-medium' : 
                        isToday(taskDate) ? 'text-warning' : 
                        'text-muted-foreground'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {isOverdue ? 'Overdue' : 
                         isToday(taskDate) ? 'Today' : 
                         format(taskDate, 'MMM d')}
                      </span>
                      
                      {/* Assigned User Avatar */}
                      {task.assignedUserName && (
                        <div 
                          className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0"
                          title={task.assignedUserName}
                        >
                          {getUserInitials(task.assignedUserName)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar Events */}
        <Card className="border-border bg-gradient-to-br from-card to-card/80 shadow-lg">
          <CardHeader className="pb-4 border-b border-border">
            <CardTitle className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <Calendar className="w-5 h-5 text-secondary" />
                </div>
                <span className="text-lg font-semibold">Events</span>
              </div>
              <Select value={eventsFilter} onValueChange={(v) => setEventsFilter(v as 'my' | 'all')}>
                <SelectTrigger className="h-7 w-auto text-xs gap-1 px-2 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="my">My Events</SelectItem>
                  {canViewAll && <SelectItem value="all">All Events</SelectItem>}
                </SelectContent>
              </Select>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No upcoming events</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Your calendar is clear</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
                {upcomingEvents.map(event => {
                  return (
                    <div 
                      key={event.id} 
                      className="group flex items-center gap-3 p-3 rounded-lg border border-border hover:border-secondary/20 transition-all hover:shadow-sm cursor-pointer bg-muted/30 hover:bg-muted/50" 
                      onClick={() => setEditingEvent(event)}
                    >
                      {/* Title - Primary anchor */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{event.title}</p>
                      </div>
                      
                      {/* Event Type Badge (if available) */}
                      {event.eventSubtype && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/10 text-secondary shrink-0">
                          {event.eventSubtype}
                        </span>
                      )}
                      
                      {/* Status Dot */}
                      <StatusDot status={event.eventStatus} type="event" />
                      
                      {/* Start Date */}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="w-3 h-3" />
                        {getEventDateLabel(event.date)}
                      </span>
                      
                      {/* Assigned User Avatar */}
                      {event.assignedUserName && (
                        <div 
                          className="w-6 h-6 rounded-full bg-secondary/10 text-secondary flex items-center justify-center text-xs font-medium shrink-0"
                          title={event.assignedUserName}
                        >
                          {getUserInitials(event.assignedUserName)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Updates */}
        <Card className="border-border bg-gradient-to-br from-card to-card/80 shadow-lg">
          <CardHeader className="pb-4 border-b border-border">
            <CardTitle className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <span className="text-lg font-semibold">Updates</span>
              </div>
              <Select value={updatesFilter} onValueChange={(v) => setUpdatesFilter(v as 'my' | 'all')}>
                <SelectTrigger className="h-7 w-auto text-xs gap-1 px-2 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="my">My Updates</SelectItem>
                  {canViewAll && <SelectItem value="all">All Updates</SelectItem>}
                </SelectContent>
              </Select>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {updates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <Bell className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No recent updates</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Updates will appear here</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
                {updates.map(update => {
                  return (
                    <div 
                      key={update.id} 
                      onClick={() => setEditingUpdate(update)} 
                      className="group flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/20 transition-all hover:shadow-sm cursor-pointer bg-muted/30 hover:bg-muted/50"
                    >
                      {/* Title - Primary anchor */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{update.message}</p>
                      </div>
                      
                      {/* Update Type with colored dot */}
                      <UpdateTypeDot updateType={update.updateType} />
                      
                      {/* Date Added */}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(parseISO(update.timestamp), { addSuffix: true })}
                      </span>
                      
                      {/* Author Avatar */}
                      {update.authorName && (
                        <div 
                          className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0"
                          title={update.authorName}
                        >
                          {getUserInitials(update.authorName)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card className="border-border bg-gradient-to-br from-card to-card/80 shadow-lg">
          <CardHeader className="pb-4 border-b border-border">
            <CardTitle className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-warning/10">
                  <DollarSign className="w-5 h-5 text-warning" />
                </div>
                <span className="text-lg font-semibold">Expenses</span>
              </div>
              <Select value={expensesFilter} onValueChange={(v) => setExpensesFilter(v as 'my' | 'all')}>
                <SelectTrigger className="h-7 w-auto text-xs gap-1 px-2 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="my">My Expenses</SelectItem>
                  {canViewAll && <SelectItem value="all">All Expenses</SelectItem>}
                </SelectContent>
              </Select>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <DollarSign className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No recent expenses</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Expenses will appear here</p>
              </div>
            ) : (
              <>
                <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
                  {expenses.map(expense => (
                    <div 
                      key={expense.id} 
                      onClick={() => setEditingExpense(expense)} 
                      className="group flex items-center gap-3 p-3 rounded-lg border border-border hover:border-warning/20 transition-all hover:shadow-sm cursor-pointer bg-muted/30 hover:bg-muted/50"
                    >
                      {/* Description - Primary anchor */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{expense.description}</p>
                      </div>
                      
                      {/* Category Badge */}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0 capitalize">
                        {expense.category}
                      </span>
                      
                      {/* Amount - Emphasized */}
                      <span className="font-semibold text-sm text-warning shrink-0">
                        ${expense.amount.toFixed(2)}
                      </span>
                      
                      {/* Date Added */}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(expense.date), "MMM d")}
                      </span>
                      
                      {/* Submitted By Avatar */}
                      {expense.submittedByName && (
                        <div 
                          className="w-6 h-6 rounded-full bg-warning/10 text-warning flex items-center justify-center text-xs font-medium shrink-0"
                          title={expense.submittedByName}
                        >
                          {getUserInitials(expense.submittedByName)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Total Expenses Footer */}
                <div className="pt-3 mt-3 border-t border-border/50 bg-muted/20 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-foreground">Total Expenses</span>
                    <span className="text-xl font-bold text-warning">
                      ${expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Forms */}
      {editingTask && <ActivityForm caseId={editingTask.caseId} activityType="task" users={users} open={!!editingTask} onOpenChange={open => !open && setEditingTask(null)} onSuccess={() => {
      setEditingTask(null);
      window.location.reload();
    }} editingActivity={editingTask.activityData} organizationId={organization?.id || ""} />}

      {editingEvent && <ActivityForm caseId={editingEvent.caseId} activityType="event" users={users} open={!!editingEvent} onOpenChange={open => !open && setEditingEvent(null)} onSuccess={() => {
      setEditingEvent(null);
      window.location.reload();
    }} editingActivity={editingEvent.activityData} organizationId={organization?.id || ""} />}

      {editingUpdate && <UpdateForm caseId={editingUpdate.caseId} open={!!editingUpdate} onOpenChange={open => !open && setEditingUpdate(null)} onSuccess={() => {
      setEditingUpdate(null);
      window.location.reload();
    }} editingUpdate={editingUpdate.updateData} organizationId={organization?.id || ""} />}

      {editingExpense && <FinanceForm caseId={editingExpense.caseId} open={!!editingExpense} onOpenChange={open => !open && setEditingExpense(null)} onSuccess={() => {
      setEditingExpense(null);
      window.location.reload();
    }} editingFinance={editingExpense.financeData} organizationId={organization?.id || ""} />}

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