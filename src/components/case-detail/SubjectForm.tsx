import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const formSchema = z.object({
  subject_type: z.enum(["person", "vehicle", "location", "item"]),
  name: z.string().min(1, "Name is required"),
  notes: z.string().optional(),
  detail_key: z.string().optional(),
  detail_value: z.string().optional(),
});

interface SubjectFormProps {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingSubject?: any;
}

export const SubjectForm = ({ caseId, open, onOpenChange, onSuccess, editingSubject }: SubjectFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject_type: "person",
      name: "",
      notes: "",
      detail_key: "",
      detail_value: "",
    },
  });

  useEffect(() => {
    if (editingSubject) {
      form.reset({
        subject_type: editingSubject.subject_type,
        name: editingSubject.name,
        notes: editingSubject.notes || "",
        detail_key: "",
        detail_value: "",
      });
    } else {
      form.reset({
        subject_type: "person",
        name: "",
        notes: "",
        detail_key: "",
        detail_value: "",
      });
    }
  }, [editingSubject, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const details: Record<string, string> = editingSubject?.details || {};
      if (values.detail_key && values.detail_value) {
        details[values.detail_key] = values.detail_value;
      }

      const subjectData = {
        case_id: caseId,
        user_id: user.id,
        subject_type: values.subject_type,
        name: values.name,
        notes: values.notes || null,
        details,
      };

      let error;
      if (editingSubject) {
        const result = await supabase
          .from("case_subjects")
          .update(subjectData)
          .eq("id", editingSubject.id);
        error = result.error;
      } else {
        const result = await supabase.from("case_subjects").insert(subjectData);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: editingSubject ? "Subject updated successfully" : "Subject added successfully",
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving subject:", error);
      toast({
        title: "Error",
        description: "Failed to save subject",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingSubject ? "Edit" : "Add"} Subject</DialogTitle>
          <DialogDescription>Add a person, vehicle, location, or item related to this case</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="subject_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="person">Person</SelectItem>
                      <SelectItem value="vehicle">Vehicle</SelectItem>
                      <SelectItem value="location">Location</SelectItem>
                      <SelectItem value="item">Item</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter name" {...field} />
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
                    <Textarea placeholder="Additional notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="detail_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detail Field (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., License Plate" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="detail_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detail Value</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ABC-1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (editingSubject ? "Updating..." : "Adding...") : (editingSubject ? "Update Subject" : "Add Subject")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};