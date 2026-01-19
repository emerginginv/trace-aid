import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Users, Briefcase, ArrowRight, Globe, Copy, Check } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";

export function Onboarding() {
  const navigate = useNavigate();
  const { refreshOrganization, organization } = useOrganization();
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [caseName, setCaseName] = useState("");
  const [loading, setLoading] = useState(false);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch subdomain on mount
  useEffect(() => {
    const fetchSubdomain = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!memberData) return;

      const { data: orgData } = await supabase
        .from("organizations")
        .select("subdomain")
        .eq("id", memberData.organization_id)
        .single();

      if (orgData?.subdomain) {
        setSubdomain(orgData.subdomain);
      }
    };

    fetchSubdomain();
  }, []);

  const portalUrl = subdomain ? `https://${subdomain}.caseinformation.app` : null;

  const copyToClipboard = async () => {
    if (!portalUrl) return;
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      toast.success("URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy URL");
    }
  };

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
      setStep(3);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipInvite = () => {
    setStep(4);
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
      setStep(4);
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
          {step === 1 && portalUrl && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Globe className="w-5 h-5" />
                <h3 className="font-semibold">Your Portal URL</h3>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Your case management portal is available at:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background px-3 py-2 rounded border text-sm font-mono break-all">
                    {portalUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    className="shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Bookmark this URL for quick access. Team members will also use this URL.
                </p>
              </div>
              <Button onClick={() => setStep(2)} className="w-full">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {step === 2 && (
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

          {step === 3 && (
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

          {step === 4 && (
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
