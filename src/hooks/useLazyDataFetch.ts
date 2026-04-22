// src/hooks/useLazyDataFetch.ts
// Custom hook for lazy/on-demand data fetching based on active tab

import { useEffect, useRef } from 'react';
import { useTasks } from '../contexts/TasksContext';
import { useProjects } from '../contexts/ProjectsContext';
import { useEpics } from '../contexts/EpicsContext';
import { useMeetings } from '../contexts/MeetingsContext';
import { useMasterData } from '../contexts/MasterDataContext';
import { useAppContent } from '../contexts/AppContentContext';
import { useSubtasks } from '../contexts/SubtasksContext';

interface UseLazyDataFetchProps {
    activeTab: string;
    session: any;
}

/**
 * Hook to fetch data lazily based on the active tab
 * Only fetches data when needed, not all at once on login
 */
export const useLazyDataFetch = ({ activeTab, session }: UseLazyDataFetchProps) => {
    const tasks = useTasks();
    const projects = useProjects();
    const epics = useEpics();
    const meetings = useMeetings();
    const masterData = useMasterData();
    const appContent = useAppContent();
    const subtasks = useSubtasks();

    // Track which tabs have been visited
    const visitedTabs = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!session) return;

        // Skip if already visited this tab
        if (visitedTabs.current.has(activeTab)) return;

        // Mark tab as visited
        visitedTabs.current.add(activeTab);

        // Fetch data based on active tab
        const fetchDataForTab = async () => {
            switch (activeTab) {
                case 'Dashboard':
                    // Dashboard needs: users (already loaded), tasks, meetings for stats
                    if (!tasks.isTasksFetched) {
                        await Promise.all([
                            tasks.fetchTasks(),
                            tasks.fetchComments(),
                            tasks.fetchTaskActivities()
                        ]);
                    }
                    await meetings.fetchMeetings();
                    break;

                case 'Semua Task':
                case 'Timeline':
                    // Task views need: tasks, comments, activities, projects, epics, subtasks
                    if (!tasks.isTasksFetched) {
                        await Promise.all([
                            tasks.fetchTasks(),
                            tasks.fetchComments(),
                            tasks.fetchTaskActivities()
                        ]);
                    }
                    await projects.fetchProjects();
                    await epics.fetchEpics();
                    await subtasks.fetchAllSubtasks();
                    break;

                case 'Project':
                    // Project view needs: projects, tasks, epics, meetings
                    await projects.fetchProjects();
                    if (!tasks.isTasksFetched) {
                        await Promise.all([
                            tasks.fetchTasks(),
                            tasks.fetchComments(),
                            tasks.fetchTaskActivities()
                        ]);
                    }
                    await epics.fetchEpics();
                    await meetings.fetchMeetings();
                    break;

                case 'Jadwal Kegiatan':
                    // Meeting calendar needs: meetings, projects
                    await meetings.fetchMeetings();
                    await projects.fetchProjects();
                    break;

                case 'Saran Masukan':
                    // Feedback wall needs: feedbacks only
                    await appContent.fetchFeedbacks();
                    break;

                case 'Pengumuman':
                    // Announcements need: announcements only
                    await appContent.fetchAnnouncements();
                    break;

                case 'Dokumen':
                    // Documents need: templates only
                    await appContent.fetchDocumentTemplates();
                    break;

                case 'Inventori Data':
                    // Data inventory needs: inventory only
                    await appContent.fetchDataInventory();
                    break;

                case 'Master Data':
                    // Master data management needs: all master data
                    await masterData.fetchMasterData();
                    break;

                case 'Daftar Surat':
                case 'Daftar Disposisi':
                    // Surat & Disposisi are loaded on-demand by their own contexts
                    // No pre-fetching needed here
                    break;

                default:
                    // For unknown tabs, don't fetch anything
                    break;
            }
        };

        fetchDataForTab();
    }, [activeTab, session, tasks, projects, epics, meetings, masterData, appContent, subtasks]);

    // Return loading states for UI feedback
    return {
        isLoading: 
            tasks.isTasksLoading ||
            projects.isProjectsLoading ||
            epics.isEpicsLoading ||
            meetings.isMeetingsLoading ||
            masterData.isMasterDataLoading ||
            appContent.isAppContentLoading
    };
};
