// src/hooks/useProjectHelpers.ts
// Helper functions for ProjectOverview component
import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useData } from '../contexts/DataContext';

interface ProjectFilters {
    search?: string;
    status?: string;
    manager?: string;
    page?: number;
    limit?: number;
}

interface TaskFilters {
    search?: string;
    status?: string;
    priority?: string;
    pic?: string;
    page?: number;
    limit?: number;
}

export const useProjectHelpers = () => {
    const { tasks, projects, setProjects } = useData();

    // Fetch projects from database with filters and pagination
    const fetchProjects = useCallback(async (filters: ProjectFilters = {}) => {
        const { search = '', status = 'All', manager = 'All', page = 1, limit = 12 } = filters;

        // Build the base query with all filters
        let countQuery = supabase.from('projects').select('*', { count: 'exact', head: true });
        let dataQuery = supabase.from('projects').select('*');

        // Apply all filters to both queries
        if (search) {
            countQuery = countQuery.ilike('name', `%${search}%`);
            dataQuery = dataQuery.ilike('name', `%${search}%`);
        }
        if (status && status !== 'All') {
            countQuery = countQuery.eq('status', status);
            dataQuery = dataQuery.eq('status', status);
        }
        if (manager && manager !== 'All') {
            countQuery = countQuery.eq('manager', manager);
            dataQuery = dataQuery.eq('manager', manager);
        }

        // Get total count with filters applied
        const { count } = await countQuery;
        const totalCount = count || 0;
        const totalPages = Math.ceil(totalCount / limit);

        // Apply pagination and ordering to data query
        const start = (page - 1) * limit;
        const { data, error } = await dataQuery
            .order('name')
            .range(start, start + limit - 1);

        if (!error && data) {
            const mapped = data.map((p: any) => ({
                id: p.id,
                name: p.name,
                manager: p.manager,
                description: p.description,
                icon: p.icon,
                color: p.color,
                targetLiveDate: p.target_live_date,
                status: p.status,
                pinnedLinks: p.pinned_links
            }));

            // Also update global projects state when loading first page without filters
            if (page === 1 && !search && status === 'All' && manager === 'All') {
                setProjects(mapped);
            }

            return { projects: mapped, totalCount, totalPages };
        }

        return { projects: [], totalCount: 0, totalPages: 0 };
    }, [setProjects]);

    // Get tasks for a specific project with pagination
    const fetchProjectTasks = useCallback(async (projectId: string, filters: TaskFilters = {}) => {
        const { search = '', status = 'All', priority = 'All', pic = 'All', page = 1, limit = 10 } = filters;

        // Filter tasks for this project
        let projectTasks = tasks.filter(t => t.projectId === projectId);

        // Apply filters
        if (search) {
            const searchLower = search.toLowerCase();
            projectTasks = projectTasks.filter(t =>
                t.title.toLowerCase().includes(searchLower) ||
                t.subCategory?.toLowerCase().includes(searchLower)
            );
        }
        if (status && status !== 'All') {
            projectTasks = projectTasks.filter(t => t.status === status);
        }
        if (priority && priority !== 'All') {
            projectTasks = projectTasks.filter(t => t.priority === priority);
        }
        // PIC filter - check if the selected PIC is in the task's PIC array
        if (pic && pic !== 'All') {
            projectTasks = projectTasks.filter(t => {
                if (Array.isArray(t.pic)) {
                    return t.pic.includes(pic);
                }
                return t.pic === pic;
            });
        }

        const totalCount = projectTasks.length;
        const totalPages = Math.ceil(totalCount / limit);

        // Apply pagination
        const start = (page - 1) * limit;
        const paginatedTasks = projectTasks.slice(start, start + limit);

        return { tasks: paginatedTasks, totalCount, totalPages };
    }, [tasks]);

    // Get unique managers from projects
    const fetchUniqueManagers = useCallback(async () => {
        const { data } = await supabase.from('projects').select('manager');
        if (data) {
            return [...new Set(data.map(p => p.manager).filter(Boolean))];
        }
        return [...new Set(projects.map(p => p.manager).filter(Boolean))];
    }, [projects]);

    // Update pinned links for a project
    const updatePinnedLinks = useCallback(async (projectId: string, pinnedLinks: string[]): Promise<boolean> => {
        const { error } = await supabase
            .from('projects')
            .update({ pinned_links: pinnedLinks })
            .eq('id', projectId);

        if (!error) {
            setProjects(prev => prev.map(p =>
                p.id === projectId ? { ...p, pinnedLinks } : p
            ));
            return true;
        }
        return false;
    }, [setProjects]);

    return {
        fetchProjects,
        fetchProjectTasks,
        fetchUniqueManagers,
        updatePinnedLinks
    };
};

export default useProjectHelpers;
