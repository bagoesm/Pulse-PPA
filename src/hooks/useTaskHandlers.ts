// src/hooks/useTaskHandlers.ts
// Comprehensive task handlers - CRUD, drag/drop, comments, activities
import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Task, Status, Comment, TaskActivity, User, Category, Meeting } from '../../types';
import { parseMentions } from '../components/MentionInput';

interface UseTaskHandlersProps {
    currentUser: User | null;
    tasks: Task[];
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    comments: Comment[];
    setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
    taskActivities: TaskActivity[];
    setTaskActivities: React.Dispatch<React.SetStateAction<TaskActivity[]>>;
    allUsers: User[];
    editingTask: Task | null;
    setEditingTask: React.Dispatch<React.SetStateAction<Task | null>>;
    viewingTask: Task | null;
    setViewingTask: React.Dispatch<React.SetStateAction<Task | null>>;
    draggedTaskId: string | null;
    setDraggedTaskId: React.Dispatch<React.SetStateAction<string | null>>;
    setIsModalOpen: (open: boolean) => void;
    setIsTaskViewModalOpen: (open: boolean) => void;
    setProjectRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
    showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    createAssignmentNotification: (taskId: string, title: string, assignerName: string, newPics: string[], oldPics: string[], isNew: boolean) => Promise<void>;
    createCommentNotification: (taskId: string, title: string, commenterName: string, picsToNotify: string[]) => Promise<void>;
    createMentionNotification: (taskId: string, title: string, commenterName: string, mentionedNames: string[]) => Promise<void>;
    // Meeting redirection props
    meetings: any[]; // Using any[] temporarily to avoid circular dependency issues if types are tricky, but preferably Meeting[]
    setViewingMeeting: React.Dispatch<React.SetStateAction<any | null>>;
    setIsMeetingViewModalOpen: (open: boolean) => void;
}

