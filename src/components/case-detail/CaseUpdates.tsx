import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronRight, FileText, ShieldAlert } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { UpdateForm } from "./UpdateForm";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { GenerateReportDialog } from "@/components/templates/GenerateReportDialog";
import { usePermissions } from "@/hooks/usePermissions";

interface Update {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  update_type: string;
  user_id: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

export const CaseUpdates = ({ caseId, isClosedCase = false }: { caseId: string; isClosedCase?: boolean }) => {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<Update | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [caseData, setCaseData] = useState<{ title: string; case_number: string; case_manager_id: string | null } | null>(null);

  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const canViewUpdates = hasPermission("view_updates");
  const canAddUpdates = hasPermission("add_updates");
  const canEditUpdates = hasPermission("edit_updates");
  const canDeleteUpdates = hasPermission("delete_updates");
  const canViewReports = hasPermission("view_reports");

  useEffect(() => {
    fetchUpdates();
    fetchCaseData();
  }, [caseId]);

  const fetchCaseData = async () => {
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("title, case_number, case_manager_id")
        .eq("id", caseId)
        .single();

      if (error) throw error;
      setCaseData(data);
    } catch (error) {
      console.error("Error fetching case data:", error);
    }
  };

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("case_updates")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUpdates(data || []);

      // Fetch user profiles for all unique user IDs
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((u) => u.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        if (profiles) {
          const profileMap: Record<string, UserProfile> = {};
          profiles.forEach((p) => {
            profileMap[p.id] = p;
          });
          setUserProfiles(profileMap);
        }
      }
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

  const handleEdit = (update: Update) => {
    setEditingUpdate(update);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this update?")) return;
    
    try {
      const { error } = await supabase
        .from("case_updates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Success", description: "Update deleted" });
      fetchUpdates();
    } catch (error) {
      console.error("Error deleting update:", error);
      toast({
        title: "Error",
        description: "Failed to delete update",
        variant: "destructive",
      });
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredUpdates = updates.filter(update => {
    return searchQuery === '' || 
      update.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      update.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      update.update_type.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (permissionsLoading || loading) {
    return <p className="text-muted-foreground">Loading updates...</p>;
  }

  if (!canViewUpdates) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground text-center">
            You don't have permission to view updates. Contact your administrator for access.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Case Updates</h2>
          <p className="text-muted-foreground">Activity log and progress notes</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {canViewReports && (
            <Button onClick={() => setReportDialogOpen(true)} variant="outline" className="w-full sm:w-auto" disabled={isClosedCase}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          )}
          <Button 
            onClick={() => setFormOpen(true)} 
            className="w-full sm:w-auto" 
            disabled={isClosedCase || !canAddUpdates}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Update
          </Button>
        </div>
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
            {canAddUpdates && (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" />
                Add First Update
              </Button>
            )}
          </CardContent>
        </Card>
      ) : filteredUpdates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No updates match your search criteria</p>
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
                <TableHead>Created By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUpdates.map((update) => {
                const isExpanded = expandedRows.has(update.id);
                const userProfile = userProfiles[update.user_id];
                
                return (
                  <React.Fragment key={update.id}>
                    <TableRow>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => toggleRow(update.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{update.title}</TableCell>
                      <TableCell>{update.update_type}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {userProfile?.full_name || userProfile?.email || "Unknown"}
                      </TableCell>
                      <TableCell>{format(new Date(update.created_at), "MMM dd, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEditUpdates && (
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(update)} disabled={isClosedCase}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDeleteUpdates && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(update.id)} disabled={isClosedCase}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && update.description && (
                      <TableRow key={`${update.id}-desc`}>
                        <TableCell colSpan={6} className="py-3 bg-muted/30 border-0">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-10">
                            {update.description}
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <UpdateForm
        caseId={caseId}
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingUpdate(null); }}
        onSuccess={fetchUpdates}
        editingUpdate={editingUpdate}
      />

      {caseData && (
        <GenerateReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          caseId={caseId}
          caseData={caseData}
          updates={updates}
          userProfiles={userProfiles}
        />
      )}
    </>
  );
};