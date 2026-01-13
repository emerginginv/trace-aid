import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { DollarSign, Clock, Settings, AlertTriangle } from "lucide-react";

const serviceBudgetLimitSchema = z.object({
  max_hours: z.coerce.number().min(0).nullable(),
  max_amount: z.coerce.number().min(0).nullable(),
  warning_threshold: z.coerce.number().min(0).max(100),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => data.max_hours !== null || data.max_amount !== null,
  { message: "At least one limit (hours or amount) is required", path: ["max_hours"] }
);

type ServiceBudgetLimitFormData = z.infer<typeof serviceBudgetLimitSchema>;

interface ServiceBudgetLimit {
  id: string;
  max_hours: number | null;
  max_amount: number | null;
  warning_threshold: number;
  notes: string | null;
}

interface ServiceBudgetLimitFormProps {
  serviceName: string;
  instanceId: string;
  organizationId: string;
  existingLimit?: ServiceBudgetLimit | null;
  onSave: (data: {
    max_hours?: number | null;
    max_amount?: number | null;
    warning_threshold?: number;
    notes?: string | null;
  }) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
  triggerButton?: React.ReactNode;
}

export function ServiceBudgetLimitForm({
  serviceName,
  instanceId,
  organizationId,
  existingLimit,
  onSave,
  onDelete,
  triggerButton,
}: ServiceBudgetLimitFormProps) {
  const { hasPermission, loading: permLoading } = usePermissions();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEditing = !!existingLimit;

  const form = useForm<ServiceBudgetLimitFormData>({
    resolver: zodResolver(serviceBudgetLimitSchema),
    defaultValues: {
      max_hours: existingLimit?.max_hours ?? null,
      max_amount: existingLimit?.max_amount ?? null,
      warning_threshold: existingLimit?.warning_threshold ?? 80,
      notes: existingLimit?.notes || "",
    },
  });

  const warningThreshold = form.watch("warning_threshold");

  useEffect(() => {
    if (open) {
      form.reset({
        max_hours: existingLimit?.max_hours ?? null,
        max_amount: existingLimit?.max_amount ?? null,
        warning_threshold: existingLimit?.warning_threshold ?? 80,
        notes: existingLimit?.notes || "",
      });
    }
  }, [open, existingLimit, form]);

  const onSubmit = async (data: ServiceBudgetLimitFormData) => {
    setSaving(true);
    try {
      const success = await onSave({
        max_hours: data.max_hours,
        max_amount: data.max_amount,
        warning_threshold: data.warning_threshold,
        notes: data.notes || null,
      });

      if (success) {
        toast.success(isEditing ? "Service budget limit updated" : "Service budget limit created");
        setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setDeleting(true);
    try {
      const success = await onDelete();
      if (success) {
        toast.success("Service budget limit removed");
        setOpen(false);
      }
    } finally {
      setDeleting(false);
    }
  };

  if (permLoading) return null;
  if (!hasPermission("modify_case_budget")) return null;

  const defaultTrigger = (
    <Button variant="ghost" size="sm">
      <Settings className="h-4 w-4 mr-1" />
      {isEditing ? "Edit Limit" : "Set Limit"}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit" : "Set"} Budget Limit: {serviceName}
          </DialogTitle>
          <DialogDescription>
            Set optional budget caps for this specific service instance.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="max_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Max Hours
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="No limit"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Max Amount
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        placeholder="No limit"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                        className="pl-9"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="warning_threshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Warning Threshold: {field.value}%
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      className="py-4"
                    />
                  </FormControl>
                  <FormDescription>
                    Show warning when utilization reaches this percentage.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Budget limit notes..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between gap-2 pt-2">
              <div>
                {isEditing && onDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? "Removing..." : "Remove Limit"}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : isEditing ? "Update" : "Set Limit"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
