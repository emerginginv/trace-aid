import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  CheckCircle2, AlertCircle, AlertTriangle, 
  ChevronDown, ArrowRight, FileText 
} from "lucide-react";
import { 
  ParsedCSV, ParseError, 
  validateCSVStructure, validateRowData, validateCrossFileReferences,
  getEntityDisplayName, sortByImportOrder
} from "@/lib/csvParser";

interface ValidationReportProps {
  parsedFiles: ParsedCSV[];
  onBack: () => void;
  onContinue: (errors: ParseError[], warnings: ParseError[]) => void;
}

interface EntitySummary {
  entityType: string;
  displayName: string;
  rowCount: number;
  errors: ParseError[];
  warnings: ParseError[];
}

export function ValidationReport({ parsedFiles, onBack, onContinue }: ValidationReportProps) {
  const validationResults = useMemo(() => {
    const allErrors: ParseError[] = [];
    const allWarnings: ParseError[] = [];
    const summaries: EntitySummary[] = [];
    
    const sortedFiles = sortByImportOrder(parsedFiles);
    
    for (const file of sortedFiles) {
      const fileErrors: ParseError[] = [...file.errors];
      const fileWarnings: ParseError[] = [...file.warnings];
      
      // Structure validation
      const structureResult = validateCSVStructure(file);
      fileErrors.push(...structureResult.errors);
      fileWarnings.push(...structureResult.warnings);
      
      // Row data validation
      const rowResult = validateRowData(file);
      fileErrors.push(...rowResult.errors);
      fileWarnings.push(...rowResult.warnings);
      
      summaries.push({
        entityType: file.entityType,
        displayName: getEntityDisplayName(file.entityType),
        rowCount: file.rowCount,
        errors: fileErrors,
        warnings: fileWarnings
      });
      
      // Add file context to errors/warnings
      allErrors.push(...fileErrors.map(e => ({
        ...e,
        message: `[${file.fileName}] ${e.message}`
      })));
      allWarnings.push(...fileWarnings.map(w => ({
        ...w,
        message: `[${file.fileName}] ${w.message}`
      })));
    }
    
    // Cross-file reference validation
    const crossFileResult = validateCrossFileReferences(sortedFiles);
    allErrors.push(...crossFileResult.errors);
    allWarnings.push(...crossFileResult.warnings);
    
    return {
      summaries,
      allErrors,
      allWarnings,
      totalRecords: summaries.reduce((acc, s) => acc + s.rowCount, 0),
      isValid: allErrors.length === 0
    };
  }, [parsedFiles]);
  
  const { summaries, allErrors, allWarnings, totalRecords, isValid } = validationResults;
  
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Pre-Import Validation Report</h2>
        <p className="text-muted-foreground">
          Review validation results before proceeding with the import
        </p>
      </div>
      
      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{totalRecords}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className={allErrors.length > 0 ? "border-destructive" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className={`h-5 w-5 ${allErrors.length > 0 ? "text-destructive" : "text-green-500"}`} />
              <span className={`text-2xl font-bold ${allErrors.length > 0 ? "text-destructive" : ""}`}>
                {allErrors.length}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card className={allWarnings.length > 0 ? "border-yellow-500" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${allWarnings.length > 0 ? "text-yellow-500" : "text-green-500"}`} />
              <span className={`text-2xl font-bold ${allWarnings.length > 0 ? "text-yellow-600 dark:text-yellow-500" : ""}`}>
                {allWarnings.length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Validation Status */}
      {isValid ? (
        <Alert className="border-green-500 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle>Validation Passed</AlertTitle>
          <AlertDescription>
            All files passed validation. You can proceed with the import.
            {allWarnings.length > 0 && ` Review ${allWarnings.length} warning(s) below.`}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Validation Failed</AlertTitle>
          <AlertDescription>
            {allErrors.length} error(s) must be fixed before importing. 
            Download the error report and correct your files.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Entity Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Import Summary by Entity</CardTitle>
          <CardDescription>
            Records will be imported in this order to maintain referential integrity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead className="text-right">Records</TableHead>
                <TableHead className="text-right">Errors</TableHead>
                <TableHead className="text-right">Warnings</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((summary, index) => (
                <TableRow key={summary.entityType}>
                  <TableCell className="font-mono text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </TableCell>
                  <TableCell className="font-medium">{summary.displayName}</TableCell>
                  <TableCell className="text-right">{summary.rowCount}</TableCell>
                  <TableCell className="text-right">
                    {summary.errors.length > 0 ? (
                      <Badge variant="destructive">{summary.errors.length}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {summary.warnings.length > 0 ? (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                        {summary.warnings.length}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {summary.errors.length === 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Error Details */}
      {allErrors.length > 0 && (
        <Collapsible defaultOpen>
          <Card className="border-destructive">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-destructive flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Errors ({allErrors.length})
                    </CardTitle>
                    <CardDescription>
                      These issues must be fixed before importing
                    </CardDescription>
                  </div>
                  <ChevronDown className="h-5 w-5" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Row</TableHead>
                        <TableHead className="w-32">Column</TableHead>
                        <TableHead>Error Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allErrors.slice(0, 50).map((error, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">
                            {error.row || '-'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {error.column || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {error.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {allErrors.length > 50 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      ... and {allErrors.length - 50} more errors
                    </p>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
      
      {/* Warning Details */}
      {allWarnings.length > 0 && (
        <Collapsible>
          <Card className="border-yellow-500">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-yellow-600 dark:text-yellow-500 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Warnings ({allWarnings.length})
                    </CardTitle>
                    <CardDescription>
                      Review these issues - import can proceed but data may need attention
                    </CardDescription>
                  </div>
                  <ChevronDown className="h-5 w-5" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Row</TableHead>
                        <TableHead className="w-32">Column</TableHead>
                        <TableHead>Warning Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allWarnings.slice(0, 50).map((warning, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">
                            {warning.row || '-'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {warning.column || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {warning.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {allWarnings.length > 50 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      ... and {allWarnings.length - 50} more warnings
                    </p>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
      
      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Upload
        </Button>
        <Button 
          onClick={() => onContinue(allErrors, allWarnings)}
          disabled={!isValid}
        >
          Continue to Confirmation
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
