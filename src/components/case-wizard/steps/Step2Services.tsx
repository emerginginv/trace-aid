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

interface ServicePricingRule {
  id: string;
  case_service_id: string;
  rate: number | null;
  pricing_model: string | null;
  case_service: CaseService;
}

export interface SelectedService {
  serviceId: string;
  serviceName: string;
  estimatedQuantity?: number;
}

interface Step2ServicesProps {
  caseId: string;
  organizationId: string;
  pricingProfileId: string | null;
  onBack: () => void;
  onContinue: (selectedServices: SelectedService[]) => void;
}

export function Step2Services({
  caseId,
  organizationId,
  pricingProfileId,
  onBack,
  onContinue,
}: Step2ServicesProps) {
  const [services, setServices] = useState<ServicePricingRule[]>([]);
  const [selectedServices, setSelectedServices] = useState<Map<string, SelectedService>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, [pricingProfileId, organizationId]);

  const fetchServices = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!pricingProfileId) {
        // Fetch all active services if no pricing profile
        const { data, error: servicesError } = await supabase
          .from("case_services")
          .select("id, name, code, description, default_rate, is_billable, color")
          .eq("organization_id", organizationId)
          .eq("is_active", true)
          .order("display_order");

        if (servicesError) throw servicesError;

        // Convert to pricing rule format for consistent UI
        const asRules: ServicePricingRule[] = (data || []).map(s => ({
          id: s.id,
          case_service_id: s.id,
          rate: s.default_rate,
          pricing_model: "hourly",
          case_service: s,
        }));

        setServices(asRules);
      } else {
        // Fetch services from pricing profile
        const { data, error: rulesError } = await supabase
          .from("service_pricing_rules")
          .select(`
            id,
            case_service_id,
            default_rate,
            pricing_model,
            case_services:case_service_id (
              id,
              name,
              code,
              description,
              default_rate,
              is_billable,
              color
            )
          `)
          .eq("pricing_profile_id", pricingProfileId);

        if (rulesError) throw rulesError;

        // Map and filter out any null case_services entries
        const validRules: ServicePricingRule[] = (data || [])
          .filter((r) => r.case_services !== null)
          .map((r) => ({
            id: r.id,
            case_service_id: r.case_service_id,
            rate: r.default_rate,
            pricing_model: r.pricing_model,
            case_service: r.case_services as unknown as CaseService,
          }));

        setServices(validRules);
      }
    } catch (err) {
      console.error("Error fetching services:", err);
      setError("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (rule: ServicePricingRule) => {
    const newSelected = new Map(selectedServices);
    
    if (newSelected.has(rule.case_service_id)) {
      newSelected.delete(rule.case_service_id);
    } else {
      newSelected.set(rule.case_service_id, {
        serviceId: rule.case_service_id,
        serviceName: rule.case_service.name,
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

  const formatRate = (rate: number | null, pricingModel: string | null) => {
    if (rate === null) return "—";
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(rate);
    
    switch (pricingModel) {
      case "hourly":
        return `${formatted}/hr`;
      case "flat":
        return `${formatted} flat`;
      case "per_unit":
        return `${formatted}/ea`;
      default:
        return formatted;
    }
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

      {!pricingProfileId && (
        <div className="flex items-center gap-2 text-amber-600 text-sm p-3 border border-amber-300 rounded-lg bg-amber-50 dark:bg-amber-900/20">
          <AlertCircle className="h-4 w-4" />
          No pricing profile selected. Showing all available services with default rates.
        </div>
      )}

      {services.length === 0 && !error ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No services configured{pricingProfileId ? " for this pricing profile" : ""}.</p>
          <p className="text-sm mt-1">You can add services later from the case detail page.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((rule) => {
            const isSelected = selectedServices.has(rule.case_service_id);
            const service = rule.case_service;

            return (
              <div
                key={rule.id}
                className={`flex items-start gap-4 p-4 border rounded-lg transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <Checkbox
                  id={`service-${rule.case_service_id}`}
                  checked={isSelected}
                  onCheckedChange={() => toggleService(rule)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <Label
                    htmlFor={`service-${rule.case_service_id}`}
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
                    {formatRate(rule.rate, rule.pricing_model)}
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
                      value={selectedServices.get(rule.case_service_id)?.estimatedQuantity || ""}
                      onChange={(e) => {
                        const val = e.target.value ? parseFloat(e.target.value) : undefined;
                        updateEstimatedQuantity(rule.case_service_id, val);
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
