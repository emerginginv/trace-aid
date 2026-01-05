import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { addHours, addDays, format } from "date-fns";
import { Mail, File, Loader2, Eye, Edit3, Check, ChevronsUpDown, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Attachment {
  id: string;
  file_name: string;
  name?: string | null;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface EmailAttachmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachments: Attachment[];
  caseNumber?: string;
  caseId?: string;
  attachmentType?: "case" | "subject";
  onSuccess?: () => void;
}

type ExpirationOption = "24h" | "3d" | "7d";

export function EmailAttachmentsDialog({
  open,
  onOpenChange,
  attachments,
  caseNumber = "",
  caseId,
  attachmentType = "case",
  onSuccess,
}: EmailAttachmentsDialogProps) {
  const { organization } = useOrganization();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState(caseNumber ? `Shared Files from Case ${caseNumber}` : "Shared Files");
  const [message, setMessage] = useState("Please find the requested files below:");
  const [expiration, setExpiration] = useState<ExpirationOption>("7d");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"compose" | "preview">("compose");
  
  // Contact picker state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  useEffect(() => {
    if (open) {
      fetchContacts();
      // Reset subject when dialog opens with new case number
      setSubject(caseNumber ? `Shared Files from Case ${caseNumber}` : "Shared Files");
    }
  }, [open, caseNumber]);

  const fetchContacts = async () => {
    setContactsLoading(true);
    try {
      if (!organization?.id) return;

      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email")
        .eq("organization_id", organization.id)
        .not("email", "is", null)
        .order("first_name");

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setContactsLoading(false);
    }
  };

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

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setRecipientEmail(contact.email);
    setContactPickerOpen(false);
  };

  const handleEmailInputChange = (value: string) => {
    setRecipientEmail(value);
    // Clear selected contact if email is manually edited
    if (selectedContact && value !== selectedContact.email) {
      setSelectedContact(null);
    }
  };

  // Generate the enhanced email HTML template
  const generateEmailHtml = useMemo(() => {
    const expirationDate = getExpirationDate();
    const formattedExpiration = format(expirationDate, "EEEE, MMMM d, yyyy 'at' h:mm a");
    
    // Generate placeholder file list for preview
    const fileListHtml = attachments.map((att) => `
      <div style="display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; background: #ffffff;">
        <div style="flex: 1;">
          <div style="font-weight: 500; color: #1f2937;">${att.name || att.file_name}</div>
        </div>
        <a href="#" style="color: #2563eb; text-decoration: none; font-weight: 500; padding: 6px 12px; border-radius: 6px; background: #eff6ff;">
          Download
        </a>
      </div>
    `).join('');

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #374151;">
        <p style="margin: 0 0 20px 0; line-height: 1.6; font-size: 15px;">${message}</p>
        
        <div style="background: #f9fafb; border-radius: 12px; overflow: hidden; margin: 24px 0; border: 1px solid #e5e7eb;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 16px 20px; color: white;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 20px;">📎</span>
              <span style="font-weight: 600; font-size: 16px;">Shared Files (${attachments.length})</span>
            </div>
          </div>
          
          <div style="padding: 0;">
            ${fileListHtml}
          </div>
          
          <div style="padding: 16px 20px; background: #fef3c7; border-top: 1px solid #fcd34d;">
            <div style="display: flex; align-items: center; gap: 8px; color: #92400e; font-size: 13px;">
              <span>⏰</span>
              <span><strong>Important:</strong> These links will expire on ${formattedExpiration}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }, [message, attachments, expiration]);

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
      const formattedExpiration = format(expirationDate, "EEEE, MMMM d, yyyy 'at' h:mm a");
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

      // Build enhanced email body with actual links
      const fileListHtml = links.map((link) => `
        <div style="display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; background: #ffffff;">
          <div style="flex: 1;">
            <div style="font-weight: 500; color: #1f2937;">${link.name}</div>
          </div>
          <a href="${link.url}" style="color: #2563eb; text-decoration: none; font-weight: 500; padding: 6px 12px; border-radius: 6px; background: #eff6ff;">
            Download
          </a>
        </div>
      `).join('');

      const emailBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #374151;">
          <p style="margin: 0 0 20px 0; line-height: 1.6; font-size: 15px;">${message}</p>
          
          <div style="background: #f9fafb; border-radius: 12px; overflow: hidden; margin: 24px 0; border: 1px solid #e5e7eb;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 16px 20px; color: white;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">📎</span>
                <span style="font-weight: 600; font-size: 16px;">Shared Files (${links.length})</span>
              </div>
            </div>
            
            <div style="padding: 0;">
              ${fileListHtml}
            </div>
            
            <div style="padding: 16px 20px; background: #fef3c7; border-top: 1px solid #fcd34d;">
              <div style="display: flex; align-items: center; gap: 8px; color: #92400e; font-size: 13px;">
                <span>⏰</span>
                <span><strong>Important:</strong> These links will expire on ${formattedExpiration}</span>
              </div>
            </div>
          </div>
        </div>
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

      // Log activity if caseId is provided
      if (caseId) {
        await supabase.from("case_activities").insert({
          case_id: caseId,
          user_id: user.id,
          organization_id: orgMember.organization_id,
          activity_type: "Email",
          title: `Sent secure file links to ${recipientEmail}`,
          description: `Shared ${attachments.length} file(s) via email. Links expire on ${format(expirationDate, "PPP")}.`,
          status: "completed",
        });
      }

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
    setActiveTab("compose");
    setSelectedContact(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Attachments
          </DialogTitle>
          <DialogDescription>
            Send secure links for {attachments.length} attachment{attachments.length !== 1 ? 's' : ''} via email. No files are attached—only secure, expirable links.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "compose" | "preview")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose" className="flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              Compose
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4 mt-4">
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

            {/* Recipient with Contact Picker */}
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Email</Label>
              <div className="flex gap-2">
                <Popover open={contactPickerOpen} onOpenChange={setContactPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={contactPickerOpen}
                      className="w-full justify-between"
                    >
                      {selectedContact
                        ? `${selectedContact.first_name} ${selectedContact.last_name}`
                        : recipientEmail || "Select contact or type email..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search contacts or type email..." 
                        value={recipientEmail}
                        onValueChange={handleEmailInputChange}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {isValidEmail(recipientEmail) ? (
                            <div className="p-2 text-center">
                              <p className="text-sm text-muted-foreground">No contacts found</p>
                              <Button 
                                variant="ghost" 
                                className="mt-2 text-sm"
                                onClick={() => setContactPickerOpen(false)}
                              >
                                Use "{recipientEmail}"
                              </Button>
                            </div>
                          ) : (
                            <p className="p-2 text-sm text-center text-muted-foreground">
                              {contactsLoading ? "Loading contacts..." : "Type an email address or search contacts"}
                            </p>
                          )}
                        </CommandEmpty>
                        {contacts.length > 0 && (
                          <CommandGroup heading="Contacts">
                            {contacts.map((contact) => (
                              <CommandItem
                                key={contact.id}
                                value={`${contact.first_name} ${contact.last_name} ${contact.email}`}
                                onSelect={() => handleContactSelect(contact)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedContact?.id === contact.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{contact.first_name} {contact.last_name}</span>
                                  <span className="text-xs text-muted-foreground">{contact.email}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {recipientEmail && !isValidEmail(recipientEmail) && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Please enter a valid email address
                </p>
              )}
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
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Link Expiration
              </Label>
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
                Links will expire: {format(getExpirationDate(), "EEEE, MMMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-muted-foreground w-16">To:</span>
                  <span>{recipientEmail || "(no recipient)"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-muted-foreground w-16">Subject:</span>
                  <span>{subject}</span>
                </div>
              </div>
              
              <Label className="text-sm font-medium">Email Body Preview</Label>
              <ScrollArea className="h-[280px] border rounded-lg bg-white dark:bg-muted/20">
                <div 
                  className="p-4"
                  dangerouslySetInnerHTML={{ __html: generateEmailHtml }}
                />
              </ScrollArea>
              
              <p className="text-xs text-muted-foreground text-center">
                This is a preview. Actual links will be generated when you send.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={sending || !recipientEmail || !isValidEmail(recipientEmail)}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
