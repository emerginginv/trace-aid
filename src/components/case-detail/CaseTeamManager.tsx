import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, UserPlus, Users, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"; // Global TooltipProvider in App.tsx
import { CaseManagerCard } from "./CaseManagerCard";
import { usePermissions } from "@/hooks/usePermissions";
import { ContextualHelp } from "@/components/help-center";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  mobile_phone?: string | null;
  office_phone?: string | null;
  avatar_url?: string | null;
}

interface CaseTeamManagerProps {
  caseId: string;
  caseManagerId: string | null;
  caseManager2Id?: string | null;
  investigatorIds: string[];
  onUpdate: () => void;
}

export const CaseTeamManager = ({
  caseId,
  caseManagerId,
  caseManager2Id,
  investigatorIds,
  onUpdate
}: CaseTeamManagerProps) => {
  const { organization } = useOrganization();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('edit_cases');
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [caseManager, setCaseManager] = useState<Profile | null>(null);
  const [caseManager2, setCaseManager2] = useState<Profile | null>(null);
  const [investigators, setInvestigators] = useState<Profile[]>([]);
  const [showAddInvestigator, setShowAddInvestigator] = useState(false);
  const [selectedInvestigator, setSelectedInvestigator] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  // Edit mode states
  const [editingManager, setEditingManager] = useState<'primary' | 'secondary' | null>(null);
  const [showAddSecondary, setShowAddSecondary] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, [caseManagerId, caseManager2Id, investigatorIds]);

  const fetchProfiles = async () => {
    try {
      if (!organization?.id) return;

      const { data: orgMembers } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organization.id);

      if (!orgMembers) return;

      const userIds = orgMembers.map(m => m.user_id);

      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, mobile_phone, office_phone, avatar_url")
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

        if (caseManager2Id) {
          const manager2 = allProfiles.find(p => p.id === caseManager2Id);
          setCaseManager2(manager2 || null);
        } else {
          setCaseManager2(null);
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
      
      // Don't allow selecting the same user as secondary
      if (managerId === caseManager2Id) {
        toast({
          title: "Invalid Selection",
          description: "This user is already assigned as Case Manager 2",
          variant: "destructive"
        });
        return;
      }
      
      const { error } = await supabase.from("cases").update({
        case_manager_id: managerId
      }).eq("id", caseId).eq("user_id", user.id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Primary case manager updated successfully"
      });
      setEditingManager(null);
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

  const handleUpdateCaseManager2 = async (managerId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Don't allow selecting the same user as primary
      if (managerId === caseManagerId) {
        toast({
          title: "Invalid Selection",
          description: "This user is already assigned as Case Manager 1",
          variant: "destructive"
        });
        return;
      }
      
      const { error } = await supabase.from("cases").update({
        case_manager_2_id: managerId
      }).eq("id", caseId).eq("user_id", user.id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Secondary case manager updated successfully"
      });
      setEditingManager(null);
      setShowAddSecondary(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating secondary case manager:", error);
      toast({
        title: "Error",
        description: "Failed to update secondary case manager",
        variant: "destructive"
      });
    }
  };

  const handleRemoveCaseManager2 = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("cases").update({
        case_manager_2_id: null
      }).eq("id", caseId).eq("user_id", user.id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Secondary case manager removed"
      });
      onUpdate();
    } catch (error) {
      console.error("Error removing secondary case manager:", error);
      toast({
        title: "Error",
        description: "Failed to remove secondary case manager",
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

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const availableInvestigators = profiles.filter(
    p => p.id !== caseManagerId && p.id !== caseManager2Id && !(investigatorIds || []).includes(p.id)
  );
  
  const availableForPrimary = profiles.filter(p => p.id !== caseManager2Id);
  const availableForSecondary = profiles.filter(p => p.id !== caseManagerId);

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
          <ContextualHelp feature="case_manager_assignment" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Case Manager 1 (Primary) */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Case Manager 1 (Primary)</p>
          {editingManager === 'primary' ? (
            <div className="flex gap-2">
              <Select 
                value={caseManagerId || ""} 
                onValueChange={(value) => {
                  handleUpdateCaseManager(value);
                }}
              >
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue placeholder="Select case manager..." />
                </SelectTrigger>
                <SelectContent>
                  {availableForPrimary.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9"
                onClick={() => setEditingManager(null)}
              >
                Cancel
              </Button>
            </div>
          ) : caseManager ? (
            <CaseManagerCard
              manager={caseManager}
              label="Case Manager 1"
              isPrimary={true}
              onChangeClick={() => setEditingManager('primary')}
              canEdit={canEdit}
            />
          ) : (
            <Select value="" onValueChange={handleUpdateCaseManager}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select primary case manager..." />
              </SelectTrigger>
              <SelectContent>
                {availableForPrimary.map(profile => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name || profile.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Case Manager 2 (Secondary) */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Case Manager 2 (Secondary)</p>
          {editingManager === 'secondary' ? (
            <div className="flex gap-2">
              <Select 
                value={caseManager2Id || ""} 
                onValueChange={(value) => {
                  handleUpdateCaseManager2(value);
                }}
              >
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue placeholder="Select case manager..." />
                </SelectTrigger>
                <SelectContent>
                  {availableForSecondary.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9"
                onClick={() => setEditingManager(null)}
              >
                Cancel
              </Button>
            </div>
          ) : caseManager2 ? (
            <CaseManagerCard
              manager={caseManager2}
              label="Case Manager 2"
              isPrimary={false}
              onChangeClick={() => setEditingManager('secondary')}
              onRemove={handleRemoveCaseManager2}
              canEdit={canEdit}
            />
          ) : showAddSecondary ? (
            <div className="flex gap-2">
              <Select value="" onValueChange={handleUpdateCaseManager2}>
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue placeholder="Select secondary case manager..." />
                </SelectTrigger>
                <SelectContent>
                  {availableForSecondary.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9"
                onClick={() => setShowAddSecondary(false)}
              >
                Cancel
              </Button>
            </div>
          ) : canEdit ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 text-muted-foreground"
              onClick={() => setShowAddSecondary(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Secondary Case Manager
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">No secondary case manager assigned</p>
          )}
        </div>

        {/* Investigators */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-muted-foreground">Investigators</p>
            {canEdit && (
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setShowAddInvestigator(!showAddInvestigator)}>
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            )}
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
                <Tooltip key={investigator.id}>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="flex items-center gap-2 px-2.5 py-1 cursor-pointer">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px]">
                          {getInitials(investigator.full_name, investigator.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">
                        {investigator.full_name || investigator.email}
                      </span>
                      {canEdit && (
                        <button 
                          onClick={() => handleRemoveInvestigator(investigator.id)} 
                          className="ml-0.5 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm font-medium">{investigator.full_name}</p>
                    <p className="text-xs text-muted-foreground">{investigator.email}</p>
                  </TooltipContent>
                </Tooltip>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
