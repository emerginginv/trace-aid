import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Star, DollarSign, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { ServicePricingRulesEditor } from "./ServicePricingRulesEditor";

interface PricingProfile {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

interface ProfileFormData {
  name: string;
  description: string;
  is_default: boolean;
  is_active: boolean;
}

const defaultFormData: ProfileFormData = {
  name: "",
  description: "",
  is_default: false,
  is_active: true,
};

export function PricingProfilesTab() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<PricingProfile | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>(defaultFormData);
  const [deleteProfileId, setDeleteProfileId] = useState<string | null>(null);
  const [rulesEditorProfile, setRulesEditorProfile] = useState<PricingProfile | null>(null);

  // Fetch pricing profiles
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["pricing-profiles", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("pricing_profiles")
        .select("*")
        .eq("organization_id", organization.id)
        .order("is_default", { ascending: false })
        .order("name");
      
      if (error) throw error;
      return data as PricingProfile[];
    },
    enabled: !!organization?.id,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ProfileFormData & { id?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user || !organization?.id) throw new Error("Not authenticated");

      if (data.id) {
        // Update
        const { error } = await supabase
          .from("pricing_profiles")
          .update({
            name: data.name,
            description: data.description || null,
            is_default: data.is_default,
            is_active: data.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from("pricing_profiles")
          .insert({
            organization_id: organization.id,
            name: data.name,
            description: data.description || null,
            is_default: data.is_default,
            is_active: data.is_active,
            created_by: user.user.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-profiles"] });
      setIsDialogOpen(false);
      setEditingProfile(null);
      setFormData(defaultFormData);
      toast.success(editingProfile ? "Profile updated" : "Profile created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pricing_profiles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-profiles"] });
      setDeleteProfileId(null);
      toast.success("Profile deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleEdit = (profile: PricingProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      description: profile.description || "",
      is_default: profile.is_default,
      is_active: profile.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingProfile(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    saveMutation.mutate({
      ...formData,
      id: editingProfile?.id,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing Profiles
          </CardTitle>
          <CardDescription>
            Define how services are billed for different clients or case types.
            Pricing profiles are assigned at the case level.
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Profile
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingProfile ? "Edit Pricing Profile" : "Create Pricing Profile"}
                </DialogTitle>
                <DialogDescription>
                  {editingProfile 
                    ? "Update the pricing profile details. Changes will not affect historical cases."
                    : "Create a new pricing profile to define client-specific billing rules."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Profile Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Insurance SIU - Standard"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe when this profile should be used..."
                    rows={3}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_default">Default Profile</Label>
                    <p className="text-xs text-muted-foreground">
                      Used when no profile is specified
                    </p>
                  </div>
                  <Switch
                    id="is_default"
                    checked={formData.is_default}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_active">Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Inactive profiles cannot be assigned to new cases
                    </p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editingProfile ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!profiles?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No pricing profiles yet.</p>
            <p className="text-sm">Create your first profile to define client-specific billing rules.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{profile.name}</span>
                    {profile.is_default && (
                      <Badge variant="secondary" className="gap-1">
                        <Star className="h-3 w-3" />
                        Default
                      </Badge>
                    )}
                    {!profile.is_active && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  {profile.description && (
                    <p className="text-sm text-muted-foreground">{profile.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRulesEditorProfile(profile)}
                  >
                    <Settings2 className="h-4 w-4 mr-2" />
                    Configure Rules
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(profile)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteProfileId(profile.id)}
                    disabled={profile.is_default}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <AlertDialog open={!!deleteProfileId} onOpenChange={() => setDeleteProfileId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Pricing Profile?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this pricing profile and all associated pricing rules.
                Cases already using this profile will retain their pricing history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteProfileId && deleteMutation.mutate(deleteProfileId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Service Pricing Rules Editor */}
        {rulesEditorProfile && (
          <ServicePricingRulesEditor
            profileId={rulesEditorProfile.id}
            profileName={rulesEditorProfile.name}
            isOpen={!!rulesEditorProfile}
            onClose={() => setRulesEditorProfile(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
