// src/contexts/DisposisiContext.tsx
// Domain context for Disposisi (Disposition workflow)
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Disposisi, Attachment, User } from '../../types';
import { filterDisposisiByRole, getTeamUserIds } from '../utils/authorization';
import { useAuth } from './AuthContext';
import { mappers } from '../utils/mappers';
import { NotificationService } from '../services/NotificationService';
import {
  ValidationError,
  DatabaseError,
  FileUploadError,
  handleDatabaseOperation,
  handleFileUploadError,
  formatErrorForUser,
  ERROR_MESSAGES,
} from '../utils/errorHandling';

interface DisposisiContextType {
  disposisi: Disposisi[];
  myDisposisi: Disposisi[];          // Disposisi assigned to current user
  teamDisposisi: Disposisi[];        // Disposisi for team (Atasan role)
  setDisposisi: React.Dispatch<React.SetStateAction<Disposisi[]>>;
  isLoading: boolean;
  fetchDisposisi: () => Promise<void>;
  fetchMyDisposisi: (userId: string) => Promise<void>;
  fetchTeamDisposisi: (teamUserIds: string[]) => Promise<void>;
  fetchSubdisposisi: (parentId: string) => Promise<Disposisi[]>;
  createDisposisi: (data: Omit<Disposisi, 'id' | 'createdAt'>) => Promise<Disposisi>;
  createSubdisposisi: (parentId: string, data: Omit<Disposisi, 'id' | 'createdAt' | 'parentDisposisiId'>) => Promise<Disposisi>;
  updateDisposisi: (id: string, data: Partial<Disposisi>) => Promise<void>;
  deleteDisposisi: (id: string) => Promise<void>;
  uploadLaporan: (disposisiId: string, file: File) => Promise<void>;
  deleteLaporan: (disposisiId: string, attachmentId: string) => Promise<void>;
  clearDisposisi: () => void;
}

const DisposisiContext = createContext<DisposisiContextType | undefined>(undefined);

export const useDisposisi = () => {
  const context = useContext(DisposisiContext);
  if (!context) {
    throw new Error('useDisposisi must be used within a DisposisiProvider');
  }
  return context;
};

interface DisposisiProviderProps {
  children: ReactNode;
  session: any;
}

