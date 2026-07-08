import React, { useState, useEffect } from 'react';
import { User, Role } from '../../types';
import { Plus, Search, Edit2, Trash2, Shield, User as UserIcon, X, Save, Key, Briefcase, Tag, Database, Folder, Copy, Check, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import MultiSelectChip from './MultiSelectChip';
import { useNotificationModal, useConfirmModal } from '../hooks/useModal';
import ConfirmModal from './ConfirmModal';
import NotificationModal from './NotificationModal';
import { useDivision } from '../contexts/DivisionContext';
import BMNSatkerConfig from './BMNSatkerConfig';
import { supabase } from '../lib/supabaseClient';

// Master Category Management Component
interface MasterCategoryManagementProps {
    masterCategories: any[];
    masterSubCategories: any[];
    categorySubcategoryRelations: any[];
    onAddMasterCategory: (name: string, icon: string, color: string, selectedSubCategories?: string[]) => void;
    onUpdateMasterCategory: (id: string, name: string, icon: string, color: string, selectedSubCategories?: string[]) => void;
    onDeleteMasterCategory: (id: string) => void;
}

const MasterCategoryManagement: React.FC<MasterCategoryManagementProps> = ({
    masterCategories,
    masterSubCategories,
    categorySubcategoryRelations,
    onAddMasterCategory,
    onUpdateMasterCategory,
    onDeleteMasterCategory
}) => {
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [showAddCategory, setShowAddCategory] = useState(false);
    
    const [newCategory, setNewCategory] = useState({ 
        name: '', 
        icon: 'Folder', 
        color: '#3B82F6',
        selectedSubCategories: [] as string[]
    });
    const [editCategoryData, setEditCategoryData] = useState({ 
        name: '', 
        icon: '', 
        color: '',
        selectedSubCategories: [] as string[]
    });

    const iconOptions = [
        'Code', 'FileText', 'Users', 'HelpingHand', 'GraduationCap', 
        'Inbox', 'Forward', 'FolderOpen', 'Activity', 'MoreHorizontal',
        'Folder', 'Tag', 'Settings', 'Database', 'Globe'
    ];

    const colorOptions = [
        '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444',
        '#06B6D4', '#84CC16', '#6B7280', '#EC4899', '#64748B'
    ];

    const handleAddCategory = () => {
        if (newCategory.name.trim()) {
            onAddMasterCategory(newCategory.name.trim(), newCategory.icon, newCategory.color, newCategory.selectedSubCategories);
            setNewCategory({ name: '', icon: 'Folder', color: '#3B82F6', selectedSubCategories: [] });
            setShowAddCategory(false);
        }
    };

    const handleUpdateCategory = (id: string) => {
        if (editCategoryData.name.trim()) {
            onUpdateMasterCategory(id, editCategoryData.name.trim(), editCategoryData.icon, editCategoryData.color, editCategoryData.selectedSubCategories);
            setEditingCategory(null);
        }
    };

    const startEditCategory = (category: any) => {
        setEditingCategory(category.id);
        const categorySubCategories = categorySubcategoryRelations
            .filter(rel => rel.category_id === category.id)
            .map(rel => rel.subcategory_id);
        setEditCategoryData({
            name: category.name,
            icon: category.icon,
            color: category.color,
            selectedSubCategories: categorySubCategories
        });
    };

    const getCategorySubCategories = (categoryId: string) => {
        const relatedSubIds = categorySubcategoryRelations
            .filter(rel => rel.category_id === categoryId)
            .map(rel => rel.subcategory_id);
        return masterSubCategories.filter(sub => relatedSubIds.includes(sub.id));
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-gov-50">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Folder className="text-gov-600" size={20} />
                        Master Kategori
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Kelola kategori utama dan hubungkan dengan sub kategori</p>
                </div>
                <button
                    onClick={() => setShowAddCategory(true)}
                    className="bg-gov-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gov-700 transition-colors flex items-center gap-2"
                >
                    <Plus size={16} /> Tambah Kategori
                </button>
            </div>

            {/* Add Category Form */}
            {showAddCategory && (
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <input
                                type="text"
                                placeholder="Nama kategori"
                                value={newCategory.name}
                                onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none"
                            />
                            <select
                                value={newCategory.icon}
                                onChange={(e) => setNewCategory({...newCategory, icon: e.target.value})}
                                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none"
                            >
                                {iconOptions.map(icon => (
                                    <option key={icon} value={icon}>{icon}</option>
                                ))}
                            </select>
                            <select
                                value={newCategory.color}
                                onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none"
                            >
                                {colorOptions.map(color => (
                                    <option key={color} value={color} style={{backgroundColor: color, color: 'white'}}>
                                        {color}
                                    </option>
                                ))}
                            </select>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleAddCategory}
                                    className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <Save size={16} />
                                </button>
                                <button
                                    onClick={() => setShowAddCategory(false)}
                                    className="bg-slate-400 text-white px-3 py-2 rounded-lg hover:bg-slate-500 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        
                        {/* Sub Categories Multi Select */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Sub Kategori yang Terhubung (Opsional)
                            </label>
                            <MultiSelectChip
                                options={masterSubCategories.map(sub => ({ value: sub.id, label: sub.name }))}
                                value={newCategory.selectedSubCategories}
                                onChange={(selectedIds) => setNewCategory({...newCategory, selectedSubCategories: selectedIds})}
                                placeholder="Pilih sub kategori..."
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Categories List */}
            <div className="divide-y divide-slate-100">
                {masterCategories.map(category => (
                    <div key={category.id} className="p-4 hover:bg-slate-50 transition-colors">
                        {editingCategory === category.id ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <input
                                        type="text"
                                        value={editCategoryData.name}
                                        onChange={(e) => setEditCategoryData({...editCategoryData, name: e.target.value})}
                                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none"
                                    />
                                    <select
                                        value={editCategoryData.icon}
                                        onChange={(e) => setEditCategoryData({...editCategoryData, icon: e.target.value})}
                                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none"
                                    >
                                        {iconOptions.map(icon => (
                                            <option key={icon} value={icon}>{icon}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={editCategoryData.color}
                                        onChange={(e) => setEditCategoryData({...editCategoryData, color: e.target.value})}
                                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none"
                                    >
                                        {colorOptions.map(color => (
                                            <option key={color} value={color} style={{backgroundColor: color, color: 'white'}}>
                                                {color}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleUpdateCategory(category.id)}
                                            className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            <Save size={16} />
                                        </button>
                                        <button
                                            onClick={() => setEditingCategory(null)}
                                            className="bg-slate-400 text-white px-3 py-2 rounded-lg hover:bg-slate-500 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Sub Categories Multi Select for Edit */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Sub Kategori yang Terhubung
                                    </label>
                                    <MultiSelectChip
                                        options={masterSubCategories.map(sub => ({ value: sub.id, label: sub.name }))}
                                        value={editCategoryData.selectedSubCategories}
                                        onChange={(selectedIds) => setEditCategoryData({...editCategoryData, selectedSubCategories: selectedIds})}
                                        placeholder="Pilih sub kategori..."
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-4 h-4 rounded"
                                            style={{backgroundColor: category.color}}
                                        />
                                        <span className="font-medium text-slate-800">{category.name}</span>
                                        <span className="text-xs text-slate-500">({category.icon})</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => startEditCategory(category)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`Hapus kategori "${category.name}"? Semua relasi sub kategori akan ikut terhapus.`)) {
                                                    onDeleteMasterCategory(category.id);
                                                }
                                            }}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                {/* Show connected subcategories */}
                                <div className="ml-7">
                                    <div className="flex flex-wrap gap-2">
                                        {getCategorySubCategories(category.id).map(sub => (
                                            <span key={sub.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                {sub.name}
                                            </span>
                                        ))}
                                        {getCategorySubCategories(category.id).length === 0 && (
                                            <span className="text-xs text-slate-400 italic">Belum ada sub kategori terhubung</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Master Sub Category Management Component
interface MasterSubCategoryManagementProps {
    masterCategories: any[];
    masterSubCategories: any[];
    categorySubcategoryRelations: any[];
    onAddMasterSubCategory: (name: string, categoryId: string) => void;
    onUpdateMasterSubCategory: (id: string, name: string, categoryId: string) => void;
    onDeleteMasterSubCategory: (id: string) => void;
}

const MasterSubCategoryManagement: React.FC<MasterSubCategoryManagementProps> = ({
    masterCategories,
    masterSubCategories,
    categorySubcategoryRelations,
    onAddMasterSubCategory,
    onUpdateMasterSubCategory,
    onDeleteMasterSubCategory
}) => {
    const [editingSubCategory, setEditingSubCategory] = useState<string | null>(null);
    const [showAddSubCategory, setShowAddSubCategory] = useState(false);
    const [newSubCategory, setNewSubCategory] = useState({ 
        name: ''
    });
    const [editSubCategoryData, setEditSubCategoryData] = useState({ 
        name: ''
    });

    // Sub Category Management Functions
    const handleAddSubCategory = () => {
        if (newSubCategory.name.trim()) {
            // Pass empty string as categoryId since sub categories are independent
            onAddMasterSubCategory(newSubCategory.name.trim(), '');
            setNewSubCategory({ name: '' });
            setShowAddSubCategory(false);
        }
    };

    const handleUpdateSubCategory = (id: string) => {
        if (editSubCategoryData.name.trim()) {
            // Keep existing category_id or pass empty string
            const existingSubCategory = masterSubCategories.find(sub => sub.id === id);
            const categoryId = existingSubCategory?.category_id || '';
            onUpdateMasterSubCategory(id, editSubCategoryData.name.trim(), categoryId);
            setEditingSubCategory(null);
        }
    };

    const startEditSubCategory = (subCategory: any) => {
        setEditingSubCategory(subCategory.id);
        setEditSubCategoryData({
            name: subCategory.name
        });
    };

    const getConnectedCategories = (subCategoryId: string) => {
        const relatedCategoryIds = categorySubcategoryRelations
            .filter(rel => rel.subcategory_id === subCategoryId)
            .map(rel => rel.category_id);
        return masterCategories.filter(cat => relatedCategoryIds.includes(cat.id));
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-emerald-50">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Tag className="text-emerald-600" size={20} />
                        Master Sub Kategori
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Kelola sub kategori yang dapat dihubungkan ke multiple kategori</p>
                </div>
                <button
                    onClick={() => setShowAddSubCategory(true)}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                    <Plus size={16} /> Tambah Sub Kategori
                </button>
            </div>

            {/* Add Sub Category Form */}
            {showAddSubCategory && (
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder="Nama sub kategori"
                                value={newSubCategory.name}
                                onChange={(e) => setNewSubCategory({...newSubCategory, name: e.target.value})}
                                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleAddSubCategory}
                                    disabled={!newSubCategory.name.trim()}
                                    className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                                >
                                    <Save size={16} />
                                </button>
                                <button
                                    onClick={() => setShowAddSubCategory(false)}
                                    className="bg-slate-400 text-white px-3 py-2 rounded-lg hover:bg-slate-500 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="text-xs text-slate-500">
                            <p>Sub kategori dibuat secara independen dan dapat dihubungkan ke kategori melalui pengaturan kategori.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Sub Categories List */}
            <div className="divide-y divide-slate-100">
                {masterSubCategories.length > 0 ? (
                    masterSubCategories.map(subCategory => (
                        <div key={subCategory.id} className="p-4 hover:bg-slate-50 transition-colors">
                            {editingSubCategory === subCategory.id ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        value={editSubCategoryData.name}
                                        onChange={(e) => setEditSubCategoryData({...editSubCategoryData, name: e.target.value})}
                                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleUpdateSubCategory(subCategory.id)}
                                            disabled={!editSubCategoryData.name.trim()}
                                            className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                                        >
                                            <Save size={16} />
                                        </button>
                                        <button
                                            onClick={() => setEditingSubCategory(null)}
                                            className="bg-slate-400 text-white px-3 py-2 rounded-lg hover:bg-slate-500 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Tag className="text-emerald-600" size={16} />
                                            <span className="font-medium text-slate-800">{subCategory.name}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => startEditSubCategory(subCategory)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm(`Hapus sub kategori "${subCategory.name}"?`)) {
                                                        onDeleteMasterSubCategory(subCategory.id);
                                                    }
                                                }}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Show connected categories */}
                                    <div className="ml-7">
                                        <div className="flex flex-wrap gap-2">
                                            {getConnectedCategories(subCategory.id).map(category => (
                                                <span key={category.id} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                                                    <div 
                                                        className="w-2 h-2 rounded-full"
                                                        style={{backgroundColor: category.color}}
                                                    />
                                                    {category.name}
                                                </span>
                                            ))}
                                            {getConnectedCategories(subCategory.id).length === 0 && (
                                                <span className="text-xs text-slate-400 italic">Belum terhubung ke kategori manapun</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="p-8 text-center text-slate-400">
                        <Tag size={48} className="mx-auto mb-3 text-slate-300" />
                        <p className="text-sm">Belum ada sub kategori</p>
                        <p className="text-xs text-slate-300 mt-1">Tambahkan sub kategori untuk mengorganisir task dengan lebih detail</p>
                    </div>
                )}
            </div>
        </div>
    );
};

interface UserManagementProps {
  users: User[];
  onAddUser: (user: User) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  currentUser: User | null; // Tambahkan currentUser untuk validasi
  
  jabatanList: string[];
  onAddJabatan: (jabatan: string) => void;
  onDeleteJabatan: (jabatan: string) => void;

  subCategories: string[];
  onAddSubCategory: (cat: string) => void;
  onDeleteSubCategory: (cat: string) => void;
  
  // Category Management Props
  masterCategories: any[];
  masterSubCategories: any[];
  categorySubcategoryRelations: any[];
  onAddMasterCategory: (name: string, icon: string, color: string, selectedSubCategories?: string[]) => void;
  onUpdateMasterCategory: (id: string, name: string, icon: string, color: string, selectedSubCategories?: string[]) => void;
  onDeleteMasterCategory: (id: string) => void;
  onAddMasterSubCategory: (name: string, categoryId: string) => void;
  onUpdateMasterSubCategory: (id: string, name: string, categoryId: string) => void;
  onDeleteMasterSubCategory: (id: string) => void;
}

type Tab = 'Users' | 'Jabatan' | 'Kategori' | 'Satuan Kerja' | 'API Integrasi';

const headerColorPresets = {
  default: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', label: 'Default' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: 'Biru' },
  green: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'Hijau' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', label: 'Ungu' },
  red: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', label: 'Merah' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'Kuning' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', label: 'Indigo' },
};

const UserManagement: React.FC<UserManagementProps> = ({ 
    users, onAddUser, onEditUser, onDeleteUser, currentUser,
    jabatanList, onAddJabatan, onDeleteJabatan,
    subCategories, onAddSubCategory, onDeleteSubCategory,
    masterCategories, masterSubCategories, categorySubcategoryRelations,
    onAddMasterCategory, onUpdateMasterCategory, onDeleteMasterCategory,
    onAddMasterSubCategory, onUpdateMasterSubCategory, onDeleteMasterSubCategory
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('Users');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal hooks
  const { modal: notificationModal, showNotification, hideNotification } = useNotificationModal();
  const { modal: confirmModal, showConfirm, hideConfirm } = useConfirmModal();
  const { divisiList, addDivisi, removeDivisi } = useDivision();
  
  // User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({
      name: '', email: '', role: 'Staff', jabatan: '', divisi: '', nip: '', password: '', sakuraAnimationEnabled: false, snowAnimationEnabled: false, moneyAnimationEnabled: false, flowerDecorationEnabled: false, header_color: undefined,
  });

  // Simple Input State for Jabatan/Kategori
  const [newItemInput, setNewItemInput] = useState('');

  // API Key Management State
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newApiKeyUserIds, setNewApiKeyUserIds] = useState<string[]>([]);
  const [newApiKeyExpiresAt, setNewApiKeyExpiresAt] = useState('');
  const [generatedPlainKey, setGeneratedPlainKey] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  const fetchApiKeys = async () => {
    setIsLoadingApiKeys(true);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select(`
          id,
          name,
          created_at,
          expires_at,
          is_active,
          api_key_users(
            user_id,
            profiles:user_id(
              id,
              name,
              jabatan,
              divisi
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching api keys:', error);
        showNotification('Gagal Memuat API Key', error.message, 'error');
      } else {
        setApiKeys(data || []);
      }
    } catch (err) {
      console.error('Error fetching api keys:', err);
    } finally {
      setIsLoadingApiKeys(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'API Integrasi') {
      fetchApiKeys();
    }
  }, [activeTab]);

  const handleGenerateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApiKeyName.trim()) {
      showNotification('Input Tidak Lengkap', 'Nama integrasi wajib diisi.', 'warning');
      return;
    }
    if (newApiKeyUserIds.length === 0) {
      showNotification('Input Tidak Lengkap', 'Pilih minimal satu target pengguna.', 'warning');
      return;
    }

    setIsGeneratingKey(true);
    try {
      // 1. Generate random key
      const rawKey = 'pulse_ppa_live_' + Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // 2. Hash key using SHA-256
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey));
      const keyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      // 3. Save to database
      const { data: apiKeyRecord, error: insertError } = await supabase
        .from('api_keys')
        .insert({
          name: newApiKeyName.trim(),
          key_hash: keyHash,
          expires_at: newApiKeyExpiresAt ? new Date(newApiKeyExpiresAt).toISOString() : null
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // 4. Save junction rows
      const relationPayload = newApiKeyUserIds.map(userId => ({
        api_key_id: apiKeyRecord.id,
        user_id: userId
      }));

      const { error: relError } = await supabase
        .from('api_key_users')
        .insert(relationPayload);

      if (relError) {
        throw relError;
      }

      // 5. Success
      setGeneratedPlainKey(rawKey);
      setNewApiKeyName('');
      setNewApiKeyUserIds([]);
      setNewApiKeyExpiresAt('');
      setIsApiKeyModalOpen(false);
      fetchApiKeys();
      showNotification('Berhasil', 'API Key baru berhasil dibuat.', 'success');
    } catch (err: any) {
      console.error('Error generating api key:', err);
      showNotification('Gagal Membuat API Key', err.message || 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleRevokeApiKey = async (id: string, name: string) => {
    showConfirm(
      'Revoke API Key',
      `Apakah Anda yakin ingin menonaktifkan/menghapus API Key untuk "${name}"? Sistem eksternal yang menggunakan key ini tidak akan bisa mengakses API lagi.`,
      async () => {
        const { error } = await supabase
          .from('api_keys')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting api key:', error);
          showNotification('Gagal Revoke API Key', error.message, 'error');
        } else {
          showNotification('Berhasil', 'API Key berhasil dicabut.', 'success');
          fetchApiKeys();
        }
      },
      'error',
      'Revoke',
      'Batal'
    );
  };

  // --- User Logic ---

  const filteredUsers = users
    .filter((user, index, self) => 
      // Remove duplicates first
      index === self.findIndex(u => u.id === user.id)
    )
    .filter(u => 
      // Then apply search filter
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.jabatan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.nip?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleOpenUserModal = (user?: User) => {
      if (user) {
          setEditingUser(user);
          setUserFormData(user);
      } else {
          setEditingUser(null);
          const defaultJabatan = jabatanList && jabatanList.length > 0 ? jabatanList[0] : '';
          setUserFormData({
              name: '',
              email: '',
              role: 'Staff',
              jabatan: defaultJabatan,
              divisi: '',
              nip: '',
              password: '',
              sakuraAnimationEnabled: false,
              snowAnimationEnabled: false,
              moneyAnimationEnabled: false,
              flowerDecorationEnabled: false,
              header_color: undefined,
          });
      }
      setIsModalOpen(true);
  };

  const performUserSubmit = () => {
      const initials = userFormData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      
      if (editingUser) {
          // For editing, don't include password unless it's changed
          const editData = { ...editingUser, ...userFormData as User, initials };
          if (!userFormData.password) {
              delete editData.password; // Remove password if empty (no change)
          }
          onEditUser(editData);
      } else {
          // Ensure jabatan is not empty - use first available if current is empty
          const finalJabatan = userFormData.jabatan || (jabatanList && jabatanList.length > 0 ? jabatanList[0] : '');
          
          const newUserData = {
              id: `u_${Date.now()}`, // Temporary ID, akan diganti dengan ID dari Supabase
              initials,
              ...userFormData as User,
              jabatan: finalJabatan,
              password: userFormData.password || ''
          };
          onAddUser(newUserData);
      }
      setIsModalOpen(false);
  };

  const handleUserSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      // Validasi basic
      if (!userFormData.name || !userFormData.email || !userFormData.role) {
          showNotification('Data Tidak Lengkap', 'Nama, email, dan role wajib diisi.', 'warning');
          return;
      }

      // Validasi jabatan untuk user baru
      if (!editingUser && !userFormData.jabatan) {
          showNotification('Jabatan Wajib', 'Jabatan wajib dipilih untuk user baru.', 'warning');
          return;
      }

      // Validasi password untuk user baru
      if (!editingUser && (!userFormData.password || userFormData.password.length < 6)) {
          showNotification('Password Tidak Valid', 'Password wajib diisi minimal 6 karakter untuk user baru.', 'warning');
          return;
      }

      // Validasi format email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userFormData.email)) {
          showNotification('Email Tidak Valid', 'Format email tidak valid.', 'warning');
          return;
      }

      // Konfirmasi khusus untuk Super Admin
      if (!editingUser && userFormData.role === 'Super Admin') {
          showConfirm(
              'Konfirmasi Super Admin',
              `Anda akan membuat user dengan role Super Admin.\n\nSuper Admin memiliki akses penuh ke sistem termasuk:\n- Mengelola semua user\n- Mengakses semua data\n- Mengubah pengaturan sistem\n\nApakah Anda yakin ingin melanjutkan?`,
              performUserSubmit,
              'warning',
              'Ya, Lanjutkan',
              'Batal'
          );
          return;
      }

      performUserSubmit();
  };

  // --- Simple List Logic (Jabatan / Kategori) ---

  const handleAddItem = async () => {
      if (!newItemInput.trim()) return;
      if (activeTab === 'Jabatan') onAddJabatan(newItemInput);
      if (activeTab === 'Kategori') onAddSubCategory(newItemInput);
      if (activeTab === 'Satuan Kerja') {
          const res = await addDivisi(newItemInput);
          if (!res.success) {
              showNotification('Gagal', res.error || 'Terjadi kesalahan saat menambah Satuan Kerja', 'error');
              return;
          }
      }
      setNewItemInput('');
  };

  const currentList = activeTab === 'Jabatan' ? jabatanList : activeTab === 'Satuan Kerja' ? divisiList : subCategories;
  const filteredList = currentList.filter(item => item.toLowerCase().includes(searchTerm.toLowerCase()));



  return (
    <div className="p-4 sm:p-8 h-full overflow-y-auto bg-slate-50">
        
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 sm:mb-8">
            <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2 sm:gap-3">
                    <Database className="text-gov-600" size={20} />
                    Master Data
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Kelola data referensi dan pengguna sistem.</p>
            </div>
            
            {/* Tabs */}
            <div className="flex bg-white p-1 rounded-lg border border-slate-200 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('Users')} 
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap ${activeTab === 'Users' ? 'bg-gov-50 text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <UserIcon size={14} className="sm:w-4 sm:h-4" /> Pengguna
                </button>
                <button 
                    onClick={() => setActiveTab('Jabatan')} 
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap ${activeTab === 'Jabatan' ? 'bg-gov-50 text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Briefcase size={14} className="sm:w-4 sm:h-4" /> Jabatan
                </button>
                <button 
                    onClick={() => setActiveTab('Kategori')} 
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap ${activeTab === 'Kategori' ? 'bg-gov-50 text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Tag size={14} className="sm:w-4 sm:h-4" /> Kategori
                </button>
                <button 
                    onClick={() => { setActiveTab('Satuan Kerja'); setSearchTerm(''); }}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap ${activeTab === 'Satuan Kerja' ? 'bg-gov-50 text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Briefcase size={14} className="sm:w-4 sm:h-4" /> Satuan Kerja
                </button>
                <button 
                    onClick={() => { setActiveTab('API Integrasi'); setSearchTerm(''); }}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap ${activeTab === 'API Integrasi' ? 'bg-gov-50 text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Key size={14} className="sm:w-4 sm:h-4" /> Integrasi API
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="space-y-4 sm:space-y-6">
            {activeTab === 'Satuan Kerja' ? (
                <BMNSatkerConfig showNotification={showNotification} />
            ) : (
                <>
                    {/* Action Bar */}
                    <div className="flex flex-col gap-3 sm:gap-4">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder={`Cari ${activeTab}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 transition-all shadow-sm"
                    />
                </div>

                {activeTab === 'Users' ? (
                     <button 
                        onClick={() => handleOpenUserModal()}
                        className="w-full sm:w-auto bg-gov-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-gov-700 flex items-center justify-center gap-2 shadow-sm transition-all text-sm"
                    >
                        <Plus size={18} /> Tambah User
                    </button>
                ) : activeTab === 'API Integrasi' ? (
                     <button 
                        onClick={() => {
                            setNewApiKeyName('');
                            setNewApiKeyUserIds([]);
                            setNewApiKeyExpiresAt('');
                            setIsApiKeyModalOpen(true);
                        }}
                        className="w-full sm:w-auto bg-gov-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-gov-700 flex items-center justify-center gap-2 shadow-sm transition-all text-sm"
                    >
                        <Plus size={18} /> Generate API Key
                    </button>
                ) : (
                    <div className="flex gap-2">
                         <input 
                            type="text"
                            value={newItemInput}
                            onChange={(e) => setNewItemInput(e.target.value)}
                            placeholder={`Tambah ${activeTab} baru...`}
                            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 transition-all shadow-sm"
                        />
                        <button 
                            onClick={handleAddItem}
                            disabled={!newItemInput.trim()}
                            className="bg-gov-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold hover:bg-gov-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2 shadow-sm transition-all text-sm"
                        >
                            <Plus size={16} /> <span className="hidden sm:inline">Tambah</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Tables */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {activeTab === 'Users' ? (
                    <>
                        {/* Desktop Table */}
                        <table className="hidden sm:table w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Pegawai</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">NIP</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Jabatan</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gov-100 text-gov-700 flex items-center justify-center font-bold text-sm">
                                                    {user.initials}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{user.name}</p>
                                                    <p className="text-xs text-slate-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-600">{user.nip || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-600">{user.jabatan || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                                                user.role === 'Super Admin' ? 'bg-purple-100 text-purple-700' :
                                                user.role === 'Atasan' ? 'bg-blue-100 text-blue-700' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleOpenUserModal(user)} className="p-2 text-slate-400 hover:text-gov-600 hover:bg-gov-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                                <button onClick={() => {
                                                    showConfirm(
                                                        'Hapus User',
                                                        `Apakah Anda yakin ingin menghapus user "${user.name}"?`,
                                                        () => onDeleteUser(user.id),
                                                        'error',
                                                        'Hapus',
                                                        'Batal'
                                                    );
                                                }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {/* Mobile Card List */}
                        <div className="sm:hidden divide-y divide-slate-100">
                            {filteredUsers.map(user => (
                                <div key={user.id} className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gov-100 text-gov-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                                {user.initials}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-800 text-sm truncate">{user.name}</p>
                                                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                                {user.nip && (
                                                    <p className="text-xs text-slate-600 mt-0.5">NIP: {user.nip}</p>
                                                )}
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-slate-600">{user.jabatan || '-'}</span>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                                                        user.role === 'Super Admin' ? 'bg-purple-100 text-purple-700' :
                                                        user.role === 'Atasan' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {user.role}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => handleOpenUserModal(user)} className="p-2 text-slate-400 hover:text-gov-600 hover:bg-gov-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                            <button onClick={() => {
                                                showConfirm(
                                                    'Hapus User',
                                                    `Apakah Anda yakin ingin menghapus user "${user.name}"?`,
                                                    () => onDeleteUser(user.id),
                                                    'error',
                                                    'Hapus',
                                                    'Batal'
                                                );
                                            }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filteredUsers.length === 0 && (
                                <div className="p-8 text-center text-slate-400 text-sm">
                                    Data tidak ditemukan.
                                </div>
                            )}
                        </div>
                    </>
                ) : activeTab === 'API Integrasi' ? (
                    isLoadingApiKeys ? (
                        <div className="flex items-center justify-center p-12">
                            <Loader2 className="w-8 h-8 text-gov-600 animate-spin mr-2" />
                            <span className="text-slate-500 font-medium">Memuat data API Key...</span>
                        </div>
                    ) : apiKeys.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <Key size={48} className="mx-auto mb-3 text-slate-300" />
                            <p className="text-sm font-semibold text-slate-600">Belum ada API Key</p>
                            <p className="text-xs text-slate-400 mt-1">Buat API Key baru untuk memberikan akses jadwal kegiatan kepada sistem lain.</p>
                            <button
                                onClick={() => {
                                    setNewApiKeyName('');
                                    setNewApiKeyUserIds([]);
                                    setNewApiKeyExpiresAt('');
                                    setIsApiKeyModalOpen(true);
                                }}
                                className="mt-4 inline-flex items-center gap-2 bg-gov-600 hover:bg-gov-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors"
                            >
                                <Plus size={14} /> Generate API Key Pertama
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Desktop View */}
                            <table className="hidden md:table w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Integrasi / Sistem</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Target Pengguna</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dibuat Pada</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Masa Berlaku</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {apiKeys
                                        .filter(k => k.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map(key => {
                                            const isExpired = key.expires_at && new Date(key.expires_at) < new Date();
                                            const isActive = key.is_active && !isExpired;
                                            return (
                                                <tr key={key.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-semibold text-slate-800 text-sm">{key.name}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-1 max-w-xs">
                                                            {key.api_key_users && key.api_key_users.length > 0 ? (
                                                                key.api_key_users.map((ku: any) => ku.profiles ? (
                                                                    <span key={ku.user_id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100" title={`${ku.profiles.jabatan || ''} - ${ku.profiles.divisi || ''}`}>
                                                                        {ku.profiles.name}
                                                                    </span>
                                                                ) : null)
                                                            ) : (
                                                                <span className="text-slate-400 text-xs">-</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">
                                                        {new Date(key.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">
                                                        {key.expires_at ? (
                                                            <span className="flex items-center gap-1">
                                                                <Calendar size={14} className="text-slate-400" />
                                                                {new Date(key.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 italic">Selamanya</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            isActive ? 'bg-green-100 text-green-800' : 'bg-rose-100 text-rose-800'
                                                        }`}>
                                                            {isActive ? 'Aktif' : isExpired ? 'Expired' : 'Nonaktif'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button 
                                                            onClick={() => handleRevokeApiKey(key.id, key.name)} 
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Revoke / Cabut Kunci"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>

                            {/* Mobile View */}
                            <div className="md:hidden divide-y divide-slate-100">
                                {apiKeys
                                    .filter(k => k.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map(key => {
                                        const isExpired = key.expires_at && new Date(key.expires_at) < new Date();
                                        const isActive = key.is_active && !isExpired;
                                        return (
                                            <div key={key.id} className="p-4 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm">{key.name}</div>
                                                        <div className="text-[10px] text-slate-400 mt-0.5">
                                                            Dibuat: {new Date(key.created_at).toLocaleDateString('id-ID')}
                                                        </div>
                                                    </div>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                                        isActive ? 'bg-green-100 text-green-800' : 'bg-rose-100 text-rose-800'
                                                    }`}>
                                                        {isActive ? 'Aktif' : isExpired ? 'Expired' : 'Nonaktif'}
                                                    </span>
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="text-xs font-semibold text-slate-500">Target Pengguna:</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {key.api_key_users && key.api_key_users.length > 0 ? (
                                                            key.api_key_users.map((ku: any) => ku.profiles ? (
                                                                <span key={ku.user_id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                                    {ku.profiles.name}
                                                                </span>
                                                            ) : null)
                                                        ) : (
                                                            <span className="text-slate-400 text-xs">-</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center pt-2 border-t border-slate-50 text-xs text-slate-500">
                                                    <div>
                                                        Masa Berlaku: {key.expires_at ? new Date(key.expires_at).toLocaleDateString('id-ID') : 'Selamanya'}
                                                    </div>
                                                    <button 
                                                        onClick={() => handleRevokeApiKey(key.id, key.name)} 
                                                        className="flex items-center gap-1 text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors font-medium text-xs"
                                                    >
                                                        <Trash2 size={14} /> Revoke
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </>
                    )
                ) : activeTab === 'Kategori' ? (
                    <div className="space-y-8">
                        <MasterCategoryManagement 
                            masterCategories={masterCategories}
                            masterSubCategories={masterSubCategories}
                            categorySubcategoryRelations={categorySubcategoryRelations}
                            onAddMasterCategory={onAddMasterCategory}
                            onUpdateMasterCategory={onUpdateMasterCategory}
                            onDeleteMasterCategory={onDeleteMasterCategory}
                        />
                        
                        <MasterSubCategoryManagement 
                            masterCategories={masterCategories}
                            masterSubCategories={masterSubCategories}
                            categorySubcategoryRelations={categorySubcategoryRelations}
                            onAddMasterSubCategory={onAddMasterSubCategory}
                            onUpdateMasterSubCategory={onUpdateMasterSubCategory}
                            onDeleteMasterSubCategory={onDeleteMasterSubCategory}
                        />
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama {activeTab}</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredList.length > 0 ? (
                                filteredList.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                                            {item}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => {
                                                    const handler = activeTab === 'Jabatan' ? onDeleteJabatan : activeTab === 'Satuan Kerja' ? removeDivisi : onDeleteSubCategory;
                                                    showConfirm(
                                                        `Hapus ${activeTab}`,
                                                        `Apakah Anda yakin ingin menghapus "${item}"?`,
                                                        () => handler(item),
                                                        'error',
                                                        'Hapus',
                                                        'Batal'
                                                    );
                                                }}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={2} className="px-6 py-8 text-center text-slate-400 text-sm italic">
                                        Data tidak ditemukan.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
                    </div>
                </>
            )}
        </div>

        {/* User Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <div className="bg-white w-full rounded-2xl shadow-xl sm:max-w-lg max-h-[90vh] overflow-hidden">

                    
                    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-800 text-sm sm:text-base">{editingUser ? 'Edit User' : 'Tambah User Baru'}</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleUserSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
                        {!editingUser && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                <div className="flex items-start gap-2">
                                    <Shield className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                                    <div>
                                        <p className="text-xs font-bold text-blue-800">Keamanan User Baru</p>
                                        <p className="text-[10px] text-blue-600 mt-1">
                                            User baru akan dibuat dengan akun login. Jika user tidak bisa login setelah dibuat, pastikan email confirmation dinonaktifkan di Supabase Dashboard (Authentication {'->'} Settings {'->'} Email {'->'} Disable &quot;Enable email confirmations&quot;).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nama Lengkap</label>
                            <input 
                                type="text"
                                required 
                                value={userFormData.name}
                                onChange={e => setUserFormData({...userFormData, name: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email</label>
                            <input 
                                type="email"
                                required 
                                value={userFormData.email}
                                onChange={e => setUserFormData({...userFormData, email: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Role Akses</label>
                                <select 
                                    value={userFormData.role}
                                    onChange={e => setUserFormData({...userFormData, role: e.target.value as Role})}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm bg-white"
                                >
                                    <option value="Staff">Staff</option>
                                    <option value="Atasan">Atasan</option>
                                    <option value="Super Admin">Super Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                                    Password {!editingUser && <span className="text-red-500">*</span>}
                                </label>
                                <div className="relative">
                                    <input 
                                        type="password"
                                        required={!editingUser}
                                        minLength={6}
                                        value={userFormData.password}
                                        placeholder={editingUser ? '(Kosongkan jika tidak diubah)' : 'Min 6 karakter'}
                                        onChange={e => setUserFormData({...userFormData, password: e.target.value})}
                                        className="w-full pl-8 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                                    />
                                    <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Jabatan</label>
                            <select 
                                value={userFormData.jabatan}
                                onChange={e => setUserFormData({...userFormData, jabatan: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm bg-white"
                            >
                                <option value="">-- Pilih Jabatan --</option>
                                {jabatanList.map(j => (
                                    <option key={j} value={j}>{j}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">NIP</label>
                                <input 
                                    type="text"
                                    value={userFormData.nip || ''}
                                    onChange={e => setUserFormData({...userFormData, nip: e.target.value})}
                                    placeholder="Nomor Induk Pegawai"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Satuan Kerja</label>
                                <select 
                                    value={userFormData.divisi || ''}
                                    onChange={e => setUserFormData({...userFormData, divisi: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm bg-white"
                                >
                                    <option value="">-- Pilih Satuan Kerja --</option>
                                    {divisiList.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        {/* Animation Settings - Compact for mobile */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Animasi</label>
                            <div className="grid grid-cols-1 gap-2">
                                {/* Sakura Animation */}
                                <div className="flex items-center justify-between p-2.5 sm:p-3 bg-pink-50 border border-pink-200 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <span className="text-pink-500">🌸</span>
                                        <span className="text-xs sm:text-sm font-medium text-slate-700">Sakura</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={userFormData.sakuraAnimationEnabled || false}
                                        onChange={e => setUserFormData({...userFormData, sakuraAnimationEnabled: e.target.checked})}
                                        className="w-4 h-4 text-pink-500 border-slate-300 rounded focus:ring-pink-400"
                                    />
                                </div>
                                
                                {/* Snow Animation */}
                                <div className="flex items-center justify-between p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <span className="text-blue-500">❄️</span>
                                        <span className="text-xs sm:text-sm font-medium text-slate-700">Salju</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={userFormData.snowAnimationEnabled || false}
                                        onChange={e => setUserFormData({...userFormData, snowAnimationEnabled: e.target.checked})}
                                        className="w-4 h-4 text-blue-500 border-slate-300 rounded focus:ring-blue-400"
                                    />
                                </div>

                                {/* Money Animation */}
                                <div className="flex items-center justify-between p-2.5 sm:p-3 bg-green-50 border border-green-100 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <span>💵</span>
                                        <span className="text-xs sm:text-sm font-medium text-slate-700">Uang</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={userFormData.moneyAnimationEnabled || false}
                                        onChange={e => setUserFormData({...userFormData, moneyAnimationEnabled: e.target.checked})}
                                        className="w-4 h-4 text-green-500 border-slate-300 rounded focus:ring-green-400"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tampilan & Dekorasi */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Tampilan & Dekorasi</label>
                            <div className="space-y-3">
                                {/* Flower Decoration Switch */}
                                <div className="flex items-center justify-between p-2.5 sm:p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <span className="text-emerald-500">🌸</span>
                                        <span className="text-xs sm:text-sm font-medium text-slate-700">Dekorasi Bunga Detail Task</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={userFormData.flowerDecorationEnabled || false}
                                        onChange={e => setUserFormData({...userFormData, flowerDecorationEnabled: e.target.checked})}
                                        className="w-4 h-4 text-emerald-500 border-slate-300 rounded focus:ring-emerald-400"
                                    />
                                </div>

                                {/* Header Color Selection */}
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Warna Header Detail Task</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {Object.keys(headerColorPresets).map((colorKey) => {
                                            const preset = headerColorPresets[colorKey as keyof typeof headerColorPresets];
                                            const isSelected = (userFormData.header_color || 'default') === colorKey;
                                            return (
                                                <button
                                                    key={colorKey}
                                                    type="button"
                                                    onClick={() => setUserFormData({...userFormData, header_color: colorKey === 'default' ? undefined : colorKey})}
                                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${preset.bg} ${preset.text} ${
                                                        isSelected
                                                            ? 'ring-2 ring-blue-500 border-blue-500 scale-105 shadow-sm'
                                                            : 'border-slate-300 hover:scale-105'
                                                    }`}
                                                >
                                                    {preset.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="pt-4 flex gap-3">
                             <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 text-slate-600 font-medium text-sm hover:bg-slate-100 rounded-lg border border-slate-200">Batal</button>
                             <button type="submit" className="flex-1 px-4 py-2.5 bg-gov-600 text-white font-bold text-sm rounded-lg hover:bg-gov-700 flex items-center justify-center gap-2">
                                <Save size={16} /> Simpan
                             </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Custom Modals */}
        <NotificationModal
            isOpen={notificationModal.isOpen}
            onClose={hideNotification}
            title={notificationModal.title}
            message={notificationModal.message}
            type={notificationModal.type}
            autoClose={notificationModal.type === 'success'}
            autoCloseDelay={3000}
        />

        <ConfirmModal
            isOpen={confirmModal.isOpen}
            onClose={hideConfirm}
            onConfirm={confirmModal.onConfirm}
            title={confirmModal.title}
            message={confirmModal.message}
            type={confirmModal.type}
            confirmText={confirmModal.confirmText}
            cancelText={confirmModal.cancelText}
        />

        {/* API Key Modal Form */}
        {isApiKeyModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <div className="bg-white w-full rounded-2xl shadow-xl sm:max-w-lg overflow-visible">
                    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                        <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                            <Key size={18} className="text-gov-600" />
                            Generate API Key Baru
                        </h3>
                        <button onClick={() => setIsApiKeyModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleGenerateApiKey} className="p-4 sm:p-6 space-y-4 overflow-visible">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-2 space-y-1">
                            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                <AlertCircle size={14} className="text-gov-600" /> Keamanan API
                            </h4>
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                                Kunci API ini memberikan akses penuh untuk membaca jadwal kegiatan pengguna yang Anda pilih. Harap gunakan hanya untuk sistem internal resmi.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nama Integrasi / Nama Sistem <span className="text-red-500">*</span></label>
                            <input 
                                type="text"
                                required 
                                placeholder="Contoh: Sistem Display TV Ruang Menteri"
                                value={newApiKeyName}
                                onChange={e => setNewApiKeyName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Target Pengguna (Bisa Pilih Banyak) <span className="text-red-500">*</span></label>
                            <MultiSelectChip
                                options={users.map(user => ({
                                    value: user.id,
                                    label: `${user.name} (${user.jabatan || user.role})`
                                }))}
                                value={newApiKeyUserIds}
                                onChange={(selectedIds) => setNewApiKeyUserIds(selectedIds)}
                                placeholder="Pilih pegawai..."
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Masa Berlaku (Kosongkan jika selamanya)</label>
                            <div className="relative">
                                <input 
                                    type="date"
                                    value={newApiKeyExpiresAt}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={e => setNewApiKeyExpiresAt(e.target.value)}
                                    className="w-full pl-8 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm bg-white"
                                />
                                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                             <button type="button" onClick={() => setIsApiKeyModalOpen(false)} className="flex-1 px-4 py-2.5 text-slate-600 font-medium text-sm hover:bg-slate-100 rounded-lg border border-slate-200">Batal</button>
                             <button 
                                type="submit" 
                                disabled={isGeneratingKey}
                                className="flex-1 px-4 py-2.5 bg-gov-600 text-white font-bold text-sm rounded-lg hover:bg-gov-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                             >
                                {isGeneratingKey ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Membuat...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} />
                                        <span>Generate Key</span>
                                    </>
                                )}
                             </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Success Modal - Display generated key */}
        {generatedPlainKey && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div className="bg-white w-full rounded-2xl shadow-2xl sm:max-w-md overflow-hidden transform transition-all scale-100">
                    <div className="p-6 text-center space-y-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                            <Check size={24} />
                        </div>
                        
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-800">API Key Berhasil Dibuat!</h3>
                            <p className="text-xs text-slate-500">Kunci ini telah di-hash dengan aman di database.</p>
                        </div>

                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-left flex gap-2">
                            <AlertCircle className="text-rose-600 flex-shrink-0 mt-0.5" size={16} />
                            <div>
                                <p className="text-xs font-bold text-rose-800">PERINGATAN PENTING</p>
                                <p className="text-[10px] text-rose-600 mt-1 leading-relaxed">
                                    Salin kunci di bawah ini sekarang. Demi keamanan, Anda tidak akan pernah bisa melihat kunci ini lagi setelah menutup jendela ini.
                                </p>
                            </div>
                        </div>

                        <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-xs break-all pr-12 text-slate-700 select-all leading-normal flex items-center justify-between text-left">
                            <span className="w-full block pr-4">{generatedPlainKey}</span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(generatedPlainKey);
                                    setIsCopying(true);
                                    setTimeout(() => setIsCopying(false), 2000);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                                title="Salin ke Clipboard"
                            >
                                {isCopying ? <Check size={14} className="text-green-600 animate-pulse" /> : <Copy size={14} />}
                            </button>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={() => setGeneratedPlainKey(null)}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-2.5 rounded-lg shadow transition-colors"
                            >
                                Selesai
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default UserManagement;