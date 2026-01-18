import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook for fetching and caching case title formatted as "CASE-NUMBER - Title"
 */
export function useCaseTitle(caseId: string | undefined) {
  const [caseTitle, setCaseTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCaseTitle = useCallback(async () => {
    if (!caseId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("title, case_number")
        .eq("id", caseId)
        .single();

      if (error) throw error;
      if (data) {
        setCaseTitle(`${data.case_number} - ${data.title}`);
      }
    } catch (error) {
      console.error("Error fetching case title:", error);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchCaseTitle();
  }, [fetchCaseTitle]);

  return { caseTitle, loading, refetch: fetchCaseTitle };
}

/**
 * Parse a date string from the database, handling both ISO strings 
 * and simple YYYY-MM-DD format to avoid timezone shifts.
 * 
 * @param dateStr - Date string from database
 * @returns Date object in local time
 */
export function parseDatabaseDate(dateStr: string | null | undefined): Date | undefined {
  if (!dateStr) return undefined;
  
  // Simple date format (YYYY-MM-DD) - parse as local date to avoid timezone shift
  if (dateStr.length === 10) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // Full ISO string - parse directly
  return new Date(dateStr);
}

/**
 * Parse time string (HH:mm or HH:mm:ss) into hours and minutes
 */
export function parseTimeString(timeStr: string | null | undefined): { hours: number; minutes: number } | undefined {
  if (!timeStr) return undefined;
  
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    return {
      hours: parseInt(parts[0], 10),
      minutes: parseInt(parts[1], 10),
    };
  }
  
  return undefined;
}

/**
 * Format a Date object to YYYY-MM-DD string for database storage
 */
export function formatDateForDatabase(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

/**
 * Format time parts to HH:mm string
 */
export function formatTimeForDatabase(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Combine date and time into a single Date object
 */
export function combineDateAndTime(
  date: Date, 
  time: { hours: number; minutes: number }
): Date {
  const combined = new Date(date);
  combined.setHours(time.hours, time.minutes, 0, 0);
  return combined;
}

/**
 * Calculate duration between two times in minutes
 */
export function calculateDurationMinutes(
  start: { hours: number; minutes: number },
  end: { hours: number; minutes: number }
): number {
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  return Math.max(0, endMinutes - startMinutes);
}

/**
 * Calculate duration between two times in decimal hours
 */
export function calculateDurationHours(
  start: { hours: number; minutes: number },
  end: { hours: number; minutes: number }
): number {
  return calculateDurationMinutes(start, end) / 60;
}
