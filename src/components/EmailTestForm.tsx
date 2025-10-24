import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const emailSchema = z.object({
  to: z.string().email("Please enter a valid email address"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Message body is required"),
  isHtml: z.boolean().default(false),
  fromName: z.string().optional(),
  fromEmail: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
});

type EmailFormData = z.infer<typeof emailSchema>;

export function EmailTestForm() {
  const [isSending, setIsSending] = useState(false);

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      to: "",
      subject: "",
      body: "",
      isHtml: false,
      fromName: "Legal Case Manager",
      fromEmail: "",
    },
  });

  const onSubmit = async (data: EmailFormData) => {
    setIsSending(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: data.to,
          subject: data.subject,
          body: data.body,
          isHtml: data.isHtml,
          fromName: data.fromName || "Legal Case Manager",
          fromEmail: data.fromEmail || undefined,
        },
      });

      if (error) throw error;

      toast.success("Email sent successfully!", {
        description: `Email sent to ${data.to}`,
      });

      form.reset();
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email", {
        description: error.message || "An error occurred while sending the email",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Test Email Sending
        </CardTitle>
        <CardDescription>
          Send a test email using Mailjet integration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Email *</FormLabel>
                  <FormControl>
                    <Input placeholder="recipient@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject *</FormLabel>
                  <FormControl>
                    <Input placeholder="Email subject" {...field} />
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
                  <FormLabel>Message Body *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your message here..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isHtml"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Send as HTML</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable to send HTML formatted emails
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fromName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Legal Case Manager" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fromEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Email (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="noreply@yourdomain.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSending} className="w-full">
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
