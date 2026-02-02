// SearchableSelectWithActions.tsx
// Dropdown dengan fitur tambah, edit, dan hapus data master
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, X, Plus, Edit2, Trash2 } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface SearchableSelectWithActionsProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    emptyOption?: string;
    className?: string;
    // Actions
    onAdd?: (newValue: string) => Promise<void>;
    onEdit?: (oldValue: string, newValue: string) => Promise<void>;
    onDelete?: (value: string) => Promise<void>;
    canDelete?: (value: string) => Promise<boolean>;
    tableName?: string; // Untuk display di modal
}

const SearchableSelectWithActions: React.FC<SearchableSelectWithActionsProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Cari...',
    disabled = false,
    emptyOption = '-- Pilih --',
    className = '',
    onAdd,
    onEdit,
    onDelete,
    canDelete,
    tableName = 'data'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
    const [hoveredOption, setHoveredOption] = useState<string | null>(null);
    
    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [modalValue, setModalValue] = useState('');
    const [editingValue, setEditingValue] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedLabel = options.find(opt => opt.value === value)?.label || '';

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                containerRef.current && !containerRef.current.contains(e.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const handleSelect = (optValue: string) => {
        onChange(optValue);
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleAdd = async () => {
        if (!modalValue.trim() || !onAdd) return;
        
        setIsProcessing(true);
        setErrorMessage('');
        try {
            await onAdd(modalValue.trim());
            setShowAddModal(false);
            setModalValue('');
            onChange(modalValue.trim());
        } catch (error: any) {
            setErrorMessage(error.message || 'Gagal menambahkan data');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEdit = async () => {
        if (!modalValue.trim() || !onEdit || !editingValue) return;
        
        setIsProcessing(true);
        setErrorMessage('');
        try {
            await onEdit(editingValue, modalValue.trim());
            setShowEditModal(false);
            setModalValue('');
            setEditingValue('');
            if (value === editingValue) {
                onChange(modalValue.trim());
            }
        } catch (error: any) {
            setErrorMessage(error.message || 'Gagal mengubah data');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!editingValue || !onDelete) return;
        
        setIsProcessing(true);
        setErrorMessage('');
        try {
            // Check if can delete
            if (canDelete) {
                const canDel = await canDelete(editingValue);
                if (!canDel) {
                    setErrorMessage('Tidak dapat menghapus karena masih digunakan oleh surat');
                    setIsProcessing(false);
                    return;
                }
            }
            
            await onDelete(editingValue);
            setShowDeleteModal(false);
            setEditingValue('');
            if (value === editingValue) {
                onChange('');
            }
        } catch (error: any) {
            setErrorMessage(error.message || 'Gagal menghapus data');
        } finally {
            setIsProcessing(false);
        }
    };

    const openEditModal = (optValue: string) => {
        setEditingValue(optValue);
        setModalValue(optValue);
        setShowEditModal(true);
        setIsOpen(false);
    };

    const openDeleteModal = (optValue: string) => {
        setEditingValue(optValue);
        setShowDeleteModal(true);
        setIsOpen(false);
    };

    return (
        <>
            {/* Trigger */}
            <div ref={containerRef} className={`relative ${className}`}>
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={`w-full px-3 py-2.5 border rounded-lg text-left flex items-center justify-between
                        ${disabled ? 'bg-slate-100 cursor-not-allowed' : 'bg-white hover:border-gov-400'}
                        ${isOpen ? 'border-gov-400 ring-2 ring-gov-400/20' : 'border-slate-300'}
                        focus:outline-none transition-all`}
                >
                    <span className={value ? 'text-slate-900' : 'text-slate-400'}>
                        {selectedLabel || emptyOption}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Dropdown Portal */}
            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    style={{
                        position: 'absolute',
                        top: `${coords.top + 4}px`,
                        left: `${coords.left}px`,
                        width: `${coords.width}px`,
                        zIndex: 9999
                    }}
                    className="bg-white border border-slate-300 rounded-lg shadow-xl max-h-80 flex flex-col"
                >
                    {/* Search Input */}
                    <div className="p-2 border-b border-slate-200">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={placeholder}
                                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm"
                            />
                        </div>
                    </div>

                    {/* Add Button */}
                    {onAdd && (
                        <button
                            type="button"
                            onClick={() => {
                                setShowAddModal(true);
                                setIsOpen(false);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gov-600 hover:bg-gov-50 border-b border-slate-200"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Tambah {tableName} Baru</span>
                        </button>
                    )}

                    {/* Options List */}
                    <div className="overflow-y-auto flex-1">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-8 text-center text-slate-500 text-sm">
                                Tidak ada hasil
                            </div>
                        ) : (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.value}
                                    onMouseEnter={() => setHoveredOption(opt.value)}
                                    onMouseLeave={() => setHoveredOption(null)}
                                    className={`flex items-center justify-between px-3 py-2 cursor-pointer text-sm
                                        ${opt.value === value ? 'bg-gov-50 text-gov-700' : 'hover:bg-slate-50'}`}
                                >
                                    <span
                                        onClick={() => handleSelect(opt.value)}
                                        className="flex-1"
                                    >
                                        {opt.label}
                                    </span>
                                    
                                    {hoveredOption === opt.value && (onEdit || onDelete) && (
                                        <div className="flex items-center gap-1">
                                            {onEdit && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditModal(opt.value);
                                                    }}
                                                    className="p-1 hover:bg-blue-100 rounded text-blue-600"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openDeleteModal(opt.value);
                                                    }}
                                                    className="p-1 hover:bg-red-100 rounded text-red-600"
                                                    title="Hapus"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Tambah {tableName}</h3>
                        <input
                            type="text"
                            value={modalValue}
                            onChange={(e) => setModalValue(e.target.value)}
                            placeholder={`Nama ${tableName}`}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none mb-4"
                            autoFocus
                        />
                        {errorMessage && (
                            <p className="text-sm text-red-600 mb-4">{errorMessage}</p>
                        )}
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddModal(false);
                                    setModalValue('');
                                    setErrorMessage('');
                                }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                disabled={isProcessing}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleAdd}
                                disabled={!modalValue.trim() || isProcessing}
                                className="px-4 py-2 bg-gov-600 text-white rounded-lg hover:bg-gov-700 disabled:opacity-50"
                            >
                                {isProcessing ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Edit {tableName}</h3>
                        <input
                            type="text"
                            value={modalValue}
                            onChange={(e) => setModalValue(e.target.value)}
                            placeholder={`Nama ${tableName}`}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none mb-4"
                            autoFocus
                        />
                        {errorMessage && (
                            <p className="text-sm text-red-600 mb-4">{errorMessage}</p>
                        )}
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowEditModal(false);
                                    setModalValue('');
                                    setEditingValue('');
                                    setErrorMessage('');
                                }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                disabled={isProcessing}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleEdit}
                                disabled={!modalValue.trim() || isProcessing}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isProcessing ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Hapus {tableName}</h3>
                        <p className="text-slate-600 mb-4">
                            Apakah Anda yakin ingin menghapus <strong>{editingValue}</strong>?
                        </p>
                        {errorMessage && (
                            <p className="text-sm text-red-600 mb-4">{errorMessage}</p>
                        )}
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setEditingValue('');
                                    setErrorMessage('');
                                }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                disabled={isProcessing}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isProcessing}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {isProcessing ? 'Menghapus...' : 'Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SearchableSelectWithActions;
