// src/contexts/DataContext.tsx
// BACKWARD COMPATIBLE aggregate context that composes all domain-specific contexts
// @deprecated Use domain-specific hooks instead:
// - useUsers() for user data
// - useTasks() for task data  
// - useProjects() for project data
// - useEpics() for epic data
// - useMeetings() for meeting data
// - useMasterData() for master data
// - useAppContent() for feedbacks, templates, announcements, etc.

import React, { ReactNode, useMemo, useCallback } from 'react';
import { useUsers } from './UsersContext';
import { useTasks } from './TasksContext';
import { useProjects } from './ProjectsContext';
import { useEpics } from './EpicsContext';
import { useMeetings } from './MeetingsContext';
import { useMasterData } from './MasterDataContext';
import { useAppContent } from './AppContentContext';
import { useUI } from './UIContext';
import { UsersProvider } from './UsersContext';
import { TasksProvider } from './TasksContext';
import { ProjectsProvider } from './ProjectsContext';
import { EpicsProvider } from './EpicsContext';
import { MeetingsProvider } from './MeetingsContext';
import { MasterDataProvider } from './MasterDataContext';
import { AppContentProvider } from './AppContentContext';

interface DataProviderProps {
    children: ReactNode;
    session: any;
}

/**
 * Aggregate DataProvider that wraps all domain-specific providers
 * @deprecated Consider using individual domain providers for better performance
 */
export const DataProvider: React.FC<DataProviderProps> = ({ children, session }) => {
    return (
        <UsersProvider session={session}>
            <MasterDataProvider session={session}>
                <ProjectsProvider session={session}>
                    <EpicsProvider session={session}>
                        <MeetingsProvider session={session}>
                            <TasksProvider session={session}>
                                <AppContentProvider session={session}>
                                    {children}
                                </AppContentProvider>
                            </TasksProvider>
                        </MeetingsProvider>
                    </EpicsProvider>
                </ProjectsProvider>
            </MasterDataProvider>
        </UsersProvider>
    );
};

/**
 * Aggregate hook that provides access to all data contexts
 * @deprecated Use domain-specific hooks instead for better performance and code organization:
 * - useUsers() for user data
 * - useTasks() for task data
 * - useProjects() for project data
 * - useMeetings() for meeting data
 * - useMasterData() for master data
 * - useAppContent() for feedbacks, templates, announcements, etc.
 */
