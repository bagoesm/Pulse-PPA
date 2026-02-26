// src/services/DisposisiService.ts
// Service layer for Disposisi business logic
import { supabase as defaultSupabase } from '../lib/supabaseClient';
import { Disposisi, DisposisiStatus, DisposisiHistory, DisposisiAction, User, Attachment } from '../../types';
import { NotificationService } from './NotificationService';
import { mappers } from '../utils/mappers';
import {
  requireCreateDisposisiPermission,
  requireDeleteDisposisiPermission,
  requireUpdateDisposisiPermission
} from '../utils/authorization';
import { validateDisposisiReferences } from '../utils/foreignKeyValidation';
import {
  ValidationError,
  DatabaseError,
  FileUploadError,
  handleDatabaseOperation,
  handleFileUploadError,
  handleNotificationError,
  validateFile,
  validateRequiredFields,
  ERROR_MESSAGES,
} from '../utils/errorHandling';

export class DisposisiService {
  private supabase: any;

  constructor(supabaseClient?: any) {
    this.supabase = supabaseClient || defaultSupabase;
  }
  /**
   * Create Disposisi for multiple users
   * Property 10: Multi-User Disposisi Creation
   * Validates: Requirements 5.1, 5.2, 10.2, 10.3, 14.4, 15.1, 15.2
   */
  async createMultiUserDisposisi(
    suratId: string,
    kegiatanId: string,
    assignees: string[],
    disposisiText: string,
    createdBy: string,
    currentUser: User | null,
    deadline?: string,
    assignerName?: string,
    suratNumber?: string,
    kegiatanTitle?: string
  ): Promise<Disposisi[]> {
    try {
      // Authorization check: Only Atasan or Super Admin can create Disposisi
      requireCreateDisposisiPermission(currentUser);

      // Validate required fields
      if (!assignees || assignees.length === 0) {
        throw new ValidationError(ERROR_MESSAGES.NO_ASSIGNEES, 'assignees');
      }

      if (!disposisiText || disposisiText.trim() === '') {
        throw new ValidationError(ERROR_MESSAGES.EMPTY_DISPOSISI_TEXT, 'disposisiText');
      }

      validateRequiredFields(
        { suratId, kegiatanId, createdBy },
        ['suratId', 'kegiatanId', 'createdBy']
      );

      // Validate foreign key references (Requirements 10.2, 10.3, 15.1, 15.2)
      await validateDisposisiReferences(suratId, kegiatanId, assignees, this.supabase);

      const createdDisposisi: Disposisi[] = [];
      const failedAssignees: string[] = [];

      // Create individual Disposisi record for each assignee
      for (const assignee of assignees) {
        try {
          const insertData = {
            surat_id: suratId,
            kegiatan_id: kegiatanId,
            assigned_to: assignee,
            disposisi_text: disposisiText.trim(),
            status: 'Pending' as DisposisiStatus,
            deadline: deadline,
            created_by: createdBy,
            created_by_id: currentUser?.id || null,
          };

          const { data, error } = await handleDatabaseOperation(
            async () => {
              const result = await this.supabase
                .from('disposisi')
                .insert(insertData)
                .select()
                .single();

              if (result.error) throw result.error;
              return result;
            },
            'createMultiUserDisposisi'
          );

          const disposisi = this.mapDisposisiFromDB(data);
          createdDisposisi.push(disposisi);

          // Create audit trail for creation
          await this.createHistoryRecord(
            disposisi.id,
            'created',
            undefined,
            `Disposisi created for ${assignee}`,
            createdBy
          );

          // Create notification for assignment (Requirements 8.1)
          // Notification errors should not block main operation
          if (assignerName && suratNumber && kegiatanTitle) {
            try {
              await NotificationService.createDisposisiAssignmentNotification(
                disposisi,
                assignerName,
                suratNumber,
                kegiatanTitle
              );
            } catch (notifError) {
              handleNotificationError(notifError, 'createMultiUserDisposisi');
            }
          }
        } catch (assigneeError) {
          console.error(`Failed to create disposisi for assignee ${assignee}:`, assigneeError);
          failedAssignees.push(assignee);
        }
      }

      // If all assignees failed, throw error
      if (createdDisposisi.length === 0) {
        throw new DatabaseError('Failed to create disposisi for all assignees');
      }

      // If some assignees failed, log warning but return successful ones
      if (failedAssignees.length > 0) {
        console.warn(`Failed to create disposisi for ${failedAssignees.length} assignees:`, failedAssignees);
      }

      return createdDisposisi;
    } catch (error) {
      console.error('Error creating multi-user disposisi:', error);
      throw error;
    }
  }

