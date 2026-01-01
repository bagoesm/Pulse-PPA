// src/components/ChecklistEditor.tsx
// Component for editing checklists in AddTaskModal
import React, { useState } from 'react';
import { CheckSquare, Square, Plus, Trash2, X, GripVertical } from 'lucide-react';
import { ChecklistItem } from '../../types';

interface ChecklistEditorProps {
    items: ChecklistItem[];
    onChange: (items: ChecklistItem[]) => void;
    disabled?: boolean;
}

const ChecklistEditor: React.FC<ChecklistEditorProps> = ({
    items,
    onChange,
    disabled = false
}) => {
    const [newItemText, setNewItemText] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');

    const handleAddItem = () => {
        if (!newItemText.trim() || disabled) return;

        const newItem: ChecklistItem = {
            id: `cl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            text: newItemText.trim(),
            isCompleted: false,
            createdAt: new Date().toISOString()
        };

        onChange([...items, newItem]);
        setNewItemText('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddItem();
        }
    };

    const handleToggle = (id: string) => {
        if (disabled) return;
        onChange(items.map(item => {
            if (item.id === id) {
                return {
                    ...item,
                    isCompleted: !item.isCompleted,
                    completedAt: !item.isCompleted ? new Date().toISOString() : undefined
                };
            }
            return item;
        }));
    };

    const handleRemove = (id: string) => {
        if (disabled) return;
        onChange(items.filter(item => item.id !== id));
    };

    const handleStartEdit = (item: ChecklistItem) => {
        if (disabled) return;
        setEditingId(item.id);
        setEditingText(item.text);
    };

    const handleSaveEdit = () => {
        if (editingId && editingText.trim()) {
            onChange(items.map(item => {
                if (item.id === editingId) {
                    return { ...item, text: editingText.trim() };
                }
                return item;
            }));
        }
        setEditingId(null);
        setEditingText('');
    };

    const handleEditKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            setEditingId(null);
            setEditingText('');
        }
    };

    const completedCount = items.filter(item => item.isCompleted).length;
    const totalCount = items.length;

    return (
        <div className="space-y-3">
            {/* Progress indicator */}
            {totalCount > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <CheckSquare size={14} className="text-slate-400" />
                    <span>{completedCount}/{totalCount} selesai</span>
                    {completedCount === totalCount && totalCount > 0 && (
                        <span className="text-green-600 font-medium">✓ Semua selesai!</span>
                    )}
                </div>
            )}

            {/* Checklist items */}
            <div className="space-y-2">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center gap-2 group bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                        {/* Checkbox */}
                        <button
                            type="button"
                            onClick={() => handleToggle(item.id)}
                            disabled={disabled}
                            className="shrink-0"
                        >
                            {item.isCompleted ? (
                                <CheckSquare size={18} className="text-green-600" />
                            ) : (
                                <Square size={18} className="text-slate-400 hover:text-slate-600" />
                            )}
                        </button>

                        {/* Text or Edit Input */}
                        {editingId === item.id ? (
                            <input
                                type="text"
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onBlur={handleSaveEdit}
                                onKeyDown={handleEditKeyDown}
                                autoFocus
                                className="flex-1 text-sm px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                            />
                        ) : (
                            <span
                                onClick={() => handleStartEdit(item)}
                                className={`flex-1 text-sm cursor-text ${item.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'
                                    } ${!disabled ? 'hover:bg-slate-100 px-1 -mx-1 rounded' : ''}`}
                            >
                                {item.text}
                            </span>
                        )}

                        {/* Remove button */}
                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => handleRemove(item.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all shrink-0"
                                title="Hapus checklist"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Add new item input */}
            {!disabled && (
                <div className="flex items-center gap-2">
                    <Square size={18} className="text-slate-300 shrink-0" />
                    <input
                        type="text"
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Tambah item checklist..."
                        className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gov-200 focus:border-gov-300 bg-white"
                    />
                    <button
                        type="button"
                        onClick={handleAddItem}
                        disabled={!newItemText.trim()}
                        className="p-2 text-gov-600 hover:bg-gov-50 rounded-lg disabled:text-slate-300 disabled:hover:bg-transparent transition-colors"
                        title="Tambah item"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            )}

            {/* Empty state */}
            {totalCount === 0 && disabled && (
                <div className="text-sm text-slate-400 italic py-2">
                    Tidak ada checklist
                </div>
            )}
        </div>
    );
};

export default ChecklistEditor;
