// src/components/ProjectTasksSection.tsx
// Tasks table section for project detail view

import React from 'react';
import { Task, Status, Priority, User } from '../../types';
import UserAvatar from './UserAvatar';
import { List, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProjectTasksSectionProps {
    tasks: Task[];
    tasksLoading: boolean;
    tasksTotalCount: number;
    tasksTotalPages: number;
    currentPage: number;
    setCurrentPage: (value: number | ((prev: number) => number)) => void;
    // Filters
    taskSearch: string;
    setTaskSearch: (value: string) => void;
    statusFilter: Status | 'All';
    setStatusFilter: (value: Status | 'All') => void;
    priorityFilter: Priority | 'All';
    setPriorityFilter: (value: Priority | 'All') => void;
    picFilter: string | 'All';
    setPicFilter: (value: string | 'All') => void;
    uniquePics: string[];
    // Actions
    onTaskClick?: (task: Task) => void;
    users: User[];
}

const ProjectTasksSection: React.FC<ProjectTasksSectionProps> = ({
    tasks, tasksLoading, tasksTotalCount, tasksTotalPages,
    currentPage, setCurrentPage,
    taskSearch, setTaskSearch, statusFilter, setStatusFilter, priorityFilter, setPriorityFilter,
    picFilter, setPicFilter, uniquePics,
    onTaskClick, users
}) => {
    return (
        <section>
            <div className="flex flex-col gap-3 sm:gap-4 mb-4">
                <h3 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <List size={14} /> Daftar Tugas ({tasksTotalCount})
                </h3>

                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari task..."
                            value={taskSearch}
                            onChange={(e) => setTaskSearch(e.target.value)}
                            className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-400 outline-none"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as Status | 'All')}
                        className="px-2 py-1.5 text-xs border rounded-lg bg-white text-slate-600"
                    >
                        <option value="All">Semua Status</option>
                        {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value as Priority | 'All')}
                        className="px-2 py-1.5 text-xs border rounded-lg bg-white text-slate-600"
                    >
                        <option value="All">Semua Prioritas</option>
                        {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>

                    <select
                        value={picFilter}
                        onChange={(e) => setPicFilter(e.target.value)}
                        className="px-2 py-1.5 text-xs border rounded-lg bg-white text-slate-600"
                    >
                        <option value="All">Semua PIC</option>
                        {(uniquePics || []).map(pic => <option key={pic} value={pic}>{pic}</option>)}
                    </select>
                </div>
            </div>

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
                                            <td className="px-4 py-3 font-medium text-slate-800">
                                                <div className="group-hover:text-gov-600 transition-colors">{task.title}</div>
                                                <div className="text-[10px] text-slate-400">{task.subCategory}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {Array.isArray(task.pic) ? (
                                                        task.pic.length > 0 ? (
                                                            <>
                                                                <div className="flex items-center -space-x-1">
                                                                    {task.pic.slice(0, 2).map((picName, index) => (
                                                                        <UserAvatar
                                                                            key={index}
                                                                            name={picName}
                                                                            profilePhoto={users.find(u => u.name === picName)?.profilePhoto}
                                                                            size="xs"
                                                                            className="ring-2 ring-white"
                                                                        />
                                                                    ))}
                                                                    {task.pic.length > 2 && (
                                                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 ring-2 ring-white">
                                                                            +{task.pic.length - 2}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <span className="text-slate-600">
                                                                    {task.pic.length === 1 ? task.pic[0] : `${task.pic.length} PICs`}
                                                                </span>
                                                            </>
                                                        ) : <span className="text-slate-400">No PIC</span>
                                                    ) : (
                                                        <>
                                                            <UserAvatar
                                                                name={typeof task.pic === 'string' ? task.pic : 'Unknown'}
                                                                profilePhoto={users.find(u => u.name === (typeof task.pic === 'string' ? task.pic : ''))?.profilePhoto}
                                                                size="xs"
                                                            />
                                                            <span className="text-slate-600">{typeof task.pic === 'string' ? task.pic : 'No PIC'}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${task.status === Status.Done ? 'bg-green-100 text-green-700' :
                                                    task.status === Status.ToDo ? 'bg-slate-100 text-slate-600' :
                                                        task.status === Status.InProgress ? 'bg-blue-100 text-blue-700' :
                                                            'bg-orange-100 text-orange-700'
                                                    }`}>
                                                    {task.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${task.priority === Priority.Urgent ? 'bg-red-100 text-red-700' :
                                                    task.priority === Priority.High ? 'bg-orange-100 text-orange-700' :
                                                        task.priority === Priority.Medium ? 'bg-blue-100 text-blue-700' :
                                                            'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {task.priority}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs text-slate-500 font-mono">
                                                {task.startDate === task.deadline ? task.deadline : `${task.startDate} - ${task.deadline}`}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t">
                                <span className="text-xs text-slate-500">
                                    Halaman <b>{currentPage}</b> dari {tasksTotalPages || 1}
                                    <span className="ml-2 text-slate-400">({tasks.length} dari {tasksTotalCount} task)</span>
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
    );
};

export default ProjectTasksSection;
