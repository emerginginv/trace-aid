import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, Clock, AlertTriangle, ArrowRight, ArrowLeft,
  FileText, Database, History, Settings2, FileType, Sparkles
} from "lucide-react";
import { ParsedCSV, getEntityDisplayName, sortByImportOrder } from "@/lib/csvParser";
import { ParseError } from "@/lib/csvParser";
import { MappingConfig } from "@/types/import";

interface ImportConfirmationProps {
  parsedFiles: ParsedCSV[];
  warnings: ParseError[];
  importType: 'new_migration' | 'incremental';
  mappingConfig: MappingConfig;
  sourceSystemName: string;
  onBack: () => void;
  onConfirm: () => void;
}

export function ImportConfirmation({ 
  parsedFiles, 
  warnings,
  importType,
  mappingConfig,
  sourceSystemName,
  onBack, 
  onConfirm 
}: ImportConfirmationProps) {
  const [acknowledgements, setAcknowledgements] = useState({
    understand: false,
    warnings: warnings.length === 0,
    auditable: false
  });
  
  const sortedFiles = sortByImportOrder(parsedFiles);
  const totalRecords = sortedFiles.reduce((acc, f) => acc + f.rowCount, 0);
  
  // Estimate processing time (rough estimate: 100 records/second)
  const estimatedSeconds = Math.ceil(totalRecords / 100);
  const estimatedTime = estimatedSeconds < 60 
    ? `${estimatedSeconds} seconds` 
    : `${Math.ceil(estimatedSeconds / 60)} minute(s)`;
  
  const allAcknowledged = Object.values(acknowledgements).every(Boolean);
  
  // Calculate mapping stats
  const totalMappings = mappingConfig.updateTypes.length + mappingConfig.eventTypes.length;
  const mappedCount = [...mappingConfig.updateTypes, ...mappingConfig.eventTypes]
    .filter(m => m.casewyzeValue).length;
  const createCount = [...mappingConfig.updateTypes, ...mappingConfig.eventTypes]
    .filter(m => m.autoCreate).length;
  
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Confirm Import</h2>
        <p className="text-muted-foreground">
          Review the import summary and confirm to proceed
        </p>
      </div>
      
      {/* Import Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Import Summary
          </CardTitle>
          <CardDescription>
            The following data will be imported into CaseWyze
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{sortedFiles.length}</p>
              <p className="text-sm text-muted-foreground">Files</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Database className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalRecords}</p>
              <p className="text-sm text-muted-foreground">Records</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">~{estimatedTime}</p>
              <p className="text-sm text-muted-foreground">Estimated Time</p>
            </div>
          </div>
          
          {/* Entity breakdown */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Import Order:</h4>
            <div className="flex flex-wrap gap-2">
              {sortedFiles.map((file, index) => (
                <Badge key={file.entityType} variant="outline" className="text-xs">
                  <span className="mr-1 text-muted-foreground">{index + 1}.</span>
                  {getEntityDisplayName(file.entityType)} ({file.rowCount})
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Import type and source */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Import Type:</span>
              <Badge>
                {importType === 'new_migration' ? 'New Migration' : 'Incremental Import'}
              </Badge>
            </div>
            {sourceSystemName && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Source:</span>
                <Badge variant="outline">
                  <FileType className="h-3 w-3 mr-1" />
                  {sourceSystemName}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Mapping & Normalization Summary */}
      {(totalMappings > 0 || createCount > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings2 className="h-5 w-5" />
              Mapping & Normalization
            </CardTitle>
            <CardDescription>
              Data transformations that will be applied during import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Type Mappings */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Type Mappings</span>
                </div>
                <div className="text-2xl font-bold">{mappedCount}</div>
                <p className="text-xs text-muted-foreground">
                  {mappingConfig.updateTypes.length} update types, {mappingConfig.eventTypes.length} event types
                </p>
              </div>
              
              {/* New Values */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">New Picklist Values</span>
                </div>
                <div className="text-2xl font-bold">{createCount}</div>
                <p className="text-xs text-muted-foreground">
                  Will be created automatically
                </p>
              </div>
            </div>
            
            {createCount > 0 && (
              <Alert className="bg-blue-500/5 border-blue-500/20">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-sm">
                  <strong>{createCount} new picklist value(s)</strong> will be created from unmapped external values.
                  These will be available for future use.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Normalization info */}
            <div className="text-xs text-muted-foreground">
              <p>
                <strong>Automatic normalization:</strong> Dates will be converted to ISO format, 
                currencies cleaned, text trimmed, and emails/phones formatted consistently.
                Original values are preserved in the audit trail.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Warnings reminder */}
      {warnings.length > 0 && (
        <Alert className="border-yellow-500 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription>
            This import has <strong>{warnings.length} warning(s)</strong> that you reviewed 
            in the previous step. Proceeding will import data despite these warnings.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Acknowledgements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Required Acknowledgements
          </CardTitle>
          <CardDescription>
            You must acknowledge the following before proceeding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="understand"
              checked={acknowledgements.understand}
              onCheckedChange={(checked) => 
                setAcknowledgements(prev => ({ ...prev, understand: checked === true }))
              }
            />
            <label
              htmlFor="understand"
              className="text-sm leading-relaxed cursor-pointer"
            >
              I understand this will <strong>create or update {totalRecords} records</strong> in 
              CaseWyze. Existing records with matching external IDs may be updated.
            </label>
          </div>
          
          {warnings.length > 0 && (
            <div className="flex items-start space-x-3">
              <Checkbox
                id="warnings"
                checked={acknowledgements.warnings}
                onCheckedChange={(checked) => 
                  setAcknowledgements(prev => ({ ...prev, warnings: checked === true }))
                }
              />
              <label
                htmlFor="warnings"
                className="text-sm leading-relaxed cursor-pointer"
              >
                I have <strong>reviewed all {warnings.length} warnings</strong> and accept them. 
                I understand some data may require manual review after import.
              </label>
            </div>
          )}
          
          <div className="flex items-start space-x-3">
            <Checkbox
              id="auditable"
              checked={acknowledgements.auditable}
              onCheckedChange={(checked) => 
                setAcknowledgements(prev => ({ ...prev, auditable: checked === true }))
              }
            />
            <label
              htmlFor="auditable"
              className="text-sm leading-relaxed cursor-pointer flex items-start gap-2"
            >
              <span>
                I understand this action is <strong>auditable and reversible</strong>. 
                An import batch record will be created and can be used to rollback if needed.
                Original values are preserved for audit purposes.
              </span>
              <History className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
            </label>
          </div>
        </CardContent>
      </Card>
      
      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Mapping
        </Button>
        <Button 
          onClick={onConfirm}
          disabled={!allAcknowledged}
          size="lg"
        >
          Start Import
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
      
      {!allAcknowledged && (
        <p className="text-center text-sm text-muted-foreground">
          Please check all acknowledgements above to continue
        </p>
      )}
    </div>
  );
}
