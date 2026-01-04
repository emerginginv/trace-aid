import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface DryRunProgressProps {
  progress: number;
  message: string;
  isComplete: boolean;
  hasErrors: boolean;
  onCancel?: () => void;
}

export function DryRunProgress({
  progress,
  message,
  isComplete,
  hasErrors,
  onCancel
}: DryRunProgressProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">
          {isComplete ? 'Dry Run Complete' : 'Running Dry Run...'}
        </h2>
        <p className="text-muted-foreground">
          {isComplete 
            ? 'Simulation complete. Review the results before proceeding.'
            : 'Simulating import without writing to database...'}
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {isComplete ? (
              hasErrors ? (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Validation Issues Found
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Validation Passed
                </>
              )
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            )}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          
          {!isComplete && onCancel && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
