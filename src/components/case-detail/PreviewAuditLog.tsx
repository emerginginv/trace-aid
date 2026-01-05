import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { format } from 'date-fns';
import { Download, Eye, Maximize, Image, FileText, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface PreviewLogEntry {
  id: string;
  attachment_id: string;
  attachment_type: string;
  user_id: string;
  preview_type: string;
  created_at: string;
}

interface AttachmentInfo {
  id: string;
  file_name: string;
  file_type?: string;
  name?: string | null;
}

interface ProfileInfo {
  id: string;
  full_name: string | null;
  email: string;
}

interface PreviewAuditLogProps {
  caseId: string;
  attachments: AttachmentInfo[];
}

export function PreviewAuditLog({ caseId, attachments }: PreviewAuditLogProps) {
  const { organization } = useOrganization();
  const [logs, setLogs] = useState<PreviewLogEntry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [loading, setLoading] = useState(true);
  const [fileFilter, setFileFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const attachmentIds = attachments.map(a => a.id);
  const attachmentMap = Object.fromEntries(attachments.map(a => [a.id, a]));

  const fetchLogs = useCallback(async () => {
    if (!organization?.id || attachmentIds.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: logsData, error: logsError } = await supabase
        .from('attachment_preview_logs')
        .select('id, attachment_id, attachment_type, user_id, preview_type, created_at')
        .eq('organization_id', organization.id)
        .in('attachment_id', attachmentIds)
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) {
        console.error('Error fetching preview logs:', logsError);
        return;
      }

      setLogs(logsData || []);

      // Fetch profiles for unique user IDs
      const userIds = [...new Set((logsData || []).map(log => log.user_id))];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (profilesData) {
          const profileMap = Object.fromEntries(
            profilesData.map(p => [p.id, p])
          );
          setProfiles(profileMap);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [organization?.id, attachmentIds.join(',')]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter(log => {
    if (fileFilter !== 'all' && log.attachment_id !== fileFilter) return false;
    if (typeFilter !== 'all' && log.preview_type !== typeFilter) return false;
    return true;
  });

  const handleExportCSV = () => {
    const headers = ['Viewer', 'Email', 'File', 'Preview Type', 'Viewed At'];
    const rows = filteredLogs.map(log => {
      const profile = profiles[log.user_id];
      const attachment = attachmentMap[log.attachment_id];
      return [
        profile?.full_name || 'Unknown',
        profile?.email || '',
        attachment?.file_name || 'Unknown',
        log.preview_type,
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preview-audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPreviewTypeIcon = (type: string) => {
    switch (type) {
      case 'fullscreen':
        return <Maximize className="h-3.5 w-3.5" />;
      case 'modal':
        return <Eye className="h-3.5 w-3.5" />;
      default:
        return <Image className="h-3.5 w-3.5" />;
    }
  };

  const getPreviewTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      fullscreen: 'default',
      modal: 'secondary',
      thumbnail: 'outline'
    };
    return (
      <Badge variant={variants[type] || 'outline'} className="gap-1">
        {getPreviewTypeIcon(type)}
        {type}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={fileFilter} onValueChange={setFileFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by file" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Files</SelectItem>
            {attachments.map(attachment => (
              <SelectItem key={attachment.id} value={attachment.id}>
                {attachment.file_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Preview type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="fullscreen">Fullscreen</SelectItem>
            <SelectItem value="modal">Modal</SelectItem>
            <SelectItem value="thumbnail">Thumbnail</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredLogs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No preview logs found</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Viewer</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Preview Type</TableHead>
                <TableHead>Viewed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map(log => {
                const profile = profiles[log.user_id];
                const attachment = attachmentMap[log.attachment_id];
                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {profile?.full_name || 'Unknown User'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {profile?.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">
                          {attachment?.file_name || 'Unknown'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPreviewTypeBadge(log.preview_type)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
