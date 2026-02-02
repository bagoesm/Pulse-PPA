// src/hooks/useDisposisiOperations.ts
// Unified hook for Disposisi operations with optimistic updates
import { useState, useCallback } from 'react';
import { useDisposisi } from '../contexts/DisposisiContext';
import { Disposisi, DisposisiStatus, User } from '../../types';

interface UseDisposisiOperationsResult {
  isUpdating: boolean;
  isCreating: boolean;
  isDeleting: boolean;
  updateStatus: (disposisiId: string, status: DisposisiStatus) => Promise<void>;
  updateNotes: (disposisiId: string, notes: string) => Promise<void>;
  deleteDisposisi: (disposisiId: string) => Promise<void>;
  error: Error | null;
}

/**
 * Unified hook for Disposisi operations with optimistic updates
 * Eliminates inconsistent state management patterns
 */
export const useDisposisiOperations = (
  currentUser: User | null,
  onSuccess?: (message: string) => void,
  onError?: (error: Error) => void
): UseDisposisiOperationsResult => {
  const { disposisi, setDisposisi, updateDisposisi, deleteDisposisi: deleteDisposisiContext } = useDisposisi();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Update status with optimistic update
   */
  const updateStatus = useCallback(async (disposisiId: string, status: DisposisiStatus) => {
    if (!currentUser) {
      const err = new Error('User must be logged in');
      setError(err);
      onError?.(err);
      return;
    }

    setIsUpdating(true);
    setError(null);

    // Find current disposisi
    const currentDisposisi = disposisi.find(d => d.id === disposisiId);
    if (!currentDisposisi) {
      const err = new Error('Disposisi not found');
      setError(err);
      onError?.(err);
      setIsUpdating(false);
      return;
    }

    // OPTIMISTIC UPDATE: Update UI immediately
    const optimisticUpdate = {
      ...currentDisposisi,
      status,
      updatedAt: new Date().toISOString(),
      ...(status === 'Completed' && {
        completedAt: new Date().toISOString(),
        completedBy: currentUser.name,
      }),
    };

    setDisposisi(prev => prev.map(d => 
      d.id === disposisiId ? optimisticUpdate : d
    ));

    try {
      // Update in background
      await updateDisposisi(disposisiId, {
        status,
        updatedAt: new Date().toISOString(),
        ...(status === 'Completed' && {
          completedAt: new Date().toISOString(),
          completedBy: currentUser.name,
        }),
      });

      onSuccess?.('Status berhasil diupdate');
    } catch (err) {
      // ROLLBACK on error
      setDisposisi(prev => prev.map(d => 
        d.id === disposisiId ? currentDisposisi : d
      ));
      
      const error = err as Error;
      setError(error);
      onError?.(error);
    } finally {
      setIsUpdating(false);
    }
  }, [disposisi, currentUser, setDisposisi, updateDisposisi, onSuccess, onError]);

  /**
   * Update notes with optimistic update
   */
  const updateNotes = useCallback(async (disposisiId: string, notes: string) => {
    if (!currentUser) {
      const err = new Error('User must be logged in');
      setError(err);
      onError?.(err);
      return;
    }

    setIsUpdating(true);
    setError(null);

    const currentDisposisi = disposisi.find(d => d.id === disposisiId);
    if (!currentDisposisi) {
      const err = new Error('Disposisi not found');
      setError(err);
      onError?.(err);
      setIsUpdating(false);
      return;
    }

    // OPTIMISTIC UPDATE
    const optimisticUpdate = {
      ...currentDisposisi,
      notes,
      updatedAt: new Date().toISOString(),
    };

    setDisposisi(prev => prev.map(d => 
      d.id === disposisiId ? optimisticUpdate : d
    ));

    try {
      await updateDisposisi(disposisiId, {
        notes,
        updatedAt: new Date().toISOString(),
      });

      onSuccess?.('Catatan berhasil diupdate');
    } catch (err) {
      // ROLLBACK
      setDisposisi(prev => prev.map(d => 
        d.id === disposisiId ? currentDisposisi : d
      ));
      
      const error = err as Error;
      setError(error);
      onError?.(error);
    } finally {
      setIsUpdating(false);
    }
  }, [disposisi, currentUser, setDisposisi, updateDisposisi, onSuccess, onError]);

  /**
   * Delete disposisi with optimistic update
   */
  const deleteDisposisiOp = useCallback(async (disposisiId: string) => {
    if (!currentUser) {
      const err = new Error('User must be logged in');
      setError(err);
      onError?.(err);
      return;
    }

    setIsDeleting(true);
    setError(null);

    const currentDisposisi = disposisi.find(d => d.id === disposisiId);
    if (!currentDisposisi) {
      const err = new Error('Disposisi not found');
      setError(err);
      onError?.(err);
      setIsDeleting(false);
      return;
    }

    // OPTIMISTIC UPDATE: Remove from UI immediately
    setDisposisi(prev => prev.filter(d => d.id !== disposisiId));

    try {
      await deleteDisposisiContext(disposisiId);
      onSuccess?.('Disposisi berhasil dihapus');
    } catch (err) {
      // ROLLBACK: Restore disposisi
      setDisposisi(prev => [...prev, currentDisposisi].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      
      const error = err as Error;
      setError(error);
      onError?.(error);
    } finally {
      setIsDeleting(false);
    }
  }, [disposisi, currentUser, setDisposisi, deleteDisposisiContext, onSuccess, onError]);

  return {
    isUpdating,
    isCreating,
    isDeleting,
    updateStatus,
    updateNotes,
    deleteDisposisi: deleteDisposisiOp,
    error,
  };
};
