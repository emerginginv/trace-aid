import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UserPlus, Users, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { CaseManagerCard } from "./CaseManagerCard";
import { InvestigatorCard } from "./InvestigatorCard";
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

interface CaseInvestigator {
  id: string;
  role: 'primary' | 'support';
  assigned_at: string;
  investigator: Profile;
}

interface CaseTeamManagerProps {
  caseId: string;
  caseManagerId: string | null;
  caseManager2Id?: string | null;
  onUpdate: () => void;
}

export const CaseTeamManager = ({
  caseId,
  caseManagerId,
  caseManager2Id,
  onUpdate
}: CaseTeamManagerProps) => {
  const { organization } = useOrganization();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('edit_cases');
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [caseManager, setCaseManager] = useState<Profile | null>(null);
  const [caseManager2, setCaseManager2] = useState<Profile | null>(null);
  const [investigators, setInvestigators] = useState<CaseInvestigator[]>([]);
  const [showAddInvestigator, setShowAddInvestigator] = useState(false);
  const [selectedInvestigator, setSelectedInvestigator] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  // Edit mode states
  const [editingManager, setEditingManager] = useState<'primary' | 'secondary' | null>(null);
  const [showAddSecondary, setShowAddSecondary] = useState(false);

  useEffect(() => {
    fetchProfiles();
    fetchInvestigators();
  }, [caseManagerId, caseManager2Id, caseId, organization?.id]);

  const fetchInvestigators = async () => {
    if (!caseId) return;
    
    try {
      const { data, error } = await supabase
        .from('case_investigators')
        .select(`
          id,
          role,
          assigned_at,
          investigator:profiles(id, full_name, email, mobile_phone, office_phone, avatar_url)
        `)
        .eq('case_id', caseId)
        .order('assigned_at', { ascending: true });
      
      if (error) throw error;
      
      // Transform and sort: primary first, then by assigned_at
      const transformed = (data || [])
        .filter(item => item.investigator)
        .map(item => ({
          id: item.id,
          role: item.role as 'primary' | 'support',
          assigned_at: item.assigned_at,
          investigator: item.investigator as unknown as Profile
        }))
        .sort((a, b) => {
          if (a.role === 'primary' && b.role !== 'primary') return -1;
          if (a.role !== 'primary' && b.role === 'primary') return 1;
          return new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime();
        });
      
      setInvestigators(transformed);
    } catch (error) {
      console.error("Error fetching investigators:", error);
    }
  };

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
    if (!selectedInvestigator || !organization?.id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Insert into case_investigators - trigger handles primary assignment
      const { error } = await supabase
        .from('case_investigators')
        .insert({
          case_id: caseId,
          investigator_id: selectedInvestigator,
          organization_id: organization.id,
          assigned_by: user.id
        });
      
      if (error) throw error;
      toast({
        title: "Success",
        description: "Investigator added successfully"
      });
      setShowAddInvestigator(false);
      setSelectedInvestigator("");
      fetchInvestigators();
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

  const handleRemoveInvestigator = async (assignmentId: string, wasPrimary: boolean) => {
    try {
      const { error } = await supabase
        .from('case_investigators')
        .delete()
        .eq('id', assignmentId);
      
      if (error) throw error;
      
      // Auto-promote trigger handles primary promotion automatically
      toast({
        title: "Success",
        description: wasPrimary && investigators.length > 1
          ? "Investigator removed. Next investigator promoted to Primary."
          : "Investigator removed successfully"
      });
      fetchInvestigators();
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

  // Set an investigator as primary using atomic database function with optimistic UI
  const handleSetPrimaryInvestigator = async (investigatorId: string) => {
    // Store previous state for rollback
    const previousInvestigators = [...investigators];
    
    // OPTIMISTIC UPDATE: Update local state immediately
    setInvestigators(prev => prev.map(inv => ({
      ...inv,
      role: inv.investigator.id === investigatorId ? 'primary' as const : 'support' as const
    })).sort((a, b) => {
      // Keep primary at top
      if (a.role === 'primary' && b.role !== 'primary') return -1;
      if (a.role !== 'primary' && b.role === 'primary') return 1;
      return new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime();
    }));

    try {
      const { error } = await supabase.rpc('set_primary_investigator', {
        p_case_id: caseId,
        p_investigator_id: investigatorId
      });
      
      if (error) {
        // ROLLBACK: Restore previous state on error
        setInvestigators(previousInvestigators);
        throw error;
      }
      
      toast({
        title: "Success",
        description: "Primary investigator updated"
      });
      onUpdate();
    } catch (error) {
      console.error("Error setting primary investigator:", error);
      toast({
        title: "Error",
        description: "Failed to update primary investigator",
        variant: "destructive"
      });
    }
  };

  // Get investigator IDs currently assigned (with null safety)
  const assignedInvestigatorIds = investigators
    .filter(inv => inv.investigator)
    .map(inv => inv.investigator.id);
  
  const availableInvestigators = profiles.filter(
    p => p.id !== caseManagerId && p.id !== caseManager2Id && !assignedInvestigatorIds.includes(p.id)
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

          <div className="space-y-3">
            {investigators.length === 0 ? (
              <p className="text-sm text-muted-foreground">No investigators assigned</p>
            ) : (
              investigators.map((item) => {
                const isPrimary = item.role === 'primary';
                // Only show "Make Primary" if not already primary AND there are multiple investigators
                const showSetPrimary = !isPrimary && investigators.length > 1;
                
                return (
                  <InvestigatorCard
                    key={item.id}
                    investigator={item.investigator}
                    isPrimary={isPrimary}
                    onSetPrimary={() => handleSetPrimaryInvestigator(item.investigator.id)}
                    onRemove={() => handleRemoveInvestigator(item.id, isPrimary)}
                    canEdit={canEdit}
                    showSetPrimary={showSetPrimary}
                  />
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
