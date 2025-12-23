// src/hooks/useWorkloadAnalysis.ts
// Workload calculation logic for Dashboard

import { useMemo, useCallback } from 'react';
import { Task, User, Status, Priority } from '../../types';
import { Coffee, Zap, AlertTriangle, Flame, LucideIcon } from 'lucide-react';
import { WorkloadFilter } from './useDashboardFilters';

export interface WorkloadAnalysis {
    score: number;
    activeCount: number;
    completedCount: number;
    totalTasks: number;
    urgentCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    upcomingDeadlines: number;
    completionRate: number;
    performanceScore: number;
    avgCompletionTime: number;
    details: Task[];
    allTimeCompleted: number;
    allTimeTotal: number;
}

export interface WorkloadVisuals {
    label: string;
    color: string;
    textColor: string;
    bg: string;
    icon: LucideIcon;
    message: string;
    category: WorkloadFilter;
}

export interface AnalyzedUser {
    user: User;
    userName: string;
    score: number;
    activeCount: number;
    completedCount: number;
    totalTasks: number;
    urgentCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    upcomingDeadlines: number;
    completionRate: number;
    performanceScore: number;
    avgCompletionTime: number;
    details: Task[];
    allTimeCompleted: number;
    allTimeTotal: number;
    visuals: WorkloadVisuals;
    highPerformerScore: number;
    isHighPerformer: boolean;
}

interface UseWorkloadAnalysisProps {
    users: User[];
    tasks: Task[];
    getFilteredTasksByDate: (tasks: Task[]) => Task[];
}

