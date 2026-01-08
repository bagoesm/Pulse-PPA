// src/components/EpicCard.tsx
import React from 'react';
import {
    Layers, Target, Flag, Star, Rocket, Zap, Shield, Heart, Lightbulb, Trophy, Bookmark, Compass,
    Edit3, Trash2, Calendar, Users, CheckCircle2
} from 'lucide-react';
import { Epic, Task } from '../../types';

interface EpicCardProps {
    epic: Epic;
    tasks: Task[];
    onEdit?: (epic: Epic) => void;
    onDelete?: (epicId: string) => void;
    onClick?: (epic: Epic) => void;
    canEdit?: boolean;
    canDelete?: boolean;
    compact?: boolean;
    progress?: number;
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

const EpicCard: React.FC<EpicCardProps> = ({
    epic,
    tasks,
    onEdit,
    onDelete,
    onClick,
    canEdit = false,
    canDelete = false,
    compact = false,
    progress: passedProgress
}) => {
    const IconComponent = iconMap[epic.icon || 'Layers'] || Layers;
    const colors = colorClasses[epic.color || 'blue'] || colorClasses.blue;

    // Calculate progress (use passed progress if available)
    const epicTasks = tasks.filter(t => t.epicId === epic.id);
    const completedTasks = epicTasks.filter(t => t.status === 'Done');
    const progress = passedProgress !== undefined
        ? passedProgress
        : (epicTasks.length > 0
            ? Math.round((completedTasks.length / epicTasks.length) * 100)
            : 0);

    // Format date
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    };

    const statusColors = {
        'Not Started': 'bg-slate-100 text-slate-600',
        'In Progress': 'bg-blue-100 text-blue-700',
        'Completed': 'bg-green-100 text-green-700'
    };

    if (compact) {
        return (
            <div
                className={`flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group`}
                onClick={() => onClick?.(epic)}
            >
                <div className={`p-1.5 rounded-lg ${colors.bg} ${colors.text}`}>
                    <IconComponent size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-slate-800 truncate">{epic.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${statusColors[epic.status]}`}>
                            {epic.status}
                        </span>
                        <span className="text-[10px] text-slate-400">
                            {completedTasks.length}/{epicTasks.length} tasks
                        </span>
                    </div>
                </div>
                {/* Progress bar mini */}
                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${colors.progress} transition-all`} style={{ width: `${progress}%` }} />
                </div>
                {(canEdit || canDelete) && (
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                        {canEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit?.(epic); }}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                                <Edit3 size={14} />
                            </button>
                        )}
                        {canDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete?.(epic.id); }}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            className={`bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all cursor-pointer group overflow-hidden`}
            onClick={() => onClick?.(epic)}
        >
            {/* Header with gradient */}
            <div className={`px-4 py-3 ${colors.bg} border-b border-slate-100`}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-white/60 ${colors.text} ring-2 ${colors.ring}`}>
                            <IconComponent size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">{epic.name}</h3>
                            <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${statusColors[epic.status]}`}>
                                {epic.status}
                            </span>
                        </div>
                    </div>
                    {(canEdit || canDelete) && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                            {canEdit && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit?.(epic); }}
                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                                    title="Edit Epic"
                                >
                                    <Edit3 size={16} />
                                </button>
                            )}
                            {canDelete && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete?.(epic.id); }}
                                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                                    title="Hapus Epic"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="p-4">
                {epic.description && (
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">{epic.description}</p>
                )}

                {/* Progress */}
                <div className="mb-3">
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-medium text-slate-600">Progress</span>
                        <span className="text-xs font-bold text-slate-700">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${colors.progress} transition-all duration-500 ease-out`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <CheckCircle2 size={14} className="text-green-500" />
                        <span>{completedTasks.length}/{epicTasks.length} Tasks</span>
                    </div>
                    {epic.pic && epic.pic.length > 0 && (
                        <div className="flex items-center gap-1">
                            <Users size={14} />
                            <span>{epic.pic.length} PIC</span>
                        </div>
                    )}
                </div>

                {/* Date range */}
                {(epic.startDate || epic.targetDate) && (
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                        <Calendar size={12} />
                        <span>
                            {formatDate(epic.startDate)} - {formatDate(epic.targetDate)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EpicCard;
