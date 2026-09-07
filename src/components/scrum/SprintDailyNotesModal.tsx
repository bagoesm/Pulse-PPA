import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, Calendar, Clock, Plus, Trash2, Edit2, Copy, Check, 
  AlertTriangle, CheckCircle2, Target, Users, Search, 
  FileText, Sparkles, RefreshCw, MessageSquareQuote, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Sprint, SprintDailyNote, User as UserType } from '../../../types';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';

interface SprintDailyNotesModalProps {
  sprint: Sprint;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserType | null;
}

export const SprintDailyNotesModal: React.FC<SprintDailyNotesModalProps> = ({
  sprint,
  isOpen,
  onClose,
  currentUser
}) => {
  const { showToast, showConfirm } = useUI();
  const { currentUser: authCurrentUser } = useAuth();
  const activeUser = currentUser || authCurrentUser;

  const [notes, setNotes] = useState<SprintDailyNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    authorName: '',
    attendees: '',
    yesterdayNotes: '',
    todayNotes: '',
    blockers: '',
    generalNotes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch daily notes from Supabase
  const fetchDailyNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sprint_daily_notes')
        .select('*')
        .eq('sprint_id', sprint.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: SprintDailyNote[] = (data || []).map((row: any) => ({
        id: row.id,
        sprintId: row.sprint_id,
        date: row.date,
        authorName: row.author_name || undefined,
        yesterdayNotes: row.yesterday_notes || undefined,
        todayNotes: row.today_notes || undefined,
        blockers: row.blockers || undefined,
        generalNotes: row.general_notes || undefined,
        attendees: row.attendees || undefined,
        createdBy: row.created_by || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      setNotes(mapped);
    } catch (err: any) {
      console.error('Error fetching sprint daily notes:', err);
      const msg = err?.message || 'Gagal memuat catatan daily sprint.';
      showToast(msg.includes('sprint_daily_notes') ? 'Tabel sprint_daily_notes belum ada di database Supabase Anda. Silakan jalankan migration 035.' : msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [sprint.id, showToast]);

  useEffect(() => {
    if (isOpen) {
      fetchDailyNotes();
      // Initialize form with active user name if empty
      setFormData(prev => ({
        ...prev,
        date: new Date().toISOString().split('T')[0],
        authorName: prev.authorName || activeUser?.name || ''
      }));
    }
  }, [isOpen, fetchDailyNotes, activeUser?.name]);

  // Check if today already has a note
  const todayStr = new Date().toISOString().split('T')[0];
  const hasNoteToday = useMemo(() => {
    return notes.some(n => n.date === todayStr);
  }, [notes, todayStr]);

  // Reset Form
  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      authorName: activeUser?.name || '',
      attendees: '',
      yesterdayNotes: '',
      todayNotes: '',
      blockers: '',
      generalNotes: ''
    });
    setEditingNoteId(null);
    setIsFormOpen(false);
  };

  // Open Edit Form
  const handleEdit = (note: SprintDailyNote) => {
    setEditingNoteId(note.id);
    setFormData({
      date: note.date,
      authorName: note.authorName || '',
      attendees: note.attendees || '',
      yesterdayNotes: note.yesterdayNotes || '',
      todayNotes: note.todayNotes || '',
      blockers: note.blockers || '',
      generalNotes: note.generalNotes || ''
    });
    setIsFormOpen(true);
  };

  // Save / Update Note
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date) {
      showToast('Tanggal catatan harus diisi.', 'error');
      return;
    }

    if (!formData.yesterdayNotes.trim() && !formData.todayNotes.trim() && !formData.blockers.trim() && !formData.generalNotes.trim()) {
      showToast('Harap isi minimal salah satu poin daily (Kemarin, Hari Ini, atau Kendala).', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        sprint_id: sprint.id,
        date: formData.date,
        author_name: formData.authorName.trim() || activeUser?.name || null,
        attendees: formData.attendees.trim() || null,
        yesterday_notes: formData.yesterdayNotes.trim() || null,
        today_notes: formData.todayNotes.trim() || null,
        blockers: formData.blockers.trim() || null,
        general_notes: formData.generalNotes.trim() || null,
        updated_at: new Date().toISOString()
      };

      if (editingNoteId) {
        // Update
        const { error } = await supabase
          .from('sprint_daily_notes')
          .update(payload)
          .eq('id', editingNoteId);

        if (error) throw error;
        showToast('Catatan daily berhasil diperbarui.', 'success');
      } else {
        // Insert
        payload.created_by = activeUser?.id ? String(activeUser.id) : null;
        payload.created_at = new Date().toISOString();

        const { error } = await supabase
          .from('sprint_daily_notes')
          .insert([payload]);

        if (error) throw error;
        showToast('Catatan daily berhasil ditambahkan.', 'success');
      }

      resetForm();
      fetchDailyNotes();
    } catch (err: any) {
      console.error('Error saving sprint daily note:', err);
      const msg = err?.message || 'Gagal menyimpan catatan daily.';
      showToast(msg.includes('sprint_daily_notes') ? 'Tabel sprint_daily_notes belum ada di database Supabase Anda. Jalankan migration 035 di Supabase SQL Editor.' : `Gagal menyimpan: ${msg}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Note
  const handleDelete = (note: SprintDailyNote) => {
    showConfirm(
      'Hapus Catatan Daily',
      `Apakah Anda yakin ingin menghapus catatan tanggal ${formatDisplayDate(note.date)}?`,
      async () => {
        try {
          const { error } = await supabase
            .from('sprint_daily_notes')
            .delete()
            .eq('id', note.id);

          if (error) throw error;
          showToast('Catatan daily berhasil dihapus.', 'success');
          setNotes(prev => prev.filter(n => n.id !== note.id));
        } catch (err) {
          console.error('Error deleting sprint daily note:', err);
          showToast('Gagal menghapus catatan daily.', 'error');
        }
      }
    );
  };

  // Copy Single Note to Clipboard (WhatsApp / Slack formatted)
  const handleCopyNote = (note: SprintDailyNote) => {
    const formattedDate = formatDisplayDate(note.date);
    let text = `📋 *DAILY STANDUP - ${sprint.name.toUpperCase()}*\n`;
    text += `📅 Tanggal: ${formattedDate}\n`;
    if (note.authorName) text += `👤 Dicatat oleh: ${note.authorName}\n`;
    if (note.attendees) text += `👥 Peserta: ${note.attendees}\n`;
    text += `\n`;

    if (note.yesterdayNotes) {
      text += `✅ *Kemarin (Yesterday):*\n${note.yesterdayNotes}\n\n`;
    }
    if (note.todayNotes) {
      text += `🎯 *Hari Ini (Today):*\n${note.todayNotes}\n\n`;
    }
    if (note.blockers) {
      text += `⚠️ *Kendala / Blocker:*\n${note.blockers}\n\n`;
    }
    if (note.generalNotes) {
      text += `📝 *Catatan Tambahan:*\n${note.generalNotes}\n\n`;
    }

    text += `_Pulse-PPA Agile Sprint Management_`;

    navigator.clipboard.writeText(text);
    setCopiedId(note.id);
    showToast('Ringkasan standup disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(n => 
      n.date.toLowerCase().includes(q) ||
      (n.authorName && n.authorName.toLowerCase().includes(q)) ||
      (n.attendees && n.attendees.toLowerCase().includes(q)) ||
      (n.yesterdayNotes && n.yesterdayNotes.toLowerCase().includes(q)) ||
      (n.todayNotes && n.todayNotes.toLowerCase().includes(q)) ||
      (n.blockers && n.blockers.toLowerCase().includes(q)) ||
      (n.generalNotes && n.generalNotes.toLowerCase().includes(q))
    );
  }, [notes, searchQuery]);

  // Date format helper
  function formatDisplayDate(dateStr: string) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  function getRelativeDayLabel(dateStr: string) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today) return 'Hari Ini';
    if (dateStr === yesterday) return 'Kemarin';
    return null;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-[9999] animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-zoomIn">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-gov-900 to-slate-900 text-white flex justify-between items-center relative overflow-hidden flex-shrink-0">
          <div className="absolute right-0 top-0 w-80 h-full bg-gov-500/10 transform skew-x-12 pointer-events-none" />
          
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2.5 bg-gov-600/30 border border-gov-400/30 rounded-2xl">
              <MessageSquareQuote className="w-5 h-5 text-gov-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Catatan Daily Sprint (Standup)</h3>
                <span className="bg-gov-500/30 border border-gov-400/30 text-gov-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {sprint.name}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                <span>Dokumentasi progres harian, rencana fokus, dan kendala tim selama sprint berjalan.</span>
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="relative z-10 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subheader info & Actions */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-3 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs">
            {hasNoteToday ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-lg font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Daily hari ini sudah dicatat
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-lg font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Belum ada catatan daily untuk hari ini
              </span>
            )}
            <span className="text-slate-400">|</span>
            <span className="text-slate-600 font-medium">
              Total <strong>{notes.length}</strong> catatan tercatat
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isFormOpen && (
              <button
                type="button"
                onClick={() => {
                  setEditingNoteId(null);
                  setFormData({
                    date: new Date().toISOString().split('T')[0],
                    authorName: activeUser?.name || '',
                    attendees: '',
                    yesterdayNotes: '',
                    todayNotes: '',
                    blockers: '',
                    generalNotes: ''
                  });
                  setIsFormOpen(true);
                }}
                className="bg-gov-600 hover:bg-gov-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Catat Daily Baru</span>
              </button>
            )}

            <button
              type="button"
              onClick={fetchDailyNotes}
              className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content Area: Form (collapsible) & Notes List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Form Create / Edit */}
          {isFormOpen && (
            <div className="bg-white rounded-2xl border-2 border-gov-200/80 shadow-md p-5 animate-slideDown">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gov-600" />
                  {editingNoteId ? 'Edit Catatan Daily Standup' : 'Tambah Catatan Daily Standup Baru'}
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
                >
                  Tutup Form
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Meta Inputs: Date, Author, Attendees */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Tanggal Standup *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      Pencatat / PIC
                    </label>
                    <input
                      type="text"
                      placeholder="Nama Pencatat"
                      value={formData.authorName}
                      onChange={(e) => setFormData(prev => ({ ...prev, authorName: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      Peserta Hadir (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Bagoes, Rizky, Siti, Dewi"
                      value={formData.attendees}
                      onChange={(e) => setFormData(prev => ({ ...prev, attendees: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500 transition-all"
                    />
                  </div>
                </div>

                {/* 3 Standup Pillars */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Yesterday */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      1. Apa yang dikerjakan kemarin? (Yesterday)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="- Selesaikan modul auth&#10;- Merespons review klien"
                      value={formData.yesterdayNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, yesterdayNotes: e.target.value }))}
                      className="w-full bg-emerald-50/30 border border-emerald-200/80 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  {/* Today */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-blue-600" />
                      2. Apa yang akan dikerjakan hari ini? (Today)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="- Integrasi API daily notes&#10;- Testing skenario burndown"
                      value={formData.todayNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, todayNotes: e.target.value }))}
                      className="w-full bg-blue-50/30 border border-blue-200/80 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Blockers & Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Blockers */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      3. Kendala & Hambatan? (Blockers)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Kendala teknis, menunggu approval stakeholder, atau ketergantungan API..."
                      value={formData.blockers}
                      onChange={(e) => setFormData(prev => ({ ...prev, blockers: e.target.value }))}
                      className="w-full bg-amber-50/30 border border-amber-200/80 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                    />
                  </div>

                  {/* Additional notes */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-500" />
                      4. Catatan Tambahan / Link / Action Items (Opsional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Link dokumen, catatan sepakat deploy jam 4 sore, dll..."
                      value={formData.generalNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, generalNotes: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500 transition-all"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{editingNoteId ? 'Perbarui Catatan' : 'Simpan Catatan Daily'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search bar & list controls */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari catatan standup, tanggal, atau PIC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500 transition-all"
              />
            </div>
            {notes.length > 0 && (
              <span className="text-xs text-slate-500 self-center">
                Menampilkan <strong>{filteredNotes.length}</strong> dari {notes.length} riwayat
              </span>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-gov-600" />
              <p className="text-xs font-semibold">Memuat catatan daily standup...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && notes.length === 0 && (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center max-w-md mx-auto my-6">
              <div className="w-12 h-12 bg-gov-50 border border-gov-200 rounded-2xl flex items-center justify-center mx-auto mb-3 text-gov-600">
                <MessageSquareQuote className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm mb-1">Belum Ada Catatan Daily</h4>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Catat daily standup harian tim untuk memastikan keselarasan progres, target hari ini, dan segera menuntaskan kendala tim.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    date: new Date().toISOString().split('T')[0],
                    authorName: activeUser?.name || '',
                    attendees: '',
                    yesterdayNotes: '',
                    todayNotes: '',
                    blockers: '',
                    generalNotes: ''
                  });
                  setIsFormOpen(true);
                }}
                className="bg-gov-600 hover:bg-gov-700 text-white font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Catatan Pertama</span>
              </button>
            </div>
          )}

          {/* List of Daily Notes */}
          {!isLoading && filteredNotes.length > 0 && (
            <div className="space-y-4">
              {filteredNotes.map((note) => {
                const relativeLabel = getRelativeDayLabel(note.date);
                const isCopied = copiedId === note.id;

                return (
                  <div 
                    key={note.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden"
                  >
                    {/* Note Item Header */}
                    <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="flex items-center gap-1.5 font-bold text-sm text-slate-800">
                          <Calendar className="w-4 h-4 text-gov-600" />
                          <span>{formatDisplayDate(note.date)}</span>
                        </div>

                        {relativeLabel && (
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            relativeLabel === 'Hari Ini' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {relativeLabel}
                          </span>
                        )}

                        {note.authorName && (
                          <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <span className="font-semibold text-slate-700">PIC:</span> {note.authorName}
                          </span>
                        )}

                        {note.attendees && (
                          <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1" title={note.attendees}>
                            <Users className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[180px]">{note.attendees}</span>
                          </span>
                        )}
                      </div>

                      {/* Item Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyNote(note)}
                          className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          title="Salin ringkasan ke format WhatsApp/Slack"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEdit(note)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg transition-all border border-slate-200 bg-white cursor-pointer"
                          title="Edit Catatan Ini"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(note)}
                          className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-all border border-slate-200 bg-white cursor-pointer"
                          title="Hapus Catatan Ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Note Item Content Grid */}
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Kemarin */}
                      {note.yesterdayNotes ? (
                        <div className="space-y-1 bg-emerald-50/40 border border-emerald-100/80 rounded-xl p-3.5">
                          <h5 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Dikerjakan Kemarin
                          </h5>
                          <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {note.yesterdayNotes}
                          </p>
                        </div>
                      ) : null}

                      {/* Hari Ini */}
                      {note.todayNotes ? (
                        <div className="space-y-1 bg-blue-50/40 border border-blue-100/80 rounded-xl p-3.5">
                          <h5 className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5 text-blue-600" />
                            Rencana Hari Ini
                          </h5>
                          <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {note.todayNotes}
                          </p>
                        </div>
                      ) : null}

                      {/* Blockers */}
                      {note.blockers ? (
                        <div className="space-y-1 bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 md:col-span-2">
                          <h5 className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Kendala & Blocker
                          </h5>
                          <p className="text-xs text-amber-900 whitespace-pre-wrap leading-relaxed font-medium">
                            {note.blockers}
                          </p>
                        </div>
                      ) : null}

                      {/* General Notes */}
                      {note.generalNotes ? (
                        <div className="space-y-1 bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 md:col-span-2">
                          <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            Catatan Tambahan
                          </h5>
                          <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                            {note.generalNotes}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isLoading && filteredNotes.length === 0 && notes.length > 0 && (
            <div className="text-center py-8 text-slate-400">
              <p className="text-xs font-semibold">Tidak ada catatan yang cocok dengan pencarian "{searchQuery}".</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end items-center flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
