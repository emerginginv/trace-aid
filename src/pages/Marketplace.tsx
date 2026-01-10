import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  Package, 
  CheckCircle2, 
  ExternalLink, 
  Shield, 
  MessageSquare, 
  HardDrive, 
  BarChart3, 
  Scale, 
  CreditCard, 
  Zap,
  Lock
} from "lucide-react";
import { toast } from "sonner";

type Integration = {
  id: string;
  name: string;
  slug: string;
  provider: string;
  category: string;
  description: string;
  logo_url: string | null;
  auth_type: string;
  default_scopes: string[];
  available_scopes: string[];
  is_first_party: boolean;
  required_plan: string;
};

type InstalledIntegration = {
  integration_id: string;
  status: string;
  scopes_granted: string[];
};

const categoryIcons: Record<string, React.ReactNode> = {
  communications: <MessageSquare className="h-5 w-5" />,
  storage: <HardDrive className="h-5 w-5" />,
  analytics: <BarChart3 className="h-5 w-5" />,
  legal: <Scale className="h-5 w-5" />,
  payments: <CreditCard className="h-5 w-5" />,
  productivity: <Zap className="h-5 w-5" />,
  security: <Shield className="h-5 w-5" />,
};

const categoryLabels: Record<string, string> = {
  communications: "Communications",
  storage: "Storage",
  analytics: "Analytics",
  legal: "Legal",
  payments: "Payments",
  productivity: "Productivity",
  security: "Security",
};

export default function Marketplace() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [installDialog, setInstallDialog] = useState<Integration | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Integration[];
    },
  });

  const { data: installedIntegrations = [] } = useQuery({
    queryKey: ["installed-integrations", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("organization_integrations")
        .select("integration_id, status, scopes_granted")
        .eq("organization_id", organization.id);
      if (error) throw error;
      return data as InstalledIntegration[];
    },
    enabled: !!organization?.id,
  });

  const installMutation = useMutation({
    mutationFn: async ({ integrationId, scopes }: { integrationId: string; scopes: string[] }) => {
      const { data, error } = await supabase.rpc("install_integration", {
        p_organization_id: organization?.id,
        p_integration_id: integrationId,
        p_scopes: scopes,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Integration installed successfully");
      queryClient.invalidateQueries({ queryKey: ["installed-integrations"] });
      setInstallDialog(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
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
      queryClient.invalidateQueries({ queryKey: ["installed-integrations"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filteredIntegrations = integrations.filter((integration) => {
    const matchesSearch =
      integration.name.toLowerCase().includes(search.toLowerCase()) ||
      integration.description?.toLowerCase().includes(search.toLowerCase()) ||
      integration.provider.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "all" || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...new Set(integrations.map((i) => i.category))];

  const getInstallStatus = (integrationId: string) => {
    const installed = installedIntegrations.find((i) => i.integration_id === integrationId);
    return installed?.status || null;
  };

  const canInstall = (integration: Integration) => {
    const tier = organization?.subscription_tier || "free";
    if (integration.required_plan === "enterprise" && tier !== "pro") {
      return false;
    }
    if (integration.required_plan === "standard" && tier === "free") {
      return false;
    }
    return true;
  };

  const openInstallDialog = (integration: Integration) => {
    setSelectedScopes(integration.default_scopes);
    setInstallDialog(integration);
  };

  const handleInstall = () => {
    if (!installDialog) return;
    installMutation.mutate({
      integrationId: installDialog.id,
      scopes: selectedScopes,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
          <p className="text-muted-foreground">
            Browse and install integrations to extend CaseWyze
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search integrations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.filter((c) => c !== "all").map((category) => (
              <TabsTrigger key={category} value={category} className="gap-2">
                {categoryIcons[category]}
                {categoryLabels[category] || category}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-6">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-muted rounded w-2/3" />
                      <div className="h-4 bg-muted rounded w-1/3 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-12 bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredIntegrations.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No integrations found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredIntegrations.map((integration) => {
                  const status = getInstallStatus(integration.id);
                  const installed = status === "installed";
                  const disabled = status === "disabled";
                  const eligible = canInstall(integration);

                  return (
                    <Card key={integration.id} className="flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted">
                              {categoryIcons[integration.category] || <Package className="h-5 w-5" />}
                            </div>
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                {integration.name}
                                {integration.is_first_party && (
                                  <Badge variant="secondary" className="text-xs">
                                    Official
                                  </Badge>
                                )}
                              </CardTitle>
                              <CardDescription>{integration.provider}</CardDescription>
                            </div>
                          </div>
                          {installed && (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <p className="text-sm text-muted-foreground flex-1">
                          {integration.description}
                        </p>
                        <div className="mt-4 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {integration.auth_type === "oauth" ? "OAuth" : 
                             integration.auth_type === "api_key" ? "API Key" : "Webhook"}
                          </Badge>
                          {integration.required_plan === "enterprise" && (
                            <Badge variant="outline" className="text-xs">
                              Enterprise
                            </Badge>
                          )}
                        </div>
                        <div className="mt-4 flex gap-2">
                          {installed ? (
                            <>
                              <Button variant="outline" size="sm" className="flex-1" asChild>
                                <a href={`/settings?tab=integrations`}>
                                  Configure
                                </a>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => disableMutation.mutate(integration.id)}
                              >
                                Disable
                              </Button>
                            </>
                          ) : disabled ? (
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => openInstallDialog(integration)}
                            >
                              Re-enable
                            </Button>
                          ) : !eligible ? (
                            <Button size="sm" variant="outline" className="flex-1" disabled>
                              <Lock className="h-4 w-4 mr-2" />
                              Upgrade Required
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => openInstallDialog(integration)}
                            >
                              Install
                            </Button>
                          )}
                          {integration.is_first_party && (
                            <Button variant="ghost" size="icon" asChild>
                              <a href="#" target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Install Dialog */}
        <Dialog open={!!installDialog} onOpenChange={() => setInstallDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Install {installDialog?.name}</DialogTitle>
              <DialogDescription>
                Review and approve the permissions this integration requires.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Permissions</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Select which permissions to grant this integration. Default permissions are pre-selected.
                </p>
                <div className="space-y-2">
                  {installDialog?.available_scopes.map((scope) => (
                    <div key={scope} className="flex items-center space-x-2">
                      <Checkbox
                        id={scope}
                        checked={selectedScopes.includes(scope)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedScopes([...selectedScopes, scope]);
                          } else {
                            setSelectedScopes(selectedScopes.filter((s) => s !== scope));
                          }
                        }}
                      />
                      <Label htmlFor={scope} className="text-sm font-mono">
                        {scope}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>Security Note:</strong> Only grant permissions that are necessary. 
                  You can modify these later in Settings → Integrations.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setInstallDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleInstall}
                disabled={installMutation.isPending || selectedScopes.length === 0}
              >
                {installMutation.isPending ? "Installing..." : "Install Integration"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
