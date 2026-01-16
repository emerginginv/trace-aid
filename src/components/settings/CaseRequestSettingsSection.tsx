import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, Loader2, FileInput, Users, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { useOrganizationProfilesQuery } from "@/hooks/queries/useProfilesQuery";

export function CaseRequestSettingsSection() {
  const { organization } = useOrganization();
  const [defaultInstructions, setDefaultInstructions] = useState("");
  const [notificationEmails, setNotificationEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  
  const { data: profiles = [] } = useOrganizationProfilesQuery();

  useEffect(() => {
    if (organization?.id) {
      fetchSettings();
    }
  }, [organization?.id]);

  const fetchSettings = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("case_request_default_instructions, case_request_notification_emails")
        .eq("organization_id", organization.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDefaultInstructions((data as any).case_request_default_instructions || "");
        setNotificationEmails((data as any).case_request_notification_emails || []);
      }
    } catch (error) {
      console.error("Error fetching case request settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organization?.id) return;

    setSaving(true);
    try {
      // First try to update existing row
      const { data: existingData, error: selectError } = await supabase
        .from("organization_settings")
        .select("id")
        .eq("organization_id", organization.id)
        .maybeSingle();

      if (selectError) throw selectError;

      if (existingData) {
        // Update existing row
        const { error } = await supabase
          .from("organization_settings")
          .update({
            case_request_default_instructions: defaultInstructions || null,
            case_request_notification_emails: notificationEmails.length > 0 ? notificationEmails : null,
          } as any)
          .eq("organization_id", organization.id);

        if (error) throw error;
      } else {
        // Insert new row - need to get current user for user_id field
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { error } = await supabase
          .from("organization_settings")
          .insert({
            organization_id: organization.id,
            user_id: user.id,
            case_request_default_instructions: defaultInstructions || null,
            case_request_notification_emails: notificationEmails.length > 0 ? notificationEmails : null,
          } as any);

        if (error) throw error;
      }

      toast.success("Case request settings saved");
    } catch (error) {
      console.error("Error saving case request settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (notificationEmails.includes(email)) {
      toast.error("This email is already added");
      return;
    }

    setNotificationEmails([...notificationEmails, email]);
    setNewEmail("");
  };

  const removeEmail = (emailToRemove: string) => {
    setNotificationEmails(notificationEmails.filter(email => email !== emailToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEmail();
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const addSelectedUsers = () => {
    const selectedProfiles = profiles.filter(p => selectedUserIds.has(p.id));
    const newEmails: string[] = [];
    let duplicateCount = 0;

    selectedProfiles.forEach(profile => {
      const email = profile.email.toLowerCase();
      if (!notificationEmails.includes(email)) {
        newEmails.push(email);
      } else {
        duplicateCount++;
      }
    });

    if (newEmails.length > 0) {
      setNotificationEmails([...notificationEmails, ...newEmails]);
      toast.success(`Added ${newEmails.length} recipient${newEmails.length > 1 ? 's' : ''}`);
    }
    
    if (duplicateCount > 0) {
      toast.info(`${duplicateCount} email${duplicateCount > 1 ? 's were' : ' was'} already in the list`);
    }

    setSelectedUserIds(new Set());
    setUserPickerOpen(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileInput className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Case Request Settings</CardTitle>
        </div>
        <CardDescription>
          Configure default settings for public case request forms
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="default-instructions">Default Form Instructions</Label>
          <Textarea
            id="default-instructions"
            placeholder="Enter default instructions that will appear on all public request forms..."
            value={defaultInstructions}
            onChange={(e) => setDefaultInstructions(e.target.value)}
            className="min-h-[100px]"
          />
          <p className="text-sm text-muted-foreground">
            These instructions will be shown at the top of public intake forms unless overridden.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notification-emails">Default Notification Recipients</Label>
          <div className="flex gap-2">
            <Input
              id="notification-emails"
              type="email"
              placeholder="Enter external email address"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" title="Add team members">
                  <Users className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search team members..." />
                  <CommandList>
                    <CommandEmpty>No team members found.</CommandEmpty>
                    <CommandGroup>
                      {profiles.map((profile) => {
                        const isSelected = selectedUserIds.has(profile.id);
                        const isAlreadyAdded = notificationEmails.includes(profile.email.toLowerCase());
                        
                        return (
                          <CommandItem
                            key={profile.id}
                            value={`${profile.full_name || ''} ${profile.email}`}
                            onSelect={() => !isAlreadyAdded && toggleUserSelection(profile.id)}
                            className={isAlreadyAdded ? "opacity-50" : ""}
                          >
                            <div className="flex items-center gap-3 w-full">
                              <Checkbox
                                checked={isSelected || isAlreadyAdded}
                                disabled={isAlreadyAdded}
                                className="pointer-events-none"
                              />
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="font-medium truncate">
                                  {profile.full_name || "Unknown"}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {profile.email}
                                </span>
                              </div>
                              {isAlreadyAdded && (
                                <Check className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
                <div className="p-2 border-t">
                  <Button
                    onClick={addSelectedUsers}
                    disabled={selectedUserIds.size === 0}
                    className="w-full"
                    size="sm"
                  >
                    Add {selectedUserIds.size > 0 ? `${selectedUserIds.size} Selected` : "Selected"}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button type="button" variant="outline" onClick={addEmail} title="Add custom email">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {notificationEmails.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {notificationEmails.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1">
                  {email}
                  <button
                    type="button"
                    onClick={() => removeEmail(email)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Click the team icon to select organization members, or enter external email addresses manually.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
