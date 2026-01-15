import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, DollarSign, Clock, Calendar, Activity } from "lucide-react";
import { toast } from "sonner";

interface ServicePricingRule {
  id: string;
  pricing_profile_id: string;
  case_service_id: string;
  pricing_model: string;
  default_rate: number;
  expense_rate: number | null;
  invoice_rate: number | null;
  minimum_units: number | null;
  maximum_units: number | null;
  is_billable: boolean;
  notes: string | null;
  case_services?: {
    id: string;
    name: string;
    code: string | null;
  };
}

interface CaseService {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
}

interface RuleFormData {
  case_service_id: string;
  pricing_model: string;
  rate: string;
  minimum_units: string;
  maximum_units: string;
  is_billable: boolean;
  notes: string;
}

const defaultFormData: RuleFormData = {
  case_service_id: "",
  pricing_model: "hourly",
  rate: "",
  minimum_units: "",
  maximum_units: "",
  is_billable: true,
  notes: "",
};

const PRICING_MODELS = [
  { value: "flat_fee", label: "Flat Fee", icon: DollarSign, description: "Fixed price per service" },
  { value: "hourly", label: "Hourly", icon: Clock, description: "Per hour rate" },
  { value: "daily", label: "Daily", icon: Calendar, description: "Per day rate" },
  { value: "per_activity", label: "Per Activity", icon: Activity, description: "Per activity/event" },
  { value: "per_unit", label: "Per Unit", icon: DollarSign, description: "Per unit quantity" },
];

interface ServicePricingRulesEditorProps {
  profileId: string;
  profileName: string;
  isOpen: boolean;
  onClose: () => void;
  isDefaultProfile?: boolean;
}

