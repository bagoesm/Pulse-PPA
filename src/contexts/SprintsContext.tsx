// src/contexts/SprintsContext.tsx
// Domain context for Sprints - agile iteration iterations
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { supabase } from '../lib/supabaseClient';
import { Sprint, SprintStatus, Backlog } from '../../types';

interface SprintsContextType {
    sprints: Sprint[];
    setSprints: React.Dispatch<React.SetStateAction<Sprint[]>>;
    fetchSprints: () => Promise<void>;
    clearSprints: () => void;
    isSprintsLoading: boolean;
    
    // Sprints CRUD Operations
    createSprint: (sprint: Omit<Sprint, 'id' | 'createdAt' | 'createdBy'>) => Promise<Sprint | null>;
    updateSprint: (sprintId: string, updates: Partial<Sprint>) => Promise<boolean>;
    deleteSprint: (sprintId: string) => Promise<boolean>;
    assignTaskToSprint: (taskId: string, sprintId: string | null) => Promise<boolean>;
    
    // Backlogs CRUD Operations
    backlogs: Backlog[];
    setBacklogs: React.Dispatch<React.SetStateAction<Backlog[]>>;
    fetchBacklogs: () => Promise<void>;
    isBacklogsLoading: boolean;
    createBacklog: (backlog: { projectId: string; title: string }) => Promise<Backlog | null>;
    updateBacklog: (backlogId: string, updates: { title: string }) => Promise<boolean>;
    deleteBacklog: (backlogId: string) => Promise<boolean>;
    assignTaskToBacklog: (taskId: string, backlogId: string | null) => Promise<boolean>;
    getBacklogsByProject: (projectId: string) => Backlog[];

    // Helpers
    getSprintsByProject: (projectId: string) => Sprint[];
    getActiveSprint: (projectId: string) => Sprint | undefined;
}

const SprintsContext = createContext<SprintsContextType | undefined>(undefined);

export const useSprints = () => {
    const context = useContext(SprintsContext);
    if (!context) {
        throw new Error('useSprints must be used within a SprintsProvider');
    }
    return context;
};

interface SprintsProviderProps {
    children: ReactNode;
    session: any;
}

const mapSprint = (s: any): Sprint => ({
    id: s.id,
    name: s.name,
    goal: s.goal || '',
    description: s.description || '',
    projectId: s.project_id,
    status: (s.status || 'Planned') as SprintStatus,
    startDate: s.start_date || undefined,
    endDate: s.end_date || undefined,
    createdBy: s.created_by || '',
    createdAt: s.created_at || '',
    updatedAt: s.updated_at || undefined
});

