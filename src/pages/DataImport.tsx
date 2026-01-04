import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressSteps } from "@/components/ui/progress-steps";
import { ImportTypeSelector, ImportType } from "@/components/import/ImportTypeSelector";
import { FileUploader } from "@/components/import/FileUploader";
import { ValidationReport } from "@/components/import/ValidationReport";
import { MappingConfiguration } from "@/components/import/MappingConfiguration";
import { DryRunProgress } from "@/components/import/DryRunProgress";
import { DryRunResults } from "@/components/import/DryRunResults";
import { ImportConfirmation } from "@/components/import/ImportConfirmation";
import { ImportProgress, EntityProgress } from "@/components/import/ImportProgress";
import { ImportResults } from "@/components/import/ImportResults";
import { ParsedCSV, ParseError, sortByImportOrder } from "@/lib/csvParser";
import { MappingConfig, DEFAULT_MAPPING_CONFIG, NormalizationLog, EMPTY_NORMALIZATION_LOG, DryRunResult, ImportExecutionResult } from "@/types/import";
import { normalizeRecord } from "@/lib/importNormalization";
import { performDryRun } from "@/lib/importService";
import { ImportExecutionEngine } from "@/lib/importExecutionEngine";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ImportStep = 'type' | 'upload' | 'validation' | 'mapping' | 'dry-run' | 'dry-run-results' | 'confirmation' | 'processing' | 'results';

