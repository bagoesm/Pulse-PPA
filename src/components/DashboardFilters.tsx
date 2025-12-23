// src/components/DashboardFilters.tsx
// Filter section for Dashboard

import React from 'react';
import { Search, Calendar, Filter, BarChart3, ChevronDown, Users } from 'lucide-react';
import { WorkloadFilter, SortOption, DateFilter } from '../hooks/useDashboardFilters';

interface DashboardFiltersProps {
    // Filter state
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    workloadFilter: WorkloadFilter;
    setWorkloadFilter: (value: WorkloadFilter) => void;
    sortBy: SortOption;
    setSortBy: (value: SortOption) => void;
    dateFilter: DateFilter;
    setDateFilter: (value: DateFilter) => void;
    customStartDate: string;
    setCustomStartDate: (value: string) => void;
    customEndDate: string;
    setCustomEndDate: (value: string) => void;
    // Display info
    visibleCount: number;
    filteredCount: number;
    totalCount: number;
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
    searchTerm,
    setSearchTerm,
    workloadFilter,
    setWorkloadFilter,
    sortBy,
    setSortBy,
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    visibleCount,
    filteredCount,
    totalCount
}) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 mb-4 md:mb-6">
            <div className="flex flex-col gap-4">
                <div>
                    <h3 className="text-base md:text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                        <Users size={18} className="text-gov-600" />
                        <span className="hidden sm:inline">Analisis Tim ({visibleCount} dari {filteredCount} ditampilkan, {totalCount} total)</span>
                        <span className="sm:hidden">Tim ({visibleCount}/{totalCount})</span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs md:text-sm text-slate-500 hidden sm:block">Pantau beban kerja dan performa setiap anggota tim</p>
                        {dateFilter !== 'all' && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-gov-50 text-gov-700 rounded-full text-[10px] md:text-xs font-medium">
                                <Calendar size={10} />
                                <span>
                                    {dateFilter === 'today' && 'Hari Ini'}
                                    {dateFilter === 'week' && 'Minggu Ini'}
                                    {dateFilter === 'month' && 'Bulan Ini'}
                                    {dateFilter === 'custom' && customStartDate && customEndDate &&
                                        `${new Date(customStartDate).toLocaleDateString('id-ID')} - ${new Date(customEndDate).toLocaleDateString('id-ID')}`
                                    }
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-3 w-full">
                    {/* Row 1: Search dan Date Filter */}
                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Cari nama..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm w-full"
                            />
                        </div>

                        {/* Date Filter */}
                        <div className="relative">
                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                                className="pl-9 pr-6 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm bg-white appearance-none cursor-pointer w-full sm:w-auto"
                            >
                                <option value="all">Semua Periode</option>
                                <option value="today">Hari Ini</option>
                                <option value="week">Minggu Ini</option>
                                <option value="month">Bulan Ini</option>
                                <option value="custom">Custom</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Custom Date Range (jika dipilih) */}
                    {dateFilter === 'custom' && (
                        <div className="flex flex-col sm:flex-row gap-2 md:gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex-1">
                                <label className="block text-[10px] md:text-xs font-medium text-slate-600 mb-1">Dari</label>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="w-full px-2 md:px-3 py-1.5 md:py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] md:text-xs font-medium text-slate-600 mb-1">Sampai</label>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="w-full px-2 md:px-3 py-1.5 md:py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {/* Row 2: Workload Filter dan Sort */}
                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                        {/* Workload Filter */}
                        <div className="relative flex-1 sm:flex-none">
                            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select
                                value={workloadFilter}
                                onChange={(e) => setWorkloadFilter(e.target.value as WorkloadFilter)}
                                className="pl-9 pr-6 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm bg-white appearance-none cursor-pointer w-full"
                            >
                                <option value="all">Semua Beban</option>
                                <option value="relaxed">Relaxed</option>
                                <option value="balanced">Balanced</option>
                                <option value="busy">Busy</option>
                                <option value="overload">Overload</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        {/* Sort */}
                        <div className="relative flex-1 sm:flex-none">
                            <BarChart3 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                className="pl-9 pr-6 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm bg-white appearance-none cursor-pointer w-full"
                            >
                                <option value="workload">Beban Kerja</option>
                                <option value="performance">Performa</option>
                                <option value="name">Nama</option>
                                <option value="tasks">Jumlah Task</option>
                                <option value="urgent">Task Urgent</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(DashboardFilters);