export const useTaskHandlers = ({
    currentUser,
    tasks,
    setTasks,
    comments,
    setComments,
    taskActivities,
    setTaskActivities,
    allUsers,
    editingTask,
    setEditingTask,
    viewingTask,
    setViewingTask,
    draggedTaskId,
    setDraggedTaskId,
    setIsModalOpen,
    setIsTaskViewModalOpen,
    setProjectRefreshTrigger,
    showNotification,
    createAssignmentNotification,
    createCommentNotification,
    createMentionNotification,
    meetings,
    setViewingMeeting,
    setIsMeetingViewModalOpen
}: UseTaskHandlersProps) => {

    // Permission checks
    const checkEditPermission = useCallback((task: Task) => {
        if (!currentUser) return false;
        if (currentUser.role === 'Super Admin') return true;
        if (currentUser.role === 'Atasan') return true;
        const taskPics = Array.isArray(task.pic) ? task.pic : [task.pic];
        return task.createdBy === currentUser.name || taskPics.includes(currentUser.name);
    }, [currentUser]);

    const checkDeletePermission = useCallback((task: Task) => {
        if (!currentUser) return false;
        if (currentUser.role === 'Super Admin') return true;
        if (currentUser.role === 'Atasan') return true;
        // Allow PIC to delete task
        const taskPics = Array.isArray(task.pic) ? task.pic : [task.pic];
        return task.createdBy === currentUser.name || taskPics.includes(currentUser.name);
    }, [currentUser]);

    // Log task activity
    const logTaskActivity = useCallback(async (
        taskId: string,
        actionType: 'created' | 'status_change' | 'pic_change' | 'priority_change' | 'deadline_change' | 'category_change',
        oldValue?: string,
        newValue?: string
    ) => {
        if (!currentUser) return;

        try {
            const { data, error } = await supabase.from('task_activities').insert([{
                task_id: taskId,
                user_id: currentUser.id,
                user_name: currentUser.name,
                action_type: actionType,
                old_value: oldValue || null,
                new_value: newValue || null
            }]).select().single();

            if (error) {
                console.error('Error logging activity:', error);
                return;
            }

            if (data) {
                const mappedActivity: TaskActivity = {
                    id: data.id,
                    taskId: data.task_id,
                    userId: data.user_id,
                    userName: data.user_name,
                    actionType: data.action_type,
                    oldValue: data.old_value,
                    newValue: data.new_value,
                    createdAt: data.created_at
                };
                setTaskActivities(prev => [mappedActivity, ...prev]);
            }
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }, [currentUser, setTaskActivities]);

    // Drag handlers
    const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
        const task = tasks.find(t => t.id === id);
        if (task && checkEditPermission(task)) {
            setDraggedTaskId(id);
            e.dataTransfer.effectAllowed = 'move';
        } else {
            e.preventDefault();
        }
    }, [tasks, checkEditPermission, setDraggedTaskId]);

    const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);

    const handleDrop = useCallback(async (e: React.DragEvent, status: Status) => {
        e.preventDefault();
        if (draggedTaskId) {
            const task = tasks.find(t => t.id === draggedTaskId);
            const oldStatus = task?.status;

            setTasks(prev => prev.map(t => t.id === draggedTaskId ? { ...t, status } : t));

            const { data: updatedData, error } = await supabase
                .from('tasks')
                .update({ status })
                .eq('id', draggedTaskId)
                .select();

            if (!error && updatedData && updatedData.length > 0) {
                if (oldStatus && oldStatus !== status) {
                    await logTaskActivity(draggedTaskId, 'status_change', oldStatus, status);
                }
            } else {
                setTasks(prev => prev.map(t => t.id === draggedTaskId ? { ...t, status: oldStatus || t.status } : t));
                showNotification('Gagal Update Status', 'Anda tidak memiliki izin untuk mengubah status task ini.', 'error');
            }

            setDraggedTaskId(null);
        }
    }, [draggedTaskId, tasks, setTasks, setDraggedTaskId, logTaskActivity, showNotification]);

    // Save task (create or update)
    const handleSaveTask = useCallback(async (newTaskData: Omit<Task, 'id'>) => {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
            showNotification('Login Diperlukan', 'Anda harus login untuk membuat task.', 'warning');
            return;
        }

        const payload = {
            title: newTaskData.title,
            category: newTaskData.category,
            sub_category: newTaskData.subCategory,
            start_date: newTaskData.startDate,
            deadline: newTaskData.deadline,
            pic: newTaskData.pic,
            priority: newTaskData.priority,
            status: newTaskData.status,
            description: newTaskData.description,
            project_id: newTaskData.projectId || null,
            attachments: newTaskData.attachments,
            links: newTaskData.links,
            created_by_id: userId
        };

        if (editingTask) {
            const oldAttachments = editingTask.attachments || [];
            const newAttachments = newTaskData.attachments || [];
            const removedAttachments = oldAttachments.filter(oldAtt =>
                !newAttachments.some(newAtt => newAtt.id === oldAtt.id)
            );

            const { data: updatedData, error } = await supabase
                .from('tasks')
                .update(payload)
                .eq('id', editingTask.id)
                .select();

            if (!error && updatedData && updatedData.length > 0) {
                if (removedAttachments.length > 0) {
                    const filePaths = removedAttachments.filter(att => att.path).map(att => att.path);
                    if (filePaths.length > 0) {
                        try {
                            await supabase.storage.from('attachment').remove(filePaths);
                        } catch (err) {
                            console.error('Error cleaning up attachments:', err);
                        }
                    }
                }

                // Log changes
                if (editingTask.status !== newTaskData.status) {
                    await logTaskActivity(editingTask.id, 'status_change', editingTask.status, newTaskData.status);
                }
                if (JSON.stringify(editingTask.pic) !== JSON.stringify(newTaskData.pic)) {
                    const oldPic = Array.isArray(editingTask.pic) ? editingTask.pic.join(', ') : editingTask.pic;
                    const newPic = Array.isArray(newTaskData.pic) ? newTaskData.pic.join(', ') : newTaskData.pic;
                    await logTaskActivity(editingTask.id, 'pic_change', oldPic, newPic);

                    const oldPics = Array.isArray(editingTask.pic) ? editingTask.pic : [editingTask.pic];
                    const newPics = Array.isArray(newTaskData.pic) ? newTaskData.pic : [newTaskData.pic];
                    await createAssignmentNotification(editingTask.id, newTaskData.title, currentUser?.name || 'Unknown', newPics, oldPics, false);
                }
                if (editingTask.priority !== newTaskData.priority) {
                    await logTaskActivity(editingTask.id, 'priority_change', editingTask.priority, newTaskData.priority);
                }
                if (editingTask.deadline !== newTaskData.deadline) {
                    await logTaskActivity(editingTask.id, 'deadline_change', editingTask.deadline, newTaskData.deadline);
                }
                if (editingTask.category !== newTaskData.category) {
                    await logTaskActivity(editingTask.id, 'category_change', editingTask.category, newTaskData.category);
                }

                // Send mention notifications for new mentions in description
                if (newTaskData.description) {
                    const oldMentions = editingTask.description ? parseMentions(editingTask.description, allUsers) : [];
                    const newMentions = parseMentions(newTaskData.description, allUsers);
                    const addedMentions = newMentions.filter(name => !oldMentions.includes(name));
                    if (addedMentions.length > 0) {
                        await createMentionNotification(editingTask.id, newTaskData.title, currentUser?.name || 'Unknown', addedMentions);
                    }
                }

                setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...newTaskData, id: editingTask.id, createdBy: t.createdBy } : t));
                setProjectRefreshTrigger(prev => prev + 1);
            } else {
                showNotification('Gagal Update Task', 'Anda tidak memiliki izin untuk mengubah task ini.', 'error');
            }

            setEditingTask(null);
            setIsModalOpen(false);
            return;
        }

        // Create new task
        const { data, error } = await supabase
            .from('tasks')
            .insert([payload])
            .select()
            .single();

        if (error) {
            showNotification('Gagal Membuat Task', `Gagal membuat task: ${error.message}`, 'error');
            return;
        }

        const createdByName = allUsers.find(u => u.id === data.created_by_id)?.name || currentUser?.name || 'Unknown';
        const mapped = {
            ...data,
            subCategory: data.sub_category,
            startDate: data.start_date,
            projectId: data.project_id,
            createdBy: createdByName,
        };

        setTasks(prev => [...prev, mapped]);
        await logTaskActivity(data.id, 'created', undefined, newTaskData.title);

        const taskPics = Array.isArray(newTaskData.pic) ? newTaskData.pic : [newTaskData.pic];
        await createAssignmentNotification(data.id, newTaskData.title, currentUser?.name || 'Unknown', taskPics, [], true);

        // Send mention notifications for mentions in description
        if (newTaskData.description) {
            const mentionedNames = parseMentions(newTaskData.description, allUsers);
            if (mentionedNames.length > 0) {
                await createMentionNotification(data.id, newTaskData.title, currentUser?.name || 'Unknown', mentionedNames);
            }
        }

        setProjectRefreshTrigger(prev => prev + 1);
        setIsModalOpen(false);
    }, [editingTask, allUsers, currentUser, setTasks, setEditingTask, setIsModalOpen, setProjectRefreshTrigger, showNotification, logTaskActivity, createAssignmentNotification, createMentionNotification]);

    // Delete task
    const handleDeleteTask = useCallback(async (id: string) => {
        const taskToDelete = tasks.find(t => t.id === id);

        const { data: deletedData, error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id)
            .select();

        if (!error && deletedData && deletedData.length > 0) {
            if (taskToDelete?.attachments && taskToDelete.attachments.length > 0) {
                const filePaths = taskToDelete.attachments.filter(att => att.path).map(att => att.path);
                if (filePaths.length > 0) {
                    try {
                        await supabase.storage.from('attachment').remove(filePaths);
                    } catch (err) {
                        console.error('Error cleaning up attachments:', err);
                    }
                }
            }

            setTasks(prev => prev.filter(t => t.id !== id));
            setProjectRefreshTrigger(prev => prev + 1);
            setIsModalOpen(false);
            setEditingTask(null);
        } else {
            showNotification('Gagal Hapus Task', 'Anda tidak memiliki izin untuk menghapus task ini.', 'error');
        }
    }, [tasks, setTasks, setEditingTask, setIsModalOpen, setProjectRefreshTrigger, showNotification]);

    // Status change from view modal
    const handleStatusChangeFromView = useCallback(async (taskId: string, newStatus: Status) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const oldStatus = task.status;
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        if (viewingTask && viewingTask.id === taskId) {
            setViewingTask({ ...viewingTask, status: newStatus });
        }

        const { data: updatedData, error } = await supabase
            .from('tasks')
            .update({ status: newStatus })
            .eq('id', taskId)
            .select();

        if (!error && updatedData && updatedData.length > 0) {
            if (oldStatus !== newStatus) {
                await logTaskActivity(taskId, 'status_change', oldStatus, newStatus);
            }
        } else {
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: oldStatus } : t));
            if (viewingTask && viewingTask.id === taskId) {
                setViewingTask({ ...viewingTask, status: oldStatus });
            }
            showNotification('Gagal Update Status', 'Anda tidak memiliki izin untuk mengubah status task ini.', 'error');
        }
    }, [tasks, viewingTask, setTasks, setViewingTask, logTaskActivity, showNotification]);

    // Add comment
    const handleAddComment = useCallback(async (taskId: string, content: string) => {
        if (!currentUser) return;

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const tempComment: Comment = {
            id: tempId,
            taskId,
            userId: currentUser.id,
            userName: currentUser.name,
            content,
            createdAt: new Date().toISOString()
        };

        setComments(prev => [tempComment, ...prev]);

        try {
            const { data, error } = await supabase.from('task_comments').insert([{
                task_id: taskId,
                user_id: currentUser.id,
                user_name: currentUser.name,
                content: content
            }]).select().single();

            if (error) throw error;

            const realComment: Comment = {
                id: data.id,
                taskId: data.task_id,
                userId: data.user_id,
                userName: data.user_name,
                content: data.content,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };

            setComments(prev => prev.map(c => c.id === tempId ? realComment : c));

            const task = tasks.find(t => t.id === taskId);
            if (task) {
                const mentionedNames: string[] = [];
                for (const user of allUsers) {
                    const escapedName = user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const mentionPattern = new RegExp(`@${escapedName}(?:\\s|$|[.,!?])`, 'i');
                    if (mentionPattern.test(content) && !mentionedNames.includes(user.name)) {
                        mentionedNames.push(user.name);
                    }
                }

                if (mentionedNames.length > 0) {
                    await createMentionNotification(taskId, task.title, currentUser.name, mentionedNames);
                }

                const taskPics = Array.isArray(task.pic) ? task.pic : [task.pic];
                const picsToNotify = taskPics.filter(pic => !mentionedNames.includes(pic));
                if (picsToNotify.length > 0) {
                    await createCommentNotification(taskId, task.title, currentUser.name, picsToNotify);
                }
            }
        } catch (error) {
            setComments(prev => prev.filter(c => c.id !== tempId));
            throw error;
        }
    }, [currentUser, tasks, allUsers, setComments, createMentionNotification, createCommentNotification]);

    // Delete comment
    const handleDeleteComment = useCallback(async (commentId: string) => {
        try {
            const { error } = await supabase.from('task_comments').delete().eq('id', commentId);
            if (error) {
                showNotification('Gagal Hapus Komentar', error.message, 'error');
                return;
            }
            setComments(prev => prev.filter(c => c.id !== commentId));
        } catch (error: any) {
            showNotification('Kesalahan', `Gagal menghapus komentar: ${error.message}`, 'error');
        }
    }, [setComments, showNotification]);

    // Task click handlers (for view modal)
    const handleTaskClick = useCallback((task: Task) => {
        // Redirect to Meeting View if category is Audiensi/Rapat
        if (task.category === Category.AudiensiRapat) {
            // Find meeting by ID if linked, OR if one exists with same title? 
            // Better to rely on meetingId link.
            // If task.meetingId is present, we look it up.
            if (task.meetingId) {
                const meeting = meetings.find(m => m.id === task.meetingId);
                if (meeting) {
                    setViewingMeeting(meeting);
                    setIsMeetingViewModalOpen(true);
                    return;
                }
            }

            // If we are here, we have a Rapat Task but no linked Meeting object found. 
            // Fallback to normal task view to avoid broken UI.
            setViewingTask(task);
            setIsTaskViewModalOpen(true);
        } else {
            setViewingTask(task);
            setIsTaskViewModalOpen(true);
        }
    }, [setViewingTask, setIsTaskViewModalOpen, meetings, setViewingMeeting, setIsMeetingViewModalOpen]);

    const handleEditClick = useCallback((task: Task) => {
        if (checkEditPermission(task)) {
            setEditingTask(task);
            setIsModalOpen(true);
        }
    }, [checkEditPermission, setEditingTask, setIsModalOpen]);

    const handleEditFromView = useCallback(() => {
        if (viewingTask && checkEditPermission(viewingTask)) {
            setEditingTask(viewingTask);
            setViewingTask(null);
            setIsModalOpen(true);
        }
    }, [viewingTask, checkEditPermission, setEditingTask, setViewingTask, setIsModalOpen]);

    return {
        checkEditPermission,
        checkDeletePermission,
        logTaskActivity,
        handleDragStart,
        handleDragOver,
        handleDrop,
        handleSaveTask,
        handleDeleteTask,
        handleStatusChangeFromView,
        handleAddComment,
        handleDeleteComment,
        handleTaskClick,
        handleEditClick,
        handleEditFromView
    };
};

export default useTaskHandlers;
