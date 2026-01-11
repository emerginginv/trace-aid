import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, ArrowLeft, ArrowRight, Loader2, CheckCircle2,
  AlertCircle, AlertTriangle, Info, Sparkles, FileText
} from "lucide-react";
import { AIUploadedFile, AIAnalysisResult, AIFileSummary } from "@/lib/aiImportTypes";
import { prepareFilesForAnalysis } from "@/lib/aiImportParser";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIAnalysisResultsProps {
  files: AIUploadedFile[];
  onAnalysisComplete: (result: AIAnalysisResult) => void;
  onBack: () => void;
}

type AnalysisPhase = 'preparing' | 'analyzing' | 'processing' | 'complete' | 'error';

export function AIAnalysisResults({ files, onAnalysisComplete, onBack }: AIAnalysisResultsProps) {
  const [phase, setPhase] = useState<AnalysisPhase>('preparing');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Preparing files for analysis...');
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    runAnalysis();
  }, []);

  const runAnalysis = async () => {
    try {
      setPhase('preparing');
      setProgress(10);
      setStatusMessage('Preparing files for AI analysis...');
      
      const preparedFiles = prepareFilesForAnalysis(files);
      
      if (preparedFiles.length === 0) {
        throw new Error('No valid files to analyze');
      }
      
      setPhase('analyzing');
      setProgress(30);
      setStatusMessage(`Analyzing ${preparedFiles.length} file(s) with AI...`);
      
      // Call edge function for AI analysis
      const { data, error: fnError } = await supabase.functions.invoke('analyze-import', {
        body: { files: preparedFiles }
      });
      
      if (fnError) {
        throw new Error(fnError.message || 'Analysis failed');
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      setPhase('processing');
      setProgress(80);
      setStatusMessage('Processing AI recommendations...');
      
      // Process the result
      const analysisResult: AIAnalysisResult = {
        sessionId: data.sessionId || crypto.randomUUID(),
        status: data.status || 'success',
        detectedEntities: data.detectedEntities || [],
        columnMappings: data.columnMappings || {},
        conflicts: data.conflicts || [],
        dataQualityIssues: data.dataQualityIssues || [],
        fileSummaries: data.fileSummaries || [],
        summary: data.summary || {
          totalFiles: preparedFiles.length,
          totalRecords: 0,
          readyToImport: 0,
          needsReview: 0,
          unsupported: 0
        },
        processingTime: data.processingTime || 0,
        aiModel: data.aiModel || 'google/gemini-3-flash-preview'
      };
      
      setResult(analysisResult);
      setPhase('complete');
      setProgress(100);
      setStatusMessage('Analysis complete!');
      
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setPhase('error');
      toast({
        title: "Analysis Failed",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  const handleContinue = () => {
    if (result) {
      onAnalysisComplete(result);
    }
  };

  const getSeverityIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info': return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getSeverityBadge = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error': return <Badge variant="destructive">Error</Badge>;
      case 'warning': return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Warning</Badge>;
      case 'info': return <Badge variant="secondary">Info</Badge>;
    }
  };

  if (phase === 'error') {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Analysis Failed:</strong> {error}
          </AlertDescription>
        </Alert>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Upload
          </Button>
          <Button onClick={runAnalysis}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (phase !== 'complete') {
    return (
      <Card>
        <CardContent className="py-16">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <Brain className="h-16 w-16 text-primary" />
              <Sparkles className="h-6 w-6 text-primary absolute -top-1 -right-1 animate-pulse" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Analysis in Progress</h3>
            <p className="text-muted-foreground mb-6">{statusMessage}</p>
            <div className="w-full max-w-md space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{phase === 'preparing' ? 'Preparing' : phase === 'analyzing' ? 'Analyzing' : 'Processing'}</span>
                <span>{progress}%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              This may take 30-60 seconds depending on file size
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  const errorCount = result.conflicts.filter(c => c.severity === 'error').length;
  const warningCount = result.conflicts.filter(c => c.severity === 'warning').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{result.summary.totalFiles}</div>
            <p className="text-sm text-muted-foreground">Files Analyzed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{result.summary.readyToImport}</div>
            <p className="text-sm text-muted-foreground">Ready to Import</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{result.summary.needsReview}</div>
            <p className="text-sm text-muted-foreground">Needs Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{result.summary.totalRecords}</div>
            <p className="text-sm text-muted-foreground">Total Records</p>
          </CardContent>
        </Card>
      </div>

      {/* Detected Entities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Detected Entities
          </CardTitle>
          <CardDescription>
            AI has identified the following data types in your files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {result.detectedEntities.map((entity, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{entity.sourceFile}</p>
                    <p className="text-sm text-muted-foreground">{entity.reasoning}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{entity.entityType}</Badge>
                  <Badge 
                    variant="outline"
                    className={entity.confidence >= 0.8 ? 'border-green-500 text-green-600' : entity.confidence >= 0.5 ? 'border-yellow-500 text-yellow-600' : 'border-red-500 text-red-600'}
                  >
                    {Math.round(entity.confidence * 100)}% confident
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conflicts & Issues */}
      {result.conflicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Conflicts & Issues ({result.conflicts.length})
            </CardTitle>
            <CardDescription>
              Review these issues before proceeding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.conflicts.slice(0, 10).map((conflict) => (
                <Alert key={conflict.id} variant={conflict.severity === 'error' ? 'destructive' : 'default'}>
                  {getSeverityIcon(conflict.severity)}
                  <AlertDescription className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{conflict.message}</p>
                      <p className="text-sm text-muted-foreground mt-1">{conflict.suggestion}</p>
                    </div>
                    {getSeverityBadge(conflict.severity)}
                  </AlertDescription>
                </Alert>
              ))}
              {result.conflicts.length > 10 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  +{result.conflicts.length - 10} more issues
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Time */}
      <p className="text-xs text-muted-foreground text-center">
        Analysis completed in {(result.processingTime / 1000).toFixed(1)}s using {result.aiModel}
      </p>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Upload
        </Button>
        <Button 
          onClick={handleContinue}
          disabled={errorCount > 0 && result.summary.readyToImport === 0}
        >
          {errorCount > 0 ? 'Review Mappings Anyway' : 'Continue to Mapping'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
