// src/hooks/useProjectStats.ts
// Hook for managing project statistics and workload calculations

import { useState, useCallback, useRef } from 'react';
import { Task, Status, Priority } from '../../types';

interface ProjectStats {
    total: number;
    completed: number;
    progress: number;
    team: string[];
    documents: number;
    projectTasks: Task[];
}

interface UseProjectStatsProps {
    fetchProjectTasks: (projectId: string, filters: any) => Promise<any>;
}

interface WorkloadBreakdown {
    urgentCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
}

interface MemberWorkload {
    workloadPoints: number;
    taskCount: number;
    breakdown: WorkloadBreakdown;
}

interface WorkloadLabel {
    label: string;
    color: string;
    description: string;
}

export interface UseProjectStatsResult {
    projectStatsCache: Record<string, ProjectStats>;
    loadingStats: Record<string, boolean>;
    getProjectStats: (projectId: string) => Promise<ProjectStats>;
    getMemberWorkloadInProject: (pic: string, projectTasks: Task[]) => MemberWorkload;
    getWorkloadLabel: (points: number, taskCount: number) => WorkloadLabel;
    clearStatsCache: (projectId?: string) => void;
}

export function useProjectStats({ fetchProjectTasks }: UseProjectStatsProps): UseProjectStatsResult {
    const [projectStatsCache, setProjectStatsCache] = useState<Record<string, ProjectStats>>({});
    const [loadingStats, setLoadingStats] = useState<Record<string, boolean>>({});
    const loadingRef = useRef<Record<string, boolean>>({});

    const getProjectStats = useCallback(async (projectId: string): Promise<ProjectStats> => {
        // Return cached stats if available
        if (projectStatsCache[projectId]) {
            return projectStatsCache[projectId];
        }

        // Skip if already loading
        if (loadingRef.current[projectId]) {
            return { total: 0, completed: 0, progress: 0, team: [], documents: 0, projectTasks: [] };
        }

        // Mark as loading
        loadingRef.current[projectId] = true;
        setLoadingStats(prev => ({ ...prev, [projectId]: true }));

        try {
            const result = await fetchProjectTasks(projectId, { limit: 1000 });
            const projectTasks = result.tasks || [];

            const total = projectTasks.length;
            const completed = projectTasks.filter(t => t.status === Status.Done).length;
            const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
            const team = Array.from(new Set(
                projectTasks.flatMap(t => Array.isArray(t.pic) ? t.pic : [t.pic]).filter(Boolean)
            )) as string[];
            const documents = projectTasks.flatMap(t => t.attachments || []).length;

            const stats: ProjectStats = { total, completed, progress, team, documents, projectTasks };

            setProjectStatsCache(prev => ({ ...prev, [projectId]: stats }));
            return stats;
        } catch (error) {
            console.error(`Error fetching project stats for ${projectId}:`, error);
            const emptyStats: ProjectStats = { total: 0, completed: 0, progress: 0, team: [], documents: 0, projectTasks: [] };
            setProjectStatsCache(prev => ({ ...prev, [projectId]: emptyStats }));
            return emptyStats;
        } finally {
            loadingRef.current[projectId] = false;
            setLoadingStats(prev => ({ ...prev, [projectId]: false }));
        }
    }, [fetchProjectTasks, projectStatsCache]);

    const getMemberWorkloadInProject = useCallback((pic: string, projectTasks: Task[]): MemberWorkload => {
        const active = projectTasks.filter(t =>
            (Array.isArray(t.pic) ? t.pic.includes(pic) : t.pic === pic) && t.status !== Status.Done
        );

        let workloadPoints = 0;
        let urgentCount = 0;
        let highCount = 0;
        let mediumCount = 0;
        let lowCount = 0;

        active.forEach(t => {
            if (t.priority === Priority.Urgent) {
                workloadPoints += 4;
                urgentCount++;
            } else if (t.priority === Priority.High) {
                workloadPoints += 3;
                highCount++;
            } else if (t.priority === Priority.Medium) {
                workloadPoints += 2;
                mediumCount++;
            } else {
                workloadPoints += 1;
                lowCount++;
            }
        });

        return {
            workloadPoints,
            taskCount: active.length,
            breakdown: { urgentCount, highCount, mediumCount, lowCount }
        };
    }, []);

    const getWorkloadLabel = useCallback((points: number, taskCount: number): WorkloadLabel => {
        if (points === 0) return {
            label: 'Tidak Ada Tugas',
            color: 'bg-slate-100 text-slate-500',
            description: 'Tidak ada task aktif'
        };
        if (points <= 3) return {
            label: 'Ringan',
            color: 'bg-emerald-100 text-emerald-700',
            description: `${taskCount} task (${points} poin)`
        };
        if (points <= 8) return {
            label: 'Sedang',
            color: 'bg-blue-100 text-blue-700',
            description: `${taskCount} task (${points} poin)`
        };
        if (points <= 15) return {
            label: 'Berat',
            color: 'bg-orange-100 text-orange-700',
            description: `${taskCount} task (${points} poin)`
        };
        return {
            label: 'Sangat Berat',
            color: 'bg-red-100 text-red-700',
            description: `${taskCount} task (${points} poin)`
        };
    }, []);

    const clearStatsCache = useCallback((projectId?: string) => {
        if (projectId) {
            setProjectStatsCache(prev => {
                const newCache = { ...prev };
                delete newCache[projectId];
                return newCache;
            });
            loadingRef.current[projectId] = false;
            setLoadingStats(prev => ({ ...prev, [projectId]: false }));
        } else {
            setProjectStatsCache({});
            loadingRef.current = {};
            setLoadingStats({});
        }
    }, []);

    return {
        projectStatsCache,
        loadingStats,
        getProjectStats,
        getMemberWorkloadInProject,
        getWorkloadLabel,
        clearStatsCache
    };
}
