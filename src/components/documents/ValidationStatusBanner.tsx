import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import type { PreGenerationValidation } from "@/lib/letterDocumentEngine";

interface ValidationStatusBannerProps {
  validation: PreGenerationValidation;
}

export function ValidationStatusBanner({ validation }: ValidationStatusBannerProps) {
  if (validation.isValid && validation.warnings.length === 0) {
    return (
      <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-800 dark:text-green-300">Ready for Export</AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-400">
          Letter passes all validation checks.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (!validation.canProceed) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Export Blocked</AlertTitle>
        <AlertDescription>
          <p className="mb-2">The following issues must be fixed before export:</p>
          <ul className="list-disc list-inside space-y-1">
            {validation.errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    );
  }
  
  // Has warnings but can proceed
  return (
    <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800">
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-300">Warnings</AlertTitle>
      <AlertDescription className="text-yellow-700 dark:text-yellow-400">
        <ul className="list-disc list-inside">
          {validation.warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
