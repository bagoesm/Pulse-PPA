// src/components/ProjectOverview.tsx
// Refactored - main orchestration component using extracted hooks and components

import React, { useState, useEffect, useCallback } from 'react';
import { Task, ProjectDefinition, User, Meeting, Epic } from '../../types';
import { ArrowLeft, RefreshCw, Plus } from 'lucide-react';

// Hooks
import { useProjectData } from '../hooks/useProjectData';
import { useProjectStats } from '../hooks/useProjectStats';
import { useProjectFilters } from '../hooks/useProjectFilters';
import { useProjectLinks } from '../hooks/useProjectLinks';
import { useNotificationModal } from '../hooks/useModal';

// Components
import ProjectListView from './ProjectListView';
import ProjectTasksSection from './ProjectTasksSection';
import ProjectDocumentsSection from './ProjectDocumentsSection';
import ProjectLinksSection from './ProjectLinksSection';
import ProjectTeamSection from './ProjectTeamSection';
import ProjectEpicsSection from './ProjectEpicsSection';
import AddProjectLinkModal from './AddProjectLinkModal';

// Icon mapping
import {
  Briefcase, Code, Database, Globe, Smartphone, Monitor, Server, Cloud, Shield,
  Zap, Target, Rocket, Star, Heart, Lightbulb, Settings, Users, FileText, BarChart3, Layers
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Briefcase, Code, Database, Globe, Smartphone, Monitor, Server, Cloud, Shield,
  Zap, Target, Rocket, Star, Heart, Lightbulb, Settings, Users, FileText, BarChart3, Layers
};

const getColorClasses = (color: string = 'blue') => {
  const colorMap: Record<string, { bg: string; text: string; ring: string; hover: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-200', hover: 'hover:bg-blue-50' },
    green: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200', hover: 'hover:bg-emerald-50' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-200', hover: 'hover:bg-purple-50' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-200', hover: 'hover:bg-orange-50' },
    red: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-200', hover: 'hover:bg-red-50' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', ring: 'ring-indigo-200', hover: 'hover:bg-indigo-50' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-700', ring: 'ring-pink-200', hover: 'hover:bg-pink-50' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-700', ring: 'ring-teal-200', hover: 'hover:bg-teal-50' },
  };
  return colorMap[color] || colorMap.blue;
};

const ITEMS_PER_PAGE = 10;
const PROJECTS_PER_PAGE = 12;

interface ProjectOverviewProps {
  onTaskClick?: (task: Task) => void;
  onEditProject?: (project: ProjectDefinition) => void;
  onDeleteProject?: (projectId: string) => void;
  onCreateProject?: () => void;
  canManageProjects?: boolean;
  currentUserName?: string;
  refreshTrigger?: number;
  fetchProjects: (filters: any) => Promise<any>;
  fetchProjectTasks: (projectId: string, filters: any) => Promise<any>;
  fetchUniqueManagers: () => Promise<string[]>;
  onRefreshNeeded?: () => void;
  onUpdatePinnedLinks?: (projectId: string, pinnedLinks: string[]) => Promise<boolean>;
  users?: User[];
  meetings?: Meeting[];
  allTasks?: Task[]; // All tasks for extracting all documents/links
  // Epic Props
  epics?: Epic[];
  onEpicClick?: (epic: Epic) => void;
  onCreateEpic?: (projectId: string) => void;
  onEditEpic?: (epic: Epic) => void;
  onDeleteEpic?: (epicId: string) => Promise<void>;
  getEpicProgress?: (epicId: string, tasks: Task[]) => number;
  getEpicsByProject?: (projectId: string) => Epic[];
}

