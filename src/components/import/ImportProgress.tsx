import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";
import { ParsedCSV, getEntityDisplayName, sortByImportOrder } from "@/lib/csvParser";
import { cn } from "@/lib/utils";

export interface EntityProgress {
  entityType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed: number;
  total: number;
  errors: number;
}

interface ImportProgressProps {
  parsedFiles: ParsedCSV[];
  progress: EntityProgress[];
  currentEntity: string | null;
  overallProgress: number;
  isComplete: boolean;
  onComplete: () => void;
}

export function ImportProgress({ 
  parsedFiles,
  progress,
  currentEntity,
  overallProgress,
  isComplete,
  onComplete
}: ImportProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  
  useEffect(() => {
    if (isComplete) return;
    
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isComplete]);
  
  useEffect(() => {
    if (isComplete) {
      // Small delay before transitioning to results
      const timeout = setTimeout(onComplete, 1500);
      return () => clearTimeout(timeout);
    }
  }, [isComplete, onComplete]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };
  
  const sortedFiles = sortByImportOrder(parsedFiles);
  const totalRecords = sortedFiles.reduce((acc, f) => acc + f.rowCount, 0);
  const processedRecords = progress.reduce((acc, p) => acc + p.processed, 0);
  const errorCount = progress.reduce((acc, p) => acc + p.errors, 0);
  
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">
          {isComplete ? 'Import Complete' : 'Importing Data...'}
        </h2>
        <p className="text-muted-foreground">
          {isComplete 
            ? 'Your data has been successfully imported'
            : 'Please wait while we process your files'
          }
        </p>
      </div>
      
      {/* Overall Progress */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Overall Progress</CardTitle>
            <Badge variant={isComplete ? "default" : "secondary"}>
              {isComplete ? 'Complete' : 'Processing'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={overallProgress} className="h-3" />
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{processedRecords}</p>
              <p className="text-sm text-muted-foreground">/ {totalRecords} Records</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{Math.round(overallProgress)}%</p>
              <p className="text-sm text-muted-foreground">Complete</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{formatTime(elapsedTime)}</p>
              <p className="text-sm text-muted-foreground">Elapsed</p>
            </div>
          </div>
          
          {errorCount > 0 && (
            <div className="flex items-center justify-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{errorCount} error(s) encountered</span>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Entity Progress List */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Status</CardTitle>
          <CardDescription>
            Files are processed in dependency order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedFiles.map((file) => {
              const entityProgress = progress.find(p => p.entityType === file.entityType);
              const status = entityProgress?.status || 'pending';
              const isCurrent = currentEntity === file.entityType;
              
              return (
                <div 
                  key={file.entityType}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    isCurrent && "border-primary bg-primary/5",
                    status === 'completed' && "border-green-500/30 bg-green-500/5",
                    status === 'failed' && "border-destructive/30 bg-destructive/5"
                  )}
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {status === 'pending' && (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                    {status === 'processing' && (
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    )}
                    {status === 'completed' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {status === 'failed' && (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                  
                  {/* Entity Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{getEntityDisplayName(file.entityType)}</p>
                      <Badge variant="outline" className="text-xs">
                        {file.rowCount} records
                      </Badge>
                    </div>
                    {entityProgress && status !== 'pending' && (
                      <p className="text-xs text-muted-foreground">
                        {entityProgress.processed} / {entityProgress.total} processed
                        {entityProgress.errors > 0 && (
                          <span className="text-destructive ml-2">
                            ({entityProgress.errors} failed)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  
                  {/* Mini Progress */}
                  {status === 'processing' && entityProgress && (
                    <div className="w-24">
                      <Progress 
                        value={(entityProgress.processed / entityProgress.total) * 100} 
                        className="h-1.5" 
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Processing Animation */}
      {!isComplete && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">
              {currentEntity 
                ? `Processing ${getEntityDisplayName(currentEntity)}...`
                : 'Preparing import...'
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
