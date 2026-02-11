import React, { useState, useEffect } from 'react';
import { User, Role } from '../../types';
import { Plus, Search, Edit2, Trash2, Shield, User as UserIcon, X, Save, Key, Briefcase, Tag, Database, Folder } from 'lucide-react';
import MultiSelectChip from './MultiSelectChip';
import { useNotificationModal, useConfirmModal } from '../hooks/useModal';
import NotificationModal from './NotificationModal';
import ConfirmModal from './ConfirmModal';

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

type Tab = 'Users' | 'Jabatan' | 'Kategori';

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
  
  // User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({
      name: '', email: '', role: 'Staff', jabatan: '', password: '', sakuraAnimationEnabled: false, snowAnimationEnabled: false, moneyAnimationEnabled: false,
  });

  // Simple Input State for Jabatan/Kategori
  const [newItemInput, setNewItemInput] = useState('');

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
      u.jabatan?.toLowerCase().includes(searchTerm.toLowerCase())
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
              password: '',
              sakuraAnimationEnabled: false,
              snowAnimationEnabled: false,
              moneyAnimationEnabled: false,
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

  const handleAddItem = () => {
      if (!newItemInput.trim()) return;
      if (activeTab === 'Jabatan') onAddJabatan(newItemInput);
      if (activeTab === 'Kategori') onAddSubCategory(newItemInput);
      setNewItemInput('');
  };

  const currentList = activeTab === 'Jabatan' ? jabatanList : subCategories;
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
            </div>
        </div>

        {/* Content Area */}
        <div className="space-y-4 sm:space-y-6">
            
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
                                                    const handler = activeTab === 'Jabatan' ? onDeleteJabatan : onDeleteSubCategory;
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
        </div>

        {/* User Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                <div className="bg-white w-full sm:rounded-2xl rounded-t-2xl shadow-xl sm:max-w-lg max-h-[90vh] overflow-hidden sm:m-4">
                    {/* Mobile handle bar */}
                    <div className="sm:hidden flex justify-center pt-3 pb-1">
                        <div className="w-10 h-1 bg-slate-300 rounded-full"></div>
                    </div>
                    
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
                                            User baru akan dibuat dengan akun login. Jika user tidak bisa login setelah dibuat, pastikan email confirmation dinonaktifkan di Supabase Dashboard (Authentication > Settings > Email > Disable "Enable email confirmations").
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
                        
                        <div className="pt-4 flex gap-3 pb-safe">
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
    </div>
  );
};

export default UserManagement;