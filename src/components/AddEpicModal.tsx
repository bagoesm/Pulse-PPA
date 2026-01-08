// src/components/AddEpicModal.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    X,
    Layers,
    Target,
    Flag,
    Star,
    Rocket,
    Zap,
    Shield,
    Heart,
    Lightbulb,
    Trophy,
    Bookmark,
    Compass
} from 'lucide-react';
import { Epic, EpicStatus, ProjectDefinition, User } from '../../types';
import SearchableSelect from './SearchableSelect';

interface AddEpicModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (epic: Omit<Epic, 'id'> | Epic) => Promise<void>;
    onDelete: (epicId: string) => Promise<void>;
    projects: ProjectDefinition[];
    users: User[];
    currentUser: User | null;
    initialData?: Epic | null;
    defaultProjectId?: string | null;
}

const AddEpicModal: React.FC<AddEpicModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    projects,
    users,
    currentUser,
    initialData,
    defaultProjectId
}) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        projectId: defaultProjectId || '',
        pic: [] as string[],
        status: 'Not Started' as EpicStatus,
        startDate: '',
        targetDate: '',
        color: 'blue',
        icon: 'Layers'
    });

    // Available icons for epics
    const epicIcons = [
        { name: 'Layers', icon: Layers, label: 'Layers' },
        { name: 'Target', icon: Target, label: 'Target' },
        { name: 'Flag', icon: Flag, label: 'Flag' },
        { name: 'Star', icon: Star, label: 'Star' },
        { name: 'Rocket', icon: Rocket, label: 'Rocket' },
        { name: 'Zap', icon: Zap, label: 'Zap' },
        { name: 'Shield', icon: Shield, label: 'Shield' },
        { name: 'Heart', icon: Heart, label: 'Heart' },
        { name: 'Lightbulb', icon: Lightbulb, label: 'Idea' },
        { name: 'Trophy', icon: Trophy, label: 'Trophy' },
        { name: 'Bookmark', icon: Bookmark, label: 'Bookmark' },
        { name: 'Compass', icon: Compass, label: 'Compass' }
    ];

    // Available color themes
    const colorThemes = [
        { name: 'blue', bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-200', label: 'Biru' },
        { name: 'green', bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200', label: 'Hijau' },
        { name: 'purple', bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-200', label: 'Ungu' },
        { name: 'orange', bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-200', label: 'Oranye' },
        { name: 'red', bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-200', label: 'Merah' },
        { name: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-700', ring: 'ring-indigo-200', label: 'Indigo' },
        { name: 'pink', bg: 'bg-pink-100', text: 'text-pink-700', ring: 'ring-pink-200', label: 'Pink' },
        { name: 'teal', bg: 'bg-teal-100', text: 'text-teal-700', ring: 'ring-teal-200', label: 'Teal' }
    ];

    // Status options
    const statusOptions: EpicStatus[] = ['Not Started', 'In Progress', 'Completed'];

    // Reset form when modal opens or editing epic changes
    useEffect(() => {
        if (!isOpen) return;

        if (initialData) {
            setFormData({
                name: initialData.name,
                description: initialData.description || '',
                projectId: initialData.projectId,
                pic: Array.isArray(initialData.pic) ? initialData.pic : [],
                status: initialData.status || 'Not Started',
                startDate: initialData.startDate || '',
                targetDate: initialData.targetDate || '',
                color: initialData.color || 'blue',
                icon: initialData.icon || 'Layers'
            });
        } else {
            // Reset to empty form for new epic
            setFormData({
                name: '',
                description: '',
                projectId: defaultProjectId || '',
                pic: [],
                status: 'Not Started',
                startDate: '',
                targetDate: '',
                color: 'blue',
                icon: 'Layers'
            });
        }
    }, [isOpen, initialData, defaultProjectId]);

    const selectedIconData = epicIcons.find(i => i.name === formData.icon);
    const selectedColorData = colorThemes.find(c => c.name === formData.color);

    const handlePicChange = (userName: string) => {
        setFormData(prev => {
            const newPics = prev.pic.includes(userName)
                ? prev.pic.filter(p => p !== userName)
                : [...prev.pic, userName];
            return { ...prev, pic: newPics };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name?.trim() || !formData.projectId) return;

        if (initialData) {
            const epicData: Epic = {
                id: initialData.id,
                name: formData.name.trim(),
                description: formData.description?.trim() || '',
                projectId: formData.projectId,
                pic: formData.pic,
                status: formData.status,
                startDate: formData.startDate || initialData.startDate,
                targetDate: formData.targetDate || initialData.targetDate,
                color: formData.color,
                icon: formData.icon,
                createdBy: initialData.createdBy,
                createdAt: initialData.createdAt,
                updatedAt: new Date().toISOString()
            };
            onSave(epicData);
        } else {
            const epicData: Omit<Epic, 'id'> = {
                name: formData.name.trim(),
                description: formData.description?.trim() || '',
                projectId: formData.projectId,
                pic: formData.pic,
                status: formData.status,
                startDate: formData.startDate || new Date().toISOString().split('T')[0],
                targetDate: formData.targetDate || '',
                color: formData.color,
                icon: formData.icon,
                createdBy: currentUser?.name || 'System',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            onSave(epicData);
        }
    };

    const handleDelete = () => {
        if (initialData) {
            onDelete(initialData.id);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50 flex-shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                        {selectedIconData && selectedColorData && (
                            <div className={`p-1.5 sm:p-2 rounded-lg ${selectedColorData.bg} ${selectedColorData.text} ring-2 ${selectedColorData.ring}`}>
                                <selectedIconData.icon size={18} />
                            </div>
                        )}
                        <h2 className="text-base sm:text-lg font-bold text-slate-800">
                            {initialData ? 'Edit Epic' : 'Buat Epic Baru'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full text-slate-500 transition-colors" aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Left Column - Basic Info */}
                        <div className="space-y-3 sm:space-y-4">
                            <div>
                                <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">Nama Epic *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none text-sm"
                                    placeholder="Contoh: User Authentication Module"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">Project *</label>
                                <SearchableSelect
                                    options={projects.map(p => ({ value: p.id, label: p.name }))}
                                    value={formData.projectId}
                                    onChange={(val) => setFormData({ ...formData, projectId: val || '' })}
                                    placeholder="Pilih Project"
                                    className="w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">Deskripsi</label>
                                <textarea
                                    rows={2}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none text-sm resize-none"
                                    placeholder="Deskripsi singkat epic..."
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">PIC (Person In Charge)</label>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                                    {users.map(user => (
                                        <button
                                            key={user.id}
                                            type="button"
                                            onClick={() => handlePicChange(user.name)}
                                            className={`px-2 py-1 text-xs rounded-full transition-all ${formData.pic.includes(user.name)
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                                }`}
                                        >
                                            {user.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as EpicStatus })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none text-sm bg-white"
                                    >
                                        {statusOptions.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">Start Date</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">Target Date</label>
                                    <input
                                        type="date"
                                        value={formData.targetDate}
                                        onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Customization */}
                        <div className="space-y-3 sm:space-y-4">
                            {/* Icon Selection */}
                            <div>
                                <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">Pilih Icon Epic</label>
                                <div className="grid grid-cols-6 gap-1.5 sm:gap-2 max-h-32 sm:max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 sm:p-3 bg-slate-50">
                                    {epicIcons.map((iconData) => {
                                        const IconComponent = iconData.icon;
                                        const isSelected = formData.icon === iconData.name;
                                        return (
                                            <button
                                                key={iconData.name}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, icon: iconData.name })}
                                                className={`p-2 sm:p-3 rounded-lg border-2 transition-all ${isSelected
                                                    ? `${selectedColorData?.bg} ${selectedColorData?.text} border-current shadow-md`
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                title={iconData.label}
                                            >
                                                <IconComponent size={16} className="mx-auto" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Color Selection */}
                            <div>
                                <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">Pilih Warna Tema</label>
                                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                                    {colorThemes.map((colorData) => {
                                        const isSelected = formData.color === colorData.name;
                                        return (
                                            <button
                                                key={colorData.name}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, color: colorData.name })}
                                                className={`p-2 sm:p-3 rounded-lg border-2 transition-all ${isSelected
                                                    ? `${colorData.bg} ${colorData.text} border-current shadow-md ring-2 ${colorData.ring}`
                                                    : `${colorData.bg} ${colorData.text} border-transparent hover:border-current`
                                                    }`}
                                                title={colorData.label}
                                            >
                                                <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-current mx-auto opacity-60"></div>
                                                <span className="text-[10px] sm:text-xs font-medium mt-0.5 sm:mt-1 block">{colorData.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="hidden sm:block border border-slate-200 rounded-lg p-4 bg-white">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Preview</p>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                    {selectedIconData && selectedColorData && (
                                        <div className={`p-2 rounded-lg ${selectedColorData.bg} ${selectedColorData.text} ring-2 ${selectedColorData.ring}`}>
                                            <selectedIconData.icon size={20} />
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="font-bold text-slate-800">{formData.name || 'Nama Epic'}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${formData.status === 'Completed'
                                                ? 'bg-green-100 text-green-700'
                                                : formData.status === 'In Progress'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {formData.status}
                                            </span>
                                            {formData.pic.length > 0 && (
                                                <span className="text-xs text-slate-500">
                                                    {formData.pic.length} PIC
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 sm:mt-6 flex justify-between items-center pt-4 border-t border-slate-100 safe-area-bottom">
                        <div>
                            {initialData && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    Hapus Epic
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2 sm:gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-3 sm:px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={!formData.name.trim() || !formData.projectId}
                                className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 flex items-center gap-1 sm:gap-2 shadow-md hover:shadow-lg transition-all ${(!formData.name.trim() || !formData.projectId) ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                {selectedIconData && <selectedIconData.icon size={14} />}
                                {initialData ? 'Update Epic' : 'Buat Epic'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEpicModal;
