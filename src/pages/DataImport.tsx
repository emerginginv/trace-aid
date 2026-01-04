import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressSteps } from "@/components/ui/progress-steps";
import { ImportTypeSelector, ImportType } from "@/components/import/ImportTypeSelector";
import { FileUploader } from "@/components/import/FileUploader";
import { ValidationReport } from "@/components/import/ValidationReport";
import { ImportConfirmation } from "@/components/import/ImportConfirmation";
import { ImportProgress, EntityProgress } from "@/components/import/ImportProgress";
import { ImportResults } from "@/components/import/ImportResults";
import { ParsedCSV, ParseError, sortByImportOrder } from "@/lib/csvParser";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ImportStep = 'type' | 'upload' | 'validation' | 'confirmation' | 'processing' | 'results';

const STEPS = [
  { id: 'type', label: 'Type', description: 'Select import type' },
  { id: 'upload', label: 'Upload', description: 'Upload files' },
  { id: 'validate', label: 'Validate', description: 'Review validation' },
  { id: 'confirm', label: 'Confirm', description: 'Confirm import' },
  { id: 'process', label: 'Process', description: 'Import data' },
];

export default function DataImport() {
  const { organization } = useOrganization();
  const [currentStep, setCurrentStep] = useState<ImportStep>('type');
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [parsedFiles, setParsedFiles] = useState<ParsedCSV[]>([]);
  const [warnings, setWarnings] = useState<ParseError[]>([]);
  const [progress, setProgress] = useState<EntityProgress[]>([]);
  const [currentEntity, setCurrentEntity] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  
  const stepIndex = ['type', 'upload', 'validation', 'confirmation', 'processing'].indexOf(currentStep);
  
  // Step handlers
  const handleTypeSelect = (type: ImportType) => {
    setImportType(type);
    setCurrentStep('upload');
  };
  
  const handleFilesValidated = (files: ParsedCSV[]) => {
    setParsedFiles(sortByImportOrder(files));
    setCurrentStep('validation');
  };
  
  const handleValidationContinue = (errors: ParseError[], warns: ParseError[]) => {
    setWarnings(warns);
    setCurrentStep('confirmation');
  };
  
  const handleConfirm = async () => {
    if (!organization?.id) {
      toast.error('No organization selected');
      return;
    }
    
    setCurrentStep('processing');
    
    // Initialize progress for each entity
    const initialProgress: EntityProgress[] = parsedFiles.map(f => ({
      entityType: f.entityType,
      status: 'pending',
      processed: 0,
      total: f.rowCount,
      errors: 0
    }));
    setProgress(initialProgress);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Create import batch
      const totalRecords = parsedFiles.reduce((acc, f) => acc + f.rowCount, 0);
      const { data: batch, error: batchError } = await supabase
        .from('import_batches')
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          source_system: importType === 'new_migration' ? 'Migration' : 'Incremental',
          status: 'processing',
          total_records: totalRecords,
          started_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (batchError) throw batchError;
      setBatchId(batch.id);
      
      // Process each entity type
      let processedTotal = 0;
      
      for (let i = 0; i < parsedFiles.length; i++) {
        const file = parsedFiles[i];
        setCurrentEntity(file.entityType);
        
        // Update progress to processing
        setProgress(prev => prev.map(p => 
          p.entityType === file.entityType 
            ? { ...p, status: 'processing' as const }
            : p
        ));
        
        // Simulate processing with delay (in real implementation, this would call ImportService)
        let entityErrors = 0;
        for (let j = 0; j < file.rowCount; j++) {
          // Simulate some random errors for demo
          const hasError = Math.random() < 0.02; // 2% error rate for demo
          if (hasError) entityErrors++;
          
          // Update entity progress
          setProgress(prev => prev.map(p => 
            p.entityType === file.entityType 
              ? { ...p, processed: j + 1, errors: entityErrors }
              : p
          ));
          
          processedTotal++;
          setOverallProgress((processedTotal / totalRecords) * 100);
          
          // Small delay to show progress
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        
        // Mark entity as completed
        setProgress(prev => prev.map(p => 
          p.entityType === file.entityType 
            ? { ...p, status: entityErrors > 0 ? 'failed' as const : 'completed' as const }
            : p
        ));
      }
      
      // Update batch status
      const finalProgress = progress;
      const totalErrors = finalProgress.reduce((acc, p) => acc + p.errors, 0);
      
      await supabase
        .from('import_batches')
        .update({
          status: totalErrors > 0 ? 'completed_with_errors' : 'completed',
          processed_records: totalRecords,
          failed_records: totalErrors,
          completed_at: new Date().toISOString()
        })
        .eq('id', batch.id);
      
      setCurrentEntity(null);
      setIsComplete(true);
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed. Please try again.');
      setCurrentStep('confirmation');
    }
  };
  
  const handleProcessingComplete = () => {
    setCurrentStep('results');
  };
  
  const handleStartNew = () => {
    setCurrentStep('type');
    setImportType(null);
    setParsedFiles([]);
    setWarnings([]);
    setProgress([]);
    setCurrentEntity(null);
    setOverallProgress(0);
    setIsComplete(false);
    setBatchId(null);
  };
  
  return (
    <div className="container max-w-5xl py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Data Import</h1>
        <p className="text-muted-foreground mt-1">
          Import data from external systems using CaseWyze templates
        </p>
      </div>
      
      {/* Progress Steps */}
      {currentStep !== 'results' && (
        <ProgressSteps
          steps={STEPS}
          currentStep={stepIndex}
          orientation="horizontal"
        />
      )}
      
      {/* Step Content */}
      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="p-0">
          {currentStep === 'type' && (
            <ImportTypeSelector onSelect={handleTypeSelect} />
          )}
          
          {currentStep === 'upload' && importType && (
            <FileUploader 
              importType={importType}
              onFilesValidated={handleFilesValidated}
            />
          )}
          
          {currentStep === 'validation' && (
            <ValidationReport
              parsedFiles={parsedFiles}
              onBack={() => setCurrentStep('upload')}
              onContinue={handleValidationContinue}
            />
          )}
          
          {currentStep === 'confirmation' && importType && (
            <ImportConfirmation
              parsedFiles={parsedFiles}
              warnings={warnings}
              importType={importType}
              onBack={() => setCurrentStep('validation')}
              onConfirm={handleConfirm}
            />
          )}
          
          {currentStep === 'processing' && (
            <ImportProgress
              parsedFiles={parsedFiles}
              progress={progress}
              currentEntity={currentEntity}
              overallProgress={overallProgress}
              isComplete={isComplete}
              onComplete={handleProcessingComplete}
            />
          )}
          
          {currentStep === 'results' && (
            <ImportResults
              batchId={batchId}
              progress={progress}
              onStartNew={handleStartNew}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
