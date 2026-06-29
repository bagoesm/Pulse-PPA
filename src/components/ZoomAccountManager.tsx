// src/components/ZoomAccountManager.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Video, Plus, Edit2, Trash2, Mail, Check, X, 
  AlertCircle, Key, Shield, Users, 
  Eye, EyeOff, UserCheck, Trash
} from 'lucide-react';
import { ZoomAccount, ZoomMeeting, ZoomEditor, User } from '../../types';
import { zoomService } from '../services/ZoomService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import SearchableSelect from './SearchableSelect';

interface ZoomAccountManagerProps {
  accounts: ZoomAccount[];
  meetings: ZoomMeeting[];
  onRefresh: () => void;
}

const ZoomAccountManager: React.FC<ZoomAccountManagerProps> = ({
  accounts,
  meetings,
  onRefresh
}) => {
  const { currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'Super Admin';

  // State
  const [zoomEditors, setZoomEditors] = useState<ZoomEditor[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Zoom Account Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [capacityInput, setCapacityInput] = useState<number>(100);
  const [isActiveInput, setIsActiveInput] = useState<boolean>(true);
  const [divisiInput, setDivisiInput] = useState('');

  // Zoom Editor Manager States
  const [selectedEditorSatker, setSelectedEditorSatker] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [editorsList, setEditorsList] = useState<ZoomEditor[]>([]);
  const [editorLoading, setEditorLoading] = useState(false);

  // Password visibility state per account ID
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Fetch all metadata
  useEffect(() => {
    fetchMetadata();
    fetchZoomEditors();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [{ data: profilesData }, { data: divData }] = await Promise.all([
        supabase.from('profiles').select('id, name, email, role, divisi').order('name', { ascending: true }),
        supabase.from('master_divisi').select('name').eq('is_active', true).order('name', { ascending: true })
      ]);

      if (profilesData) setAllUsers(profilesData);
      if (divData) {
        const divNames = divData.map((d: any) => d.name);
        setDivisions(divNames);
        if (divNames.length > 0) {
          setDivisiInput(divNames[0]);
          setSelectedEditorSatker(divNames[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  const fetchZoomEditors = async () => {
    try {
      const eds = await zoomService.getZoomEditors();
      setZoomEditors(eds);
    } catch (err) {
      console.error('Error fetching zoom editors:', err);
    }
  };

  // Check if current user is an authorized editor for a specific Satker
  const checkIsEditor = useCallback((divisiName: string): boolean => {
    if (isSuperAdmin) return true;
    return zoomEditors.some(
      (e) => e.userId === currentUser?.id && e.divisi.toLowerCase().trim() === divisiName.toLowerCase().trim()
    );
  }, [zoomEditors, isSuperAdmin, currentUser?.id]);



  // CRUD for Zoom Accounts
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !divisiInput) return;

    // Authorization check
    if (!checkIsEditor(divisiInput)) {
      setError(`Anda tidak memiliki hak akses sebagai editor Zoom untuk Satker "${divisiInput}".`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await zoomService.createAccount({
        name: nameInput.trim(),
        email: emailInput.trim() || undefined,
        password: passwordInput.trim() || undefined,
        kapasitas: capacityInput,
        isActive: isActiveInput,
        divisi: divisiInput
      });
      setNameInput('');
      setEmailInput('');
      setPasswordInput('');
      setCapacityInput(100);
      setIsActiveInput(true);
      setShowAddForm(false);
      onRefresh();
    } catch (err: any) {
      console.error('Error adding Zoom account:', err);
      setError(err.message || 'Gagal menambahkan akun Zoom. Pastikan nama akun unik.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (acc: ZoomAccount) => {
    setEditingId(acc.id);
    setNameInput(acc.name);
    setEmailInput(acc.email || '');
    setPasswordInput(acc.password || '');
    setCapacityInput(acc.kapasitas);
    setIsActiveInput(acc.isActive);
    setDivisiInput(acc.divisi);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNameInput('');
    setEmailInput('');
    setPasswordInput('');
    setCapacityInput(100);
    setIsActiveInput(true);
  };

  const handleSaveEdit = async (id: string, originalDivisi: string) => {
    if (!nameInput.trim()) return;

    // Authorization check: User must be editor of BOTH original division and new division (if changed)
    if (!checkIsEditor(originalDivisi)) {
      setError(`Anda tidak memiliki hak akses editor Zoom untuk Satker "${originalDivisi}".`);
      return;
    }
    if (divisiInput !== originalDivisi && !checkIsEditor(divisiInput)) {
      setError(`Anda tidak memiliki hak akses editor Zoom untuk Satker baru "${divisiInput}".`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await zoomService.updateAccount(id, {
        name: nameInput.trim(),
        email: emailInput.trim() || undefined,
        password: passwordInput.trim() || undefined,
        kapasitas: capacityInput,
        isActive: isActiveInput,
        divisi: divisiInput
      });
      setEditingId(null);
      setNameInput('');
      setEmailInput('');
      setPasswordInput('');
      onRefresh();
    } catch (err: any) {
      console.error('Error updating Zoom account:', err);
      setError(err.message || 'Gagal mengubah akun Zoom.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string, divisi: string) => {
    // Authorization check
    if (!checkIsEditor(divisi)) {
      setError(`Anda tidak memiliki hak akses editor Zoom untuk menghapus akun Satker "${divisi}".`);
      return;
    }

    const usageCount = meetings.filter(m => m.zoomAccountId === id).length;
    let confirmMsg = `Apakah Anda yakin ingin menghapus akun Zoom "${name}"?`;
    if (usageCount > 0) {
      confirmMsg += `\n\nPERINGATAN: Akun ini sedang digunakan oleh ${usageCount} jadwal rapat. Menghapus akun ini akan mengosongkan relasi akun zoom pada jadwal-jadwal tersebut.`;
    }

    if (!window.confirm(confirmMsg)) return;

    try {
      setLoading(true);
      setError(null);
      await zoomService.deleteAccount(id);
      onRefresh();
    } catch (err: any) {
      console.error('Error deleting Zoom account:', err);
      setError(err.message || 'Gagal menghapus akun Zoom.');
    } finally {
      setLoading(false);
    }
  };



  const togglePasswordVisibility = (accountId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  // Zoom Editors Management Logic
  const isZoomEditor = useMemo(() => {
    if (!currentUser) return false;
    return zoomEditors.some(e => e.userId === currentUser.id);
  }, [zoomEditors, currentUser]);

  const canManageEditors = useMemo(() => {
    return isSuperAdmin || isZoomEditor || currentUser?.divisi === 'Biro Data dan Informasi';
  }, [isSuperAdmin, isZoomEditor, currentUser]);

  const filteredEditors = useMemo(() => {
    if (!selectedEditorSatker) return [];
    
    const profileMap = new Map<string, User>();
    allUsers.forEach(u => profileMap.set(u.id, u));

    return zoomEditors
      .filter((e) => e.divisi.toLowerCase().trim() === selectedEditorSatker.toLowerCase().trim())
      .map((e) => {
        const user = profileMap.get(e.userId);
        return {
          ...e,
          userName: user?.name || 'Staff',
          userEmail: user?.email || ''
        };
      });
  }, [zoomEditors, selectedEditorSatker, allUsers]);

  const nonEditorStaff = useMemo(() => {
    const editorUserIds = new Set(filteredEditors.map(e => e.userId));
    return allUsers.filter(u => u.role !== 'Super Admin' && !editorUserIds.has(u.id));
  }, [allUsers, filteredEditors]);

  const handleAddEditor = async () => {
    if (!selectedStaffId || !selectedEditorSatker) return;
    
    try {
      setEditorLoading(true);
      setError(null);
      await zoomService.addZoomEditor(selectedStaffId, selectedEditorSatker);
      setSelectedStaffId('');
      fetchZoomEditors();
    } catch (err: any) {
      console.error('Error adding zoom editor:', err);
      setError('Gagal menambahkan editor Zoom.');
    } finally {
      setEditorLoading(false);
    }
  };

  const handleRemoveEditor = async (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin mencabut hak akses editor Zoom untuk ${name}?`)) {
      return;
    }

    try {
      setEditorLoading(true);
      setError(null);
      await zoomService.removeZoomEditor(id);
      fetchZoomEditors();
    } catch (err: any) {
      console.error('Error removing zoom editor:', err);
      setError('Gagal mencabut hak akses editor Zoom.');
    } finally {
      setEditorLoading(false);
    }
  };

  const formatDateStr = (dateStr: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
  };

  return (
    <div className="space-y-8">
      
      {/* 1. Zoom Accounts Management Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Video className="text-gov-600" size={20} />
              Daftar Akun Zoom Meeting
            </h4>
            <p className="text-sm text-slate-500 mt-0.5">
              Pantau kredensial akun Zoom, kapasitas, dan status operasional per Satker.
            </p>
          </div>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-xl font-bold text-sm shadow-md transition-all self-start"
            >
              <Plus size={16} />
              Tambah Akun Zoom
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-100 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-slideDown">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Add Zoom Account Form */}
        {showAddForm && (
          <form onSubmit={handleAdd} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 animate-slideDown text-sm">
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-slate-600 uppercase tracking-wider text-xs">Tambah Akun Zoom Baru</h5>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-600">Nama Akun Zoom *</label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Contoh: Zoom Datin 1"
                  className="w-full text-sm bg-white text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-600">Email Akun (Opsional)</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Contoh: zoom1@kemenpppa.go.id"
                  className="w-full text-sm bg-white text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-600">Kata Sandi / Password *</label>
                <input
                  type="text"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan password akun..."
                  className="w-full text-sm bg-white text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-600">Kapasitas Peserta *</label>
                <SearchableSelect
                  options={[
                    { value: '100', label: '100 Peserta' },
                    { value: '300', label: '300 Peserta' },
                    { value: '500', label: '500 Peserta' },
                    { value: '1000', label: '1000 Peserta' }
                  ]}
                  value={capacityInput.toString()}
                  onChange={(val) => setCapacityInput(val ? parseInt(val) : 100)}
                  placeholder="Cari kapasitas..."
                  emptyOption="-- Pilih Kapasitas --"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-600">Unit Kerja / Satker Penanggung Jawab *</label>
                <SearchableSelect
                  options={divisions.map(div => ({ value: div, label: div }))}
                  value={divisiInput}
                  onChange={setDivisiInput}
                  placeholder="Cari unit kerja..."
                  emptyOption="-- Pilih Unit Kerja --"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-600 block">Status Operasional</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isActiveInput"
                      checked={isActiveInput === true}
                      onChange={() => setIsActiveInput(true)}
                      className="accent-gov-600"
                    />
                    <span>Aktif</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isActiveInput"
                      checked={isActiveInput === false}
                      onChange={() => setIsActiveInput(false)}
                      className="accent-gov-600"
                    />
                    <span>Tidak Aktif</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 border border-slate-250 text-slate-600 rounded-lg hover:bg-slate-100 font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 bg-gov-600 text-white rounded-lg hover:bg-gov-700 disabled:opacity-50 font-semibold flex items-center gap-1"
              >
                {loading ? 'Menyimpan...' : 'Simpan Akun'}
              </button>
            </div>
          </form>
        )}

        {/* Grid Accounts List */}
        <div className="grid grid-cols-1 gap-4">
          {accounts.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
              Belum ada akun Zoom terdaftar.
            </div>
          ) : (
            accounts.map((acc) => {
              const accMeetings = meetings.filter(m => m.zoomAccountId === acc.id);
              const isEditing = editingId === acc.id;
              const isEditor = checkIsEditor(acc.divisi);
              const isPasswordVisible = !!visiblePasswords[acc.id];

              return (
                <div key={acc.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow text-sm">
                  
                  {/* Account Detail Form or Display */}
                  <div className="p-4 flex flex-col gap-4 bg-slate-50/30">
                    {isEditing ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-500">Nama Akun</label>
                          <input
                            type="text"
                            required
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            className="w-full bg-white text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-500">Email</label>
                          <input
                            type="email"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            className="w-full bg-white text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-500">Password</label>
                          <input
                            type="text"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            className="w-full bg-white text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-500">Kapasitas</label>
                          <SearchableSelect
                            options={[
                              { value: '100', label: '100 Peserta' },
                              { value: '300', label: '300 Peserta' },
                              { value: '500', label: '500 Peserta' },
                              { value: '1000', label: '1000 Peserta' }
                            ]}
                            value={capacityInput.toString()}
                            onChange={(val) => setCapacityInput(val ? parseInt(val) : 100)}
                            placeholder="Kapasitas..."
                            emptyOption="-- Kapasitas --"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-500">Unit Kerja / Satker</label>
                          <SearchableSelect
                            options={divisions.map(div => ({ value: div, label: div }))}
                            value={divisiInput}
                            onChange={setDivisiInput}
                            placeholder="Unit kerja..."
                            emptyOption="-- Unit Kerja --"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-500 block">Status</label>
                          <div className="flex gap-4 mt-2">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name="isEditingActive"
                                checked={isActiveInput === true}
                                onChange={() => setIsActiveInput(true)}
                              />
                              <span>Aktif</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name="isEditingActive"
                                checked={isActiveInput === false}
                                onChange={() => setIsActiveInput(false)}
                              />
                              <span>Tidak Aktif</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs ${
                            acc.isActive 
                              ? 'bg-gov-50 text-gov-600 border border-gov-100' 
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}>
                            <Video size={24} />
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h5 className="text-base font-bold text-slate-800">{acc.name}</h5>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                acc.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                              }`}>
                                {acc.isActive ? 'Aktif' : 'Nonaktif'}
                              </span>
                              <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                                {acc.kapasitas} Pax
                              </span>
                            </div>
                            
                            <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1 mt-1">
                              {acc.email && (
                                <span className="flex items-center gap-1"><Mail size={14} /> {acc.email}</span>
                              )}
                              <span className="flex items-center gap-1 font-semibold text-gov-700">
                                Satker: {acc.divisi}
                              </span>
                            </div>

                            {/* Password Section */}
                            <div className="mt-2 flex items-center gap-2 text-xs bg-white border border-slate-150 px-2.5 py-1.5 rounded-xl max-w-xs">
                              <Key size={14} className="text-slate-400" />
                              <span className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Sandi:</span>
                              {isEditor ? (
                                <>
                                  <span className="font-mono font-bold text-slate-700">
                                    {isPasswordVisible ? (acc.password || 'Tidak ada sandi') : '••••••••'}
                                  </span>
                                  <button
                                    onClick={() => togglePasswordVisibility(acc.id)}
                                    className="ml-auto text-slate-400 hover:text-slate-600 p-0.5 rounded"
                                    title={isPasswordVisible ? 'Sembunyikan Sandi' : 'Tampilkan Sandi'}
                                  >
                                    {isPasswordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                                  </button>
                                </>
                              ) : (
                                <span className="text-slate-400 italic flex items-center gap-1">
                                  <Shield size={12} />
                                  Terproteksi (Khusus Editor)
                                </span>
                              )}
                            </div>

                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          {isEditor && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleStartEdit(acc)}
                                className="p-1.5 text-slate-500 hover:text-gov-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all"
                                title="Ubah Akun"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(acc.id, acc.name, acc.divisi)}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-all"
                                title="Hapus Akun"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    )}

                    {/* Edit Form Actions */}
                    {isEditing && (
                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-150">
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 text-sm font-semibold bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => handleSaveEdit(acc.id, acc.divisi)}
                          disabled={loading}
                          className="px-4 py-1 text-sm font-semibold bg-gov-600 text-white rounded-lg hover:bg-gov-700"
                        >
                          {loading ? 'Menyimpan...' : 'Simpan'}
                        </button>
                      </div>
                    )}
                  </div>



                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Zoom Editors Assignment Section */}
      {canManageEditors && (
        <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-5 space-y-5 text-sm animate-fadeIn">
          <div>
            <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Shield className="text-indigo-600" size={20} />
              Manajemen Hak Akses Editor Zoom
            </h4>
            <p className="text-slate-500 text-xs mt-0.5">
              Super Admin atau Editor Zoom dapat menunjuk Staff/Atasan sebagai Editor Zoom per Satker. Editor memiliki izin penuh untuk mengelola kredensial dan akun Zoom di Satker tersebut.
            </p>
          </div>

          {/* Form and Satker Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-b border-slate-200/60 py-4">
            
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-600 flex items-center gap-1.5 text-sm">
                <Users size={14} /> Pilih Satker / Divisi
              </label>
              <SearchableSelect
                options={divisions.map(div => ({ value: div, label: div }))}
                value={selectedEditorSatker}
                onChange={setSelectedEditorSatker}
                placeholder="Cari Satker..."
                emptyOption="-- Pilih Satker --"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="font-semibold text-slate-600 block text-sm">Tunjuk Pegawai sebagai Editor Zoom</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    options={nonEditorStaff.map(u => ({ value: u.id, label: `${u.name} (${u.role}${u.divisi ? ` - ${u.divisi}` : ''})` }))}
                    value={selectedStaffId}
                    onChange={setSelectedStaffId}
                    placeholder="Cari pegawai..."
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddEditor}
                  disabled={editorLoading || !selectedStaffId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1 shadow-sm disabled:opacity-50 transition-all flex-shrink-0 text-sm"
                >
                  <UserCheck size={16} /> Tunjuk
                </button>
              </div>
            </div>

          </div>

          {/* Editors List */}
          <div className="space-y-3">
            <h5 className="font-bold text-slate-600 uppercase tracking-wider text-xs">
              Daftar Editor Zoom untuk Satker: <span className="text-indigo-600 normal-case">{selectedEditorSatker}</span>
            </h5>

            {filteredEditors.length === 0 ? (
              <p className="text-slate-400 italic text-sm">Belum ada editor ditugaskan untuk Satker ini. Hanya Super Admin yang memiliki hak akses.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredEditors.map((ed) => (
                  <div key={ed.id} className="bg-white border border-slate-150 p-3 rounded-xl flex items-center justify-between gap-3 shadow-2xs text-sm">
                    <div>
                      <div className="font-bold text-slate-800">{ed.userName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{ed.userEmail}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveEditor(ed.id, ed.userName || '')}
                      disabled={editorLoading}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Cabut Akses"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default ZoomAccountManager;
