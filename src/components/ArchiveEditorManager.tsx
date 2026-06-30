// src/components/ArchiveEditorManager.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { archiveEvaluationService } from '../services/ArchiveEvaluationService';
import { ArchiveEditor, User } from '../../types';
import { useUsers } from '../contexts/UsersContext';
import { supabase } from '../lib/supabaseClient';
import { 
  Users, 
  UserCheck, 
  AlertCircle, 
  Building2, 
  Plus, 
  Trash2,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import ConfirmModal from './ConfirmModal';

const ArchiveEditorManager: React.FC = () => {
  const { allUsers } = useUsers();
  
  // Divisions and editors state
  const [availableSatkers, setAvailableSatkers] = useState<string[]>([]);
  const [selectedSatker, setSelectedSatker] = useState<string>('');
  const [editors, setEditors] = useState<ArchiveEditor[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [saving, setSaving] = useState(false);
  
  // ConfirmModal states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string } | null>(null);
  
  // Notification states
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const triggerNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

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
        console.error('Error fetching satkers for archive manager:', err);
      }
    };
    fetchSatkers();
  }, []);

  // Fetch editors for selected Satker
  const fetchEditors = useCallback(async () => {
    if (!selectedSatker) return;
    setLoading(true);
    try {
      const data = await archiveEvaluationService.getEditors(selectedSatker);
      
      // Join profile info in-memory
      const profileMap = new Map<string, User>();
      allUsers.forEach(u => profileMap.set(u.id, u));

      const mappedEditors: ArchiveEditor[] = (data || []).map(row => {
        const user = profileMap.get(row.userId);
        return {
          id: row.id,
          userId: row.userId,
          divisiId: row.divisiId,
          createdAt: row.createdAt,
          userName: user?.name || 'Staff',
          userEmail: user?.email || '',
          namaDivisi: row.namaDivisi
        };
      });

      setEditors(mappedEditors);
    } catch (err) {
      console.error('Error fetching Archive editors:', err);
      triggerNotification('Gagal memuat daftar editor Kearsipan.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedSatker, allUsers]);

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
      await archiveEvaluationService.addEditor(selectedStaffId, selectedSatker);

      const staff = allUsers.find(u => u.id === selectedStaffId);
      triggerNotification(
        `${staff?.name || 'Pegawai'} sekarang dapat mengedit data Kearsipan untuk divisi ${selectedSatker}.`,
        'success'
      );

      setSelectedStaffId('');
      fetchEditors();
    } catch (err: any) {
      console.error('Error adding editor:', err);
      triggerNotification(
        err.code === '23505' ? 'Pegawai tersebut sudah menjadi editor untuk divisi ini.' : 'Terjadi kesalahan saat menambahkan editor.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const triggerRemoveEditor = (id: string, name: string) => {
    setConfirmTarget({ id, name });
    setIsConfirmOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!confirmTarget) return;
    const { id, name } = confirmTarget;
    try {
      await archiveEvaluationService.removeEditor(id);
      triggerNotification(`Hak akses editor Kearsipan untuk ${name} berhasil dicabut.`, 'success');
      fetchEditors();
    } catch (err) {
      console.error('Error removing editor:', err);
      triggerNotification('Terjadi kesalahan saat mencabut akses editor.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Satker Selection Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Building2 size={22} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">Pengaturan Hak Akses Editor Kearsipan</h3>
            <p className="text-xs text-slate-500 font-medium">
              Kelola penunjukan pegawai yang diberikan hak khusus untuk menginput dan memperbarui data kearsipan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-slate-550 whitespace-nowrap uppercase tracking-wider">Satker:</span>
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between min-h-[190px]">
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tunjuk Editor Kearsipan</h4>
            <p className="text-[11px] text-slate-450 leading-relaxed mb-4 font-medium">
              Pilih Staff/Pegawai untuk diberikan akses melakukan input, update, dan audit data kearsipan untuk divisi <strong className="text-slate-600 font-semibold">{selectedSatker}</strong>.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <SearchableSelect
                options={nonEditorStaff.map(s => ({ value: s.id, label: `${s.name} (${s.email.split('@')[0]})` }))}
                value={selectedStaffId}
                onChange={setSelectedStaffId}
                placeholder="Pilih nama pegawai..."
                className="w-full text-slate-800 text-xs font-medium"
              />
            </div>
            <button
              onClick={handleAddEditor}
              disabled={saving || !selectedStaffId}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 text-white rounded-xl shadow-sm hover:shadow transition-all active:scale-95 flex items-center justify-center flex-shrink-0"
              title="Tambah Editor"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            </button>
          </div>
        </div>

        {/* Editors List Panel */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2.5">
            <Users size={16} className="text-slate-500" />
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Daftar Editor Divisi {selectedSatker} ({editors.length})
            </h4>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[260px] space-y-2 pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                <Loader2 size={16} className="animate-spin text-indigo-600" />
                <span className="text-xs font-medium">Memuat editor...</span>
              </div>
            ) : editors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-center">
                <UserCheck size={24} className="text-slate-300 mb-1.5" />
                <p className="text-xs font-semibold">Belum ada editor ditunjuk</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Hanya Super Admin & Atasan yang memiliki akses saat ini.
                </p>
              </div>
            ) : (
              editors.map(editor => (
                <div 
                  key={editor.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="overflow-hidden pr-2">
                    <p className="text-xs font-bold text-slate-800 truncate">{editor.userName}</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{editor.userEmail}</p>
                  </div>
                  <button
                    onClick={() => triggerRemoveEditor(editor.id, editor.userName || '')}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Cabut Akses"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmRemove}
        title="Cabut Akses Editor"
        message={`Apakah Anda yakin ingin mencabut hak akses editor Kearsipan untuk ${confirmTarget?.name}?`}
        type="warning"
        confirmText="Cabut Akses"
        cancelText="Batal"
      />
    </div>
  );
};

export default ArchiveEditorManager;