const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  onTaskClick,
  onEditProject,
  onDeleteProject,
  onCreateProject,
  canManageProjects = false,
  currentUserName,
  refreshTrigger,
  fetchProjects,
  fetchProjectTasks,
  fetchUniqueManagers,
  onRefreshNeeded,
  onUpdatePinnedLinks,
  users = [],
  meetings = [],
  allTasks = [],
  epics = [],
  onEpicClick,
  onCreateEpic,
  onEditEpic,
  onDeleteEpic,
  getEpicProgress,
  getEpicsByProject
}) => {
  // Filters
  const filters = useProjectFilters();

  // Data
  const projectData = useProjectData({
    fetchProjects,
    fetchProjectTasks,
    fetchUniqueManagers,
    refreshTrigger,
    onRefreshNeeded
  });

  // Stats
  const projectStats = useProjectStats({ fetchProjectTasks });

  // Notification Modal
  const { showNotification } = useNotificationModal();

  // Project Links (standalone)
  const projectLinksHook = useProjectLinks(showNotification);
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);

  // Pinned links
  const [pinnedLinkIds, setPinnedLinkIds] = useState<Set<string>>(new Set());

  // Load projects when filters change or on initial mount
  useEffect(() => {
    if (!filters.selectedProjectId) {
      projectData.loadProjects({
        search: filters.debouncedSearch,
        status: filters.projectStatusFilter,
        manager: filters.managerFilter,
        page: filters.projectPage,
        limit: PROJECTS_PER_PAGE
      });
    }
  }, [filters.debouncedSearch, filters.projectStatusFilter, filters.managerFilter, filters.projectPage, filters.selectedProjectId, projectData.loadProjects]);

  // Load tasks when project selected
  useEffect(() => {
    if (filters.selectedProjectId) {
      projectData.loadProjectTasks(filters.selectedProjectId, {
        search: filters.taskSearch,
        status: filters.statusFilter,
        priority: filters.priorityFilter,
        pic: filters.picFilter,
        page: filters.currentPage,
        limit: ITEMS_PER_PAGE
      });
    }
  }, [filters.selectedProjectId, filters.taskSearch, filters.statusFilter, filters.priorityFilter, filters.picFilter, filters.currentPage]);

  // Fetch project links when project selected
  useEffect(() => {
    if (filters.selectedProjectId) {
      projectLinksHook.fetchProjectLinks(filters.selectedProjectId);
    }
  }, [filters.selectedProjectId, projectLinksHook.fetchProjectLinks]);

  // Load stats for projects
  useEffect(() => {
    (projectData.projects || []).forEach(project => {
      if (!projectStats.projectStatsCache[project.id] && !projectStats.loadingStats[project.id]) {
        projectStats.getProjectStats(project.id);
      }
    });
  }, [projectData.projects]);

  // Load pinned links when project changes
  useEffect(() => {
    if (filters.selectedProjectId) {
      const project = (projectData.projects || []).find(p => p.id === filters.selectedProjectId);
      setPinnedLinkIds(new Set(project?.pinnedLinks || []));
    }
  }, [filters.selectedProjectId, projectData.projects]);

  // Refresh on trigger change
  useEffect(() => {
    if (refreshTrigger) {
      if (filters.selectedProjectId) {
        projectData.loadProjectTasks(filters.selectedProjectId, {
          search: filters.taskSearch,
          status: filters.statusFilter,
          priority: filters.priorityFilter,
          pic: filters.picFilter,
          page: filters.currentPage,
          limit: ITEMS_PER_PAGE
        });
      } else {
        projectData.loadProjects({
          search: filters.debouncedSearch,
          status: filters.projectStatusFilter,
          manager: filters.managerFilter,
          page: filters.projectPage,
          limit: PROJECTS_PER_PAGE
        });
      }
      projectStats.clearStatsCache();
    }
  }, [refreshTrigger]);

  // Toggle pin link
  const togglePinLink = async (linkId: string) => {
    if (!filters.selectedProjectId || !onUpdatePinnedLinks) return;

    const newSet = new Set(pinnedLinkIds);
    if (newSet.has(linkId)) newSet.delete(linkId);
    else newSet.add(linkId);

    setPinnedLinkIds(newSet);
    const success = await onUpdatePinnedLinks(filters.selectedProjectId, [...newSet]);
    if (!success) setPinnedLinkIds(pinnedLinkIds);
  };

  // PROJECT LIST VIEW
  if (!filters.selectedProjectId) {
    return (
      <ProjectListView
        projects={projectData.projects}
        projectsLoading={projectData.projectsLoading}
        projectsTotalCount={projectData.projectsTotalCount}
        projectsTotalPages={projectData.projectsTotalPages}
        projectPage={filters.projectPage}
        setProjectPage={filters.setProjectPage}
        projectStatsCache={projectStats.projectStatsCache}
        loadingStats={projectStats.loadingStats}
        projectSearch={filters.projectSearch}
        setProjectSearch={filters.setProjectSearch}
        debouncedSearch={filters.debouncedSearch}
        projectStatusFilter={filters.projectStatusFilter}
        setProjectStatusFilter={filters.setProjectStatusFilter}
        managerFilter={filters.managerFilter}
        setManagerFilter={filters.setManagerFilter}
        uniqueManagers={projectData.uniqueManagers}
        onSelectProject={filters.setSelectedProjectId}
        onCreateProject={onCreateProject}
        onEditProject={onEditProject}
        onDeleteProject={onDeleteProject}
        onRefresh={() => {
          projectStats.clearStatsCache();
          projectData.loadProjects({
            search: filters.debouncedSearch,
            status: filters.projectStatusFilter,
            manager: filters.managerFilter,
            page: filters.projectPage,
            limit: PROJECTS_PER_PAGE
          });
          onRefreshNeeded?.();
        }}
        canManageProjects={canManageProjects}
        currentUserName={currentUserName}
        users={users}
      />
    );
  }

  // PROJECT DETAIL VIEW
  const selectedProject = (projectData.projects || []).find(p => p.id === filters.selectedProjectId);
  const selectedStats = projectStats.projectStatsCache[filters.selectedProjectId || ''];

  if (!selectedProject) return null;

  // Extract documents from ALL tasks in this project (not just paginated ones)
  const projectTasks = (allTasks || []).filter(t => t.projectId === filters.selectedProjectId);
  const taskDocuments = projectTasks.flatMap(t =>
    (t.attachments || []).map(a => ({ ...a, source: t.title, sourceType: 'task' as const }))
  );

  // Extract documents from meetings that belong to this project
  const projectMeetings = (meetings || []).filter(m => m.projectId === filters.selectedProjectId);
  const meetingDocuments = projectMeetings.flatMap(m => {
    const docs: Array<{ id: string; name: string; type?: string; url?: string; path?: string; source: string; sourceType: 'meeting' }> = [];

    // Regular attachments
    (m.attachments || []).forEach(a => {
      docs.push({ ...a, source: m.title, sourceType: 'meeting' });
    });

    // Special documents (surat undangan, surat tugas, laporan)
    if (m.suratUndangan) {
      docs.push({ ...m.suratUndangan, source: `${m.title} (Surat Undangan)`, sourceType: 'meeting' });
    }
    if (m.suratTugas) {
      docs.push({ ...m.suratTugas, source: `${m.title} (Surat Tugas)`, sourceType: 'meeting' });
    }
    if (m.laporan) {
      docs.push({ ...m.laporan, source: `${m.title} (Laporan)`, sourceType: 'meeting' });
    }

    return docs;
  });

  const documentsList = [...taskDocuments, ...meetingDocuments];

  // Extract links from ALL tasks in this project
  const taskLinks = projectTasks.flatMap(t =>
    (t.links || []).map(link => ({
      ...link,
      sourceId: t.id,
      sourceTitle: t.title,
      sourceType: 'task' as const,
      uniqueId: `task_${t.id}_${link.id}`
    }))
  );

  // Extract links from meetings
  const meetingLinks = projectMeetings.flatMap(m =>
    (m.links || []).map(link => ({
      ...link,
      sourceId: m.id,
      sourceTitle: m.title,
      sourceType: 'meeting' as const,
      uniqueId: `meeting_${m.id}_${link.id}`
    }))
  );

  const linksList = [...taskLinks, ...meetingLinks];

  const ProjectIcon = iconMap[selectedProject.icon || 'Briefcase'] || Briefcase;
  const projectColorClasses = getColorClasses(selectedProject.color);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* HEADER */}
      <div className={`bg-white border-b border-slate-200 px-4 sm:px-8 py-4 sm:py-5 ${projectColorClasses.hover}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <button
              onClick={() => filters.setSelectedProjectId(null)}
              className={`flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-slate-500 hover:${projectColorClasses.text} mb-2 sm:mb-3 transition-colors font-medium`}
            >
              <ArrowLeft size={14} /> Kembali
            </button>

            <div className="flex items-center gap-3 sm:gap-4 mb-2">
              <div className={`p-2 sm:p-3 rounded-xl ring-2 ${projectColorClasses.bg} ${projectColorClasses.text} ${projectColorClasses.ring} shadow-sm`}>
                <ProjectIcon size={22} />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-slate-800">{selectedProject.name}</h1>
                <p className="text-xs sm:text-sm text-slate-500 line-clamp-1">{selectedProject.description}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto">
            <button
              onClick={() => {
                projectData.loadProjectTasks(filters.selectedProjectId!, {
                  search: filters.taskSearch,
                  status: filters.statusFilter,
                  priority: filters.priorityFilter,
                  pic: filters.picFilter,
                  page: filters.currentPage,
                  limit: ITEMS_PER_PAGE
                });
                projectStats.clearStatsCache(filters.selectedProjectId!);
                onRefreshNeeded?.();
              }}
              disabled={projectData.tasksLoading}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 border border-slate-300 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 text-xs sm:text-sm"
            >
              <RefreshCw size={14} className={projectData.tasksLoading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <div className="text-right hidden sm:block">
              <p className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase">Manager</p>
              <p className="font-bold text-slate-700 text-sm">{selectedProject.manager}</p>
            </div>
            <div className="text-right sm:pl-6 sm:border-l border-slate-100">
              <p className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase">Progress</p>
              <p className={`font-bold ${projectColorClasses.text} text-base sm:text-lg`}>{selectedStats?.progress || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-8">
          {/* LEFT COLUMN */}
          <div className="xl:col-span-2 space-y-4 sm:space-y-8">
            <ProjectTasksSection
              tasks={projectData.tasks}
              tasksLoading={projectData.tasksLoading}
              tasksTotalCount={projectData.tasksTotalCount}
              tasksTotalPages={projectData.tasksTotalPages}
              currentPage={filters.currentPage}
              setCurrentPage={filters.setCurrentPage}
              taskSearch={filters.taskSearch}
              setTaskSearch={filters.setTaskSearch}
              statusFilter={filters.statusFilter}
              setStatusFilter={filters.setStatusFilter}
              priorityFilter={filters.priorityFilter}
              setPriorityFilter={filters.setPriorityFilter}
              picFilter={filters.picFilter}
              setPicFilter={filters.setPicFilter}
              uniquePics={[...new Set(projectTasks.flatMap(t => Array.isArray(t.pic) ? t.pic : [t.pic]).filter(Boolean))]}
              onTaskClick={onTaskClick}
              users={users}
            />

            {/* Epics Section */}
            <ProjectEpicsSection
              epics={getEpicsByProject ? getEpicsByProject(selectedProject.id) : []}
              projectTasks={projectTasks}
              getEpicProgress={getEpicProgress || (() => 0)}
              onEpicClick={onEpicClick}
              onEditEpic={onEditEpic}
              onDeleteEpic={onDeleteEpic}
              onCreateEpic={() => onCreateEpic && onCreateEpic(selectedProject.id)}
              canManage={canManageProjects || currentUserName === selectedProject.manager}
            />

            <ProjectDocumentsSection
              documents={documentsList}
              projectDocuments={projectLinksHook.projectLinks}
              onAddDocument={() => setIsAddLinkModalOpen(true)}
              onDeleteProjectDocument={async (docId) => {
                await projectLinksHook.deleteProjectLink(docId);
              }}
              canManage={canManageProjects || currentUserName === selectedProject.manager}
            />

            <ProjectLinksSection
              links={linksList}
              projectLinks={projectLinksHook.projectLinks}
              pinnedLinkIds={pinnedLinkIds}
              togglePinLink={togglePinLink}
              linksPage={filters.linksPage}
              setLinksPage={filters.setLinksPage}
              onAddLink={() => setIsAddLinkModalOpen(true)}
              onDeleteProjectLink={async (linkId) => {
                await projectLinksHook.deleteProjectLink(linkId);
              }}
              canManage={canManageProjects || currentUserName === selectedProject.manager}
            />
          </div>

          {/* RIGHT COLUMN */}
          <ProjectTeamSection
            stats={selectedStats}
            getMemberWorkloadInProject={projectStats.getMemberWorkloadInProject}
            getWorkloadLabel={projectStats.getWorkloadLabel}
          />
        </div>
      </div>

      {/* Add Project Link Modal */}
      <AddProjectLinkModal
        isOpen={isAddLinkModalOpen}
        onClose={() => setIsAddLinkModalOpen(false)}
        projectName={selectedProject.name}
        onAddLink={async (title, url, description) => {
          return await projectLinksHook.addProjectLink({
            projectId: selectedProject.id,
            title,
            url,
            type: 'link',
            description,
            createdBy: currentUserName || ''
          });
        }}
        onUploadDocument={async (file, title, description) => {
          return await projectLinksHook.uploadProjectDocument(
            selectedProject.id,
            file,
            title,
            description,
            currentUserName || ''
          );
        }}
      />
    </div>
  );
};

export default ProjectOverview;
