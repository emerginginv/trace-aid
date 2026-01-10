import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

interface OrgStatus {
  status: string;
  deletion_scheduled_for: string | null;
}

export function PendingDeletionBanner() {
  const { organization } = useOrganization();
  const [orgStatus, setOrgStatus] = useState<OrgStatus | null>(null);
  const [cancelingDeletion, setCancelingDeletion] = useState(false);

  useEffect(() => {
    if (organization?.id) {
      loadOrgStatus();
    }
  }, [organization?.id]);

  const loadOrgStatus = async () => {
    if (!organization?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('status, deletion_scheduled_for')
        .eq('id', organization.id)
        .single();
      
      if (error) throw error;
      setOrgStatus(data);
    } catch (error) {
      console.error("Error loading org status:", error);
    }
  };

  const handleCancelDeletion = async () => {
    if (!organization?.id) return;
    
    try {
      setCancelingDeletion(true);
      const { data, error } = await supabase.rpc('cancel_org_deletion', {
        p_organization_id: organization.id
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        toast.error(result.error || "Failed to cancel deletion");
        return;
      }
      
      toast.success(result.message || "Deletion canceled");
      loadOrgStatus();
    } catch (error: any) {
      console.error("Error canceling deletion:", error);
      toast.error(error.message || "Failed to cancel deletion");
    } finally {
      setCancelingDeletion(false);
    }
  };

  if (!orgStatus || orgStatus.status !== 'pending_deletion') {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Organization Scheduled for Deletion</AlertTitle>
      <AlertDescription className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p>
            This organization will be permanently deleted on{" "}
            <strong>
              {orgStatus.deletion_scheduled_for 
                ? format(new Date(orgStatus.deletion_scheduled_for), 'PPP') 
                : 'Unknown'}
            </strong>
            {orgStatus.deletion_scheduled_for && (
              <span className="text-muted-foreground ml-1">
                ({formatDistanceToNow(new Date(orgStatus.deletion_scheduled_for), { addSuffix: true })})
              </span>
            )}
          </p>
          <p className="text-sm mt-1">
            Access is limited. Export your data or cancel deletion from Settings.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCancelDeletion}
          disabled={cancelingDeletion}
        >
          {cancelingDeletion && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Cancel Deletion
        </Button>
      </AlertDescription>
    </Alert>
  );
}