export function ServicePricingRulesEditor({ 
  profileId, 
  profileName, 
  isOpen, 
  onClose,
  isDefaultProfile = false
}: ServicePricingRulesEditorProps) {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ServicePricingRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData);

  // Fetch existing pricing rules for this profile
  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ["service-pricing-rules", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_pricing_rules")
        .select(`
          *,
          case_services (id, name, code)
        `)
        .eq("pricing_profile_id", profileId)
        .order("created_at");
      
      if (error) throw error;
      return data as ServicePricingRule[];
    },
    enabled: isOpen && !!profileId,
  });

  // Fetch all case services for the dropdown
  const { data: services } = useQuery({
    queryKey: ["case-services", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("case_services")
        .select("id, name, code, is_active")
        .eq("organization_id", organization.id)
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data as CaseService[];
    },
    enabled: isOpen && !!organization?.id,
  });

  // Get services that don't have a rule yet
  const availableServices = services?.filter(
    (service) => !rules?.some((rule) => rule.case_service_id === service.id) || 
                 editingRule?.case_service_id === service.id
  ) || [];

  // Save rule mutation
  const saveMutation = useMutation({
    mutationFn: async (data: RuleFormData & { id?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user || !organization?.id) throw new Error("Not authenticated");

      const ruleData = {
        pricing_profile_id: profileId,
        case_service_id: data.case_service_id,
        organization_id: organization.id,
        pricing_model: data.pricing_model,
        default_rate: parseFloat(data.rate),
        expense_rate: parseFloat(data.rate),
        invoice_rate: parseFloat(data.rate),
        minimum_units: data.minimum_units ? parseFloat(data.minimum_units) : null,
        maximum_units: data.maximum_units ? parseFloat(data.maximum_units) : null,
        is_billable: data.is_billable,
        notes: data.notes || null,
        updated_at: new Date().toISOString(),
      };

      if (data.id) {
        const { error } = await supabase
          .from("service_pricing_rules")
          .update(ruleData)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("service_pricing_rules")
          .insert({
            ...ruleData,
            created_by: user.user.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-pricing-rules", profileId] });
      setIsRuleDialogOpen(false);
      setEditingRule(null);
      setFormData(defaultFormData);
      toast.success(editingRule ? "Pricing rule updated" : "Pricing rule added");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete rule mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Check if this is the last rule on a default profile
      if (isDefaultProfile && rules?.length === 1) {
        throw new Error("Cannot delete the last pricing rule from the default profile");
      }
      
      const { error } = await supabase
        .from("service_pricing_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-pricing-rules", profileId] });
      toast.success("Pricing rule deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleAddRule = () => {
    setEditingRule(null);
    setFormData(defaultFormData);
    setIsRuleDialogOpen(true);
  };

  const handleEditRule = (rule: ServicePricingRule) => {
    setEditingRule(rule);
    setFormData({
      case_service_id: rule.case_service_id,
      pricing_model: rule.pricing_model,
      rate: rule.default_rate.toString(),
      minimum_units: rule.minimum_units?.toString() || "",
      maximum_units: rule.maximum_units?.toString() || "",
      is_billable: rule.is_billable,
      notes: rule.notes || "",
    });
    setIsRuleDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.case_service_id) {
      toast.error("Please select a service");
      return;
    }
    if (!formData.rate || parseFloat(formData.rate) < 0) {
      toast.error("Please enter a valid rate");
      return;
    }
    saveMutation.mutate({
      ...formData,
      id: editingRule?.id,
    });
  };

  const getModelIcon = (model: string) => {
    const modelConfig = PRICING_MODELS.find((m) => m.value === model);
    const Icon = modelConfig?.icon || DollarSign;
    return <Icon className="h-4 w-4" />;
  };

  const getModelLabel = (model: string) => {
    return PRICING_MODELS.find((m) => m.value === model)?.label || model;
  };

  const formatRate = (rate: number, model: string) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(rate);
    
    switch (model) {
      case 'hourly': return `${formatted}/hr`;
      case 'daily': return `${formatted}/day`;
      case 'per_activity': return `${formatted}/activity`;
      case 'per_unit': return `${formatted}/unit`;
      default: return formatted;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Service Pricing Rules</DialogTitle>
          <DialogDescription>
            Configure how each service is billed under the "{profileName}" profile.
            These rules convert work into billable amounts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleAddRule} disabled={availableServices.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add Pricing Rule
            </Button>
          </div>

          {rulesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !rules?.length ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pricing rules defined yet.</p>
              <p className="text-sm">Add rules to specify how each service is billed.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Pricing Model</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Min</TableHead>
                  <TableHead className="text-right">Max</TableHead>
                  <TableHead className="text-center">Billable</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{rule.case_services?.name}</span>
                        {rule.case_services?.code && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {rule.case_services.code}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getModelIcon(rule.pricing_model)}
                        <span>{getModelLabel(rule.pricing_model)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatRate(rule.default_rate, rule.pricing_model)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {rule.minimum_units ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {rule.maximum_units ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {rule.is_billable ? (
                        <Badge variant="default" className="bg-green-600">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditRule(rule)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Add/Edit Rule Dialog */}
        <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingRule ? "Edit Pricing Rule" : "Add Pricing Rule"}
                </DialogTitle>
                <DialogDescription>
                  Define how this service is billed under this profile.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Service *</Label>
                  <Select
                    value={formData.case_service_id}
                    onValueChange={(value) => setFormData({ ...formData, case_service_id: value })}
                    disabled={!!editingRule}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableServices.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                          {service.code && ` (${service.code})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Pricing Model *</Label>
                  <Select
                    value={formData.pricing_model}
                    onValueChange={(value) => setFormData({ ...formData, pricing_model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICING_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          <div className="flex items-center gap-2">
                            <model.icon className="h-4 w-4" />
                            <span>{model.label}</span>
                            <span className="text-xs text-muted-foreground">
                              — {model.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Rate ($) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Units</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.minimum_units}
                      onChange={(e) => setFormData({ ...formData, minimum_units: e.target.value })}
                      placeholder="e.g., 4 (hours)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum billable units (e.g., 4-hour minimum)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Units</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.maximum_units}
                      onChange={(e) => setFormData({ ...formData, maximum_units: e.target.value })}
                      placeholder="e.g., 10"
                    />
                    <p className="text-xs text-muted-foreground">
                      Cap on billable units per instance
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Billable</Label>
                    <p className="text-xs text-muted-foreground">
                      Whether this service generates charges
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_billable}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_billable: checked })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editingRule ? "Update" : "Add Rule"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}