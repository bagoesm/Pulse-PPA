// src/components/ProjectListView.tsx
// Project list grid with filtering and pagination

import React from 'react';
import { ProjectDefinition, User } from '../../types';
import UserAvatar from './UserAvatar';
import {
    Briefcase, ChevronRight, ChevronLeft, Search, Plus, RefreshCw,
    Edit3, Trash2,
    Code, Database, Globe, Smartphone, Monitor, Server, Cloud, Shield,
    Zap, Target, Rocket, Star, Heart, Lightbulb, Settings, Users, FileText, BarChart3, Layers
} from 'lucide-react';
import SearchableSelect from './SearchableSelect';

interface ProjectStats {
    total: number;
    completed: number;
    progress: number;
    team: string[];
    documents: number;
}

interface ProjectListViewProps {
    projects: ProjectDefinition[];
    projectsLoading: boolean;
    projectsTotalCount: number;
    projectsTotalPages: number;
    projectPage: number;
    setProjectPage: (value: number | ((prev: number) => number)) => void;
    projectStatsCache: Record<string, ProjectStats>;
    loadingStats: Record<string, boolean>;
    // Filters
    projectSearch: string;
    setProjectSearch: (value: string) => void;
    debouncedSearch: string;
    projectStatusFilter: string;
    setProjectStatusFilter: (value: any) => void;
    managerFilter: string;
    setManagerFilter: (value: string) => void;
    uniqueManagers: string[];
    // Actions
    onSelectProject: (projectId: string) => void;
    onCreateProject?: () => void;
    onEditProject?: (project: ProjectDefinition) => void;
    onDeleteProject?: (projectId: string) => void;
    onRefresh: () => void;
    canManageProjects: boolean;
    currentUserName?: string; // To check if user is project manager
    users: User[];
}

// Icon and color mappings
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

const getProgressBarColorHex = (color: string = 'blue') => {
    const colorMap: Record<string, string> = {
        blue: '#3b82f6', green: '#10b981', purple: '#8b5cf6', orange: '#f97316',
        red: '#ef4444', indigo: '#6366f1', pink: '#ec4899', teal: '#14b8a6',
    };
    return colorMap[color] || colorMap.blue;
};

