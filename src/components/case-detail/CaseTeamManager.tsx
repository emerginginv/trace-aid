import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, UserPlus, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface CaseTeamManagerProps {
  caseId: string;
  caseManagerId: string | null;
  investigatorIds: string[];
  onUpdate: () => void;
}

export const CaseTeamManager = ({
  caseId,
  caseManagerId,
  investigatorIds,
  onUpdate
}: CaseTeamManagerProps) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [caseManager, setCaseManager] = useState<Profile | null>(null);
  const [investigators, setInvestigators] = useState<Profile[]>([]);
  const [showAddInvestigator, setShowAddInvestigator] = useState(false);
  const [selectedInvestigator, setSelectedInvestigator] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfiles();
  }, [caseManagerId, investigatorIds]);

  const fetchProfiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!orgMember) return;

      const { data: orgMembers } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", orgMember.organization_id);

      if (!orgMembers) return;

      const userIds = orgMembers.map(m => m.user_id);

      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds)
        .order("full_name");

      if (allProfiles) {
        setProfiles(allProfiles);

        if (caseManagerId) {
          const manager = allProfiles.find(p => p.id === caseManagerId);
          setCaseManager(manager || null);
        } else {
          setCaseManager(null);
        }

        if (investigatorIds && investigatorIds.length > 0) {
          const invs = allProfiles.filter(p => investigatorIds.includes(p.id));
          setInvestigators(invs);
        } else {
          setInvestigators([]);
        }
      }
    } catch (error) {
      console.error("Error fetching profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCaseManager = async (managerId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("cases").update({
        case_manager_id: managerId
      }).eq("id", caseId).eq("user_id", user.id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Case manager updated successfully"
      });
      onUpdate();
    } catch (error) {
      console.error("Error updating case manager:", error);
      toast({
        title: "Error",
        description: "Failed to update case manager",
        variant: "destructive"
      });
    }
  };

  const handleAddInvestigator = async () => {
    if (!selectedInvestigator) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const newInvestigatorIds = [...(investigatorIds || []), selectedInvestigator];
      const { error } = await supabase.from("cases").update({
        investigator_ids: newInvestigatorIds
      }).eq("id", caseId).eq("user_id", user.id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Investigator added successfully"
      });
      setShowAddInvestigator(false);
      setSelectedInvestigator("");
      onUpdate();
    } catch (error) {
      console.error("Error adding investigator:", error);
      toast({
        title: "Error",
        description: "Failed to add investigator",
        variant: "destructive"
      });
    }
  };

  const handleRemoveInvestigator = async (investigatorId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const newInvestigatorIds = (investigatorIds || []).filter(id => id !== investigatorId);
      const { error } = await supabase.from("cases").update({
        investigator_ids: newInvestigatorIds
      }).eq("id", caseId).eq("user_id", user.id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Investigator removed successfully"
      });
      onUpdate();
    } catch (error) {
      console.error("Error removing investigator:", error);
      toast({
        title: "Error",
        description: "Failed to remove investigator",
        variant: "destructive"
      });
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const availableInvestigators = profiles.filter(p => p.id !== caseManagerId && !(investigatorIds || []).includes(p.id));

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Case Manager */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Case Manager</p>
          <Select value={caseManagerId || ""} onValueChange={handleUpdateCaseManager}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select case manager..." />
            </SelectTrigger>
            <SelectContent>
              {profiles.map(profile => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.full_name || profile.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Investigators */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-muted-foreground">Investigators</p>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setShowAddInvestigator(!showAddInvestigator)}>
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>

          {showAddInvestigator && (
            <div className="flex gap-2 mb-3">
              <Select value={selectedInvestigator} onValueChange={setSelectedInvestigator}>
                <SelectTrigger className="flex-1 h-9">
                  <SelectValue placeholder="Select investigator..." />
                </SelectTrigger>
                <SelectContent>
                  {availableInvestigators.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-9" onClick={handleAddInvestigator} disabled={!selectedInvestigator}>
                Add
              </Button>
              <Button size="sm" variant="ghost" className="h-9" onClick={() => {
                setShowAddInvestigator(false);
                setSelectedInvestigator("");
              }}>
                Cancel
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {investigators.length === 0 ? (
              <p className="text-sm text-muted-foreground">No investigators assigned</p>
            ) : (
              investigators.map(investigator => (
                <TooltipProvider key={investigator.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="flex items-center gap-2 px-2.5 py-1 cursor-pointer">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[10px]">
                            {getInitials(investigator.full_name || investigator.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">
                          {investigator.full_name || investigator.email}
                        </span>
                        <button 
                          onClick={() => handleRemoveInvestigator(investigator.id)} 
                          className="ml-0.5 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm font-medium">{investigator.full_name}</p>
                      <p className="text-xs text-muted-foreground">{investigator.email}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
