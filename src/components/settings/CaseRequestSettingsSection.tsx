import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, Loader2, FileInput } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

export function CaseRequestSettingsSection() {
  const { organization } = useOrganization();
  const [defaultInstructions, setDefaultInstructions] = useState("");
  const [notificationEmails, setNotificationEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      const { error } = await supabase
        .from("organization_settings")
        .upsert({
          organization_id: organization.id,
          case_request_default_instructions: defaultInstructions || null,
          case_request_notification_emails: notificationEmails.length > 0 ? notificationEmails : null,
        } as any, {
          onConflict: "organization_id",
        });

      if (error) throw error;

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
              placeholder="Enter email address"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button type="button" variant="outline" onClick={addEmail}>
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
            These email addresses will receive notifications for all new case request submissions.
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
