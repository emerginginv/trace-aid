import { useEffect, useState } from "react";
import { CaseTabSkeleton } from "./CaseTabSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Search, ShieldAlert, Download, CheckSquare, CalendarDays, Link, Zap, Clock, List } from "lucide-react";
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
import { QuickBillDialog } from "@/components/billing/QuickBillDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  due_date: string | null;
  start_time: string | null;
  end_time: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assigned_user_id: string | null;
  status: string;
  event_subtype: string | null;
  case_service_instance_id: string | null;
  service_name?: string;
  is_scheduled?: boolean; // Computed column from Phase 1
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

// View filter types for unified display
type ViewFilter = "all" | "scheduled" | "unscheduled";

export function CaseActivities({ caseId, isClosedCase = false }: CaseActivitiesProps) {
  const { organization } = useOrganization();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<"task" | "event">("task");
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  
  // Phase 3: Unified view filter
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  
  // Billing eligibility state
  const [billingPromptOpen, setBillingPromptOpen] = useState(false);
  const [billingEligibility, setBillingEligibility] = useState<BillingEligibilityResult | null>(null);
  const { evaluate: evaluateBillingEligibility } = useBillingEligibility();
  const { createBillingItem, isCreating: isCreatingBillingItem } = useBillingItemCreation();

  // Quick Bill state
  const [quickBillDialogOpen, setQuickBillDialogOpen] = useState(false);
  const [selectedEventForQuickBill, setSelectedEventForQuickBill] = useState<Activity | null>(null);

  // Unified state for single activities panel
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { sortColumn, sortDirection, handleSort } = useSortPreference("case-activities-unified", "due_date", "asc");

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
    // Determine form type based on is_scheduled or activity_type
    const isScheduled = activity.is_scheduled || activity.activity_type === "event";
    setFormType(isScheduled ? "event" : "task");
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

  const handleToggleComplete = async (activity: Activity) => {
    try {
      // Determine if this is a scheduled activity
      const isScheduled = activity.is_scheduled || activity.activity_type === "event";
      
      // Use unified status logic
      const isCurrentlyDone = activity.status === "done" || activity.status === "completed";
      const newStatus = isCurrentlyDone 
        ? (isScheduled ? "scheduled" : "to_do")
        : (isScheduled ? "completed" : "done");
      
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
        description: "Activity updated successfully",
      });

      // Check billing eligibility if completing and has service instance
      // Only trigger billing prompt for unscheduled activities (tasks)
      if (isCompleting && activity.case_service_instance_id && !isScheduled) {
        const eligibility = await evaluateBillingEligibility({
          activityId: activity.id,
          caseServiceInstanceId: activity.case_service_instance_id,
        });
        
        if (eligibility.isEligible) {
          setBillingEligibility(eligibility);
          setBillingPromptOpen(true);
        }
      }
    } catch (error) {
      console.error('Error updating activity:', error);
      toast({
        title: "Error",
        description: "Failed to update activity",
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

  // Helper to check if activity is scheduled
  const isActivityScheduled = (activity: Activity) => {
    return activity.is_scheduled || activity.activity_type === "event";
  };

  // Count activities by type
  const scheduledCount = activities.filter(a => isActivityScheduled(a)).length;
  const unscheduledCount = activities.filter(a => !isActivityScheduled(a)).length;

  // Filter activities based on view filter, search, and status
  const filteredActivities = activities
    .filter(activity => {
      // View filter (scheduled vs unscheduled)
      if (viewFilter === "scheduled" && !isActivityScheduled(activity)) return false;
      if (viewFilter === "unscheduled" && isActivityScheduled(activity)) return false;
      
      // Search filter
      const matchesSearch =
        activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const matchesStatus = filterStatus === "all" || activity.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;
      let aVal: any, bVal: any;
      switch (sortColumn) {
        case "title": aVal = a.title; bVal = b.title; break;
        case "type": 
          aVal = isActivityScheduled(a) ? 1 : 0; 
          bVal = isActivityScheduled(b) ? 1 : 0; 
          break;
        case "status": aVal = a.status; bVal = b.status; break;
        case "due_date":
          aVal = a.due_date ? new Date(a.due_date).getTime() : 0;
          bVal = b.due_date ? new Date(b.due_date).getTime() : 0;
          break;
        default: return 0;
      }
      if (aVal == null) return sortDirection === "asc" ? 1 : -1;
      if (bVal == null) return sortDirection === "asc" ? -1 : 1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });

  // Get status options based on current view filter
  const getStatusOptions = () => {
    const allStatuses = [
      { value: "all", label: "All" },
      { value: "to_do", label: "To Do" },
      { value: "scheduled", label: "Scheduled" },
      { value: "in_progress", label: "In Progress" },
      { value: "blocked", label: "Blocked" },
      { value: "done", label: "Done" },
      { value: "completed", label: "Completed" },
      { value: "cancelled", label: "Cancelled" },
    ];
    
    if (viewFilter === "scheduled") {
      return allStatuses.filter(s => ["all", "scheduled", "in_progress", "blocked", "completed", "cancelled"].includes(s.value));
    }
    if (viewFilter === "unscheduled") {
      return allStatuses.filter(s => ["all", "to_do", "in_progress", "blocked", "done", "cancelled"].includes(s.value));
    }
    return allStatuses;
  };

  const handleExport = (format: "csv" | "pdf") => {
    const exportColumns: ExportColumn[] = [
      { key: "title", label: "Title" },
      { key: "activity_type", label: "Type", format: (v) => v === "event" ? "Scheduled" : "Task" },
      { key: "service_name", label: "Linked Service", format: (v) => v || "-" },
      { key: "status", label: "Status", format: (v) => v?.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '-' },
      { key: "assigned_user_id", label: "Assigned To", format: (v) => getUserName(v) },
      { key: "due_date", label: "Due Date", format: (v) => formatDueDate(v) },
      { key: "description", label: "Description", format: (v) => v || "-" },
    ];
    
    const fileName = viewFilter === "all" ? "case-activities" : `case-${viewFilter}-activities`;
    
    if (format === "csv") {
      exportToCSV(filteredActivities, exportColumns, fileName);
    } else {
      const title = viewFilter === "all" 
        ? "Case Activities" 
        : viewFilter === "scheduled" 
          ? "Scheduled Activities" 
          : "Tasks";
      exportToPDF(filteredActivities, exportColumns, title, fileName);
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Activities</h2>
            <p className="text-muted-foreground">
              {unscheduledCount} task{unscheduledCount !== 1 ? 's' : ''}, {scheduledCount} scheduled event{scheduledCount !== 1 ? 's' : ''}
            </p>
          </div>
          <Button 
            onClick={() => openForm("task")} 
            disabled={!canAddActivities || isClosedCase}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </div>

        {/* Unified Activities Panel */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <List className="h-5 w-5" />
                All Activities ({filteredActivities.length})
              </CardTitle>
              
              <div className="flex items-center gap-2">
                {/* View Toggle */}
                <ToggleGroup 
                  type="single" 
                  value={viewFilter} 
                  onValueChange={(value) => value && setViewFilter(value as ViewFilter)}
                  className="border rounded-md"
                >
                  <ToggleGroupItem value="all" aria-label="Show all" className="text-xs px-3">
                    All
                  </ToggleGroupItem>
                  <ToggleGroupItem value="unscheduled" aria-label="Show tasks" className="text-xs px-3">
                    <CheckSquare className="h-3.5 w-3.5 mr-1" />
                    Tasks
                  </ToggleGroupItem>
                  <ToggleGroupItem value="scheduled" aria-label="Show scheduled" className="text-xs px-3">
                    <CalendarDays className="h-3.5 w-3.5 mr-1" />
                    Scheduled
                  </ToggleGroupItem>
                </ToggleGroup>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport("csv")}>
                      Export to CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("pdf")}>
                      Export to PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {/* Info banner for scheduled activities */}
            {viewFilter === "scheduled" && (
              <div className="rounded-md border border-muted bg-muted/30 px-3 py-2 mt-2">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Link className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Costs for scheduled activities are derived from updates.{" "}
                    <a 
                      href={`/cases/${caseId}?tab=updates`}
                      className="text-primary hover:underline font-medium"
                    >
                      View related updates →
                    </a>
                  </span>
                </p>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {getStatusOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Activities table */}
            {filteredActivities.length === 0 ? (
              <div className="text-center py-8 border rounded-lg bg-muted/50">
                <List className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">
                  {searchQuery || filterStatus !== "all"
                    ? "No activities match your filters"
                    : viewFilter === "scheduled"
                      ? "No scheduled activities yet"
                      : viewFilter === "unscheduled"
                        ? "No tasks yet"
                        : "No activities yet"}
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
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        className="min-w-[150px]"
                      />
                      {viewFilter === "all" && (
                        <SortableTableHead
                          column="type"
                          label="Type"
                          sortColumn={sortColumn}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                          className="w-[100px]"
                        />
                      )}
                      <SortableTableHead
                        column="status"
                        label="Status"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        className="w-[100px]"
                      />
                      <SortableTableHead
                        column="due_date"
                        label="Date"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        className="w-[100px]"
                      />
                      <th className="w-[100px] p-2"></th>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActivities.map((activity) => {
                      const isScheduled = isActivityScheduled(activity);
                      const isDone = activity.status === "done" || activity.status === "completed";
                      
                      return (
                        <TableRow key={activity.id}>
                          <TableCell className="align-top">
                            <Checkbox
                              checked={isDone}
                              onCheckedChange={() => handleToggleComplete(activity)}
                              disabled={isClosedCase || !canEditActivities}
                            />
                          </TableCell>
                          <TableCell className="font-medium align-top">
                            <div className="flex flex-col gap-0.5">
                              <span 
                                className={`line-clamp-1 ${isDone ? "line-through text-muted-foreground" : ""}`}
                                title={activity.title}
                              >
                                {activity.title}
                              </span>
                              {activity.service_name && (
                                <span className="text-xs text-primary flex items-center gap-1" title={`Linked to: ${activity.service_name}`}>
                                  <Link className="h-3 w-3" />
                                  {activity.service_name}
                                </span>
                              )}
                              {activity.description && !activity.service_name && (
                                <span className="text-xs text-muted-foreground line-clamp-1" title={activity.description}>
                                  {activity.description}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          {viewFilter === "all" && (
                            <TableCell className="align-top">
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${isScheduled 
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" 
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"}`}
                              >
                                {isScheduled ? (
                                  <><Clock className="h-3 w-3 mr-1" /> Event</>
                                ) : (
                                  <><CheckSquare className="h-3 w-3 mr-1" /> Task</>
                                )}
                              </Badge>
                            </TableCell>
                          )}
                          <TableCell className="align-top">
                            <Badge variant="outline" className={`${getStatusColor(activity.status)} text-xs`}>
                              {getStatusLabel(activity.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="align-top text-sm whitespace-nowrap">
                            {formatDueDate(activity.due_date)}
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex gap-1">
                              {/* Quick Bill Button - only for scheduled activities with linked services */}
                              {isScheduled && activity.case_service_instance_id && !isDone && canEditActivities && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          setSelectedEventForQuickBill(activity);
                                          setQuickBillDialogOpen(true);
                                        }}
                                        disabled={isClosedCase}
                                        className="h-7 w-7 text-primary hover:text-primary"
                                      >
                                        <Zap className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Quick Bill</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {canEditActivities && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(activity)}
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
                                  onClick={() => handleDelete(activity.id)}
                                  disabled={isClosedCase}
                                  className="h-7 w-7"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
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

      {/* Quick Bill Dialog */}
      {selectedEventForQuickBill && (
        <QuickBillDialog
          open={quickBillDialogOpen}
          onOpenChange={(open) => {
            setQuickBillDialogOpen(open);
            if (!open) setSelectedEventForQuickBill(null);
          }}
          eventId={selectedEventForQuickBill.id}
          caseId={caseId}
          organizationId={organization?.id || ""}
          onSuccess={() => {
            fetchActivities();
            setQuickBillDialogOpen(false);
            setSelectedEventForQuickBill(null);
          }}
        />
      )}
    </>
  );
}
