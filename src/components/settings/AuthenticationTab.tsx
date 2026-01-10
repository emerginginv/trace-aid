import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Shield, Key, Users, Settings, Plus, Trash2, Copy, RefreshCw, Lock, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface SSOConfig {
  configured: boolean;
  is_enterprise: boolean;
  id?: string;
  provider?: string;
  idp_name?: string;
  issuer_url?: string;
  client_id?: string;
  sso_login_url?: string;
  enabled?: boolean;
  enforce_sso?: boolean;
  default_role?: string;
  created_at?: string;
  updated_at?: string;
}

interface SCIMConfig {
  configured: boolean;
  is_enterprise: boolean;
  id?: string;
  enabled?: boolean;
  endpoint_url?: string;
  created_at?: string;
  rotated_at?: string;
}

interface RoleMapping {
  id: string;
  idp_group_name: string;
  app_role: string;
  priority: number;
}

interface SCIMLog {
  id: string;
  action: string;
  target_email: string;
  external_id: string | null;
  role_assigned: string | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

interface IdentityDashboard {
  is_enterprise: boolean;
  sso: SSOConfig;
  scim: SCIMConfig;
  role_mappings: RoleMapping[];
  recent_logs: SCIMLog[];
  stats: {
    total_provisioned: number;
    total_deprovisioned: number;
  };
}

export function AuthenticationTab() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("sso");
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [showAddMappingDialog, setShowAddMappingDialog] = useState(false);
  const [newMapping, setNewMapping] = useState({ idp_group_name: "", app_role: "member", priority: 0 });
  
