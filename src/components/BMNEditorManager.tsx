// src/components/BMNEditorManager.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BMNEditor, User } from '../../types';
import { useUsers } from '../contexts/UsersContext';
import { 
  Users, 
  UserCheck, 
  X, 
  AlertTriangle, 
  Building2, 
  Plus, 
  Trash2 
} from 'lucide-react';
import SearchableSelect from './SearchableSelect';

interface BMNEditorManagerProps {
  showNotification: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

const BMNEditorManager: React.FC<BMNEditorManagerProps> = ({ showNotification }) => {
  const { allUsers } = useUsers();
  
  // Satkers and editors state
  const [availableSatkers, setAvailableSatkers] = useState<string[]>([]);
  const [selectedSatker, setSelectedSatker] = useState<string>('');
  const [editors, setEditors] = useState<BMNEditor[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch satkers on mount
  useEffect(() => {
    const fetchSatkers = async () => {
      try {
        const { data, error } = await supabase
          .from('master_divisi')
          .select('name')
          .eq('is_active', true)
          .order('name');
        
        if (!error && data) {
          const satkerNames = data.map(d => d.name);
          setAvailableSatkers(satkerNames);
          if (satkerNames.length > 0) {
            setSelectedSatker(satkerNames[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching satkers for manager:', err);
      }
    };
    fetchSatkers();
  }, []);

  // Fetch editors for selected Satker
  const fetchEditors = useCallback(async () => {
    if (!selectedSatker) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bmn_editors')
        .select('*')
        .eq('nama_satker', selectedSatker);
      
      if (error) throw error;

      // Join profile info in-memory
      const profileMap = new Map<string, User>();
      allUsers.forEach(u => profileMap.set(u.id, u));

      const mappedEditors: BMNEditor[] = (data || []).map(row => {
        const user = profileMap.get(row.user_id);
        return {
          id: row.id,
          userId: row.user_id,
          namaSatker: row.nama_satker,
          createdAt: row.created_at,
          userName: user?.name || 'Staff',
          userEmail: user?.email || ''
        };
      });

      setEditors(mappedEditors);
    } catch (err) {
      console.error('Error fetching BMN editors:', err);
      showNotification('Gagal Memuat', 'Gagal memuat daftar editor BMN.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedSatker, allUsers, showNotification]);

  useEffect(() => {
    fetchEditors();
  }, [fetchEditors]);

  // Filter out users who are already editors for this Satker
  const nonEditorStaff = useMemo(() => {
    const editorUserIds = new Set(editors.map(e => e.userId));
    // Exclude Super Admin from editor assignment since they already have full access
    return allUsers.filter(u => u.role !== 'Super Admin' && !editorUserIds.has(u.id));
  }, [allUsers, editors]);

  const handleAddEditor = async () => {
    if (!selectedStaffId || !selectedSatker) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bmn_editors')
        .insert([{ user_id: selectedStaffId, nama_satker: selectedSatker }]);

      if (error) throw error;

      const staff = allUsers.find(u => u.id === selectedStaffId);
      showNotification(
        'Akses Diberikan',
        `${staff?.name || 'Pegawai'} sekarang dapat mengedit data BMN untuk ${selectedSatker}.`,
        'success'
      );

      setSelectedStaffId('');
      fetchEditors();
    } catch (err: any) {
      console.error('Error adding editor:', err);
      showNotification(
        'Gagal Menambahkan',
        err.code === '23505' ? 'Pegawai tersebut sudah menjadi editor untuk Satker ini.' : 'Terjadi kesalahan database.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveEditor = async (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin mencabut hak akses editor BMN untuk ${name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bmn_editors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showNotification(
        'Akses Dicabut',
        `Hak akses editor BMN untuk ${name} berhasil dicabut.`,
        'success'
      );
      
      fetchEditors();
    } catch (err) {
      console.error('Error removing editor:', err);
      showNotification('Gagal Mencabut', 'Terjadi kesalahan saat mencabut akses editor.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Satker Selection Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gov-50 text-gov-600 rounded-lg">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">Pengaturan Hak Akses Editor BMN</h3>
            <p className="text-xs text-slate-500 font-medium">
              Kelola penunjukan pegawai untuk masing-masing Satuan Kerja
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap uppercase tracking-wider">Satker:</span>
          <SearchableSelect
            options={availableSatkers.map(s => ({ value: s, label: s }))}
            value={selectedSatker}
            onChange={setSelectedSatker}
            placeholder="Pilih Satker..."
            className="w-56 text-slate-800 text-sm font-semibold shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Add Editor Panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between h-[190px]">
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tunjuk Editor BMN</h4>
            <p className="text-[10px] text-slate-400 leading-normal mb-4 font-medium">
              Pilih Staff atau pegawai untuk diberikan hak akses penuh untuk mengupload, menambah, mengedit, dan menghapus data BMN di Satker <strong className="text-slate-600 font-semibold">{selectedSatker}</strong>.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <SearchableSelect
              options={nonEditorStaff.map(s => ({ value: s.id, label: `${s.name} (${s.email.split('@')[0]})` }))}
              value={selectedStaffId}
              onChange={setSelectedStaffId}
              placeholder="Cari pegawai..."
              emptyOption="Pilih Pegawai..."
              className="flex-1"
            />
            <button
              onClick={handleAddEditor}
              className="px-3.5 py-2.5 bg-gov-600 hover:bg-gov-700 text-white rounded-lg text-xs font-bold transition-all shadow shadow-gov-100 flex items-center gap-1 disabled:opacity-50"
              disabled={!selectedStaffId || saving}
            >
              <UserCheck size={14} />
              <span>{saving ? 'Proses...' : 'Tunjuk'}</span>
            </button>
          </div>
        </div>

        {/* Editors Table List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden md:col-span-2 flex flex-col min-h-[250px]">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-1.5">
            <Users size={16} className="text-gov-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Daftar Editor BMN Satker: {selectedSatker}
            </h4>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[300px]">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Nama Pegawai</th>
                  <th className="px-4 py-2.5">Email</th>
                  <th className="px-4 py-2.5 text-center" style={{ width: '120px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-slate-400">
                      Memuat editor...
                    </td>
                  </tr>
                ) : editors.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-12 text-slate-400">
                      Belum ada editor ditunjuk untuk Satker ini. Semua Staff berstatus Read Only pada Satker ini.
                    </td>
                  </tr>
                ) : (
                  editors.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-slate-800">{e.userName}</td>
                      <td className="px-4 py-2.5 text-slate-500 font-normal">{e.userEmail}</td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => handleRemoveEditor(e.id, e.userName || 'Pegawai')}
                          className="text-rose-500 hover:text-rose-700 text-xs font-bold hover:underline"
                        >
                          Cabut Akses
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BMNEditorManager;
