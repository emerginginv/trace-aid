import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

// Hardcoded subject categories - these are fixed and cannot be changed
export const SUBJECT_CATEGORIES = [
  { value: 'person', label: 'Person', pluralLabel: 'People' },
  { value: 'vehicle', label: 'Vehicle', pluralLabel: 'Vehicles' },
  { value: 'location', label: 'Location', pluralLabel: 'Locations' },
  { value: 'item', label: 'Item', pluralLabel: 'Items' },
  { value: 'business', label: 'Business', pluralLabel: 'Businesses' },
] as const;

export type SubjectCategoryValue = typeof SUBJECT_CATEGORIES[number]['value'];

export interface SubjectType {
  id: string;
  organization_id: string;
  category: SubjectCategoryValue;
  name: string;
  code: string;
  description: string | null;
  icon: string;
  color: string;
  is_active: boolean;
  display_order: number;
}

export function useSubjectTypes(options?: { activeOnly?: boolean; category?: SubjectCategoryValue }) {
  const { organization } = useOrganization();
  const [subjectTypes, setSubjectTypes] = useState<SubjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (organization?.id) {
      fetchSubjectTypes();
    }
  }, [organization?.id, options?.category, options?.activeOnly]);

  const fetchSubjectTypes = async () => {
    if (!organization?.id) return;
    
    try {
      setLoading(true);
      let query = supabase
        .from('subject_types')
        .select('*')
        .eq('organization_id', organization.id)
        .order('category')
        .order('display_order');

      if (options?.activeOnly) {
        query = query.eq('is_active', true);
      }

      if (options?.category) {
        query = query.eq('category', options.category);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSubjectTypes((data || []) as SubjectType[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching subject types:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const getSubjectTypeByCode = (code: string): SubjectType | undefined => {
    return subjectTypes.find(st => st.code === code);
  };

  const getSubjectTypeById = (id: string): SubjectType | undefined => {
    return subjectTypes.find(st => st.id === id);
  };

  const getTypesByCategory = (category: SubjectCategoryValue): SubjectType[] => {
    return subjectTypes.filter(st => st.category === category);
  };

  const getActiveTypesByCategory = (category: SubjectCategoryValue): SubjectType[] => {
    return subjectTypes.filter(st => st.category === category && st.is_active);
  };

  return {
    subjectTypes,
    loading,
    error,
    refetch: fetchSubjectTypes,
    getSubjectTypeByCode,
    getSubjectTypeById,
    getTypesByCategory,
    getActiveTypesByCategory,
  };
}
