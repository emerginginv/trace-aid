import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, XCircle, AlertTriangle, Download, ArrowLeft, 
  ArrowRight, FileJson, FileSpreadsheet, Database, Clock, Sparkles
} from "lucide-react";
import { DryRunResult, DryRunError, DryRunWarning } from "@/types/import";
import { exportDryRunAsCSV, exportDryRunAsJSON } from "@/lib/importService";
import { getEntityDisplayName } from "@/lib/csvParser";

interface DryRunResultsProps {
  result: DryRunResult;
  onBack: () => void;
  onContinue: () => void;
}

export function DryRunResults({ result, onBack, onContinue }: DryRunResultsProps) {
  const [acknowledgedWarnings, setAcknowledgedWarnings] = useState(false);
  
  const canProceed = result.success && (result.warnings.length === 0 || acknowledgedWarnings);
  
  // Group records by entity type
  const recordsByType = result.details.reduce((acc, detail) => {
    const key = detail.entityType;
    if (!acc[key]) acc[key] = { create: 0, update: 0, skip: 0 };
    acc[key][detail.operation]++;
    return acc;
  }, {} as Record<string, { create: number; update: number; skip: number }>);
  
  // Group errors by entity type
  const errorsByType = result.errors.reduce((acc, err) => {
    if (!acc[err.entityType]) acc[err.entityType] = [];
    acc[err.entityType].push(err);
    return acc;
  }, {} as Record<string, DryRunError[]>);
  
  const handleExportCSV = () => {
    const csv = exportDryRunAsCSV(result);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dry-run-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleExportJSON = () => {
    const json = exportDryRunAsJSON(result);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dry-run-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold flex items-center justify-center gap-2">
          {result.success ? (
            <>
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Dry Run Passed
            </>
          ) : (
            <>
              <XCircle className="h-6 w-6 text-destructive" />
              Dry Run Failed
            </>
          )}
        </h2>
        <p className="text-muted-foreground">
          {result.success 
            ? 'All records passed validation. Review the summary before proceeding.'
            : 'Some records have blocking errors that must be fixed.'}
        </p>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Database className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{result.totalRecords}</p>
            <p className="text-sm text-muted-foreground">Total Records</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-green-600">{result.recordsToCreate}</p>
            <p className="text-sm text-muted-foreground">To Create</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <XCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p className="text-2xl font-bold text-destructive">{result.recordsToSkip}</p>
            <p className="text-sm text-muted-foreground">To Skip (Errors)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{(result.durationMs / 1000).toFixed(1)}s</p>
            <p className="text-sm text-muted-foreground">Duration</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Blocking Errors Alert */}
      {!result.success && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{result.errors.filter(e => e.severity === 'blocking').length} blocking error(s)</strong> must be 
            fixed before importing. Go back and correct the source files.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Warnings Alert */}
      {result.success && result.warnings.length > 0 && (
        <Alert className="border-yellow-500 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong>{result.warnings.length} warning(s)</strong> were found but won't block the import.
            </span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledgedWarnings}
                onChange={(e) => setAcknowledgedWarnings(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm">I've reviewed and accept these warnings</span>
            </label>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Detailed Results Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Detailed Results</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportJSON}>
                <FileJson className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="summary">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="errors" className="relative">
                Errors
                {result.errors.length > 0 && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {result.errors.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="warnings" className="relative">
                Warnings
                {result.warnings.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs bg-yellow-500/20 text-yellow-700">
                    {result.warnings.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="normalization">Normalization</TabsTrigger>
            </TabsList>
            
            {/* Summary Tab */}
            <TabsContent value="summary" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity Type</TableHead>
                    <TableHead className="text-right">Create</TableHead>
                    <TableHead className="text-right">Update</TableHead>
                    <TableHead className="text-right">Skip</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(recordsByType).map(([type, counts]) => (
                    <TableRow key={type}>
                      <TableCell className="font-medium">{getEntityDisplayName(type)}</TableCell>
                      <TableCell className="text-right text-green-600">{counts.create}</TableCell>
                      <TableCell className="text-right text-blue-600">{counts.update}</TableCell>
                      <TableCell className="text-right text-destructive">{counts.skip}</TableCell>
                      <TableCell className="text-right font-medium">
                        {counts.create + counts.update + counts.skip}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            
            {/* Errors Tab */}
            <TabsContent value="errors" className="mt-4">
              {result.errors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p>No errors found</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">Row</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>External ID</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((error, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{error.row}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getEntityDisplayName(error.entityType)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{error.externalRecordId}</TableCell>
                          <TableCell className="font-mono text-xs">{error.field}</TableCell>
                          <TableCell className="text-destructive text-sm">{error.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </TabsContent>
            
            {/* Warnings Tab */}
            <TabsContent value="warnings" className="mt-4">
              {result.warnings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p>No warnings</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">Row</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Warning</TableHead>
                        <TableHead>Resolution</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.warnings.map((warning, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{warning.row}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getEntityDisplayName(warning.entityType)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{warning.field}</TableCell>
                          <TableCell className="text-yellow-700 text-sm">{warning.message}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {warning.autoResolution || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </TabsContent>
            
            {/* Normalization Tab */}
            <TabsContent value="normalization" className="mt-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                  <p className="text-sm text-muted-foreground">Dates Normalized</p>
                  <p className="text-2xl font-bold">{result.normalizationLog.datesNormalized}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                  <p className="text-sm text-muted-foreground">Currencies Cleaned</p>
                  <p className="text-2xl font-bold">{result.normalizationLog.currenciesCleaned}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                  <p className="text-sm text-muted-foreground">Texts Trimmed</p>
                  <p className="text-2xl font-bold">{result.normalizationLog.textsTrimmed}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                  <p className="text-sm text-muted-foreground">Emails Normalized</p>
                  <p className="text-2xl font-bold">{result.normalizationLog.emailsNormalized}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                  <p className="text-sm text-muted-foreground">Phones Normalized</p>
                  <p className="text-2xl font-bold">{result.normalizationLog.phonesNormalized}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                  <p className="text-sm text-muted-foreground">States Normalized</p>
                  <p className="text-2xl font-bold">{result.normalizationLog.statesNormalized}</p>
                </div>
              </div>
              
              {result.normalizationLog.typesCreated.length > 0 && (
                <div className="mt-4 p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    <p className="font-medium text-sm">New Picklist Values to Create</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.normalizationLog.typesCreated.map((type, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-blue-500/10">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Mapping
        </Button>
        <Button 
          onClick={onContinue}
          disabled={!canProceed}
          size="lg"
        >
          {result.success ? 'Continue to Confirmation' : 'Fix Errors & Retry'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
      
      {!canProceed && result.success && result.warnings.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Please acknowledge the warnings above to continue
        </p>
      )}
    </div>
  );
}
