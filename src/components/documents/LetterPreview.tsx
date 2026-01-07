// Letter Preview Component - Shows exactly what will be exported
// Uses PaginatedDocumentViewer for true print-accurate pagination

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { type LetterDocument } from "@/lib/letterDocumentEngine";
import { type ValidationResult } from "@/lib/statuteValidator";
import { PaginatedDocumentViewer } from "./PaginatedDocumentViewer";

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

  // Extract the inner content from the letter document HTML
  // The letterDocument.html includes <style> and wrapper, we need the content
  const extractContent = () => {
    // Remove the style tag and extract just the letter-document content
    const html = letterDocument.html;
    const match = html.match(/<div class="letter-document">([\s\S]*)<\/div>\s*$/);
    if (match) {
      return match[1];
    }
    // Fallback: return as-is without the style wrapper
    return html.replace(/<style>[\s\S]*?<\/style>/g, '');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Validation Header */}
      {(validationResult || onExport) && (
        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            {getValidationBadge()}
          </div>
          
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
      )}

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

      {/* Paginated Preview */}
      <div className="flex-1 overflow-hidden">
        <PaginatedDocumentViewer
          content={extractContent()}
          title={title}
          showHeader={!validationResult && !onExport}
        />
      </div>
    </div>
  );
}
