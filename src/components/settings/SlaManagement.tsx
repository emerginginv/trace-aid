import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus } from "lucide-react";

type SlaMetric = "availability" | "response_time" | "support_response";
type SlaWindow = "monthly" | "quarterly";

interface SlaFormData {
  metric: SlaMetric;
  target_value: number;
  measurement_window: SlaWindow;
  enabled: boolean;
}

interface SlaManagementProps {
  existingSla?: {
    id: string;
    metric: string;
    target_value: number;
    measurement_window: string;
    enabled: boolean;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MetricConfig {
  label: string;
  description: string;
  unit: string;
  unitLabel: string;
  placeholder: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

const metricConfig: Record<SlaMetric, MetricConfig> = {
  availability: {
    label: "System Availability",
    description: "Platform uptime percentage",
    unit: "%",
    unitLabel: "Target Uptime (%)",
    placeholder: "99.9",
    min: 0,
    max: 100,
    step: 0.01,
    defaultValue: 99.9,
  },
  response_time: {
    label: "Response Time",
    description: "API/page response performance",
    unit: "ms",
    unitLabel: "Maximum Response Time (ms)",
    placeholder: "200",
    min: 1,
    max: 60000,
    step: 1,
    defaultValue: 200,
  },
  support_response: {
    label: "Support Response Time",
    description: "Time to first support reply",
    unit: "hrs",
    unitLabel: "Maximum Response Time (hours)",
    placeholder: "4",
    min: 0.5,
    max: 168,
    step: 0.5,
    defaultValue: 4,
  },
};

const windowOptions: { value: SlaWindow; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

export function SlaManagement({ existingSla, open, onOpenChange }: SlaManagementProps) {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const isEditing = !!existingSla;

  const getDefaultValue = (metric: SlaMetric) => metricConfig[metric].defaultValue;

  const [formData, setFormData] = useState<SlaFormData>({
    metric: (existingSla?.metric as SlaMetric) || "availability",
    target_value: existingSla?.target_value ?? getDefaultValue((existingSla?.metric as SlaMetric) || "availability"),
    measurement_window: (existingSla?.measurement_window as SlaWindow) || "monthly",
    enabled: existingSla?.enabled ?? true,
  });

  const currentMetricConfig = metricConfig[formData.metric];

  const createMutation = useMutation({
    mutationFn: async (data: SlaFormData) => {
      if (!organization?.id) throw new Error("No organization");
      
      const { error } = await supabase.from("slas").insert({
        organization_id: organization.id,
        metric: data.metric,
        target_value: data.target_value,
        measurement_window: data.measurement_window,
        enabled: data.enabled,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("SLA created successfully");
      queryClient.invalidateQueries({ queryKey: ["sla-summary", organization?.id] });
      queryClient.invalidateQueries({ queryKey: ["slas", organization?.id] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Failed to create SLA:", error);
      toast.error("Failed to create SLA");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SlaFormData) => {
      if (!existingSla?.id) throw new Error("No SLA ID");
      
      const { error } = await supabase.from("slas").update({
        metric: data.metric,
        target_value: data.target_value,
        measurement_window: data.measurement_window,
        enabled: data.enabled,
      }).eq("id", existingSla.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("SLA updated successfully");
      queryClient.invalidateQueries({ queryKey: ["sla-summary", organization?.id] });
      queryClient.invalidateQueries({ queryKey: ["slas", organization?.id] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Failed to update SLA:", error);
      toast.error("Failed to update SLA");
    },
  });

  const resetForm = () => {
    setFormData({
      metric: "availability",
      target_value: 99.9,
      measurement_window: "monthly",
      enabled: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit SLA" : "Create New SLA"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Modify the SLA configuration below."
                : "Define a new Service Level Agreement for your organization."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="metric">Metric</Label>
              <Select
                value={formData.metric}
                onValueChange={(value) => {
                  const newMetric = value as SlaMetric;
                  setFormData({
                    ...formData,
                    metric: newMetric,
                    target_value: metricConfig[newMetric].defaultValue,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(metricConfig) as SlaMetric[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      <div>
                        <span>{metricConfig[key].label}</span>
                        <p className="text-xs text-muted-foreground">{metricConfig[key].description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_value">{currentMetricConfig.unitLabel}</Label>
              <div className="relative">
                <Input
                  id="target_value"
                  type="number"
                  step={currentMetricConfig.step}
                  min={currentMetricConfig.min}
                  max={currentMetricConfig.max}
                  placeholder={currentMetricConfig.placeholder}
                  value={formData.target_value}
                  onChange={(e) =>
                    setFormData({ ...formData, target_value: parseFloat(e.target.value) || 0 })
                  }
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {currentMetricConfig.unit}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.metric === "availability"
                  ? "The target percentage to meet (e.g., 99.9% uptime)"
                  : `Maximum allowed before SLA breach`}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="measurement_window">Measurement Window</Label>
              <Select
                value={formData.measurement_window}
                onValueChange={(value) =>
                  setFormData({ ...formData, measurement_window: value as SlaWindow })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select window" />
                </SelectTrigger>
                <SelectContent>
                  {windowOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">Enabled</Label>
                <p className="text-xs text-muted-foreground">
                  Track this SLA and monitor for breaches
                </p>
              </div>
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEditing ? "Update SLA" : "Create SLA"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddSlaButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Add SLA
      </Button>
      <SlaManagement open={open} onOpenChange={setOpen} />
    </>
  );
}
