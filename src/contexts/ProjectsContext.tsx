// src/contexts/ProjectsContext.tsx
// Domain context for Projects
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
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
    const [isProjectsLoading, setIsProjectsLoading] = useState(false);
    const [projects, setProjects] = useState<ProjectDefinition[]>([]);

    const fetchProjects = useCallback(async () => {
        setIsProjectsLoading(true);
        try {
            const { data: projectsData, error: projectsErr } = await supabase.from('projects').select('*');
            if (projectsErr) console.error('Error fetch projects:', projectsErr);
            if (projectsData) setProjects(projectsData as ProjectDefinition[]);
        } finally {
            setIsProjectsLoading(false);
        }
    }, []);

    const clearProjects = useCallback(() => {
        setProjects([]);
    }, []);

    useEffect(() => {
        if (session) {
            fetchProjects();
        } else {
            clearProjects();
        }
    }, [session, fetchProjects, clearProjects]);

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
