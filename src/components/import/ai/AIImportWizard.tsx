import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, ArrowLeft, Upload, Brain, 
  GitCompare, CheckCircle2, Loader2, Shield
} from "lucide-react";
import { AIImportUploader } from "./AIImportUploader";
import { AIAnalysisResults } from "./AIAnalysisResults";
import { AIImportMapping } from "./AIImportMapping";
import { AIImportReview } from "./AIImportReview";
import { AIImportProgress } from "./AIImportProgress";
import { AIUploadedFile, AIAnalysisResult, AIColumnMapping } from "@/lib/aiImportTypes";

interface AIImportWizardProps {
  onBack?: () => void;
  onComplete: () => void;
}

type WizardStep = 'upload' | 'analyze' | 'mapping' | 'review' | 'import';

const STEPS: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
  { id: 'upload', label: 'Upload Files', icon: <Upload className="h-4 w-4" /> },
  { id: 'analyze', label: 'AI Analysis', icon: <Brain className="h-4 w-4" /> },
  { id: 'mapping', label: 'Review Mappings', icon: <GitCompare className="h-4 w-4" /> },
  { id: 'review', label: 'Confirm Import', icon: <CheckCircle2 className="h-4 w-4" /> },
  { id: 'import', label: 'Importing', icon: <Loader2 className="h-4 w-4" /> },
];

export function AIImportWizard({ onBack, onComplete }: AIImportWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<AIUploadedFile[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [userMappings, setUserMappings] = useState<Record<string, AIColumnMapping[]>>({});
  const [excludedFiles, setExcludedFiles] = useState<string[]>([]);
  const [excludedRows, setExcludedRows] = useState<Record<string, number[]>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleFilesUploaded = (files: AIUploadedFile[]) => {
    setUploadedFiles(files);
  };

  const handleAnalysisComplete = (result: AIAnalysisResult) => {
    setAnalysisResult(result);
    setUserMappings(result.columnMappings);
    setCurrentStep('mapping');
  };

  const handleMappingsConfirmed = (mappings: Record<string, AIColumnMapping[]>) => {
    setUserMappings(mappings);
    setCurrentStep('review');
  };

  const handleImportStarted = (id: string) => {
    setSessionId(id);
    setCurrentStep('import');
  };

  const handleImportComplete = () => {
    onComplete();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-[hsl(270,85%,55%)]" />
              AI-Guided Import
            </h2>
            <p className="text-muted-foreground text-sm">
              Intelligent data migration from any source system
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Secure & Sandboxed
        </Badge>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                      index < currentStepIndex
                        ? 'bg-primary text-primary-foreground'
                        : index === currentStepIndex
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.icon}
                  </div>
                  <span className={`text-xs mt-2 ${
                    index <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 ${
                    index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-1" />
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-start gap-3 text-sm">
            <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">Security Constraints</p>
              <ul className="text-muted-foreground space-y-0.5 text-xs">
                <li>• Files are read-only and never executed</li>
                <li>• CSS styles are analyzed but NOT applied</li>
                <li>• No data is imported until you explicitly approve</li>
                <li>• All actions are logged for audit purposes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      {currentStep === 'upload' && (
        <AIImportUploader
          files={uploadedFiles}
          onFilesChange={handleFilesUploaded}
          onContinue={() => setCurrentStep('analyze')}
        />
      )}

      {currentStep === 'analyze' && (
        <AIAnalysisResults
          files={uploadedFiles}
          onAnalysisComplete={handleAnalysisComplete}
          onBack={() => setCurrentStep('upload')}
        />
      )}

      {currentStep === 'mapping' && analysisResult && (
        <AIImportMapping
          analysisResult={analysisResult}
          files={uploadedFiles}
          userMappings={userMappings}
          onMappingsChange={setUserMappings}
          onContinue={handleMappingsConfirmed}
          onBack={() => setCurrentStep('analyze')}
        />
      )}

      {currentStep === 'review' && analysisResult && (
        <AIImportReview
          files={uploadedFiles}
          analysisResult={analysisResult}
          userMappings={userMappings}
          excludedFiles={excludedFiles}
          excludedRows={excludedRows}
          onExcludedFilesChange={setExcludedFiles}
          onExcludedRowsChange={setExcludedRows}
          onStartImport={handleImportStarted}
          onBack={() => setCurrentStep('mapping')}
        />
      )}

      {currentStep === 'import' && sessionId && (
        <AIImportProgress
          sessionId={sessionId}
          onComplete={handleImportComplete}
        />
      )}
    </div>
  );
}
