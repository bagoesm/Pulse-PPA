// src/hooks/useEpicHandlers.ts
// Handlers for Epic CRUD operations with permission checks
import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Epic, EpicStatus, User } from '../../types';

interface UseEpicHandlersProps {
    currentUser: User | null;
    epics: Epic[];
    setEpics: React.Dispatch<React.SetStateAction<Epic[]>>;
    editingEpic: Epic | null;
    setEditingEpic: (epic: Epic | null) => void;
    setIsEpicModalOpen: (open: boolean) => void;
    setProjectRefreshTrigger: (fn: (prev: number) => number) => void;
    showNotification: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const useEpicHandlers = ({
    currentUser,
    epics,
    setEpics,
    editingEpic,
    setEditingEpic,
    setIsEpicModalOpen,
    setProjectRefreshTrigger,
    showNotification
}: UseEpicHandlersProps) => {

    // Permission check: PIC, Atasan, or Super Admin can edit/delete
    const checkEpicEditPermission = useCallback((epic: Epic): boolean => {
        if (!currentUser) return false;

        // Super Admin or Atasan can always edit
        if (currentUser.role === 'Super Admin' || currentUser.role === 'Atasan') {
            return true;
        }

        // PIC of the epic can edit
        const epicPics = Array.isArray(epic.pic) ? epic.pic : [epic.pic];
        if (epicPics.includes(currentUser.name)) {
            return true;
        }

        // Creator can edit
        if (epic.createdBy === currentUser.name) {
            return true;
        }

        return false;
    }, [currentUser]);

    const checkEpicDeletePermission = useCallback((epic: Epic): boolean => {
        // Same as edit permission for deletion
        return checkEpicEditPermission(epic);
    }, [checkEpicEditPermission]);

    // Create Epic Handler
    const handleCreateEpic = useCallback((projectId?: string) => {
        setEditingEpic(null);
        setIsEpicModalOpen(true);
    }, [setEditingEpic, setIsEpicModalOpen]);

    // Edit Epic Handler
    const handleEditEpic = useCallback((epic: Epic) => {
        if (!checkEpicEditPermission(epic)) {
            showNotification(
                'Akses Ditolak',
                'Anda tidak memiliki izin untuk mengedit epic ini.',
                'warning'
            );
            return;
        }
        setEditingEpic(epic);
        setIsEpicModalOpen(true);
    }, [checkEpicEditPermission, setEditingEpic, setIsEpicModalOpen, showNotification]);

    // Save Epic Handler (Create or Update)
    const handleSaveEpic = useCallback(async (epicData: Epic) => {
        if (!currentUser) return;

        const isEditing = !!editingEpic;

        try {
            const dbData = {
                name: epicData.name,
                description: epicData.description || '',
                project_id: epicData.projectId,
                pic: Array.isArray(epicData.pic) ? epicData.pic : [],
                status: epicData.status || 'Not Started',
                start_date: epicData.startDate || null,
                target_date: epicData.targetDate || null,
                color: epicData.color || 'blue',
                icon: epicData.icon || 'Layers',
                created_by: isEditing ? epicData.createdBy : currentUser.name,
                updated_at: new Date().toISOString()
            };

            if (isEditing) {
                // Update existing epic
                const { error } = await supabase
                    .from('epics')
                    .update(dbData)
                    .eq('id', editingEpic.id);

                if (error) {
                    showNotification('Gagal Update Epic', error.message, 'error');
                    return;
                }

                setEpics(prev => prev.map(e =>
                    e.id === editingEpic.id
                        ? { ...e, ...epicData, updatedAt: dbData.updated_at }
                        : e
                ));
                showNotification('Epic Diperbarui!', `Epic "${epicData.name}" berhasil diperbarui.`, 'success');
            } else {
                // Create new epic
                const { data, error } = await supabase
                    .from('epics')
                    .insert([{
                        ...dbData,
                        created_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (error) {
                    showNotification('Gagal Membuat Epic', error.message, 'error');
                    return;
                }

                const newEpic: Epic = {
                    id: data.id,
                    name: data.name,
                    description: data.description || '',
                    projectId: data.project_id,
                    pic: Array.isArray(data.pic) ? data.pic : [],
                    status: data.status as EpicStatus,
                    startDate: data.start_date || '',
                    targetDate: data.target_date || '',
                    color: data.color || 'blue',
                    icon: data.icon || 'Layers',
                    createdBy: data.created_by || '',
                    createdAt: data.created_at || '',
                    updatedAt: data.updated_at
                };

                setEpics(prev => [newEpic, ...prev]);
                showNotification('Epic Dibuat!', `Epic "${epicData.name}" berhasil dibuat.`, 'success');
            }

            setProjectRefreshTrigger(prev => prev + 1);
            setIsEpicModalOpen(false);
            setEditingEpic(null);
        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [currentUser, editingEpic, setEpics, setEditingEpic, setIsEpicModalOpen, setProjectRefreshTrigger, showNotification]);

    // Delete Epic Handler
    const handleDeleteEpic = useCallback(async (epicId: string, onConfirm?: () => void) => {
        const epic = epics.find(e => e.id === epicId);
        if (!epic) return;

        if (!checkEpicDeletePermission(epic)) {
            showNotification(
                'Akses Ditolak',
                'Anda tidak memiliki izin untuk menghapus epic ini.',
                'warning'
            );
            return;
        }

        // Call confirm callback if provided (for showing confirm modal)
        if (onConfirm) {
            onConfirm();
            return;
        }

        try {
            const { error } = await supabase
                .from('epics')
                .delete()
                .eq('id', epicId);

            if (error) {
                showNotification('Gagal Hapus Epic', error.message, 'error');
                return;
            }

            setEpics(prev => prev.filter(e => e.id !== epicId));
            setProjectRefreshTrigger(prev => prev + 1);
            showNotification('Epic Dihapus!', `Epic "${epic.name}" berhasil dihapus.`, 'success');
        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [epics, checkEpicDeletePermission, setEpics, setProjectRefreshTrigger, showNotification]);

    // Confirm and Delete Epic
    const confirmDeleteEpic = useCallback(async (epicId: string) => {
        const epic = epics.find(e => e.id === epicId);
        if (!epic) return;

        try {
            const { error } = await supabase
                .from('epics')
                .delete()
                .eq('id', epicId);

            if (error) {
                showNotification('Gagal Hapus Epic', error.message, 'error');
                return;
            }

            setEpics(prev => prev.filter(e => e.id !== epicId));
            setProjectRefreshTrigger(prev => prev + 1);
            showNotification('Epic Dihapus!', `Epic "${epic.name}" berhasil dihapus.`, 'success');
        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [epics, setEpics, setProjectRefreshTrigger, showNotification]);

    return {
        checkEpicEditPermission,
        checkEpicDeletePermission,
        handleCreateEpic,
        handleEditEpic,
        handleSaveEpic,
        handleDeleteEpic,
        confirmDeleteEpic
    };
};

export default useEpicHandlers;
