import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const emailSchema = z.object({
  to: z.string().min(1, "Recipient is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Message body is required"),
});

type EmailFormData = z.infer<typeof emailSchema>;

interface Contact {
  id: string;
  name: string;
  email: string;
}

interface EmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTo?: string;
  defaultSubject?: string;
  caseId?: string;
  onEmailSent?: () => void;
}

export function EmailComposer({
  open,
  onOpenChange,
  defaultTo,
  defaultSubject,
  caseId,
  onEmailSent,
}: EmailComposerProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sending, setSending] = useState(false);

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      to: defaultTo || "",
      subject: defaultSubject || "",
      body: "",
    },
  });

  useEffect(() => {
    if (open) {
      fetchContacts();
      if (defaultTo) form.setValue("to", defaultTo);
      if (defaultSubject) form.setValue("subject", defaultSubject);
    }
  }, [open, defaultTo, defaultSubject]);

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email")
      .not("email", "is", null)
      .order("first_name");

    if (error) {
      console.error("Error fetching contacts:", error);
      return;
    }

    const formattedContacts = (data || []).map(c => ({
      id: c.id,
      name: `${c.first_name} ${c.last_name}`,
      email: c.email,
    }));

    setContacts(formattedContacts);
  };

  const onSubmit = async (data: EmailFormData) => {
    setSending(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: data.to,
          subject: data.subject,
          body: data.body,
          isHtml: false,
          fromName: "Legal Case Manager",
        },
      });

      if (error) throw error;

      // Optionally save to activity log if caseId is provided
      if (caseId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("case_activities").insert({
            case_id: caseId,
            user_id: user.id,
            activity_type: "Email",
            title: `Email sent to ${data.to}`,
            description: `${data.subject}\n\n${data.body}`,
            status: "completed",
          });
        }
      }

      toast({
        title: "Email sent successfully",
        description: `Your email has been sent to ${data.to}`,
      });

      form.reset();
      onOpenChange(false);
      onEmailSent?.();
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "Failed to send email",
        description: error.message || "An error occurred while sending the email",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
          <DialogDescription>
            Send an email to a contact or client
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipient" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.email}>
                          {contact.name} ({contact.email})
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
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter email subject" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your message"
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={sending}>
                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Email
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
