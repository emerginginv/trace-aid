import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { addHours, addDays, format, isBefore, startOfDay } from "date-fns";
import { Share2, Copy, Check, CalendarIcon, Clock, Link2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Attachment {
  id: string;
  file_name: string;
  name?: string | null;
}

interface ShareAttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachment: Attachment | null;
  attachmentType?: "case" | "subject";
}

type ExpirationPreset = "24h" | "3d" | "7d" | "custom";

export function ShareAttachmentDialog({
  open,
  onOpenChange,
  attachment,
  attachmentType = "case",
}: ShareAttachmentDialogProps) {
  const [expirationPreset, setExpirationPreset] = useState<ExpirationPreset>("24h");
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [customTime, setCustomTime] = useState("12:00");
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);

  const calculateExpirationDate = (): Date => {
    const now = new Date();
    switch (expirationPreset) {
      case "24h":
        return addHours(now, 24);
      case "3d":
        return addDays(now, 3);
      case "7d":
        return addDays(now, 7);
      case "custom":
        if (customDate) {
          const [hours, minutes] = customTime.split(":").map(Number);
          const result = new Date(customDate);
          result.setHours(hours, minutes, 0, 0);
          return result;
        }
        return addHours(now, 24); // Default fallback
      default:
        return addHours(now, 24);
    }
  };

  const isCustomDateValid = (): boolean => {
    if (expirationPreset !== "custom") return true;
    if (!customDate) return false;
    
    const expiration = calculateExpirationDate();
    const minExpiration = addHours(new Date(), 1);
    return !isBefore(expiration, minExpiration);
  };

  const handleGenerate = async () => {
    if (!attachment) return;
    
    if (!isCustomDateValid()) {
      toast({
        title: "Invalid expiration",
        description: "Expiration must be at least 1 hour from now",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
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

      const expirationDate = calculateExpirationDate();

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

      if (error) throw error;

      const accessUrl = `${window.location.origin}/attachment/${data.access_token}`;
      setGeneratedLink(accessUrl);
      setExpiresAt(expirationDate);

      toast({
        title: "Link generated",
        description: "Secure share link has been created",
      });
    } catch (error) {
      console.error("Error generating share link:", error);
      toast({
        title: "Error",
        description: "Failed to generate share link",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast({
        title: "Copied",
        description: "Link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setGeneratedLink(null);
    setExpiresAt(null);
    setExpirationPreset("24h");
    setCustomDate(undefined);
    setCustomTime("12:00");
    setCopied(false);
    onOpenChange(false);
  };

  const displayName = attachment?.name || attachment?.file_name || "Attachment";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Attachment
          </DialogTitle>
          <DialogDescription>
            Create a secure, expirable link for "{displayName}"
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <div className="space-y-6">
            {/* Expiration Presets */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Link Expiration</Label>
              <RadioGroup
                value={expirationPreset}
                onValueChange={(value) => setExpirationPreset(value as ExpirationPreset)}
                className="grid grid-cols-2 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="24h" id="24h" />
                  <Label htmlFor="24h" className="cursor-pointer">24 hours</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3d" id="3d" />
                  <Label htmlFor="3d" className="cursor-pointer">3 days</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="7d" id="7d" />
                  <Label htmlFor="7d" className="cursor-pointer">7 days</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="cursor-pointer">Custom</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Custom Date/Time Picker */}
            {expirationPreset === "custom" && (
              <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal flex-1",
                          !customDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDate ? format(customDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customDate}
                        onSelect={setCustomDate}
                        disabled={(date) => isBefore(date, startOfDay(new Date()))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      className="w-32"
                    />
                  </div>
                </div>
                {!isCustomDateValid() && customDate && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Expiration must be at least 1 hour from now
                  </div>
                )}
              </div>
            )}

            {/* Expiration Preview */}
            <div className="text-sm text-muted-foreground">
              Link will expire: <span className="font-medium text-foreground">
                {format(calculateExpirationDate(), "PPP 'at' p")}
              </span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleGenerate} 
                disabled={generating || (expirationPreset === "custom" && !isCustomDateValid())}
              >
                {generating ? "Generating..." : "Generate Link"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Success State */}
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" />
              Link Generated Successfully
            </div>

            {/* Link Display */}
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-lg overflow-hidden">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <code className="text-xs break-all">{generatedLink}</code>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Expiration Info */}
            {expiresAt && (
              <div className="text-sm text-muted-foreground">
                Expires: <span className="font-medium text-foreground">
                  {format(expiresAt, "PPP 'at' p")}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
