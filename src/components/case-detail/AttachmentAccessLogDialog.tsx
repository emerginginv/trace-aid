import { useState, useEffect, useCallback } from "react";
import { FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { AttachmentAccessLog, AccessLogEntry, ProfileInfo } from "./AttachmentAccessLog";

interface Attachment {
  id: string;
  file_name: string;
  name?: string | null;
}

interface AttachmentAccessLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachment: Attachment | null;
}

export function AttachmentAccessLogDialog({
  open,
  onOpenChange,
  attachment,
}: AttachmentAccessLogDialogProps) {
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!attachment) return;

    setIsLoading(true);
    try {
      // Fetch access logs for this attachment
      const { data: logsData, error: logsError } = await supabase
        .from("attachment_access")
        .select("*")
        .eq("attachment_id", attachment.id)
        .eq("attachment_type", "case")
        .order("created_at", { ascending: false });

      if (logsError) throw logsError;

      const accessLogs = logsData || [];
      setLogs(accessLogs);

      // Collect unique user IDs for profile lookup
      const userIds = new Set<string>();
      accessLogs.forEach((log) => {
        userIds.add(log.created_by_user_id);
        if (log.revoked_by_user_id) {
          userIds.add(log.revoked_by_user_id);
        }
      });

      if (userIds.size > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", [...userIds]);

        const profilesMap: Record<string, ProfileInfo> = {};
        profilesData?.forEach((profile) => {
          profilesMap[profile.id] = profile;
        });
        setProfiles(profilesMap);
      }
    } catch (error) {
      console.error("Error fetching access logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [attachment]);

  useEffect(() => {
    if (open && attachment) {
      fetchLogs();
    }
  }, [open, attachment, fetchLogs]);

  const displayName = attachment?.name || attachment?.file_name || "Attachment";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Access Log
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground pb-2 border-b">
          <span className="font-medium">{displayName}</span>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <AttachmentAccessLog
            logs={logs}
            profiles={profiles}
            isLoading={isLoading}
            onRefresh={fetchLogs}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
