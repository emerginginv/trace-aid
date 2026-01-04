import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, ArrowRight, Settings2, 
  FileType, Lightbulb, Loader2 
} from "lucide-react";
import { ParsedCSV } from "@/lib/csvParser";
import { MappingConfig, DEFAULT_MAPPING_CONFIG, TypeMapping } from "@/types/import";
import { TypeMappingTable } from "./TypeMappingTable";
import { extractUniqueValues, suggestMappings } from "@/lib/importMapping";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

interface MappingConfigurationProps {
  parsedFiles: ParsedCSV[];
  sourceSystemName: string;
  onSourceSystemNameChange: (name: string) => void;
  mappingConfig: MappingConfig;
  onMappingConfigChange: (config: MappingConfig) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function MappingConfiguration({
  parsedFiles,
  sourceSystemName,
  onSourceSystemNameChange,
  mappingConfig,
  onMappingConfigChange,
  onBack,
  onContinue
}: MappingConfigurationProps) {
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [updateTypePicklist, setUpdateTypePicklist] = useState<string[]>([]);
  const [eventTypePicklist, setEventTypePicklist] = useState<string[]>([]);
  const [externalUpdateTypes, setExternalUpdateTypes] = useState<string[]>([]);
  const [externalEventTypes, setExternalEventTypes] = useState<string[]>([]);
  
  // Load picklists and extract external values
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        // Load organization picklists
        const { data: picklists } = await supabase
          .from('picklists')
          .select('type, value')
          .eq('organization_id', organization?.id)
          .eq('is_active', true);
        
        if (picklists) {
          setUpdateTypePicklist(
            picklists.filter(p => p.type === 'update_type').map(p => p.value)
          );
          setEventTypePicklist(
            picklists.filter(p => p.type === 'event_subtype').map(p => p.value)
          );
        }
        
        // Extract unique values from parsed files
        const updateFile = parsedFiles.find(f => f.entityType === 'update');
        const activityFile = parsedFiles.find(f => f.entityType === 'activity');
        
        if (updateFile) {
          const values = extractUniqueValues(updateFile.rows, 'update_type');
          setExternalUpdateTypes(values);
          
          // Auto-suggest mappings if none exist
          if (mappingConfig.updateTypes.length === 0 && values.length > 0 && picklists) {
            const picklistValues = picklists.filter(p => p.type === 'update_type').map(p => p.value);
            const suggestions = suggestMappings(values, picklistValues);
            onMappingConfigChange({
              ...mappingConfig,
              updateTypes: suggestions
            });
          }
        }
        
        if (activityFile) {
          const values = extractUniqueValues(activityFile.rows, 'event_subtype');
          setExternalEventTypes(values);
          
          // Auto-suggest mappings if none exist
          if (mappingConfig.eventTypes.length === 0 && values.length > 0 && picklists) {
            const picklistValues = picklists.filter(p => p.type === 'event_subtype').map(p => p.value);
            const suggestions = suggestMappings(values, picklistValues);
            onMappingConfigChange({
              ...mappingConfig,
              eventTypes: suggestions
            });
          }
        }
      } catch (error) {
        console.error('Error loading mapping data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [organization?.id, parsedFiles]);
  
  const hasTypesToMap = externalUpdateTypes.length > 0 || externalEventTypes.length > 0;
  
  const handleUpdateTypesChange = (mappings: TypeMapping[]) => {
    onMappingConfigChange({
      ...mappingConfig,
      updateTypes: mappings
    });
  };
  
  const handleEventTypesChange = (mappings: TypeMapping[]) => {
    onMappingConfigChange({
      ...mappingConfig,
      eventTypes: mappings
    });
  };
  
  const handleUnmappedActionChange = (action: 'skip' | 'use_original' | 'use_default') => {
    onMappingConfigChange({
      ...mappingConfig,
      unmappedAction: action
    });
  };
  
  // Count mapping stats
  const totalMappings = mappingConfig.updateTypes.length + mappingConfig.eventTypes.length;
  const mappedCount = [...mappingConfig.updateTypes, ...mappingConfig.eventTypes]
    .filter(m => m.casewyzeValue).length;
  const createCount = [...mappingConfig.updateTypes, ...mappingConfig.eventTypes]
    .filter(m => m.autoCreate).length;
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Mapping Configuration</h2>
        <p className="text-muted-foreground">
          Configure how external values map to CaseWyze types
        </p>
      </div>
      
      {/* Source System Name */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileType className="h-5 w-5" />
            Source System
          </CardTitle>
          <CardDescription>
            Identify the system this data is coming from for audit purposes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Label htmlFor="sourceSystem">Source System Name</Label>
            <Input
              id="sourceSystem"
              value={sourceSystemName}
              onChange={(e) => onSourceSystemNameChange(e.target.value)}
              placeholder="e.g., Legacy CMS, Salesforce, Custom Database"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This will be recorded with the import for audit trail
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Type Mappings */}
      {hasTypesToMap ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings2 className="h-5 w-5" />
              Type Mappings
            </CardTitle>
            <CardDescription>
              Map external type values to CaseWyze picklist values
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Auto-suggestion hint */}
            <Alert className="bg-primary/5 border-primary/20">
              <Lightbulb className="h-4 w-4 text-primary" />
              <AlertDescription>
                We've auto-suggested mappings based on similar values. Review and adjust as needed.
              </AlertDescription>
            </Alert>
            
            <Tabs defaultValue="update_types" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="update_types" className="gap-2">
                  Update Types
                  {externalUpdateTypes.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {externalUpdateTypes.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="event_types" className="gap-2">
                  Event Types
                  {externalEventTypes.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {externalEventTypes.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="update_types" className="mt-4">
                <TypeMappingTable
                  title="Update Types"
                  externalValues={externalUpdateTypes}
                  picklistValues={updateTypePicklist}
                  mappings={mappingConfig.updateTypes}
                  onMappingsChange={handleUpdateTypesChange}
                />
              </TabsContent>
              
              <TabsContent value="event_types" className="mt-4">
                <TypeMappingTable
                  title="Event Types"
                  externalValues={externalEventTypes}
                  picklistValues={eventTypePicklist}
                  mappings={mappingConfig.eventTypes}
                  onMappingsChange={handleEventTypesChange}
                />
              </TabsContent>
            </Tabs>
            
            <Separator />
            
            {/* Unmapped Value Handling */}
            <div className="space-y-4">
              <Label>Unmapped Value Handling</Label>
              <RadioGroup
                value={mappingConfig.unmappedAction}
                onValueChange={(v) => handleUnmappedActionChange(v as 'skip' | 'use_original' | 'use_default')}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="use_original" id="use_original" />
                  <Label htmlFor="use_original" className="font-normal cursor-pointer">
                    <span className="font-medium">Use original value</span>
                    <span className="text-muted-foreground ml-2">
                      - Create new picklist values from unmapped external values
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="use_default" id="use_default" />
                  <Label htmlFor="use_default" className="font-normal cursor-pointer">
                    <span className="font-medium">Use default value</span>
                    <span className="text-muted-foreground ml-2">
                      - Assign a default type to unmapped values
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="skip" id="skip" />
                  <Label htmlFor="skip" className="font-normal cursor-pointer">
                    <span className="font-medium">Skip record</span>
                    <span className="text-muted-foreground ml-2">
                      - Skip records with unmapped type values
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <Settings2 className="h-4 w-4" />
          <AlertDescription>
            No type mappings needed. Your import files don't contain update types or event types that require mapping.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Summary */}
      {hasTypesToMap && (
        <div className="flex justify-center gap-4 text-sm">
          <Badge variant="outline" className="py-1 px-3">
            {mappedCount} of {externalUpdateTypes.length + externalEventTypes.length} types mapped
          </Badge>
          {createCount > 0 && (
            <Badge variant="outline" className="py-1 px-3 bg-blue-500/10 text-blue-600">
              {createCount} new values will be created
            </Badge>
          )}
        </div>
      )}
      
      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Validation
        </Button>
        <Button onClick={onContinue}>
          Continue to Confirmation
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
