import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { ActivityForm } from "./ActivityForm";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"tasks" | "events">("tasks");

  useEffect(() => {
    fetchUsers();
    fetchActivities();
  }, [caseId]);

  const fetchUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization
      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!orgMember) return;

      // Get all organization member user_ids
      const { data: orgMembers } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", orgMember.organization_id);

      if (!orgMembers) return;

      const userIds = orgMembers.map(m => m.user_id);

      // Fetch profiles only for users in the same organization
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('case_activities')
        .select('*')
        .eq('case_id', caseId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
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

  const handleEdit = (activity: Activity) => {
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
      const newStatus = activeTab === "tasks" 
        ? (activity.status === "done" ? "to_do" : "done")
        : (activity.status === "completed" ? "scheduled" : "completed");
      
      const { error } = await supabase
        .from('case_activities')
        .update({ 
          status: newStatus,
          completed: newStatus === "done" || newStatus === "completed",
          completed_at: (newStatus === "done" || newStatus === "completed") ? new Date().toISOString() : null
        })
        .eq('id', activity.id);

      if (error) throw error;

      setActivities(activities.map(a => 
        a.id === activity.id 
          ? { 
              ...a, 
              status: newStatus, 
              completed: newStatus === "done" || newStatus === "completed",
              completed_at: (newStatus === "done" || newStatus === "completed") ? new Date().toISOString() : null
            }
          : a
      ));

      toast({
        title: "Success",
        description: `${activeTab === "tasks" ? "Task" : "Event"} updated successfully`,
      });
    } catch (error) {
      console.error('Error updating activity:', error);
      toast({
        title: "Error",
        description: `Failed to update ${activeTab === "tasks" ? "task" : "event"}`,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done":
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "blocked":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "scheduled":
        return "bg-purple-100 text-purple-800";
      case "to_do":
      default:
        return "bg-gray-100 text-gray-800";
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

  const filteredActivities = activities
    .filter((activity) => {
      const matchesSearch =
        activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = activeTab === "tasks" ? activity.activity_type === "task" : activity.activity_type === "event";
      const matchesStatus = filterStatus === "all" || activity.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });

  return (
    <>
      {loading ? (
        <p className="text-muted-foreground">Loading activities...</p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Case Activities</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Track tasks and events for this case
              </p>
            </div>
            <Button onClick={() => setFormOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add {activeTab === "tasks" ? "Task" : "Event"}
            </Button>
          </div>

          <div className="flex border-b">
            <button
              onClick={() => {
                setActiveTab("tasks");
                setFilterStatus("all");
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "tasks"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Tasks
            </button>
            <button
              onClick={() => {
                setActiveTab("events");
                setFilterStatus("all");
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "events"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Events
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {activeTab === "tasks" ? (
                  <>
                    <SelectItem value="to_do">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/50">
              <p className="text-muted-foreground">
                {searchQuery || filterStatus !== "all"
                  ? `No ${activeTab} match your search`
                  : `No ${activeTab} yet. Add your first ${activeTab === "tasks" ? "task" : "event"} to get started.`}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="min-w-[200px] max-w-[300px]">Title</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[140px] hidden md:table-cell">Assigned To</TableHead>
                    <TableHead className="w-[120px]">{activeTab === "tasks" ? "Due Date" : "Date"}</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="align-top">
                        <Checkbox
                          checked={activity.status === "done" || activity.status === "completed"}
                          onCheckedChange={() => handleToggleComplete(activity)}
                          disabled={isClosedCase}
                        />
                      </TableCell>
                      <TableCell className="font-medium align-top">
                        <div className="flex flex-col gap-1">
                          <span 
                            className={`line-clamp-2 ${activity.status === "done" || activity.status === "completed" ? "line-through text-muted-foreground" : ""}`}
                            title={activity.title}
                          >
                            {activity.title}
                          </span>
                          {activity.description && (
                            <span className="text-sm text-muted-foreground line-clamp-1" title={activity.description}>
                              {activity.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline" className={`${getStatusColor(activity.status)} whitespace-nowrap`}>
                          {getStatusLabel(activity.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top hidden md:table-cell">
                        <span className="text-sm truncate block" title={getUserName(activity.assigned_user_id)}>
                          {getUserName(activity.assigned_user_id)}
                        </span>
                      </TableCell>
                      <TableCell className="align-top whitespace-nowrap">
                        {activity.due_date
                          ? (() => {
                              const dateStr = activity.due_date;
                              if (dateStr.length === 10 && dateStr.includes('-')) {
                                const [year, month, day] = dateStr.split('-').map(Number);
                                return format(new Date(year, month - 1, day), "MMM dd, yyyy");
                              }
                              return format(new Date(dateStr), "MMM dd, yyyy");
                            })()
                          : "-"}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(activity)}
                            disabled={isClosedCase}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(activity.id)}
                            disabled={isClosedCase}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      <ActivityForm
        caseId={caseId}
        activityType={activeTab === "tasks" ? "task" : "event"}
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
      />
    </>
  );
}
