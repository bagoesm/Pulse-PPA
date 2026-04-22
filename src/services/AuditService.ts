// src/services/AuditService.ts
// Service layer for Satker Visibility Audit Trail
import { supabase as defaultSupabase } from '../lib/supabaseClient';
import { VisibilityAuditLog, AuditTrailFilters } from '../../types';
import {
  ValidationError,
  handleDatabaseOperation,
} from '../utils/errorHandling';

/**
 * AuditLogEntry for creating new audit log entries
 */
export interface AuditLogEntry {
  satkerId: string;
  satkerName: string;
  oldStatus: boolean;
  newStatus: boolean;
  changedBy: string;
}

/**
 * AuditService
 * Manages audit trail for satker visibility changes
 *
 * Validates: Requirements 5.1, 5.2, 5.3
 */
export class AuditService {
  private supabase: any;

  constructor(supabaseClient?: any) {
    this.supabase = supabaseClient || defaultSupabase;
  }

  /**
   * Log a visibility change manually
   * Note: Database trigger (trg_satker_visibility_audit) handles automatic logging
   * This method is available for manual logging if needed
   * Validates: Requirements 5.1
   *
   * @param entry - Audit log entry data
   * @returns Created VisibilityAuditLog
   */
  async logVisibilityChange(entry: AuditLogEntry): Promise<VisibilityAuditLog> {
    try {
      // Validate required fields
      if (!entry.satkerId) {
        throw new ValidationError('Satker ID is required', 'satkerId');
      }
      if (!entry.satkerName) {
        throw new ValidationError('Satker name is required', 'satkerName');
      }
      if (!entry.changedBy) {
        throw new ValidationError('Changed by is required', 'changedBy');
      }

      const { data, error } = await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('visibility_audit_log')
            .insert({
              divisi_id: entry.satkerId,
              divisi_name: entry.satkerName,
              old_status: entry.oldStatus,
              new_status: entry.newStatus,
              changed_by: entry.changedBy,
              changed_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (result.error) throw result.error;
          return result;
        },
        'logVisibilityChange'
      );

      return this.mapAuditLogFromDB(data);
    } catch (error) {
      console.error('Error logging visibility change:', error);
      throw error;
    }
  }

  /**
   * Get visibility audit trail with optional filters and pagination
   * Validates: Requirements 5.2, 5.3
   *
   * @param filters - Optional filters (satkerId, limit, offset)
   * @returns Array of VisibilityAuditLog entries
   */
  async getVisibilityAuditTrail(
    filters?: AuditTrailFilters
  ): Promise<VisibilityAuditLog[]> {
    try {
      const limit = filters?.limit ?? 50;
      const offset = filters?.offset ?? 0;

      let query = this.supabase
        .from('visibility_audit_log')
        .select(`
          id,
          divisi_id,
          divisi_name,
          old_status,
          new_status,
          changed_by,
          changed_at,
          profiles:changed_by (name)
        `)
        .order('changed_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply satker filter if provided
      if (filters?.satkerId) {
        query = query.eq('divisi_id', filters.satkerId);
      }

      const { data, error } = await handleDatabaseOperation(
        async () => {
          const result = await query;
          if (result.error) throw result.error;
          return result;
        },
        'getVisibilityAuditTrail'
      );

      return (data || []).map((row: any) => this.mapAuditLogFromDB(row));
    } catch (error) {
      console.error('Error fetching visibility audit trail:', error);
      throw error;
    }
  }

  /**
   * Map database row to VisibilityAuditLog interface
   * Internal helper method
   */
  private mapAuditLogFromDB(row: any): VisibilityAuditLog {
    return {
      id: row.id,
      satkerId: row.divisi_id || row.satker_id, // Support both column names for backward compatibility
      satkerName: row.divisi_name || row.satker_name,
      oldStatus: row.old_status,
      newStatus: row.new_status,
      changedBy: row.changed_by,
      changedByName: row.profiles?.name ?? undefined,
      changedAt: new Date(row.changed_at),
    };
  }
}

// Export singleton instance
export const auditService = new AuditService();
