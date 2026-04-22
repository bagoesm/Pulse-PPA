// src/services/VisibilityMiddleware.ts
// Middleware for automatic data filtering based on satker visibility rules
import { supabase as defaultSupabase } from '../lib/supabaseClient';
import { SatkerVisibilityService } from './SatkerVisibilityService';

/**
 * VisibilityCondition
 * Filter conditions that can be applied to Supabase queries
 * Validates: Requirements 4.1, 4.2
 */
export interface VisibilityCondition {
  /** Whether to apply filter (false for admins = no filter) */
  shouldFilter: boolean;
  /** Array of satker IDs that the user can access */
  accessibleSatkerIds: string[];
  /** Column name in the target table that references satker */
  satkerIdColumn: string;
}

/**
 * VisibilityMiddleware
 * Provides automatic filtering at the query level based on user role and satker visibility
 * 
 * Property 6: Data Filter Excludes Unauthorized Satkers
 * Validates: Requirements 4.1, 4.2, 4.3
 */
export class VisibilityMiddleware {
  private supabase: any;
  private visibilityService: SatkerVisibilityService;

  constructor(supabaseClient?: any) {
    this.supabase = supabaseClient || defaultSupabase;
    this.visibilityService = new SatkerVisibilityService(this.supabase);
  }

  /**
   * Build a visibility condition object that can be applied to Supabase queries
   * Property 6: Data Filter Excludes Unauthorized Satkers
   * Validates: Requirements 4.1, 4.2
   * 
   * @param userId - ID of the user making the request
   * @param satkerIdColumn - Column name in the target table that references satker (default: 'satker_id')
   * @returns VisibilityCondition object with filter parameters
   */
  async buildVisibilityCondition(
    userId: string,
    satkerIdColumn: string = 'satker_id'
  ): Promise<VisibilityCondition> {
    // Get user role
    const { data: userProfile, error } = await this.supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !userProfile) {
      // Default to restrictive filter if user not found
      return {
        shouldFilter: true,
        accessibleSatkerIds: [],
        satkerIdColumn,
      };
    }

    // Admins see all data - no filter needed
    if (userProfile.role === 'Super Admin') {
      return {
        shouldFilter: false,
        accessibleSatkerIds: [],
        satkerIdColumn,
      };
    }

    // Get accessible satkers for non-admin users
    const accessibleSatkers = await this.visibilityService.getAccessibleSatkers(userId);
    const accessibleSatkerIds = accessibleSatkers.map((satker) => satker.id);

    return {
      shouldFilter: true,
      accessibleSatkerIds,
      satkerIdColumn,
    };
  }

  /**
   * Apply visibility filter to an existing Supabase query
   * Property 6: Data Filter Excludes Unauthorized Satkers
   * Validates: Requirements 4.1, 4.2, 4.3
   * 
   * @param query - Supabase query builder object
   * @param userId - ID of the user making the request
   * @param satkerIdColumn - Column name in the target table that references satker (default: 'satker_id')
   * @returns Modified query with visibility filter applied
   */
  async applyVisibilityFilter<T>(
    query: any,
    userId: string,
    satkerIdColumn: string = 'satker_id'
  ): Promise<any> {
    const condition = await this.buildVisibilityCondition(userId, satkerIdColumn);

    // If no filter needed (admin), return query as-is
    if (!condition.shouldFilter) {
      return query;
    }

    // Apply filter: only show data from accessible satkers
    // If user has no accessible satkers, use a condition that returns no results
    if (condition.accessibleSatkerIds.length === 0) {
      // Use an impossible condition to return empty result set
      return query.eq(condition.satkerIdColumn, '___NO_ACCESS___');
    }

    // Filter to only show data from accessible satkers
    return query.in(condition.satkerIdColumn, condition.accessibleSatkerIds);
  }

  /**
   * Check if a user can access data from a specific satker
   * Helper method for single-record access checks
   * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
   * 
   * @param userId - ID of the user
   * @param satkerId - ID of the satker to check access for
   * @returns boolean indicating if user has access
   */
  async canAccessSatker(userId: string, satkerId: string): Promise<boolean> {
    return this.visibilityService.checkAccess(userId, satkerId);
  }

  /**
   * Get the list of satker IDs a user can access
   * Useful for client-side filtering or UI display
   * Validates: Requirements 4.1, 4.3
   * 
   * @param userId - ID of the user
   * @returns Array of accessible satker IDs
   */
  async getAccessibleSatkerIds(userId: string): Promise<string[]> {
    const satkers = await this.visibilityService.getAccessibleSatkers(userId);
    return satkers.map((satker) => satker.id);
  }
}

// Export singleton instance
export const visibilityMiddleware = new VisibilityMiddleware();
