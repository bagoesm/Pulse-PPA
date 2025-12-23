// src/hooks/useProjectData.ts
// Hook for managing project data fetching and state

import { useState, useCallback, useEffect, useRef } from 'react';
import { ProjectDefinition, Task, Status } from '../../types';

interface UseProjectDataProps {
    fetchProjects: (filters: any) => Promise<any>;
    fetchProjectTasks: (projectId: string, filters: any) => Promise<any>;
    fetchUniqueManagers: () => Promise<string[]>;
    refreshTrigger?: number;
    onRefreshNeeded?: () => void;
}

interface ProjectFilters {
    search: string;
    status: string;
    manager: string;
    page: number;
    limit: number;
}

interface TaskFilters {
    search: string;
    status: string;
    priority: string;
    pic: string;
    page: number;
    limit: number;
}

export interface UseProjectDataResult {
    // Projects state
    projects: ProjectDefinition[];
    projectsLoading: boolean;
    projectsTotalCount: number;
    projectsTotalPages: number;

    // Tasks state
    tasks: Task[];
    tasksLoading: boolean;
    tasksTotalCount: number;
    tasksTotalPages: number;

    // Managers
    uniqueManagers: string[];

    // Actions
    loadProjects: (filters: ProjectFilters) => Promise<void>;
    loadProjectTasks: (projectId: string, filters: TaskFilters) => Promise<void>;
    refreshData: (selectedProjectId: string | null, projectFilters: ProjectFilters, taskFilters: TaskFilters) => void;
}

export function useProjectData({
    fetchProjects,
    fetchProjectTasks,
    fetchUniqueManagers,
    refreshTrigger,
    onRefreshNeeded
}: UseProjectDataProps): UseProjectDataResult {
    // Projects state
    const [projects, setProjects] = useState<ProjectDefinition[]>([]);
    const [projectsLoading, setProjectsLoading] = useState(false);
    const [projectsTotalCount, setProjectsTotalCount] = useState(0);
    const [projectsTotalPages, setProjectsTotalPages] = useState(0);

    // Tasks state
    const [tasks, setTasks] = useState<Task[]>([]);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [tasksTotalCount, setTasksTotalCount] = useState(0);
    const [tasksTotalPages, setTasksTotalPages] = useState(0);

    // Managers
    const [uniqueManagers, setUniqueManagers] = useState<string[]>([]);

    // Track initial load
    const initialLoadDone = useRef(false);
    const lastRefreshTrigger = useRef(refreshTrigger);

    // Load projects
    const loadProjects = useCallback(async (filters: ProjectFilters) => {
        setProjectsLoading(true);
        try {
            const result = await fetchProjects(filters);
            setProjects(result.projects);
            setProjectsTotalCount(result.totalCount);
            setProjectsTotalPages(result.totalPages);
        } catch (error) {
            console.error('Error loading projects:', error);
            setProjects([]);
            setProjectsTotalCount(0);
            setProjectsTotalPages(0);
        } finally {
            setProjectsLoading(false);
        }
    }, [fetchProjects]);

    // Load project tasks
    const loadProjectTasks = useCallback(async (projectId: string, filters: TaskFilters) => {
        if (!projectId) return;

        setTasksLoading(true);
        try {
            const result = await fetchProjectTasks(projectId, filters);
            setTasks(result.tasks);
            setTasksTotalCount(result.totalCount);
            setTasksTotalPages(result.totalPages);
        } catch (error) {
            console.error('Error loading tasks:', error);
            setTasks([]);
            setTasksTotalCount(0);
            setTasksTotalPages(0);
        } finally {
            setTasksLoading(false);
        }
    }, [fetchProjectTasks]);

    // Load managers on mount
    useEffect(() => {
        if (!initialLoadDone.current) {
            initialLoadDone.current = true;
            fetchUniqueManagers()
                .then(setUniqueManagers)
                .catch(() => setUniqueManagers([]));
        }
    }, [fetchUniqueManagers]);

    // Refresh data
    const refreshData = useCallback((
        selectedProjectId: string | null,
        projectFilters: ProjectFilters,
        taskFilters: TaskFilters
    ) => {
        if (selectedProjectId) {
            loadProjectTasks(selectedProjectId, taskFilters);
        } else {
            loadProjects(projectFilters);
        }
        onRefreshNeeded?.();
    }, [loadProjects, loadProjectTasks, onRefreshNeeded]);

    return {
        projects,
        projectsLoading,
        projectsTotalCount,
        projectsTotalPages,
        tasks,
        tasksLoading,
        tasksTotalCount,
        tasksTotalPages,
        uniqueManagers,
        loadProjects,
        loadProjectTasks,
        refreshData
    };
}
