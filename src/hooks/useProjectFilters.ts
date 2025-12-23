// src/hooks/useProjectFilters.ts
// Hook for managing project and task filters state

import { useState, useEffect, useCallback } from 'react';
import { Status, Priority, ProjectStatus } from '../../types';

export interface UseProjectFiltersResult {
    // Project filters
    projectSearch: string;
    setProjectSearch: (value: string) => void;
    debouncedSearch: string;
    projectStatusFilter: ProjectStatus | 'All';
    setProjectStatusFilter: (value: ProjectStatus | 'All') => void;
    managerFilter: string | 'All';
    setManagerFilter: (value: string | 'All') => void;
    projectPage: number;
    setProjectPage: (value: number | ((prev: number) => number)) => void;

    // Task filters
    taskSearch: string;
    setTaskSearch: (value: string) => void;
    statusFilter: Status | 'All';
    setStatusFilter: (value: Status | 'All') => void;
    priorityFilter: Priority | 'All';
    setPriorityFilter: (value: Priority | 'All') => void;
    picFilter: string | 'All';
    setPicFilter: (value: string | 'All') => void;
    currentPage: number;
    setCurrentPage: (value: number | ((prev: number) => number)) => void;

    // Links pagination
    linksPage: number;
    setLinksPage: (value: number | ((prev: number) => number)) => void;

    // Selected project
    selectedProjectId: string | null;
    setSelectedProjectId: (value: string | null) => void;

    // Actions
    resetProjectFilters: () => void;
    resetTaskFilters: () => void;
}

const DEBOUNCE_MS = 300;

export function useProjectFilters(): UseProjectFiltersResult {
    // Project filters
    const [projectSearch, setProjectSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [projectStatusFilter, setProjectStatusFilter] = useState<ProjectStatus | 'All'>('All');
    const [managerFilter, setManagerFilter] = useState<string | 'All'>('All');
    const [projectPage, setProjectPage] = useState(1);

    // Task filters
    const [taskSearch, setTaskSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
    const [priorityFilter, setPriorityFilter] = useState<Priority | 'All'>('All');
    const [picFilter, setPicFilter] = useState<string | 'All'>('All');
    const [currentPage, setCurrentPage] = useState(1);

    // Links pagination
    const [linksPage, setLinksPage] = useState(1);

    // Selected project
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    // Debounce project search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(projectSearch);
        }, DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [projectSearch]);

    // Reset project page when filters change
    useEffect(() => {
        setProjectPage(1);
    }, [debouncedSearch, projectStatusFilter, managerFilter]);

    // Reset task page when filters change
    useEffect(() => {
        setCurrentPage(1);
        setLinksPage(1);
    }, [selectedProjectId, taskSearch, statusFilter, priorityFilter, picFilter]);

    const resetProjectFilters = useCallback(() => {
        setProjectSearch('');
        setProjectStatusFilter('All');
        setManagerFilter('All');
    }, []);

    const resetTaskFilters = useCallback(() => {
        setTaskSearch('');
        setStatusFilter('All');
        setPriorityFilter('All');
        setPicFilter('All');
    }, []);

    return {
        // Project filters
        projectSearch,
        setProjectSearch,
        debouncedSearch,
        projectStatusFilter,
        setProjectStatusFilter,
        managerFilter,
        setManagerFilter,
        projectPage,
        setProjectPage,

        // Task filters
        taskSearch,
        setTaskSearch,
        statusFilter,
        setStatusFilter,
        priorityFilter,
        setPriorityFilter,
        picFilter,
        setPicFilter,
        currentPage,
        setCurrentPage,

        // Links pagination
        linksPage,
        setLinksPage,

        // Selected project
        selectedProjectId,
        setSelectedProjectId,

        // Actions
        resetProjectFilters,
        resetTaskFilters
    };
}
