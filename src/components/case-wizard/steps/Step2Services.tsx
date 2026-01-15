import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WizardNavigation } from "../WizardNavigation";
import { AlertCircle } from "lucide-react";

interface CaseService {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  default_rate: number | null;
  is_billable: boolean | null;
  color: string | null;
}

export interface SelectedService {
  serviceId: string;
  serviceName: string;
  estimatedQuantity?: number;
}

interface Step2ServicesProps {
  caseId: string;
  organizationId: string;
  pricingProfileId: string | null; // Deprecated - kept for interface compatibility
  onBack: () => void;
  onContinue: (selectedServices: SelectedService[]) => void;
}

export function Step2Services({
  caseId,
  organizationId,
  onBack,
  onContinue,
}: Step2ServicesProps) {
  const [services, setServices] = useState<CaseService[]>([]);
  const [selectedServices, setSelectedServices] = useState<Map<string, SelectedService>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, [organizationId]);

  const fetchServices = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all active services for the organization
      const { data, error: servicesError } = await supabase
        .from("case_services")
        .select("id, name, code, description, default_rate, is_billable, color")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("display_order");

      if (servicesError) throw servicesError;

      setServices(data || []);
    } catch (err) {
      console.error("Error fetching services:", err);
      setError("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (service: CaseService) => {
    const newSelected = new Map(selectedServices);
    
    if (newSelected.has(service.id)) {
      newSelected.delete(service.id);
    } else {
      newSelected.set(service.id, {
        serviceId: service.id,
        serviceName: service.name,
        estimatedQuantity: undefined,
      });
    }
    
    setSelectedServices(newSelected);
  };

  const updateEstimatedQuantity = (serviceId: string, quantity: number | undefined) => {
    const newSelected = new Map(selectedServices);
    const existing = newSelected.get(serviceId);
    
    if (existing) {
      newSelected.set(serviceId, {
        ...existing,
        estimatedQuantity: quantity,
      });
      setSelectedServices(newSelected);
    }
  };

  const handleContinue = () => {
    const servicesArray = Array.from(selectedServices.values());
    onContinue(servicesArray);
  };

  const formatRate = (rate: number | null) => {
    if (rate === null) return "—";
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(rate);
    return `${formatted}/hr`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Select Services</h3>
          <p className="text-sm text-muted-foreground">
            Loading available services...
          </p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Select Services</h3>
        <p className="text-sm text-muted-foreground">
          Choose the services to be performed on this case. You can skip this step if needed.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm p-3 border border-destructive/30 rounded-lg bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {services.length === 0 && !error ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No services configured.</p>
          <p className="text-sm mt-1">You can add services later from the case detail page.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => {
            const isSelected = selectedServices.has(service.id);

            return (
              <div
                key={service.id}
                className={`flex items-start gap-4 p-4 border rounded-lg transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <Checkbox
                  id={`service-${service.id}`}
                  checked={isSelected}
                  onCheckedChange={() => toggleService(service)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <Label
                    htmlFor={`service-${service.id}`}
                    className="font-medium cursor-pointer flex items-center gap-2"
                  >
                    {service.color && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: service.color }}
                      />
                    )}
                    {service.name}
                    {service.code && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {service.code}
                      </Badge>
                    )}
                  </Label>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {service.description}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatRate(service.default_rate)}
                    {service.is_billable === false && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Non-billable
                      </Badge>
                    )}
                  </p>
                </div>

                {isSelected && (
                  <div className="shrink-0 w-24">
                    <Label className="text-xs text-muted-foreground">Est. Hours</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="—"
                      className="h-8 text-sm"
                      value={selectedServices.get(service.id)?.estimatedQuantity || ""}
                      onChange={(e) => {
                        const val = e.target.value ? parseFloat(e.target.value) : undefined;
                        updateEstimatedQuantity(service.id, val);
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Selection summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
        <span>
          {selectedServices.size} service{selectedServices.size !== 1 ? "s" : ""} selected
        </span>
      </div>

      <WizardNavigation
        currentStep={2}
        onBack={onBack}
        onContinue={handleContinue}
      />
    </div>
  );
}