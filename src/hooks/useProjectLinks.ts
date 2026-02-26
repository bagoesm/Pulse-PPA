// src/hooks/useProjectLinks.ts
// Hook for managing standalone project links and documents
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ProjectLink } from '../../types';

interface UseProjectLinksResult {
    projectLinks: ProjectLink[];
    isLoading: boolean;
    fetchProjectLinks: (projectId: string) => Promise<void>;
    addProjectLink: (link: Omit<ProjectLink, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
    deleteProjectLink: (linkId: string) => Promise<boolean>;
    uploadProjectDocument: (projectId: string, file: File, title: string, description: string, createdBy: string) => Promise<boolean>;
}

export const useProjectLinks = (
    showNotification: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void
): UseProjectLinksResult => {
    const [projectLinks, setProjectLinks] = useState<ProjectLink[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch project links for a specific project
    const fetchProjectLinks = useCallback(async (projectId: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('project_links')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching project links:', error);
                return;
            }

            const mappedLinks: ProjectLink[] = (data || []).map((item: any) => ({
                id: item.id,
                projectId: item.project_id,
                title: item.title,
                url: item.url,
                filePath: item.file_path,
                fileName: item.file_name,
                type: item.type || 'link',
                description: item.description,
                createdBy: item.created_by,
                createdAt: item.created_at,
                updatedAt: item.updated_at
            }));

            setProjectLinks(mappedLinks);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Add a new link
    const addProjectLink = useCallback(async (link: Omit<ProjectLink, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
        try {
            // Get auth user ID for created_by_id
            const { data: { session: authSession } } = await supabase.auth.getSession();
            const authUserId = authSession?.user?.id || null;

            const { data, error } = await supabase
                .from('project_links')
                .insert([{
                    project_id: link.projectId,
                    title: link.title,
                    url: link.url || null,
                    file_path: link.filePath || null,
                    file_name: link.fileName || null,
                    type: link.type,
                    description: link.description || null,
                    created_by: link.createdBy,
                    created_by_id: authUserId,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) {
                showNotification('Gagal', `Gagal menambahkan link: ${error.message}`, 'error');
                return false;
            }

            const newLink: ProjectLink = {
                id: data.id,
                projectId: data.project_id,
                title: data.title,
                url: data.url,
                filePath: data.file_path,
                fileName: data.file_name,
                type: data.type,
                description: data.description,
                createdBy: data.created_by,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };

            setProjectLinks(prev => [newLink, ...prev]);
            showNotification('Berhasil', `Link "${link.title}" berhasil ditambahkan`, 'success');
            return true;
        } catch (err: any) {
            showNotification('Error', err.message, 'error');
            return false;
        }
    }, [showNotification]);

    // Delete a link
    const deleteProjectLink = useCallback(async (linkId: string): Promise<boolean> => {
        try {
            // First, get the link to check if it has a file
            const link = projectLinks.find(l => l.id === linkId);

            // Delete from Supabase storage if it's a document
            if (link?.filePath) {
                await supabase.storage.from('attachment').remove([link.filePath]);
            }

            const { error } = await supabase
                .from('project_links')
                .delete()
                .eq('id', linkId);

            if (error) {
                showNotification('Gagal', `Gagal menghapus link: ${error.message}`, 'error');
                return false;
            }

            setProjectLinks(prev => prev.filter(l => l.id !== linkId));
            showNotification('Berhasil', 'Link berhasil dihapus', 'success');
            return true;
        } catch (err: any) {
            showNotification('Error', err.message, 'error');
            return false;
        }
    }, [projectLinks, showNotification]);

    // Upload a document file
    const uploadProjectDocument = useCallback(async (
        projectId: string,
        file: File,
        title: string,
        description: string,
        createdBy: string
    ): Promise<boolean> => {
        try {
            // Generate unique file path
            const timestamp = Date.now();
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filePath = `project-docs/${projectId}/${timestamp}_${safeName}`;

            // Upload to Supabase storage
            const { error: uploadError } = await supabase.storage
                .from('attachment')
                .upload(filePath, file);

            if (uploadError) {
                showNotification('Gagal Upload', uploadError.message, 'error');
                return false;
            }

            // Add link record
            const success = await addProjectLink({
                projectId,
                title: title || file.name,
                type: 'document',
                filePath,
                fileName: file.name,
                description,
                createdBy
            });

            return success;
        } catch (err: any) {
            showNotification('Error', err.message, 'error');
            return false;
        }
    }, [addProjectLink, showNotification]);

    return {
        projectLinks,
        isLoading,
        fetchProjectLinks,
        addProjectLink,
        deleteProjectLink,
        uploadProjectDocument
    };
};

export default useProjectLinks;
