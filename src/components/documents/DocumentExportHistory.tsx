/**
 * DOCUMENT EXPORT HISTORY
 * 
 * Displays the export history for a document instance.
 * Allows re-downloading previously exported PDFs from storage.
 */

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Download, FileText, FileType, Printer, Loader2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  DocumentExport, 
  getDocumentExportHistory, 
  downloadExportedPdf 
} from "@/lib/documentExports";

interface DocumentExportHistoryProps {
  documentInstanceId: string;
  refreshTrigger?: number;
}

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="h-4 w-4 text-red-500" />,
  docx: <FileType className="h-4 w-4 text-blue-500" />,
  html: <FileText className="h-4 w-4 text-orange-500" />,
  print: <Printer className="h-4 w-4 text-gray-500" />,
};

const FORMAT_LABELS: Record<string, string> = {
  pdf: 'PDF',
  docx: 'Word',
  html: 'HTML',
  print: 'Print',
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentExportHistory({ 
  documentInstanceId,
  refreshTrigger 
}: DocumentExportHistoryProps) {
  const [exports, setExports] = useState<DocumentExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      const history = await getDocumentExportHistory(documentInstanceId);
      setExports(history);
      setLoading(false);
    }
    loadHistory();
  }, [documentInstanceId, refreshTrigger]);

  const handleDownload = async (exportRecord: DocumentExport) => {
    if (!exportRecord.storagePath) {
      toast.error("This export is not available for download");
      return;
    }
    
    setDownloading(exportRecord.id);
    const success = await downloadExportedPdf(
      exportRecord.storagePath, 
      exportRecord.filename
    );
    
    if (success) {
      toast.success("PDF downloaded successfully");
    } else {
      toast.error("Failed to download PDF");
    }
    setDownloading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading export history...
      </div>
    );
  }

  if (exports.length === 0) {
    return null; // Don't show section if no exports
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Export History
            <Badge variant="secondary" className="ml-1">
              {exports.length}
            </Badge>
          </div>
          <span className="text-muted-foreground text-xs">
            {isOpen ? 'Hide' : 'Show'}
          </span>
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-2">
        <div className="border rounded-lg divide-y">
          {exports.map((exportRecord) => (
            <div 
              key={exportRecord.id}
              className="flex items-center justify-between p-3 text-sm"
            >
              <div className="flex items-center gap-3">
                {FORMAT_ICONS[exportRecord.exportFormat]}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {FORMAT_LABELS[exportRecord.exportFormat]}
                    </span>
                    <span className="text-muted-foreground">
                      {exportRecord.filename}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(exportRecord.exportedAt), 'MMM d, yyyy h:mm a')}
                    {exportRecord.fileSizeBytes && (
                      <span className="ml-2">
                        • {formatFileSize(exportRecord.fileSizeBytes)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {exportRecord.storagePath && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(exportRecord)}
                  disabled={downloading === exportRecord.id}
                >
                  {downloading === exportRecord.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
