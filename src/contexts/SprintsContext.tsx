// src/contexts/SprintsContext.tsx
// Domain context for Sprints - agile iteration iterations
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { supabase } from '../lib/supabaseClient';
import { Sprint, SprintStatus } from '../../types';

interface SprintsContextType {
    sprints: Sprint[];
    setSprints: React.Dispatch<React.SetStateAction<Sprint[]>>;
    fetchSprints: () => Promise<void>;
    clearSprints: () => void;
    isSprintsLoading: boolean;
    
    // CRUD Operations
    createSprint: (sprint: Omit<Sprint, 'id' | 'createdAt' | 'createdBy'>) => Promise<Sprint | null>;
    updateSprint: (sprintId: string, updates: Partial<Sprint>) => Promise<boolean>;
    deleteSprint: (sprintId: string) => Promise<boolean>;
    assignTaskToSprint: (taskId: string, sprintId: string | null) => Promise<boolean>;
    
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

    useEffect(() => {
        if (querySprints) {
            setSprints(querySprints);
        }
    }, [querySprints]);

    const fetchSprints = useCallback(async () => {
        await refetch();
    }, [refetch]);

    const clearSprints = useCallback(() => {
        setSprints([]);
        queryClient.invalidateQueries({ queryKey: ['sprints'] });
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
                    sprint_id: sprintId
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
        } else {
            clearSprints();
        }
    }, [userId, refetch, clearSprints]);

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
