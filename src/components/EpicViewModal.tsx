// src/components/EpicViewModal.tsx
import React from 'react';
import { Layers, X, Target, Flag, Star, Rocket, Zap, Shield, Heart, Lightbulb, Trophy, Bookmark, Compass, Calendar, CheckCircle2, ListTodo, ExternalLink } from 'lucide-react';
import { Epic, Task, Status, Priority } from '../../types';

interface EpicViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    epic: Epic | null;
    tasks: Task[];
    onViewKanban: () => void;
}

const iconMap: Record<string, React.ElementType> = {
    Layers, Target, Flag, Star, Rocket, Zap, Shield, Heart, Lightbulb, Trophy, Bookmark, Compass
};

const colorClasses: Record<string, { bg: string; text: string; ring: string; progress: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-200', progress: 'bg-blue-500' },
    green: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200', progress: 'bg-emerald-500' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-200', progress: 'bg-purple-500' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-200', progress: 'bg-orange-500' },
    red: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-200', progress: 'bg-red-500' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', ring: 'ring-indigo-200', progress: 'bg-indigo-500' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-700', ring: 'ring-pink-200', progress: 'bg-pink-500' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-700', ring: 'ring-teal-200', progress: 'bg-teal-500' }
};

const statusColors = {
    'Not Started': 'bg-slate-100 text-slate-600',
    'In Progress': 'bg-blue-100 text-blue-700',
    'Completed': 'bg-green-100 text-green-700'
};

const EpicViewModal: React.FC<EpicViewModalProps> = ({ isOpen, onClose, epic, tasks, onViewKanban }) => {
    if (!isOpen || !epic) return null;

    const IconComponent = iconMap[epic.icon || 'Layers'] || Layers;
    const colors = colorClasses[epic.color || 'blue'] || colorClasses.blue;

    const epicTasks = tasks;
    const completedTasks = epicTasks.filter(t => t.status === Status.Done);
    const progress = epicTasks.length > 0
        ? Math.round((completedTasks.length / epicTasks.length) * 100)
        : 0;

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getPriorityColor = (priority: Priority) => {
        switch (priority) {
            case Priority.Urgent: return 'bg-red-100 text-red-700';
            case Priority.High: return 'bg-orange-100 text-orange-700';
            case Priority.Medium: return 'bg-blue-100 text-blue-700';
            case Priority.Low: return 'bg-slate-100 text-slate-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`px-6 py-5 ${colors.bg} flex justify-between items-start border-b border-slate-100 shrink-0`}>
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl bg-white/60 ${colors.text} ring-4 ${colors.ring}`}>
                            <IconComponent size={28} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-xl font-bold text-slate-800">{epic.name}</h2>
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${statusColors[epic.status]}`}>
                                    {epic.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600 font-medium">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={14} />
                                    <span>
                                        {formatDate(epic.startDate)} - {formatDate(epic.targetDate)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 flex-1 bg-slate-50">
                    <div className="grid gap-6">
                        {/* Description & Progress Section */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-700 mb-2">Deskripsi</h3>
                            <p className="text-sm text-slate-600 leading-relaxed max-w-none">
                                {epic.description || 'Tidak ada deskripsi.'}
                            </p>

                            <div className="mt-5 pt-5 border-t border-slate-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-bold text-slate-700">Progress</span>
                                    <span className="text-sm font-bold text-slate-800">{progress}%</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${colors.progress} transition-all duration-500 ease-out`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 font-medium">
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                        <span>{completedTasks.length} Task Selesai</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <ListTodo size={14} className="text-slate-400" />
                                        <span>{epicTasks.length} Total Task</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Task List Section */}
                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-end mb-1">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <ListTodo size={16} className="text-purple-600" />
                                        Task dalam Epic ini
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Daftar semua pekerjaan yang tergabung dalam epic ini</p>
                                </div>
                                <button
                                    onClick={onViewKanban}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                                >
                                    <ExternalLink size={14} />
                                    Buka di Kanban
                                </button>
                            </div>

                            <div className="flex flex-col gap-2">
                                {epicTasks.length === 0 ? (
                                    <div className="text-center py-8 bg-white border border-slate-200 border-dashed rounded-xl">
                                        <p className="text-sm text-slate-500 font-medium">Belum ada task di epic ini.</p>
                                    </div>
                                ) : (
                                    epicTasks.map((task) => (
                                        <div key={task.id} className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-colors">
                                            <div className="flex flex-col gap-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 ${getPriorityColor(task.priority)}`}>
                                                        {task.priority || 'Medium'}
                                                    </span>
                                                    <h4 className="text-sm font-semibold text-slate-800 truncate" title={task.title}>
                                                        {task.title}
                                                    </h4>
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                                    <span>{task.subCategory || task.category}</span>
                                                    <span>•</span>
                                                    <span className={task.status === Status.Done ? 'text-emerald-600 font-semibold' : ''}>
                                                        {task.status}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* optional: small chevron indicating it's viewable, but we don't handle deep navigation directly right now to keep it simple */}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EpicViewModal;