export const DisposisiProvider: React.FC<DisposisiProviderProps> = ({ children, session }) => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [disposisi, setDisposisi] = useState<Disposisi[]>([]);
  const [myDisposisi, setMyDisposisi] = useState<Disposisi[]>([]);
  const [teamDisposisi, setTeamDisposisi] = useState<Disposisi[]>([]);

  // Use centralized mapper - OPTIMIZATION: Eliminates duplicate mapping logic
  const mapDisposisiFromDB = mappers.disposisi;

  // Fetch all disposisi (with role-based filtering)
  const fetchDisposisi = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('disposisi')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mapped = data.map(mapDisposisiFromDB);
        
        // Show all disposisi without filtering
        setDisposisi(mapped);
        
        // Also populate myDisposisi and teamDisposisi for other views
        if (currentUser) {
          const myDisp = mapped.filter(d => d.assignedTo === currentUser.id);
          setMyDisposisi(myDisp);
          
          // Get team user IDs for teamDisposisi
          const teamUserIds = await getTeamUserIds(supabase, currentUser);
          if (teamUserIds.length > 0) {
            const teamDisp = mapped.filter(d => teamUserIds.includes(d.assignedTo));
            setTeamDisposisi(teamDisp);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching disposisi:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Fetch disposisi assigned to current user
  const fetchMyDisposisi = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('disposisi')
        .select('*')
        .eq('assigned_to', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mapped = data.map(mapDisposisiFromDB);
        setMyDisposisi(mapped);
      }
    } catch (error) {
      console.error('Error fetching my disposisi:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch disposisi for team (Atasan role)
  const fetchTeamDisposisi = useCallback(async (teamUserIds: string[]) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('disposisi')
        .select('*')
        .in('assigned_to', teamUserIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mapped = data.map(mapDisposisiFromDB);
        setTeamDisposisi(mapped);
      }
    } catch (error) {
      console.error('Error fetching team disposisi:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new disposisi (with authorization check)
  const createDisposisi = useCallback(async (data: Omit<Disposisi, 'id' | 'createdAt'>): Promise<Disposisi> => {
    try {
      // Authorization is checked in DisposisiService.createMultiUserDisposisi
      // For direct creation, we check here
      if (!currentUser) {
        throw new Error('You must be logged in to create Disposisi');
      }

      if (currentUser.role !== 'Atasan' && currentUser.role !== 'Super Admin') {
        throw new Error('You do not have permission to create Disposisi. Only Atasan or Super Admin can create Disposisi.');
      }

      const insertData = {
        surat_id: data.suratId,
        kegiatan_id: data.kegiatanId,
        assigned_to: data.assignedTo,
        disposisi_text: data.disposisiText,
        status: data.status || 'Pending',
        deadline: data.deadline,
        laporan: data.laporan || [],
        attachments: data.attachments || [],
        notes: data.notes,
        created_by: data.createdBy,
        updated_at: data.updatedAt,
        completed_at: data.completedAt,
        completed_by: data.completedBy,
        parent_disposisi_id: data.parentDisposisiId,
      };

      const { data: inserted, error } = await supabase
        .from('disposisi')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      const newDisposisi = mapDisposisiFromDB(inserted);
      setDisposisi(prev => [newDisposisi, ...prev]);
      
      return newDisposisi;
    } catch (error) {
      console.error('Error creating disposisi:', error);
      throw error;
    }
  }, [currentUser]);

  // Fetch subdisposisi by parent ID
  const fetchSubdisposisi = useCallback(async (parentId: string): Promise<Disposisi[]> => {
    try {
      const { data, error } = await supabase
        .from('disposisi')
        .select('*')
        .eq('parent_disposisi_id', parentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        return data.map(mapDisposisiFromDB);
      }

      return [];
    } catch (error) {
      console.error('Error fetching subdisposisi:', error);
      throw error;
    }
  }, []);

  // Create subdisposisi (disposisi lanjutan)
  const createSubdisposisi = useCallback(async (
    parentId: string,
    data: Omit<Disposisi, 'id' | 'createdAt' | 'parentDisposisiId'>
  ): Promise<Disposisi> => {
    try {
      if (!currentUser) {
        throw new Error('You must be logged in to create Subdisposisi');
      }

      // Get parent disposisi to verify it exists
      const { data: parentData, error: parentError } = await supabase
        .from('disposisi')
        .select('*')
        .eq('id', parentId)
        .single();

      if (parentError) throw new Error('Parent disposisi not found');

      const parentDisposisi = mapDisposisiFromDB(parentData);

      // Authorization: Only assignee of parent, Atasan, or Super Admin can create subdisposisi
      const canCreate =
        currentUser.role === 'Super Admin' ||
        currentUser.role === 'Atasan' ||
        currentUser.id === parentDisposisi.assignedTo;

      if (!canCreate) {
        throw new Error('You do not have permission to create Subdisposisi. Only the assignee, Atasan, or Super Admin can create Subdisposisi.');
      }

      // Record old assignee in audit trail BEFORE updating
      const oldAssignee = parentDisposisi.assignedTo;
      const oldDisposisiText = parentDisposisi.disposisiText;
      const oldDeadline = parentDisposisi.deadline;
      
      // Create audit trail for reassignment (disposisi lanjutan)
      await supabase
        .from('disposisi_history')
        .insert({
          disposisi_id: parentId,
          action: 'reassigned',
          old_value: oldAssignee,
          new_value: data.assignedTo,
          performed_by: currentUser.id || currentUser.name,
          performed_at: new Date().toISOString(),
        });

      // Record disposisi text change if different
      if (data.disposisiText !== oldDisposisiText) {
        await supabase
          .from('disposisi_history')
          .insert({
            disposisi_id: parentId,
            action: 'text_updated',
            old_value: oldDisposisiText,
            new_value: data.disposisiText,
            performed_by: currentUser.id || currentUser.name,
            performed_at: new Date().toISOString(),
          });
      }

      // Record deadline change if different
      if (data.deadline !== oldDeadline) {
        await supabase
          .from('disposisi_history')
          .insert({
            disposisi_id: parentId,
            action: 'deadline_changed',
            old_value: oldDeadline || 'No deadline',
            new_value: data.deadline || 'No deadline',
            performed_by: currentUser.id || currentUser.name,
            performed_at: new Date().toISOString(),
          });
      }

      // Update the existing disposisi with new assignee and data
      const updateData = {
        assigned_to: data.assignedTo,
        disposisi_text: data.disposisiText,
        deadline: data.deadline,
        notes: data.notes,
        updated_at: new Date().toISOString(),
      };

      const { data: updated, error: updateError } = await supabase
        .from('disposisi')
        .update(updateData)
        .eq('id', parentId)
        .select()
        .single();

      if (updateError) throw updateError;

      const updatedDisposisi = mapDisposisiFromDB(updated);
      
      // Update local state
      setDisposisi(prev => prev.map(d => d.id === parentId ? updatedDisposisi : d));

      // Create notification for new assignee (optional - can be handled by NotificationService)
      try {
        await NotificationService.createDisposisiAssignmentNotification(
          updatedDisposisi,
          currentUser.name || 'System',
          parentDisposisi.suratId,
          parentDisposisi.kegiatanId
        );
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
        // Don't throw - notification failure shouldn't block the operation
      }

      return updatedDisposisi;
    } catch (error) {
      console.error('Error creating subdisposisi:', error);
      throw error;
    }
  }, [currentUser]);

  // Update disposisi (with authorization check)
  const updateDisposisi = useCallback(async (id: string, data: Partial<Disposisi>) => {
    try {
      // Get current disposisi to check permissions
      const { data: currentData, error: fetchError } = await supabase
        .from('disposisi')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const currentDisposisi = mapDisposisiFromDB(currentData);

      // Authorization check
      if (!currentUser) {
        throw new Error('You must be logged in to update Disposisi');
      }

      const canUpdate = 
        currentUser.role === 'Super Admin' ||
        currentUser.id === currentDisposisi.createdBy ||
        currentUser.name === currentDisposisi.createdBy ||
        currentUser.id === currentDisposisi.assignedTo;

      if (!canUpdate) {
        throw new Error('You do not have permission to update this Disposisi');
      }

      const updateData: any = {};
      
      if (data.suratId !== undefined) updateData.surat_id = data.suratId;
      if (data.kegiatanId !== undefined) updateData.kegiatan_id = data.kegiatanId;
      if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo;
      if (data.disposisiText !== undefined) updateData.disposisi_text = data.disposisiText;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.deadline !== undefined) updateData.deadline = data.deadline;
      if (data.laporan !== undefined) updateData.laporan = data.laporan;
      if (data.attachments !== undefined) updateData.attachments = data.attachments;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.updatedAt !== undefined) updateData.updated_at = data.updatedAt;
      if (data.completedAt !== undefined) updateData.completed_at = data.completedAt;
      if (data.completedBy !== undefined) updateData.completed_by = data.completedBy;

      const { error } = await supabase
        .from('disposisi')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setDisposisi(prev => prev.map(d => 
        d.id === id ? { ...d, ...data } : d
      ));
      setMyDisposisi(prev => prev.map(d => 
        d.id === id ? { ...d, ...data } : d
      ));
      setTeamDisposisi(prev => prev.map(d => 
        d.id === id ? { ...d, ...data } : d
      ));
    } catch (error) {
      console.error('Error updating disposisi:', error);
      throw error;
    }
  }, [currentUser]);

  // Delete disposisi (with authorization check)
  const deleteDisposisi = useCallback(async (id: string) => {
    try {
      // Get current disposisi to check permissions
      const { data: currentData, error: fetchError } = await supabase
        .from('disposisi')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const currentDisposisi = mapDisposisiFromDB(currentData);

      // Authorization check: Only creator or Super Admin can delete
      if (!currentUser) {
        throw new Error('You must be logged in to delete Disposisi');
      }

      const canDelete = 
        currentUser.role === 'Super Admin' ||
        currentUser.id === currentDisposisi.createdBy ||
        currentUser.name === currentDisposisi.createdBy;

      if (!canDelete) {
        throw new Error('You do not have permission to delete this Disposisi. Only the creator or Super Admin can delete Disposisi.');
      }

      // Clean up Laporan files before deletion
      const { cleanupLaporanFiles } = await import('../utils/disposisiCleanup');
      await cleanupLaporanFiles([currentDisposisi]);

      const { error } = await supabase
        .from('disposisi')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setDisposisi(prev => prev.filter(d => d.id !== id));
      setMyDisposisi(prev => prev.filter(d => d.id !== id));
      setTeamDisposisi(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error('Error deleting disposisi:', error);
      throw error;
    }
  }, [currentUser]);

  // Upload laporan file
  const uploadLaporan = useCallback(async (disposisiId: string, file: File) => {
    let uploadedFilePath: string | null = null;

    try {
      if (!currentUser) {
        throw new ValidationError(ERROR_MESSAGES.LOGIN_REQUIRED);
      }

      // Validate file size (max 10MB)
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        throw new FileUploadError(
          ERROR_MESSAGES.FILE_TOO_LARGE(10),
          file.name
        );
      }

      // Validate file type
      const ALLOWED_FILE_TYPES = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/jpg',
        'image/png',
      ];

      const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!ALLOWED_FILE_TYPES.includes(file.type) && !ALLOWED_FILE_EXTENSIONS.includes(fileExt)) {
        throw new FileUploadError(
          ERROR_MESSAGES.INVALID_FILE_TYPE(ALLOWED_FILE_EXTENSIONS),
          file.name
        );
      }

      // Upload file to Supabase Storage
      const fileName = `${disposisiId}_${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = `laporan/${fileName}`;
      uploadedFilePath = filePath;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) {
        throw new FileUploadError(
          uploadError.message || ERROR_MESSAGES.FILE_UPLOAD_FAILED,
          file.name
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('attachments')
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
          const result = await supabase
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
          const result = await supabase
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
      await supabase
        .from('disposisi_history')
        .insert({
          disposisi_id: disposisiId,
          action: 'laporan_uploaded',
          new_value: file.name,
          performed_by: currentUser.id || currentUser.name,
          performed_at: new Date().toISOString(),
        });

      // Update local state
      setDisposisi(prev => prev.map(d => 
        d.id === disposisiId ? { ...d, laporan: updatedLaporan } : d
      ));
      setMyDisposisi(prev => prev.map(d => 
        d.id === disposisiId ? { ...d, laporan: updatedLaporan } : d
      ));
      setTeamDisposisi(prev => prev.map(d => 
        d.id === disposisiId ? { ...d, laporan: updatedLaporan } : d
      ));
    } catch (error) {
      console.error('Error uploading laporan:', error);
      
      // Cleanup uploaded file on error
      if (uploadedFilePath) {
        await handleFileUploadError(
          error,
          uploadedFilePath,
          async (path) => {
            await supabase.storage.from('attachments').remove([path]);
          }
        );
      }
      
      throw error;
    }
  }, [currentUser]);

  // Delete laporan file
  const deleteLaporan = useCallback(async (disposisiId: string, attachmentId: string) => {
    try {
      if (!currentUser) {
        throw new Error('You must be logged in to delete laporan');
      }

      // Get current disposisi
      const { data: currentDisposisi, error: fetchError } = await supabase
        .from('disposisi')
        .select('laporan')
        .eq('id', disposisiId)
        .single();

      if (fetchError) throw fetchError;

      const currentLaporan = currentDisposisi?.laporan || [];
      const attachmentToDelete = currentLaporan.find((a: Attachment) => a.id === attachmentId);

      if (attachmentToDelete) {
        // Delete file from storage
        const { error: deleteError } = await supabase.storage
          .from('attachments')
          .remove([attachmentToDelete.path]);

        if (deleteError) throw deleteError;
      }

      // Update disposisi without the deleted laporan
      const updatedLaporan = currentLaporan.filter((a: Attachment) => a.id !== attachmentId);
      const { error: updateError } = await supabase
        .from('disposisi')
        .update({ 
          laporan: updatedLaporan,
          updated_at: new Date().toISOString()
        })
        .eq('id', disposisiId);

      if (updateError) throw updateError;

      // Create audit trail for laporan deletion
      await supabase
        .from('disposisi_history')
        .insert({
          disposisi_id: disposisiId,
          action: 'laporan_deleted',
          old_value: attachmentToDelete?.name,
          performed_by: currentUser.id || currentUser.name,
          performed_at: new Date().toISOString(),
        });

      // Update local state
      setDisposisi(prev => prev.map(d => 
        d.id === disposisiId ? { ...d, laporan: updatedLaporan } : d
      ));
      setMyDisposisi(prev => prev.map(d => 
        d.id === disposisiId ? { ...d, laporan: updatedLaporan } : d
      ));
      setTeamDisposisi(prev => prev.map(d => 
        d.id === disposisiId ? { ...d, laporan: updatedLaporan } : d
      ));
    } catch (error) {
      console.error('Error deleting laporan:', error);
      throw error;
    }
  }, [currentUser]);

  const clearDisposisi = useCallback(() => {
    setDisposisi([]);
    setMyDisposisi([]);
    setTeamDisposisi([]);
  }, []);

  useEffect(() => {
    if (session && currentUser) {
      fetchDisposisi();
    } else {
      clearDisposisi();
    }
  }, [session, currentUser, fetchDisposisi, clearDisposisi]);

  const value: DisposisiContextType = {
    disposisi,
    myDisposisi,
    teamDisposisi,
    setDisposisi,
    isLoading,
    fetchDisposisi,
    fetchMyDisposisi,
    fetchTeamDisposisi,
    fetchSubdisposisi,
    createDisposisi,
    createSubdisposisi,
    updateDisposisi,
    deleteDisposisi,
    uploadLaporan,
    deleteLaporan,
    clearDisposisi,
  };

  return (
    <DisposisiContext.Provider value={value}>
      {children}
    </DisposisiContext.Provider>
  );
};

export default DisposisiContext;
