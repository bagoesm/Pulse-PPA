// src/hooks/useLoadingState.ts
// Unified loading state management with operation tracking
import { useState, useCallback } from 'react';

export type LoadingOperation = 
  | 'idle'
  | 'fetching'
  | 'saving'
  | 'deleting'
  | 'uploading'
  | 'linking'
  | 'unlinking'
  | 'creating';

interface LoadingState {
  operation: LoadingOperation;
  progress?: number;
  message?: string;
}

interface UseLoadingStateResult {
  loadingState: LoadingState;
  isLoading: boolean;
  startLoading: (operation: LoadingOperation, message?: string) => void;
  updateProgress: (progress: number) => void;
  stopLoading: () => void;
  withLoading: <T>(
    operation: LoadingOperation,
    fn: () => Promise<T>,
    message?: string
  ) => Promise<T>;
}

/**
 * Unified loading state hook
 * Eliminates multiple uncoordinated loading states
 * 
 * @example
 * const { loadingState, withLoading } = useLoadingState();
 * 
 * await withLoading('saving', async () => {
 *   await saveData();
 * }, 'Menyimpan data...');
 */
export const useLoadingState = (): UseLoadingStateResult => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    operation: 'idle',
  });

  const startLoading = useCallback((operation: LoadingOperation, message?: string) => {
    setLoadingState({
      operation,
      message,
      progress: undefined,
    });
  }, []);

  const updateProgress = useCallback((progress: number) => {
    setLoadingState(prev => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress)),
    }));
  }, []);

  const stopLoading = useCallback(() => {
    setLoadingState({
      operation: 'idle',
    });
  }, []);

  /**
   * Wrapper function that automatically manages loading state
   */
  const withLoading = useCallback(async <T,>(
    operation: LoadingOperation,
    fn: () => Promise<T>,
    message?: string
  ): Promise<T> => {
    startLoading(operation, message);
    try {
      const result = await fn();
      return result;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  const isLoading = loadingState.operation !== 'idle';

  return {
    loadingState,
    isLoading,
    startLoading,
    updateProgress,
    stopLoading,
    withLoading,
  };
};

/**
 * Get user-friendly loading message
 */
export const getLoadingMessage = (operation: LoadingOperation): string => {
  const messages: Record<LoadingOperation, string> = {
    idle: '',
    fetching: 'Memuat data...',
    saving: 'Menyimpan...',
    deleting: 'Menghapus...',
    uploading: 'Mengupload file...',
    linking: 'Menghubungkan...',
    unlinking: 'Memutuskan link...',
    creating: 'Membuat...',
  };
  return messages[operation];
};

/**
 * Get loading icon/spinner component based on operation
 */
export const getLoadingIcon = (operation: LoadingOperation): string => {
  const icons: Record<LoadingOperation, string> = {
    idle: '',
    fetching: '🔄',
    saving: '💾',
    deleting: '🗑️',
    uploading: '📤',
    linking: '🔗',
    unlinking: '🔓',
    creating: '✨',
  };
  return icons[operation];
};
