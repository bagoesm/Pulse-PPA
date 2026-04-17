// src/components/SubtaskSection.tsx
// Displays subtask list inside TaskViewModal with inline creation
import React, { useState } from 'react';
import { Subtask, Task, Priority, Status, User, MAX_SUBTASKS_PER_TASK } from '../../types';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical, CheckCircle2, Circle, Clock, AlertTriangle, Edit2, X, Check } from 'lucide-react';
import PICDisplay from './PICDisplay';
import CompactPICSelector from './CompactPICSelector';

interface SubtaskSectionProps {
    parentTask: Task;
    subtasks: Subtask[];
    users: User[];
    canManage: boolean;
    onCreateSubtask: (data: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    onUpdateSubtask: (subtaskId: string, updates: Partial<Subtask>) => Promise<void>;
    onToggleStatus: (subtaskId: string) => Promise<void>;
    onDeleteSubtask: (subtaskId: string) => Promise<void>;
}

const priorityColors: Record<string, string> = {
    Low: 'bg-slate-100 text-slate-600',
    Medium: 'bg-blue-100 text-blue-700',
    High: 'bg-orange-100 text-orange-700',
    Urgent: 'bg-red-100 text-red-700',
};

const statusIcons: Record<string, React.ReactNode> = {
    'To Do': <Circle size={16} className="text-slate-400" />,
    'In Progress': <Clock size={16} className="text-blue-500" />,
    'Pending': <AlertTriangle size={16} className="text-amber-500" />,
    'Review': <Clock size={16} className="text-purple-500" />,
    'Done': <CheckCircle2 size={16} className="text-emerald-500" />,
};

const SubtaskSection: React.FC<SubtaskSectionProps> = ({
    parentTask,
    subtasks,
    users,
    canManage,
    onCreateSubtask,
    onUpdateSubtask,
    onToggleStatus,
    onDeleteSubtask
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newPriority, setNewPriority] = useState<Priority>(parentTask.priority);
    const [newPic, setNewPic] = useState<string[]>(Array.isArray(parentTask.pic) ? parentTask.pic : (parentTask.pic ? [parentTask.pic] : []));
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editPriority, setEditPriority] = useState<Priority>(Priority.Medium);
    const [editPic, setEditPic] = useState<string[]>([]);

    const total = subtasks.length;
    const done = subtasks.filter(s => s.status === Status.Done).length;
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

