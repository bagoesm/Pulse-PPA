// src/services/SatkerVisibilityService.ts
// Service layer for Satker Visibility Control business logic
import { supabase as defaultSupabase } from '../lib/supabaseClient';
import { Satker, SatkerWithVisibility } from '../../types';
import {
  ValidationError,
  handleDatabaseOperation,
} from '../utils/errorHandling';

/**
 * SatkerVisibilityService
 * Manages satker visibility control - determining which satkers are accessible to which users
 * 
 * Validates: Requirements 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5
 */
export class SatkerVisibilityService {
  private supabase: any;

  constructor(supabaseClient?: any) {
    this.supabase = supabaseClient || defaultSupabase;
  }

  /**
   * Update visibility status of a satker
   * Property 4: Visibility Toggle Persistence
   * Validates: Requirements 1.2, 1.3
   * 
   * @param satkerId - ID of the satker to update
   * @param isLocked - New visibility status (true = locked, false = unlocked)
   * @param userId - ID of the admin making the change
   * @returns Updated Satker object
   */
  async updateVisibility(
    satkerId: string,
    isLocked: boolean,
    userId: string
  ): Promise<Satker> {
    try {
      // Validate required fields
      if (!satkerId) {
        throw new ValidationError('Satker ID is required', 'satkerId');
      }
      if (!userId) {
        throw new ValidationError('User ID is required', 'userId');
      }

      // Verify user is admin (authorization check)
      const { data: userProfile, error: userError } = await this.supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (userError || !userProfile) {
        throw new ValidationError('User not found', 'userId');
      }

      if (userProfile.role !== 'Super Admin') {
        throw new ValidationError('Hanya admin yang dapat mengubah visibility satker', 'userId');
      }

      // Get current satker data
      const { data: currentSatker, error: fetchError } = await this.supabase
        .from('master_divisi')
        .select('*')
        .eq('id', satkerId)
        .single();

      if (fetchError || !currentSatker) {
        throw new ValidationError('Divisi tidak ditemukan', 'satkerId');
      }

      // Update satker visibility
      const updateData = {
        is_locked: isLocked,
        locked_at: isLocked ? new Date().toISOString() : null,
        locked_by: isLocked ? userId : null,
      };

      const { data, error } = await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('master_divisi')
            .update(updateData)
            .eq('id', satkerId)
            .select()
            .single();

          if (result.error) throw result.error;
          return result;
        },
        'updateVisibility'
      );

      // Note: Audit log is automatically created by database trigger (trg_divisi_visibility_audit)
      
      return this.mapSatkerFromDB(data);
    } catch (error) {
      console.error('Error updating satker visibility:', error);
      throw error;
    }
  }

  /**
   * Get all satkers with visibility status (for admin management UI)
   * Validates: Requirements 1.1, 3.1
   * 
   * @returns Array of SatkerWithVisibility objects
   */
  async getAllSatkerWithVisibility(): Promise<SatkerWithVisibility[]> {
    try {
      const { data, error } = await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('master_divisi')
            .select(`
              id,
              name,
              is_locked,
              locked_at,
              locked_by,
              created_at
            `)
            .order('name', { ascending: true });

          if (result.error) throw result.error;
          return result;
        },
        'getAllSatkerWithVisibility'
      );

      // Get member count for each satker
      // Members are users whose divisi matches the satker name
      const satkersWithCounts = await Promise.all(
        (data || []).map(async (satker: any) => {
          const { count, error: countError } = await this.supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('divisi', satker.name);

          return {
            ...this.mapSatkerFromDB(satker),
            memberCount: count || 0,
          };
        })
      );

      return satkersWithCounts;
    } catch (error) {
      console.error('Error fetching satkers with visibility:', error);
      throw error;
    }
  }

  /**
   * Get all satkers accessible by a specific user
   * Property 1: Admin Access All Satkers
   * Property 2: Non-Admin Access to Locked Satker Requires Membership
   * Property 3: Unlocked Satker Accessible to All
   * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
   * 
   * @param userId - ID of the user
   * @returns Array of Satker objects the user can access
   */
  async getAccessibleSatkers(userId: string): Promise<Satker[]> {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required', 'userId');
      }

      // Use the database function for optimal performance
      const { data, error } = await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .rpc('get_accessible_divisi', { p_user_id: userId });

          if (result.error) throw result.error;
          return result;
        },
        'getAccessibleSatkers'
      );

      return (data || []).map((row: any) => this.mapSatkerFromDB(row));
    } catch (error) {
      console.error('Error fetching accessible satkers:', error);
      throw error;
    }
  }

  /**
   * Check if a user has access to a specific satker
   * Property 1: Admin Access All Satkers
   * Property 2: Non-Admin Access to Locked Satker Requires Membership
   * Property 3: Unlocked Satker Accessible to All
   * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
   * 
   * @param userId - ID of the user
   * @param satkerId - ID of the satker
   * @returns boolean indicating if user has access
   */
  async checkAccess(userId: string, satkerId: string): Promise<boolean> {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required', 'userId');
      }
      if (!satkerId) {
        throw new ValidationError('Satker ID is required', 'satkerId');
      }

      // Use the database function for optimal performance
      const { data, error } = await this.supabase
        .rpc('check_divisi_access', {
          p_user_id: userId,
          p_divisi_id: satkerId
        });

      if (error) {
        console.error('Error checking satker access:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error checking satker access:', error);
      return false;
    }
  }

  /**
   * Get satker by ID
   * 
   * @param satkerId - ID of the satker
   * @returns Satker object or null
   */
  async getSatkerById(satkerId: string): Promise<Satker | null> {
    try {
      const { data, error } = await this.supabase
        .from('master_divisi')
        .select('*')
        .eq('id', satkerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw error;
      }

      return data ? this.mapSatkerFromDB(data) : null;
    } catch (error) {
      console.error('Error fetching satker:', error);
      throw error;
    }
  }

  /**
   * Map database row to Satker interface
   * Internal helper method
   */
  private mapSatkerFromDB(row: any): Satker {
    return {
      id: row.id,
      name: row.name,
      isLocked: row.is_locked ?? false,
      lockedAt: row.locked_at ? new Date(row.locked_at) : null,
      lockedBy: row.locked_by ?? null,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.created_at ? new Date(row.created_at) : new Date(), // master_divisi doesn't have updated_at
    };
  }
}

// Export singleton instance
export const satkerVisibilityService = new SatkerVisibilityService();
