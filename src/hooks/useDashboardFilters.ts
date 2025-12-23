// src/hooks/useDashboardFilters.ts
// Filter and sort state management for Dashboard

import { useState, useEffect, useMemo } from 'react';
import { Task, Status } from '../../types';

export type WorkloadFilter = 'all' | 'relaxed' | 'balanced' | 'busy' | 'overload';
export type SortOption = 'workload' | 'name' | 'tasks' | 'urgent' | 'performance';
export type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

const USERS_PER_PAGE = 12;

interface UseDashboardFiltersResult {
    // Filter state
    searchTerm: string;
    setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    workloadFilter: WorkloadFilter;
    setWorkloadFilter: React.Dispatch<React.SetStateAction<WorkloadFilter>>;
    sortBy: SortOption;
    setSortBy: React.Dispatch<React.SetStateAction<SortOption>>;
    dateFilter: DateFilter;
    setDateFilter: React.Dispatch<React.SetStateAction<DateFilter>>;
    customStartDate: string;
    setCustomStartDate: React.Dispatch<React.SetStateAction<string>>;
    customEndDate: string;
    setCustomEndDate: React.Dispatch<React.SetStateAction<string>>;
    displayedUsers: number;
    setDisplayedUsers: React.Dispatch<React.SetStateAction<number>>;

    // Utility functions
    getDateRange: () => { start: Date; end: Date } | null;
    getFilteredTasksByDate: (userTasks: Task[]) => Task[];

    // Constants
    USERS_PER_PAGE: number;
}

export function useDashboardFilters(): UseDashboardFiltersResult {
    // State untuk filtering dan searching
    const [searchTerm, setSearchTerm] = useState('');
    const [workloadFilter, setWorkloadFilter] = useState<WorkloadFilter>('all');
    const [sortBy, setSortBy] = useState<SortOption>('workload');
    const [displayedUsers, setDisplayedUsers] = useState(USERS_PER_PAGE);

    // State untuk filter tanggal
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    // Reset displayed users saat filter berubah
    useEffect(() => {
        setDisplayedUsers(USERS_PER_PAGE);
    }, [searchTerm, workloadFilter, sortBy, dateFilter, customStartDate, customEndDate]);

    // Fungsi untuk mendapatkan range tanggal berdasarkan filter
    const getDateRange = () => {
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        switch (dateFilter) {
            case 'today':
                return {
                    start: startOfToday,
                    end: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1)
                };
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
            case 'custom':
                if (customStartDate && customEndDate) {
                    const start = new Date(customStartDate);
                    const end = new Date(customEndDate);
                    end.setHours(23, 59, 59, 999);
                    return { start, end };
                }
                return null;
            default:
                return null;
        }
    };

    // Filter tasks berdasarkan tanggal
    const getFilteredTasksByDate = (userTasks: Task[]) => {
        const dateRange = getDateRange();
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
    };

    return {
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
        displayedUsers,
        setDisplayedUsers,
        getDateRange,
        getFilteredTasksByDate,
        USERS_PER_PAGE
    };
}