    const handleQuickAdd = async () => {
        if (!newTitle.trim()) return;
        setIsSubmitting(true);
        try {
            await onCreateSubtask({
                parentTaskId: parentTask.id,
                title: newTitle.trim(),
                pic: newPic.length > 0 ? newPic : (Array.isArray(parentTask.pic) ? parentTask.pic : []),
                priority: newPriority,
                status: Status.ToDo,
                startDate: parentTask.startDate,
                deadline: parentTask.deadline,
                sortOrder: total,
            });
            setNewTitle('');
            setNewPriority(parentTask.priority);
            setNewPic(Array.isArray(parentTask.pic) ? parentTask.pic : (parentTask.pic ? [parentTask.pic] : []));
            setShowAddForm(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEdit = (subtask: Subtask) => {
        setEditingId(subtask.id);
        setEditTitle(subtask.title);
        setEditPriority(subtask.priority as Priority);
        setEditPic(Array.isArray(subtask.pic) ? subtask.pic : (subtask.pic ? [subtask.pic] : []));
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const saveEdit = async (id: string) => {
        if (!editTitle.trim()) return;
        await onUpdateSubtask(id, {
            title: editTitle.trim(),
            priority: editPriority,
            pic: editPic
        });
        setEditingId(null);
    };

    const handleStatusCycle = async (subtask: Subtask) => {
        // Quick cycle: To Do -> In Progress -> Done -> To Do
        const statusOrder = [Status.ToDo, Status.InProgress, Status.Done];
        const currentIndex = statusOrder.indexOf(subtask.status as Status);
        const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
        await onUpdateSubtask(subtask.id, { status: nextStatus });
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        {isExpanded ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronUp size={16} className="text-slate-500" />}
                        <h4 className="text-sm font-bold text-slate-800">Subtask</h4>
                    </div>
                    {total > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500">{done}/{total}</span>
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-300 ${percentage === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
                {total > 0 && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${percentage === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {percentage}%
                    </span>
                )}
            </button>

            {/* Body */}
            {isExpanded && (
                <div className="p-4 pt-2">
                    {/* Subtask List */}
                    {subtasks.length > 0 ? (
                        <div className="space-y-1.5 mb-3">
                            {subtasks.map((subtask) => (
                                <div
                                    key={subtask.id}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all group
                                        ${subtask.status === Status.Done
                                            ? 'bg-emerald-50/50 border-emerald-200/60'
                                            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                        }`}
                                >
                                    {/* Status Toggle */}
                                    <button
                                        onClick={() => canManage ? handleStatusCycle(subtask) : undefined}
                                        className={`flex-shrink-0 transition-transform hover:scale-110 ${canManage ? 'cursor-pointer' : 'cursor-default'}`}
                                        title={`Status: ${subtask.status}`}
                                        disabled={!canManage}
                                    >
                                        {statusIcons[subtask.status] || statusIcons['To Do']}
                                    </button>

                                    {/* Title & Info */}
                                        {editingId === subtask.id ? (
                                            <div className="flex-1 flex flex-col gap-2">
                                                <input
                                                    type="text"
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-400"
                                                    autoFocus
                                                />
                                                <div className="flex gap-2">
                                                    <div className="w-1/3">
                                                        <select
                                                            value={editPriority}
                                                            onChange={(e) => setEditPriority(e.target.value as Priority)}
                                                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:border-blue-400"
                                                        >
                                                            {Object.values(Priority).map(p => (
                                                                <option key={p} value={p}>{p}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="flex-1">
                                                        <CompactPICSelector
                                                            users={users}
                                                            selected={editPic}
                                                            onChange={setEditPic}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 min-w-0 flex items-center gap-2">
                                                <p className={`text-sm font-medium truncate ${subtask.status === Status.Done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                    {subtask.title}
                                                </p>
                                                <span className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded leading-none ${priorityColors[subtask.priority] || priorityColors.Medium}`}>
                                                    {subtask.priority}
                                                </span>
                                            </div>
                                        )}

                                        {/* Date and PIC when not editing */}
                                        {editingId !== subtask.id && (
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {subtask.deadline && (
                                                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                                        {new Date(subtask.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                )}
                                                <PICDisplay
                                                    pic={subtask.pic}
                                                    users={users}
                                                    maxVisible={2}
                                                    size="sm"
                                                    showNames={false}
                                                />
                                            </div>
                                        )}

                                        {/* Actions */}
                                        {canManage && (
                                            <div className="flex-shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-all gap-1">
                                                {editingId === subtask.id ? (
                                                    <>
                                                        <button onClick={() => saveEdit(subtask.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Simpan">
                                                            <Check size={14} />
                                                        </button>
                                                        <button onClick={cancelEdit} className="p-1 text-slate-400 hover:bg-slate-100 rounded" title="Batal">
                                                            <X size={14} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => startEdit(subtask)} className="p-1 text-slate-400 hover:text-blue-500 rounded" title="Edit subtask">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button onClick={() => onDeleteSubtask(subtask.id)} className="p-1 text-slate-400 hover:text-red-500 rounded" title="Hapus subtask">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                        </div>
                    ) : (
                        !showAddForm && (
                            <div className="text-center py-4 text-sm text-slate-400 italic">
                                Belum ada subtask.
                            </div>
                        )
                    )}

                    {/* Quick Add Form */}
                    {showAddForm && (
                        <div className="flex flex-col gap-2 mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <input
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Judul subtask..."
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 bg-white"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleQuickAdd();
                                    }
                                    if (e.key === 'Escape') {
                                        setShowAddForm(false);
                                        setNewTitle('');
                                    }
                                }}
                            />
                            <div className="flex gap-2 mb-2">
                                <div className="w-1/3">
                                    <select
                                        value={newPriority}
                                        onChange={(e) => setNewPriority(e.target.value as Priority)}
                                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 h-full"
                                    >
                                        {Object.values(Priority).map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <CompactPICSelector
                                        users={users}
                                        selected={newPic}
                                        onChange={setNewPic}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-end">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setShowAddForm(false); setNewTitle(''); }}
                                        className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleQuickAdd}
                                        disabled={!newTitle.trim() || isSubmitting}
                                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                        {isSubmitting ? 'Menyimpan...' : 'Tambah'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Add Button */}
                    {canManage && !showAddForm && total < MAX_SUBTASKS_PER_TASK && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="flex items-center gap-1.5 w-full px-3 py-2 mt-1 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-dashed border-slate-200 hover:border-blue-300"
                        >
                            <Plus size={14} />
                            Tambah Subtask
                        </button>
                    )}

                    {/* Limit notice */}
                    {total >= MAX_SUBTASKS_PER_TASK && (
                        <p className="text-[10px] text-slate-400 text-center mt-2">
                            Batas maksimum {MAX_SUBTASKS_PER_TASK} subtask tercapai.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default SubtaskSection;