export const SprintsProvider: React.FC<SprintsProviderProps> = ({ children, session }) => {
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [backlogs, setBacklogs] = useState<Backlog[]>([]);

    const { data: querySprints, isLoading: isSprintsLoading, refetch } = useQuery({
        queryKey: ['sprints'],
        queryFn: async (): Promise<Sprint[]> => {
            const { data, error } = await supabase
                .from('sprints')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching sprints:', error);
                return [];
            }

            return (data || []).map(mapSprint);
        },
        enabled: !!session,
    });

    const { data: queryBacklogs, isLoading: isBacklogsLoading, refetch: refetchBacklogs } = useQuery({
        queryKey: ['backlogs'],
        queryFn: async (): Promise<Backlog[]> => {
            const { data, error } = await supabase
                .from('backlogs')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching backlogs:', error);
                return [];
            }

            return (data || []).map((b: any): Backlog => ({
                id: b.id,
                projectId: b.project_id,
                title: b.title,
                createdBy: b.created_by || '',
                createdAt: b.created_at || '',
                updatedAt: b.updated_at || undefined
            }));
        },
        enabled: !!session,
    });

    useEffect(() => {
        if (querySprints) {
            setSprints(querySprints);
        }
    }, [querySprints]);

    useEffect(() => {
        if (queryBacklogs) {
            setBacklogs(queryBacklogs);
        }
    }, [queryBacklogs]);

    const fetchSprints = useCallback(async () => {
        await refetch();
    }, [refetch]);

    const fetchBacklogs = useCallback(async () => {
        await refetchBacklogs();
    }, [refetchBacklogs]);

    const clearSprints = useCallback(() => {
        setSprints([]);
        setBacklogs([]);
        queryClient.invalidateQueries({ queryKey: ['sprints'] });
        queryClient.invalidateQueries({ queryKey: ['backlogs'] });
    }, []);

    // Create Sprint
    const createSprint = useCallback(async (sprint: Omit<Sprint, 'id' | 'createdAt' | 'createdBy'>): Promise<Sprint | null> => {
        try {
            const userId = session?.user?.id;
            if (!userId) return null;

            const { data, error } = await supabase
                .from('sprints')
                .insert({
                    name: sprint.name,
                    goal: sprint.goal,
                    description: sprint.description,
                    project_id: sprint.projectId,
                    status: sprint.status,
                    start_date: sprint.startDate,
                    end_date: sprint.endDate,
                    created_by: userId
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating sprint:', error);
                return null;
            }

            if (data) {
                const newSprint = mapSprint(data);
                setSprints(prev => [newSprint, ...prev]);
                await refetch();
                return newSprint;
            }
            return null;
        } catch (err) {
            console.error('Error in createSprint:', err);
            return null;
        }
    }, [session, refetch]);

    // Update Sprint
    const updateSprint = useCallback(async (sprintId: string, updates: Partial<Sprint>): Promise<boolean> => {
        try {
            const dbUpdates: any = {};
            if (updates.name !== undefined) dbUpdates.name = updates.name;
            if (updates.goal !== undefined) dbUpdates.goal = updates.goal;
            if (updates.description !== undefined) dbUpdates.description = updates.description;
            if (updates.status !== undefined) dbUpdates.status = updates.status;
            if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
            if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
            dbUpdates.updated_at = new Date().toISOString();

            const { error } = await supabase
                .from('sprints')
                .update(dbUpdates)
                .eq('id', sprintId);

            if (error) {
                console.error('Error updating sprint:', error);
                return false;
            }

            await refetch();
            return true;
        } catch (err) {
            console.error('Error in updateSprint:', err);
            return false;
        }
    }, [refetch]);

    // Delete Sprint
    const deleteSprint = useCallback(async (sprintId: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('sprints')
                .delete()
                .eq('id', sprintId);

            if (error) {
                console.error('Error deleting sprint:', error);
                return false;
            }

            await refetch();
            queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Re-fetch tasks since sprint deleted cascades or NULLs sprintId
            return true;
        } catch (err) {
            console.error('Error in deleteSprint:', err);
            return false;
        }
    }, [refetch]);

    // Assign Task to Sprint
    const assignTaskToSprint = useCallback(async (taskId: string, sprintId: string | null): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ 
                    sprint_id: sprintId,
                    ...(sprintId !== null ? { backlog_id: null } : {})
                })
                .eq('id', taskId);

            if (error) {
                console.error('Error assigning task to sprint:', error);
                return false;
            }

            queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Update tasks cache immediately
            return true;
        } catch (err) {
            console.error('Error in assignTaskToSprint:', err);
            return false;
        }
    }, []);

    // Create Backlog Section
    const createBacklog = useCallback(async (backlog: { projectId: string; title: string }): Promise<Backlog | null> => {
        try {
            const userId = session?.user?.id;
            const { data, error } = await supabase
                .from('backlogs')
                .insert({
                    project_id: backlog.projectId,
                    title: backlog.title.trim(),
                    created_by: userId || null
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating backlog:', error);
                return null;
            }

            if (data) {
                const newB: Backlog = {
                    id: data.id,
                    projectId: data.project_id,
                    title: data.title,
                    createdBy: data.created_by || '',
                    createdAt: data.created_at || '',
                    updatedAt: data.updated_at || undefined
                };
                setBacklogs(prev => [...prev, newB]);
                await refetchBacklogs();
                return newB;
            }
            return null;
        } catch (err) {
            console.error('Error in createBacklog:', err);
            return null;
        }
    }, [session, refetchBacklogs]);

    // Update Backlog Section Title
    const updateBacklog = useCallback(async (backlogId: string, updates: { title: string }): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('backlogs')
                .update({ 
                    title: updates.title.trim(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', backlogId);

            if (error) {
                console.error('Error updating backlog:', error);
                return false;
            }

            await refetchBacklogs();
            return true;
        } catch (err) {
            console.error('Error in updateBacklog:', err);
            return false;
        }
    }, [refetchBacklogs]);

    // Delete Backlog Section (Reassigns tasks in it to default backlog)
    const deleteBacklog = useCallback(async (backlogId: string): Promise<boolean> => {
        try {
            // Reassign any tasks that belonged to this backlog section back to default (null)
            await supabase
                .from('tasks')
                .update({ backlog_id: null })
                .eq('backlog_id', backlogId);

            const { error } = await supabase
                .from('backlogs')
                .delete()
                .eq('id', backlogId);

            if (error) {
                console.error('Error deleting backlog:', error);
                return false;
            }

            await refetchBacklogs();
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            return true;
        } catch (err) {
            console.error('Error in deleteBacklog:', err);
            return false;
        }
    }, [refetchBacklogs]);

    // Assign Task to a specific Backlog section
    const assignTaskToBacklog = useCallback(async (taskId: string, backlogId: string | null): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ 
                    sprint_id: null,
                    backlog_id: backlogId
                })
                .eq('id', taskId);

            if (error) {
                console.error('Error assigning task to backlog:', error);
                return false;
            }

            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            return true;
        } catch (err) {
            console.error('Error in assignTaskToBacklog:', err);
            return false;
        }
    }, []);

    // Helper: Get Backlogs by Project ID
    const getBacklogsByProject = useCallback((projectId: string): Backlog[] => {
        return backlogs.filter(b => b.projectId === projectId);
    }, [backlogs]);

    // Helper: Get Sprints by Project ID
    const getSprintsByProject = useCallback((projectId: string): Sprint[] => {
        return sprints.filter(s => s.projectId === projectId);
    }, [sprints]);

    // Helper: Get Active Sprint for a Project
    const getActiveSprint = useCallback((projectId: string): Sprint | undefined => {
        return sprints.find(s => s.projectId === projectId && s.status === 'Active');
    }, [sprints]);

    // Invalidate/Fetch on session changes
    const userId = session?.user?.id;
    useEffect(() => {
        if (userId) {
            refetch();
            refetchBacklogs();
        } else {
            clearSprints();
        }
    }, [userId, refetch, refetchBacklogs, clearSprints]);

    const value: SprintsContextType = {
        sprints,
        setSprints,
        fetchSprints,
        clearSprints,
        isSprintsLoading,
        createSprint,
        updateSprint,
        deleteSprint,
        assignTaskToSprint,
        backlogs,
        setBacklogs,
        fetchBacklogs,
        isBacklogsLoading,
        createBacklog,
        updateBacklog,
        deleteBacklog,
        assignTaskToBacklog,
        getBacklogsByProject,
        getSprintsByProject,
        getActiveSprint
    };

    return (
        <SprintsContext.Provider value={value}>
            {children}
        </SprintsContext.Provider>
    );
};

export default SprintsContext;
