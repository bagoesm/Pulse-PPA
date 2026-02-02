// src/services/LinkingService.ts
// Service layer for Surat-Kegiatan linking business logic
import { supabase as defaultSupabase } from '../lib/supabaseClient';
import { DisposisiService } from './DisposisiService';
import { validateLinkReferences, ForeignKeyValidationError } from '../utils/foreignKeyValidation';
import {
  ValidationError,
  DatabaseError,
  handleDatabaseOperation,
  withTransaction,
  ERROR_MESSAGES,
} from '../utils/errorHandling';

export class LinkingService {
  private supabase: any;
  private disposisiService: DisposisiService;

  constructor(supabaseClient?: any, disposisiServiceInstance?: DisposisiService) {
    this.supabase = supabaseClient || defaultSupabase;
    this.disposisiService = disposisiServiceInstance || new DisposisiService(supabaseClient);
  }

  /**
   * Link Surat to Kegiatan with Disposisi validation
   * Property 5: Surat-Kegiatan Bidirectional Link
   * Property 8: Mandatory Disposisi for Linked Entities
   * Validates: Requirements 3.1, 4.1, 10.2, 10.3, 15.1, 15.2, 15.3
   * 
   * OPTIMIZATION: Uses atomic database transaction instead of manual rollback
   */
  async linkSuratToKegiatan(
    suratId: string,
    kegiatanId: string,
    disposisiData: {
      assignees: string[];
      disposisiText: string;
      deadline?: string;
      createdBy: string;
      currentUser?: any; // User object for authorization
    }
  ): Promise<string[]> {
    // Validate that both entities exist (Requirements 15.1, 15.2, 15.3)
    try {
      await validateLinkReferences(suratId, kegiatanId, this.supabase);
    } catch (error) {
      if (error instanceof ForeignKeyValidationError) {
        throw new ValidationError(`Tidak dapat menghubungkan: ${error.message}`);
      }
      throw error;
    }

    // Validate Disposisi is provided (Requirements 4.1, 4.2)
    if (!disposisiData.assignees || disposisiData.assignees.length === 0) {
      throw new ValidationError(
        ERROR_MESSAGES.NO_ASSIGNEES,
        'assignees'
      );
    }

    if (!disposisiData.disposisiText || disposisiData.disposisiText.trim() === '') {
      throw new ValidationError(
        ERROR_MESSAGES.EMPTY_DISPOSISI_TEXT,
        'disposisiText'
      );
    }

    try {
      // OPTIMIZATION: Use atomic database transaction
      // All operations succeed or fail together - no manual rollback needed!
      const { data, error } = await this.supabase.rpc('link_surat_to_kegiatan', {
        p_surat_id: suratId,
        p_kegiatan_id: kegiatanId,
        p_disposisi_data: {
          assignees: disposisiData.assignees,
          disposisiText: disposisiData.disposisiText,
          deadline: disposisiData.deadline || null,
          createdBy: disposisiData.createdBy,
        },
      });

      if (error) throw error;

      // Return array of created disposisi IDs
      return data?.map((row: any) => row.disposisi_id) || [];
    } catch (error) {
      console.error('Error linking Surat to Kegiatan:', error);
      throw error;
    }
  }

  /**
   * Unlink Surat from Kegiatan
   * Property 7: Link Preservation on Unlink
   * Validates: Requirements 3.5
   * 
   * OPTIMIZATION: Uses atomic database transaction
   */
  async unlinkSuratFromKegiatan(
    suratId: string,
    kegiatanId: string
  ): Promise<void> {
    try {
      // OPTIMIZATION: Use atomic database transaction
      const { error } = await this.supabase.rpc('unlink_surat_from_kegiatan', {
        p_surat_id: suratId,
        p_kegiatan_id: kegiatanId,
      });

      if (error) throw error;

      // Note: Disposisi records are automatically deleted by the function
      // Both Surat and Kegiatan entities are preserved
    } catch (error) {
      console.error('Error unlinking Surat from Kegiatan:', error);
      throw error;
    }
  }

  /**
   * Copy Surat metadata to Kegiatan
   * Property 6: Metadata Copying on Link
   * Validates: Requirements 3.2, 9.4
   */
  async copySuratMetadataToKegiatan(
    suratId: string,
    kegiatanId: string
  ): Promise<void> {
    try {
      // Fetch Surat data
      const { data: suratData, error: suratError } = await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('surats')
            .select('*')
            .eq('id', suratId)
            .single();
          
          if (result.error) throw result.error;
          if (!result.data) throw new ValidationError(ERROR_MESSAGES.SURAT_NOT_FOUND(suratId));
          return result;
        },
        'copySuratMetadataToKegiatan - fetch surat'
      );

      // Prepare metadata to copy
      const metadataUpdate: any = {
        jenis_surat: suratData.jenis_surat,
        nomor_surat: suratData.nomor_surat,
        tanggal_surat: suratData.tanggal_surat,
        hal: suratData.hal,
        asal_surat: suratData.asal_surat,
        tujuan_surat: suratData.tujuan_surat,
        klasifikasi_surat: suratData.klasifikasi_surat,
        jenis_naskah: suratData.jenis_naskah,
        bidang_tugas: suratData.bidang_tugas,
      };

      // Copy file attachment if exists
      if (suratData.file_surat) {
        metadataUpdate.surat_undangan = suratData.file_surat;
      }

      // Update Kegiatan with Surat metadata
      await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('meetings')
            .update(metadataUpdate)
            .eq('id', kegiatanId);
          
          if (result.error) throw result.error;
          return result;
        },
        'copySuratMetadataToKegiatan - update kegiatan'
      );
    } catch (error) {
      console.error('Error copying Surat metadata to Kegiatan:', error);
      throw error;
    }
  }

  /**
   * Validate link integrity
   * Property 35: Link Validation
   * Validates: Requirements 15.3
   */
  async validateLink(
    suratId: string,
    kegiatanId: string
  ): Promise<boolean> {
    try {
      // Check if Surat exists
      const { data: suratData, error: suratError } = await this.supabase
        .from('surats')
        .select('id')
        .eq('id', suratId)
        .single();

      if (suratError || !suratData) {
        return false;
      }

      // Check if Kegiatan exists
      const { data: kegiatanData, error: kegiatanError } = await this.supabase
        .from('meetings')
        .select('id')
        .eq('id', kegiatanId)
        .single();

      if (kegiatanError || !kegiatanData) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating link:', error);
      return false;
    }
  }
}

// Export singleton instance
export const linkingService = new LinkingService();
