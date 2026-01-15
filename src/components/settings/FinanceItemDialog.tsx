import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  useCreateFinanceItem,
  useUpdateFinanceItem,
  useTaxRates,
  FinanceItem,
  RateType,
} from "@/hooks/useFinanceItems";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  is_expense_item: z.boolean(),
  is_invoice_item: z.boolean(),
  rate_type: z.enum(["hourly", "fixed", "variable"]),
  default_expense_rate: z.coerce.number().min(0).optional().nullable(),
  default_invoice_rate: z.coerce.number().min(0).optional().nullable(),
  default_tax_rate_id: z.string().optional().nullable(),
  invoice_as_flat_rate: z.boolean(),
  classification_code: z.string().max(50).optional().nullable(),
  reference_id: z.string().max(50).optional().nullable(),
}).refine((data) => data.is_expense_item || data.is_invoice_item, {
  message: "Item must be either an expense item, invoice item, or both",
  path: ["is_expense_item"],
});

type FormValues = z.infer<typeof formSchema>;

interface FinanceItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: FinanceItem | null;
}

export function FinanceItemDialog({
  open,
  onOpenChange,
  editingItem,
}: FinanceItemDialogProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const createMutation = useCreateFinanceItem();
  const updateMutation = useUpdateFinanceItem();
  const { data: taxRates = [] } = useTaxRates();

  const isEditing = editingItem && editingItem.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      is_expense_item: true,
      is_invoice_item: true,
      rate_type: "hourly",
      default_expense_rate: null,
      default_invoice_rate: null,
      default_tax_rate_id: null,
      invoice_as_flat_rate: false,
      classification_code: "",
      reference_id: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.reset({
          name: editingItem.name,
          description: editingItem.description || "",
          is_expense_item: editingItem.is_expense_item,
          is_invoice_item: editingItem.is_invoice_item,
          rate_type: editingItem.rate_type as RateType,
          default_expense_rate: editingItem.default_expense_rate,
          default_invoice_rate: editingItem.default_invoice_rate,
          default_tax_rate_id: editingItem.default_tax_rate_id,
          invoice_as_flat_rate: editingItem.invoice_as_flat_rate,
          classification_code: editingItem.classification_code || "",
          reference_id: editingItem.reference_id || "",
        });
        // Open advanced if there's data there
        if (editingItem.classification_code || editingItem.reference_id) {
          setAdvancedOpen(true);
        }
      } else {
        form.reset({
          name: "",
          description: "",
          is_expense_item: true,
          is_invoice_item: true,
          rate_type: "hourly",
          default_expense_rate: null,
          default_invoice_rate: null,
          default_tax_rate_id: null,
          invoice_as_flat_rate: false,
          classification_code: "",
          reference_id: "",
        });
        setAdvancedOpen(false);
      }
    }
  }, [open, editingItem, form]);

  const isExpenseItem = form.watch("is_expense_item");
  const isInvoiceItem = form.watch("is_invoice_item");

  const onSubmit = async (values: FormValues) => {
    try {
      const data = {
        name: values.name,
        description: values.description || null,
        is_expense_item: values.is_expense_item,
        is_invoice_item: values.is_invoice_item,
        rate_type: values.rate_type as RateType,
        default_expense_rate: values.is_expense_item ? values.default_expense_rate : null,
        default_invoice_rate: values.is_invoice_item ? values.default_invoice_rate : null,
        default_tax_rate_id: values.is_invoice_item ? values.default_tax_rate_id || null : null,
        invoice_as_flat_rate: values.invoice_as_flat_rate,
        classification_code: values.classification_code || null,
        reference_id: values.reference_id || null,
      };

      if (isEditing) {
        await updateMutation.mutateAsync({ id: editingItem.id, ...data });
      } else {
        await createMutation.mutateAsync(data);
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving finance item:", error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Finance Item" : "Add Finance Item"}
          </DialogTitle>
          <DialogDescription>
            Configure an item for expense tracking and/or client invoicing
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Core Fields */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Surveillance Hours" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Default description for invoices..."
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This description will appear on invoices by default
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Item Type Checkboxes */}
              <div className="space-y-3">
                <FormLabel>Item Type *</FormLabel>
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="is_expense_item"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Use as Expense Item
                          </FormLabel>
                          <FormDescription>
                            Enable this item for staff reimbursement tracking
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_invoice_item"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Use as Invoice Item
                          </FormLabel>
                          <FormDescription>
                            Enable this item for client billing
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                {form.formState.errors.is_expense_item && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.is_expense_item.message}
                  </p>
                )}
              </div>

              <FormField
                control={form.control}
                name="rate_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rate type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="variable">Variable</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How this item is typically charged
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Expense Section */}
            {isExpenseItem && (
              <div className="space-y-4 p-4 border rounded-lg bg-orange-500/5">
                <h4 className="font-medium text-sm text-orange-600">Expense Settings</h4>
                <FormField
                  control={form.control}
                  name="default_expense_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Expense Rate</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-7"
                            placeholder="0.00"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseFloat(e.target.value) : null
                              )
                            }
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        What you pay staff/investigators for this item
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Invoice Section */}
            {isInvoiceItem && (
              <div className="space-y-4 p-4 border rounded-lg bg-blue-500/5">
                <h4 className="font-medium text-sm text-blue-600">Invoice Settings</h4>
                
                <FormField
                  control={form.control}
                  name="default_invoice_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Invoice Rate</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-7"
                            placeholder="0.00"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseFloat(e.target.value) : null
                              )
                            }
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        What you charge clients for this item
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="default_tax_rate_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Tax Rate</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="No tax" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No tax</SelectItem>
                          {taxRates.map((rate) => (
                            <SelectItem key={rate.id} value={rate.id}>
                              {rate.name} ({rate.rate}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="invoice_as_flat_rate"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">
                          Invoice as flat rate
                        </FormLabel>
                        <FormDescription>
                          Always bill as qty=1 regardless of actual hours/units
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Advanced Section */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" type="button" className="w-full justify-between">
                  Advanced Settings
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      advancedOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="classification_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Classification Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., L110"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        For LEDES billing integration
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reference_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference ID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="External system ID"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        For mapping to external billing systems
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Item"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
