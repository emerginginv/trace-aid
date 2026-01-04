import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ShieldOff, AlertTriangle, Loader2, Link2 } from "lucide-react";

interface Attachment {
  id: string;
  file_name: string;
  name?: string | null;
}

interface AttachmentLinkCount {
  attachmentId: string;
  displayName: string;
  activeLinks: number;
}

interface RevokeAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachments: Attachment[];
  attachmentType?: "case" | "subject";
  onSuccess?: () => void;
}

export function RevokeAccessDialog({
  open,
  onOpenChange,
  attachments,
  attachmentType = "case",
  onSuccess,
}: RevokeAccessDialogProps) {
  const [revoking, setRevoking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [linkCounts, setLinkCounts] = useState<AttachmentLinkCount[]>([]);

  useEffect(() => {
    if (open && attachments.length > 0) {
      fetchLinkCounts();
    }
  }, [open, attachments]);

  const fetchLinkCounts = async () => {
    setLoading(true);
    try {
      const attachmentIds = attachments.map(a => a.id);
      
      const { data, error } = await supabase
        .from("attachment_access")
        .select("attachment_id")
        .in("attachment_id", attachmentIds)
        .eq("attachment_type", attachmentType)
        .is("revoked_at", null)
        .or("expires_at.is.null,expires_at.gt.now()");

      if (error) throw error;

      // Count links per attachment
      const counts: Record<string, number> = {};
      data?.forEach((row) => {
        counts[row.attachment_id] = (counts[row.attachment_id] || 0) + 1;
      });

      // Build link count list - only include attachments with active links
      const result: AttachmentLinkCount[] = attachments
        .filter(a => counts[a.id] > 0)
        .map(a => ({
          attachmentId: a.id,
          displayName: a.name || a.file_name,
          activeLinks: counts[a.id] || 0,
        }));

      setLinkCounts(result);
    } catch (error) {
      console.error("Error fetching link counts:", error);
      toast({
        title: "Error",
        description: "Failed to load active links",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (linkCounts.length === 0) return;

    setRevoking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const attachmentIds = linkCounts.map(l => l.attachmentId);

      const { error } = await supabase
        .from("attachment_access")
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by_user_id: user.id,
        })
        .in("attachment_id", attachmentIds)
        .eq("attachment_type", attachmentType)
        .is("revoked_at", null);

      if (error) throw error;

      const totalLinks = linkCounts.reduce((sum, l) => sum + l.activeLinks, 0);
      
      toast({
        title: "Access revoked",
        description: `Revoked ${totalLinks} share link${totalLinks !== 1 ? 's' : ''}`,
      });

      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("Error revoking access:", error);
      toast({
        title: "Error",
        description: "Failed to revoke access",
        variant: "destructive",
      });
    } finally {
      setRevoking(false);
    }
  };

  const handleClose = () => {
    setLinkCounts([]);
    onOpenChange(false);
  };

  const totalActiveLinks = linkCounts.reduce((sum, l) => sum + l.activeLinks, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5" />
            Revoke Access
          </DialogTitle>
          <DialogDescription>
            Revoke all active share links for selected attachments
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : linkCounts.length === 0 ? (
          <div className="py-6 text-center">
            <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No active share links found for the selected attachments.
            </p>
            <Button variant="outline" onClick={handleClose} className="mt-4">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Warning */}
            <div className="flex items-start gap-3 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">This action cannot be undone</p>
                <p className="text-destructive/80 mt-1">
                  Recipients will no longer be able to access these files using existing links.
                </p>
              </div>
            </div>

            {/* Attachments with active links */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Revoking {totalActiveLinks} link{totalActiveLinks !== 1 ? 's' : ''} for:
              </p>
              <ScrollArea className="max-h-40">
                <div className="space-y-2">
                  {linkCounts.map((item) => (
                    <div 
                      key={item.attachmentId} 
                      className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                    >
                      <span className="truncate flex-1">{item.displayName}</span>
                      <span className="text-muted-foreground flex-shrink-0 ml-2">
                        {item.activeLinks} link{item.activeLinks !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleRevoke} 
                disabled={revoking}
              >
                {revoking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Revoking...
                  </>
                ) : (
                  "Revoke Access"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
