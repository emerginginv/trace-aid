import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock,
  RefreshCw,
  X,
  Upload
} from 'lucide-react';
import { ThumbnailJob } from '@/hooks/use-background-thumbnail-generation';
import { cn } from '@/lib/utils';

interface ThumbnailGenerationProgressProps {
  jobs: ThumbnailJob[];
  progress: { total: number; completed: number; failed: number };
  isProcessing: boolean;
  onRetryAll: () => void;
  onRetryOne: (attachmentId: string) => void;
  onCancel: () => void;
  onClearCompleted: () => void;
}

export function ThumbnailGenerationProgress({
  jobs,
  progress,
  isProcessing,
  onRetryAll,
  onRetryOne,
  onCancel,
  onClearCompleted,
}: ThumbnailGenerationProgressProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const { total, completed, failed } = progress;
  const pending = total - completed - failed;
  const progressPercent = total > 0 ? (completed / total) * 100 : 0;

  // Don't show if no jobs
  if (jobs.length === 0) return null;

  // Auto-collapse when all done and no failures
  const allDone = completed === total && failed === 0;

  const getStatusIcon = (status: ThumbnailJob['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'generating':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'uploading':
        return <Upload className="h-4 w-4 text-primary animate-pulse" />;
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusLabel = (status: ThumbnailJob['status']) => {
    switch (status) {
      case 'pending':
        return 'Waiting';
      case 'generating':
        return 'Generating';
      case 'uploading':
        return 'Uploading';
      case 'complete':
        return 'Complete';
      case 'failed':
        return 'Failed';
    }
  };

  return (
    <Card className="mb-4 border-primary/20">
      <CardContent className="py-3 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : allDone ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : failed > 0 ? (
              <XCircle className="h-4 w-4 text-destructive" />
            ) : (
              <Clock className="h-4 w-4 text-muted-foreground" />
            )}
            <span>Generating Previews</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          <div className="flex items-center gap-2">
            {failed > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetryAll}
                className="h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry All
              </Button>
            )}
            {pending > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-7 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            )}
            {allDone && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearCompleted}
                className="h-7 text-xs"
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-2">
          <Progress value={progressPercent} className="flex-1 h-2" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {completed}/{total} complete
            {failed > 0 && ` · ${failed} failed`}
          </span>
        </div>

        {/* Expanded job list */}
        {isExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
            {jobs.map((job) => (
              <div
                key={job.attachmentId}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded text-xs bg-muted/50',
                  job.status === 'failed' && 'bg-destructive/10'
                )}
              >
                {getStatusIcon(job.status)}
                <span className="truncate flex-1" title={job.fileName}>
                  {job.fileName}
                </span>
                {job.status === 'failed' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRetryOne(job.attachmentId)}
                    className="h-5 px-1.5 text-xs"
                  >
                    Retry
                  </Button>
                ) : (
                  <span className="text-muted-foreground">
                    {getStatusLabel(job.status)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
