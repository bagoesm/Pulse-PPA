// src/components/DashboardStatsCards.tsx
// Top stats cards for Dashboard with counting animation

import React from 'react';
import { Briefcase, Target, AlertCircle, Award } from 'lucide-react';
import { useCountAnimation } from '../hooks/useCountAnimation';

interface DashboardStatsCardsProps {
    activeTasksCount: number;
    completedTasks: number;
    totalTasks: number;
    urgentCount: number;
    avgCompletionRate: number;
    highPerformers: number;
    onOpenLeaderboard: () => void;
}

const DashboardStatsCards: React.FC<DashboardStatsCardsProps> = ({
    activeTasksCount,
    completedTasks,
    totalTasks,
    urgentCount,
    avgCompletionRate,
    highPerformers,
    onOpenLeaderboard
}) => {
    // Calculate percentages
    const activePercentage = totalTasks > 0 ? Math.round((activeTasksCount / totalTasks) * 100) : 0;
    const completionRate = Math.round(avgCompletionRate);

    // Animated counts with staggered delays
    const animatedActiveTasks = useCountAnimation(activeTasksCount, { duration: 1500, delay: 100 });
    const animatedActivePercentage = useCountAnimation(activePercentage, { duration: 1500, delay: 100 });
    const animatedCompletedTasks = useCountAnimation(completedTasks, { duration: 1500, delay: 250 });
    const animatedCompletionRate = useCountAnimation(completionRate, { duration: 1500, delay: 250 });
    const animatedUrgentCount = useCountAnimation(urgentCount, { duration: 1500, delay: 400 });
    const animatedHighPerformers = useCountAnimation(highPerformers, { duration: 1500, delay: 550 });

    return (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            {/* Active Tasks */}
            <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all transform hover:scale-105">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div className="p-1.5 md:p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <Briefcase size={18} />
                    </div>
                    <span className="text-[10px] md:text-xs font-medium text-slate-500 bg-slate-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full tabular-nums">
                        {animatedActivePercentage}%
                    </span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-0.5 md:mb-1 tabular-nums">
                    {animatedActiveTasks}
                </h3>
                <p className="text-xs md:text-sm text-slate-500">Task Aktif</p>
            </div>

            {/* Completion Rate */}
            <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all transform hover:scale-105">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div className="p-1.5 md:p-2 bg-green-100 text-green-600 rounded-lg">
                        <Target size={18} />
                    </div>
                    <span className="text-[10px] md:text-xs font-medium text-green-600 bg-green-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full tabular-nums">
                        {animatedCompletionRate}%
                    </span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-0.5 md:mb-1 tabular-nums">
                    {animatedCompletedTasks}
                </h3>
                <p className="text-xs md:text-sm text-slate-500">Task Selesai</p>
            </div>

            {/* Urgent Tasks */}
            <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all transform hover:scale-105">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div className="p-1.5 md:p-2 bg-red-100 text-red-600 rounded-lg">
                        <AlertCircle size={18} />
                    </div>
                    <span className="text-[10px] md:text-xs font-medium text-red-600 bg-red-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">
                        Urgent
                    </span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-0.5 md:mb-1 tabular-nums">
                    {animatedUrgentCount}
                </h3>
                <p className="text-xs md:text-sm text-slate-500">Butuh Perhatian</p>
            </div>

            {/* High Performers */}
            <button
                onClick={onOpenLeaderboard}
                className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all hover:scale-105 text-left w-full group"
            >
                <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div className="p-1.5 md:p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-200 transition-colors">
                        <Award size={18} />
                    </div>
                    <span className="text-[10px] md:text-xs font-medium text-purple-600 bg-purple-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full group-hover:bg-purple-100 transition-colors hidden sm:inline">
                        Klik untuk Leaderboard
                    </span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-0.5 md:mb-1 tabular-nums">
                    {animatedHighPerformers}
                </h3>
                <p className="text-xs md:text-sm text-slate-500">High Performers</p>
            </button>
        </div>
    );
};

export default React.memo(DashboardStatsCards);