const ProjectListView: React.FC<ProjectListViewProps> = ({
    projects, projectsLoading, projectsTotalCount, projectsTotalPages, projectPage, setProjectPage,
    projectStatsCache, loadingStats,
    projectSearch, setProjectSearch, debouncedSearch, projectStatusFilter, setProjectStatusFilter,
    managerFilter, setManagerFilter, uniqueManagers,
    onSelectProject, onCreateProject, onEditProject, onDeleteProject, onRefresh,
    canManageProjects, currentUserName, users
}) => {
    return (
        <div className="p-4 sm:p-8 h-full overflow-y-auto bg-slate-50">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1">Daftar Project</h2>
                    <p className="text-slate-500 text-xs sm:text-sm">Kelola dan pantau project tim</p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <button
                        onClick={onRefresh}
                        disabled={projectsLoading}
                        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 border border-slate-300 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 text-sm"
                        title="Refresh Data"
                    >
                        <RefreshCw size={14} className={projectsLoading ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>

                    {/* All users can create projects */}
                    <button
                        onClick={onCreateProject}
                        className="flex items-center gap-1 sm:gap-2 bg-gov-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium hover:bg-gov-700 transition-colors shadow-sm text-sm flex-1 sm:flex-none justify-center"
                    >
                        <Plus size={14} />
                        <span className="hidden sm:inline">Buat Project Baru</span>
                        <span className="sm:hidden">Project</span>
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari project..."
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 sm:py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                        />
                    </div>

                    <div className="flex gap-3">
                        <select
                            value={projectStatusFilter}
                            onChange={(e) => setProjectStatusFilter(e.target.value)}
                            className="px-2 sm:px-3 py-2 sm:py-2.5 border border-slate-300 rounded-lg bg-white text-xs sm:text-sm focus:ring-2 focus:ring-gov-400 outline-none"
                        >
                            <option value="All">Status</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Pending">Pending</option>
                            <option value="Live">Live</option>
                        </select>

                        <SearchableSelect
                            options={(uniqueManagers || []).map(manager => ({ value: manager, label: manager }))}
                            value={managerFilter === 'All' ? '' : managerFilter}
                            onChange={(val) => setManagerFilter(val || 'All')}
                            placeholder="Filter Manager..."
                            emptyOption="Semua Manager"
                            className="w-[180px]"
                        />

                        {(projectSearch || projectStatusFilter !== 'All' || managerFilter !== 'All') && (
                            <button
                                onClick={() => {
                                    setProjectSearch('');
                                    setProjectStatusFilter('All');
                                    setManagerFilter('All');
                                }}
                                className="px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm text-slate-500">
                            <span className="font-semibold text-slate-700">{(projects || []).length}</span>/{projectsTotalCount} project
                            {debouncedSearch && (
                                <span className="hidden sm:inline"> untuk "<span className="font-semibold text-slate-700">{debouncedSearch}</span>"</span>
                            )}
                        </p>
                        {(projectsLoading || projectSearch !== debouncedSearch) && (
                            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-400">
                                <div className="w-3 h-3 border border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                                {projectsLoading ? 'Memuat...' : 'Mencari...'}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {projectsLoading && (
                <div className="flex items-center justify-center py-8 sm:py-12">
                    <div className="flex items-center gap-2 sm:gap-3 text-slate-500">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm">Memuat project...</span>
                    </div>
                </div>
            )}

            {/* Project Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {!projectsLoading && (projects || []).map(project => {
                    const ProjectIcon = iconMap[project.icon || 'Briefcase'] || Briefcase;
                    const colorClasses = getColorClasses(project.color);
                    const stats = projectStatsCache[project.id] || { total: 0, completed: 0, progress: 0, team: [], documents: 0 };
                    const isLoadingStats = loadingStats[project.id] || false;

                    // Check if user can manage this specific project
                    const isProjectManager = currentUserName && project.manager === currentUserName;
                    const canEditThis = canManageProjects || isProjectManager;
                    const canDeleteThis = canManageProjects || isProjectManager;

                    return (
                        <div
                            key={project.id}
                            className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 hover:shadow-md hover:border-slate-300 transition-all group relative"
                        >
                            {(canEditThis || canDeleteThis) && (
                                <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    {canEditThis && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEditProject?.(project); }}
                                            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm"
                                            title="Edit Project"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                    )}
                                    {canDeleteThis && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeleteProject?.(project.id); }}
                                            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-all shadow-sm"
                                            title="Hapus Project"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            )}

                            <div onClick={() => onSelectProject(project.id)} className="cursor-pointer">
                                <div className="flex items-start justify-between mb-3 sm:mb-4">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className={`p-2 sm:p-3 rounded-lg ${colorClasses.bg} ${colorClasses.text} group-hover:scale-105 transition-transform shadow-sm`}>
                                            <ProjectIcon size={20} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm sm:text-lg font-bold text-slate-800 group-hover:text-slate-900 transition-colors leading-tight truncate">
                                                {project.name}
                                            </h3>
                                            <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                                                <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Target:</span>
                                                <span className="text-[10px] sm:text-xs font-semibold text-slate-600">{project.targetLiveDate || 'TBD'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-2">
                                        <span className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold ${project.status === 'Live' ? 'bg-green-100 text-green-700' :
                                            project.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                                'bg-orange-100 text-orange-700'
                                            }`}>
                                            {project.status || 'In Progress'}
                                        </span>
                                    </div>
                                </div>

                                <p className="text-xs sm:text-sm text-slate-500 mb-3 sm:mb-4 line-clamp-2 leading-relaxed">
                                    {project.description || 'No description available'}
                                </p>

                                <div className="mb-3 sm:mb-4">
                                    <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                                        <span className="text-[10px] sm:text-xs font-medium text-slate-600">Progress</span>
                                        {isLoadingStats ? (
                                            <div className="w-3 h-3 border border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <span className="text-xs sm:text-sm font-bold text-slate-800">{stats.progress}%</span>
                                        )}
                                    </div>
                                    <div className="h-1.5 sm:h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        {isLoadingStats ? (
                                            <div className="h-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 animate-pulse rounded-full"></div>
                                        ) : (
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${stats.progress}%`, backgroundColor: getProgressBarColorHex(project.color) }}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                                    {['Team', 'Tasks', 'Done'].map((label, idx) => (
                                        <div key={label} className="text-center p-1.5 sm:p-2 bg-slate-50 rounded-lg border border-slate-100">
                                            {isLoadingStats ? (
                                                <div className="w-4 h-4 bg-slate-200 rounded animate-pulse mx-auto mb-0.5"></div>
                                            ) : (
                                                <div className="text-xs sm:text-sm font-bold text-slate-800">
                                                    {idx === 0 ? stats.team.length : idx === 1 ? stats.total : stats.completed}
                                                </div>
                                            )}
                                            <div className="text-[10px] sm:text-xs text-slate-500">{label}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <UserAvatar
                                            name={project.manager || 'Unknown'}
                                            profilePhoto={(users || []).find(u => u.name === project.manager)?.profilePhoto}
                                            size="sm"
                                        />
                                        <div className="hidden sm:block">
                                            <div className="text-xs font-semibold text-slate-700">{project.manager}</div>
                                            <div className="text-[10px] text-slate-500">PIC Project</div>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1 ${colorClasses.text} text-[10px] sm:text-xs font-medium group-hover:translate-x-1 transition-transform`}>
                                        <span>Detail</span>
                                        <ChevronRight size={12} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Empty State */}
                {!projectsLoading && (projects || []).length === 0 && (
                    <div className="col-span-full">
                        <div className="text-center py-8 sm:py-12">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                <Briefcase size={20} className="text-slate-400" />
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold text-slate-600 mb-2">
                                {projectSearch || projectStatusFilter !== 'All' || managerFilter !== 'All'
                                    ? 'Tidak ada project yang sesuai'
                                    : 'Belum ada project'}
                            </h3>
                            <p className="text-slate-500 mb-4">
                                {projectSearch || projectStatusFilter !== 'All' || managerFilter !== 'All'
                                    ? 'Coba ubah filter atau kata kunci pencarian'
                                    : 'Mulai dengan membuat project pertama Anda'}
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
                            ) : (
                                <button
                                    onClick={onCreateProject}
                                    className="px-4 py-2 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors"
                                >
                                    Buat Project Pertama
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {!projectsLoading && projectsTotalPages > 1 && (
                <div className="flex items-center justify-between mt-6 bg-white rounded-xl border border-slate-200 px-4 py-3">
                    <span className="text-sm text-slate-500">
                        Halaman <span className="font-semibold">{projectPage}</span> dari {projectsTotalPages}
                        <span className="ml-2 text-slate-400">({(projects || []).length} dari {projectsTotalCount} project)</span>
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={projectPage === 1}
                            onClick={() => setProjectPage(p => p - 1)}
                            className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex gap-1">
                            {Array.from({ length: Math.min(5, projectsTotalPages) }, (_, i) => {
                                let pageNum;
                                if (projectsTotalPages <= 5) pageNum = i + 1;
                                else if (projectPage <= 3) pageNum = i + 1;
                                else if (projectPage >= projectsTotalPages - 2) pageNum = projectsTotalPages - 4 + i;
                                else pageNum = projectPage - 2 + i;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setProjectPage(pageNum)}
                                        className={`px-3 py-2 text-sm rounded-lg transition-colors ${pageNum === projectPage ? 'bg-gov-600 text-white' : 'text-slate-600 hover:bg-slate-100'
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
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectListView;