  /**
   * Validate that Disposisi is required for linked Surat-Kegiatan
   * Property 8: Mandatory Disposisi for Linked Entities
   * Validates: Requirements 4.1, 4.2
   */
  async validateDisposisiRequired(
    suratId: string | undefined,
    kegiatanId: string | undefined
  ): Promise<boolean> {
    // If both suratId and kegiatanId are provided, Disposisi is required
    if (suratId && kegiatanId) {
      return true;
    }

    // If only one is provided or neither, Disposisi is not required
    return false;
  }

  /**
   * Get Disposisi for a Surat-Kegiatan link
   * Validates: Requirements 5.4
   */
  async getDisposisiForLink(
    suratId: string,
    kegiatanId: string
  ): Promise<Disposisi[]> {
    try {
      const { data, error } = await this.supabase
        .from('disposisi')
        .select('*')
        .eq('surat_id', suratId)
        .eq('kegiatan_id', kegiatanId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data ? data.map(this.mapDisposisiFromDB) : [];
    } catch (error) {
      console.error('Error fetching disposisi for link:', error);
      throw error;
    }
  }

  /**
   * Update Disposisi status with audit trail
   * Property 16: Status Transition Validity
   * Validates: Requirements 7.1, 7.2, 12.1, 12.2, 14.4
   */
  async updateStatus(
    disposisiId: string,
    status: DisposisiStatus,
    userId: string,
    currentUser: User | null,
    updaterName?: string,
    suratNumber?: string,
    kegiatanTitle?: string
  ): Promise<void> {
    try {
      // Get current disposisi to check permissions and record old status
      const { data: currentData, error: fetchError } = await this.supabase
        .from('disposisi')
        .select('*')
        .eq('id', disposisiId)
        .single();

      if (fetchError) throw fetchError;

      const oldStatus = currentData?.status;
      const currentDisposisi = this.mapDisposisiFromDB(currentData);

      // Authorization check: User must have permission to update this Disposisi
      requireUpdateDisposisiPermission(
        currentUser,
        currentDisposisi.assignedTo,
        currentDisposisi.createdBy
      );

      // Update status
      const updateData: any = {
        status: status,
        updated_at: new Date().toISOString(),
      };

      // If status is Completed, record completion details
      if (status === 'Completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = userId;
        updateData.completed_by_id = userId;
      }

      const { error: updateError } = await this.supabase
        .from('disposisi')
        .update(updateData)
        .eq('id', disposisiId);

      if (updateError) throw updateError;

      // Create audit trail for status change
      await this.createHistoryRecord(
        disposisiId,
        'status_changed',
        oldStatus,
        status,
        userId
      );

      // Create notification for update (Requirements 8.5)
      if (updaterName && suratNumber && kegiatanTitle && oldStatus !== status) {
        const changeDescription = `Status diubah dari "${oldStatus}" menjadi "${status}"`;
        await NotificationService.createDisposisiUpdateNotification(
          { ...currentDisposisi, status },
          updaterName,
          suratNumber,
          kegiatanTitle,
          changeDescription
        );
      }
    } catch (error) {
      console.error('Error updating disposisi status:', error);
      throw error;
    }
  }

  /**
   * Get Disposisi history
   * Property 29: Audit Trail Completeness
   * Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5
   */
  async getHistory(disposisiId: string): Promise<DisposisiHistory[]> {
    try {
      const { data, error } = await this.supabase
        .from('disposisi_history')
        .select('*')
        .eq('disposisi_id', disposisiId)
        .order('performed_at', { ascending: false });

      if (error) throw error;

      return data ? data.map(this.mapHistoryFromDB) : [];
    } catch (error) {
      console.error('Error fetching disposisi history:', error);
      throw error;
    }
  }

  /**
   * Check if all Disposisi for a link are completed
   * Property 17: Overall Disposisi Completion
   * Validates: Requirements 7.4
   */
  async areAllCompleted(
    suratId: string,
    kegiatanId: string
  ): Promise<boolean> {
    try {
      const disposisiList = await this.getDisposisiForLink(suratId, kegiatanId);

      if (disposisiList.length === 0) {
        return false;
      }

      return disposisiList.every(d => d.status === 'Completed');
    } catch (error) {
      console.error('Error checking disposisi completion:', error);
      throw error;
    }
  }

  /**
   * Check and create deadline reminders for approaching deadlines
   * Validates: Requirements 8.4
   */
  async checkAndCreateDeadlineReminders(): Promise<void> {
    await NotificationService.checkAndCreateDeadlineReminders();
  }

  /**
   * Delete Disposisi with authorization check
   * Validates: Requirements 14.5
   */
  async deleteDisposisi(
    disposisiId: string,
    currentUser: User | null
  ): Promise<void> {
    try {
      // Get current disposisi to check permissions
      const { data: currentData, error: fetchError } = await this.supabase
        .from('disposisi')
        .select('*')
        .eq('id', disposisiId)
        .single();

      if (fetchError) throw fetchError;

      const currentDisposisi = this.mapDisposisiFromDB(currentData);

      // Authorization check: Only creator or Super Admin can delete
      requireDeleteDisposisiPermission(currentUser, currentDisposisi.createdBy);

      // Create audit trail for deletion (before deleting)
      const userId = currentUser?.id || currentUser?.name || 'unknown';
      await this.createHistoryRecord(
        disposisiId,
        'assignee_removed',
        currentDisposisi.assignedTo,
        'Disposisi deleted',
        userId
      );

      // Delete the disposisi
      const { error: deleteError } = await this.supabase
        .from('disposisi')
        .delete()
        .eq('id', disposisiId);

      if (deleteError) throw deleteError;
    } catch (error) {
      console.error('Error deleting disposisi:', error);
      throw error;
    }
  }

  /**
   * Upload Laporan with audit trail
   * Validates: Requirements 6.1, 6.2, 12.4
   */
  async uploadLaporan(
    disposisiId: string,
    file: File,
    userId: string
  ): Promise<Attachment> {
    let uploadedFilePath: string | null = null;

    try {
      // Validate file
      validateFile(file, 10); // 10MB max

      // Upload file to Supabase Storage
      const fileName = `${disposisiId}_${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = `laporan/${fileName}`;
      uploadedFilePath = filePath;

      const { error: uploadError } = await this.supabase.storage
        .from('attachment')
        .upload(filePath, file);

      if (uploadError) {
        throw new FileUploadError(
          uploadError.message || ERROR_MESSAGES.FILE_UPLOAD_FAILED,
          file.name
        );
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('attachment')
        .getPublicUrl(filePath);

      // Create attachment object
      const attachment: Attachment = {
        id: `laporan_${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        path: filePath,
        url: urlData.publicUrl,
      };

      // Get current disposisi
      const { data: currentDisposisi, error: fetchError } = await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('disposisi')
            .select('laporan')
            .eq('id', disposisiId)
            .single();

          if (result.error) throw result.error;
          return result;
        },
        'uploadLaporan - fetch'
      );

      const currentLaporan = currentDisposisi?.laporan || [];
      const updatedLaporan = [...currentLaporan, attachment];

      // Update disposisi with new laporan
      await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('disposisi')
            .update({
              laporan: updatedLaporan,
              updated_at: new Date().toISOString()
            })
            .eq('id', disposisiId);

          if (result.error) throw result.error;
          return result;
        },
        'uploadLaporan - update'
      );

      // Create audit trail for laporan upload
      await this.createHistoryRecord(
        disposisiId,
        'laporan_uploaded',
        undefined,
        file.name,
        userId
      );

      return attachment;
    } catch (error) {
      console.error('Error uploading laporan:', error);

      // Cleanup uploaded file on error
      if (uploadedFilePath) {
        await handleFileUploadError(
          error,
          uploadedFilePath,
          async (path) => {
            await this.supabase.storage.from('attachment').remove([path]);
          }
        );
      }

      throw error;
    }
  }

  /**
   * Delete Laporan with audit trail
   * Validates: Requirements 6.5, 12.4
   */
  async deleteLaporan(
    disposisiId: string,
    attachmentId: string,
    userId: string
  ): Promise<void> {
    try {
      // Get current disposisi
      const { data: currentDisposisi, error: fetchError } = await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('disposisi')
            .select('laporan')
            .eq('id', disposisiId)
            .single();

          if (result.error) throw result.error;
          return result;
        },
        'deleteLaporan - fetch'
      );

      const currentLaporan = currentDisposisi?.laporan || [];
      const attachmentToDelete = currentLaporan.find((a: Attachment) => a.id === attachmentId);

      if (!attachmentToDelete) {
        throw new ValidationError('Laporan tidak ditemukan', 'attachmentId');
      }

      // Delete file from storage (if not a link)
      if (attachmentToDelete.path) {
        try {
          const { error: deleteError } = await this.supabase.storage
            .from('attachment')
            .remove([attachmentToDelete.path]);

          if (deleteError) {
            console.error('Error deleting file from storage:', deleteError);
            // Continue with database update even if file deletion fails
          }
        } catch (storageError) {
          console.error('Storage deletion error:', storageError);
          // Continue with database update
        }
      }

      // Update disposisi without the deleted laporan
      const updatedLaporan = currentLaporan.filter((a: Attachment) => a.id !== attachmentId);

      await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('disposisi')
            .update({
              laporan: updatedLaporan,
              updated_at: new Date().toISOString()
            })
            .eq('id', disposisiId);

          if (result.error) throw result.error;
          return result;
        },
        'deleteLaporan - update'
      );

      // Create audit trail for laporan deletion
      await this.createHistoryRecord(
        disposisiId,
        'laporan_deleted',
        attachmentToDelete.name,
        undefined,
        userId
      );
    } catch (error) {
      console.error('Error deleting laporan:', error);
      throw error;
    }
  }

  /**
   * Update Disposisi notes with audit trail
   * Validates: Requirements 12.5
   */
  async updateNotes(
    disposisiId: string,
    notes: string,
    userId: string,
    currentUser: User | null
  ): Promise<void> {
    try {
      // Get current disposisi to check permissions and record old notes
      const { data: currentData, error: fetchError } = await this.supabase
        .from('disposisi')
        .select('*')
        .eq('id', disposisiId)
        .single();

      if (fetchError) throw fetchError;

      const oldNotes = currentData?.notes || '';
      const currentDisposisi = this.mapDisposisiFromDB(currentData);

      // Authorization check
      requireUpdateDisposisiPermission(
        currentUser,
        currentDisposisi.assignedTo,
        currentDisposisi.createdBy
      );

      // Update notes
      const { error: updateError } = await this.supabase
        .from('disposisi')
        .update({
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', disposisiId);

      if (updateError) throw updateError;

      // Create audit trail for notes update
      await this.createHistoryRecord(
        disposisiId,
        'notes_updated',
        oldNotes,
        notes,
        userId
      );
    } catch (error) {
      console.error('Error updating notes:', error);
      throw error;
    }
  }

  /**
   * Update Disposisi deadline with audit trail
   * Validates: Requirements 12.2
   */
  async updateDeadline(
    disposisiId: string,
    deadline: string | undefined,
    userId: string,
    currentUser: User | null
  ): Promise<void> {
    try {
      // Get current disposisi to check permissions and record old deadline
      const { data: currentData, error: fetchError } = await this.supabase
        .from('disposisi')
        .select('*')
        .eq('id', disposisiId)
        .single();

      if (fetchError) throw fetchError;

      const oldDeadline = currentData?.deadline || '';
      const currentDisposisi = this.mapDisposisiFromDB(currentData);

      // Authorization check
      requireUpdateDisposisiPermission(
        currentUser,
        currentDisposisi.assignedTo,
        currentDisposisi.createdBy
      );

      // Update deadline
      const { error: updateError } = await this.supabase
        .from('disposisi')
        .update({
          deadline: deadline,
          updated_at: new Date().toISOString()
        })
        .eq('id', disposisiId);

      if (updateError) throw updateError;

      // Create audit trail for deadline change
      await this.createHistoryRecord(
        disposisiId,
        'deadline_changed',
        oldDeadline,
        deadline || 'No deadline',
        userId
      );
    } catch (error) {
      console.error('Error updating deadline:', error);
      throw error;
    }
  }

  /**
   * Create a history record for audit trail
   * Internal helper method
   */
  private async createHistoryRecord(
    disposisiId: string,
    action: DisposisiAction,
    oldValue: string | undefined,
    newValue: string,
    performedBy: string
  ): Promise<void> {
    try {
      const historyData = {
        disposisi_id: disposisiId,
        action: action,
        old_value: oldValue,
        new_value: newValue,
        performed_by: performedBy,
        performed_by_id: performedBy,
        performed_at: new Date().toISOString(),
      };

      const { error } = await this.supabase
        .from('disposisi_history')
        .insert(historyData);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating history record:', error);
      // Don't throw - audit trail failure shouldn't block main operation
    }
  }

  /**
   * Map database row to Disposisi interface
   * OPTIMIZATION: Use centralized mapper
   */
  private mapDisposisiFromDB = mappers.disposisi;

  /**
   * Map database row to DisposisiHistory interface
   * Internal helper method
   */
  private mapHistoryFromDB(row: any): DisposisiHistory {
    return {
      id: row.id,
      disposisiId: row.disposisi_id,
      action: row.action,
      oldValue: row.old_value,
      newValue: row.new_value,
      performedBy: row.performed_by,
      performedAt: row.performed_at,
    };
  }
}

// Export singleton instance
export const disposisiService = new DisposisiService();
