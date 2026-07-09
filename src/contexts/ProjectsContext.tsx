// src/contexts/ProjectsContext.tsx
// Domain context for Projects
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { supabase } from '../lib/supabaseClient';
import { ProjectDefinition } from '../../types';

interface ProjectsContextType {
    projects: ProjectDefinition[];
    setProjects: React.Dispatch<React.SetStateAction<ProjectDefinition[]>>;
    fetchProjects: () => Promise<void>;
    clearProjects: () => void;
    isProjectsLoading: boolean;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export const useProjects = () => {
    const context = useContext(ProjectsContext);
    if (!context) {
        throw new Error('useProjects must be used within a ProjectsProvider');
    }
    return context;
};

interface ProjectsProviderProps {
    children: ReactNode;
    session: any;
}

export const ProjectsProvider: React.FC<ProjectsProviderProps> = ({ children, session }) => {
    // Fetch projects via React Query
    const { data: queryProjects, isLoading: isProjectsQueryLoading, refetch: refetchProjects } = useQuery({
        queryKey: ['projects'],
        queryFn: async (): Promise<ProjectDefinition[]> => {
            const { data: projectsData, error: projectsErr } = await supabase.from('projects').select('*');
            if (projectsErr) {
                console.error('Error fetch projects:', projectsErr);
                return [];
            }
            return (projectsData as ProjectDefinition[]) || [];
        },
        enabled: !!session,
    });

    const [projects, setProjects] = useState<ProjectDefinition[]>([]);

    useEffect(() => {
        if (queryProjects) {
            setProjects(queryProjects);
        }
    }, [queryProjects]);

    const isProjectsLoading = isProjectsQueryLoading;

    const fetchProjects = useCallback(async () => {
        await refetchProjects();
    }, [refetchProjects]);

    const clearProjects = useCallback(() => {
        setProjects([]);
        queryClient.invalidateQueries({ queryKey: ['projects'] });
    }, []);

    // Auto-fetch/clear based on session
    useEffect(() => {
        if (!session) {
            clearProjects();
        }
    }, [session, clearProjects]);

    const value: ProjectsContextType = {
        projects,
        setProjects,
        fetchProjects,
        clearProjects,
        isProjectsLoading
    };

    return (
        <ProjectsContext.Provider value={value}>
            {children}
        </ProjectsContext.Provider>
    );
};

export default ProjectsContext;
