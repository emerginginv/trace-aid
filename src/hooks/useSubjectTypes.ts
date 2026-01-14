import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

export interface SubjectType {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description: string | null;
  icon: string;
  color: string;
  is_active: boolean;
  display_order: number;
}

export function useSubjectTypes(options?: { activeOnly?: boolean }) {
  const { organization } = useOrganization();
  const [subjectTypes, setSubjectTypes] = useState<SubjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (organization?.id) {
      fetchSubjectTypes();
    }
  }, [organization?.id]);

  const fetchSubjectTypes = async () => {
    if (!organization?.id) return;
    
    try {
      setLoading(true);
      let query = supabase
        .from('subject_types')
        .select('*')
        .eq('organization_id', organization.id)
        .order('display_order');

      if (options?.activeOnly) {
        query = query.eq('is_active', true);
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

  return {
    subjectTypes,
    loading,
    error,
    refetch: fetchSubjectTypes,
    getSubjectTypeByCode,
    getSubjectTypeById,
  };
}
