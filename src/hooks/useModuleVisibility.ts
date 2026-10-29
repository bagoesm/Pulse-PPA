// src/hooks/useModuleVisibility.ts
// Hook to check if a module is visible to the current user based on their Satker (Division)
import { useState, useEffect, useCallback } from 'react';
import { User } from '../../types';
import { moduleVisibilityService } from '../services/ModuleVisibilityService';
import { attendanceService } from '../services/AttendanceService';
import { isMenteriOrWakilMenteri } from '../utils/authorization';

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
        'Monitoring Capaian',
        'Dashboard',
        'Semua Task',
        'Project',
        'Scrum Board',
        'Diskusi & Chat',
        'Surat & Kegiatan',
        'Realisasi Anggaran',
        'Inventori Data',
        'Inventori BMN',
        'Pelayanan Zoom',
        'Penilaian Arsip',
        'Laporan WFA',
        'Laporan Absensi',
        'Absensi Saya',
        'Pengumuman',
        'Saran Masukan',
        'Analitik',
        'Manajemen Modul'
      ]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [modules, isAttendanceEditor] = await Promise.all([
        moduleVisibilityService.getVisibleModulesForDivisi(currentUser.divisi),
        attendanceService.checkIsAttendanceEditor(currentUser.id, currentUser.divisi || '')
      ]);
      
      let finalModules = [...modules];
      // Filter out 'Laporan Absensi' for regular staff by default unless designated editor
      finalModules = finalModules.filter((m) => m !== 'Laporan Absensi');
      
      if (isAttendanceEditor && !finalModules.includes('Laporan Absensi')) {
        finalModules.push('Laporan Absensi');
      }

      setVisibleModules(finalModules);
    } catch (error) {
      console.error('Failed to load module visibility:', error);
      // Fallback in case of error
      if (isMenteriOrWakilMenteri(currentUser)) {
        setVisibleModules(['Monitoring Capaian']);
      } else {
        const fallbackModules = [
          'Monitoring Capaian',
          'Dashboard',
          'Semua Task',
          'Project',
          'Surat & Kegiatan',
          'Realisasi Anggaran',
          'Inventori Data',
          'Inventori BMN',
          'Penilaian Arsip',
          'Laporan WFA',
          'Absensi Saya',
          'Diskusi & Chat',
          'Pengumuman',
          'Saran Masukan',
          'Analitik'
        ];
        if (currentUser?.divisi === 'Biro Data dan Informasi') {
          fallbackModules.push('Scrum Board');
        }
        setVisibleModules(fallbackModules);
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, currentUser?.divisi, currentUser?.role, currentUser?.jabatan, currentUser?.name]);

  useEffect(() => {
    fetchVisibility();
  }, [fetchVisibility]);

  const isModuleVisible = useCallback(
    (moduleName: string): boolean => {
      if (currentUser?.role === 'Super Admin') return true;
      if (loading) {
        if (isMenteriOrWakilMenteri(currentUser)) {
          return moduleName === 'Monitoring Capaian';
        }
        // During loading, show standard items to prevent flashing, but hide restricted ones
        if (moduleName === 'Pelayanan Zoom' || moduleName === 'Manajemen Modul' || moduleName === 'Laporan Absensi' || moduleName === 'Scrum Board') {
          return false;
        }
        return true;
      }
      return visibleModules.includes(moduleName);
    },
    [visibleModules, loading, currentUser]
  );

  return {
    isModuleVisible,
    visibleModules,
    loading,
    refreshVisibility: fetchVisibility
  };
}
