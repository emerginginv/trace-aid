import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CheckCircle2, AlertCircle, ArrowRight, 
  Wand2, RefreshCw, HelpCircle, Sparkles,
  Link2, Link2Off
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TEMPLATE_COLUMNS, ColumnDefinition, EntityDefinition } from "@/lib/templateColumnDefinitions";
import { DelayedTooltip } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string | null;
  confidence: 'high' | 'medium' | 'low' | 'manual' | 'none';
  sampleValues: string[];
}

interface ColumnMapperProps {
  entityType: string;
  sourceHeaders: string[];
  sampleData: Record<string, string>[];
  mappings: ColumnMapping[];
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  onAutoMap?: () => void;
}

// Calculate string similarity using Levenshtein distance
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

function calculateSimilarity(source: string, target: string): number {
  const a = source.toLowerCase().replace(/[_\-\s]/g, '');
  const b = target.toLowerCase().replace(/[_\-\s]/g, '');
  
  // Exact match
  if (a === b) return 1;
  
  // One contains the other
  if (a.includes(b) || b.includes(a)) return 0.85;
  
  // Levenshtein-based similarity
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}

// Common column name aliases
const COLUMN_ALIASES: Record<string, string[]> = {
  'external_record_id': ['id', 'record_id', 'external_id', 'source_id', 'legacy_id', 'old_id', 'ref', 'reference'],
  'name': ['company_name', 'client_name', 'account_name', 'full_name', 'title'],
  'first_name': ['firstname', 'fname', 'given_name', 'first'],
  'last_name': ['lastname', 'lname', 'surname', 'family_name', 'last'],
  'email': ['email_address', 'e_mail', 'mail', 'contact_email'],
  'phone': ['phone_number', 'telephone', 'tel', 'mobile', 'cell', 'contact_phone'],
  'address': ['street', 'street_address', 'address1', 'addr', 'mailing_address'],
  'city': ['town', 'municipality'],
  'state': ['province', 'region', 'st'],
  'zip_code': ['zip', 'postal', 'postal_code', 'postcode'],
  'description': ['desc', 'details', 'notes', 'summary', 'info'],
  'created_at': ['create_date', 'created', 'date_created', 'creation_date'],
  'case_number': ['file_number', 'matter_number', 'reference_number', 'ref_num'],
  'claim_number': ['claim_no', 'claim_ref', 'insurance_claim'],
  'status': ['case_status', 'current_status', 'state'],
  'account_external_id': ['client_id', 'account_id', 'customer_id'],
  'contact_external_id': ['contact_id', 'person_id'],
  'case_external_id': ['case_id', 'matter_id', 'file_id'],
};

function findBestMatch(sourceColumn: string, targetColumns: ColumnDefinition[]): { column: string; confidence: 'high' | 'medium' | 'low' } | null {
  const normalizedSource = sourceColumn.toLowerCase().replace(/[_\-\s]/g, '');
  
  // Check exact matches first
  for (const target of targetColumns) {
    const normalizedTarget = target.name.toLowerCase().replace(/[_\-\s]/g, '');
    if (normalizedSource === normalizedTarget) {
      return { column: target.name, confidence: 'high' };
    }
  }
  
  // Check aliases
  for (const target of targetColumns) {
    const aliases = COLUMN_ALIASES[target.name] || [];
    for (const alias of aliases) {
      const normalizedAlias = alias.toLowerCase().replace(/[_\-\s]/g, '');
      if (normalizedSource === normalizedAlias || normalizedSource.includes(normalizedAlias)) {
        return { column: target.name, confidence: 'high' };
      }
    }
  }
  
  // Check similarity scores
  let bestMatch: { column: string; score: number } | null = null;
  
  for (const target of targetColumns) {
    const score = calculateSimilarity(sourceColumn, target.name);
    if (score > 0.6 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { column: target.name, score };
    }
    
    // Also check aliases for similarity
    const aliases = COLUMN_ALIASES[target.name] || [];
    for (const alias of aliases) {
      const aliasScore = calculateSimilarity(sourceColumn, alias);
      if (aliasScore > 0.6 && (!bestMatch || aliasScore > bestMatch.score)) {
        bestMatch = { column: target.name, score: aliasScore };
      }
    }
  }
  
  if (bestMatch) {
    const confidence = bestMatch.score > 0.8 ? 'high' : bestMatch.score > 0.65 ? 'medium' : 'low';
    return { column: bestMatch.column, confidence };
  }
  
  return null;
}

export function generateAutoMappings(
  sourceHeaders: string[],
  entityType: string,
  sampleData: Record<string, string>[]
): ColumnMapping[] {
  const entityDef = TEMPLATE_COLUMNS[entityType];
  if (!entityDef) {
    return sourceHeaders.map(header => ({
      sourceColumn: header,
      targetColumn: null,
      confidence: 'none' as const,
      sampleValues: sampleData.slice(0, 3).map(row => row[header] || '').filter(Boolean)
    }));
  }
  
  const mappings: ColumnMapping[] = [];
  const usedTargets = new Set<string>();
  
  for (const header of sourceHeaders) {
    const sampleValues = sampleData.slice(0, 3).map(row => row[header] || '').filter(Boolean);
    
    // Find best match among unused columns
    const availableColumns = entityDef.columns.filter(c => !usedTargets.has(c.name));
    const match = findBestMatch(header, availableColumns);
    
    if (match) {
      usedTargets.add(match.column);
      mappings.push({
        sourceColumn: header,
        targetColumn: match.column,
        confidence: match.confidence,
        sampleValues
      });
    } else {
      mappings.push({
        sourceColumn: header,
        targetColumn: null,
        confidence: 'none',
        sampleValues
      });
    }
  }
  
  return mappings;
}

