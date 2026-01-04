import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, ArrowRight, CheckCircle2, 
  AlertCircle, Link2, Sparkles
} from "lucide-react";
import { ParsedCSV, getEntityDisplayName } from "@/lib/csvParser";
import { ColumnMapper, ColumnMapping, generateAutoMappings } from "./ColumnMapper";
import { TEMPLATE_COLUMNS } from "@/lib/templateColumnDefinitions";

interface ColumnMappingStepProps {
  parsedFiles: ParsedCSV[];
  onBack: () => void;
  onContinue: (mappedFiles: ParsedCSV[]) => void;
}

interface FileMappingState {
  entityType: string;
  mappings: ColumnMapping[];
  isValid: boolean;
}

export function ColumnMappingStep({ parsedFiles, onBack, onContinue }: ColumnMappingStepProps) {
  const [fileMappings, setFileMappings] = useState<Record<string, FileMappingState>>({});
  const [activeTab, setActiveTab] = useState<string>(parsedFiles[0]?.entityType || '');

  // Initialize mappings for each file
  useEffect(() => {
    const initialMappings: Record<string, FileMappingState> = {};
    
    for (const file of parsedFiles) {
      const entityDef = TEMPLATE_COLUMNS[file.entityType];
      const autoMappings = generateAutoMappings(
        file.headers,
        file.entityType,
        file.rows.slice(0, 5) as Record<string, string>[]
      );
      
      // Check if all required columns are mapped
      const requiredColumns = entityDef?.columns.filter(c => c.required) || [];
      const mappedRequired = requiredColumns.filter(c => 
        autoMappings.some(m => m.targetColumn === c.name)
      );
      
      initialMappings[file.entityType] = {
        entityType: file.entityType,
        mappings: autoMappings,
        isValid: mappedRequired.length === requiredColumns.length
      };
    }
    
    setFileMappings(initialMappings);
  }, [parsedFiles]);

  const handleMappingsChange = (entityType: string, mappings: ColumnMapping[]) => {
    const entityDef = TEMPLATE_COLUMNS[entityType];
    const requiredColumns = entityDef?.columns.filter(c => c.required) || [];
    const mappedRequired = requiredColumns.filter(c => 
      mappings.some(m => m.targetColumn === c.name)
    );
    
    setFileMappings(prev => ({
      ...prev,
      [entityType]: {
        ...prev[entityType],
        mappings,
        isValid: mappedRequired.length === requiredColumns.length
      }
    }));
  };

  const allFilesValid = Object.values(fileMappings).every(f => f.isValid);
  const autoMappedCount = Object.values(fileMappings).reduce(
    (acc, f) => acc + f.mappings.filter(m => m.targetColumn && m.confidence !== 'none').length, 
    0
  );
  const totalMappedCount = Object.values(fileMappings).reduce(
    (acc, f) => acc + f.mappings.filter(m => m.targetColumn).length, 
    0
  );

  const handleContinue = () => {
    // Apply column mappings to parsed files
    const mappedFiles: ParsedCSV[] = parsedFiles.map(file => {
      const fileMapping = fileMappings[file.entityType];
      if (!fileMapping) return file;
      
      // Create a column name mapping (source -> target)
      const columnMap: Record<string, string> = {};
      for (const mapping of fileMapping.mappings) {
        if (mapping.targetColumn) {
          columnMap[mapping.sourceColumn] = mapping.targetColumn;
        }
      }
      
      // Remap headers
      const newHeaders = file.headers.map(h => columnMap[h] || h);
      
      // Remap row data
      const newRows = file.rows.map(row => {
        const newRow: Record<string, string> = {};
        for (const [key, value] of Object.entries(row)) {
          const newKey = columnMap[key] || key;
          newRow[newKey] = String(value ?? '');
        }
        return newRow;
      });
      
      return {
        ...file,
        headers: newHeaders,
        rows: newRows
      };
    });
    
    onContinue(mappedFiles);
  };

  // Check if column mapping is needed (non-standard columns detected)
  const needsMapping = Object.values(fileMappings).some(f => 
    f.mappings.some(m => m.confidence === 'low' || m.confidence === 'none')
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Column Mapping</h2>
        <p className="text-muted-foreground">
          Map your file columns to CaseWyze fields
        </p>
      </div>

      {/* Summary Stats */}
      <div className="flex justify-center gap-4 flex-wrap">
        <Badge variant="outline" className="py-1.5 px-3">
          <Link2 className="h-3.5 w-3.5 mr-1.5" />
          {totalMappedCount} columns mapped
        </Badge>
        {autoMappedCount > 0 && (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 py-1.5 px-3">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {autoMappedCount} auto-detected
          </Badge>
        )}
        {allFilesValid ? (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 py-1.5 px-3">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            All required fields mapped
          </Badge>
        ) : (
          <Badge variant="destructive" className="py-1.5 px-3">
            <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
            Missing required fields
          </Badge>
        )}
      </div>

      {/* Auto-mapping success message */}
      {!needsMapping && (
        <Alert className="bg-green-500/10 border-green-500/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-400">
            All columns were automatically mapped! Review the mappings below or continue to validation.
          </AlertDescription>
        </Alert>
      )}

      {/* Per-file column mapping */}
      {parsedFiles.length === 1 ? (
        // Single file - show mapper directly
        <ColumnMapper
          entityType={parsedFiles[0].entityType}
          sourceHeaders={parsedFiles[0].headers}
          sampleData={parsedFiles[0].rows.slice(0, 5) as Record<string, string>[]}
          mappings={fileMappings[parsedFiles[0].entityType]?.mappings || []}
          onMappingsChange={(mappings) => handleMappingsChange(parsedFiles[0].entityType, mappings)}
        />
      ) : (
        // Multiple files - use tabs
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {parsedFiles.map(file => {
              const fileState = fileMappings[file.entityType];
              return (
                <TabsTrigger 
                  key={file.entityType} 
                  value={file.entityType}
                  className="gap-2"
                >
                  {getEntityDisplayName(file.entityType)}
                  {fileState?.isValid ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
          
          {parsedFiles.map(file => (
            <TabsContent key={file.entityType} value={file.entityType}>
              <ColumnMapper
                entityType={file.entityType}
                sourceHeaders={file.headers}
                sampleData={file.rows.slice(0, 5) as Record<string, string>[]}
                mappings={fileMappings[file.entityType]?.mappings || []}
                onMappingsChange={(mappings) => handleMappingsChange(file.entityType, mappings)}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Upload
        </Button>
        <Button 
          onClick={handleContinue}
          disabled={!allFilesValid}
        >
          Continue to Validation
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
