// src/hooks/useVisibilityFilter.ts
// Custom hook for filtering data based on satker visibility rules
// Validates: Requirements 4.1, 4.3, 4.4

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  refetch: () => Promise<any>;
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
  const { data, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['visibilityFilter', userId],
    queryFn: async () => {
      if (!userId) {
        return { accessibleSatkerIds: [], satkerIdToNameMap: {} };
      }

      const ids = await visibilityMiddleware.getAccessibleSatkerIds(userId);
      
      // Also fetch the satker names for mapping
      const { supabase } = await import('../lib/supabaseClient');
      const { data: satkers, error: satkerError } = await supabase
        .from('master_divisi')
        .select('id, name')
        .in('id', ids);
      
      const map: Record<string, string> = {};
      if (satkerError) {
        console.error('Error fetching satker names in hook:', satkerError);
      } else if (satkers) {
        satkers.forEach((satker: any) => {
          map[satker.id] = satker.name;
        });
      }

      return {
        accessibleSatkerIds: ids,
        satkerIdToNameMap: map
      };
    },
    enabled: !!userId,
  });

  const accessibleSatkerIds = data?.accessibleSatkerIds || [];
  const satkerIdToNameMap = data?.satkerIdToNameMap || {};
  const loading = isLoading;
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to fetch') : null;

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
    refetch,
  };
}

export default useVisibilityFilter;
