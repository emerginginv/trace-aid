import { useState, useCallback, useEffect } from 'react';

export interface SubjectData {
  id: string;
  subject_type_id: string | null;
  is_primary: boolean;
  first_name: string;
  middle_name: string;
  last_name: string;
  country: string;
  address1: string;
  address2: string;
  address3: string;
  city: string;
  state: string;
  zip: string;
  cell_phone: string;
  alias: string;
  date_of_birth: string;
  age: number | null;
  height: string;
  weight: string;
  race: string;
  sex: string;
  ssn: string;
  email: string;
  photo_url: string | null;
  custom_fields: Record<string, any>;
}

export interface FileData {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  progress: number;
  storage_path?: string;
  error?: string;
}

export interface Step1Data {
  case_type_id: string;
  submitted_client_name: string;
  submitted_client_country: string;
  submitted_client_address1: string;
  submitted_client_address2: string;
  submitted_client_address3: string;
  submitted_client_city: string;
  submitted_client_state: string;
  submitted_client_zip: string;
  submitted_contact_first_name: string;
  submitted_contact_middle_name: string;
  submitted_contact_last_name: string;
  submitted_contact_email: string;
  submitted_contact_office_phone: string;
  submitted_contact_mobile_phone: string;
  submitted_contact_mobile_carrier: string;
  submitted_contact_home_phone: string;
}

export interface Step2Data {
  case_services: string[];
  claim_number: string;
  budget_dollars: number | null;
  budget_hours: number | null;
  notes_instructions: string;
  custom_fields: Record<string, any>;
}

export interface CaseRequestFormState {
  currentStep: number;
  requestId: string | null;
  formData: {
    step1: Step1Data | null;
    step2: Step2Data | null;
    subjects: SubjectData[];
    files: FileData[];
  };
}

const INITIAL_STEP1_DATA: Step1Data = {
  case_type_id: '',
  submitted_client_name: '',
  submitted_client_country: 'United States',
  submitted_client_address1: '',
  submitted_client_address2: '',
  submitted_client_address3: '',
  submitted_client_city: '',
  submitted_client_state: '',
  submitted_client_zip: '',
  submitted_contact_first_name: '',
  submitted_contact_middle_name: '',
  submitted_contact_last_name: '',
  submitted_contact_email: '',
  submitted_contact_office_phone: '',
  submitted_contact_mobile_phone: '',
  submitted_contact_mobile_carrier: '',
  submitted_contact_home_phone: '',
};

const INITIAL_STEP2_DATA: Step2Data = {
  case_services: [],
  claim_number: '',
  budget_dollars: null,
  budget_hours: null,
  notes_instructions: '',
  custom_fields: {},
};

const INITIAL_STATE: CaseRequestFormState = {
  currentStep: 1,
  requestId: null,
  formData: {
    step1: INITIAL_STEP1_DATA,
    step2: INITIAL_STEP2_DATA,
    subjects: [],
    files: [],
  },
};

function getStorageKey(formSlug: string): string {
  return `case_request_${formSlug}_draft`;
}

function loadFromStorage(formSlug: string): CaseRequestFormState | null {
  try {
    const stored = localStorage.getItem(getStorageKey(formSlug));
    if (stored) {
      const parsed = JSON.parse(stored);
      // Don't restore files from storage as File objects can't be serialized
      if (parsed.formData) {
        parsed.formData.files = [];
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load form state from storage:', e);
  }
  return null;
}

function saveToStorage(formSlug: string, state: CaseRequestFormState): void {
  try {
    // Don't save File objects
    const stateToSave = {
      ...state,
      formData: {
        ...state.formData,
        files: state.formData.files.map(f => ({
          id: f.id,
          name: f.name,
          size: f.size,
          type: f.type,
          status: f.status,
          storage_path: f.storage_path,
        })),
      },
    };
    localStorage.setItem(getStorageKey(formSlug), JSON.stringify(stateToSave));
  } catch (e) {
    console.error('Failed to save form state to storage:', e);
  }
}

export function useCaseRequestForm(formSlug: string) {
  const [state, setState] = useState<CaseRequestFormState>(() => {
    const stored = loadFromStorage(formSlug);
    return stored || INITIAL_STATE;
  });

  // Persist state changes to localStorage
  useEffect(() => {
    if (formSlug) {
      saveToStorage(formSlug, state);
    }
  }, [formSlug, state]);

  const goToStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, currentStep: Math.max(1, Math.min(6, step)) }));
  }, []);

  const goNext = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: Math.min(6, prev.currentStep + 1) }));
  }, []);

  const goBack = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: Math.max(1, prev.currentStep - 1) }));
  }, []);

  const setRequestId = useCallback((id: string) => {
    setState(prev => ({ ...prev, requestId: id }));
  }, []);

  const updateStep1 = useCallback((data: Step1Data) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, step1: data },
    }));
  }, []);

  const updateStep2 = useCallback((data: Step2Data) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, step2: data },
    }));
  }, []);

  const addSubject = useCallback((subject: SubjectData) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        subjects: [...prev.formData.subjects, subject],
      },
    }));
  }, []);

  const updateSubject = useCallback((id: string, subject: SubjectData) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        subjects: prev.formData.subjects.map(s => (s.id === id ? subject : s)),
      },
    }));
  }, []);

  const removeSubject = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        subjects: prev.formData.subjects.filter(s => s.id !== id),
      },
    }));
  }, []);

  const addFiles = useCallback((files: FileData[]) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        files: [...prev.formData.files, ...files],
      },
    }));
  }, []);

  const updateFile = useCallback((id: string, updates: Partial<FileData>) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        files: prev.formData.files.map(f => (f.id === id ? { ...f, ...updates } : f)),
      },
    }));
  }, []);

  const removeFile = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        files: prev.formData.files.filter(f => f.id !== id),
      },
    }));
  }, []);

  const clearForm = useCallback(() => {
    localStorage.removeItem(getStorageKey(formSlug));
    setState(INITIAL_STATE);
  }, [formSlug]);

  const getContactName = useCallback(() => {
    const s1 = state.formData.step1;
    if (!s1) return '';
    const parts = [s1.submitted_contact_first_name, s1.submitted_contact_middle_name, s1.submitted_contact_last_name].filter(Boolean);
    return parts.join(' ');
  }, [state.formData.step1]);

  return {
    state,
    goToStep,
    goNext,
    goBack,
    setRequestId,
    updateStep1,
    updateStep2,
    addSubject,
    updateSubject,
    removeSubject,
    addFiles,
    updateFile,
    removeFile,
    clearForm,
    getContactName,
    INITIAL_STEP1_DATA,
    INITIAL_STEP2_DATA,
  };
}

export function createEmptySubject(isPrimary: boolean = false): SubjectData {
  return {
    id: crypto.randomUUID(),
    subject_type_id: null,
    is_primary: isPrimary,
    first_name: '',
    middle_name: '',
    last_name: '',
    country: 'United States',
    address1: '',
    address2: '',
    address3: '',
    city: '',
    state: '',
    zip: '',
    cell_phone: '',
    alias: '',
    date_of_birth: '',
    age: null,
    height: '',
    weight: '',
    race: '',
    sex: '',
    ssn: '',
    email: '',
    photo_url: null,
    custom_fields: {},
  };
}
