import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, CheckCircle2, AlertTriangle, 
  FileText, Database, Shield, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AIUploadedFile, AIAnalysisResult, AIColumnMapping, CASEWYZE_SCHEMA } from "@/lib/aiImportTypes";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";

interface AIImportReviewProps {
  files: AIUploadedFile[];
  analysisResult: AIAnalysisResult;
  userMappings: Record<string, AIColumnMapping[]>;
  excludedFiles: string[];
  excludedRows: Record<string, number[]>;
  onExcludedFilesChange: (files: string[]) => void;
  onExcludedRowsChange: (rows: Record<string, number[]>) => void;
  onStartImport: (sessionId: string) => void;
  onBack: () => void;
}

export function AIImportReview({ 
  files,
  analysisResult,
  userMappings,
  excludedFiles,
  excludedRows,
  onExcludedFilesChange,
  onExcludedRowsChange,
  onStartImport,
  onBack
}: AIImportReviewProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const { organization } = useOrganization();
  const { toast } = useToast();

  const toggleFileExclusion = (fileName: string) => {
    if (excludedFiles.includes(fileName)) {
      onExcludedFilesChange(excludedFiles.filter(f => f !== fileName));
    } else {
      onExcludedFilesChange([...excludedFiles, fileName]);
    }
  };

  const getEntityForFile = (fileName: string) => {
    const entity = analysisResult.detectedEntities.find(e => e.sourceFile === fileName);
    return entity?.entityType || 'unknown';
  };

  const getFileRowCount = (fileName: string) => {
    const file = files.find(f => f.name === fileName);
    return file?.preview?.rowCount || 0;
  };

  const getMappedFieldsCount = (fileName: string) => {
    return (userMappings[fileName] || []).filter(m => m.targetField).length;
  };

  const activeFiles = Object.keys(userMappings).filter(f => !excludedFiles.includes(f));
  const totalRecords = activeFiles.reduce((sum, f) => sum + getFileRowCount(f), 0);
  const totalExcludedRecords = Object.entries(excludedRows).reduce(
    (sum, [file, rows]) => sum + (excludedFiles.includes(file) ? 0 : rows.length), 
    0
  );

  const handleStartImport = async () => {
    if (!organization?.id) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive"
      });
      return;
    }

    setIsStarting(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      // Create AI import session
      const { data: session, error: sessionError } = await supabase
        .from('ai_import_sessions')
        .insert([{
          organization_id: organization.id,
          user_id: userId,
          source_system: analysisResult.detectedEntities[0]?.entityType || 'unknown',
          status: 'importing' as const,
          files_metadata: files.map(f => ({
            name: f.name,
            type: f.type,
            size: f.size,
            rowCount: f.preview?.rowCount
          })),
          ai_analysis: analysisResult as any,
          user_mappings: userMappings as any,
          user_exclusions: { files: excludedFiles, rows: excludedRows } as any
        }])
        .select()
        .single();

      if (sessionError) throw sessionError;

      toast({
        title: "Import Started",
        description: "Your data is being imported...",
      });

      onStartImport(session.id);
    } catch (err) {
      console.error('Failed to start import:', err);
      toast({
        title: "Import Failed",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive"
      });
      setIsStarting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Import Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Import Summary
          </CardTitle>
          <CardDescription>
            Review what will be imported into CaseWyze
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{activeFiles.length}</p>
              <p className="text-sm text-muted-foreground">Files</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold text-green-600">{totalRecords - totalExcludedRecords}</p>
              <p className="text-sm text-muted-foreground">Records to Import</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold text-muted-foreground">{totalExcludedRecords}</p>
              <p className="text-sm text-muted-foreground">Excluded</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">
                {Object.values(userMappings).flat().filter(m => m.targetField).length}
              </p>
              <p className="text-sm text-muted-foreground">Fields Mapped</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Files to Import</CardTitle>
          <CardDescription>
            Uncheck files you want to exclude from import
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {Object.keys(userMappings).map((fileName) => {
                const entityType = getEntityForFile(fileName);
                const schema = CASEWYZE_SCHEMA[entityType as keyof typeof CASEWYZE_SCHEMA];
                const rowCount = getFileRowCount(fileName);
                const mappedCount = getMappedFieldsCount(fileName);
                const isExcluded = excludedFiles.includes(fileName);
                
                return (
                  <div
                    key={fileName}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                      isExcluded ? "bg-muted/50 opacity-60" : "bg-card"
                    )}
                  >
                    <Checkbox
                      checked={!isExcluded}
                      onCheckedChange={() => toggleFileExclusion(fileName)}
                    />
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{fileName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{rowCount} rows</span>
                        <span>•</span>
                        <span>{mappedCount} fields mapped</span>
                      </div>
                    </div>
                    <Badge>{schema?.displayName || entityType}</Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Warnings */}
      {analysisResult.conflicts.filter(c => c.severity === 'warning').length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            There are {analysisResult.conflicts.filter(c => c.severity === 'warning').length} warnings 
            that may require your attention after import.
          </AlertDescription>
        </Alert>
      )}

      {/* Confirmation */}
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Checkbox
              id="confirm"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <div className="space-y-1">
              <label htmlFor="confirm" className="font-medium cursor-pointer">
                I have reviewed the mappings and approve this import
              </label>
              <p className="text-sm text-muted-foreground">
                This will import {totalRecords - totalExcludedRecords} records into CaseWyze. 
                All actions will be logged for audit purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span>All imports are logged and can be rolled back if needed</span>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Mapping
        </Button>
        <Button 
          onClick={handleStartImport}
          disabled={!confirmed || activeFiles.length === 0 || isStarting}
          size="lg"
        >
          {isStarting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Starting Import...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Begin Import
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