  // SSO Configuration Form State
  const [ssoForm, setSsoForm] = useState({
    provider: "oidc",
    idp_name: "",
    issuer_url: "",
    client_id: "",
    client_secret: "",
    sso_login_url: "",
    certificate: "",
    default_role: "member",
  });

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['identity-dashboard', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
      const { data, error } = await supabase.rpc('get_identity_dashboard', {
        p_org_id: organization.id,
      });
      if (error) throw error;
      return data as unknown as IdentityDashboard;
    },
    enabled: !!organization?.id,
  });

  // SSO Mutations
  const configureSSOmutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('configure_sso', {
        p_org_id: organization!.id,
        p_provider: ssoForm.provider,
        p_idp_name: ssoForm.idp_name,
        p_issuer_url: ssoForm.issuer_url,
        p_client_id: ssoForm.client_id,
        p_client_secret: ssoForm.client_secret || null,
        p_sso_login_url: ssoForm.sso_login_url || null,
        p_certificate: ssoForm.certificate || null,
        p_default_role: ssoForm.default_role,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("SSO configuration saved");
      queryClient.invalidateQueries({ queryKey: ['identity-dashboard'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleSSOMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data, error } = await supabase.rpc('toggle_sso', {
        p_org_id: organization!.id,
        p_enabled: enabled,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, enabled) => {
      toast.success(`SSO ${enabled ? 'enabled' : 'disabled'}`);
      queryClient.invalidateQueries({ queryKey: ['identity-dashboard'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleEnforceSSOmutation = useMutation({
    mutationFn: async (enforce: boolean) => {
      const { data, error } = await supabase.rpc('toggle_enforce_sso', {
        p_org_id: organization!.id,
        p_enforce: enforce,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, enforce) => {
      toast.success(`Password login ${enforce ? 'hidden' : 'visible'}`);
      queryClient.invalidateQueries({ queryKey: ['identity-dashboard'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // SCIM Mutations
  const generateSCIMTokenMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('generate_scim_token', {
        p_org_id: organization!.id,
      });
      if (error) throw error;
      return data as unknown as { success: boolean; token: string; endpoint_url: string };
    },
    onSuccess: (data) => {
      setGeneratedToken(data.token);
      setShowTokenDialog(true);
      queryClient.invalidateQueries({ queryKey: ['identity-dashboard'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleSCIMMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data, error } = await supabase.rpc('toggle_scim', {
        p_org_id: organization!.id,
        p_enabled: enabled,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, enabled) => {
      toast.success(`SCIM ${enabled ? 'enabled' : 'disabled'}`);
      queryClient.invalidateQueries({ queryKey: ['identity-dashboard'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Role Mapping Mutations
  const addRoleMappingMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('add_role_mapping', {
        p_org_id: organization!.id,
        p_idp_group_name: newMapping.idp_group_name,
        p_app_role: newMapping.app_role,
        p_priority: newMapping.priority,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Role mapping added");
      setShowAddMappingDialog(false);
      setNewMapping({ idp_group_name: "", app_role: "member", priority: 0 });
      queryClient.invalidateQueries({ queryKey: ['identity-dashboard'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteRoleMappingMutation = useMutation({
    mutationFn: async (mappingId: string) => {
      const { data, error } = await supabase.rpc('delete_role_mapping', {
        p_mapping_id: mappingId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Role mapping deleted");
      queryClient.invalidateQueries({ queryKey: ['identity-dashboard'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // Initialize form with existing config
  const initializeForm = () => {
    if (dashboard?.sso?.configured) {
      setSsoForm({
        provider: dashboard.sso.provider || "oidc",
        idp_name: dashboard.sso.idp_name || "",
        issuer_url: dashboard.sso.issuer_url || "",
        client_id: dashboard.sso.client_id || "",
        client_secret: "",
        sso_login_url: dashboard.sso.sso_login_url || "",
        certificate: "",
        default_role: dashboard.sso.default_role || "member",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!dashboard?.is_enterprise) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Enterprise Authentication</CardTitle>
          </div>
          <CardDescription>
            SSO and SCIM provisioning are available on Enterprise plans
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Upgrade to Enterprise</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Unlock enterprise identity features including Single Sign-On (SSO), 
              SCIM user provisioning, and advanced security controls.
            </p>
            <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                SAML/OIDC SSO
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                SCIM Provisioning
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Role Mapping
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Audit Logging
              </div>
            </div>
            <Button>
              <ExternalLink className="h-4 w-4 mr-2" />
              Contact Sales
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">SSO Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {dashboard.sso?.enabled ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-semibold">Enabled</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <span className="font-semibold">Disabled</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">SCIM Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {dashboard.scim?.enabled ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-semibold">Enabled</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <span className="font-semibold">Disabled</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Users Provisioned</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{dashboard.stats?.total_provisioned || 0}</span>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Users Deprovisioned</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{dashboard.stats?.total_deprovisioned || 0}</span>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sso" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Single Sign-On
          </TabsTrigger>
          <TabsTrigger value="scim" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            SCIM Provisioning
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Role Mapping
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Activity Logs
          </TabsTrigger>
        </TabsList>

        {/* SSO Tab */}
        <TabsContent value="sso" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Single Sign-On Configuration</CardTitle>
                  <CardDescription>
                    Configure SSO with your identity provider (Okta, Azure AD, Google, etc.)
                  </CardDescription>
                </div>
                {dashboard.sso?.configured && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="sso-enabled">SSO Enabled</Label>
                      <Switch
                        id="sso-enabled"
                        checked={dashboard.sso?.enabled || false}
                        onCheckedChange={(checked) => toggleSSOMutation.mutate(checked)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="provider">Protocol</Label>
                  <Select
                    value={ssoForm.provider}
                    onValueChange={(v) => setSsoForm({ ...ssoForm, provider: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oidc">OpenID Connect (OIDC)</SelectItem>
                      <SelectItem value="saml">SAML 2.0</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="idp_name">Identity Provider</Label>
                  <Input
                    id="idp_name"
                    placeholder="e.g., Okta, Azure AD, Google"
                    value={ssoForm.idp_name}
                    onChange={(e) => setSsoForm({ ...ssoForm, idp_name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="issuer_url">Issuer URL</Label>
                  <Input
                    id="issuer_url"
                    placeholder="https://your-idp.com/oauth2/issuer"
                    value={ssoForm.issuer_url}
                    onChange={(e) => setSsoForm({ ...ssoForm, issuer_url: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="client_id">Client ID</Label>
                  <Input
                    id="client_id"
                    placeholder="Your OAuth client ID"
                    value={ssoForm.client_id}
                    onChange={(e) => setSsoForm({ ...ssoForm, client_id: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="client_secret">Client Secret</Label>
                  <Input
                    id="client_secret"
                    type="password"
                    placeholder={dashboard.sso?.configured ? "••••••••" : "Your client secret"}
                    value={ssoForm.client_secret}
                    onChange={(e) => setSsoForm({ ...ssoForm, client_secret: e.target.value })}
                  />
                  {dashboard.sso?.configured && (
                    <p className="text-xs text-muted-foreground">Leave blank to keep existing</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sso_login_url">SSO Login URL (optional)</Label>
                  <Input
                    id="sso_login_url"
                    placeholder="https://your-idp.com/login"
                    value={ssoForm.sso_login_url}
                    onChange={(e) => setSsoForm({ ...ssoForm, sso_login_url: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="default_role">Default Role for New Users</Label>
                  <Select
                    value={ssoForm.default_role}
                    onValueChange={(v) => setSsoForm({ ...ssoForm, default_role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {ssoForm.provider === "saml" && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="certificate">SAML Certificate (PEM format)</Label>
                    <textarea
                      id="certificate"
                      className="w-full min-h-[100px] p-2 border rounded-md font-mono text-sm"
                      placeholder="-----BEGIN CERTIFICATE-----..."
                      value={ssoForm.certificate}
                      onChange={(e) => setSsoForm({ ...ssoForm, certificate: e.target.value })}
                    />
                  </div>
                )}
              </div>
              
              {dashboard.sso?.configured && dashboard.sso?.enabled && (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="enforce-sso"
                      checked={dashboard.sso?.enforce_sso || false}
                      onCheckedChange={(checked) => toggleEnforceSSOmutation.mutate(checked)}
                    />
                    <Label htmlFor="enforce-sso">
                      Enforce SSO (hide password login)
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    When enabled, users must authenticate via SSO. Password login will be hidden.
                  </p>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button 
                  onClick={() => configureSSOmutation.mutate()}
                  disabled={!ssoForm.idp_name || !ssoForm.issuer_url || !ssoForm.client_id}
                >
                  Save SSO Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SCIM Tab */}
        <TabsContent value="scim" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>SCIM Provisioning</CardTitle>
                  <CardDescription>
                    Automatically provision and deprovision users from your identity provider
                  </CardDescription>
                </div>
                {dashboard.scim?.configured && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="scim-enabled">SCIM Enabled</Label>
                    <Switch
                      id="scim-enabled"
                      checked={dashboard.scim?.enabled || false}
                      onCheckedChange={(checked) => toggleSCIMMutation.mutate(checked)}
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboard.scim?.configured ? (
                <>
                  <div className="p-4 rounded-lg bg-muted space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">SCIM Endpoint URL</Label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-background rounded text-sm font-mono">
                          {window.location.origin}{dashboard.scim.endpoint_url}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(`${window.location.origin}${dashboard.scim?.endpoint_url}`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {dashboard.scim.rotated_at && (
                      <p className="text-sm text-muted-foreground">
                        Token last rotated: {format(new Date(dashboard.scim.rotated_at), "PPp")}
                      </p>
                    )}
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Rotate SCIM Token
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Rotate SCIM Token?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will invalidate the current token. You'll need to update your IdP configuration with the new token.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => generateSCIMTokenMutation.mutate()}>
                          Rotate Token
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Enable SCIM Provisioning</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate a SCIM token to enable automatic user provisioning from your IdP.
                  </p>
                  <Button onClick={() => generateSCIMTokenMutation.mutate()}>
                    <Key className="h-4 w-4 mr-2" />
                    Generate SCIM Token
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Token Dialog */}
          <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>SCIM Token Generated</DialogTitle>
                <DialogDescription>
                  Copy this token now. It will not be shown again.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted">
                  <code className="break-all font-mono text-sm">{generatedToken}</code>
                </div>
                <Button className="w-full" onClick={() => copyToClipboard(generatedToken || "")}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Token
                </Button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowTokenDialog(false)}>
                  Done
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Role Mapping Tab */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Role Mapping</CardTitle>
                  <CardDescription>
                    Map IdP groups to application roles
                  </CardDescription>
                </div>
                <Dialog open={showAddMappingDialog} onOpenChange={setShowAddMappingDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Mapping
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Role Mapping</DialogTitle>
                      <DialogDescription>
                        Map an IdP group to an application role
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="group_name">IdP Group Name</Label>
                        <Input
                          id="group_name"
                          placeholder="e.g., CaseWyze-Admins"
                          value={newMapping.idp_group_name}
                          onChange={(e) => setNewMapping({ ...newMapping, idp_group_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Application Role</Label>
                        <Select
                          value={newMapping.app_role}
                          onValueChange={(v) => setNewMapping({ ...newMapping, app_role: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Input
                          id="priority"
                          type="number"
                          min={0}
                          value={newMapping.priority}
                          onChange={(e) => setNewMapping({ ...newMapping, priority: parseInt(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Higher priority mappings are checked first
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddMappingDialog(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => addRoleMappingMutation.mutate()}
                        disabled={!newMapping.idp_group_name}
                      >
                        Add Mapping
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {(dashboard.role_mappings?.length || 0) > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IdP Group</TableHead>
                      <TableHead>Application Role</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard.role_mappings?.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell className="font-mono">{mapping.idp_group_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{mapping.app_role}</Badge>
                        </TableCell>
                        <TableCell>{mapping.priority}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteRoleMappingMutation.mutate(mapping.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No role mappings configured.</p>
                  <p className="text-sm">Users will be assigned the default role when provisioned via SSO/SCIM.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SCIM Activity Logs</CardTitle>
              <CardDescription>
                Recent user provisioning and deprovisioning events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(dashboard.recent_logs?.length || 0) > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard.recent_logs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant={
                            log.action === 'create' ? 'default' :
                            log.action === 'deactivate' ? 'destructive' : 'secondary'
                          }>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.target_email}</TableCell>
                        <TableCell>{log.role_assigned || '-'}</TableCell>
                        <TableCell>
                          {log.success ? (
                            <Badge variant="outline" className="text-green-600">Success</Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600">Failed</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(log.created_at), "PPp")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No SCIM activity yet.</p>
                  <p className="text-sm">Events will appear here when users are provisioned or deprovisioned.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
