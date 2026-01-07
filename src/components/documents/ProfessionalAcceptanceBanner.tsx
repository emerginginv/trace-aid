import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle, XCircle, AlertTriangle, Shield, FileCheck, Printer, Scale, Eye } from "lucide-react";
import type { ProfessionalAcceptanceTest, AcceptanceTestResult } from "@/lib/letterDocumentEngine";

interface ProfessionalAcceptanceBannerProps {
  test: ProfessionalAcceptanceTest;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  structure: { label: "Letter Structure", icon: FileCheck },
  visualStandards: { label: "Visual Standards", icon: Eye },
  completeness: { label: "Completeness", icon: FileCheck },
  printReadiness: { label: "Print Readiness", icon: Printer },
  professionalStandards: { label: "Professional Standards", icon: Scale },
  fidelity: { label: "Preview/PDF Fidelity", icon: Shield },
};

function formatCategoryName(key: string): string {
  return CATEGORY_CONFIG[key]?.label || key.replace(/([A-Z])/g, ' $1').trim();
}

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const Icon = CATEGORY_CONFIG[category]?.icon || FileCheck;
  return <Icon className={className} />;
}

export function ProfessionalAcceptanceBanner({ test }: ProfessionalAcceptanceBannerProps) {
  // All passed, no warnings
  if (test.passed && test.warnings.length === 0) {
    return (
      <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-800 dark:text-green-300 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Professional Acceptance Test: PASSED
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-400">
          This letter meets all professional standards and is ready for export.
        </AlertDescription>
      </Alert>
    );
  }
  
  // Failed - cannot export
  if (!test.canExport) {
    const failedCategories = Object.entries(test.tests).filter(([_, result]) => !result.passed);
    
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Professional Acceptance Test: FAILED
        </AlertTitle>
        <AlertDescription>
          <p className="mb-3 font-medium">
            This letter has defects that must be fixed before export:
          </p>
          <Accordion type="multiple" className="mt-2 space-y-1">
            {failedCategories.map(([category, result]) => (
              <AccordionItem 
                key={category} 
                value={category}
                className="border border-red-200 dark:border-red-800 rounded-md px-3 bg-red-50/50 dark:bg-red-950/30"
              >
                <AccordionTrigger className="text-sm py-2 hover:no-underline">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-3 w-3 text-red-500" />
                    <CategoryIcon category={category} className="h-3 w-3" />
                    {formatCategoryName(category)}
                    <span className="text-xs text-muted-foreground">
                      ({result.errors.length} error{result.errors.length !== 1 ? 's' : ''})
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc list-inside text-sm space-y-1 pl-2">
                    {result.errors.map((e, i) => (
                      <li key={i} className="text-red-700 dark:text-red-300">{e}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          {test.warnings.length > 0 && (
            <div className="mt-4 pt-3 border-t border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-1">
                Additional Warnings ({test.warnings.length}):
              </p>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                {test.warnings.slice(0, 3).map((w, i) => (
                  <li key={i} className="text-yellow-600 dark:text-yellow-500">{w}</li>
                ))}
                {test.warnings.length > 3 && (
                  <li className="text-yellow-600 dark:text-yellow-500">
                    ...and {test.warnings.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  
  // Passed with warnings
  return (
    <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800">
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
        <Shield className="h-4 w-4" />
        Professional Acceptance Test: PASSED (with warnings)
      </AlertTitle>
      <AlertDescription className="text-yellow-700 dark:text-yellow-400">
        <p className="mb-2">Letter can be exported but has advisory warnings:</p>
        <ul className="list-disc list-inside text-sm space-y-1">
          {test.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
