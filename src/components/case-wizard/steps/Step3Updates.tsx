import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { WizardNavigation } from "../WizardNavigation";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  update_type: z.string().min(1, "Update type is required"),
});

type FormData = z.infer<typeof formSchema>;

interface Update {
  id: string;
  title: string;
  update_type: string;
  created_at: string;
}

interface Step3Props {
  caseId: string;
  organizationId: string;
  onBack: () => void;
  onContinue: (count: number) => void;
}

export function Step3Updates({ caseId, organizationId, onBack, onContinue }: Step3Props) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [updateTypes, setUpdateTypes] = useState<string[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      update_type: "Other",
    },
  });

  useEffect(() => {
    fetchUpdateTypes();
    fetchUpdates();
  }, [caseId, organizationId]);

  const fetchUpdateTypes = async () => {
    try {
      const { data } = await supabase
        .from("picklists")
        .select("value")
        .eq("organization_id", organizationId)
        .eq("type", "update_type")
        .eq("is_active", true)
        .order("display_order");

      if (data && data.length > 0) {
        setUpdateTypes(data.map(item => item.value));
      } else {
        setUpdateTypes(["Surveillance", "Case Update", "Accounting", "Client Contact", "Other"]);
      }
    } catch (error) {
      console.error("Error fetching update types:", error);
      setUpdateTypes(["Surveillance", "Case Update", "Accounting", "Client Contact", "Other"]);
    }
  };

  const fetchUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from("case_updates")
        .select("id, title, update_type, created_at")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUpdates(data || []);
    } catch (error) {
      console.error("Error fetching updates:", error);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("case_updates").insert({
        case_id: caseId,
        user_id: user.id,
        organization_id: organizationId,
        title: data.title,
        description: data.description || null,
        update_type: data.update_type,
      });

      if (error) throw error;

      toast.success("Update added");
      form.reset();
      fetchUpdates();
    } catch (error) {
      console.error("Error adding update:", error);
      toast.error("Failed to add update");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUpdate = async (updateId: string) => {
    try {
      const { error } = await supabase
        .from("case_updates")
        .delete()
        .eq("id", updateId);

      if (error) throw error;
      
      setUpdates(prev => prev.filter(u => u.id !== updateId));
      toast.success("Update removed");
    } catch (error) {
      console.error("Error deleting update:", error);
      toast.error("Failed to remove update");
    }
  };

  const handleContinue = () => {
    onContinue(updates.length);
  };

  if (!hasStarted && updates.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Case Updates</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Add notes, findings, or narrative context for this case.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setHasStarted(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Update
            </Button>
            <Button variant="outline" onClick={handleContinue}>
              Skip for Now
            </Button>
          </div>
        </div>

        <WizardNavigation
          currentStep={4}
          onBack={onBack}
          onContinue={handleContinue}
          canContinue={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Case Updates</h3>
        <p className="text-sm text-muted-foreground">
          Add notes, findings, or narrative context for this case.
        </p>
      </div>

      {/* Existing updates */}
      {updates.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Added Updates</p>
          {updates.map(update => (
            <Card key={update.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{update.title}</p>
                    <Badge variant="secondary" className="text-xs">
                      {update.update_type}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteUpdate(update.id)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Update form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">New Update</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Update title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="update_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Update Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {updateTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            {type}
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
                      <RichTextEditor
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Update details..."
                        className="min-h-[120px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting} size="sm">
                  {isSubmitting ? "Adding..." : "Add Update"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <WizardNavigation
        currentStep={4}
        onBack={onBack}
        onContinue={handleContinue}
        canContinue={true}
      />
    </div>
  );
}
