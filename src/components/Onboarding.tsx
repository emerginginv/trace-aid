import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Users, Briefcase, ArrowRight } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";

export function Onboarding() {
  const navigate = useNavigate();
  const { refreshOrganization } = useOrganization();
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [caseName, setCaseName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdateOrgName = async () => {
    if (!orgName.trim()) {
      toast.error("Please enter an organization name");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user's organization
      const { data: memberData } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!memberData) throw new Error("No organization found");

      const { error } = await supabase
        .from("organizations")
        .update({ name: orgName })
        .eq("id", memberData.organization_id);

      if (error) throw error;

      await refreshOrganization();
      toast.success("Organization name updated!");
      setStep(2);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipInvite = () => {
    setStep(3);
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      handleSkipInvite();
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: memberData } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!memberData) throw new Error("No organization found");

      const { error } = await supabase
        .from("organization_invites")
        .insert({
          organization_id: memberData.organization_id,
          email: inviteEmail,
          role: "member",
          invited_by: user.id,
        });

      if (error) throw error;

      toast.success("Invitation sent!");
      setStep(3);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async () => {
    if (!caseName.trim()) {
      navigate("/dashboard");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: memberData } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!memberData) throw new Error("No organization found");

      const { error } = await supabase
        .from("cases")
        .insert({
          title: caseName,
          case_number: `CASE-${Date.now()}`,
          user_id: user.id,
          organization_id: memberData.organization_id,
        });

      if (error) throw error;

      toast.success("First case created!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to PI Case Manager</CardTitle>
          <CardDescription>Let's get your account set up in just a few steps</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Building2 className="w-5 h-5" />
                <h3 className="font-semibold">Step 1: Organization Name</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  placeholder="Enter your organization name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <Button onClick={handleUpdateOrgName} disabled={loading} className="w-full">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Users className="w-5 h-5" />
                <h3 className="font-semibold">Step 2: Invite Team Members (Optional)</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Email Address</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSkipInvite} variant="outline" className="flex-1">
                  Skip
                </Button>
                <Button onClick={handleInviteUser} disabled={loading} className="flex-1">
                  Send Invite <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Briefcase className="w-5 h-5" />
                <h3 className="font-semibold">Step 3: Create Your First Case (Optional)</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="caseName">Case Title</Label>
                <Input
                  id="caseName"
                  placeholder="Enter your first case title"
                  value={caseName}
                  onChange={(e) => setCaseName(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => navigate("/dashboard")} variant="outline" className="flex-1">
                  Skip
                </Button>
                <Button onClick={handleCreateCase} disabled={loading} className="flex-1">
                  Create Case <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
