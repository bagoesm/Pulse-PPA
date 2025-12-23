// src/contexts/TasksContext.tsx
// Domain context for Tasks, Comments, and Task Activities
import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Task, Comment, TaskActivity, Attachment, Status, Category, Priority, Meeting } from '../../types';

interface TasksContextType {
    // Tasks
    tasks: Task[];
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;

    // Comments
    comments: Comment[];
    setComments: React.Dispatch<React.SetStateAction<Comment[]>>;

    // Task Activities
    taskActivities: TaskActivity[];
    setTaskActivities: React.Dispatch<React.SetStateAction<TaskActivity[]>>;

    // Computed: All unique PICs from tasks
    allUniquePics: string[];

    // Fetch operations
    fetchTasks: (usersData?: any[]) => Promise<void>;
    fetchComments: () => Promise<void>;
    fetchTaskActivities: () => Promise<void>;
    clearTasks: () => void;
    isTasksLoading: boolean;

    // Helper: Convert meetings to tasks (for unified view)
    getMeetingsAsTasks: (meetings: Meeting[]) => Task[];
    getFilteredTasks: (
        allTasksWithMeetings: Task[],
        debouncedSearch: string,
        filters: { category: string; pic: string; priority: string; status: string; projectId: string },
        activeTab: string
    ) => Task[];
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const useTasks = () => {
    const context = useContext(TasksContext);
    if (!context) {
        throw new Error('useTasks must be used within a TasksProvider');
    }
    return context;
};

interface TasksProviderProps {
    children: ReactNode;
    session: any;
}

export const TasksProvider: React.FC<TasksProviderProps> = ({ children, session }) => {
    const [isTasksLoading, setIsTasksLoading] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [taskActivities, setTaskActivities] = useState<TaskActivity[]>([]);

    // Computed: All unique PICs from tasks
    const allUniquePics = useMemo(() => {
        const picSet = new Set<string>();
        tasks.forEach(task => {
            const taskPics = Array.isArray(task.pic) ? task.pic : [task.pic];
            taskPics.forEach(pic => {
                if (pic && pic.trim()) {
                    picSet.add(pic);
                }
            });
        });
        return Array.from(picSet).sort();
    }, [tasks]);

    // Helper: Convert Meetings to Tasks (for unified view)
    const getMeetingsAsTasks = useCallback((meetings: Meeting[]): Task[] => {
        return meetings.map(meeting => {
            let taskStatus: Status;
            switch (meeting.status) {
                case 'scheduled': taskStatus = Status.ToDo; break;
                case 'ongoing': taskStatus = Status.InProgress; break;
                case 'completed':
                case 'cancelled': taskStatus = Status.Done; break;
                default: taskStatus = Status.ToDo;
            }

            const typeLabels: Record<string, string> = {
                internal: 'Internal Kementerian',
                external: 'Eksternal Kementerian',
                bimtek: 'Bimtek',
                audiensi: 'Audiensi'
            };

            return {
                id: `meeting_${meeting.id}`,
                title: meeting.title,
                category: Category.AudiensiRapat,
                subCategory: typeLabels[meeting.type] || meeting.type,
                startDate: meeting.date,
                deadline: meeting.date,
                pic: meeting.pic,
                priority: Priority.Medium,
                status: taskStatus,
                description: meeting.description || '',
                createdBy: meeting.createdBy,
                projectId: meeting.projectId,
                attachments: meeting.attachments || [],
                links: [],
                isMeeting: true,
                meetingId: meeting.id
            };
        });
    }, []);

    // Helper: Get filtered tasks based on filters
    const getFilteredTasks = useCallback((
        allTasksWithMeetings: Task[],
        debouncedSearch: string,
        filters: { category: string; pic: string; priority: string; status: string; projectId: string },
        activeTab: string
    ): Task[] => {
        return allTasksWithMeetings.filter(task => {
            const taskPics = Array.isArray(task.pic) ? task.pic : [task.pic];
            const searchLower = debouncedSearch.toLowerCase();
            const matchesSearch = !debouncedSearch ||
                task.title?.toLowerCase().includes(searchLower) ||
                taskPics.some(pic => pic?.toLowerCase().includes(searchLower)) ||
                task.description?.toLowerCase().includes(searchLower);
            const matchesCategory = filters.category === 'All' || task.category === filters.category;
            const matchesPic = filters.pic === 'All' || taskPics.includes(filters.pic);
            const matchesPriority = filters.priority === 'All' || task.priority === filters.priority;
            const matchesStatus = filters.status === 'All' || task.status === filters.status;
            const matchesProject = filters.projectId === 'All' || task.projectId === filters.projectId;
            const matchesSidebar = activeTab === 'Semua Task' || activeTab === 'Dashboard' || task.category === activeTab;

            return matchesSearch && matchesCategory && matchesPic && matchesPriority && matchesStatus && matchesSidebar && matchesProject;
        });
    }, []);

    const fetchTasks = useCallback(async (usersData?: any[]) => {
        setIsTasksLoading(true);
        try {
            const { data: tasksData, error: tasksErr } = await supabase.from('tasks').select('*');
            if (tasksErr) console.error('Error fetch tasks:', tasksErr);

            // If usersData is not provided, fetch profiles to map createdBy names
            let profiles = usersData;
            if (!profiles && tasksData && tasksData.length > 0) {
                const { data: profilesData } = await supabase.from('profiles').select('id, name');
                if (profilesData) {
                    profiles = profilesData;
                }
            }

            if (tasksData) {
                const tasksWithFiles = await Promise.all(
                    tasksData.map(async (t: any) => {
                        const rawAttachments = Array.isArray(t.attachments) ? t.attachments : [];

                        const attachments = await Promise.all(rawAttachments.map(async (file: any) => {
                            const path = file?.path ?? file?.storage_path ?? null;
                            let url: string | null = null;

                            if (path && typeof path === 'string' && path.length > 0) {
                                try {
                                    const { data: signedData, error: signedErr } = await supabase
                                        .storage
                                        .from('attachment')
                                        .createSignedUrl(path, 60 * 60);
                                    if (!signedErr) url = signedData?.signedUrl ?? null;
                                } catch (e) {
                                    console.warn('Signed URL exception for', path, e);
                                }
                            }

                            return {
                                id: file?.id ?? `tmp_${Math.random().toString(36).slice(2, 8)}`,
                                name: file?.name ?? file?.filename ?? 'unknown',
                                size: typeof file?.size === 'number' ? file.size : Number(file?.file_size) || 0,
                                type: file?.type ?? file?.mime ?? '',
                                path: path,
                                url
                            } as Attachment;
                        }));

                        const safe = (val: any) => (typeof val === 'string' ? val : val ?? '');
                        const createdByUserId = t.created_by_id || t.created_by || t.createdBy;
                        let createdByName = 'Unknown';

                        if (createdByUserId && profiles) {
                            const creator = profiles.find((u: any) => u.id === createdByUserId);
                            if (creator) createdByName = creator.name;
                        }

                        const links = Array.isArray(t.links) ? t.links : [];

                        return {
                            ...t,
                            subCategory: safe(t.sub_category) || safe(t.subCategory) || '',
                            startDate: t.start_date || t.startDate || new Date().toISOString().split('T')[0],
                            projectId: t.project_id || t.projectId || null,
                            createdBy: createdByName,
                            deadline: t.deadline || (t.deadline_at || null),
                            attachments,
                            links
                        } as Task;
                    })
                );
                setTasks(tasksWithFiles);
            }
        } finally {
            setIsTasksLoading(false);
        }
    }, []);

    const fetchComments = useCallback(async () => {
        const { data: commentsData } = await supabase.from('task_comments').select('*');
        if (commentsData) {
            const mappedComments = commentsData.map((c: any) => ({
                id: c.id,
                taskId: c.task_id,
                userId: c.user_id,
                userName: c.user_name,
                content: c.content,
                createdAt: c.created_at,
                updatedAt: c.updated_at
            }));
            setComments(mappedComments);
        }
    }, []);

    const fetchTaskActivities = useCallback(async () => {
        const { data: activitiesData } = await supabase
            .from('task_activities')
            .select('*')
            .order('created_at', { ascending: false });
        if (activitiesData) {
            const mappedActivities = activitiesData.map((a: any) => ({
                id: a.id,
                taskId: a.task_id,
                userId: a.user_id,
                userName: a.user_name,
                actionType: a.action_type,
                oldValue: a.old_value,
                newValue: a.new_value,
                createdAt: a.created_at
            }));
            setTaskActivities(mappedActivities);
        }
    }, []);

    const clearTasks = useCallback(() => {
        setTasks([]);
        setComments([]);
        setTaskActivities([]);
    }, []);

    useEffect(() => {
        if (session) {
            fetchTasks();
            fetchComments();
            fetchTaskActivities();
        } else {
            clearTasks();
        }
    }, [session, fetchTasks, fetchComments, fetchTaskActivities, clearTasks]);

    const value: TasksContextType = {
        tasks,
        setTasks,
        comments,
        setComments,
        taskActivities,
        setTaskActivities,
        allUniquePics,
        fetchTasks,
        fetchComments,
        fetchTaskActivities,
        clearTasks,
        isTasksLoading,
        getMeetingsAsTasks,
        getFilteredTasks
    };

    return (
        <TasksContext.Provider value={value}>
            {children}
        </TasksContext.Provider>
    );
};

export default TasksContext;
