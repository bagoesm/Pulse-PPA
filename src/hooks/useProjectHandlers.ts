// src/hooks/useProjectHandlers.ts
// Project CRUD operations
import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ProjectDefinition, User } from '../../types';

interface UseProjectHandlersProps {
    currentUser: User | null;
    projects: ProjectDefinition[];
    setProjects: React.Dispatch<React.SetStateAction<ProjectDefinition[]>>;
    editingProject: ProjectDefinition | null;
    setEditingProject: React.Dispatch<React.SetStateAction<ProjectDefinition | null>>;
    setIsProjectModalOpen: (open: boolean) => void;
    setProjectRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
    showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const useProjectHandlers = ({
    currentUser,
    projects,
    setProjects,
    editingProject,
    setEditingProject,
    setIsProjectModalOpen,
    setProjectRefreshTrigger,
    showNotification
}: UseProjectHandlersProps) => {

    // Permission checks - now accepts project to check manager
    const checkProjectEditPermission = useCallback((project?: ProjectDefinition) => {
        if (!currentUser) return false;
        if (currentUser.role === 'Super Admin') return true;
        if (currentUser.role === 'Atasan') return true;
        // Allow project manager to edit
        if (project && project.manager === currentUser.name) return true;
        return false;
    }, [currentUser]);

    const checkProjectDeletePermission = useCallback((project?: ProjectDefinition) => {
        if (!currentUser) return false;
        if (currentUser.role === 'Super Admin') return true;
        if (currentUser.role === 'Atasan') return true;
        // Allow project manager to delete
        if (project && project.manager === currentUser.name) return true;
        return false;
    }, [currentUser]);

    // Helper to log to activity_logs table (for admin view)
    const logToActivityLogs = useCallback(async (
        action: 'create' | 'update' | 'delete',
        projectId: string,
        projectName: string
    ) => {
        if (!currentUser) return;
        try {
            const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
            await supabase.from('activity_logs').insert({
                user_id: currentUser.id,
                user_name: currentUser.name,
                action: action,
                entity_type: 'project',
                entity_id: projectId,
                entity_title: projectName,
                project_id: projectId,
                project_name: projectName,
                user_agent: userAgent,
            });
        } catch (err) {
            console.error('Failed to log activity:', err);
        }
    }, [currentUser]);

    // Save project (create or update)
    const handleSaveProject = useCallback(async (projectData: ProjectDefinition) => {
        try {
            if (editingProject) {
                const updateData = {
                    name: projectData.name,
                    manager: projectData.manager,
                    description: projectData.description,
                    icon: projectData.icon,
                    color: projectData.color,
                    target_live_date: projectData.targetLiveDate,
                    status: projectData.status
                };

                const { data, error } = await supabase
                    .from('projects')
                    .update(updateData)
                    .eq('id', editingProject.id)
                    .select()
                    .single();

                if (data && !error) {
                    const mappedProject: ProjectDefinition = {
                        id: data.id,
                        name: data.name,
                        manager: data.manager,
                        description: data.description,
                        icon: data.icon,
                        color: data.color,
                        targetLiveDate: data.target_live_date,
                        status: data.status
                    };
                    setProjects(prev => prev.map(p => p.id === editingProject.id ? mappedProject : p));
                    showNotification('Project Diupdate!', `Project "${projectData.name}" berhasil diperbarui.`, 'success');
                    setProjectRefreshTrigger(prev => prev + 1);

                    // Log to activity_logs for admin view
                    await logToActivityLogs('update', editingProject.id, projectData.name);
                } else {
                    showNotification('Gagal Update Project', error?.message || 'Terjadi kesalahan.', 'error');
                }
            } else {
                const { data, error } = await supabase
                    .from('projects')
                    .insert([{
                        name: projectData.name,
                        manager: projectData.manager,
                        description: projectData.description,
                        icon: projectData.icon,
                        color: projectData.color,
                        target_live_date: projectData.targetLiveDate,
                        status: projectData.status
                    }])
                    .select()
                    .single();

                if (data && !error) {
                    const mappedProject: ProjectDefinition = {
                        id: data.id,
                        name: data.name,
                        manager: data.manager,
                        description: data.description,
                        icon: data.icon,
                        color: data.color,
                        targetLiveDate: data.target_live_date,
                        status: data.status
                    };
                    setProjects(prev => [...prev, mappedProject]);
                    showNotification('Project Dibuat!', `Project "${projectData.name}" berhasil ditambahkan.`, 'success');
                    setProjectRefreshTrigger(prev => prev + 1);

                    // Log to activity_logs for admin view
                    await logToActivityLogs('create', data.id, projectData.name);
                } else {
                    showNotification('Gagal Buat Project', error?.message || 'Terjadi kesalahan.', 'error');
                }
            }

            setIsProjectModalOpen(false);
            setEditingProject(null);
            setProjectRefreshTrigger(prev => prev + 1);

        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [editingProject, setProjects, setEditingProject, setIsProjectModalOpen, setProjectRefreshTrigger, showNotification, logToActivityLogs]);

    const handleDeleteProject = useCallback(async (projectId: string) => {
        try {
            // Get project data before deletion for logging
            const projectToDelete = projects.find(p => p.id === projectId);

            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', projectId);

            if (error) {
                showNotification('Gagal Hapus Project', error.message, 'error');
                return;
            }

            setProjects(prev => prev.filter(p => p.id !== projectId));
            showNotification('Project Dihapus', 'Project berhasil dihapus.', 'success');
            setProjectRefreshTrigger(prev => prev + 1);

            // Log to activity_logs for admin view
            if (projectToDelete) {
                await logToActivityLogs('delete', projectId, projectToDelete.name);
            }
        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [projects, setProjects, setProjectRefreshTrigger, showNotification, logToActivityLogs]);

    // Open project modal for editing
    const handleEditProject = useCallback((project: ProjectDefinition) => {
        setEditingProject(project);
        setIsProjectModalOpen(true);
    }, [setEditingProject, setIsProjectModalOpen]);

    // Open project modal for creating new
    const handleCreateProject = useCallback(() => {
        setEditingProject(null);
        setIsProjectModalOpen(true);
    }, [setEditingProject, setIsProjectModalOpen]);

    return {
        checkProjectEditPermission,
        checkProjectDeletePermission,
        handleSaveProject,
        handleDeleteProject,
        handleEditProject,
        handleCreateProject
    };
};

export default useProjectHandlers;
