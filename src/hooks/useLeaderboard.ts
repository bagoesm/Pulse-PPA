// src/hooks/useLeaderboard.ts
// Leaderboard state and logic for Dashboard

import { useState, useMemo, useCallback } from 'react';
import { Task, User, Status, Priority } from '../../types';
import { AnalyzedUser, WorkloadVisuals } from './useWorkloadAnalysis';
import { Coffee, Zap, AlertTriangle, Flame } from 'lucide-react';

type LeaderboardPeriod = 'week' | 'month' | 'all';

interface UseLeaderboardProps {
    users: User[];
    tasks: Task[];
}

export function useLeaderboard({ users, tasks }: UseLeaderboardProps) {
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>('month');

    // Fungsi untuk mendapatkan range tanggal leaderboard
    const getLeaderboardDateRange = useCallback((period: LeaderboardPeriod) => {
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        switch (period) {
            case 'week':
                const startOfWeek = new Date(startOfToday);
                startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                return { start: startOfWeek, end: endOfWeek };
            case 'month':
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                endOfMonth.setHours(23, 59, 59, 999);
                return { start: startOfMonth, end: endOfMonth };
            default:
                return null;
        }
    }, []);

    // Fungsi untuk filter tasks berdasarkan periode leaderboard
    const getLeaderboardFilteredTasks = useCallback((userTasks: Task[], period: LeaderboardPeriod) => {
        const dateRange = getLeaderboardDateRange(period);
        if (!dateRange) return userTasks;

        return userTasks.filter(task => {
            let taskDate: Date;

            if (task.status === Status.Done) {
                taskDate = new Date(task.deadline);
            } else {
                taskDate = new Date(task.startDate);
            }

            return taskDate >= dateRange.start && taskDate <= dateRange.end;
        });
    }, [getLeaderboardDateRange]);

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
        score += Math.min(userData.completionRate * 0.4, 40);
        score += Math.min(userData.performanceScore * 3, 30);
        if (userData.completedCount > 0) score += 10;
        if (userData.activeCount > 0) score += 10;
        if (userData.completedCount >= 3) score += 5;
        if (userData.upcomingDeadlines === 0) score += 5;
        return Math.round(score);
    }, []);

    // Data untuk leaderboard dengan periode terpisah
    const leaderboardData = useMemo((): AnalyzedUser[] => {
        return users.map(u => {
            const userTasks = tasks.filter(t => Array.isArray(t.pic) ? t.pic.includes(u.name) : t.pic === u.name);
            const filteredTasks = getLeaderboardFilteredTasks(userTasks, leaderboardPeriod);

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

            const allActive = userTasks.filter(t => t.status !== Status.Done);
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

            const visuals = getWorkloadVisuals(score);

            const userData = {
                user: u,
                userName: u.name,
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
                allTimeCompleted: userTasks.filter(t => t.status === Status.Done).length,
                allTimeTotal: userTasks.length,
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
    }, [users, tasks, leaderboardPeriod, getLeaderboardFilteredTasks, getWorkloadVisuals, calculateHighPerformerScore]);

    return {
        isLeaderboardOpen,
        setIsLeaderboardOpen,
        leaderboardPeriod,
        setLeaderboardPeriod,
        leaderboardData,
        getLeaderboardDateRange
    };
}
