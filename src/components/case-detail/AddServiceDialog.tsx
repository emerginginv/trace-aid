import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Plus, Search, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CaseService {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
  description: string | null;
  schedule_mode: string;
  is_active: boolean;
  case_types: string[];
}

interface AddServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseTypeTag: string | null;
  existingServiceIds: string[];
  onSuccess: () => void;
}

export const AddServiceDialog = ({
  open,
  onOpenChange,
  caseId,
  caseTypeTag,
  existingServiceIds,
  onSuccess,
}: AddServiceDialogProps) => {
  const { organization } = useOrganization();
  const [services, setServices] = useState<CaseService[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open && organization?.id) {
      fetchAvailableServices();
    }
  }, [open, organization?.id]);

  const fetchAvailableServices = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from("case_services")
        .select("id, name, code, color, description, schedule_mode, is_active, case_types")
        .eq("organization_id", organization.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async (serviceId: string) => {
    if (!organization?.id) return;

    setAdding(serviceId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("case_service_instances")
        .insert({
          case_id: caseId,
          case_service_id: serviceId,
          organization_id: organization.id,
          status: 'unscheduled',
          created_by: user.id,
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Already added",
            description: "This service is already attached to the case",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Service added",
        description: "The service has been attached to this case as unscheduled.",
      });

      onSuccess();
    } catch (error) {
      console.error("Error adding service:", error);
      toast({
        title: "Error",
        description: "Failed to add service to case",
        variant: "destructive",
      });
    } finally {
      setAdding(null);
    }
  };

  // Helper to check if service is available for case type
  const isServiceAvailableForCaseType = (service: CaseService) => {
    // If service has no case type restrictions, it's available for all
    if (!service.case_types || service.case_types.length === 0) {
      return true;
    }
    // If case has no type tag, only unrestricted services are available
    if (!caseTypeTag) {
      return true;
    }
    // Check if the case type is in the service's allowed types
    return service.case_types.includes(caseTypeTag);
  };

  const filteredServices = services.filter(service => {
    const query = searchQuery.toLowerCase();
    return (
      service.name.toLowerCase().includes(query) ||
      (service.code && service.code.toLowerCase().includes(query)) ||
      (service.description && service.description.toLowerCase().includes(query))
    );
  });

  // Services available for this case type and not already added
  const availableServices = filteredServices.filter(
    service => !existingServiceIds.includes(service.id) && isServiceAvailableForCaseType(service)
  );
  
  // Services not available for this case type
  const unavailableServices = filteredServices.filter(
    service => !existingServiceIds.includes(service.id) && !isServiceAvailableForCaseType(service)
  );
  
  const alreadyAddedServices = filteredServices.filter(
    service => existingServiceIds.includes(service.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Service to Case</DialogTitle>
          <DialogDescription>
            Select a service to attach to this case. The service will be marked as unscheduled 
            until an activity is created for it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Service List */}
          <ScrollArea className="h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Loading services...</p>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "No services match your search" : "No services available"}
                </p>
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {/* Available services */}
                {availableServices.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleAddService(service.id)}
                    disabled={adding === service.id}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                      "hover:bg-muted/50 hover:border-primary/30",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {/* Color indicator */}
                    <div
                      className="w-2 h-8 rounded-full shrink-0"
                      style={{ backgroundColor: service.color || '#6366f1' }}
                    />
                    
                    {/* Service info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {service.name}
                        </span>
                        {service.code && (
                          <span className="text-xs text-muted-foreground">
                            ({service.code})
                          </span>
                        )}
                      </div>
                      {service.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {service.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Add button */}
                    <div className="shrink-0">
                      {adding === service.id ? (
                        <span className="text-xs text-muted-foreground">Adding...</span>
                      ) : (
                        <Plus className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </button>
                ))}

                {/* Unavailable services (wrong case type) */}
                {unavailableServices.length > 0 && (
                  <>
                    <div className="py-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Not Available for This Case Type
                      </p>
                    </div>
                    {unavailableServices.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 opacity-50"
                        title={`This service is only available for: ${service.case_types.join(', ')}`}
                      >
                        <div
                          className="w-2 h-8 rounded-full shrink-0"
                          style={{ backgroundColor: service.color || '#6366f1' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {service.name}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Only for: {service.case_types.join(', ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Already added services */}
                {alreadyAddedServices.length > 0 && (
                  <>
                    <div className="py-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Already Added
                      </p>
                    </div>
                    {alreadyAddedServices.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 opacity-60"
                      >
                        {/* Color indicator */}
                        <div
                          className="w-2 h-8 rounded-full shrink-0"
                          style={{ backgroundColor: service.color || '#6366f1' }}
                        />
                        
                        {/* Service info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {service.name}
                            </span>
                            {service.code && (
                              <span className="text-xs text-muted-foreground">
                                ({service.code})
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Added indicator */}
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Added
                        </Badge>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
