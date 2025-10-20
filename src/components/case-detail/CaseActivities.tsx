import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ActivityForm } from "./ActivityForm";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export const CaseActivities = ({ caseId }: { caseId: string }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this activity?")) return;
    try {
      const { error } = await supabase.from("case_activities").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Activity deleted" });
      fetchActivities();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [caseId]);

  const fetchActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("case_activities")
        .select("*")
        .eq("case_id", caseId)
        .eq("user_id", user.id)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast({
        title: "Error",
        description: "Failed to load activities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = async (activity: Activity) => {
    try {
      const { error } = await supabase
        .from("case_activities")
        .update({
          completed: !activity.completed,
          completed_at: !activity.completed ? new Date().toISOString() : null,
        })
        .eq("id", activity.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Activity marked as ${!activity.completed ? "completed" : "incomplete"}`,
      });

      fetchActivities();
    } catch (error) {
      console.error("Error updating activity:", error);
      toast({
        title: "Error",
        description: "Failed to update activity",
        variant: "destructive",
      });
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      task: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      event: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    };
    return colors[type] || "bg-muted";
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = searchQuery === '' || 
      activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || activity.activity_type === typeFilter;
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'completed' && activity.completed) ||
      (statusFilter === 'pending' && !activity.completed);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return <p className="text-muted-foreground">Loading activities...</p>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Activities</h2>
          <p className="text-muted-foreground">Tasks and events for this case</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Activity
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="task">Task</SelectItem>
            <SelectItem value="event">Event</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {activities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No activities yet</p>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Add First Activity
            </Button>
          </CardContent>
        </Card>
      ) : filteredActivities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No activities match your search criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((activity) => (
                <TableRow key={activity.id} className={activity.completed ? "opacity-60" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={activity.completed}
                      onCheckedChange={() => toggleComplete(activity)}
                    />
                  </TableCell>
                  <TableCell className={`font-medium ${activity.completed ? "line-through" : ""}`}>
                    {activity.title}
                  </TableCell>
                  <TableCell>
                    <Badge className={getTypeColor(activity.activity_type)}>
                      {activity.activity_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {activity.description || "-"}
                  </TableCell>
                  <TableCell>
                    {activity.due_date ? new Date(activity.due_date).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell>
                    {activity.completed ? (
                      <Badge variant="outline" className="text-green-500 border-green-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(activity)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(activity.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ActivityForm
        caseId={caseId}
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingActivity(null); }}
        onSuccess={fetchActivities}
        editingActivity={editingActivity}
      />
    </>
  );
};