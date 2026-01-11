import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, 
  Sparkles, HelpCircle, ArrowRightLeft, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AIUploadedFile, AIAnalysisResult, AIColumnMapping, CASEWYZE_SCHEMA } from "@/lib/aiImportTypes";
import { DelayedTooltip } from "@/components/ui/tooltip";

interface AIImportMappingProps {
  analysisResult: AIAnalysisResult;
  files: AIUploadedFile[];
  userMappings: Record<string, AIColumnMapping[]>;
  onMappingsChange: (mappings: Record<string, AIColumnMapping[]>) => void;
  onContinue: (mappings: Record<string, AIColumnMapping[]>) => void;
  onBack: () => void;
}

const CONFIDENCE_COLORS = {
  high: 'bg-green-500/10 text-green-600 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  low: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  none: 'bg-muted text-muted-foreground',
};

export function AIImportMapping({ 
  analysisResult, 
  files,
  userMappings, 
  onMappingsChange, 
  onContinue,
  onBack 
}: AIImportMappingProps) {
  const [activeTab, setActiveTab] = useState<string>(
    analysisResult.detectedEntities[0]?.sourceFile || ''
  );

  const getTargetFieldOptions = (entityType: string) => {
    const schema = CASEWYZE_SCHEMA[entityType as keyof typeof CASEWYZE_SCHEMA];
    if (!schema) return [];
    
    return [
      ...schema.required.map(f => ({ name: f, required: true })),
      ...schema.optional.map(f => ({ name: f, required: false })),
    ];
  };

  const handleMappingChange = (fileName: string, sourceColumn: string, targetField: string | null) => {
    const updatedMappings = { ...userMappings };
    const fileMappings = [...(updatedMappings[fileName] || [])];
    
    const mappingIndex = fileMappings.findIndex(m => m.sourceColumn === sourceColumn);
    if (mappingIndex >= 0) {
      fileMappings[mappingIndex] = {
        ...fileMappings[mappingIndex],
        targetField,
        userOverride: true,
        confidence: targetField ? 'high' : 'none'
      };
    }
    
    updatedMappings[fileName] = fileMappings;
    onMappingsChange(updatedMappings);
  };

  const getEntityForFile = (fileName: string) => {
    const entity = analysisResult.detectedEntities.find(e => e.sourceFile === fileName);
    return entity?.entityType || 'unknown';
  };

  const getMappedCount = (fileName: string) => {
    const mappings = userMappings[fileName] || [];
    return mappings.filter(m => m.targetField).length;
  };

  const getRequiredMappedCount = (fileName: string) => {
    const entityType = getEntityForFile(fileName);
    const schema = CASEWYZE_SCHEMA[entityType as keyof typeof CASEWYZE_SCHEMA];
    if (!schema) return { mapped: 0, total: 0 };
    
    const mappings = userMappings[fileName] || [];
    const mapped = schema.required.filter(r => 
      mappings.some(m => m.targetField === r)
    ).length;
    
    return { mapped, total: schema.required.length };
  };

  const allRequiredMapped = Object.keys(userMappings).every(fileName => {
    const { mapped, total } = getRequiredMappedCount(fileName);
    return mapped === total;
  });

  const fileEntries = Object.entries(userMappings);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Badge variant="outline" className="py-1.5 px-3">
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          {Object.values(userMappings).flat().filter(m => !m.userOverride && m.targetField).length} auto-mapped
        </Badge>
        <Badge variant="outline" className="py-1.5 px-3">
          <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
          {Object.values(userMappings).flat().filter(m => m.targetField).length} total mapped
        </Badge>
        {allRequiredMapped ? (
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

      {/* Mapping Interface */}
      {fileEntries.length === 1 ? (
        <MappingTable
          fileName={fileEntries[0][0]}
          mappings={fileEntries[0][1]}
          entityType={getEntityForFile(fileEntries[0][0])}
          onMappingChange={handleMappingChange}
          getTargetFieldOptions={getTargetFieldOptions}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {fileEntries.map(([fileName]) => {
              const { mapped, total } = getRequiredMappedCount(fileName);
              const isComplete = mapped === total;
              return (
                <TabsTrigger key={fileName} value={fileName} className="gap-2">
                  {fileName.slice(0, 20)}...
                  {isComplete ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
          
          {fileEntries.map(([fileName, mappings]) => (
            <TabsContent key={fileName} value={fileName}>
              <MappingTable
                fileName={fileName}
                mappings={mappings}
                entityType={getEntityForFile(fileName)}
                onMappingChange={handleMappingChange}
                getTargetFieldOptions={getTargetFieldOptions}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Analysis
        </Button>
        <Button 
          onClick={() => onContinue(userMappings)}
          disabled={!allRequiredMapped}
        >
          Continue to Review
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

interface MappingTableProps {
  fileName: string;
  mappings: AIColumnMapping[];
  entityType: string;
  onMappingChange: (fileName: string, sourceColumn: string, targetField: string | null) => void;
  getTargetFieldOptions: (entityType: string) => { name: string; required: boolean }[];
}

function MappingTable({ fileName, mappings, entityType, onMappingChange, getTargetFieldOptions }: MappingTableProps) {
  const targetOptions = getTargetFieldOptions(entityType);
  const schema = CASEWYZE_SCHEMA[entityType as keyof typeof CASEWYZE_SCHEMA];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Column Mapping: {fileName}
        </CardTitle>
        <CardDescription>
          Maps to <Badge>{schema?.displayName || entityType}</Badge> - {schema?.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-3 p-3 bg-muted rounded-lg text-sm font-medium">
              <div className="col-span-4">Source Column</div>
              <div className="col-span-1 text-center">→</div>
              <div className="col-span-4">Target Field</div>
              <div className="col-span-3">AI Reasoning</div>
            </div>
            
            {mappings.map((mapping) => (
              <div 
                key={mapping.sourceColumn}
                className={cn(
                  "grid grid-cols-12 gap-3 p-3 rounded-lg border transition-colors",
                  mapping.userOverride ? "bg-blue-500/5 border-blue-500/20" : "bg-card"
                )}
              >
                {/* Source Column */}
                <div className="col-span-4 flex items-center gap-2">
                  <code className="text-sm bg-muted px-2 py-1 rounded truncate">
                    {mapping.sourceColumn}
                  </code>
                </div>
                
                {/* Arrow */}
                <div className="col-span-1 flex items-center justify-center">
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                </div>
                
                {/* Target Field */}
                <div className="col-span-4 flex items-center gap-2">
                  <Select
                    value={mapping.targetField || '__skip__'}
                    onValueChange={(value) => onMappingChange(
                      fileName, 
                      mapping.sourceColumn, 
                      value === '__skip__' ? null : value
                    )}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">
                        <span className="text-muted-foreground">Skip this column</span>
                      </SelectItem>
                      {targetOptions.map((opt) => (
                        <SelectItem key={opt.name} value={opt.name}>
                          {opt.name}
                          {opt.required && <span className="text-destructive ml-1">*</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Badge className={cn("shrink-0", CONFIDENCE_COLORS[mapping.confidence])}>
                    {mapping.confidence}
                  </Badge>
                </div>
                
                {/* AI Reasoning */}
                <div className="col-span-3 flex items-center">
                  <DelayedTooltip content={mapping.aiReasoning}>
                    <p className="text-xs text-muted-foreground truncate cursor-help">
                      {mapping.aiReasoning}
                    </p>
                  </DelayedTooltip>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
