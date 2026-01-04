import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { addHours, addDays, format } from "date-fns";
import { Mail, File, Loader2 } from "lucide-react";

interface Attachment {
  id: string;
  file_name: string;
  name?: string | null;
}

interface EmailAttachmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachments: Attachment[];
  caseNumber?: string;
  attachmentType?: "case" | "subject";
  onSuccess?: () => void;
}

type ExpirationOption = "24h" | "3d" | "7d";

export function EmailAttachmentsDialog({
  open,
  onOpenChange,
  attachments,
  caseNumber = "",
  attachmentType = "case",
  onSuccess,
}: EmailAttachmentsDialogProps) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState(caseNumber ? `Shared Files from Case ${caseNumber}` : "Shared Files");
  const [message, setMessage] = useState("Please find the requested files below:");
  const [expiration, setExpiration] = useState<ExpirationOption>("7d");
  const [sending, setSending] = useState(false);

  const getExpirationDate = (): Date => {
    const now = new Date();
    switch (expiration) {
      case "24h":
        return addHours(now, 24);
      case "3d":
        return addDays(now, 3);
      case "7d":
        return addDays(now, 7);
      default:
        return addDays(now, 7);
    }
  };

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSend = async () => {
    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (attachments.length === 0) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!orgMember) throw new Error("Organization not found");

      const expirationDate = getExpirationDate();
      const links: { name: string; url: string }[] = [];

      // Generate secure links for each attachment
      for (const attachment of attachments) {
        const { data, error } = await supabase
          .from("attachment_access")
          .insert({
            attachment_id: attachment.id,
            attachment_type: attachmentType,
            created_by_user_id: user.id,
            organization_id: orgMember.organization_id,
            expires_at: expirationDate.toISOString(),
          })
          .select("access_token")
          .single();

        if (error) {
          console.error(`Error generating link for ${attachment.file_name}:`, error);
          continue;
        }

        links.push({
          name: attachment.name || attachment.file_name,
          url: `${window.location.origin}/attachment/${data.access_token}`,
        });
      }

      if (links.length === 0) {
        throw new Error("Failed to generate any share links");
      }

      // Build email body
      const linksHtml = links
        .map((link) => `<li><a href="${link.url}">${link.name}</a></li>`)
        .join("");

      const emailBody = `
        <p>${message}</p>
        <p style="margin-top: 16px;"><strong>Secure file links</strong> (expire on ${format(expirationDate, "PPP")}):</p>
        <ul>${linksHtml}</ul>
      `;

      // Send email via edge function
      const { error: emailError } = await supabase.functions.invoke("send-email", {
        body: {
          to: recipientEmail,
          subject: subject,
          body: emailBody,
          isHtml: true,
        },
      });

      if (emailError) throw emailError;

      toast({
        title: "Email sent",
        description: `Secure links sent to ${recipientEmail}`,
      });

      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Error",
        description: "Failed to send email with attachments",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setRecipientEmail("");
    setSubject(caseNumber ? `Shared Files from Case ${caseNumber}` : "Shared Files");
    setMessage("Please find the requested files below:");
    setExpiration("7d");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Attachments
          </DialogTitle>
          <DialogDescription>
            Send secure links for {attachments.length} attachment{attachments.length !== 1 ? 's' : ''} via email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Attachment List */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Attachments</Label>
            <ScrollArea className="max-h-24 border rounded-md p-2">
              <div className="space-y-1">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <File className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{attachment.name || attachment.file_name}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Recipient */}
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Email</Label>
            <Input
              id="recipient"
              type="email"
              placeholder="recipient@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Add a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* Link Expiration */}
          <div className="space-y-2">
            <Label>Link Expiration</Label>
            <Select value={expiration} onValueChange={(v) => setExpiration(v as ExpirationOption)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 hours</SelectItem>
                <SelectItem value="3d">3 days</SelectItem>
                <SelectItem value="7d">7 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Links will expire: {format(getExpirationDate(), "PPP 'at' p")}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={sending || !recipientEmail}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Email"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
