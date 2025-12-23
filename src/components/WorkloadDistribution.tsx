// src/components/WorkloadDistribution.tsx
// Workload distribution chart and insights for Dashboard

import React from 'react';
import { Coffee, Zap, AlertTriangle, Flame, Clock, TrendingUp, Users, BarChart3 } from 'lucide-react';
import MotivationCard from './MotivationCard';

interface WorkloadDistributionProps {
    distribution: {
        relaxed: number;
        balanced: number;
        busy: number;
        overload: number;
    };
    avgCompletionRate: number;
    totalUpcomingDeadlines: number;
    totalUsers: number;
}

const WorkloadDistribution: React.FC<WorkloadDistributionProps> = ({
    distribution,
    avgCompletionRate,
    totalUpcomingDeadlines,
    totalUsers
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            {/* Workload Distribution & Insights */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
                <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 md:mb-6 flex items-center gap-2">
                    <BarChart3 size={18} className="text-gov-600" />
                    Distribusi Beban Kerja Tim
                </h3>

                {/* Workload Distribution Chart */}
                <div className="mb-4 md:mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                        <div className="text-center p-3 md:p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                            <div className="w-6 h-6 md:w-8 md:h-8 bg-emerald-500 rounded-full mx-auto mb-1 md:mb-2 flex items-center justify-center">
                                <Coffee size={14} className="text-white" />
                            </div>
                            <span className="block text-lg md:text-2xl font-bold text-emerald-700">{distribution.relaxed}</span>
                            <span className="text-[10px] md:text-xs text-emerald-600 font-medium">Relaxed</span>
                        </div>

                        <div className="text-center p-3 md:p-4 bg-gov-50 rounded-lg border border-gov-100">
                            <div className="w-6 h-6 md:w-8 md:h-8 bg-gov-500 rounded-full mx-auto mb-1 md:mb-2 flex items-center justify-center">
                                <Zap size={14} className="text-white" />
                            </div>
                            <span className="block text-lg md:text-2xl font-bold text-gov-700">{distribution.balanced}</span>
                            <span className="text-[10px] md:text-xs text-gov-600 font-medium">Balanced</span>
                        </div>

                        <div className="text-center p-3 md:p-4 bg-orange-50 rounded-lg border border-orange-100">
                            <div className="w-6 h-6 md:w-8 md:h-8 bg-orange-500 rounded-full mx-auto mb-1 md:mb-2 flex items-center justify-center">
                                <AlertTriangle size={14} className="text-white" />
                            </div>
                            <span className="block text-lg md:text-2xl font-bold text-orange-700">{distribution.busy}</span>
                            <span className="text-[10px] md:text-xs text-orange-600 font-medium">Busy</span>
                        </div>

                        <div className="text-center p-3 md:p-4 bg-red-50 rounded-lg border border-red-100">
                            <div className="w-6 h-6 md:w-8 md:h-8 bg-red-500 rounded-full mx-auto mb-1 md:mb-2 flex items-center justify-center">
                                <Flame size={14} className="text-white" />
                            </div>
                            <span className="block text-lg md:text-2xl font-bold text-red-700">{distribution.overload}</span>
                            <span className="text-[10px] md:text-xs text-red-600 font-medium">Overload</span>
                        </div>
                    </div>
                </div>

                {/* Quick Insights */}
                <div className="border-t border-slate-200 pt-4 md:pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                        <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-orange-50 rounded-lg border border-orange-100">
                            <Clock size={14} className="text-orange-600 flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="text-xs md:text-sm font-bold text-orange-800">{totalUpcomingDeadlines}</p>
                                <p className="text-[10px] md:text-xs text-orange-600 truncate">Deadline 3 hari</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-green-50 rounded-lg border border-green-100">
                            <TrendingUp size={14} className="text-green-600 flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="text-xs md:text-sm font-bold text-green-800">{avgCompletionRate.toFixed(1)}%</p>
                                <p className="text-[10px] md:text-xs text-green-600 truncate">Completion rate</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <Users size={14} className="text-blue-600 flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="text-xs md:text-sm font-bold text-blue-800">{totalUsers}</p>
                                <p className="text-[10px] md:text-xs text-blue-600 truncate">Anggota tim</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Motivation Card */}
            <MotivationCard />
        </div>
    );
};

export default React.memo(WorkloadDistribution);
