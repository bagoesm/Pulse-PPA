import React, { useState } from 'react';
import { User, Role } from '../../types';
import { Plus, Search, Edit2, Trash2, Shield, User as UserIcon, X, Save, Key, Briefcase, Tag, Database } from 'lucide-react';
import { useNotificationModal, useConfirmModal } from '../hooks/useModal';
import NotificationModal from './NotificationModal';
import ConfirmModal from './ConfirmModal';

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
}

type Tab = 'Users' | 'Jabatan' | 'Kategori';

const UserManagement: React.FC<UserManagementProps> = ({ 
    users, onAddUser, onEditUser, onDeleteUser, currentUser,
    jabatanList, onAddJabatan, onDeleteJabatan,
    subCategories, onAddSubCategory, onDeleteSubCategory
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
      name: '', email: '', role: 'Staff', jabatan: '', password: '',
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
    <div className="p-8 h-full overflow-y-auto bg-slate-50">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    <Database className="text-gov-600" />
                    Master Data Management
                </h2>
                <p className="text-sm text-slate-500 mt-1">Kelola data referensi dan pengguna sistem.</p>
            </div>
            
            {/* Tabs */}
            <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                <button 
                    onClick={() => setActiveTab('Users')} 
                    className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'Users' ? 'bg-gov-50 text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <UserIcon size={16} /> Pengguna
                </button>
                <button 
                    onClick={() => setActiveTab('Jabatan')} 
                    className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'Jabatan' ? 'bg-gov-50 text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Briefcase size={16} /> Jabatan
                </button>
                <button 
                    onClick={() => setActiveTab('Kategori')} 
                    className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'Kategori' ? 'bg-gov-50 text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Tag size={16} /> Sub-Kategori
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
            
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder={`Cari ${activeTab}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 transition-all shadow-sm"
                    />
                </div>

                {activeTab === 'Users' ? (
                     <button 
                        onClick={() => handleOpenUserModal()}
                        className="bg-gov-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-gov-700 flex items-center gap-2 shadow-sm transition-all"
                    >
                        <Plus size={18} /> Tambah User
                    </button>
                ) : (
                    <div className="flex gap-2 w-full md:w-auto">
                        <input 
                            type="text"
                            value={newItemInput}
                            onChange={(e) => setNewItemInput(e.target.value)}
                            placeholder={`Tambah ${activeTab} baru...`}
                            className="flex-1 md:w-64 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 transition-all shadow-sm"
                        />
                        <button 
                            onClick={handleAddItem}
                            disabled={!newItemInput.trim()}
                            className="bg-gov-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-gov-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-all"
                        >
                            <Plus size={18} /> Tambah
                        </button>
                    </div>
                )}
            </div>

            {/* Tables */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {activeTab === 'Users' ? (
                     <table className="w-full text-left border-collapse">
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-800">{editingUser ? 'Edit User' : 'Tambah User Baru'}</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
                        {!editingUser && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                <div className="flex items-start gap-2">
                                    <Shield className="text-blue-600 mt-0.5" size={16} />
                                    <div>
                                        <p className="text-xs font-bold text-blue-800">Keamanan User Baru</p>
                                        <p className="text-[10px] text-blue-600 mt-1">
                                            User baru akan dibuat dengan akun login yang dapat digunakan untuk mengakses sistem. 
                                            Pastikan email dan password yang aman.
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
                        <div className="grid grid-cols-2 gap-4">
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
                                        placeholder={editingUser ? '(Kosongkan jika tidak diubah)' : 'Minimal 6 karakter'}
                                        onChange={e => setUserFormData({...userFormData, password: e.target.value})}
                                        className="w-full pl-8 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                                    />
                                    <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                </div>
                                {!editingUser && (
                                    <p className="text-[10px] text-slate-500 mt-1">
                                        Password akan digunakan user untuk login pertama kali
                                    </p>
                                )}
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
                        
                        <div className="pt-4 flex justify-end gap-3">
                             <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium text-sm hover:bg-slate-100 rounded-lg">Batal</button>
                             <button type="submit" className="px-4 py-2 bg-gov-600 text-white font-bold text-sm rounded-lg hover:bg-gov-700 flex items-center gap-2">
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