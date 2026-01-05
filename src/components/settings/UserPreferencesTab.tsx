import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const profileSchema = z.object({
  full_name: z.string().trim().max(100, "Name must be less than 100 characters"),
  username: z.string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
});

interface UserPreferencesTabProps {
  currentUserId: string | null;
  fullName: string;
  setFullName: (value: string) => void;
  username: string;
  setUsername: (value: string) => void;
  email: string;
  notificationEmail: boolean;
  setNotificationEmail: (value: boolean) => void;
  notificationPush: boolean;
  setNotificationPush: (value: boolean) => void;
}

export function UserPreferencesTab({
  currentUserId,
  fullName,
  setFullName,
  username,
  setUsername,
  email,
  notificationEmail,
  setNotificationEmail,
  notificationPush,
  setNotificationPush,
}: UserPreferencesTabProps) {
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);

  const saveUserPreferences = async () => {
    try {
      const validation = profileSchema.safeParse({
        full_name: fullName,
        username: username,
        email: email,
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      setSaving(true);

      if (!currentUserId) return;

      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.trim())
        .neq("id", currentUserId)
        .maybeSingle();

      if (existingUser) {
        toast.error("This username is already taken. Please choose another.");
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          username: username.trim(),
          notification_email: notificationEmail,
          notification_push: notificationPush,
        })
        .eq("id", currentUserId);

      if (error) throw error;

      toast.success("User preferences saved successfully");
    } catch (error: any) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChange = async () => {
    try {
      const emailValidation = z.string().email("Invalid email address").safeParse(newEmail);
      if (!emailValidation.success) {
        toast.error(emailValidation.error.errors[0].message);
        return;
      }

      if (newEmail === email) {
        toast.error("New email must be different from current email");
        return;
      }

      setChangingEmail(true);

      const { error } = await supabase.functions.invoke('request-email-change', {
        body: { newEmail }
      });

      if (error) throw error;

      toast.success("Confirmation email sent to your current email address. Please check your inbox to complete the change.");
      setNewEmail("");
    } catch (error: any) {
      console.error("Error changing email:", error);
      toast.error(error.message || "Failed to change email");
    } finally {
      setChangingEmail(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Preferences</CardTitle>
        <CardDescription>
          Update your personal information and notification settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Username can only contain letters, numbers, and underscores
            </p>
          </div>

          <div>
            <Label htmlFor="email">Current Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2 pt-2">
            <Label htmlFor="newEmail">Change Email Address</Label>
            <div className="flex gap-2">
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email address"
                disabled={changingEmail}
              />
              <Button 
                onClick={handleEmailChange} 
                disabled={changingEmail || !newEmail}
                variant="outline"
              >
                {changingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Change Email
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              A confirmation email will be sent to your current email address. 
              You must click the link in that email to complete the change.
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-medium">Notification Preferences</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="emailNotif">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive email reminders for tasks and updates
              </p>
            </div>
            <Switch
              id="emailNotif"
              checked={notificationEmail}
              onCheckedChange={setNotificationEmail}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="pushNotif">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive in-app notifications for tasks and updates
              </p>
            </div>
            <Switch
              id="pushNotif"
              checked={notificationPush}
              onCheckedChange={setNotificationPush}
            />
          </div>
        </div>

        <Button onClick={saveUserPreferences} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Preferences
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