export function ColumnMapper({
  entityType,
  sourceHeaders,
  sampleData,
  mappings,
  onMappingsChange,
  onAutoMap
}: ColumnMapperProps) {
  const entityDef = TEMPLATE_COLUMNS[entityType];
  
  // Get available target columns
  const targetColumns = useMemo(() => {
    return entityDef?.columns || [];
  }, [entityDef]);
  
  // Calculate stats
  const mappedCount = mappings.filter(m => m.targetColumn).length;
  const requiredColumns = targetColumns.filter(c => c.required);
  const mappedRequired = requiredColumns.filter(c => 
    mappings.some(m => m.targetColumn === c.name)
  );
  const allRequiredMapped = mappedRequired.length === requiredColumns.length;
  
  const handleMappingChange = (sourceColumn: string, targetColumn: string | null) => {
    const newMappings = mappings.map(m => {
      if (m.sourceColumn === sourceColumn) {
        return {
          ...m,
          targetColumn: targetColumn === 'unmapped' ? null : targetColumn,
          confidence: 'manual' as const
        };
      }
      // Clear any other mapping to the same target
      if (targetColumn && m.targetColumn === targetColumn && m.sourceColumn !== sourceColumn) {
        return { ...m, targetColumn: null, confidence: 'none' as const };
      }
      return m;
    });
    onMappingsChange(newMappings);
  };
  
  const handleAutoMap = () => {
    const autoMappings = generateAutoMappings(sourceHeaders, entityType, sampleData);
    onMappingsChange(autoMappings);
  };
  
  const getConfidenceBadge = (confidence: ColumnMapping['confidence']) => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">Auto</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">Suggested</Badge>;
      case 'low':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">Review</Badge>;
      case 'manual':
        return <Badge variant="secondary" className="text-xs">Manual</Badge>;
      default:
        return null;
    }
  };
  
  const getColumnDefinition = (columnName: string): ColumnDefinition | undefined => {
    return targetColumns.find(c => c.name === columnName);
  };
  
  const usedTargets = new Set(mappings.filter(m => m.targetColumn).map(m => m.targetColumn));
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Column Mapping
            </CardTitle>
            <CardDescription>
              Map your file columns to CaseWyze fields for {entityDef?.displayName || entityType}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleAutoMap}>
            <Wand2 className="h-4 w-4 mr-2" />
            Auto-Map
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex items-center gap-4 flex-wrap">
          <Badge variant="outline" className="py-1">
            {mappedCount} of {sourceHeaders.length} columns mapped
          </Badge>
          {allRequiredMapped ? (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 py-1">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              All required fields mapped
            </Badge>
          ) : (
            <Badge variant="destructive" className="py-1">
              <AlertCircle className="h-3 w-3 mr-1" />
              {requiredColumns.length - mappedRequired.length} required fields missing
            </Badge>
          )}
        </div>
        
        {/* Auto-mapping hint */}
        {mappings.some(m => m.confidence === 'high' || m.confidence === 'medium') && (
          <Alert className="bg-primary/5 border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertDescription>
              We've automatically suggested mappings based on column name similarity. Review and adjust as needed.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Mapping Table */}
        <ScrollArea className="h-[400px] rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[200px]">Your Column</TableHead>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="w-[200px]">CaseWyze Field</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
                <TableHead>Sample Values</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping) => {
                const targetDef = mapping.targetColumn ? getColumnDefinition(mapping.targetColumn) : null;
                const isMapped = !!mapping.targetColumn;
                const isRequired = targetDef?.required;
                
                return (
                  <TableRow key={mapping.sourceColumn} className={cn(
                    !isMapped && "bg-muted/30"
                  )}>
                    <TableCell className="font-mono text-sm">
                      {mapping.sourceColumn}
                    </TableCell>
                    <TableCell>
                      {isMapped ? (
                        <ArrowRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <Link2Off className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapping.targetColumn || 'unmapped'}
                        onValueChange={(value) => handleMappingChange(mapping.sourceColumn, value)}
                      >
                        <SelectTrigger className={cn(
                          "w-full",
                          !isMapped && "border-dashed"
                        )}>
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unmapped">
                            <span className="text-muted-foreground">— Don't import —</span>
                          </SelectItem>
                          {targetColumns.map((col) => (
                            <SelectItem 
                              key={col.name} 
                              value={col.name}
                              disabled={usedTargets.has(col.name) && mapping.targetColumn !== col.name}
                            >
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  col.required && "font-medium"
                                )}>
                                  {col.name}
                                </span>
                                {col.required && (
                                  <Badge variant="destructive" className="text-[10px] px-1 py-0">Required</Badge>
                                )}
                                {usedTargets.has(col.name) && mapping.targetColumn !== col.name && (
                                  <span className="text-xs text-muted-foreground">(used)</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getConfidenceBadge(mapping.confidence)}
                        {targetDef && (
                          <DelayedTooltip content={
                            <div className="max-w-xs">
                              <p className="font-medium">{targetDef.name}</p>
                              <p className="text-xs mt-1">{targetDef.description}</p>
                              {targetDef.example && (
                                <p className="text-xs mt-1 text-muted-foreground">
                                  Example: {targetDef.example}
                                </p>
                              )}
                            </div>
                          }>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </DelayedTooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {mapping.sampleValues.slice(0, 2).join(', ') || '—'}
                      {mapping.sampleValues.length > 2 && '...'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
        
        {/* Unmapped Required Fields Warning */}
        {!allRequiredMapped && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Missing required fields:</strong>{' '}
              {requiredColumns
                .filter(c => !mappings.some(m => m.targetColumn === c.name))
                .map(c => c.name)
                .join(', ')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
