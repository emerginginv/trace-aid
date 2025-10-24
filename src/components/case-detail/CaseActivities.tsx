import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Search } from "lucide-react";
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
}

// Mock Activities Data
const MOCK_ACTIVITIES: Activity[] = [
  {
    id: "1",
    activity_type: "task",
    title: "Review case documents",
    description: "Review all submitted evidence and witness statements",
    due_date: "2025-03-15T17:00:00Z",
    completed: false,
    completed_at: null,
    created_at: "2025-01-10T10:00:00Z",
    updated_at: "2025-01-10T10:00:00Z",
    assigned_user_id: "user1",
    status: "in_progress",
  },
  {
    id: "2",
    activity_type: "task",
    title: "Prepare deposition questions",
    description: "Draft comprehensive questions for expert witness deposition",
    due_date: "2025-03-10T15:00:00Z",
    completed: false,
    completed_at: null,
    created_at: "2025-01-12T14:30:00Z",
    updated_at: "2025-01-12T14:30:00Z",
    assigned_user_id: "user2",
    status: "to_do",
  },
  {
    id: "3",
    activity_type: "task",
    title: "File motion for summary judgment",
    description: null,
    due_date: "2025-03-20T23:59:00Z",
    completed: true,
    completed_at: "2025-02-15T16:20:00Z",
    created_at: "2025-01-05T09:00:00Z",
    updated_at: "2025-02-15T16:20:00Z",
    assigned_user_id: "user1",
    status: "done",
  },
  {
    id: "4",
    activity_type: "event",
    title: "Client consultation",
    description: "Initial strategy meeting with client",
    due_date: "2025-03-12T10:00:00Z",
    completed: false,
    completed_at: null,
    created_at: "2025-01-08T11:00:00Z",
    updated_at: "2025-01-08T11:00:00Z",
    assigned_user_id: "user1",
    status: "scheduled",
  },
  {
    id: "5",
    activity_type: "event",
    title: "Expert witness deposition",
    description: "Deposition with Dr. Anderson at courthouse",
    due_date: "2025-03-15T14:00:00Z",
    completed: false,
    completed_at: null,
    created_at: "2025-01-20T13:00:00Z",
    updated_at: "2025-01-20T13:00:00Z",
    assigned_user_id: "user2",
    status: "scheduled",
  },
  {
    id: "6",
    activity_type: "task",
    title: "Research case precedents",
    description: "Find similar cases in jurisdiction for reference",
    due_date: "2025-03-08T17:00:00Z",
    completed: false,
    completed_at: null,
    created_at: "2025-02-01T10:00:00Z",
    updated_at: "2025-02-01T10:00:00Z",
    assigned_user_id: null,
    status: "blocked",
  },
];

const MOCK_USERS: User[] = [
  { id: "user1", email: "sarah.martinez@lawfirm.com", full_name: "Sarah Martinez" },
  { id: "user2", email: "michael.chen@lawfirm.com", full_name: "Michael Chen" },
  { id: "user3", email: "jessica.wong@lawfirm.com", full_name: "Jessica Wong" },
];

export function CaseActivities({ caseId }: CaseActivitiesProps) {
  const [activities, setActivities] = useState<Activity[]>(MOCK_ACTIVITIES);
  const [users] = useState<User[]>(MOCK_USERS);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"tasks" | "events">("tasks");

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this activity?")) return;
    setActivities(activities.filter(a => a.id !== id));
    toast({
      title: "Success",
      description: "Activity deleted successfully",
    });
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
    if (!userId) return "Unassigned";
    const user = users.find(u => u.id === userId);
    return user?.full_name || user?.email || "Unknown User";
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>{activeTab === "tasks" ? "Due Date" : "Date"}</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{activity.title}</span>
                          {activity.description && (
                            <span className="text-sm text-muted-foreground mt-1">
                              {activity.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(activity.status)}>
                          {getStatusLabel(activity.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{getUserName(activity.assigned_user_id)}</span>
                      </TableCell>
                      <TableCell>
                        {activity.due_date
                          ? format(new Date(activity.due_date), "MMM dd, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(activity)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(activity.id)}
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
          setFormOpen(false);
          setEditingActivity(null);
        }}
        editingActivity={editingActivity}
      />
    </>
  );
}
