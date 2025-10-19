import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, CheckCircle2, Circle, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ActivityForm } from "./ActivityForm";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

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
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <Card key={activity.id} className={activity.completed ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={activity.completed}
                    onCheckedChange={() => toggleComplete(activity)}
                  />
                   <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className={`text-lg ${activity.completed ? "line-through" : ""}`}>
                        {activity.title}
                      </CardTitle>
                      <Badge className={getTypeColor(activity.activity_type)}>
                        {activity.activity_type}
                      </Badge>
                      {activity.completed && activity.completed_at && (
                        <Badge variant="outline" className="text-green-500 border-green-500/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Completed {new Date(activity.completed_at).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1 mt-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(activity)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(activity.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {activity.due_date && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Due: {new Date(activity.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              {activity.description && (
                <CardContent>
                  <p className="text-muted-foreground">{activity.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
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