export const useData = () => {
    const users = useUsers();
    const tasks = useTasks();
    const projects = useProjects();
    const epicsContext = useEpics();
    const meetings = useMeetings();
    const masterData = useMasterData();
    const appContent = useAppContent();
    const ui = useUI();

    // Compute meetingsAsTasks
    const meetingsAsTasks = useMemo(() =>
        tasks.getMeetingsAsTasks(meetings.meetings),
        [tasks.getMeetingsAsTasks, meetings.meetings]
    );

    // Compute allTasksWithMeetings
    const allTasksWithMeetings = useMemo(() =>
        [...tasks.tasks, ...meetingsAsTasks],
        [tasks.tasks, meetingsAsTasks]
    );

    // Compute filteredTasks
    const filteredTasks = useMemo(() =>
        tasks.getFilteredTasks(
            allTasksWithMeetings,
            ui.debouncedSearch,
            {
                category: ui.filters.category,
                pic: ui.filters.pic,
                priority: ui.filters.priority,
                status: ui.filters.status,
                projectId: ui.filters.projectId,
                epicId: ui.filters.epicId
            },
            ui.activeTab
        ),
        [tasks.getFilteredTasks, allTasksWithMeetings, ui.debouncedSearch, ui.filters, ui.activeTab]
    );

    // Combined loading state
    const isDataLoading = users.isUsersLoading ||
        tasks.isTasksLoading ||
        projects.isProjectsLoading ||
        epicsContext.isEpicsLoading ||
        meetings.isMeetingsLoading ||
        masterData.isMasterDataLoading ||
        appContent.isAppContentLoading;

    // Fetch all data at once
    const fetchAllData = useCallback(async () => {
        await Promise.all([
            users.fetchUsers(),
            users.fetchUserStatuses(),
            tasks.fetchTasks(),
            tasks.fetchComments(),
            tasks.fetchTaskActivities(),
            projects.fetchProjects(),
            meetings.fetchMeetings(),
            masterData.fetchMasterData(),
            appContent.fetchFeedbacks(),
            appContent.fetchDocumentTemplates(),
            appContent.fetchAnnouncements(),
            appContent.fetchDataInventory(),
            appContent.fetchChristmasSettings()
        ]);
    }, [users, tasks, projects, meetings, masterData, appContent]);

    // Clear all data
    const clearAllData = useCallback(() => {
        users.clearUsers();
        tasks.clearTasks();
        projects.clearProjects();
        meetings.clearMeetings();
        masterData.clearMasterData();
        appContent.clearAppContent();
    }, [users, tasks, projects, meetings, masterData, appContent]);

    return {
        // Users
        allUsers: users.allUsers,
        setAllUsers: users.setAllUsers,
        taskAssignableUsers: users.taskAssignableUsers,
        allUniquePics: tasks.allUniquePics,
        userStatuses: users.userStatuses,
        setUserStatuses: users.setUserStatuses,

        // Tasks
        tasks: tasks.tasks,
        setTasks: tasks.setTasks,
        comments: tasks.comments,
        setComments: tasks.setComments,
        taskActivities: tasks.taskActivities,
        setTaskActivities: tasks.setTaskActivities,

        // Projects
        projects: projects.projects,
        setProjects: projects.setProjects,

        // Epics
        epics: epicsContext.epics,
        setEpics: epicsContext.setEpics,
        getEpicsByProject: epicsContext.getEpicsByProject,
        getEpicProgress: epicsContext.getEpicProgress,

        // Meetings
        meetings: meetings.meetings,
        setMeetings: meetings.setMeetings,
        meetingInviters: meetings.meetingInviters,
        setMeetingInviters: meetings.setMeetingInviters,

        // Master Data
        jabatanList: masterData.jabatanList,
        setJabatanList: masterData.setJabatanList,
        subCategories: masterData.subCategories,
        setSubCategories: masterData.setSubCategories,
        masterCategories: masterData.masterCategories,
        setMasterCategories: masterData.setMasterCategories,
        masterSubCategories: masterData.masterSubCategories,
        setMasterSubCategories: masterData.setMasterSubCategories,
        categorySubcategoryRelations: masterData.categorySubcategoryRelations,
        setCategorySubcategoryRelations: masterData.setCategorySubcategoryRelations,

        // App Content
        feedbacks: appContent.feedbacks,
        setFeedbacks: appContent.setFeedbacks,
        documentTemplates: appContent.documentTemplates,
        setDocumentTemplates: appContent.setDocumentTemplates,
        templateFilePaths: appContent.templateFilePaths,
        setTemplateFilePaths: appContent.setTemplateFilePaths,
        announcements: appContent.announcements,
        setAnnouncements: appContent.setAnnouncements,
        dataInventory: appContent.dataInventory,
        setDataInventory: appContent.setDataInventory,
        christmasSettings: appContent.christmasSettings,
        setChristmasSettings: appContent.setChristmasSettings,

        // UI State (from UIContext)
        activeTab: ui.activeTab,
        setActiveTab: ui.setActiveTab,
        filters: ui.filters,
        setFilters: ui.setFilters,
        viewMode: ui.viewMode,
        setViewMode: ui.setViewMode,
        debouncedSearch: ui.debouncedSearch,
        setDebouncedSearch: ui.setDebouncedSearch,

        // Computed filtered data
        meetingsAsTasks,
        allTasksWithMeetings,
        filteredTasks,

        // Operations
        fetchAllData,
        clearAllData,
        isDataLoading
    };
};

export default { DataProvider, useData };
