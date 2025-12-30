// src/components/ActivityLogPage.tsx
// Halaman Activity Log untuk Admin - menampilkan semua aktivitas user

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Activity, Calendar, User as UserIcon, Filter, ChevronLeft, ChevronRight,
    Search, X, LogIn, LogOut, Plus, Edit, Trash2, Eye, RefreshCw, Download
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { User, ProjectDefinition } from '../../types';

interface ActivityLog {
    id: string;
    user_id: string;
    user_name: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    entity_title: string | null;
    project_id: string | null;
    project_name: string | null;
    metadata: Record<string, any>;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
}

interface ActivityLogPageProps {
    currentUser: User | null;
    users: User[];
    projects: ProjectDefinition[];
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
    login: { label: 'Login', icon: LogIn, color: 'text-green-700', bgColor: 'bg-green-100' },
    logout: { label: 'Logout', icon: LogOut, color: 'text-gray-700', bgColor: 'bg-gray-100' },
    create: { label: 'Buat', icon: Plus, color: 'text-blue-700', bgColor: 'bg-blue-100' },
    update: { label: 'Update', icon: Edit, color: 'text-amber-700', bgColor: 'bg-amber-100' },
    delete: { label: 'Hapus', icon: Trash2, color: 'text-red-700', bgColor: 'bg-red-100' },
    view: { label: 'Lihat', icon: Eye, color: 'text-purple-700', bgColor: 'bg-purple-100' },
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
    auth: 'Autentikasi',
    task: 'Task',
    meeting: 'Jadwal',
    project: 'Project',
    user: 'User',
    announcement: 'Pengumuman',
    feedback: 'Feedback',
    master_data: 'Master Data',
};

const ITEMS_PER_PAGE = 20;

