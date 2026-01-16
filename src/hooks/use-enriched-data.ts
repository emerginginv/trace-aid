import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EnrichmentConfig {
  /** Foreign key field that references cases table */
  caseIdField?: string;
  /** Foreign key field that references profiles table */
  userIdField?: string;
  /** Additional user ID fields to enrich (e.g., 'assigned_user_id') */
  additionalUserFields?: string[];
}

interface CaseData {
  id: string;
  case_number: string;
  title: string;
}

interface UserData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string;
}

interface UseEnrichedDataResult<T, E> {
  enrichedData: E[];
  isEnriching: boolean;
  caseMap: Record<string, CaseData>;
  userMap: Record<string, UserData>;
  refetchEnrichment: () => void;
}

/**
 * Hook for enriching raw data with case and user information
 * Reduces duplicate enrichment logic across list pages
 * 
 * @param rawData - Array of raw data from query
 * @param config - Configuration for which fields to enrich
 * @param transformFn - Function to transform raw item + enrichment data into final shape
 */
export function useEnrichedData<T extends Record<string, any>, E>(
  rawData: T[],
  config: EnrichmentConfig,
  transformFn: (item: T, caseMap: Record<string, CaseData>, userMap: Record<string, UserData>) => E | null
): UseEnrichedDataResult<T, E> {
  const [enrichedData, setEnrichedData] = useState<E[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);
  const [caseMap, setCaseMap] = useState<Record<string, CaseData>>({});
  const [userMap, setUserMap] = useState<Record<string, UserData>>({});
  const [fetchKey, setFetchKey] = useState(0);

  const refetchEnrichment = useCallback(() => {
    setFetchKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    const enrichData = async () => {
      if (rawData.length === 0) {
        setEnrichedData([]);
        setCaseMap({});
        setUserMap({});
        return;
      }

      setIsEnriching(true);

      try {
        const promises: Promise<any>[] = [];
        
        // Collect case IDs if configured
        let caseIds: string[] = [];
        if (config.caseIdField) {
          caseIds = [...new Set(
            rawData
              .map(item => item[config.caseIdField!])
              .filter(Boolean)
          )];
        }

        // Collect user IDs from all configured fields
        let userIds: string[] = [];
        const userFields = [
          config.userIdField,
          ...(config.additionalUserFields || [])
        ].filter(Boolean) as string[];

        userFields.forEach(field => {
          rawData.forEach(item => {
            if (item[field]) {
              userIds.push(item[field]);
            }
          });
        });
        userIds = [...new Set(userIds)];

        // Fetch cases
        if (caseIds.length > 0) {
          const casesPromise = (async () => {
            const { data, error } = await supabase
              .from("cases")
              .select("id, case_number, title")
              .in("id", caseIds);
            if (error) throw error;
            return { type: 'cases' as const, data: data || [] };
          })();
          promises.push(casesPromise);
        }

        // Fetch users
        if (userIds.length > 0) {
          const usersPromise = (async () => {
            const { data, error } = await supabase
              .from("profiles")
              .select("id, full_name, avatar_url, email")
              .in("id", userIds);
            if (error) throw error;
            return { type: 'users' as const, data: data || [] };
          })();
          promises.push(usersPromise);
        }

        const results = await Promise.all(promises);

        // Build maps
        const newCaseMap: Record<string, CaseData> = {};
        const newUserMap: Record<string, UserData> = {};

        results.forEach(result => {
          if (result.type === 'cases') {
            result.data.forEach((c: CaseData) => {
              newCaseMap[c.id] = c;
            });
          } else if (result.type === 'users') {
            result.data.forEach((u: UserData) => {
              newUserMap[u.id] = u;
            });
          }
        });

        setCaseMap(newCaseMap);
        setUserMap(newUserMap);

        // Transform data
        const enriched = rawData
          .map(item => transformFn(item, newCaseMap, newUserMap))
          .filter((item): item is E => item !== null);

        setEnrichedData(enriched);
      } catch (error) {
        console.error("Error enriching data:", error);
        setEnrichedData([]);
      } finally {
        setIsEnriching(false);
      }
    };

    enrichData();
  }, [rawData, config.caseIdField, config.userIdField, config.additionalUserFields?.join(','), fetchKey]);

  return {
    enrichedData,
    isEnriching,
    caseMap,
    userMap,
    refetchEnrichment,
  };
}

/**
 * Simplified hook for common case/user enrichment pattern
 */
export function useActivityEnrichment<T extends { case_id: string; assigned_user_id?: string | null }>(
  rawData: T[]
) {
  return useEnrichedData(
    rawData,
    {
      caseIdField: 'case_id',
      additionalUserFields: ['assigned_user_id'],
    },
    (item, caseMap, userMap) => {
      const caseData = caseMap[item.case_id];
      if (!caseData) return null;
      
      return {
        ...item,
        cases: caseData,
        assigned_user: item.assigned_user_id ? userMap[item.assigned_user_id] || null : null,
      };
    }
  );
}

export function useUpdateEnrichment<T extends { case_id: string; user_id: string }>(
  rawData: T[]
) {
  return useEnrichedData(
    rawData,
    {
      caseIdField: 'case_id',
      userIdField: 'user_id',
    },
    (item, caseMap, userMap) => {
      const caseData = caseMap[item.case_id];
      if (!caseData) return null;
      
      return {
        ...item,
        cases: caseData,
        author: userMap[item.user_id] || null,
      };
    }
  );
}
