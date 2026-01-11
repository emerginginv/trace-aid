import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Subject, VEHICLE_TYPES, US_STATES } from "../types";

const vehicleSchema = z.object({
  name: z.string().optional(),
  vehicle_type: z.string().min(1, "Vehicle type is required"),
  year: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  license_plate: z.string().optional(),
  plate_state: z.string().optional(),
  vin: z.string().optional(),
  registered_owner: z.string().optional(),
  notes: z.string().optional(),
});

export type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface VehicleFormProps {
  subject?: Subject;
  onSubmit: (values: VehicleFormValues) => void;
  isSubmitting: boolean;
  readOnly?: boolean;
}

export const VehicleForm = ({ subject, onSubmit, isSubmitting, readOnly = false }: VehicleFormProps) => {
  const details = subject?.details || {};

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      name: subject?.name || "",
      vehicle_type: details.vehicle_type || "",
      year: details.year || "",
      make: details.make || "",
      model: details.model || "",
      color: details.vehicle_color || details.color || "",
      license_plate: details.license_plate || "",
      plate_state: details.plate_state || "",
      vin: details.vin || "",
      registered_owner: details.registered_to || details.registered_owner || "",
      notes: subject?.notes || "",
    },
  });

  // Auto-generate display name from vehicle details
  const year = form.watch("year");
  const make = form.watch("make");
  const model = form.watch("model");
  const licensePlate = form.watch("license_plate");

  const getDisplayName = (): string => {
    const parts = [year, make, model].filter(Boolean);
    if (parts.length > 0) return parts.join(" ");
    if (licensePlate) return `Vehicle - ${licensePlate}`;
    return "Unknown Vehicle";
  };

  const handleSubmit = (values: VehicleFormValues) => {
    // Set the name based on vehicle details
    values.name = getDisplayName();
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Display Name</p>
          <p className="font-medium">{getDisplayName()}</p>
        </div>

        <FormField
          control={form.control}
          name="vehicle_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vehicle Type *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={readOnly}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {VEHICLE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year</FormLabel>
                <FormControl>
                  <Input placeholder="2024" {...field} disabled={readOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="make"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Make</FormLabel>
                <FormControl>
                  <Input placeholder="Toyota" {...field} disabled={readOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input placeholder="Camry" {...field} disabled={readOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <Input placeholder="Black, Silver, etc." {...field} disabled={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="license_plate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>License Plate</FormLabel>
                <FormControl>
                  <Input placeholder="ABC1234" {...field} disabled={readOnly} className="uppercase" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="plate_state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plate State</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={readOnly}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="vin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>VIN</FormLabel>
              <FormControl>
                <Input placeholder="17 character VIN" {...field} disabled={readOnly} className="uppercase font-mono" maxLength={17} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="registered_owner"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Registered Owner</FormLabel>
              <FormControl>
                <Input placeholder="Owner name" {...field} disabled={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Additional notes..."
                  className="min-h-[100px]"
                  {...field}
                  disabled={readOnly}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!readOnly && (
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : subject ? "Update Vehicle" : "Add Vehicle"}
          </Button>
        )}
      </form>
    </Form>
  );
};
