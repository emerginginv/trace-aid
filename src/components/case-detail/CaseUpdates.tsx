import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronRight, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { UpdateForm } from "./UpdateForm";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

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

// Mock Updates Data
const MOCK_UPDATES: Update[] = [
  {
    id: "1",
    title: "Initial case assessment completed",
    description: "Reviewed all documentation and client statements. Case has strong merit based on preliminary analysis.",
    created_at: "2025-01-15T10:30:00Z",
    update_type: "Status Update",
    user_id: "user1",
  },
  {
    id: "2",
    title: "Discovery documents submitted",
    description: "Filed motion for discovery. Expecting response within 30 days per court rules.",
    created_at: "2025-01-20T14:20:00Z",
    update_type: "Filing",
    user_id: "user2",
  },
  {
    id: "3",
    title: "Client meeting notes",
    description: "Met with client to discuss case strategy. Client approved proceeding with expert witness deposition.",
    created_at: "2025-02-01T09:15:00Z",
    update_type: "Meeting",
    user_id: "user1",
  },
  {
    id: "4",
    title: "Settlement offer received",
    description: "Opposing counsel proposed settlement of $150,000. Discussed with client - considering counter-offer.",
    created_at: "2025-02-10T16:45:00Z",
    update_type: "Negotiation",
    user_id: "user2",
  },
  {
    id: "5",
    title: "Expert witness confirmed",
    description: "Dr. Anderson agreed to testify. Deposition scheduled for March 15th.",
    created_at: "2025-02-18T11:00:00Z",
    update_type: "Witness",
    user_id: "user1",
  },
];

const MOCK_USER_PROFILES: Record<string, UserProfile> = {
  user1: { id: "user1", full_name: "Sarah Martinez", email: "sarah.martinez@lawfirm.com" },
  user2: { id: "user2", full_name: "Michael Chen", email: "michael.chen@lawfirm.com" },
};

export const CaseUpdates = ({ caseId }: { caseId: string }) => {
  const navigate = useNavigate();
  const [updates, setUpdates] = useState<Update[]>(MOCK_UPDATES);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<Update | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userProfiles] = useState<Record<string, UserProfile>>(MOCK_USER_PROFILES);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const handleEdit = (update: Update) => {
    setEditingUpdate(update);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this update?")) return;
    setUpdates(updates.filter(u => u.id !== id));
    toast({ title: "Success", description: "Update deleted" });
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
                  <>
                    <TableRow key={update.id}>
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
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/updates/${update.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(update)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(update.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                  </>
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
        onSuccess={() => {}}
        editingUpdate={editingUpdate}
      />
    </>
  );
};