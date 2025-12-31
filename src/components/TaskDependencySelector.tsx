// src/components/TaskDependencySelector.tsx
// Component for selecting task dependencies with search functionality
import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Link2, CheckCircle2, Circle } from 'lucide-react';
import { Task, Status } from '../../types';

interface TaskDependencySelectorProps {
    tasks: Task[];
    selectedTaskIds: string[];
    onChange: (taskIds: string[]) => void;
    excludeTaskId?: string; // The task being edited - exclude from options
    disabled?: boolean;
    placeholder?: string;
}

const TaskDependencySelector: React.FC<TaskDependencySelectorProps> = ({
    tasks,
    selectedTaskIds,
    onChange,
    excludeTaskId,
    disabled = false,
    placeholder = 'Cari task...'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter out the current task from options, and filter by search query
    const availableTasks = tasks.filter(task => {
        if (excludeTaskId && task.id === excludeTaskId) return false;
        // Show all tasks when no search query, or filter by title
        if (!searchQuery.trim()) return true;
        return task.title.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Get selected task objects for display
    const selectedTasks = tasks.filter(task => selectedTaskIds.includes(task.id));

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (taskId: string) => {
        if (selectedTaskIds.includes(taskId)) {
            onChange(selectedTaskIds.filter(id => id !== taskId));
        } else {
            onChange([...selectedTaskIds, taskId]);
        }
    };

    const handleRemove = (taskId: string) => {
        onChange(selectedTaskIds.filter(id => id !== taskId));
    };

    const getStatusColor = (status: Status) => {
        switch (status) {
            case Status.Done: return 'text-green-600';
            case Status.InProgress: return 'text-blue-600';
            case Status.Pending: return 'text-yellow-600';
            case Status.Review: return 'text-purple-600';
            default: return 'text-slate-400';
        }
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Selected Tasks Chips */}
            {selectedTasks.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {selectedTasks.map(task => (
                        <div
                            key={task.id}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${task.status === Status.Done
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                        >
                            {task.status === Status.Done ? (
                                <CheckCircle2 size={12} className="text-green-500" />
                            ) : (
                                <Circle size={12} className="text-slate-400" />
                            )}
                            <span className="max-w-[150px] truncate">{task.title}</span>
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => handleRemove(task.id)}
                                    className="p-0.5 hover:bg-slate-200 rounded-full transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Search Input */}
            {!disabled && (
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsOpen(true)}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 pl-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                    />
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
            )}

            {/* Dropdown */}
            {isOpen && !disabled && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {availableTasks.length > 0 ? (
                        availableTasks.slice(0, 10).map(task => {
                            const isSelected = selectedTaskIds.includes(task.id);
                            return (
                                <button
                                    key={task.id}
                                    type="button"
                                    onClick={() => handleSelect(task.id)}
                                    className={`w-full px-3 py-2.5 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors ${isSelected ? 'bg-gov-50' : ''
                                        }`}
                                >
                                    <div className={`shrink-0 ${getStatusColor(task.status)}`}>
                                        {task.status === Status.Done ? (
                                            <CheckCircle2 size={16} />
                                        ) : (
                                            <Circle size={16} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-slate-700 truncate">{task.title}</div>
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            <span>{task.category}</span>
                                            <span>•</span>
                                            <span className={getStatusColor(task.status)}>{task.status}</span>
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <div className="shrink-0 text-gov-600">
                                            <CheckCircle2 size={16} />
                                        </div>
                                    )}
                                </button>
                            );
                        })
                    ) : (
                        <div className="px-3 py-4 text-center text-sm text-slate-500">
                            {searchQuery ? 'Task tidak ditemukan' : 'Ketik untuk mencari task...'}
                        </div>
                    )}
                </div>
            )}

            {/* Empty state when disabled and no selections */}
            {disabled && selectedTasks.length === 0 && (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 bg-slate-50 rounded-lg border border-slate-200">
                    <Link2 size={14} />
                    <span>Tidak ada task yang menghalangi</span>
                </div>
            )}
        </div>
    );
};

export default TaskDependencySelector;
