import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, Clock, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { ServiceDetailDialog } from "./ServiceDetailDialog";
import { AddServiceDialog } from "./AddServiceDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { Skeleton } from "@/components/ui/skeleton";

interface CaseService {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
  description: string | null;
  schedule_mode: string;
}

interface CaseServiceInstance {
  id: string;
  case_id: string;
  case_service_id: string;
  organization_id: string;
  status: 'scheduled' | 'unscheduled';
  scheduled_at: string | null;
  unscheduled_at: string | null;
  unscheduled_by: string | null;
  unscheduled_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  case_service: CaseService;
}

interface CaseServicesPanelProps {
  caseId: string;
  caseTypeTag?: string | null;
  isClosedCase?: boolean;
}

export const CaseServicesPanel = ({ caseId, caseTypeTag = null, isClosedCase = false }: CaseServicesPanelProps) => {
  const { organization } = useOrganization();
  const { isManager, isAdmin } = useUserRole();
  const canManage = (isManager || isAdmin) && !isClosedCase;
  
  const [serviceInstances, setServiceInstances] = useState<CaseServiceInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState<CaseServiceInstance | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useEffect(() => {
    if (organization?.id) {
      fetchServiceInstances();
    }
  }, [caseId, organization?.id]);

  const fetchServiceInstances = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from("case_service_instances")
        .select(`
          *,
          case_service:case_services(id, name, code, color, description, schedule_mode)
        `)
        .eq("case_id", caseId)
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Type assertion since Supabase types may not be up to date
      setServiceInstances((data as unknown as CaseServiceInstance[]) || []);
    } catch (error) {
      console.error("Error fetching case service instances:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceClick = (instance: CaseServiceInstance) => {
    setSelectedInstance(instance);
    setDetailDialogOpen(true);
  };

  const handleDetailClose = () => {
    setDetailDialogOpen(false);
    setSelectedInstance(null);
  };

  const handleStatusChange = () => {
    fetchServiceInstances();
    handleDetailClose();
  };

  const handleAddSuccess = () => {
    fetchServiceInstances();
    setAddDialogOpen(false);
  };

  const scheduledCount = serviceInstances.filter(s => s.status === 'scheduled').length;
  const unscheduledCount = serviceInstances.filter(s => s.status === 'unscheduled').length;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Services
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Services
              {serviceInstances.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {serviceInstances.length}
                </Badge>
              )}
            </CardTitle>
            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {serviceInstances.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No services attached to this case</p>
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setAddDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Service
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Summary badges */}
              {(scheduledCount > 0 || unscheduledCount > 0) && (
                <div className="flex gap-2 mb-3">
                  {scheduledCount > 0 && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {scheduledCount} scheduled
                    </Badge>
                  )}
                  {unscheduledCount > 0 && (
                    <Badge variant="outline" className="text-xs gap-1 border-amber-500 text-amber-600">
                      <Clock className="h-3 w-3" />
                      {unscheduledCount} unscheduled
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Service list */}
              <div className="space-y-2">
                {serviceInstances.map((instance) => (
                  <button
                    key={instance.id}
                    onClick={() => handleServiceClick(instance)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                      "hover:bg-muted/50 hover:border-primary/30",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    )}
                  >
                    {/* Color indicator */}
                    <div
                      className="w-2 h-8 rounded-full shrink-0"
                      style={{ backgroundColor: instance.case_service?.color || '#6366f1' }}
                    />
                    
                    {/* Service info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {instance.case_service?.name || 'Unknown Service'}
                        </span>
                        {instance.case_service?.code && (
                          <span className="text-xs text-muted-foreground">
                            ({instance.case_service.code})
                          </span>
                        )}
                      </div>
                      {instance.case_service?.schedule_mode === 'none' ? (
                        <p className="text-xs text-muted-foreground">
                          No scheduling required
                        </p>
                      ) : instance.status === 'scheduled' && instance.scheduled_at ? (
                        <p className="text-xs text-muted-foreground">
                          Scheduled {new Date(instance.scheduled_at).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600">
                          Not yet scheduled
                        </p>
                      )}
                    </div>
                    
                    {/* Status badge - show different for schedule_mode = 'none' */}
                    {instance.case_service?.schedule_mode === 'none' ? (
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-xs bg-muted text-muted-foreground"
                      >
                        No Scheduling
                      </Badge>
                    ) : (
                      <Badge
                        variant={instance.status === 'scheduled' ? 'secondary' : 'outline'}
                        className={cn(
                          "shrink-0 text-xs",
                          instance.status === 'scheduled' 
                            ? "bg-green-100 text-green-700 border-green-200" 
                            : "border-amber-500 text-amber-600"
                        )}
                      >
                        {instance.status === 'scheduled' ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" /> Scheduled</>
                        ) : (
                          <><Clock className="h-3 w-3 mr-1" /> Unscheduled</>
                        )}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Service Detail Dialog */}
      {selectedInstance && (
        <ServiceDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          serviceInstance={selectedInstance}
          caseId={caseId}
          canManage={canManage}
          onStatusChange={handleStatusChange}
          onClose={handleDetailClose}
        />
      )}

      {/* Add Service Dialog */}
      <AddServiceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        caseId={caseId}
        caseTypeTag={caseTypeTag}
        existingServiceIds={serviceInstances.map(s => s.case_service_id)}
        onSuccess={handleAddSuccess}
      />
    </>
  );
};
