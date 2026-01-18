/**
 * Shared Form Utilities
 * 
 * Common utilities and hooks for form components like ActivityForm and UpdateForm.
 * Reduces code duplication across form components.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parse, isValid } from 'date-fns';

/**
 * Hook to fetch and cache case title for display in forms.
 */
export function useCaseTitleFetch(caseId: string | null, open: boolean = true) {
  const [caseTitle, setCaseTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!caseId || !open) {
      setCaseTitle('');
      return;
    }

    const fetchCaseTitle = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('cases')
          .select('title, case_number')
          .eq('id', caseId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setCaseTitle(`${data.case_number} - ${data.title}`);
        }
      } catch (error) {
        console.error('Error fetching case title:', error);
        setCaseTitle('');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCaseTitle();
  }, [caseId, open]);

  return { caseTitle, isLoading };
}

/**
 * Hook to fetch picklist values for a specific type.
 */
export function usePicklistValues(
  picklistType: string,
  organizationId: string | null,
  open: boolean = true
) {
  const [values, setValues] = useState<Array<{ value: string; color?: string | null }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!picklistType || !open) {
      return;
    }

    const fetchPicklists = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('picklists')
          .select('value, color')
          .eq('type', picklistType)
          .eq('is_active', true);

        if (organizationId) {
          query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
        }

        const { data, error } = await query.order('display_order', { ascending: true });

        if (error) throw error;
        setValues(data || []);
      } catch (error) {
        console.error(`Error fetching ${picklistType} picklist:`, error);
        setValues([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPicklists();
  }, [picklistType, organizationId, open]);

  return { values, isLoading };
}

/**
 * Parse time string (HH:MM) to Date object on a given date.
 */
export function parseTimeToDate(timeString: string, baseDate: Date = new Date()): Date | null {
  if (!timeString) return null;
  
  try {
    const parsed = parse(timeString, 'HH:mm', baseDate);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Format Date to time string (HH:MM).
 */
export function formatDateToTime(date: Date | null): string {
  if (!date || !isValid(date)) return '';
  return format(date, 'HH:mm');
}

/**
 * Parse date string from database to Date object.
 */
export function parseDatabaseDate(dateString: string | null): Date | null {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

/**
 * Format Date to database-friendly ISO string (date only).
 */
export function formatToISODate(date: Date | null): string | null {
  if (!date || !isValid(date)) return null;
  return format(date, 'yyyy-MM-dd');
}

/**
 * Combine date and time into a single Date object.
 */
export function combineDateAndTime(date: Date | null, timeString: string): Date | null {
  if (!date) return null;
  
  const timeDate = parseTimeToDate(timeString, date);
  if (!timeDate) return date;
  
  const combined = new Date(date);
  combined.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0);
  return combined;
}

/**
 * Hook to manage form dialog state with reset callback.
 */
export function useFormDialogState<T>(
  open: boolean,
  editingItem: T | null,
  resetForm: () => void
) {
  useEffect(() => {
    if (!open) {
      // Reset form state when dialog closes
      resetForm();
    }
  }, [open, resetForm]);

  useEffect(() => {
    if (editingItem && open) {
      // Trigger form population when editing item changes
    }
  }, [editingItem, open]);

  return {
    isEditing: !!editingItem,
    dialogTitle: editingItem ? 'Edit' : 'Create',
  };
}

/**
 * Generate time options for select dropdowns (15-minute intervals).
 */
export function generateTimeOptions(interval: number = 15): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      const value = `${h}:${m}`;
      
      // Format for display (12-hour with AM/PM)
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const label = `${displayHour}:${m} ${ampm}`;
      
      options.push({ value, label });
    }
  }
  
  return options;
}

/**
 * Common form validation helpers.
 */
export const formValidation = {
  /**
   * Validate that end date/time is after start date/time.
   */
  isEndAfterStart(
    startDate: Date | null,
    startTime: string,
    endDate: Date | null,
    endTime: string
  ): boolean {
    const start = combineDateAndTime(startDate, startTime);
    const end = combineDateAndTime(endDate, endTime);
    
    if (!start || !end) return true; // Skip validation if missing
    return end > start;
  },

  /**
   * Check if a date is in the past.
   */
  isDateInPast(date: Date | null): boolean {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  },
};
