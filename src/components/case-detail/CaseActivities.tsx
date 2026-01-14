import { useEffect, useState } from "react";
import { CaseTabSkeleton } from "./CaseTabSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Search, ShieldAlert, Download, CheckSquare, CalendarDays, Link } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportToCSV, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { ActivityForm } from "./ActivityForm";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { usePermissions } from "@/hooks/usePermissions";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { useSortPreference } from "@/hooks/use-sort-preference";
import { useBillingEligibility, BillingEligibilityResult } from "@/hooks/useBillingEligibility";
import { BillingPromptDialog } from "@/components/billing/BillingPromptDialog";
import { useBillingItemCreation } from "@/hooks/useBillingItemCreation";

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assigned_user_id: string | null;
  status: string;
  event_subtype: string | null;
  case_service_instance_id: string | null;
  service_name?: string;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface CaseActivitiesProps {
  caseId: string;
  isClosedCase?: boolean;
}

export function CaseActivities({ caseId, isClosedCase = false }: CaseActivitiesProps) {
  const { organization } = useOrganization();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<"task" | "event">("task");
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  
  // Billing eligibility state
  const [billingPromptOpen, setBillingPromptOpen] = useState(false);
  const [billingEligibility, setBillingEligibility] = useState<BillingEligibilityResult | null>(null);
  const { evaluate: evaluateBillingEligibility } = useBillingEligibility();
  const { createBillingItem, isCreating: isCreatingBillingItem } = useBillingItemCreation();

  // Separate state for tasks panel
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [taskFilterStatus, setTaskFilterStatus] = useState<string>("all");
  const { sortColumn: taskSortColumn, sortDirection: taskSortDirection, handleSort: handleTaskSort } = useSortPreference("case-activities-tasks", "due_date", "asc");

  // Separate state for events panel
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [eventFilterStatus, setEventFilterStatus] = useState<string>("all");
  const { sortColumn: eventSortColumn, sortDirection: eventSortDirection, handleSort: handleEventSort } = useSortPreference("case-activities-events", "due_date", "asc");

  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const canViewActivities = hasPermission("view_activities");
  const canAddActivities = hasPermission("add_activities");
  const canEditActivities = hasPermission("edit_activities");
  const canDeleteActivities = hasPermission("delete_activities");

  useEffect(() => {
    fetchUsers();
    fetchActivities();
  }, [caseId, organization?.id]);

  const fetchUsers = async () => {
    try {
      if (!organization?.id) return;

      const { data: orgMembers } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organization.id);

      if (!orgMembers) return;

      const userIds = orgMembers.map(m => m.user_id);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    }
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('case_activities')
        .select(`
          *,
          case_service_instances (
            case_services (
              name
            )
          )
        `)
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map the joined data to include service_name
      const activitiesWithService = (data || []).map((activity: any) => ({
        ...activity,
        service_name: activity.case_service_instances?.case_services?.name || null,
      }));
      
      setActivities(activitiesWithService);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: "Error",
        description: "Failed to load activities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openForm = (type: "task" | "event") => {
    setFormType(type);
    setEditingActivity(null);
    setFormOpen(true);
  };

  const handleEdit = (activity: Activity) => {
    setFormType(activity.activity_type as "task" | "event");
    setEditingActivity(activity);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this activity?")) return;
    
    try {
      const { error } = await supabase
        .from('case_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setActivities(activities.filter(a => a.id !== id));
      toast({
        title: "Success",
        description: "Activity deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast({
        title: "Error",
        description: "Failed to delete activity",
        variant: "destructive",
      });
    }
  };

  const handleToggleComplete = async (activity: Activity, type: "task" | "event") => {
    try {
      const newStatus = type === "task" 
        ? (activity.status === "done" ? "to_do" : "done")
        : (activity.status === "completed" ? "scheduled" : "completed");
      
      const isCompleting = newStatus === "done" || newStatus === "completed";
      
      const { error } = await supabase
        .from('case_activities')
        .update({ 
          status: newStatus,
          completed: isCompleting,
          completed_at: isCompleting ? new Date().toISOString() : null
        })
        .eq('id', activity.id);

      if (error) throw error;

      setActivities(activities.map(a => 
        a.id === activity.id 
          ? { 
              ...a, 
              status: newStatus, 
              completed: isCompleting,
              completed_at: isCompleting ? new Date().toISOString() : null
            }
          : a
      ));

      toast({
        title: "Success",
        description: `${type === "task" ? "Task" : "Event"} updated successfully`,
      });

      // Check billing eligibility if completing and has service instance
      // NOTE: Billing moved to Updates - Events no longer trigger billing prompts
      // Only trigger billing prompt for TASKS, not events
      if (isCompleting && activity.case_service_instance_id && type === "task") {
        const eligibility = await evaluateBillingEligibility({
          activityId: activity.id,
          caseServiceInstanceId: activity.case_service_instance_id,
        });
        
        if (eligibility.isEligible) {
          setBillingEligibility(eligibility);
          setBillingPromptOpen(true);
        }
      }
      // Events (type === "event") billing is now handled via the Updates workflow
    } catch (error) {
      console.error('Error updating activity:', error);
      toast({
        title: "Error",
        description: `Failed to update ${type === "task" ? "task" : "event"}`,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done":
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "blocked":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "scheduled":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "to_do":
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return "-";
    const user = users.find(u => u.id === userId);
    return user?.full_name || user?.email || "-";
  };

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    if (dateStr.length === 10 && dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return format(new Date(year, month - 1, day), "MMM dd, yyyy");
    }
    return format(new Date(dateStr), "MMM dd, yyyy");
  };

  // Split activities into tasks and events
  const allTasks = activities.filter(a => a.activity_type === 'task');
  const allEvents = activities.filter(a => a.activity_type === 'event');

  // Filter and sort tasks
  const filteredTasks = allTasks
    .filter(activity => {
      const matchesSearch =
        activity.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
        activity.description?.toLowerCase().includes(taskSearchQuery.toLowerCase());
      const matchesStatus = taskFilterStatus === "all" || activity.status === taskFilterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (!taskSortColumn) return 0;
      let aVal: any, bVal: any;
      switch (taskSortColumn) {
        case "title": aVal = a.title; bVal = b.title; break;
        case "status": aVal = a.status; bVal = b.status; break;
        case "due_date":
          aVal = a.due_date ? new Date(a.due_date).getTime() : 0;
          bVal = b.due_date ? new Date(b.due_date).getTime() : 0;
          break;
        default: return 0;
      }
      if (aVal == null) return taskSortDirection === "asc" ? 1 : -1;
      if (bVal == null) return taskSortDirection === "asc" ? -1 : 1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return taskSortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return taskSortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });

  // Filter and sort events
  const filteredEvents = allEvents
    .filter(activity => {
      const matchesSearch =
        activity.title.toLowerCase().includes(eventSearchQuery.toLowerCase()) ||
        activity.description?.toLowerCase().includes(eventSearchQuery.toLowerCase());
      const matchesStatus = eventFilterStatus === "all" || activity.status === eventFilterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (!eventSortColumn) return 0;
      let aVal: any, bVal: any;
      switch (eventSortColumn) {
        case "title": aVal = a.title; bVal = b.title; break;
        case "status": aVal = a.status; bVal = b.status; break;
        case "event_subtype": aVal = a.event_subtype || ''; bVal = b.event_subtype || ''; break;
        case "due_date":
          aVal = a.due_date ? new Date(a.due_date).getTime() : 0;
          bVal = b.due_date ? new Date(b.due_date).getTime() : 0;
          break;
        default: return 0;
      }
      if (aVal == null) return eventSortDirection === "asc" ? 1 : -1;
      if (bVal == null) return eventSortDirection === "asc" ? -1 : 1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return eventSortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return eventSortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });

  const handleExport = (type: "task" | "event", format: "csv" | "pdf") => {
    const data = type === "task" ? filteredTasks : filteredEvents;
    const exportColumns: ExportColumn[] = [
      { key: "title", label: "Title" },
      { key: "service_name", label: "Linked Service", format: (v) => v || "-" },
      ...(type === "event" ? [{ key: "event_subtype", label: "Event Type", format: (v: any) => v || "-" }] : []),
      { key: "status", label: "Status", format: (v) => v?.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '-' },
      { key: "assigned_user_id", label: "Assigned To", format: (v) => getUserName(v) },
      { key: "due_date", label: "Due Date", format: (v) => formatDueDate(v) },
      { key: "description", label: "Description", format: (v) => v || "-" },
    ];
    
    if (format === "csv") {
      exportToCSV(data, exportColumns, `case-${type}s`);
    } else {
      exportToPDF(data, exportColumns, `Case ${type === "task" ? "Tasks" : "Events"}`, `case-${type}s`);
    }
  };

  if (permissionsLoading || loading) {
    return <CaseTabSkeleton title="Case Activities" subtitle="Loading activities..." rows={5} columns={5} />;
  }

  if (!canViewActivities) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground text-center">
            You don't have permission to view activities. Contact your administrator for access.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header with both Add buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Case Activities</h2>
            <p className="text-muted-foreground">
              {allTasks.length} task{allTasks.length !== 1 ? 's' : ''}, {allEvents.length} event{allEvents.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => openForm("task")} 
              disabled={!canAddActivities || isClosedCase}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
            <Button 
              onClick={() => openForm("event")} 
              disabled={!canAddActivities || isClosedCase}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>
        </div>

        {/* Side-by-side panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tasks Panel */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Tasks ({filteredTasks.length})
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport("task", "csv")}>
                      Export to CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("task", "pdf")}>
                      Export to PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Task filters */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <Select value={taskFilterStatus} onValueChange={setTaskFilterStatus}>
                  <SelectTrigger className="w-[120px] h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="to_do">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tasks table */}
              {filteredTasks.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-muted/50">
                  <CheckSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">
                    {taskSearchQuery || taskFilterStatus !== "all"
                      ? "No tasks match your filters"
                      : "No tasks yet"}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <th className="w-[40px] p-2"></th>
                        <SortableTableHead
                          column="title"
                          label="Title"
                          sortColumn={taskSortColumn}
                          sortDirection={taskSortDirection}
                          onSort={handleTaskSort}
                          className="min-w-[150px]"
                        />
                        <SortableTableHead
                          column="status"
                          label="Status"
                          sortColumn={taskSortColumn}
                          sortDirection={taskSortDirection}
                          onSort={handleTaskSort}
                          className="w-[100px]"
                        />
                        <SortableTableHead
                          column="due_date"
                          label="Due"
                          sortColumn={taskSortColumn}
                          sortDirection={taskSortDirection}
                          onSort={handleTaskSort}
                          className="w-[100px]"
                        />
                        <th className="w-[80px] p-2"></th>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="align-top">
                            <Checkbox
                              checked={task.status === "done"}
                              onCheckedChange={() => handleToggleComplete(task, "task")}
                              disabled={isClosedCase || !canEditActivities}
                            />
                          </TableCell>
                          <TableCell className="font-medium align-top">
                            <div className="flex flex-col gap-0.5">
                              <span 
                                className={`line-clamp-1 ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}
                                title={task.title}
                              >
                                {task.title}
                              </span>
                              {task.service_name && (
                                <span className="text-xs text-primary flex items-center gap-1" title={`Linked to: ${task.service_name}`}>
                                  <Link className="h-3 w-3" />
                                  {task.service_name}
                                </span>
                              )}
                              {task.description && !task.service_name && (
                                <span className="text-xs text-muted-foreground line-clamp-1" title={task.description}>
                                  {task.description}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge variant="outline" className={`${getStatusColor(task.status)} text-xs`}>
                              {getStatusLabel(task.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="align-top text-sm whitespace-nowrap">
                            {formatDueDate(task.due_date)}
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex gap-1">
                              {canEditActivities && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(task)}
                                  disabled={isClosedCase}
                                  className="h-7 w-7"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {canDeleteActivities && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(task.id)}
                                  disabled={isClosedCase}
                                  className="h-7 w-7"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Events Panel */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Events ({filteredEvents.length})
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport("event", "csv")}>
                      Export to CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("event", "pdf")}>
                      Export to PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Event filters */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search events..."
                    value={eventSearchQuery}
                    onChange={(e) => setEventSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <Select value={eventFilterStatus} onValueChange={setEventFilterStatus}>
                  <SelectTrigger className="w-[120px] h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Events table */}
              {filteredEvents.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-muted/50">
                  <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">
                    {eventSearchQuery || eventFilterStatus !== "all"
                      ? "No events match your filters"
                      : "No events yet"}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <th className="w-[40px] p-2"></th>
                        <SortableTableHead
                          column="title"
                          label="Title"
                          sortColumn={eventSortColumn}
                          sortDirection={eventSortDirection}
                          onSort={handleEventSort}
                          className="min-w-[150px]"
                        />
                        <SortableTableHead
                          column="event_subtype"
                          label="Type"
                          sortColumn={eventSortColumn}
                          sortDirection={eventSortDirection}
                          onSort={handleEventSort}
                          className="w-[90px]"
                        />
                        <SortableTableHead
                          column="status"
                          label="Status"
                          sortColumn={eventSortColumn}
                          sortDirection={eventSortDirection}
                          onSort={handleEventSort}
                          className="w-[100px]"
                        />
                        <SortableTableHead
                          column="due_date"
                          label="Date"
                          sortColumn={eventSortColumn}
                          sortDirection={eventSortDirection}
                          onSort={handleEventSort}
                          className="w-[100px]"
                        />
                        <th className="w-[80px] p-2"></th>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="align-top">
                            <Checkbox
                              checked={event.status === "completed"}
                              onCheckedChange={() => handleToggleComplete(event, "event")}
                              disabled={isClosedCase || !canEditActivities}
                            />
                          </TableCell>
                          <TableCell className="font-medium align-top">
                            <div className="flex flex-col gap-0.5">
                              <span 
                                className={`line-clamp-1 ${event.status === "completed" ? "line-through text-muted-foreground" : ""}`}
                                title={event.title}
                              >
                                {event.title}
                              </span>
                              {event.service_name && (
                                <span className="text-xs text-primary flex items-center gap-1" title={`Linked to: ${event.service_name}`}>
                                  <Link className="h-3 w-3" />
                                  {event.service_name}
                                </span>
                              )}
                              {event.description && !event.service_name && (
                                <span className="text-xs text-muted-foreground line-clamp-1" title={event.description}>
                                  {event.description}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            {event.event_subtype ? (
                              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                {event.event_subtype}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge variant="outline" className={`${getStatusColor(event.status)} text-xs`}>
                              {getStatusLabel(event.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="align-top text-sm whitespace-nowrap">
                            {formatDueDate(event.due_date)}
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex gap-1">
                              {canEditActivities && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(event)}
                                  disabled={isClosedCase}
                                  className="h-7 w-7"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {canDeleteActivities && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(event.id)}
                                  disabled={isClosedCase}
                                  className="h-7 w-7"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ActivityForm
        caseId={caseId}
        activityType={formType}
        users={users}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingActivity(null);
        }}
        onSuccess={() => {
          fetchActivities();
          setFormOpen(false);
          setEditingActivity(null);
        }}
        editingActivity={editingActivity}
        organizationId={organization?.id || ""}
      />

      <BillingPromptDialog
        open={billingPromptOpen}
        onOpenChange={(open) => {
          setBillingPromptOpen(open);
          if (!open) setBillingEligibility(null);
        }}
        eligibility={billingEligibility}
        onCreateBillingItem={async () => {
          if (!billingEligibility) return;
          
          const result = await createBillingItem({
            activityId: billingEligibility.activityId!,
            caseServiceInstanceId: billingEligibility.serviceInstanceId!,
            caseId: billingEligibility.caseId!,
            organizationId: billingEligibility.organizationId!,
            accountId: billingEligibility.accountId,
            serviceName: billingEligibility.serviceName!,
            pricingModel: billingEligibility.pricingModel!,
            quantity: billingEligibility.quantity!,
            rate: billingEligibility.serviceRate!,
            pricingProfileId: billingEligibility.pricingProfileId,
            pricingRuleSnapshot: billingEligibility.pricingRuleSnapshot,
          });
          
          if (result.success) {
            toast({
              title: "Billing Item Created",
              description: `Added ${billingEligibility.serviceName} to billing`,
            });
            if (result.budgetWarning?.isForecastWarning || result.budgetWarning?.isForecastExceeded) {
              toast({
                title: "Budget Warning",
                description: result.budgetWarning.isForecastExceeded 
                  ? "Budget forecast exceeded" 
                  : "Approaching budget limit",
                variant: "destructive",
              });
            }
          } else {
            toast({
              title: "Error",
              description: result.error || "Failed to create billing item",
              variant: "destructive",
            });
          }
          
          setBillingPromptOpen(false);
          setBillingEligibility(null);
          fetchActivities();
        }}
        onSkip={() => {
          setBillingPromptOpen(false);
          setBillingEligibility(null);
        }}
      />
    </>
  );
}
