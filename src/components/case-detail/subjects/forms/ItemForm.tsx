import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Subject, ITEM_TYPES } from "../types";
import { ProfileImageUpload } from "../../ProfileImageUpload";

const itemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  item_type: z.string().min(1, "Item type is required"),
  description: z.string().optional(),
  serial_number: z.string().optional(),
  evidence_reference: z.string().optional(),
  notes: z.string().optional(),
});

export type ItemFormValues = z.infer<typeof itemSchema>;

interface ItemFormProps {
  subject?: Subject;
  onSubmit: (values: ItemFormValues, profileImageUrl: string | null) => void;
  isSubmitting: boolean;
  readOnly?: boolean;
}

export const ItemForm = ({ subject, onSubmit, isSubmitting, readOnly = false }: ItemFormProps) => {
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(subject?.profile_image_url || null);
  const details = subject?.details || {};

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: subject?.name || "",
      item_type: details.item_type || "",
      description: details.item_description || details.description || "",
      serial_number: details.serial_number || "",
      evidence_reference: details.evidence_reference || "",
      notes: subject?.notes || "",
    },
  });

  const handleSubmit = (values: ItemFormValues) => {
    onSubmit(values, profileImageUrl);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="flex items-start gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Photo</label>
            {!readOnly && (
              <ProfileImageUpload
                currentImageUrl={profileImageUrl || undefined}
                onImageChange={setProfileImageUrl}
                subjectId={subject?.id}
              />
            )}
            {readOnly && profileImageUrl && (
              <img src={profileImageUrl} alt="Item" className="w-20 h-20 rounded-lg object-cover" />
            )}
          </div>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., iPhone 15 Pro, Black Backpack" {...field} disabled={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="item_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Type *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={readOnly}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ITEM_TYPES.map((type) => (
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

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Physical description of the item..."
                  className="min-h-[80px]"
                  {...field}
                  disabled={readOnly}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="serial_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Serial / Identifier</FormLabel>
              <FormControl>
                <Input placeholder="Serial number, IMEI, etc." {...field} disabled={readOnly} className="font-mono" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="evidence_reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Evidence Reference</FormLabel>
              <FormControl>
                <Input placeholder="Evidence ID or reference" {...field} disabled={readOnly} />
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
            {isSubmitting ? "Saving..." : subject ? "Update Item" : "Add Item"}
          </Button>
        )}
      </form>
    </Form>
  );
};
