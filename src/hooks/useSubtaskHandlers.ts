// src/hooks/useSubtaskHandlers.ts
// Handlers for Subtask CRUD with permission checks + status propagation
import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Subtask, Task, User, Status, MAX_SUBTASKS_PER_TASK } from '../../types';

interface UseSubtaskHandlersProps {
    currentUser: User | null;
    subtasks: Subtask[];
    setSubtasks: React.Dispatch<React.SetStateAction<Subtask[]>>;
    tasks: Task[];
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    showNotification: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    showConfirm: (
        title: string,
        message: string,
        onConfirm: () => void,
        type?: 'success' | 'error' | 'warning' | 'info',
        confirmText?: string,
        cancelText?: string
    ) => void;
    showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const useSubtaskHandlers = ({
    currentUser,
    subtasks,
    setSubtasks,
    tasks,
    setTasks,
    showNotification,
    showConfirm,
    showToast
}: UseSubtaskHandlersProps) => {

    // Permission: check if user can manage subtasks for a parent task
    const checkSubtaskPermission = useCallback((parentTask: Task): boolean => {
        if (!currentUser) return false;
        // Super Admin & Atasan can always manage
        if (currentUser.role === 'Super Admin' || currentUser.role === 'Atasan') return true;
        // PIC of parent task
        if (parentTask.pic.includes(currentUser.name)) return true;
        // Creator of parent task
        if (parentTask.createdBy === currentUser.name) return true;
        return false;
    }, [currentUser]);

    // Permission: check if user can edit a specific subtask
    const checkSubtaskEditPermission = useCallback((subtask: Subtask, parentTask?: Task): boolean => {
        if (!currentUser) return false;
        if (currentUser.role === 'Super Admin' || currentUser.role === 'Atasan') return true;
        // PIC of subtask
        if (subtask.pic.includes(currentUser.name)) return true;
        // Creator of subtask
        if (subtask.createdBy === currentUser.name) return true;
        // PIC of parent task
        if (parentTask && parentTask.pic.includes(currentUser.name)) return true;
        return false;
    }, [currentUser]);

    // Create subtask
    const handleCreateSubtask = useCallback(async (subtaskData: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (!currentUser) return;

        // Check max limit
        const existingCount = subtasks.filter(s => s.parentTaskId === subtaskData.parentTaskId).length;
        if (existingCount >= MAX_SUBTASKS_PER_TASK) {
            showNotification(
                'Batas Maksimum',
                `Maksimal ${MAX_SUBTASKS_PER_TASK} subtask per task.`,
                'warning'
            );
            return;
        }

        try {
            const dbData = {
                parent_task_id: subtaskData.parentTaskId,
                title: subtaskData.title,
                description: subtaskData.description || '',
                pic: Array.isArray(subtaskData.pic) ? subtaskData.pic : [],
                priority: subtaskData.priority || 'Medium',
                status: subtaskData.status || 'To Do',
                start_date: subtaskData.startDate || null,
                deadline: subtaskData.deadline || null,
                attachments: subtaskData.attachments || [],
                checklists: subtaskData.checklists || [],
                sort_order: existingCount, // append at the end
                created_by: currentUser.name,
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('subtasks')
                .insert([dbData])
                .select()
                .single();

            if (error) {
                showNotification('Gagal Membuat Subtask', error.message, 'error');
                return;
            }

            const newSubtask: Subtask = {
                id: data.id,
                parentTaskId: data.parent_task_id,
                title: data.title,
                description: data.description || '',
                pic: Array.isArray(data.pic) ? data.pic : [],
                priority: data.priority,
                status: data.status,
                startDate: data.start_date || undefined,
                deadline: data.deadline || undefined,
                attachments: data.attachments || [],
                checklists: data.checklists || [],
                sortOrder: data.sort_order || 0,
                createdBy: data.created_by || '',
                createdAt: data.created_at || '',
                updatedAt: data.updated_at || undefined
            };

            setSubtasks(prev => [...prev, newSubtask]);
            showToast(`Subtask "${subtaskData.title}" berhasil dibuat.`, 'success');

            // Check for parent status propagation: if parent is To Do and subtask is In Progress
            propagateStatusUp(subtaskData.parentTaskId, [...subtasks, newSubtask]);

        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [currentUser, subtasks, setSubtasks, showNotification]);

    // Update subtask
    const handleUpdateSubtask = useCallback(async (subtaskId: string, updates: Partial<Subtask>) => {
        if (!currentUser) return;

        try {
            const dbUpdates: any = {
                updated_at: new Date().toISOString()
            };
            if (updates.title !== undefined) dbUpdates.title = updates.title;
            if (updates.description !== undefined) dbUpdates.description = updates.description;
            if (updates.pic !== undefined) dbUpdates.pic = updates.pic;
            if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
            if (updates.status !== undefined) dbUpdates.status = updates.status;
            if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
            if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
            if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments;
            if (updates.checklists !== undefined) dbUpdates.checklists = updates.checklists;
            if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

            const { error } = await supabase
                .from('subtasks')
                .update(dbUpdates)
                .eq('id', subtaskId);

            if (error) {
                showNotification('Gagal Update Subtask', error.message, 'error');
                return;
            }

            setSubtasks(prev => prev.map(s =>
                s.id === subtaskId
                    ? { ...s, ...updates, updatedAt: dbUpdates.updated_at }
                    : s
            ));

            // Status propagation after update
            const updatedSubtask = subtasks.find(s => s.id === subtaskId);
            if (updatedSubtask && updates.status !== undefined) {
                const newSubtasksList = subtasks.map(s =>
                    s.id === subtaskId ? { ...s, ...updates } : s
                );
                propagateStatusUp(updatedSubtask.parentTaskId, newSubtasksList);
            }

        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [currentUser, subtasks, setSubtasks, showNotification, showToast]);

    // Quick status toggle (for checkbox-like behavior)
    const handleToggleSubtaskStatus = useCallback(async (subtaskId: string) => {
        const subtask = subtasks.find(s => s.id === subtaskId);
        if (!subtask) return;

        const newStatus = subtask.status === Status.Done ? Status.ToDo : Status.Done;
        await handleUpdateSubtask(subtaskId, { status: newStatus });
    }, [subtasks, handleUpdateSubtask]);

    // Delete subtask
    const handleDeleteSubtask = useCallback(async (subtaskId: string) => {
        const subtask = subtasks.find(s => s.id === subtaskId);
        if (!subtask) return;

        try {
            const { error } = await supabase
                .from('subtasks')
                .delete()
                .eq('id', subtaskId);

            if (error) {
                showNotification('Gagal Hapus Subtask', error.message, 'error');
                return;
            }

            const newList = subtasks.filter(s => s.id !== subtaskId);
            setSubtasks(newList);
            showToast(`Subtask "${subtask.title}" berhasil dihapus.`, 'success');

            // Re-check propagation after delete
            propagateStatusUp(subtask.parentTaskId, newList);

        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [subtasks, setSubtasks, showNotification, showToast]);

    // Status propagation: Bottom-Up (subtasks -> parent task)
    const propagateStatusUp = useCallback((parentTaskId: string, currentSubtasks: Subtask[]) => {
        const parentSubtasks = currentSubtasks.filter(s => s.parentTaskId === parentTaskId);
        if (parentSubtasks.length === 0) return;

        const parentTask = tasks.find(t => t.id === parentTaskId);
        if (!parentTask) return;

        const allDone = parentSubtasks.every(s => s.status === Status.Done);
        const anyInProgress = parentSubtasks.some(s =>
            s.status === Status.InProgress || s.status === Status.Review
        );

        if (allDone && parentTask.status !== Status.Done) {
            // All subtasks done → prompt user to mark parent as Done
            showConfirm(
                'Semua Subtask Selesai',
                `Semua subtask untuk "${parentTask.title}" telah selesai. Tandai parent task sebagai Done?`,
                async () => {
                    try {
                        await supabase
                            .from('tasks')
                            .update({ status: 'Done', updated_at: new Date().toISOString() })
                            .eq('id', parentTaskId);

                        setTasks(prev => prev.map(t =>
                            t.id === parentTaskId ? { ...t, status: Status.Done } : t
                        ));
                    } catch (err: any) {
                        console.error('Error propagating status:', err);
                    }
                },
                'success',
                'Ya, Tandai Done',
                'Tidak, Biarkan'
            );
        } else if (anyInProgress && parentTask.status === Status.ToDo) {
            // Auto-move parent to In Progress if any subtask is In Progress
            (async () => {
                try {
                    await supabase
                        .from('tasks')
                        .update({ status: 'In Progress', updated_at: new Date().toISOString() })
                        .eq('id', parentTaskId);

                    setTasks(prev => prev.map(t =>
                        t.id === parentTaskId ? { ...t, status: Status.InProgress } : t
                    ));
                } catch (err: any) {
                    console.error('Error auto-updating parent status:', err);
                }
            })();
        }
    }, [tasks, setTasks, showConfirm]);

    return {
        checkSubtaskPermission,
        checkSubtaskEditPermission,
        handleCreateSubtask,
        handleUpdateSubtask,
        handleToggleSubtaskStatus,
        handleDeleteSubtask
    };
};

export default useSubtaskHandlers;
