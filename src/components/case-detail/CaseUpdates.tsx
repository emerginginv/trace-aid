import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { UpdateForm } from "./UpdateForm";
import { Input } from "@/components/ui/input";

interface Update {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

export const CaseUpdates = ({ caseId }: { caseId: string }) => {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<Update | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleEdit = (update: Update) => {
    setEditingUpdate(update);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this update?")) return;
    try {
      const { error } = await supabase.from("case_updates").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Update deleted" });
      fetchUpdates();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, [caseId]);

  const fetchUpdates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("case_updates")
        .select("*")
        .eq("case_id", caseId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUpdates(data || []);
    } catch (error) {
      console.error("Error fetching updates:", error);
      toast({
        title: "Error",
        description: "Failed to load updates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUpdates = updates.filter(update => {
    return searchQuery === '' || 
      update.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      update.description?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return <p className="text-muted-foreground">Loading updates...</p>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Case Updates</h2>
          <p className="text-muted-foreground">Activity log and progress notes</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Update
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search updates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {updates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No updates yet</p>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Add First Update
            </Button>
          </CardContent>
        </Card>
      ) : filteredUpdates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No updates match your search criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredUpdates.map((update) => (
            <Card key={update.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{update.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {new Date(update.created_at).toLocaleDateString()}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(update)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(update.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {update.description && (
                <CardContent>
                  <p className="text-muted-foreground">{update.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <UpdateForm
        caseId={caseId}
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingUpdate(null); }}
        onSuccess={fetchUpdates}
        editingUpdate={editingUpdate}
      />
    </>
  );
};