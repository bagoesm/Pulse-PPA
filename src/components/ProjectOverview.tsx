// src/components/ProjectOverview.tsx

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Task, ProjectDefinition, Status, Priority, ProjectStatus, User } from '../../types';
import UserAvatar from './UserAvatar';
import { 
  Briefcase, 
  Users, 
  FileText, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle,
  Download,
  ChevronLeft,
  List,
  Search,
  Code, 
  Database, 
  Globe, 
  Smartphone, 
  Monitor, 
  Server, 
  Cloud, 
  Shield, 
  Zap, 
  Target, 
  Rocket, 
  Star, 
  Heart, 
  Lightbulb,
  Settings,
  BarChart3,
  Layers,
  Edit3,
  Trash2,
  Plus,
  RefreshCw,
  Link2,
  Pin,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';       // for generating signed URLs

interface ProjectOverviewProps {
  onTaskClick?: (task: Task) => void;
  onEditProject?: (project: ProjectDefinition) => void;
  onDeleteProject?: (projectId: string) => void;
  onCreateProject?: () => void;
  canManageProjects?: boolean;
  refreshTrigger?: number; // Trigger to refresh data after task updates
  // New props for server-side data fetching
  fetchProjects: (filters: any) => Promise<any>;
  fetchProjectTasks: (projectId: string, filters: any) => Promise<any>;
  fetchUniqueManagers: () => Promise<string[]>;
  // Callback to force refresh from parent
  onRefreshNeeded?: () => void;
  onUpdatePinnedLinks?: (projectId: string, pinnedLinks: string[]) => Promise<boolean>;
  users?: User[]; // For profile photos
}

const ITEMS_PER_PAGE = 10;
const PROJECTS_PER_PAGE = 12; // For project list pagination

const ProjectOverview: React.FC<ProjectOverviewProps> = ({ 
  onTaskClick, 
  onEditProject, 
  onDeleteProject, 
  onCreateProject, 
  canManageProjects = false,
  refreshTrigger,
  fetchProjects,
  fetchProjectTasks,
  fetchUniqueManagers,
  onRefreshNeeded,
  onUpdatePinnedLinks,
  users = []
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [projectPage, setProjectPage] = useState(1);
  const [linksPage, setLinksPage] = useState(1);

  // Server-side data state
  const [projects, setProjects] = useState<ProjectDefinition[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsTotalCount, setProjectsTotalCount] = useState(0);
  const [projectsTotalPages, setProjectsTotalPages] = useState(0);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksTotalCount, setTasksTotalCount] = useState(0);
  const [tasksTotalPages, setTasksTotalPages] = useState(0);

  const [uniqueManagers, setUniqueManagers] = useState<string[]>([]);
  
  // Pinned links state (stored in database per project)
  const [pinnedLinkIds, setPinnedLinkIds] = useState<Set<string>>(new Set());

  // Icon mapping for projects
  const iconMap: Record<string, React.ElementType> = {
    Briefcase, Code, Database, Globe, Smartphone, Monitor, Server, Cloud, Shield, 
    Zap, Target, Rocket, Star, Heart, Lightbulb, Settings, Users, FileText, BarChart3, Layers
  };

  // Color theme mapping
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

  // Progress bar color hex mapping
  const getProgressBarColorHex = (color: string = 'blue') => {
    const colorMap: Record<string, string> = {
      blue: '#3b82f6',
      green: '#10b981',
      purple: '#8b5cf6',
      orange: '#f97316',
      red: '#ef4444',
      indigo: '#6366f1',
      pink: '#ec4899',
      teal: '#14b8a6',
    };
    return colorMap[color] || colorMap.blue;
  };

  // Filters for tasks (in project detail view)
  const [taskSearch, setTaskSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'All'>('All');

  // Filters for projects (in project list view)
  const [projectSearch, setProjectSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState<ProjectStatus | 'All'>('All');
  const [managerFilter, setManagerFilter] = useState<string | 'All'>('All');

  // Debounce search input to reduce filtering frequency
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(projectSearch);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [projectSearch]);

  useEffect(() => {
    setCurrentPage(1);
    setLinksPage(1);
  }, [selectedProjectId, taskSearch, statusFilter, priorityFilter]);

  // Load pinned links from database when project changes
  useEffect(() => {
    if (selectedProjectId) {
      const project = projects.find(p => p.id === selectedProjectId);
      if (project?.pinnedLinks) {
        setPinnedLinkIds(new Set(project.pinnedLinks));
      } else {
        setPinnedLinkIds(new Set());
      }
    }
  }, [selectedProjectId, projects]);

  // Toggle pin function - saves to database
  const togglePinLink = async (linkId: string) => {
    if (!selectedProjectId || !onUpdatePinnedLinks) return;
    
    const newSet = new Set(pinnedLinkIds);
    if (newSet.has(linkId)) {
      newSet.delete(linkId);
    } else {
      newSet.add(linkId);
    }
    
    // Optimistic update
    setPinnedLinkIds(newSet);
    
    // Save to database
    const success = await onUpdatePinnedLinks(selectedProjectId, [...newSet]);
    if (!success) {
      // Revert on failure
      setPinnedLinkIds(pinnedLinkIds);
    }
  };

  // ---------------------------------------------------------------------------
  // Project-level statistics (now uses server-side data)
  // ---------------------------------------------------------------------------
  const getProjectStats = useCallback(async (projectId: string) => {
    try {
      // Fetch all tasks for this project to calculate stats
      const result = await fetchProjectTasks(projectId, { limit: 1000 }); // Get all tasks for stats
      const projectTasks = result.tasks || [];

      const total = projectTasks.length;
      const completed = projectTasks.filter(t => t.status === Status.Done).length;
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
      const team = Array.from(new Set(projectTasks.flatMap(t => Array.isArray(t.pic) ? t.pic : [t.pic]).filter(Boolean)));
      const documents = projectTasks.flatMap(t => t.attachments || []).length;

      return { total, completed, progress, team, documents, projectTasks };
    } catch (error) {
      console.error(`Error fetching project stats for ${projectId}:`, error);
      return { total: 0, completed: 0, progress: 0, team: [], documents: 0, projectTasks: [] };
    }
  }, [fetchProjectTasks]);

  // Cache project stats to avoid repeated API calls
  const [projectStatsCache, setProjectStatsCache] = useState<Record<string, any>>({});
  const [loadingStats, setLoadingStats] = useState<Record<string, boolean>>({});
  const loadingRef = useRef<Record<string, boolean>>({});

  const getMemberWorkloadInProject = (pic: string, projectTasks: Task[]) => {
    const active = projectTasks.filter(t => (Array.isArray(t.pic) ? t.pic.includes(pic) : t.pic === pic) && t.status !== Status.Done);

    // Hitung poin berdasarkan prioritas
    let workloadPoints = 0;
    let urgentCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    active.forEach(t => {
      if (t.priority === Priority.Urgent) {
        workloadPoints += 4;
        urgentCount++;
      } else if (t.priority === Priority.High) {
        workloadPoints += 3;
        highCount++;
      } else if (t.priority === Priority.Medium) {
        workloadPoints += 2;
        mediumCount++;
      } else {
        workloadPoints += 1;
        lowCount++;
      }
    });

    return { 
      workloadPoints, 
      taskCount: active.length,
      breakdown: { urgentCount, highCount, mediumCount, lowCount }
    };
  };

  const getWorkloadLabel = (points: number, taskCount: number) => {
    if (points === 0) return { 
      label: 'Tidak Ada Tugas', 
      color: 'bg-slate-100 text-slate-500',
      description: 'Tidak ada task aktif'
    };
    if (points <= 3) return { 
      label: 'Ringan', 
      color: 'bg-emerald-100 text-emerald-700',
      description: `${taskCount} task (${points} poin)`
    };
    if (points <= 8) return { 
      label: 'Sedang', 
      color: 'bg-blue-100 text-blue-700',
      description: `${taskCount} task (${points} poin)`
    };
    if (points <= 15) return { 
      label: 'Berat', 
      color: 'bg-orange-100 text-orange-700',
      description: `${taskCount} task (${points} poin)`
    };
    return { 
      label: 'Sangat Berat', 
      color: 'bg-red-100 text-red-700',
      description: `${taskCount} task (${points} poin)`
    };
  };

  // selectedProject and selectedStats are defined later in the project detail view

  // ---------------------------------------------------------------------------
  // Tasks Data (SERVER-SIDE)
  // ---------------------------------------------------------------------------
  // Tasks are now filtered and paginated on the server
  // tasks state contains the current page of filtered tasks
  // tasksTotalPages contains the total number of pages

  // ---------------------------------------------------------------------------
  // PROJECT DATA PROCESSING (SERVER-SIDE)
  // ---------------------------------------------------------------------------
  
  // Projects are now filtered and paginated on the server
  // No client-side filtering needed - data comes pre-filtered from API

  // Reset project page when filters change
  useEffect(() => {
    setProjectPage(1);
  }, [debouncedSearch, projectStatusFilter, managerFilter]);

  // Load projects from server
  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const result = await fetchProjects({
        search: debouncedSearch,
        status: projectStatusFilter,
        manager: managerFilter,
        page: projectPage,
        limit: PROJECTS_PER_PAGE
      });
      
      setProjects(result.projects);
      setProjectsTotalCount(result.totalCount);
      setProjectsTotalPages(result.totalPages);
    } catch (error) {
      setProjects([]);
      setProjectsTotalCount(0);
      setProjectsTotalPages(0);
    } finally {
      setProjectsLoading(false);
    }
  }, [fetchProjects, debouncedSearch, projectStatusFilter, managerFilter, projectPage]);

  // Load tasks for selected project
  const loadProjectTasks = useCallback(async () => {
    if (!selectedProjectId) return;
    
    setTasksLoading(true);
    try {
      const result = await fetchProjectTasks(selectedProjectId, {
        search: taskSearch,
        status: statusFilter,
        priority: priorityFilter,
        page: currentPage,
        limit: ITEMS_PER_PAGE
      });
      
      setTasks(result.tasks);
      setTasksTotalCount(result.totalCount);
      setTasksTotalPages(result.totalPages);
    } catch (error) {
      setTasks([]);
      setTasksTotalCount(0);
      setTasksTotalPages(0);
    } finally {
      setTasksLoading(false);
    }
  }, [fetchProjectTasks, selectedProjectId, taskSearch, statusFilter, priorityFilter, currentPage]);

  // Load unique managers for filter
  const loadUniqueManagers = useCallback(async () => {
    try {
      const managers = await fetchUniqueManagers();
      setUniqueManagers(managers);
    } catch (error) {
      setUniqueManagers([]);
    }
  }, [fetchUniqueManagers]);

  // Track if initial load has been done
  const initialLoadDone = useRef(false);
  const lastRefreshTrigger = useRef(refreshTrigger);

  // Load projects when filters change
  useEffect(() => {
    if (!selectedProjectId) {
      loadProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, projectStatusFilter, managerFilter, projectPage, selectedProjectId]);

  // Load tasks when project is selected or filters change
  useEffect(() => {
    if (selectedProjectId) {
      loadProjectTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, taskSearch, statusFilter, priorityFilter, currentPage]);

  // Load managers on mount only
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      loadUniqueManagers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh data when refreshTrigger changes (not on initial render)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger !== lastRefreshTrigger.current) {
      lastRefreshTrigger.current = refreshTrigger;
      
      // Refresh project tasks if we're in project detail view
      if (selectedProjectId) {
        loadProjectTasks();
      } else {
        // Refresh project list if we're in project list view
        loadProjects();
      }
      // Clear and reload project stats cache
      setProjectStatsCache({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Load project stats when projects change
  useEffect(() => {
    if (projects.length === 0) return;

    const loadStatsSequentially = async () => {
      for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        
        // Skip if already loading
        if (loadingRef.current[project.id]) {
          continue;
        }
        
        // Skip if has valid cached stats
        if (projectStatsCache[project.id]) {
          continue;
        }
        
        // Mark as loading
        loadingRef.current[project.id] = true;
        setLoadingStats(prev => ({ ...prev, [project.id]: true }));
        
        try {
          const stats = await getProjectStats(project.id);
          setProjectStatsCache(prev => ({ ...prev, [project.id]: stats }));
        } catch (error) {
          console.error(`Error loading stats for project ${project.id}:`, error);
          setProjectStatsCache(prev => ({ 
            ...prev, 
            [project.id]: { 
              total: 0, completed: 0, progress: 0, team: [], documents: 0, projectTasks: [] 
            }
          }));
        } finally {
          // Clear loading state
          loadingRef.current[project.id] = false;
          setLoadingStats(prev => ({ ...prev, [project.id]: false }));
        }
        
        // Small delay between requests to avoid overwhelming the server
        if (i < projects.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    };

    loadStatsSequentially();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.map(p => p.id).join(',')]); // Only re-run when project IDs change

  // Note: Stats refresh is now handled by the projects dependency change
  // When refreshTrigger changes, loadProjects is called which updates projects
  // This triggers the stats loading useEffect automatically

  // ---------------------------------------------------------------------------
  // PROJECT LIST VIEW
  // ---------------------------------------------------------------------------
  if (!selectedProjectId) {
    return (
      <div className="p-8 h-full overflow-y-auto bg-slate-50">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-1">Daftar Project</h2>
            <p className="text-slate-500 text-sm">Kelola dan pantau project tim</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button
              onClick={() => {
                setProjectStatsCache({});
                setLoadingStats({});
                loadingRef.current = {};
                loadProjects();
                onRefreshNeeded?.();
              }}
              disabled={projectsLoading}
              className="flex items-center gap-2 px-3 py-2.5 border border-slate-300 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={projectsLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
            
            {canManageProjects && (
              <button
                onClick={onCreateProject}
                className="flex items-center gap-2 bg-gov-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-gov-700 transition-colors shadow-sm"
              >
                <Plus size={16} />
                Buat Project Baru
              </button>
            )}
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari project, manager, atau deskripsi..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              {/* Status Filter */}
              <select
                value={projectStatusFilter}
                onChange={(e) => setProjectStatusFilter(e.target.value as ProjectStatus | 'All')}
                className="px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-gov-400 outline-none"
              >
                <option value="All">Semua Status</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending">Pending</option>
                <option value="Live">Live</option>
              </select>

              {/* Manager Filter */}
              <select
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                className="px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-gov-400 outline-none"
              >
                <option value="All">Semua Manager</option>
                {uniqueManagers.map(manager => (
                  <option key={manager} value={manager}>{manager}</option>
                ))}
              </select>

              {/* Clear Filters */}
              {(projectSearch || projectStatusFilter !== 'All' || managerFilter !== 'All') && (
                <button
                  onClick={() => {
                    setProjectSearch('');
                    setProjectStatusFilter('All');
                    setManagerFilter('All');
                  }}
                  className="px-3 py-2.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Menampilkan <span className="font-semibold text-slate-700">{projects.length}</span> dari {projectsTotalCount} project
                {debouncedSearch && (
                  <span> untuk pencarian "<span className="font-semibold text-slate-700">{debouncedSearch}</span>"</span>
                )}
              </p>
              
              {/* Loading Indicators */}
              {(projectsLoading || projectSearch !== debouncedSearch) && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="w-3 h-3 border border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                  {projectsLoading ? 'Memuat...' : 'Mencari...'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {projectsLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-slate-500">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
              <span>Memuat project...</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {!projectsLoading && projects.map(project => {
            const ProjectIcon = iconMap[project.icon || 'Briefcase'] || Briefcase;
            const colorClasses = getColorClasses(project.color);
            
            // Use cached stats or show loading
            const stats = projectStatsCache[project.id] || { 
              total: 0, completed: 0, progress: 0, team: [], documents: 0 
            };
            const isLoadingStats = loadingStats[project.id] || false;
            

            


            return (
              <div
                key={project.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-slate-300 transition-all group relative"
              >
                {/* Edit and Delete buttons for authorized users */}
                {canManageProjects && (
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditProject?.(project);
                      }}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm"
                      title="Edit Project"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject?.(project.id);
                      }}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-all shadow-sm"
                      title="Hapus Project"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                <div 
                  onClick={() => setSelectedProjectId(project.id)}
                  className="cursor-pointer"
                >
                  {/* Header Section */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${colorClasses.bg} ${colorClasses.text} group-hover:scale-105 transition-transform shadow-sm`}>
                        <ProjectIcon size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-slate-900 transition-colors leading-tight">
                          {project.name}
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-slate-400 font-medium">Target Live:</span>
                          <span className="text-xs font-semibold text-slate-600">
                            {project.targetLiveDate || 'Belum ditentukan'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        project.status === 'Live' 
                          ? 'bg-green-100 text-green-700'
                          : project.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {project.status || 'In Progress'}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                    {project.description || 'No description available'}
                  </p>

                  {/* Progress Section */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-slate-600">Progress</span>
                      {isLoadingStats ? (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 border border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs text-slate-400">Loading...</span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-slate-800">{stats.progress}%</span>
                      )}
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      {isLoadingStats ? (
                        <div className="h-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 animate-pulse rounded-full"></div>
                      ) : (
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${stats.progress}%`,
                            backgroundColor: getProgressBarColorHex(project.color)
                          }} 
                          title={`Progress: ${stats.progress}% (${stats.completed}/${stats.total} tasks)`}
                        />
                      )}
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-2 bg-slate-50 rounded-lg border border-slate-100">
                      {isLoadingStats ? (
                        <div className="w-4 h-4 bg-slate-200 rounded animate-pulse mx-auto mb-1"></div>
                      ) : (
                        <div className="text-sm font-bold text-slate-800">{stats.team.length}</div>
                      )}
                      <div className="text-xs text-slate-500">Team</div>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded-lg border border-slate-100">
                      {isLoadingStats ? (
                        <div className="w-4 h-4 bg-slate-200 rounded animate-pulse mx-auto mb-1"></div>
                      ) : (
                        <div className="text-sm font-bold text-slate-800">{stats.total}</div>
                      )}
                      <div className="text-xs text-slate-500">Tasks</div>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded-lg border border-slate-100">
                      {isLoadingStats ? (
                        <div className="w-4 h-4 bg-slate-200 rounded animate-pulse mx-auto mb-1"></div>
                      ) : (
                        <div className="text-sm font-bold text-slate-800">{stats.completed}</div>
                      )}
                      <div className="text-xs text-slate-500">Done</div>
                    </div>
                  </div>

                  {/* PIC Project Section */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const managerUser = users.find(u => u.name === project.manager);
                        return (
                          <UserAvatar
                            name={project.manager || 'Unknown'}
                            profilePhoto={managerUser?.profilePhoto}
                            size="sm"
                          />
                        );
                      })()}
                      <div>
                        <div className="text-xs font-semibold text-slate-700">{project.manager}</div>
                        <div className="text-xs text-slate-500">PIC Project</div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 ${colorClasses.text} text-xs font-medium group-hover:translate-x-1 transition-transform`}>
                      <span>View Details</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {!projectsLoading && projects.length === 0 && (
            <div className="col-span-full">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase size={24} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-600 mb-2">
                  {projectSearch || projectStatusFilter !== 'All' || managerFilter !== 'All' 
                    ? 'Tidak ada project yang sesuai' 
                    : 'Belum ada project'
                  }
                </h3>
                <p className="text-slate-500 mb-4">
                  {projectSearch || projectStatusFilter !== 'All' || managerFilter !== 'All'
                    ? 'Coba ubah filter atau kata kunci pencarian'
                    : 'Mulai dengan membuat project pertama Anda'
                  }
                </p>
                {(projectSearch || projectStatusFilter !== 'All' || managerFilter !== 'All') ? (
                  <button
                    onClick={() => {
                      setProjectSearch('');
                      setProjectStatusFilter('All');
                      setManagerFilter('All');
                    }}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Reset Filter
                  </button>
                ) : canManageProjects ? (
                  <button
                    onClick={onCreateProject}
                    className="px-4 py-2 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors"
                  >
                    Buat Project Pertama
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Project Pagination */}
        {!projectsLoading && projectsTotalPages > 1 && (
          <div className="flex items-center justify-between mt-6 bg-white rounded-xl border border-slate-200 px-4 py-3">
            <span className="text-sm text-slate-500">
              Halaman <span className="font-semibold">{projectPage}</span> dari {projectsTotalPages}
              <span className="ml-2 text-slate-400">
                ({projects.length} dari {projectsTotalCount} project)
              </span>
            </span>

            <div className="flex gap-2">
              <button
                disabled={projectPage === 1}
                onClick={() => setProjectPage(p => p - 1)}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page Numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, projectsTotalPages) }, (_, i) => {
                  let pageNum;
                  if (projectsTotalPages <= 5) {
                    pageNum = i + 1;
                  } else if (projectPage <= 3) {
                    pageNum = i + 1;
                  } else if (projectPage >= projectsTotalPages - 2) {
                    pageNum = projectsTotalPages - 4 + i;
                  } else {
                    pageNum = projectPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setProjectPage(pageNum)}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        pageNum === projectPage
                          ? 'bg-gov-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={projectPage === projectsTotalPages}
                onClick={() => setProjectPage(p => p + 1)}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                title="Halaman Selanjutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PROJECT DETAIL VIEW
  // ---------------------------------------------------------------------------
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedStats = projectStatsCache[selectedProjectId || ''];
  
  if (!selectedProjectId || !selectedProject) return null;

  const documentsList = tasks.flatMap(t =>
    (t.attachments || []).map(a => ({
      ...a,
      taskTitle: t.title
    }))
  );

  const ProjectIcon = iconMap[selectedProject.icon || 'Briefcase'] || Briefcase;
  const projectColorClasses = getColorClasses(selectedProject.color);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* HEADER */}
      <div className={`bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center ${projectColorClasses.hover}`}>
        <div>
          <button
            onClick={() => setSelectedProjectId(null)}
            className={`flex items-center gap-2 text-sm text-slate-500 hover:${projectColorClasses.text} mb-3 transition-colors font-medium`}
          >
            <ArrowLeft size={16} /> Kembali ke Daftar Project
          </button>

          <div className="flex items-center gap-4 mb-2">
            <div className={`p-3 rounded-xl ring-2 ${projectColorClasses.bg} ${projectColorClasses.text} ${projectColorClasses.ring} shadow-sm`}>
              <ProjectIcon size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{selectedProject.name}</h1>
              <p className="text-sm text-slate-500">{selectedProject.description}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Refresh Button */}
          <button
            onClick={() => {
              loadProjectTasks();
              setProjectStatsCache(prev => {
                const newCache = { ...prev };
                delete newCache[selectedProjectId || ''];
                return newCache;
              });
              onRefreshNeeded?.();
            }}
            disabled={tasksLoading}
            className="flex items-center gap-2 px-3 py-2 border border-slate-300 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={tasksLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          
          <div className="text-right">
            <p className="text-xs text-slate-400 font-semibold uppercase">Project Manager</p>
            <p className="font-bold text-slate-700">{selectedProject.manager}</p>
          </div>
          <div className="text-right pl-6 border-l border-slate-100">
            <p className="text-xs text-slate-400 font-semibold uppercase">Progress</p>
            <p className={`font-bold ${projectColorClasses.text} text-lg`}>{selectedStats?.progress || 0}%</p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* LEFT COLUMN */}
          <div className="xl:col-span-2 space-y-8">
            {/* TASK LIST */}
            <section>
              <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <List size={16} /> Daftar Tugas ({tasksTotalCount})
                </h3>

                <div className="flex gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari task, PIC, kategori..."
                      value={taskSearch}
                      onChange={(e) => setTaskSearch(e.target.value)}
                      className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-400 outline-none w-48"
                    />
                  </div>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as Status | 'All')}
                    className="px-2 py-1.5 text-xs border rounded-lg bg-white text-slate-600"
                  >
                    <option value="All">Semua Status</option>
                    {Object.values(Status).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  {/* Priority Filter */}
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as Priority | 'All')}
                    className="px-2 py-1.5 text-xs border rounded-lg bg-white text-slate-600"
                  >
                    <option value="All">Semua Prioritas</option>
                    {Object.values(Priority).map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TASK TABLE */}
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {tasksLoading ? (
                  <div className="p-8 text-center">
                    <div className="flex items-center justify-center gap-3 text-slate-500">
                      <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                      <span>Memuat tasks...</span>
                    </div>
                  </div>
                ) : tasks.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left min-w-[800px]">
                      <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3 w-2/5">Task</th>
                          <th className="px-4 py-3 w-1/6">PIC</th>
                          <th className="px-4 py-3 w-1/6">Status</th>
                          <th className="px-4 py-3 w-1/6">Prioritas</th>
                          <th className="px-4 py-3 w-1/6 text-right">Deadline</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y">
                        {tasks.map(task => (
                          <tr 
                            key={task.id} 
                            onClick={() => onTaskClick?.(task)}
                            className="hover:bg-slate-50 transition cursor-pointer group"
                          >
                            {/* Name */}
                            <td className="px-4 py-3 font-medium text-slate-800">
                              <div className="group-hover:text-gov-600 transition-colors">{task.title}</div>
                              <div className="text-[10px] text-slate-400">{task.subCategory}</div>
                            </td>

                            {/* PIC */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {Array.isArray(task.pic) ? (
                                  task.pic.length > 0 ? (
                                    <>
                                      <div className="flex items-center -space-x-1">
                                        {task.pic.slice(0, 2).map((picName, index) => {
                                          const picUser = users.find(u => u.name === picName);
                                          return (
                                            <UserAvatar
                                              key={index}
                                              name={picName}
                                              profilePhoto={picUser?.profilePhoto}
                                              size="xs"
                                              className="ring-2 ring-white"
                                            />
                                          );
                                        })}
                                        {task.pic.length > 2 && (
                                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 ring-2 ring-white" title={`+${task.pic.length - 2} more`}>
                                            +{task.pic.length - 2}
                                          </div>
                                        )}
                                      </div>
                                      <span className="text-slate-600">
                                        {task.pic.length === 1 ? task.pic[0] : `${task.pic.length} PICs`}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-slate-400">No PIC</span>
                                  )
                                ) : (
                                  // Backward compatibility
                                  <>
                                    {(() => {
                                      const picName = typeof task.pic === 'string' ? task.pic : '';
                                      const picUser = users.find(u => u.name === picName);
                                      return (
                                        <UserAvatar
                                          name={picName || 'Unknown'}
                                          profilePhoto={picUser?.profilePhoto}
                                          size="xs"
                                        />
                                      );
                                    })()}
                                    <span className="text-slate-600">{typeof task.pic === 'string' ? task.pic : 'No PIC'}</span>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${
                                task.status === Status.Done
                                  ? 'bg-green-100 text-green-700'
                                  : task.status === Status.ToDo
                                  ? 'bg-slate-100 text-slate-600'
                                  : task.status === Status.InProgress
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {task.status}
                              </span>
                            </td>

                            {/* Priority */}
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${
                                task.priority === Priority.Urgent
                                  ? 'bg-red-100 text-red-700'
                                  : task.priority === Priority.High
                                  ? 'bg-orange-100 text-orange-700'
                                  : task.priority === Priority.Medium
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {task.priority}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-right text-xs text-slate-500 font-mono">
                              {task.startDate === task.deadline 
                                ? task.deadline 
                                : `${task.startDate} - ${task.deadline}`
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t">
                      <span className="text-xs text-slate-500">
                        Halaman <b>{currentPage}</b> dari {tasksTotalPages || 1}
                        <span className="ml-2 text-slate-400">
                          ({tasks.length} dari {tasksTotalCount} task)
                        </span>
                      </span>

                      <div className="flex gap-2">
                        <button
                          disabled={currentPage === 1 || tasksLoading}
                          onClick={() => setCurrentPage(p => p - 1)}
                          className="p-1.5 rounded-md border disabled:opacity-40 hover:bg-slate-100"
                        >
                          <ChevronLeft size={14} />
                        </button>

                        <button
                          disabled={currentPage === tasksTotalPages || tasksLoading}
                          onClick={() => setCurrentPage(p => p + 1)}
                          className="p-1.5 rounded-md border disabled:opacity-40 hover:bg-slate-100"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-slate-400">
                    Tidak ada task sesuai filter
                  </div>
                )}
              </div>
            </section>

            {/* DOCUMENTS SECTION */}
            <section>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText size={16} /> Dokumen Project ({documentsList.length})
              </h3>

              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {documentsList.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                    <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Nama File</th>
                        <th className="px-4 py-3">Tipe</th>
                        <th className="px-4 py-3">Task</th>
                        <th className="px-4 py-3 text-right">Download</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {documentsList.map((d, i) => (
                        <tr key={`${d.id}-${i}`} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 flex items-center gap-2 text-slate-700">
                            <FileText size={16} className="text-gov-500" />
                            {d.name}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{d.type || 'FILE'}</td>
                          <td className="px-4 py-3 text-slate-500">{d.taskTitle}</td>
                          <td className="px-4 py-3 text-right">
  <button
    onClick={async () => {
      try {
        if (d.url) {
          window.open(d.url, "_blank");
          return;
        }
        // fallback: if we have a storage path but no url, create signed url on demand
        if (d.path) {
          const { data, error } = await supabase
            .storage
            .from('attachment')
            .createSignedUrl(d.path, 60 * 60);
          if (error || !data?.signedUrl) {
            alert('Gagal membuat URL download.');
            return;
          }
          window.open(data.signedUrl, '_blank');
          return;
        }
        alert('File belum tersedia untuk di-download.');
      } catch (err) {
        alert('Terjadi kesalahan saat mencoba download file.');
      }
    }}
    className="p-1.5 text-slate-400 hover:text-gov-600 hover:bg-gov-50 rounded transition-colors"
    aria-label={`Download ${d.name}`}
  >
    <Download size={16} />
  </button>
</td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400">
                    Belum ada dokumen yang diunggah.
                  </div>
                )}
              </div>
            </section>

            {/* LINKS SECTION */}
            <section>
              {(() => {
                const LINKS_PER_PAGE = 10;
                
                // Collect all links from tasks
                const linksList = tasks.flatMap(t =>
                  (t.links || []).map(link => ({
                    ...link,
                    taskId: t.id,
                    taskTitle: t.title,
                    uniqueId: `${t.id}_${link.id}`
                  }))
                );

                // Sort: pinned first, then by title
                const sortedLinks = [...linksList].sort((a, b) => {
                  const aPinned = pinnedLinkIds.has(a.uniqueId);
                  const bPinned = pinnedLinkIds.has(b.uniqueId);
                  if (aPinned && !bPinned) return -1;
                  if (!aPinned && bPinned) return 1;
                  return a.title.localeCompare(b.title);
                });

                // Pagination
                const totalLinksPages = Math.ceil(sortedLinks.length / LINKS_PER_PAGE);
                const paginatedLinks = sortedLinks.slice(
                  (linksPage - 1) * LINKS_PER_PAGE,
                  linksPage * LINKS_PER_PAGE
                );

                return (
                  <>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Link2 size={16} /> Link Project ({linksList.length})
                    </h3>

                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                      {sortedLinks.length > 0 ? (
                        <>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[600px]">
                              <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
                                <tr>
                                  <th className="px-4 py-3 w-8"></th>
                                  <th className="px-4 py-3">Judul Link</th>
                                  <th className="px-4 py-3">Task</th>
                                  <th className="px-4 py-3 text-right">Aksi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {paginatedLinks.map((link) => {
                                  const isPinned = pinnedLinkIds.has(link.uniqueId);
                                  return (
                                    <tr 
                                      key={link.uniqueId} 
                                      className={`hover:bg-slate-50 transition ${isPinned ? 'bg-amber-50/50' : ''}`}
                                    >
                                      <td className="px-4 py-3">
                                        <button
                                          onClick={() => togglePinLink(link.uniqueId)}
                                          className={`p-1 rounded transition-colors ${
                                            isPinned 
                                              ? 'text-amber-500 hover:text-amber-600' 
                                              : 'text-slate-300 hover:text-slate-500'
                                          }`}
                                          title={isPinned ? 'Unpin' : 'Pin to top'}
                                        >
                                          <Pin size={14} className={isPinned ? 'fill-current' : ''} />
                                        </button>
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 text-slate-700">
                                          <Link2 size={14} className="text-gov-500 flex-shrink-0" />
                                          <span className="truncate max-w-[200px]" title={link.title}>
                                            {link.title}
                                          </span>
                                          {isPinned && (
                                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded">
                                              PINNED
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-slate-500 text-xs">
                                        {link.taskTitle}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <a
                                          href={link.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gov-600 hover:text-gov-700 hover:bg-gov-50 rounded transition-colors"
                                        >
                                          <ExternalLink size={12} />
                                          Buka
                                        </a>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Pagination */}
                          {totalLinksPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t">
                              <span className="text-xs text-slate-500">
                                Halaman <b>{linksPage}</b> dari {totalLinksPages}
                                <span className="ml-2 text-slate-400">
                                  ({paginatedLinks.length} dari {sortedLinks.length} link)
                                </span>
                              </span>

                              <div className="flex gap-2">
                                <button
                                  disabled={linksPage === 1}
                                  onClick={() => setLinksPage(p => p - 1)}
                                  className="p-1.5 rounded-md border disabled:opacity-40 hover:bg-slate-100"
                                >
                                  <ChevronLeft size={14} />
                                </button>

                                <button
                                  disabled={linksPage === totalLinksPages}
                                  onClick={() => setLinksPage(p => p + 1)}
                                  className="p-1.5 rounded-md border disabled:opacity-40 hover:bg-slate-100"
                                >
                                  <ChevronRight size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-8 text-center text-slate-400">
                          Belum ada link yang ditambahkan di task.
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-8">
            {/* TEAM WORKLOAD */}
            <section>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users size={16} /> Tim & Beban Kerja
              </h3>

              {/* Sistem Poin - Lebih Menarik */}
              <div className="bg-gradient-to-r from-gov-50 to-blue-50 rounded-xl border border-gov-200 p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-gov-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">?</span>
                  </div>
                  <h4 className="font-bold text-gov-700 text-sm">Cara Hitung Beban Kerja</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 bg-white/60 rounded-lg p-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-xs font-medium text-slate-700">Urgent = 4 poin</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/60 rounded-lg p-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-xs font-medium text-slate-700">High = 3 poin</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/60 rounded-lg p-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-xs font-medium text-slate-700">Medium = 2 poin</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/60 rounded-lg p-2">
                    <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
                    <span className="text-xs font-medium text-slate-700">Low = 1 poin</span>
                  </div>
                </div>
                
                <div className="mt-3 text-[10px] text-gov-600 bg-white/40 rounded-lg p-2">
                  💡 <strong>Tips:</strong> Semakin tinggi poin, semakin berat beban kerja anggota tim
                </div>
              </div>

              <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
                {(selectedStats?.team || []).map((member, index) => {
                  const workload = getMemberWorkloadInProject(member, selectedStats?.projectTasks || []);
                  const label = getWorkloadLabel(workload.workloadPoints, workload.taskCount);

                  // Tentukan warna avatar berdasarkan beban kerja
                  const getAvatarStyle = () => {
                    if (workload.workloadPoints === 0) return 'bg-slate-100 text-slate-600';
                    if (workload.workloadPoints <= 3) return 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200';
                    if (workload.workloadPoints <= 8) return 'bg-blue-100 text-blue-700 ring-2 ring-blue-200';
                    if (workload.workloadPoints <= 15) return 'bg-orange-100 text-orange-700 ring-2 ring-orange-200';
                    return 'bg-red-100 text-red-700 ring-2 ring-red-200';
                  };

                  return (
                    <div key={`${member}-${index}`} className="group hover:bg-slate-50 rounded-lg p-3 -m-1 transition-all border-b pb-4 last:border-none">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${getAvatarStyle()}`}>
                            {typeof member === 'string' && member.length > 0 ? member.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 group-hover:text-gov-700 transition-colors">{member}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] text-slate-400">{workload.taskCount} task aktif</p>
                              {workload.workloadPoints > 0 && (
                                <div className="flex items-center gap-1">
                                  <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                  <span className="text-[10px] font-bold text-slate-600">{workload.workloadPoints} poin</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`px-3 py-1.5 text-[10px] font-bold rounded-full ${label.color} shadow-sm`}>
                            {label.label}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar beban kerja */}
                      {workload.taskCount > 0 && (
                        <div className="mb-3">
                          <div className="flex justify-between text-[9px] text-slate-500 mb-1">
                            <span>Beban Kerja</span>
                            <span>{Math.min(100, (workload.workloadPoints / 20) * 100).toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                workload.workloadPoints <= 3 ? 'bg-emerald-400' :
                                workload.workloadPoints <= 8 ? 'bg-blue-400' :
                                workload.workloadPoints <= 15 ? 'bg-orange-400' : 'bg-red-400'
                              }`}
                              style={{ width: `${Math.min(100, (workload.workloadPoints / 20) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Breakdown prioritas dengan desain yang lebih menarik */}
                      {workload.taskCount > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {workload.breakdown.urgentCount > 0 && (
                            <div className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded-md border border-red-100">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span className="text-[9px] font-bold">{workload.breakdown.urgentCount} Urgent</span>
                            </div>
                          )}
                          {workload.breakdown.highCount > 0 && (
                            <div className="flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded-md border border-orange-100">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <span className="text-[9px] font-bold">{workload.breakdown.highCount} High</span>
                            </div>
                          )}
                          {workload.breakdown.mediumCount > 0 && (
                            <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-[9px] font-bold">{workload.breakdown.mediumCount} Medium</span>
                            </div>
                          )}
                          {workload.breakdown.lowCount > 0 && (
                            <div className="flex items-center gap-1 bg-slate-50 text-slate-700 px-2 py-1 rounded-md border border-slate-100">
                              <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                              <span className="text-[9px] font-bold">{workload.breakdown.lowCount} Low</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Empty state untuk member tanpa task */}
                      {workload.taskCount === 0 && (
                        <div className="text-center py-2">
                          <span className="text-[10px] text-slate-400 italic">✨ Siap menerima tugas baru</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* SUMMARY STATS */}
            <section>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CheckCircle2 size={16} /> Statistik
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border text-center shadow-sm">
                  <span className="text-2xl font-bold text-slate-800">{selectedStats?.total || 0}</span>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Total Task</span>
                </div>

                <div className="bg-white p-4 rounded-xl border text-center shadow-sm">
                  <span className="text-2xl font-bold text-green-600">{selectedStats?.completed || 0}</span>
                  <span className="block text-[10px] text-green-600/60 uppercase font-bold">Selesai</span>
                </div>

                <div className="col-span-2 bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center px-6">
                  <div>
                    <span className="block text-xl font-bold text-red-600">
                      {(selectedStats?.projectTasks || []).filter(
                        t => t.priority === Priority.Urgent && t.status !== Status.Done
                      ).length}
                    </span>
                    <span className="block text-[10px] text-red-400 uppercase font-bold">Urgent Active</span>
                  </div>

                  <AlertTriangle size={28} className="text-red-200" />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectOverview;