const STEPS = [
  { id: 'type', label: 'Type', description: 'Select import type' },
  { id: 'upload', label: 'Upload', description: 'Upload files' },
  { id: 'validate', label: 'Validate', description: 'Review validation' },
  { id: 'mapping', label: 'Mapping', description: 'Configure mappings' },
  { id: 'dry-run', label: 'Dry Run', description: 'Simulate import' },
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
  
  // Mapping configuration state
  const [sourceSystemName, setSourceSystemName] = useState('');
  const [mappingConfig, setMappingConfig] = useState<MappingConfig>(DEFAULT_MAPPING_CONFIG);
  const [normalizationLog, setNormalizationLog] = useState<NormalizationLog>(EMPTY_NORMALIZATION_LOG);
  
  // Dry-run state
  const [dryRunProgress, setDryRunProgress] = useState(0);
  const [dryRunMessage, setDryRunMessage] = useState('');
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [isDryRunComplete, setIsDryRunComplete] = useState(false);
  
  // Execution result state
  const [executionResult, setExecutionResult] = useState<ImportExecutionResult | null>(null);
  
  const stepIndex = ['type', 'upload', 'validation', 'mapping', 'dry-run', 'confirmation', 'processing'].indexOf(currentStep);
  
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
    setCurrentStep('mapping');
  };
  
  const handleMappingContinue = async () => {
    if (!organization?.id) {
      toast.error('No organization selected');
      return;
    }
    
    // Start dry-run
    setCurrentStep('dry-run');
    setDryRunProgress(0);
    setDryRunMessage('Initializing...');
    setIsDryRunComplete(false);
    setDryRunResult(null);
    
    try {
      const result = await performDryRun({
        parsedFiles,
        mappingConfig,
        organizationId: organization.id,
        onProgress: (progress, message) => {
          setDryRunProgress(progress);
          setDryRunMessage(message);
        }
      });
      
      setDryRunResult(result);
      setIsDryRunComplete(true);
      
      // Auto-advance to results after a brief delay
      setTimeout(() => {
        setCurrentStep('dry-run-results');
      }, 500);
      
    } catch (error) {
      console.error('Dry-run error:', error);
      toast.error('Dry-run failed. Please try again.');
      setCurrentStep('mapping');
    }
  };
  
  const handleDryRunContinue = () => {
    if (dryRunResult?.success) {
      setCurrentStep('confirmation');
    } else {
      // Go back to mapping to fix issues
      setCurrentStep('mapping');
    }
  };
  
  const handleConfirm = async () => {
    if (!organization?.id) {
      toast.error('No organization selected');
      return;
    }
    
    if (!dryRunResult) {
      toast.error('Dry-run must complete before importing');
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
      const totalRecords = dryRunResult.recordsToCreate;
      const { data: batch, error: batchError } = await supabase
        .from('import_batches')
        .insert([{
          organization_id: organization.id,
          user_id: user.id,
          source_system: importType === 'new_migration' ? 'Migration' : 'Incremental',
          source_system_name: sourceSystemName || null,
          mapping_config: JSON.parse(JSON.stringify(mappingConfig)),
          status: 'pending',
          total_records: totalRecords,
        }])
        .select()
        .single();
      
      if (batchError) throw batchError;
      setBatchId(batch.id);
      
      // Update progress to show processing started
      setProgress(prev => prev.map(p => ({ ...p, status: 'processing' as const })));
      setOverallProgress(10);
      
      // Create and run the execution engine
      const engine = new ImportExecutionEngine(
        organization.id,
        user.id,
        batch.id,
        sourceSystemName || (importType === 'new_migration' ? 'Migration' : 'Incremental'),
        mappingConfig
      );
      
      setOverallProgress(20);
      
      // Execute the import
      const result = await engine.execute(parsedFiles, dryRunResult);
      
      setExecutionResult(result);
      
      // Update progress based on result
      if (result.success) {
        setProgress(prev => prev.map(p => ({
          ...p,
          status: 'completed' as const,
          processed: p.total,
          errors: 0
        })));
        setOverallProgress(100);
        toast.success(`Import completed successfully! ${result.successfulRecords} records imported.`);
      } else {
        // Calculate errors per entity from the result
        const errorsByEntity: Record<string, number> = {};
        for (const error of result.errors) {
          const entityType = error.entity_type;
          errorsByEntity[entityType] = (errorsByEntity[entityType] || 0) + 1;
        }
        
        setProgress(prev => prev.map(p => ({
          ...p,
          status: result.rollbackPerformed ? 'failed' as const : (errorsByEntity[p.entityType] ? 'failed' as const : 'completed' as const),
          processed: p.total,
          errors: errorsByEntity[p.entityType] || 0
        })));
        setOverallProgress(100);
        
        if (result.rollbackPerformed) {
          toast.error(`Import failed. All changes have been rolled back. ${result.errors.length} error(s).`);
        } else {
          toast.error(`Import completed with ${result.failedRecords} error(s).`);
        }
      }
      
      setCurrentEntity(null);
      setIsComplete(true);
      
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Import failed: ${errorMessage}`);
      
      // Mark all as failed
      setProgress(prev => prev.map(p => ({
        ...p,
        status: 'failed' as const,
        errors: p.total
      })));
      setOverallProgress(100);
      setIsComplete(true);
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
    setSourceSystemName('');
    setMappingConfig(DEFAULT_MAPPING_CONFIG);
    setNormalizationLog(EMPTY_NORMALIZATION_LOG);
    setDryRunResult(null);
    setDryRunProgress(0);
    setDryRunMessage('');
    setIsDryRunComplete(false);
    setExecutionResult(null);
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
          
          {currentStep === 'mapping' && (
            <MappingConfiguration
              parsedFiles={parsedFiles}
              sourceSystemName={sourceSystemName}
              onSourceSystemNameChange={setSourceSystemName}
              mappingConfig={mappingConfig}
              onMappingConfigChange={setMappingConfig}
              onBack={() => setCurrentStep('validation')}
              onContinue={handleMappingContinue}
            />
          )}
          
          {currentStep === 'dry-run' && (
            <DryRunProgress
              progress={dryRunProgress}
              message={dryRunMessage}
              isComplete={isDryRunComplete}
              hasErrors={dryRunResult ? !dryRunResult.success : false}
            />
          )}
          
          {currentStep === 'dry-run-results' && dryRunResult && (
            <DryRunResults
              result={dryRunResult}
              onBack={() => setCurrentStep('mapping')}
              onContinue={handleDryRunContinue}
            />
          )}
          
          {currentStep === 'confirmation' && importType && (
            <ImportConfirmation
              parsedFiles={parsedFiles}
              warnings={warnings}
              importType={importType}
              mappingConfig={mappingConfig}
              sourceSystemName={sourceSystemName}
              dryRunResult={dryRunResult}
              onBack={() => setCurrentStep('dry-run-results')}
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
              executionResult={executionResult}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
