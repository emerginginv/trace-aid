/**
 * Type definitions for AI-guided import functionality
 */

export interface AIUploadedFile {
  id: string;
  file: File;
  name: string;
  type: 'csv' | 'json' | 'txt' | 'css' | 'unknown';
  size: number;
  content: string;
  status: 'pending' | 'parsing' | 'parsed' | 'error';
  error?: string;
  preview?: {
    headers?: string[];
    rows?: Record<string, string>[];
    rowCount?: number;
  };
}

export interface AIDetectedEntity {
  sourceFile: string;
  entityType: string;
  confidence: number;
  reasoning: string;
}

export interface AIColumnMapping {
  sourceColumn: string;
  targetField: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  transformation?: string;
  aiReasoning: string;
  userOverride?: boolean;
}

export interface AIConflict {
  id: string;
  type: 'missing_required' | 'type_mismatch' | 'unsupported_concept' | 'duplicate_id' | 'invalid_reference' | 'data_quality';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion: string;
  sourceFile?: string;
  column?: string;
  row?: number;
  resolved?: boolean;
}

export interface AIDataQualityIssue {
  column: string;
  issue: string;
  exampleValues: string[];
  suggestedFix: string;
  affectedRows: number;
}

export interface AIFileSummary {
  fileName: string;
  fileType: string;
  detectedEntity: string | null;
  confidence: number;
  columnCount: number;
  rowCount: number;
  mappedColumns: number;
  unmappedColumns: number;
  issues: number;
}

export interface AIAnalysisResult {
  sessionId: string;
  status: 'success' | 'partial' | 'failed';
  detectedEntities: AIDetectedEntity[];
  columnMappings: Record<string, AIColumnMapping[]>; // Keyed by file name
  conflicts: AIConflict[];
  dataQualityIssues: AIDataQualityIssue[];
  fileSummaries: AIFileSummary[];
  summary: {
    totalFiles: number;
    totalRecords: number;
    readyToImport: number;
    needsReview: number;
    unsupported: number;
  };
  processingTime: number;
  aiModel: string;
}

export interface AIImportSession {
  id: string;
  organizationId: string;
  userId: string;
  sourceSystem: string | null;
  status: 'uploading' | 'analyzing' | 'reviewed' | 'importing' | 'completed' | 'failed';
  filesMetadata: AIUploadedFile[];
  aiAnalysis: AIAnalysisResult | null;
  userMappings: Record<string, AIColumnMapping[]> | null;
  userExclusions: {
    files: string[];
    rows: Record<string, number[]>;
  } | null;
  importBatchId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface AIImportProgress {
  phase: 'uploading' | 'analyzing' | 'mapping' | 'importing' | 'complete';
  currentStep: string;
  progress: number; // 0-100
  filesProcessed: number;
  totalFiles: number;
  recordsProcessed: number;
  totalRecords: number;
  errors: number;
  warnings: number;
}

// CaseWyze schema reference for AI analysis
export const CASEWYZE_SCHEMA = {
  accounts: {
    displayName: 'Clients',
    required: ['name'],
    optional: ['email', 'phone', 'address', 'city', 'state', 'zip_code', 'industry', 'notes'],
    description: 'Client companies or organizations'
  },
  contacts: {
    displayName: 'Contacts',
    required: ['first_name', 'last_name'],
    optional: ['email', 'phone', 'address', 'city', 'state', 'zip_code', 'notes'],
    description: 'Individual contacts at client companies'
  },
  cases: {
    displayName: 'Cases',
    required: ['case_number', 'title'],
    optional: ['status', 'description', 'due_date', 'reference_number', 'budget_hours', 'budget_dollars'],
    description: 'Investigation cases or matters'
  },
  subjects: {
    displayName: 'Subjects',
    required: ['name', 'subject_type'],
    optional: ['notes', 'date_of_birth', 'address', 'phone', 'email', 'employer', 'occupation'],
    description: 'Subject records (people, vehicles, businesses)'
  },
  case_updates: {
    displayName: 'Updates',
    required: ['title'],
    optional: ['description', 'update_type'],
    description: 'Case notes and updates'
  },
  case_activities: {
    displayName: 'Events',
    required: ['title', 'activity_type'],
    optional: ['description', 'due_date', 'status', 'completed'],
    description: 'Scheduled events and tasks'
  },
  time_entries: {
    displayName: 'Time Entries',
    required: ['date', 'hours', 'description'],
    optional: ['hourly_rate', 'amount', 'category'],
    description: 'Billable time records'
  },
  expenses: {
    displayName: 'Expenses',
    required: ['date', 'amount', 'description'],
    optional: ['category', 'quantity', 'unit_price'],
    description: 'Expense records'
  }
} as const;

export type CaseWyzeEntityType = keyof typeof CASEWYZE_SCHEMA;
