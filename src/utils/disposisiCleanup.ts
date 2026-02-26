// src/utils/disposisiCleanup.ts
// Utility functions for cleaning up Disposisi-related files

import { supabase } from '../lib/supabaseClient';
import { Disposisi, Attachment } from '../../types';

/**
 * Clean up Laporan files from storage when Disposisi is deleted
 * This function deletes all files associated with Laporan attachments
 */
export async function cleanupLaporanFiles(disposisi: Disposisi[]): Promise<void> {
  try {
    const filesToDelete: string[] = [];

    // Collect all file paths from laporan and attachments
    for (const disp of disposisi) {
      if (disp.laporan && disp.laporan.length > 0) {
        disp.laporan.forEach((attachment: Attachment) => {
          if (attachment.path) {
            filesToDelete.push(attachment.path);
          }
        });
      }

      if (disp.attachments && disp.attachments.length > 0) {
        disp.attachments.forEach((attachment: Attachment) => {
          if (attachment.path) {
            filesToDelete.push(attachment.path);
          }
        });
      }
    }

    // Delete files from storage if there are any
    if (filesToDelete.length > 0) {
      const { error } = await supabase.storage
        .from('attachment')
        .remove(filesToDelete);

      if (error) {
        console.error('Error deleting files from storage:', error);
        // Don't throw - we still want to proceed with deletion even if file cleanup fails
      } else {
        console.log(`Successfully deleted ${filesToDelete.length} files from storage`);
      }
    }
  } catch (error) {
    console.error('Error in cleanupLaporanFiles:', error);
    // Don't throw - we still want to proceed with deletion
  }
}

/**
 * Get all Disposisi related to a Surat
 */
export async function getDisposisiForSurat(suratId: string): Promise<Disposisi[]> {
  try {
    const { data, error } = await supabase
      .from('disposisi')
      .select('*')
      .eq('surat_id', suratId);

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      suratId: row.surat_id,
      kegiatanId: row.kegiatan_id,
      assignedTo: row.assigned_to,
      disposisiText: row.disposisi_text,
      status: row.status,
      deadline: row.deadline,
      laporan: row.laporan || [],
      attachments: row.attachments || [],
      notes: row.notes,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      completedBy: row.completed_by,
    }));
  } catch (error) {
    console.error('Error fetching disposisi for surat:', error);
    return [];
  }
}

/**
 * Get all Disposisi related to a Kegiatan/Meeting
 */
export async function getDisposisiForKegiatan(kegiatanId: string): Promise<Disposisi[]> {
  try {
    const { data, error } = await supabase
      .from('disposisi')
      .select('*')
      .eq('kegiatan_id', kegiatanId);

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      suratId: row.surat_id,
      kegiatanId: row.kegiatan_id,
      assignedTo: row.assigned_to,
      disposisiText: row.disposisi_text,
      status: row.status,
      deadline: row.deadline,
      laporan: row.laporan || [],
      attachments: row.attachments || [],
      notes: row.notes,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      completedBy: row.completed_by,
    }));
  } catch (error) {
    console.error('Error fetching disposisi for kegiatan:', error);
    return [];
  }
}

/**
 * Delete Surat with cascade deletion and file cleanup
 * This function:
 * 1. Fetches the Surat to get file_surat and meetingId
 * 2. Fetches all related Disposisi
 * 3. Cleans up Laporan files from Disposisi
 * 4. Cleans up Surat file from storage
 * 5. Manually deletes Disposisi records
 * 6. Deletes linked Kegiatan if exists
 * 7. Deletes the Surat
 */
export async function deleteSuratWithCleanup(suratId: string): Promise<void> {
  // Get the Surat to access file_surat and meetingId
  const { data: suratData, error: fetchError } = await supabase
    .from('surats')
    .select('file_surat, meeting_id')
    .eq('id', suratId);

  if (fetchError) throw fetchError;

  const surat = suratData?.[0];

  // Get all related Disposisi before deletion
  const relatedDisposisi = await getDisposisiForSurat(suratId);

  // Clean up Laporan files from Disposisi
  await cleanupLaporanFiles(relatedDisposisi);

  // Clean up Surat file from storage (if it's a file, not a link)
  if (surat?.file_surat && !surat.file_surat.isLink && surat.file_surat.path) {
    try {
      const { error: storageError } = await supabase.storage
        .from('attachment')
        .remove([surat.file_surat.path]);

      if (storageError) {
        console.error('Error deleting surat file from storage:', storageError);
        // Don't throw - we still want to proceed with deletion
      } else {
        console.log(`Successfully deleted surat file: ${surat.file_surat.path}`);
      }
    } catch (error) {
      console.error('Error in surat file cleanup:', error);
      // Don't throw - we still want to proceed with deletion
    }
  }

  // Manually delete all related Disposisi records
  if (relatedDisposisi.length > 0) {
    const { error: disposisiError } = await supabase
      .from('disposisi')
      .delete()
      .eq('surat_id', suratId);

    if (disposisiError) {
      console.error('Error deleting disposisi records:', disposisiError);
      throw disposisiError;
    }
  }

  // Unlink from Kegiatan if exists (preserve the meeting, only clear the reference)
  if (surat?.meeting_id) {
    try {
      // Clear linked_surat_id on the meeting so it's no longer linked
      const { error: unlinkError } = await supabase
        .from('meetings')
        .update({ linked_surat_id: null, updated_at: new Date().toISOString() })
        .eq('id', surat.meeting_id);

      if (unlinkError) {
        console.error('Error unlinking kegiatan from surat:', unlinkError);
        // Don't throw - we still want to proceed with surat deletion
      } else {
        console.log(`Successfully unlinked kegiatan: ${surat.meeting_id}`);
      }
    } catch (error) {
      console.error('Error in kegiatan unlink:', error);
      // Don't throw - we still want to proceed with surat deletion
    }
  }

  // Delete the Surat
  const { error } = await supabase
    .from('surats')
    .delete()
    .eq('id', suratId);

  if (error) throw error;
}

/**
 * Delete Kegiatan/Meeting with cascade deletion and file cleanup
 * This function:
 * 1. Fetches all related Disposisi
 * 2. Cleans up Laporan files
 * 3. Manually deletes Disposisi records
 * 4. Deletes the Kegiatan
 */
export async function deleteKegiatanWithCleanup(kegiatanId: string): Promise<void> {
  // Get all related Disposisi before deletion
  const relatedDisposisi = await getDisposisiForKegiatan(kegiatanId);

  // Clean up Laporan files
  await cleanupLaporanFiles(relatedDisposisi);

  // Manually delete all related Disposisi records
  if (relatedDisposisi.length > 0) {
    const { error: disposisiError } = await supabase
      .from('disposisi')
      .delete()
      .eq('kegiatan_id', kegiatanId);

    if (disposisiError) {
      console.error('Error deleting disposisi records:', disposisiError);
      throw disposisiError;
    }
  }

  // Delete the Kegiatan
  const { error } = await supabase
    .from('meetings')
    .delete()
    .eq('id', kegiatanId);

  if (error) throw error;
}

/**
 * Format Disposisi information for confirmation dialog
 */
export function formatDisposisiWarning(disposisi: Disposisi[]): string {
  if (disposisi.length === 0) {
    return '';
  }

  const statusCounts = disposisi.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusSummary = Object.entries(statusCounts)
    .map(([status, count]) => `${count} ${status}`)
    .join(', ');

  return `\n\nPeringatan: Terdapat ${disposisi.length} Disposisi terkait (${statusSummary}) yang akan dihapus beserta laporan dan lampiran.`;
}
