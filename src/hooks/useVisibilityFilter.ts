// src/hooks/useVisibilityFilter.ts
// Custom hook for filtering data based on satker visibility rules
// Validates: Requirements 4.1, 4.3, 4.4

import { useState, useEffect, useCallback, useMemo } from 'react';
import { visibilityMiddleware } from '../services/VisibilityMiddleware';

interface UseVisibilityFilterResult {
  /** Filter an array of data based on accessible satkers */
  filterData: <T>(data: T[], satkerIdKey: keyof T) => T[];
  /** Check if a specific satker is accessible by the current user */
  isAccessible: (satkerId: string) => boolean;
  /** Array of accessible satker IDs */
  accessibleSatkerIds: string[];
  /** Map of satker ID to satker name */
  satkerIdToNameMap: Record<string, string>;
  /** Loading state while fetching accessible satkers */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refetch accessible satkers */
  refetch: () => Promise<void>;
}

/**
 * useVisibilityFilter
 * Custom hook for filtering data based on satker visibility rules
 * 
 * Validates: Requirements 4.1, 4.3, 4.4
 * 
 * @param userId - ID of the current user
 * @returns Object with filterData, isAccessible, loading, error, and refetch
 */
export function useVisibilityFilter(userId: string | null | undefined): UseVisibilityFilterResult {
  const [accessibleSatkerIds, setAccessibleSatkerIds] = useState<string[]>([]);
  const [satkerIdToNameMap, setSatkerIdToNameMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch accessible satker IDs on mount or when userId changes
  const fetchAccessibleSatkers = useCallback(async () => {
    if (!userId) {
      setAccessibleSatkerIds([]);
      setSatkerIdToNameMap({});
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ids = await visibilityMiddleware.getAccessibleSatkerIds(userId);
      setAccessibleSatkerIds(ids);
      
      // Also fetch the satker names for mapping
      const { supabase } = await import('../lib/supabaseClient');
      const { data: satkers, error: satkerError } = await supabase
        .from('master_divisi')
        .select('id, name')
        .in('id', ids);
      
      if (satkerError) {
        console.error('Error fetching satker names:', satkerError);
      } else if (satkers) {
        const map: Record<string, string> = {};
        satkers.forEach((satker: any) => {
          map[satker.id] = satker.name;
        });
        setSatkerIdToNameMap(map);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch accessible satkers';
      setError(errorMessage);
      // Default to empty array on error for security
      setAccessibleSatkerIds([]);
      setSatkerIdToNameMap({});
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch on mount and when userId changes
  useEffect(() => {
    fetchAccessibleSatkers();
  }, [fetchAccessibleSatkers]);

  // Memoized Set for O(1) lookup
  const accessibleSet = useMemo(() => new Set(accessibleSatkerIds), [accessibleSatkerIds]);

  /**
   * Filter an array of data based on accessible satkers
   * Validates: Requirements 4.1, 4.3
   * 
   * @param data - Array of data to filter
   * @param satkerIdKey - Key in the data object that contains the satker ID
   * @returns Filtered array containing only data from accessible satkers
   */
  const filterData = useCallback(
    <T>(data: T[], satkerIdKey: keyof T): T[] => {
      if (!data || data.length === 0) {
        return [];
      }

      // If no accessible satkers, return empty array
      if (accessibleSet.size === 0) {
        return [];
      }

      return data.filter((item) => {
        const satkerId = item[satkerIdKey];
        // Handle case where satkerId might be null/undefined
        if (satkerId == null) {
          return false;
        }
        return accessibleSet.has(String(satkerId));
      });
    },
    [accessibleSet]
  );

  /**
   * Check if a specific satker is accessible by the current user
   * Validates: Requirements 4.1, 4.3
   * 
   * @param satkerId - ID of the satker to check
   * @returns boolean indicating if the satker is accessible
   */
  const isAccessible = useCallback(
    (satkerId: string): boolean => {
      if (!satkerId) {
        return false;
      }
      return accessibleSet.has(satkerId);
    },
    [accessibleSet]
  );

  return {
    filterData,
    isAccessible,
    accessibleSatkerIds,
    satkerIdToNameMap,
    loading,
    error,
    refetch: fetchAccessibleSatkers,
  };
}

export default useVisibilityFilter;
