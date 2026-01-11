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

const metricOptions: { value: SlaMetric; label: string; description: string }[] = [
  { value: "availability", label: "System Availability", description: "Platform uptime percentage" },
  { value: "response_time", label: "Response Time", description: "API/page response performance" },
  { value: "support_response", label: "Support Response Time", description: "Time to first support reply" },
];

const windowOptions: { value: SlaWindow; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

export function SlaManagement({ existingSla, open, onOpenChange }: SlaManagementProps) {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const isEditing = !!existingSla;

  const [formData, setFormData] = useState<SlaFormData>({
    metric: (existingSla?.metric as SlaMetric) || "availability",
    target_value: existingSla?.target_value || 99.9,
    measurement_window: (existingSla?.measurement_window as SlaWindow) || "monthly",
    enabled: existingSla?.enabled ?? true,
  });

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
                onValueChange={(value) => setFormData({ ...formData, metric: value as SlaMetric })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  {metricOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <span>{option.label}</span>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_value">Target Value (%)</Label>
              <Input
                id="target_value"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.target_value}
                onChange={(e) =>
                  setFormData({ ...formData, target_value: parseFloat(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground">
                The target percentage to meet (e.g., 99.9% uptime)
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
