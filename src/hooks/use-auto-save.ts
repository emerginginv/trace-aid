import * as React from "react";

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

interface AutoSaveStatus {
  isSaving: boolean;
  lastSavedAt: Date | null;
  error: Error | null;
  isDirty: boolean;
}

export function useAutoSave<T>({
  data,
  onSave,
  delay = 2000,
  enabled = true,
}: UseAutoSaveOptions<T>): AutoSaveStatus {
  const [status, setStatus] = React.useState<AutoSaveStatus>({
    isSaving: false,
    lastSavedAt: null,
    error: null,
    isDirty: false,
  });

  const previousData = React.useRef<T>(data);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    if (!enabled) return;

    // Check if data changed
    const hasChanged = JSON.stringify(data) !== JSON.stringify(previousData.current);
    
    if (hasChanged) {
      setStatus((prev) => ({ ...prev, isDirty: true }));

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout for auto-save
      timeoutRef.current = setTimeout(async () => {
        setStatus((prev) => ({ ...prev, isSaving: true, error: null }));

        try {
          await onSave(data);
          previousData.current = data;
          setStatus({
            isSaving: false,
            lastSavedAt: new Date(),
            error: null,
            isDirty: false,
          });
        } catch (error) {
          setStatus((prev) => ({
            ...prev,
            isSaving: false,
            error: error instanceof Error ? error : new Error("Save failed"),
          }));
        }
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, onSave]);

  return status;
}

// Hook for debouncing input with loading state
interface UseDebouncedSearchOptions {
  value: string;
  delay?: number;
  minLength?: number;
  onSearch?: (value: string) => Promise<void>;
}

interface DebouncedSearchState {
  debouncedValue: string;
  isSearching: boolean;
}

export function useDebouncedSearch({
  value,
  delay = 300,
  minLength = 0,
  onSearch,
}: UseDebouncedSearchOptions): DebouncedSearchState {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  const [isSearching, setIsSearching] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(async () => {
      setDebouncedValue(value);
      
      if (onSearch && value.length >= minLength) {
        setIsSearching(true);
        try {
          await onSearch(value);
        } finally {
          setIsSearching(false);
        }
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay, minLength, onSearch]);

  return { debouncedValue, isSearching };
}

// Form field validation with real-time feedback
interface UseFieldValidationOptions {
  value: string;
  validate: (value: string) => string | null;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}

interface FieldValidationState {
  error: string | null;
  isValid: boolean;
  isValidating: boolean;
  validate: () => boolean;
  onBlur: () => void;
}

export function useFieldValidation({
  value,
  validate,
  validateOnBlur = true,
  validateOnChange = false,
}: UseFieldValidationOptions): FieldValidationState {
  const [error, setError] = React.useState<string | null>(null);
  const [touched, setTouched] = React.useState(false);

  const runValidation = React.useCallback(() => {
    const result = validate(value);
    setError(result);
    return result === null;
  }, [value, validate]);

  React.useEffect(() => {
    if (validateOnChange && touched) {
      runValidation();
    }
  }, [value, validateOnChange, touched, runValidation]);

  const onBlur = React.useCallback(() => {
    setTouched(true);
    if (validateOnBlur) {
      runValidation();
    }
  }, [validateOnBlur, runValidation]);

  return {
    error,
    isValid: error === null && touched,
    isValidating: false,
    validate: runValidation,
    onBlur,
  };
}