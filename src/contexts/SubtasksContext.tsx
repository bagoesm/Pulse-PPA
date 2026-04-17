// src/contexts/SubtasksContext.tsx
// Domain context for Subtasks - mini-tasks under a parent Task
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Subtask, Status, Priority } from '../../types';

interface SubtasksContextType {
    subtasks: Subtask[];
    setSubtasks: React.Dispatch<React.SetStateAction<Subtask[]>>;
    fetchSubtasksByParent: (parentTaskId: string) => Promise<Subtask[]>;
    fetchAllSubtasks: () => Promise<void>;
    clearSubtasks: () => void;
    isSubtasksLoading: boolean;
    // Helpers
    getSubtasksByParent: (parentTaskId: string) => Subtask[];
    getSubtaskProgress: (parentTaskId: string) => { total: number; done: number; percentage: number };
}

const SubtasksContext = createContext<SubtasksContextType | undefined>(undefined);

export const useSubtasks = () => {
    const context = useContext(SubtasksContext);
    if (!context) {
        throw new Error('useSubtasks must be used within a SubtasksProvider');
    }
    return context;
};

interface SubtasksProviderProps {
    children: ReactNode;
    session: any;
}

const mapSubtask = (s: any): Subtask => ({
    id: s.id,
    parentTaskId: s.parent_task_id,
    title: s.title,
    description: s.description || '',
    pic: Array.isArray(s.pic) ? s.pic : [],
    priority: (s.priority || 'Medium') as Priority,
    status: (s.status || 'To Do') as Status,
    startDate: s.start_date || undefined,
    deadline: s.deadline || undefined,
    attachments: s.attachments || [],
    checklists: s.checklists || [],
    sortOrder: s.sort_order || 0,
    createdBy: s.created_by || '',
    createdAt: s.created_at || '',
    updatedAt: s.updated_at || undefined
});

export const SubtasksProvider: React.FC<SubtasksProviderProps> = ({ children, session }) => {
    const [isSubtasksLoading, setIsSubtasksLoading] = useState(false);
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);

    const fetchAllSubtasks = useCallback(async () => {
        setIsSubtasksLoading(true);
        try {
            const { data, error } = await supabase
                .from('subtasks')
                .select('*')
                .order('sort_order', { ascending: true });

            if (error) {
                console.error('Error fetch subtasks:', error);
                return;
            }

            if (data) {
                setSubtasks(data.map(mapSubtask));
            }
        } finally {
            setIsSubtasksLoading(false);
        }
    }, []);

    const fetchSubtasksByParent = useCallback(async (parentTaskId: string): Promise<Subtask[]> => {
        try {
            const { data, error } = await supabase
                .from('subtasks')
                .select('*')
                .eq('parent_task_id', parentTaskId)
                .order('sort_order', { ascending: true });

            if (error) {
                console.error('Error fetch subtasks for parent:', error);
                return [];
            }

            const mapped = (data || []).map(mapSubtask);
            // Merge into state (replace existing for this parent)
            setSubtasks(prev => {
                const otherSubtasks = prev.filter(s => s.parentTaskId !== parentTaskId);
                return [...otherSubtasks, ...mapped];
            });
            return mapped;
        } catch (err) {
            console.error('Error fetch subtasks:', err);
            return [];
        }
    }, []);

    const clearSubtasks = useCallback(() => {
        setSubtasks([]);
    }, []);

    // Helper: Get subtasks by parent task ID (from local state)
    const getSubtasksByParent = useCallback((parentTaskId: string): Subtask[] => {
        return subtasks
            .filter(s => s.parentTaskId === parentTaskId)
            .sort((a, b) => a.sortOrder - b.sortOrder);
    }, [subtasks]);

    // Helper: Get subtask progress for a parent task
    const getSubtaskProgress = useCallback((parentTaskId: string): { total: number; done: number; percentage: number } => {
        const parentSubtasks = subtasks.filter(s => s.parentTaskId === parentTaskId);
        const total = parentSubtasks.length;
        const done = parentSubtasks.filter(s => s.status === 'Done').length;
        const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
        return { total, done, percentage };
    }, [subtasks]);

    useEffect(() => {
        if (session) {
            fetchAllSubtasks();
        } else {
            clearSubtasks();
        }
    }, [session, fetchAllSubtasks, clearSubtasks]);

    const value: SubtasksContextType = {
        subtasks,
        setSubtasks,
        fetchSubtasksByParent,
        fetchAllSubtasks,
        clearSubtasks,
        isSubtasksLoading,
        getSubtasksByParent,
        getSubtaskProgress
    };

    return (
        <SubtasksContext.Provider value={value}>
            {children}
        </SubtasksContext.Provider>
    );
};

export default SubtasksContext;
