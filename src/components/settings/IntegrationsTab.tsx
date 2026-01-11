import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Package, 
  Key, 
  Webhook, 
  Plus, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff,
  Settings2,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type InstalledIntegration = {
  id: string;
  integration_id: string;
  status: string;
  scopes_granted: string[];
  installed_at: string;
  last_used_at: string | null;
  integration: {
    name: string;
    slug: string;
    provider: string;
    auth_type: string;
  };
};

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

type WebhookType = {
  id: string;
  name: string;
  event_types: string[];
  endpoint_url: string;
  enabled: boolean;
  failure_count: number;
  last_triggered_at: string | null;
  created_at: string;
};

export function IntegrationsTab() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("installed");
  const [newApiKeyDialog, setNewApiKeyDialog] = useState(false);
  const [newWebhookDialog, setNewWebhookDialog] = useState(false);
  const [createdKey, setCreatedKey] = useState<{ key: string; id: string } | null>(null);
  const [createdWebhookSecret, setCreatedWebhookSecret] = useState<{ secret: string; id: string } | null>(null);
  const [showKey, setShowKey] = useState(false);

  // Form states
  const [keyName, setKeyName] = useState("");
  const [keyScopes, setKeyScopes] = useState<string[]>(["cases:read"]);
  const [keyExpiry, setKeyExpiry] = useState<string>("never");
  const [webhookName, setWebhookName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["case.created"]);

  const { data: installedIntegrations = [], isLoading: loadingIntegrations } = useQuery({
    queryKey: ["installed-integrations-detail", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("organization_integrations")
        .select(`
          id,
          integration_id,
          status,
          scopes_granted,
          installed_at,
          last_used_at,
          integration:integrations(name, slug, provider, auth_type)
        `)
        .eq("organization_id", organization.id)
        .order("installed_at", { ascending: false });
      if (error) throw error;
      return data as unknown as InstalledIntegration[];
    },
    enabled: !!organization?.id,
  });

  const { data: apiKeys = [], isLoading: loadingKeys } = useQuery({
    queryKey: ["api-keys", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("integration_api_keys")
        .select("*")
        .eq("organization_id", organization.id)
        .is("revoked_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ApiKey[];
    },
    enabled: !!organization?.id,
  });

  const { data: webhooks = [], isLoading: loadingWebhooks } = useQuery({
    queryKey: ["webhooks", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("webhooks")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WebhookType[];
    },
    enabled: !!organization?.id,
  });

  const { data: integrations = [] } = useQuery({
    queryKey: ["integrations-for-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrations")
        .select("id, name")
        .eq("is_active", true)
        .eq("auth_type", "api_key");
      if (error) throw error;
      return data;
    },
  });

  const disableMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const { error } = await supabase.rpc("disable_integration", {
        p_organization_id: organization?.id,
        p_integration_id: integrationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Integration disabled");
      queryClient.invalidateQueries({ queryKey: ["installed-integrations-detail"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createApiKeyMutation = useMutation({
    mutationFn: async () => {
      const expiryDays = keyExpiry === "never" ? null : parseInt(keyExpiry);
      const integrationId = integrations[0]?.id; // Default to first API key integration
      
      const { data, error } = await supabase.rpc("create_integration_api_key", {
        p_organization_id: organization?.id,
        p_integration_id: integrationId,
        p_name: keyName,
        p_scopes: keyScopes,
        p_expires_in_days: expiryDays,
      });
      if (error) throw error;
      return data as { id: string; key: string };
    },
    onSuccess: (data) => {
      setCreatedKey({ key: data.key, id: data.id });
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setKeyName("");
      setKeyScopes(["cases:read"]);
      setKeyExpiry("never");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const revokeApiKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await supabase.rpc("revoke_integration_api_key", {
        p_key_id: keyId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("API key revoked");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createWebhookMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_webhook", {
        p_organization_id: organization?.id,
        p_name: webhookName,
        p_event_types: webhookEvents,
        p_endpoint_url: webhookUrl,
      });
      if (error) throw error;
      return data as { id: string; secret: string };
    },
    onSuccess: (data) => {
      setCreatedWebhookSecret({ secret: data.secret, id: data.id });
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setWebhookName("");
      setWebhookUrl("");
      setWebhookEvents(["case.created"]);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const disableWebhookMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      const { error } = await supabase.rpc("disable_webhook", {
        p_webhook_id: webhookId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Webhook disabled");
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // Comprehensive API scopes organized by category
  const scopeCategories = [
    {
      name: "Cases & Subjects",
      scopes: ["cases:read", "cases:write", "subjects:read", "subjects:write"],
    },
    {
      name: "Activities & Updates",
      scopes: ["activities:read", "activities:write", "updates:read", "updates:write"],
    },
    {
      name: "Files & Documents",
      scopes: ["attachments:read", "attachments:write", "documents:read", "documents:write"],
    },
    {
      name: "Finances",
      scopes: ["finances:read", "finances:write"],
    },
    {
      name: "CRM",
      scopes: ["contacts:read", "contacts:write", "accounts:read", "accounts:write"],
    },
    {
      name: "Other",
      scopes: ["reports:read", "webhooks:manage"],
    },
  ];

  const availableScopes = scopeCategories.flatMap((cat) => cat.scopes);

  // Comprehensive webhook events organized by entity
  const eventCategories = [
    {
      name: "Cases",
      events: ["case.created", "case.updated", "case.closed", "case.deleted"],
    },
    {
      name: "Subjects",
      events: ["subject.created", "subject.updated", "subject.deleted"],
    },
    {
      name: "Activities",
      events: ["activity.created", "activity.updated", "activity.completed", "activity.deleted"],
    },
    {
      name: "Updates & Attachments",
      events: ["update.created", "update.deleted", "attachment.uploaded", "attachment.deleted"],
    },
    {
      name: "Finances",
      events: ["expense.created", "expense.approved", "expense.rejected", "time.logged", "invoice.created", "invoice.paid"],
    },
    {
      name: "CRM",
      events: ["contact.created", "contact.updated", "account.created", "account.updated"],
    },
  ];

  const availableEvents = eventCategories.flatMap((cat) => cat.events);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations & API</CardTitle>
        <CardDescription>
          Manage connected integrations, API keys, and webhooks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="installed" className="gap-2">
              <Package className="h-4 w-4" />
              Installed
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
          </TabsList>

          {/* Installed Integrations */}
          <TabsContent value="installed" className="space-y-4">
            {loadingIntegrations ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : installedIntegrations.length === 0 ? (
              <div className="text-center py-8 border rounded-lg">
                <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">No integrations installed</p>
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" disabled className="gap-2">
                    <Package className="h-4 w-4" />
                    Marketplace
                    <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {installedIntegrations.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.integration?.name}</span>
                          <Badge
                            variant={item.status === "installed" ? "default" : "secondary"}
                          >
                            {item.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.integration?.provider} · Installed{" "}
                          {format(new Date(item.installed_at), "MMM d, yyyy")}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {item.scopes_granted?.slice(0, 3).map((scope) => (
                            <Badge key={scope} variant="outline" className="text-xs">
                              {scope}
                            </Badge>
                          ))}
                          {item.scopes_granted?.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{item.scopes_granted.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Settings2 className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                      {item.status === "installed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => disableMutation.mutate(item.integration_id)}
                        >
                          Disable
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-4">
              <Button variant="outline" disabled className="gap-2">
                <Package className="h-4 w-4" />
                Marketplace
                <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
              </Button>
            </div>
          </TabsContent>

          {/* API Keys */}
          <TabsContent value="api-keys" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Create API keys to access CaseWyze programmatically
              </p>
              <Button size="sm" onClick={() => setNewApiKeyDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Key
              </Button>
            </div>

            {loadingKeys ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8 border rounded-lg">
                <Key className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No API keys created</p>
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{key.name}</span>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">
                          {key.key_prefix}...
                        </code>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Created {format(new Date(key.created_at), "MMM d, yyyy")}
                        {key.expires_at && (
                          <> · Expires {format(new Date(key.expires_at), "MMM d, yyyy")}</>
                        )}
                        {key.last_used_at && (
                          <> · Last used {format(new Date(key.last_used_at), "MMM d, yyyy")}</>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeApiKeyMutation.mutate(key.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Webhooks */}
          <TabsContent value="webhooks" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Receive real-time notifications when events occur
              </p>
              <Button size="sm" onClick={() => setNewWebhookDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Webhook
              </Button>
            </div>

            {loadingWebhooks ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : webhooks.length === 0 ? (
              <div className="text-center py-8 border rounded-lg">
                <Webhook className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No webhooks configured</p>
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{webhook.name}</span>
                        <Badge variant={webhook.enabled ? "default" : "secondary"}>
                          {webhook.enabled ? "Active" : "Disabled"}
                        </Badge>
                        {webhook.failure_count > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {webhook.failure_count} failures
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {webhook.endpoint_url}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {webhook.event_types.map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <Switch
                        checked={webhook.enabled}
                        onCheckedChange={() => {
                          if (webhook.enabled) {
                            disableWebhookMutation.mutate(webhook.id);
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create API Key Dialog */}
        <Dialog open={newApiKeyDialog} onOpenChange={setNewApiKeyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key for programmatic access
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g., Production API Key"
                />
              </div>
              <div>
                <Label>Scopes</Label>
                <div className="space-y-4 mt-2 max-h-64 overflow-y-auto pr-2">
                  {scopeCategories.map((category) => (
                    <div key={category.name}>
                      <p className="text-xs font-medium text-muted-foreground mb-2">{category.name}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {category.scopes.map((scope) => (
                          <label key={scope} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={keyScopes.includes(scope)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setKeyScopes([...keyScopes, scope]);
                                } else {
                                  setKeyScopes(keyScopes.filter((s) => s !== scope));
                                }
                              }}
                              className="rounded"
                            />
                            <code className="text-xs">{scope}</code>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="expiry">Expiration</Label>
                <Select value={keyExpiry} onValueChange={setKeyExpiry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never expires</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewApiKeyDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createApiKeyMutation.mutate()}
                disabled={!keyName || keyScopes.length === 0 || createApiKeyMutation.isPending}
              >
                {createApiKeyMutation.isPending ? "Creating..." : "Create Key"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Created Key Dialog */}
        <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>API Key Created</DialogTitle>
              <DialogDescription>
                Copy your API key now. You won't be able to see it again.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-muted rounded font-mono text-sm break-all">
                  {showKey ? createdKey?.key : "•".repeat(64)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => createdKey && copyToClipboard(createdKey.key)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => { setCreatedKey(null); setNewApiKeyDialog(false); }}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Webhook Dialog */}
        <Dialog open={newWebhookDialog} onOpenChange={setNewWebhookDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Webhook</DialogTitle>
              <DialogDescription>
                Configure a webhook endpoint to receive event notifications
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="webhookName">Name</Label>
                <Input
                  id="webhookName"
                  value={webhookName}
                  onChange={(e) => setWebhookName(e.target.value)}
                  placeholder="e.g., Slack Notifications"
                />
              </div>
              <div>
                <Label htmlFor="webhookUrl">Endpoint URL</Label>
                <Input
                  id="webhookUrl"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-server.com/webhook"
                />
              </div>
              <div>
                <Label>Events</Label>
                <div className="space-y-4 mt-2 max-h-64 overflow-y-auto pr-2">
                  {eventCategories.map((category) => (
                    <div key={category.name}>
                      <p className="text-xs font-medium text-muted-foreground mb-2">{category.name}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {category.events.map((event) => (
                          <label key={event} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={webhookEvents.includes(event)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setWebhookEvents([...webhookEvents, event]);
                                } else {
                                  setWebhookEvents(webhookEvents.filter((ev) => ev !== event));
                                }
                              }}
                              className="rounded"
                            />
                            <code className="text-xs">{event}</code>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewWebhookDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createWebhookMutation.mutate()}
                disabled={!webhookName || !webhookUrl || webhookEvents.length === 0 || createWebhookMutation.isPending}
              >
                {createWebhookMutation.isPending ? "Creating..." : "Create Webhook"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Created Webhook Secret Dialog */}
        <Dialog open={!!createdWebhookSecret} onOpenChange={() => setCreatedWebhookSecret(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Webhook Created</DialogTitle>
              <DialogDescription>
                Copy your webhook secret now. You'll need it to verify webhook signatures.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-muted rounded font-mono text-sm break-all">
                  {showKey ? createdWebhookSecret?.secret : "•".repeat(64)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => createdWebhookSecret && copyToClipboard(createdWebhookSecret.secret)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => { setCreatedWebhookSecret(null); setNewWebhookDialog(false); }}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