export function useWorkloadAnalysis({ users, tasks, getFilteredTasksByDate }: UseWorkloadAnalysisProps) {

    const getWorkloadAnalysis = useCallback((userTasks: Task[], allUserTasks: Task[]): WorkloadAnalysis => {
        const filteredTasks = getFilteredTasksByDate(userTasks);

        const active = filteredTasks.filter(t => t.status !== Status.Done);
        const completed = filteredTasks.filter(t => t.status === Status.Done);

        let score = 0;
        let urgentCount = 0, highCount = 0, mediumCount = 0, lowCount = 0;

        active.forEach(t => {
            if (t.priority === Priority.Urgent) { score += 4; urgentCount++; }
            else if (t.priority === Priority.High) { score += 3; highCount++; }
            else if (t.priority === Priority.Medium) { score += 2; mediumCount++; }
            else { score += 1; lowCount++; }
        });

        // Hitung deadline yang mendekat (dalam 3 hari)
        const allActive = allUserTasks.filter(t => t.status !== Status.Done);
        const upcomingDeadlines = allActive.filter(t => {
            const deadline = new Date(t.deadline);
            const today = new Date();
            const diffTime = deadline.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 3 && diffDays >= 0;
        }).length;

        const completionRate = filteredTasks.length > 0 ? (completed.length / filteredTasks.length) * 100 : 0;

        const performanceScore = completed.reduce((sum, task) => {
            if (task.priority === Priority.Urgent) return sum + 4;
            if (task.priority === Priority.High) return sum + 3;
            if (task.priority === Priority.Medium) return sum + 2;
            return sum + 1;
        }, 0);

        const avgCompletionTime = completed.length > 0 ?
            completed.reduce((sum, task) => {
                const start = new Date(task.startDate);
                const end = new Date(task.deadline);
                const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                return sum + Math.max(1, days);
            }, 0) / completed.length : 0;

        return {
            score,
            activeCount: active.length,
            completedCount: completed.length,
            totalTasks: filteredTasks.length,
            urgentCount,
            highCount,
            mediumCount,
            lowCount,
            upcomingDeadlines,
            completionRate,
            performanceScore,
            avgCompletionTime,
            details: active,
            allTimeCompleted: allUserTasks.filter(t => t.status === Status.Done).length,
            allTimeTotal: allUserTasks.length
        };
    }, [getFilteredTasksByDate]);

    const getWorkloadVisuals = useCallback((score: number): WorkloadVisuals => {
        if (score === 0) return {
            label: 'Idle',
            color: 'bg-slate-400',
            textColor: 'text-slate-700',
            bg: 'bg-slate-50',
            icon: Coffee,
            message: 'Tidak ada tugas aktif',
            category: 'relaxed'
        };
        if (score < 6) return {
            label: 'Relaxed',
            color: 'bg-emerald-500',
            textColor: 'text-emerald-700',
            bg: 'bg-emerald-50',
            icon: Coffee,
            message: 'Beban kerja ringan',
            category: 'relaxed'
        };
        if (score < 15) return {
            label: 'Balanced',
            color: 'bg-gov-500',
            textColor: 'text-gov-700',
            bg: 'bg-gov-50',
            icon: Zap,
            message: 'Beban kerja seimbang',
            category: 'balanced'
        };
        if (score < 25) return {
            label: 'Busy',
            color: 'bg-orange-500',
            textColor: 'text-orange-700',
            bg: 'bg-orange-50',
            icon: AlertTriangle,
            message: 'Cukup sibuk',
            category: 'busy'
        };
        return {
            label: 'Overload',
            color: 'bg-red-500',
            textColor: 'text-red-700',
            bg: 'bg-red-50',
            icon: Flame,
            message: 'Butuh bantuan segera',
            category: 'overload'
        };
    }, []);

    const calculateHighPerformerScore = useCallback((userData: {
        completionRate: number;
        performanceScore: number;
        completedCount: number;
        activeCount: number;
        upcomingDeadlines: number;
    }) => {
        let score = 0;

        // Poin dari completion rate (max 40 poin)
        score += Math.min(userData.completionRate * 0.4, 40);

        // Poin dari performance score (max 30 poin)
        score += Math.min(userData.performanceScore * 3, 30);

        // Poin dari aktivitas (max 20 poin)
        if (userData.completedCount > 0) score += 10;
        if (userData.activeCount > 0) score += 10;

        // Poin dari konsistensi (max 10 poin)
        if (userData.completedCount >= 3) score += 5;
        if (userData.upcomingDeadlines === 0) score += 5;

        return Math.round(score);
    }, []);

    // Analisis data users dengan workload
    const analyzedUsers = useMemo((): AnalyzedUser[] => {
        return users.map(u => {
            const userTasks = tasks.filter(t => Array.isArray(t.pic) ? t.pic.includes(u.name) : t.pic === u.name);
            const analysis = getWorkloadAnalysis(userTasks, userTasks);
            const visuals = getWorkloadVisuals(analysis.score);
            const userData = {
                user: u,
                userName: u.name,
                ...analysis,
                visuals
            };

            const highPerformerScore = calculateHighPerformerScore(userData);
            const isHighPerformer = highPerformerScore >= 60;

            return {
                ...userData,
                highPerformerScore,
                isHighPerformer
            };
        });
    }, [users, tasks, getWorkloadAnalysis, getWorkloadVisuals, calculateHighPerformerScore]);

    // Stats untuk dashboard
    const dashboardStats = useMemo(() => {
        const workloadDistribution = {
            relaxed: analyzedUsers.filter(u => u.visuals.category === 'relaxed').length,
            balanced: analyzedUsers.filter(u => u.visuals.category === 'balanced').length,
            busy: analyzedUsers.filter(u => u.visuals.category === 'busy').length,
            overload: analyzedUsers.filter(u => u.visuals.category === 'overload').length,
        };

        const avgCompletionRate = analyzedUsers.length > 0
            ? analyzedUsers.reduce((sum, u) => sum + u.completionRate, 0) / analyzedUsers.length
            : 0;
        const totalUpcomingDeadlines = analyzedUsers.reduce((sum, u) => sum + u.upcomingDeadlines, 0);
        const highPerformers = analyzedUsers.filter(u => u.isHighPerformer).length;

        return {
            workloadDistribution,
            avgCompletionRate,
            totalUpcomingDeadlines,
            highPerformers
        };
    }, [analyzedUsers]);

    return {
        analyzedUsers,
        dashboardStats,
        getWorkloadAnalysis,
        getWorkloadVisuals,
        calculateHighPerformerScore
    };
}
