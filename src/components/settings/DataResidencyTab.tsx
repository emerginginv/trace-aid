import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Globe, Lock, Shield, CheckCircle, AlertTriangle, 
  MapPin, Server, Clock, ExternalLink, Info
} from "lucide-react";

interface RegionInfo {
  data_region: string;
  region_locked: boolean;
  region_selected_at: string | null;
  region_display_name: string;
  pending_migration: {
    id: string;
    status: string;
    target_region: string;
    requested_at: string;
  } | null;
}

const REGION_DETAILS = {
  us: {
    name: "United States",
    flag: "🇺🇸",
    description: "Data stored and processed in US-based infrastructure",
    compliance: ["SOC 2", "HIPAA eligible"],
  },
  eu: {
    name: "European Union",
    flag: "🇪🇺",
    description: "Data stored and processed in EU-based infrastructure",
    compliance: ["GDPR compliant", "SOC 2", "EU Data Residency"],
  },
};

export function DataResidencyTab() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  const { data: regionInfo, isLoading } = useQuery({
    queryKey: ["region-info", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
      
      const { data, error } = await supabase.rpc("get_organization_region_info", {
        p_organization_id: organization.id,
      });

      if (error) throw error;
      return data as RegionInfo;
    },
    enabled: !!organization?.id,
  });

  const requestMigration = useMutation({
    mutationFn: async (targetRegion: string) => {
      const { error } = await supabase.rpc("request_region_migration", {
        p_organization_id: organization!.id,
        p_target_region: targetRegion,
        p_notes: "Migration requested via settings",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Migration request submitted. Our team will contact you.");
      queryClient.invalidateQueries({ queryKey: ["region-info"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const currentRegion = regionInfo?.data_region || "us";
  const regionDetails = REGION_DETAILS[currentRegion as keyof typeof REGION_DETAILS];
  const otherRegion = currentRegion === "us" ? "eu" : "us";

  return (
    <div className="space-y-6">
      {/* Current Region Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Data Residency
          </CardTitle>
          <CardDescription>
            Your organization's data storage and processing location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Region Display */}
          <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-4xl">{regionDetails?.flag}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{regionDetails?.name}</h3>
                {regionInfo?.region_locked && (
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Locked
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {regionDetails?.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {regionDetails?.compliance.map((item) => (
                  <Badge key={item} variant="outline" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Region Details */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Server className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Data Storage</p>
                <p className="font-medium">{regionDetails?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Processing</p>
                <p className="font-medium">{regionDetails?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Backups</p>
                <p className="font-medium">{regionDetails?.name}</p>
              </div>
            </div>
          </div>

          {regionInfo?.region_selected_at && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Region selected on {format(new Date(regionInfo.region_selected_at), "MMMM d, yyyy")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pending Migration Alert */}
      {regionInfo?.pending_migration && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Migration Request Pending</AlertTitle>
          <AlertDescription>
            You have a pending migration request to{" "}
            <strong>{REGION_DETAILS[regionInfo.pending_migration.target_region as keyof typeof REGION_DETAILS]?.name}</strong>.
            Status: <Badge variant="secondary">{regionInfo.pending_migration.status}</Badge>
          </AlertDescription>
        </Alert>
      )}

      {/* Migration Request Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Region Migration</CardTitle>
          <CardDescription>
            Request to move your data to a different region
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="default">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Region migration requires a contract amendment, data export, and re-provisioning.
              This process involves downtime and must be coordinated with our team.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {REGION_DETAILS[otherRegion as keyof typeof REGION_DETAILS]?.flag}
              </span>
              <div>
                <p className="font-medium">
                  {REGION_DETAILS[otherRegion as keyof typeof REGION_DETAILS]?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {REGION_DETAILS[otherRegion as keyof typeof REGION_DETAILS]?.description}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              disabled={!!regionInfo?.pending_migration || requestMigration.isPending}
              onClick={() => requestMigration.mutate(otherRegion)}
            >
              Request Migration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance Guarantees</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
              <span>All data is stored exclusively within the selected region</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
              <span>No cross-region data replication or transfer</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
              <span>Backups are maintained within the same region</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
              <span>Access is geo-restricted to authorized personnel</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
              <span>Regional access attempts are logged and auditable</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
