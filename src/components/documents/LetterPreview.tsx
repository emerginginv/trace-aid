// Letter Preview Component - Shows exactly what will be exported
// Matches PDF/DOCX output with page boundaries and validation display

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Download, 
  ZoomIn, 
  ZoomOut, 
  FileText, 
  AlertTriangle,
  CheckCircle2,
  Eye
} from "lucide-react";
import { type LetterDocument } from "@/lib/letterDocumentEngine";
import { type ValidationResult } from "@/lib/statuteValidator";

interface LetterPreviewProps {
  letterDocument: LetterDocument;
  validationResult?: ValidationResult;
  onExport?: () => void;
  showPageBoundaries?: boolean;
  title?: string;
}

export function LetterPreview({
  letterDocument,
  validationResult,
  onExport,
  showPageBoundaries = true,
  title = "Letter Preview"
}: LetterPreviewProps) {
  const [zoom, setZoom] = useState(100);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const getValidationBadge = () => {
    if (!validationResult) return null;

    if (validationResult.isValid) {
      return (
        <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
          <CheckCircle2 className="h-3 w-3" />
          {validationResult.validatedCount} citation{validationResult.validatedCount !== 1 ? 's' : ''} validated
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="gap-1 text-amber-600 border-amber-600">
        <AlertTriangle className="h-3 w-3" />
        {validationResult.unvalidatedCount} unvalidated citation{validationResult.unvalidatedCount !== 1 ? 's' : ''}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col h-full border rounded-lg bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{title}</span>
          {getValidationBadge()}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={handleZoomOut}
              disabled={zoom <= 50}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Select 
              value={zoom.toString()} 
              onValueChange={(value) => setZoom(parseInt(value))}
            >
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50%</SelectItem>
                <SelectItem value="75">75%</SelectItem>
                <SelectItem value="100">100%</SelectItem>
                <SelectItem value="125">125%</SelectItem>
                <SelectItem value="150">150%</SelectItem>
                <SelectItem value="200">200%</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={handleZoomIn}
              disabled={zoom >= 200}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Export Button */}
          {onExport && (
            <Button 
              variant="default" 
              size="sm" 
              className="gap-1.5"
              onClick={onExport}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Validation Warnings */}
      {validationResult && validationResult.warnings.length > 0 && (
        <div className="p-3 bg-amber-50 border-b border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              {validationResult.warnings.map((warning, idx) => (
                <p key={idx} className={idx > 0 ? "mt-1" : ""}>{warning}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preview Container */}
      <div 
        className="flex-1 overflow-auto p-6 bg-muted/20"
        style={{ 
          backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      >
        <div 
          className="mx-auto transition-transform origin-top"
          style={{ 
            transform: `scale(${zoom / 100})`,
            width: `${100 / (zoom / 100)}%`,
            maxWidth: `${816 / (zoom / 100)}px` // 8.5in at 96dpi
          }}
        >
          {/* Page Container */}
          <div 
            className={`
              bg-white shadow-lg mx-auto
              ${showPageBoundaries ? 'border-2 border-dashed border-muted-foreground/30' : 'border border-border'}
            `}
            style={{
              width: '8.5in',
              minHeight: '11in',
              maxWidth: '100%'
            }}
          >
            {/* Letter Content */}
            <div 
              dangerouslySetInnerHTML={{ __html: letterDocument.html }}
              className="letter-preview-content"
            />
          </div>

          {/* Page Info */}
          <div className="text-center mt-4 text-sm text-muted-foreground">
            Est. {letterDocument.estimatedPages} page{letterDocument.estimatedPages !== 1 ? 's' : ''} • Letter (8.5" × 11")
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-3 border-t bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" />
          <span>Preview matches final PDF output</span>
        </div>
        {validationResult && (
          <span>
            {validationResult.validatedCount + validationResult.unvalidatedCount} citation{(validationResult.validatedCount + validationResult.unvalidatedCount) !== 1 ? 's' : ''} found
          </span>
        )}
      </div>
    </div>
  );
}
