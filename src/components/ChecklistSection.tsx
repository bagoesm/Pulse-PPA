// src/components/ChecklistSection.tsx
// Component for displaying and managing checklists in TaskViewModal
import React, { useState } from 'react';
import { CheckSquare, Square, Plus, Trash2, X } from 'lucide-react';
import { ChecklistItem } from '../../types';

interface ChecklistSectionProps {
    checklists: ChecklistItem[];
    canEdit: boolean;
    onAdd: (text: string) => void;
    onToggle: (id: string) => void;
    onRemove: (id: string) => void;
    onUpdate: (id: string, text: string) => void;
}

const ChecklistSection: React.FC<ChecklistSectionProps> = ({
    checklists,
    canEdit,
    onAdd,
    onToggle,
    onRemove,
    onUpdate
}) => {
    const [newItemText, setNewItemText] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [isAddingNew, setIsAddingNew] = useState(false);

    const completedCount = checklists.filter(item => item.isCompleted).length;
    const totalCount = checklists.length;
    const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const handleAddItem = () => {
        if (newItemText.trim()) {
            onAdd(newItemText.trim());
            setNewItemText('');
            setIsAddingNew(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddItem();
        } else if (e.key === 'Escape') {
            setNewItemText('');
            setIsAddingNew(false);
        }
    };

    const handleStartEdit = (item: ChecklistItem) => {
        if (!canEdit) return;
        setEditingId(item.id);
        setEditingText(item.text);
    };

    const handleSaveEdit = () => {
        if (editingId && editingText.trim()) {
            onUpdate(editingId, editingText.trim());
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

    return (
        <div className="flex items-start gap-4">
            <div className="flex items-center gap-3 w-28 text-gray-500">
                <CheckSquare size={16} />
                <span className="text-sm">Checklist</span>
            </div>
            <div className="flex-1">
                {/* Progress Bar */}
                {totalCount > 0 && (
                    <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">
                                {completedCount}/{totalCount} selesai
                            </span>
                            <span className="text-xs text-gray-500">
                                {Math.round(progressPercent)}%
                            </span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 rounded-full ${progressPercent === 100 ? 'bg-green-500' : 'bg-blue-500'
                                    }`}
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Checklist Items */}
                <div className="space-y-2">
                    {checklists.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-start gap-2 group"
                        >
                            {/* Checkbox */}
                            <button
                                onClick={() => canEdit && onToggle(item.id)}
                                disabled={!canEdit}
                                className={`mt-0.5 shrink-0 ${canEdit ? 'cursor-pointer' : 'cursor-default'
                                    }`}
                            >
                                {item.isCompleted ? (
                                    <CheckSquare
                                        size={18}
                                        className="text-green-600"
                                    />
                                ) : (
                                    <Square
                                        size={18}
                                        className={`${canEdit ? 'text-gray-400 hover:text-gray-600' : 'text-gray-300'}`}
                                    />
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
                                    className="flex-1 text-sm px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            ) : (
                                <span
                                    onClick={() => handleStartEdit(item)}
                                    className={`flex-1 text-sm ${item.isCompleted
                                            ? 'text-gray-400 line-through'
                                            : 'text-gray-700'
                                        } ${canEdit ? 'cursor-text hover:bg-gray-50 px-1 -mx-1 rounded' : ''}`}
                                >
                                    {item.text}
                                </span>
                            )}

                            {/* Delete Button */}
                            {canEdit && (
                                <button
                                    onClick={() => onRemove(item.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all shrink-0"
                                    title="Hapus checklist"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Add New Item */}
                {canEdit && (
                    <div className="mt-3">
                        {isAddingNew ? (
                            <div className="flex items-center gap-2">
                                <Square size={18} className="text-gray-300 shrink-0" />
                                <input
                                    type="text"
                                    value={newItemText}
                                    onChange={(e) => setNewItemText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Tambah item checklist..."
                                    autoFocus
                                    className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                                />
                                <button
                                    onClick={handleAddItem}
                                    disabled={!newItemText.trim()}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:text-gray-300 disabled:hover:bg-transparent"
                                >
                                    <Plus size={18} />
                                </button>
                                <button
                                    onClick={() => {
                                        setNewItemText('');
                                        setIsAddingNew(false);
                                    }}
                                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsAddingNew(true)}
                                className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                            >
                                <Plus size={16} />
                                <span>Tambah item</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {totalCount === 0 && !canEdit && (
                    <div className="text-sm text-gray-400 italic">
                        Tidak ada checklist
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChecklistSection;
