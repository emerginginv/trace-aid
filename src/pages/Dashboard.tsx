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

// Dummy data
const mockTasks: Task[] = [
  { id: "1", title: "Follow up with witness interview", dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), priority: "high", status: "pending" },
  { id: "2", title: "Submit evidence to client", dueDate: new Date().toISOString(), priority: "high", status: "pending" },
  { id: "3", title: "Review case documentation", dueDate: new Date().toISOString(), priority: "medium", status: "pending" },
  { id: "4", title: "Update case notes", dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), priority: "low", status: "pending" },
];

const mockEvents: CalendarEvent[] = [
  { id: "1", title: "Client meeting - Johnson Case", date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), time: "10:00 AM", type: "meeting" },
  { id: "2", title: "Court appearance", date: new Date().toISOString(), time: "2:00 PM", type: "court" },
  { id: "3", title: "Evidence review session", date: new Date().toISOString(), time: "4:30 PM", type: "review" },
  { id: "4", title: "Witness interview", date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), time: "9:00 AM", type: "interview" },
];

const mockUpdates: Update[] = [
  { id: "1", message: "New evidence uploaded to Case #2024-001", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), type: "info" },
  { id: "2", message: "Payment received for Invoice #INV-2024-042", timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), type: "success" },
  { id: "3", message: "Case status updated: Johnson Investigation", timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), type: "info" },
  { id: "4", message: "Upcoming deadline in 2 days", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), type: "warning" },
];

const mockExpenses: Expense[] = [
  { id: "1", description: "Background check service", amount: 150.00, date: new Date().toISOString(), category: "Services" },
  { id: "2", description: "Court filing fees", amount: 325.00, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), category: "Legal" },
  { id: "3", description: "Document printing", amount: 45.50, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), category: "Office" },
  { id: "4", description: "Mileage reimbursement", amount: 87.20, date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), category: "Travel" },
];

const Dashboard = () => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [expandedUpdate, setExpandedUpdate] = useState<string | null>(null);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  
  const [stats, setStats] = useState({
    totalCases: 0,
    activeCases: 0,
    totalContacts: 0,
    totalAccounts: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [casesResult, contactsResult, accountsResult] = await Promise.all([
        supabase.from("cases").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("contacts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("accounts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      const activeCasesResult = await supabase
        .from("cases")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "open");

      setStats({
        totalCases: casesResult.count || 0,
        activeCases: activeCasesResult.count || 0,
        totalContacts: contactsResult.count || 0,
        totalAccounts: accountsResult.count || 0,
      });
    };

    fetchStats();
  }, []);

  const handleTaskToggle = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, status: task.status === "completed" ? "pending" : "completed" }
        : task
    ));
    
    const task = tasks.find(t => t.id === taskId);
    toast({
      title: task?.status === "pending" ? "Task completed!" : "Task reopened",
      description: task?.title,
    });
  };

  // Sort and filter tasks
  const dueTasks = tasks
    .filter(task => task.status === "pending")
    .sort((a, b) => {
      const aOverdue = isPast(parseISO(a.dueDate)) && !isToday(parseISO(a.dueDate));
      const bOverdue = isPast(parseISO(b.dueDate)) && !isToday(parseISO(b.dueDate));
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  // Filter events for today, yesterday, tomorrow
  const relevantEvents = mockEvents
    .filter(event => {
      const eventDate = parseISO(event.date);
      return isYesterday(eventDate) || isToday(eventDate) || isTomorrow(eventDate);
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getEventDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM dd");
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "default";
    }
  };

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "warning": return <AlertCircle className="w-4 h-4 text-warning" />;
      default: return <Bell className="w-4 h-4 text-info" />;
    }
  };

  const statCards = [
    {
      title: "Active Cases",
      value: stats.activeCases,
      icon: Briefcase,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Cases",
      value: stats.totalCases,
      icon: TrendingUp,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Accounts",
      value: stats.totalAccounts,
      icon: Building2,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Contacts",
      value: stats.totalContacts,
      icon: Users,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's an overview of your day.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Due Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Due Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dueTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending tasks</p>
            ) : (
              dueTasks.map((task) => {
                const taskDate = parseISO(task.dueDate);
                const isOverdue = isPast(taskDate) && !isToday(taskDate);
                
                return (
                  <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <Checkbox 
                      checked={task.status === "completed"}
                      onCheckedChange={() => handleTaskToggle(task.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{task.title}</p>
                        <Badge variant={getPriorityColor(task.priority) as any} className="text-xs">
                          {task.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {isOverdue ? (
                          <span className="flex items-center gap-1 text-destructive font-medium">
                            <AlertCircle className="w-3 h-3" />
                            Overdue by {formatDistanceToNow(taskDate)}
                          </span>
                        ) : isToday(taskDate) ? (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Due today
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Due {formatDistanceToNow(taskDate, { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Calendar Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {relevantEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            ) : (
              relevantEvents.map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-sm">{event.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {getEventDateLabel(event.date)}
                      </Badge>
                      <span>{event.time}</span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Updates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Recent Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockUpdates.map((update) => (
              <div key={update.id} className="rounded-lg border bg-card">
                <div 
                  className="flex items-start gap-3 p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setExpandedUpdate(expandedUpdate === update.id ? null : update.id)}
                >
                  <div className="mt-0.5">
                    {getUpdateIcon(update.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">{update.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(parseISO(update.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                  {expandedUpdate === update.id ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                {expandedUpdate === update.id && (
                  <div className="px-3 pb-3 text-sm text-muted-foreground border-t pt-3 mt-2">
                    <p className="font-medium mb-2">Update Details:</p>
                    <div className="space-y-1">
                      <p>Type: <Badge variant="outline">{update.type}</Badge></p>
                      <p>Time: {format(parseISO(update.timestamp), "PPpp")}</p>
                      <p>Status: Active</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Recent Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockExpenses.map((expense) => (
              <div key={expense.id} className="rounded-lg border bg-card">
                <div 
                  className="flex items-start justify-between gap-3 p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setExpandedExpense(expandedExpense === expense.id ? null : expense.id)}
                >
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-sm">{expense.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {expense.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(parseISO(expense.date), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-sm">
                      ${expense.amount.toFixed(2)}
                    </div>
                    {expandedExpense === expense.id ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                {expandedExpense === expense.id && (
                  <div className="px-3 pb-3 text-sm text-muted-foreground border-t pt-3 mt-2">
                    <p className="font-medium mb-2">Expense Details:</p>
                    <div className="space-y-1">
                      <p>Amount: <span className="font-semibold text-foreground">${expense.amount.toFixed(2)}</span></p>
                      <p>Category: <Badge variant="outline">{expense.category}</Badge></p>
                      <p>Date: {format(parseISO(expense.date), "PPP")}</p>
                      <p>Status: Recorded</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total</span>
                <span className="text-lg font-bold">
                  ${mockExpenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
            <DialogDescription>
              {selectedEvent && getEventDateLabel(selectedEvent.date)} at {selectedEvent?.time}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
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
                    description: "Edit functionality would be implemented here",
                  });
                  setSelectedEvent(null);
                }}>
                  Edit Event
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;