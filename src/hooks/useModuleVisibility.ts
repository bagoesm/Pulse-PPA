// src/hooks/useModuleVisibility.ts
// Hook to check if a module is visible to the current user based on their Satker (Division)
import { useState, useEffect, useCallback } from 'react';
import { User } from '../../types';
import { moduleVisibilityService } from '../services/ModuleVisibilityService';

export function useModuleVisibility(currentUser: User | null) {
  const [visibleModules, setVisibleModules] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchVisibility = useCallback(async () => {
    if (!currentUser) {
      setVisibleModules([]);
      setLoading(false);
      return;
    }

    // Super Admin sees all modules by default for administration and visibility control
    if (currentUser.role === 'Super Admin') {
      setVisibleModules([
        'Dashboard',
        'Semua Task',
        'Project',
        'Surat & Kegiatan',
        'Realisasi Anggaran',
        'Inventori Data',
        'Inventori BMN',
        'Pelayanan Zoom',
        'Manajemen Modul'
      ]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const modules = await moduleVisibilityService.getVisibleModulesForDivisi(currentUser.divisi);
      // 'Dashboard' is always visible to everyone
      setVisibleModules(['Dashboard', ...modules]);
    } catch (error) {
      console.error('Failed to load module visibility:', error);
      // Fallback in case of error: show standard modules, hide Pelayanan Zoom
      setVisibleModules([
        'Dashboard',
        'Semua Task',
        'Project',
        'Surat & Kegiatan',
        'Realisasi Anggaran',
        'Inventori Data',
        'Inventori BMN'
      ]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, currentUser?.divisi, currentUser?.role]);

  useEffect(() => {
    fetchVisibility();
  }, [fetchVisibility]);

  const isModuleVisible = useCallback(
    (moduleName: string): boolean => {
      if (loading) {
        // During loading, show standard items to prevent flashing, but hide restricted ones
        if (moduleName === 'Pelayanan Zoom' || moduleName === 'Manajemen Modul') {
          return false;
        }
        return true;
      }
      return visibleModules.includes(moduleName);
    },
    [visibleModules, loading]
  );

  return {
    isModuleVisible,
    visibleModules,
    loading,
    refreshVisibility: fetchVisibility
  };
}
