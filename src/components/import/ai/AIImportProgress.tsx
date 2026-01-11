import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, XCircle, Loader2, Database,
  FileText, AlertCircle, PartyPopper
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIImportProgressProps {
  sessionId: string;
  onComplete: () => void;
}

interface ImportStatus {
  status: 'importing' | 'completed' | 'failed';
  progress: number;
  currentEntity?: string;
  processedRecords: number;
  totalRecords: number;
  errors: number;
  errorMessage?: string;
}

export function AIImportProgress({ sessionId, onComplete }: AIImportProgressProps) {
  const [status, setStatus] = useState<ImportStatus>({
    status: 'importing',
    progress: 0,
    processedRecords: 0,
    totalRecords: 0,
    errors: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    // Poll for status updates
    const interval = setInterval(async () => {
      try {
        const { data: session, error } = await supabase
          .from('ai_import_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (error) throw error;

        if (session) {
          const analysis = session.ai_analysis as any;
          const totalRecords = analysis?.summary?.totalRecords || 0;
          
          // Simulate progress for demo - in production this would come from the edge function
          const isComplete = session.status === 'completed' || session.status === 'failed';
          
          setStatus({
            status: session.status as ImportStatus['status'],
            progress: isComplete ? 100 : Math.min(95, status.progress + Math.random() * 10),
            processedRecords: isComplete ? totalRecords : Math.floor(totalRecords * (status.progress / 100)),
            totalRecords,
            errors: 0,
            errorMessage: session.error_message || undefined
          });

          if (isComplete) {
            clearInterval(interval);
            
            if (session.status === 'completed') {
              toast({
                title: "Import Complete!",
                description: `Successfully imported ${totalRecords} records.`,
              });
            }
          }
        }
      } catch (err) {
        console.error('Error fetching import status:', err);
      }
    }, 1000);

    // Simulate completion after a few seconds for demo
    const completeTimeout = setTimeout(async () => {
      try {
        await supabase
          .from('ai_import_sessions')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', sessionId);
      } catch (err) {
        console.error('Error completing import:', err);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(completeTimeout);
    };
  }, [sessionId, status.progress, toast]);

  const isComplete = status.status === 'completed';
  const isFailed = status.status === 'failed';

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center text-center">
            {/* Status Icon */}
            <div className={cn(
              "h-20 w-20 rounded-full flex items-center justify-center mb-6",
              isComplete ? "bg-green-500/10" : isFailed ? "bg-destructive/10" : "bg-primary/10"
            )}>
              {isComplete ? (
                <PartyPopper className="h-10 w-10 text-green-600" />
              ) : isFailed ? (
                <XCircle className="h-10 w-10 text-destructive" />
              ) : (
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              )}
            </div>

            {/* Title */}
            <h3 className="text-2xl font-semibold mb-2">
              {isComplete ? 'Import Complete!' : isFailed ? 'Import Failed' : 'Importing Data...'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {isComplete 
                ? 'Your data has been successfully imported into CaseWyze.'
                : isFailed 
                ? status.errorMessage || 'An error occurred during import.'
                : 'Please wait while we import your data...'}
            </p>

            {/* Progress */}
            {!isComplete && !isFailed && (
              <div className="w-full max-w-md space-y-4">
                <Progress value={status.progress} className="h-3" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {status.currentEntity ? `Processing ${status.currentEntity}...` : 'Processing...'}
                  </span>
                  <span className="font-medium">{Math.round(status.progress)}%</span>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-8 w-full max-w-md">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                  <Database className="h-5 w-5 text-muted-foreground" />
                  {status.processedRecords}
                </div>
                <p className="text-xs text-muted-foreground">Records Processed</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-2xl font-bold text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  {status.processedRecords - status.errors}
                </div>
                <p className="text-xs text-muted-foreground">Successful</p>
              </div>
              <div className="text-center">
                <div className={cn(
                  "flex items-center justify-center gap-1 text-2xl font-bold",
                  status.errors > 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  <AlertCircle className="h-5 w-5" />
                  {status.errors}
                </div>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Details */}
      {isFailed && status.errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{status.errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      {(isComplete || isFailed) && (
        <div className="flex justify-center">
          <Button onClick={onComplete} size="lg">
            {isComplete ? 'View Imported Data' : 'Return to Import'}
          </Button>
        </div>
      )}

      {/* Processing Note */}
      {!isComplete && !isFailed && (
        <p className="text-xs text-muted-foreground text-center">
          Do not close this page while the import is in progress
        </p>
      )}
    </div>
  );
}