const ActivityLogPage: React.FC<ActivityLogPageProps> = ({ currentUser, users, projects }) => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);

    // Filters
    const [filterUser, setFilterUser] = useState<string>('');
    const [filterProject, setFilterProject] = useState<string>('');
    const [filterAction, setFilterAction] = useState<string>('');
    const [filterEntityType, setFilterEntityType] = useState<string>('');
    const [filterDateFrom, setFilterDateFrom] = useState<string>('');
    const [filterDateTo, setFilterDateTo] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showFilters, setShowFilters] = useState(false);

    // Fetch logs
    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('activity_logs')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            // Apply filters
            if (filterUser) {
                query = query.eq('user_id', filterUser);
            }
            if (filterProject) {
                query = query.eq('project_id', filterProject);
            }
            if (filterAction) {
                query = query.eq('action', filterAction);
            }
            if (filterEntityType) {
                query = query.eq('entity_type', filterEntityType);
            }
            if (filterDateFrom) {
                query = query.gte('created_at', `${filterDateFrom}T00:00:00`);
            }
            if (filterDateTo) {
                query = query.lte('created_at', `${filterDateTo}T23:59:59`);
            }
            if (searchQuery) {
                query = query.or(`entity_title.ilike.%${searchQuery}%,user_name.ilike.%${searchQuery}%`);
            }

            // Pagination
            const from = (currentPage - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) {
                console.error('Error fetching activity logs:', error);
                setLogs([]);
            } else {
                setLogs(data || []);
                setTotalCount(count || 0);
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [filterUser, filterProject, filterAction, filterEntityType, filterDateFrom, filterDateTo, searchQuery, currentPage]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterUser, filterProject, filterAction, filterEntityType, filterDateFrom, filterDateTo, searchQuery]);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    const clearFilters = () => {
        setFilterUser('');
        setFilterProject('');
        setFilterAction('');
        setFilterEntityType('');
        setFilterDateFrom('');
        setFilterDateTo('');
        setSearchQuery('');
        setCurrentPage(1);
    };

    const hasActiveFilters = filterUser || filterProject || filterAction || filterEntityType || filterDateFrom || filterDateTo || searchQuery;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const exportToCSV = () => {
        const headers = ['Waktu', 'User', 'Aksi', 'Tipe', 'Judul', 'Project'];
        const rows = logs.map(log => [
            formatDate(log.created_at),
            log.user_name,
            ACTION_CONFIG[log.action]?.label || log.action,
            ENTITY_TYPE_LABELS[log.entity_type] || log.entity_type,
            log.entity_title || '-',
            log.project_name || '-',
        ]);

        const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Check if user is admin
    if (!currentUser || (currentUser.role !== 'Super Admin' && currentUser.role !== 'Atasan')) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Activity size={48} className="mx-auto text-slate-300 mb-4" />
                    <h2 className="text-xl font-semibold text-slate-700">Akses Ditolak</h2>
                    <p className="text-slate-500 mt-2">Hanya Admin yang dapat mengakses halaman ini.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Activity className="text-gov-600" />
                        Activity Log
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {totalCount} aktivitas tercatat
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchLogs}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={18} />
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Export CSV"
                    >
                        <Download size={18} />
                    </button>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${hasActiveFilters
                                ? 'bg-gov-100 text-gov-700'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        <Filter size={16} />
                        Filter
                        {hasActiveFilters && (
                            <span className="bg-gov-600 text-white text-xs px-1.5 py-0.5 rounded-full">!</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-700">Filter</h3>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                            >
                                <X size={14} />
                                Clear All
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="sm:col-span-2 lg:col-span-4">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari berdasarkan judul atau nama user..."
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-gov-400 outline-none"
                                />
                            </div>
                        </div>

                        {/* User Filter */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">User</label>
                            <select
                                value={filterUser}
                                onChange={(e) => setFilterUser(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-gov-400 outline-none"
                            >
                                <option value="">Semua User</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Project Filter */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Project</label>
                            <select
                                value={filterProject}
                                onChange={(e) => setFilterProject(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-gov-400 outline-none"
                            >
                                <option value="">Semua Project</option>
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Action Filter */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Aksi</label>
                            <select
                                value={filterAction}
                                onChange={(e) => setFilterAction(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-gov-400 outline-none"
                            >
                                <option value="">Semua Aksi</option>
                                {Object.entries(ACTION_CONFIG).map(([key, config]) => (
                                    <option key={key} value={key}>
                                        {config.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Entity Type Filter */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Tipe</label>
                            <select
                                value={filterEntityType}
                                onChange={(e) => setFilterEntityType(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-gov-400 outline-none"
                            >
                                <option value="">Semua Tipe</option>
                                {Object.entries(ENTITY_TYPE_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date From */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Dari Tanggal</label>
                            <input
                                type="date"
                                value={filterDateFrom}
                                onChange={(e) => setFilterDateFrom(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-gov-400 outline-none"
                            />
                        </div>

                        {/* Date To */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Sampai Tanggal</label>
                            <input
                                type="date"
                                value={filterDateTo}
                                onChange={(e) => setFilterDateTo(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-gov-400 outline-none"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Logs Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gov-600"></div>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <Activity size={40} className="text-slate-300 mb-3" />
                        <p>Tidak ada aktivitas ditemukan</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Waktu
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Aksi
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Detail
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Project
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {logs.map((log) => {
                                        const actionConfig = ACTION_CONFIG[log.action] || {
                                            label: log.action,
                                            icon: Activity,
                                            color: 'text-slate-600',
                                            bgColor: 'bg-slate-100',
                                        };
                                        const ActionIcon = actionConfig.icon;

                                        return (
                                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                                                    {formatDate(log.created_at)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-gov-100 flex items-center justify-center">
                                                            <UserIcon size={14} className="text-gov-600" />
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700">
                                                            {log.user_name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${actionConfig.bgColor} ${actionConfig.color}`}
                                                    >
                                                        <ActionIcon size={12} />
                                                        {actionConfig.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <span className="text-xs text-slate-400 uppercase">
                                                            {ENTITY_TYPE_LABELS[log.entity_type] || log.entity_type}
                                                        </span>
                                                        {log.entity_title && (
                                                            <p className="text-sm text-slate-700 truncate max-w-xs">
                                                                {log.entity_title}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-500">
                                                    {log.project_name || '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="lg:hidden divide-y divide-slate-100">
                            {logs.map((log) => {
                                const actionConfig = ACTION_CONFIG[log.action] || {
                                    label: log.action,
                                    icon: Activity,
                                    color: 'text-slate-600',
                                    bgColor: 'bg-slate-100',
                                };
                                const ActionIcon = actionConfig.icon;

                                return (
                                    <div key={log.id} className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gov-100 flex items-center justify-center shrink-0">
                                                    <UserIcon size={14} className="text-gov-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-700">{log.user_name}</p>
                                                    <p className="text-xs text-slate-400">{formatDate(log.created_at)}</p>
                                                </div>
                                            </div>
                                            <span
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${actionConfig.bgColor} ${actionConfig.color}`}
                                            >
                                                <ActionIcon size={12} />
                                                {actionConfig.label}
                                            </span>
                                        </div>
                                        <div className="mt-2 ml-10">
                                            <span className="text-xs text-slate-400 uppercase">
                                                {ENTITY_TYPE_LABELS[log.entity_type] || log.entity_type}
                                            </span>
                                            {log.entity_title && (
                                                <p className="text-sm text-slate-700">{log.entity_title}</p>
                                            )}
                                            {log.project_name && (
                                                <p className="text-xs text-slate-500 mt-1">Project: {log.project_name}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                        <div className="text-sm text-slate-500">
                            Halaman {currentPage} dari {totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityLogPage;
