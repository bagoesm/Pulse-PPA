// src/contexts/EpicsContext.tsx
// Domain context for Epics - middle layer between Projects and Tasks
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Epic, EpicStatus } from '../../types';

interface EpicsContextType {
    epics: Epic[];
    setEpics: React.Dispatch<React.SetStateAction<Epic[]>>;
    fetchEpics: () => Promise<void>;
    clearEpics: () => void;
    isEpicsLoading: boolean;
    // Helper: Get epics by project
    getEpicsByProject: (projectId: string) => Epic[];
    // Helper: Get epic progress (percentage of completed tasks)
    getEpicProgress: (epicId: string, tasks: any[]) => number;
}

const EpicsContext = createContext<EpicsContextType | undefined>(undefined);

export const useEpics = () => {
    const context = useContext(EpicsContext);
    if (!context) {
        throw new Error('useEpics must be used within an EpicsProvider');
    }
    return context;
};

interface EpicsProviderProps {
    children: ReactNode;
    session: any;
}

export const EpicsProvider: React.FC<EpicsProviderProps> = ({ children, session }) => {
    const [isEpicsLoading, setIsEpicsLoading] = useState(false);
    const [epics, setEpics] = useState<Epic[]>([]);

    const fetchEpics = useCallback(async () => {
        setIsEpicsLoading(true);
        try {
            const { data: epicsData, error: epicsErr } = await supabase
                .from('epics')
                .select('*')
                .order('created_at', { ascending: false });

            if (epicsErr) {
                console.error('Error fetch epics:', epicsErr);
                return;
            }

            if (epicsData) {
                const mappedEpics: Epic[] = epicsData.map((e: any) => ({
                    id: e.id,
                    name: e.name,
                    description: e.description || '',
                    projectId: e.project_id,
                    pic: Array.isArray(e.pic) ? e.pic : [],
                    status: (e.status || 'Not Started') as EpicStatus,
                    startDate: e.start_date || '',
                    targetDate: e.target_date || '',
                    color: e.color || 'blue',
                    icon: e.icon || 'Layers',
                    createdBy: e.created_by || '',
                    createdAt: e.created_at || '',
                    updatedAt: e.updated_at
                }));
                setEpics(mappedEpics);
            }
        } finally {
            setIsEpicsLoading(false);
        }
    }, []);

    const clearEpics = useCallback(() => {
        setEpics([]);
    }, []);

    // Helper: Get epics by project ID
    const getEpicsByProject = useCallback((projectId: string): Epic[] => {
        return epics.filter(e => e.projectId === projectId);
    }, [epics]);

    // Helper: Get epic progress based on tasks
    const getEpicProgress = useCallback((epicId: string, tasks: any[]): number => {
        const epicTasks = tasks.filter(t => t.epicId === epicId);
        if (epicTasks.length === 0) return 0;

        const completedTasks = epicTasks.filter(t => t.status === 'Done');
        return Math.round((completedTasks.length / epicTasks.length) * 100);
    }, []);

    useEffect(() => {
        if (session) {
            fetchEpics();
        } else {
            clearEpics();
        }
    }, [session, fetchEpics, clearEpics]);

    const value: EpicsContextType = {
        epics,
        setEpics,
        fetchEpics,
        clearEpics,
        isEpicsLoading,
        getEpicsByProject,
        getEpicProgress
    };

    return (
        <EpicsContext.Provider value={value}>
            {children}
        </EpicsContext.Provider>
    );
};

export default EpicsContext;
