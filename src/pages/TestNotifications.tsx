import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";

export default function TestNotifications() {
  useSetBreadcrumbs([
    { label: "Settings", href: "/settings" },
    { label: "Test Notifications" },
  ]);
  
  const createTestNotification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!orgMember) {
        toast.error("No organization found");
        return;
      }

      const { error } = await supabase.from("notifications").insert({
        user_id: user.id,
        organization_id: orgMember.organization_id,
        type: "test",
        title: "Test Notification",
        message: "This is a test notification to verify the real-time system is working!",
        priority: "high",
        link: "/dashboard",
        read: false,
      });

      if (error) throw error;
      
      toast.success("Test notification created! Check the bell icon.");
    } catch (error) {
      console.error("Error creating test notification:", error);
      toast.error("Failed to create test notification");
    }
  };

  const checkNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!orgMember) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("organization_id", orgMember.organization_id)
        .order("timestamp", { ascending: false });

      if (error) throw error;

      console.log("All notifications:", data);
      toast.info(`You have ${data?.length || 0} total notifications`);
    } catch (error) {
      console.error("Error checking notifications:", error);
    }
  };

  const checkOrgMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!orgMember) return;

      const { data, error } = await supabase
        .from("organization_members")
        .select("user_id, role")
        .eq("organization_id", orgMember.organization_id);

      if (error) throw error;

      console.log("Organization members:", data);
      toast.info(`Your organization has ${data?.length || 0} members`);
    } catch (error) {
      console.error("Error checking org members:", error);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Notification System</CardTitle>
          <CardDescription>
            Use these buttons to test and debug the notification system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Important Notes:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Notifications are NOT sent to the person who performs the action</li>
              <li>If you're the only member, you won't see notifications for your own actions</li>
              <li>Invite another user to test cross-user notifications</li>
              <li>The test button below creates a notification FOR YOU to verify real-time updates</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={createTestNotification} className="w-full">
              Create Test Notification (For Me)
            </Button>
            
            <Button onClick={checkNotifications} variant="outline" className="w-full">
              Check All My Notifications (Console)
            </Button>
            
            <Button onClick={checkOrgMembers} variant="outline" className="w-full">
              Check Organization Members (Console)
            </Button>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">How to Test Properly:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Click "Create Test Notification" - you should see it appear instantly</li>
              <li>Go to Settings → invite another user to your organization</li>
              <li>Create a case - the other user should get notified (not you)</li>
              <li>Have the other user create a case - you should get notified</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
