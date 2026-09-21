import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, Calendar, Clock, Plus, Trash2, Edit2, Copy, Check, 
  AlertTriangle, CheckCircle2, Target, Users, Search, 
  FileText, Sparkles, RefreshCw, MessageSquareQuote, ChevronDown, 
  ChevronUp, ArrowRight, UserCheck, ShieldAlert, ListTodo, UserPlus
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Sprint, SprintDailyNote, Task, User as UserType, Status } from '../../../types';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';

interface SprintDailyNotesModalProps {
  sprint: Sprint;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserType | null;
  tasks?: Task[];
  users?: UserType[];
}

export const SprintDailyNotesModal: React.FC<SprintDailyNotesModalProps> = ({
  sprint,
  isOpen,
  onClose,
  currentUser,
  tasks = [],
  users = []
}) => {
  const { showToast, showConfirm } = useUI();
  const { currentUser: authCurrentUser } = useAuth();
  const activeUser = currentUser || authCurrentUser;

  const [notes, setNotes] = useState<SprintDailyNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('All');

  // Today's date string
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [activeDateFilter, setActiveDateFilter] = useState<string>(todayStr);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: todayStr,
    memberName: '',
    recordedByName: activeUser?.name || '',
    yesterdayNotes: '',
    todayNotes: '',
    blockers: '',
    generalNotes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedDate, setCopiedDate] = useState<string | null>(null);

  // Tasks belonging to this sprint
  const sprintTasks = useMemo(() => {
    return tasks.filter(t => t.sprintId === sprint.id);
  }, [tasks, sprint.id]);

  // Extract all team members involved in this sprint (from tasks PICs & users list)
  const sprintMembers = useMemo(() => {
    const memberMap = new Map<string, { 
      name: string; 
      userId?: string; 
      taskCount: number; 
      tasks: Task[];
    }>();

    // 1. Scan tasks in this sprint for PICs
    sprintTasks.forEach(t => {
      (t.pic || []).forEach(p => {
        const rawPic = (p || '').trim();
        if (!rawPic) return;

        // Resolve user display name if rawPic is an ID
        const matchedUser = users.find(u => 
          u.id === rawPic || 
          u.name.toLowerCase() === rawPic.toLowerCase()
        );
        const displayName = matchedUser ? matchedUser.name : rawPic;
        const matchedUserId = matchedUser ? matchedUser.id : (rawPic.length > 20 ? rawPic : undefined);

        if (!memberMap.has(displayName)) {
          memberMap.set(displayName, {
            name: displayName,
            userId: matchedUserId,
            taskCount: 0,
            tasks: []
          });
        }
        const entry = memberMap.get(displayName)!;
        entry.taskCount += 1;
        entry.tasks.push(t);
      });
    });

    // 2. Ensure current user is in the list
    if (activeUser?.name && !memberMap.has(activeUser.name)) {
      memberMap.set(activeUser.name, {
        name: activeUser.name,
        userId: activeUser.id,
        taskCount: 0,
        tasks: []
      });
    }

    // 3. Add other users if list is small
    users.forEach(u => {
      if (u.name && !memberMap.has(u.name) && memberMap.size < 20) {
        memberMap.set(u.name, {
          name: u.name,
          userId: u.id,
          taskCount: 0,
          tasks: []
        });
      }
    });

    return Array.from(memberMap.values()).sort((a, b) => {
      // Members with tasks first, then alphabetical
      if (b.taskCount !== a.taskCount) return b.taskCount - a.taskCount;
      return a.name.localeCompare(b.name);
    });
  }, [sprintTasks, users, activeUser]);

  // Tasks assigned to currently selected member in form
  const selectedMemberTasks = useMemo(() => {
    if (!formData.memberName.trim()) return [];
    const targetName = formData.memberName.trim().toLowerCase();
    
    // Find matching user object
    const matchedUser = users.find(u => u.name.toLowerCase() === targetName || u.id === targetName);
    const targetId = matchedUser?.id?.toLowerCase();

    return sprintTasks.filter(t => {
      return (t.pic || []).some(p => {
        const pClean = (p || '').trim().toLowerCase();
        if (!pClean) return false;
        if (pClean === targetName) return true;
        if (targetId && pClean === targetId) return true;
        if (matchedUser && pClean === matchedUser.name.toLowerCase()) return true;
        return false;
      });
    });
  }, [sprintTasks, formData.memberName, users]);

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

      const mapped: SprintDailyNote[] = (data || []).map((row: any) => {
        // author_name stores the member name
        const memberName = row.author_name || undefined;
        return {
          id: row.id,
          sprintId: row.sprint_id,
          date: row.date,
          authorName: memberName,
          memberName: memberName,
          yesterdayNotes: row.yesterday_notes || undefined,
          todayNotes: row.today_notes || undefined,
          blockers: row.blockers || undefined,
          generalNotes: row.general_notes || undefined,
          attendees: row.attendees || undefined,
          createdBy: row.created_by || undefined,
          recordedByName: row.created_by || undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      });

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
      // Initialize form with default values
      setFormData(prev => ({
        ...prev,
        date: todayStr,
        memberName: prev.memberName || sprintMembers[0]?.name || activeUser?.name || '',
        recordedByName: activeUser?.name || ''
      }));
    }
  }, [isOpen, fetchDailyNotes, todayStr, activeUser?.name, sprintMembers]);

  // Set of member names who already have notes on the active date
  const recordedMembersOnDate = useMemo(() => {
    const notesOnDate = notes.filter(n => n.date === (formData.date || todayStr));
    const set = new Set<string>();
    notesOnDate.forEach(n => {
      const name = (n.memberName || n.authorName || '').trim().toLowerCase();
      if (name) set.add(name);
    });
    return set;
  }, [notes, formData.date, todayStr]);

  // Reset Form
  const resetForm = () => {
    setFormData({
      date: todayStr,
      memberName: sprintMembers[0]?.name || activeUser?.name || '',
      recordedByName: activeUser?.name || '',
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
      memberName: note.memberName || note.authorName || '',
      recordedByName: note.recordedByName || note.createdBy || activeUser?.name || '',
      yesterdayNotes: note.yesterdayNotes || '',
      todayNotes: note.todayNotes || '',
      blockers: note.blockers || '',
      generalNotes: note.generalNotes || ''
    });
    setIsFormOpen(true);
  };

  // Start creating a note for a specific member
  const handleStartNoteForMember = (memberName: string, targetDate: string = todayStr) => {
    setEditingNoteId(null);
    setFormData({
      date: targetDate,
      memberName: memberName,
      recordedByName: activeUser?.name || '',
      yesterdayNotes: '',
      todayNotes: '',
      blockers: '',
      generalNotes: ''
    });
    setIsFormOpen(true);
  };

  // Quick insert task into Yesterday
  const handleAppendToYesterday = (taskTitle: string) => {
    setFormData(prev => {
      const existing = prev.yesterdayNotes.trim();
      const line = `- ${taskTitle}`;
      return {
        ...prev,
        yesterdayNotes: existing ? `${existing}\n${line}` : line
      };
    });
    showToast(`Ditambahkan ke "Kemarin": ${taskTitle}`, 'info');
  };

  // Quick insert task into Today
  const handleAppendToToday = (taskTitle: string) => {
    setFormData(prev => {
      const existing = prev.todayNotes.trim();
      const line = `- ${taskTitle}`;
      return {
        ...prev,
        todayNotes: existing ? `${existing}\n${line}` : line
      };
    });
    showToast(`Ditambahkan ke "Hari Ini": ${taskTitle}`, 'info');
  };

  // Save / Update Note
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date) {
      showToast('Tanggal standup harus diisi.', 'error');
      return;
    }

    if (!formData.memberName.trim()) {
      showToast('Nama anggota yang dilaporkan harus dipilih/diisi.', 'error');
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
        author_name: formData.memberName.trim(),
        yesterday_notes: formData.yesterdayNotes.trim() || null,
        today_notes: formData.todayNotes.trim() || null,
        blockers: formData.blockers.trim() || null,
        general_notes: formData.generalNotes.trim() || null,
        attendees: formData.recordedByName.trim() ? `Dicatat oleh: ${formData.recordedByName.trim()}` : null,
        created_by: formData.recordedByName.trim() || activeUser?.name || null,
        updated_at: new Date().toISOString()
      };

      if (editingNoteId) {
        // Update
        const { error } = await supabase
          .from('sprint_daily_notes')
          .update(payload)
          .eq('id', editingNoteId);

        if (error) throw error;
        showToast(`Catatan daily untuk ${formData.memberName} berhasil diperbarui.`, 'success');
      } else {
        // Insert
        payload.created_at = new Date().toISOString();

        const { error } = await supabase
          .from('sprint_daily_notes')
          .insert([payload]);

        if (error) throw error;
        showToast(`Catatan daily untuk ${formData.memberName} berhasil disimpan.`, 'success');
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
    const member = note.memberName || note.authorName || 'Anggota';
    showConfirm(
      'Hapus Catatan Daily',
      `Apakah Anda yakin ingin menghapus catatan daily untuk ${member} pada tanggal ${formatDisplayDate(note.date)}?`,
      async () => {
        try {
          const { error } = await supabase
            .from('sprint_daily_notes')
            .delete()
            .eq('id', note.id);

          if (error) throw error;
          showToast(`Catatan daily ${member} berhasil dihapus.`, 'success');
          setNotes(prev => prev.filter(n => n.id !== note.id));
        } catch (err) {
          console.error('Error deleting sprint daily note:', err);
          showToast('Gagal menghapus catatan daily.', 'error');
        }
      }
    );
  };

  // Copy Single Note to Clipboard (WhatsApp / Slack formatted)
  const handleCopySingleNote = (note: SprintDailyNote) => {
    const formattedDate = formatDisplayDate(note.date);
    const member = note.memberName || note.authorName || 'Anggota Tim';
    const recorder = note.recordedByName || note.createdBy;

    let text = `📋 *DAILY STANDUP - ${sprint.name.toUpperCase()}*\n`;
    text += `📅 Tanggal: ${formattedDate}\n`;
    text += `👤 *Anggota: ${member}*`;
    if (recorder && recorder.toLowerCase() !== member.toLowerCase()) {
      text += ` _(Dicatat oleh: ${recorder})_`;
    }
    text += `\n\n`;

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
      text += `📝 *Catatan:* ${note.generalNotes}\n\n`;
    }

    text += `_Pulse-PPA Daily Standup_`;

    navigator.clipboard.writeText(text);
    setCopiedId(note.id);
    showToast(`Ringkasan standup ${member} disalin!`, 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Copy All Notes for a Specific Date (WhatsApp / Slack formatted)
  const handleCopyDateSummary = (dateStr: string, dateNotes: SprintDailyNote[]) => {
    const formattedDate = formatDisplayDate(dateStr);
    let text = `📋 *REKAP DAILY STANDUP - ${sprint.name.toUpperCase()}*\n`;
    text += `📅 Tanggal: ${formattedDate}\n`;
    text += `👥 Total: ${dateNotes.length} Anggota Tercatat\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    dateNotes.forEach((n, idx) => {
      const member = n.memberName || n.authorName || 'Anggota Tim';
      const recorder = n.recordedByName || n.createdBy;

      text += `👤 *${idx + 1}. ${member}*`;
      if (recorder && recorder.toLowerCase() !== member.toLowerCase()) {
        text += ` _(Pencatat: ${recorder})_`;
      }
      text += `\n`;

      if (n.yesterdayNotes) {
        text += `✅ *Kemarin:* \n${n.yesterdayNotes}\n`;
      }
      if (n.todayNotes) {
        text += `🎯 *Hari Ini:* \n${n.todayNotes}\n`;
      }
      if (n.blockers) {
        text += `⚠️ *Kendala:* ${n.blockers}\n`;
      } else {
        text += `⚠️ *Kendala:* Aman / Tidak ada\n`;
      }
      if (n.generalNotes) {
        text += `📝 *Catatan:* ${n.generalNotes}\n`;
      }
      text += `\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `_Pulse-PPA Agile Sprint Management_`;

    navigator.clipboard.writeText(text);
    setCopiedDate(dateStr);
    showToast(`Rekap Standup ${formattedDate} berhasil disalin!`, 'success');
    setTimeout(() => setCopiedDate(null), 2500);
  };

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    let result = notes;

    // Filter by member name if selected
    if (selectedMemberFilter !== 'All') {
      const target = selectedMemberFilter.toLowerCase();
      result = result.filter(n => {
        const mem = (n.memberName || n.authorName || '').toLowerCase();
        return mem === target;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => 
        n.date.toLowerCase().includes(q) ||
        (n.memberName && n.memberName.toLowerCase().includes(q)) ||
        (n.authorName && n.authorName.toLowerCase().includes(q)) ||
        (n.yesterdayNotes && n.yesterdayNotes.toLowerCase().includes(q)) ||
        (n.todayNotes && n.todayNotes.toLowerCase().includes(q)) ||
        (n.blockers && n.blockers.toLowerCase().includes(q)) ||
        (n.generalNotes && n.generalNotes.toLowerCase().includes(q))
      );
    }

    return result;
  }, [notes, selectedMemberFilter, searchQuery]);

  // Group filtered notes by Date (YYYY-MM-DD desc)
  const notesGroupedByDate = useMemo(() => {
    const groups = new Map<string, SprintDailyNote[]>();
    filteredNotes.forEach(note => {
      const d = note.date;
      if (!groups.has(d)) {
        groups.set(d, []);
      }
      groups.get(d)!.push(note);
    });
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredNotes]);

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

  // Get status color tag helper
  const getTaskStatusStyle = (status: Status | string) => {
    switch (status) {
      case Status.Done:
      case 'Done':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case Status.TestingVAPT:
      case 'Testing VA PT':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case Status.Review:
      case 'Review':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case Status.InProgress:
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-[9999] animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-zoomIn">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-gov-900 to-slate-900 text-white flex justify-between items-center relative overflow-hidden flex-shrink-0">
          <div className="absolute right-0 top-0 w-80 h-full bg-gov-500/10 transform skew-x-12 pointer-events-none" />
          
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2.5 bg-gov-600/30 border border-gov-400/30 rounded-2xl">
              <MessageSquareQuote className="w-5 h-5 text-gov-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg text-white">Daily Scrum Standup Tim</h3>
                <span className="bg-gov-500/30 border border-gov-400/30 text-gov-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {sprint.name}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Pencatatan per-anggota: 1 orang dapat menginputkan progres rekan tim yang memiliki tugas di sprint.
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

        {/* Member Status Bar for Today */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gov-600" />
                Daftar Anggota Sprint ({sprintMembers.length} Orang):
              </span>
              <span className="text-[11px] text-slate-500">
                Klik nama untuk langsung mencatat
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!isFormOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingNoteId(null);
                    setFormData({
                      date: todayStr,
                      memberName: sprintMembers[0]?.name || activeUser?.name || '',
                      recordedByName: activeUser?.name || '',
                      yesterdayNotes: '',
                      todayNotes: '',
                      blockers: '',
                      generalNotes: ''
                    });
                    setIsFormOpen(true);
                  }}
                  className="bg-gov-600 hover:bg-gov-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Catat Daily Anggota</span>
                </button>
              )}

              <button
                type="button"
                onClick={fetchDailyNotes}
                className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition-all cursor-pointer"
                title="Muat ulang data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Member Quick Chips Bar */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            {sprintMembers.map(m => {
              const isRecordedToday = recordedMembersOnDate.has(m.name.toLowerCase());
              return (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => handleStartNoteForMember(m.name, todayStr)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer flex-shrink-0 ${
                    isRecordedToday
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200/90 hover:bg-emerald-100'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-gov-400 hover:text-gov-700 hover:bg-gov-50/50'
                  }`}
                  title={isRecordedToday ? `${m.name} sudah dicatat hari ini` : `Klik untuk mencatat daily ${m.name}`}
                >
                  {isRecordedToday ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <Users className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  )}
                  <span>{m.name}</span>
                  {m.taskCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 rounded-full font-bold text-slate-600">
                      {m.taskCount} task
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area: Form & Grouped Notes */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Form Create / Edit Daily Standup */}
          {isFormOpen && (
            <div className="bg-white rounded-2xl border-2 border-gov-300/80 shadow-md p-5 animate-slideDown space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gov-50 text-gov-600 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    {editingNoteId ? 'Edit Catatan Standup Anggota' : 'Input Catatan Standup Anggota'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold px-2.5 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Tutup Form
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Meta Row: Target Member, Date, Recorder */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* 1. Target Member (Who is this update for?) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gov-800 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-gov-600" />
                        Anggota Tim (Target) *
                      </span>
                      {selectedMemberTasks.length > 0 && (
                        <span className="text-[10px] text-gov-600 font-semibold lowercase">
                          {selectedMemberTasks.length} task aktif
                        </span>
                      )}
                    </label>
                    <select
                      value={formData.memberName}
                      onChange={(e) => setFormData(prev => ({ ...prev, memberName: e.target.value }))}
                      className="w-full bg-gov-50/40 border border-gov-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500 transition-all cursor-pointer"
                      required
                    >
                      <option value="" disabled>-- Pilih Anggota Tim --</option>
                      {sprintMembers.map(m => (
                        <option key={m.name} value={m.name}>
                          {m.name} {m.taskCount > 0 ? `(${m.taskCount} task di sprint)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Standup Date */}
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

                  {/* 3. Recorder (Who inputs this update?) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-slate-400" />
                      Pencatat (Notulen / Anda)
                    </label>
                    <input
                      type="text"
                      placeholder="Nama Pencatat"
                      value={formData.recordedByName}
                      onChange={(e) => setFormData(prev => ({ ...prev, recordedByName: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500 transition-all"
                    />
                  </div>

                </div>

                {/* Member's Sprint Tasks Quick-Assistant */}
                {selectedMemberTasks.length > 0 && (
                  <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <ListTodo className="w-3.5 h-3.5 text-gov-600" />
                        Tugas {formData.memberName} di Sprint Ini ({selectedMemberTasks.length}):
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Klik tombol di bawah untuk memasukkan judul task secara instan
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                      {selectedMemberTasks.map(t => (
                        <div 
                          key={t.id}
                          className="bg-white border border-slate-200/80 rounded-lg p-2 flex items-center justify-between gap-2 shadow-2xs hover:border-gov-300 transition-all"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${getTaskStatusStyle(t.status)}`}>
                                {t.status}
                              </span>
                              {t.storyPoints !== null && t.storyPoints !== undefined && (
                                <span className="text-[9px] text-slate-400 font-semibold">{t.storyPoints} SP</span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-slate-800 truncate mt-0.5" title={t.title}>
                              {t.title}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleAppendToYesterday(t.title)}
                              className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-200 transition-all cursor-pointer"
                              title="Tambahkan ke kolom Kemarin"
                            >
                              + Kemarin
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAppendToToday(t.title)}
                              className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 transition-all cursor-pointer"
                              title="Tambahkan ke kolom Hari Ini"
                            >
                              + Hari Ini
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                      placeholder="- Menyelesaikan modul verifikasi dokumen&#10;- Merespons review klien"
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
                      placeholder="- Integrasi API daily standup&#10;- Testing skenario burndown chart"
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
                      placeholder="Kendala teknis, menunggu approval stakeholder, atau dependensi API..."
                      value={formData.blockers}
                      onChange={(e) => setFormData(prev => ({ ...prev, blockers: e.target.value }))}
                      className="w-full bg-amber-50/30 border border-amber-200/80 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                    />
                  </div>

                  {/* Additional notes */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-500" />
                      4. Catatan Tambahan (Opsional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Link referensi, catatan deployment, dll..."
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
                        <span>{editingNoteId ? 'Perbarui Catatan' : 'Simpan Catatan Anggota'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filter Bar: Member Selector & Search */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari catatan standup, nama anggota..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500 transition-all"
                />
              </div>

              {/* Member Filter Dropdown */}
              <select
                value={selectedMemberFilter}
                onChange={(e) => setSelectedMemberFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500 transition-all cursor-pointer"
              >
                <option value="All">Semua Anggota ({notes.length})</option>
                {sprintMembers.map(m => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {notes.length > 0 && (
              <span className="text-xs text-slate-500 self-center">
                Total <strong>{filteredNotes.length}</strong> catatan standup
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
              <h4 className="font-bold text-slate-800 text-sm mb-1">Belum Ada Catatan Standup</h4>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Catat daily standup untuk setiap anggota tim di sprint ini agar koordinasi progres dan kendala terpantau dengan jelas.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    date: todayStr,
                    memberName: sprintMembers[0]?.name || activeUser?.name || '',
                    recordedByName: activeUser?.name || '',
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
                <span>+ Catat Standup Pertama</span>
              </button>
            </div>
          )}

          {/* List of Daily Notes Grouped by Date */}
          {!isLoading && notesGroupedByDate.length > 0 && (
            <div className="space-y-6">
              {notesGroupedByDate.map(([dateStr, dateNotes]) => {
                const relativeLabel = getRelativeDayLabel(dateStr);
                const isDateCopied = copiedDate === dateStr;

                return (
                  <div key={dateStr} className="space-y-3">
                    
                    {/* Date Header Banner */}
                    <div className="bg-slate-100/90 border border-slate-200/90 px-4 py-2.5 rounded-2xl flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Calendar className="w-4 h-4 text-gov-600" />
                        <span className="font-bold text-sm text-slate-800">
                          {formatDisplayDate(dateStr)}
                        </span>

                        {relativeLabel && (
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            relativeLabel === 'Hari Ini' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {relativeLabel}
                          </span>
                        )}

                        <span className="text-xs text-slate-500 font-semibold bg-white px-2 py-0.5 rounded-md border border-slate-200/80">
                          {dateNotes.length} Anggota Tercatat
                        </span>
                      </div>

                      {/* Date Actions */}
                      <div className="flex items-center gap-2">
                        {/* Copy Entire Date Summary */}
                        <button
                          type="button"
                          onClick={() => handleCopyDateSummary(dateStr, dateNotes)}
                          className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          title="Salin rekap standup seluruh anggota pada tanggal ini ke WhatsApp/Slack"
                        >
                          {isDateCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Rekap Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Salin Rekap ({dateNotes.length})</span>
                            </>
                          )}
                        </button>

                        {/* Add note for another member on this date */}
                        <button
                          type="button"
                          onClick={() => {
                            // Find first member who has not been recorded on this date
                            const recordedNames = new Set(dateNotes.map(n => (n.memberName || n.authorName || '').toLowerCase()));
                            const nextUnrecorded = sprintMembers.find(m => !recordedNames.has(m.name.toLowerCase()));
                            handleStartNoteForMember(nextUnrecorded?.name || sprintMembers[0]?.name || '', dateStr);
                          }}
                          className="p-1.5 hover:bg-white text-gov-600 rounded-lg transition-all border border-slate-200 bg-white/70 cursor-pointer"
                          title="Tambah catatan anggota lain pada tanggal ini"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Member Cards for this Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {dateNotes.map(note => {
                        const member = note.memberName || note.authorName || 'Anggota Tim';
                        const recorder = note.recordedByName || note.createdBy;
                        const isCopied = copiedId === note.id;

                        // Check if this member has tasks in this sprint
                        const memberInfo = sprintMembers.find(m => m.name.toLowerCase() === member.toLowerCase());

                        return (
                          <div 
                            key={note.id}
                            className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                          >
                            {/* Card Top: Member Name, Recorder, Actions */}
                            <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-gov-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-2xs">
                                  {member.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <h5 className="font-bold text-xs text-slate-800 truncate" title={member}>
                                    {member}
                                  </h5>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                    {recorder && recorder.toLowerCase() !== member.toLowerCase() ? (
                                      <span>Diinput oleh: <strong className="text-slate-600">{recorder}</strong></span>
                                    ) : (
                                      <span>Diinput mandiri</span>
                                    )}
                                    {memberInfo && memberInfo.taskCount > 0 && (
                                      <>
                                        <span>•</span>
                                        <span className="text-gov-600 font-semibold">{memberInfo.taskCount} task</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Card Action Buttons */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleCopySingleNote(note)}
                                  className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-all cursor-pointer"
                                  title="Salin catatan anggota ini"
                                >
                                  {isCopied ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEdit(note)}
                                  className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-all cursor-pointer"
                                  title="Edit catatan ini"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(note)}
                                  className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-all cursor-pointer"
                                  title="Hapus catatan ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Card Content: Yesterday, Today, Blockers */}
                            <div className="p-4 space-y-3 flex-1">
                              {/* Yesterday */}
                              {note.yesterdayNotes && (
                                <div className="space-y-1 bg-emerald-50/40 border border-emerald-100/70 rounded-xl p-2.5">
                                  <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1 uppercase tracking-wider">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Kemarin
                                  </span>
                                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                    {note.yesterdayNotes}
                                  </p>
                                </div>
                              )}

                              {/* Today */}
                              {note.todayNotes && (
                                <div className="space-y-1 bg-blue-50/40 border border-blue-100/70 rounded-xl p-2.5">
                                  <span className="text-[10px] font-bold text-blue-800 flex items-center gap-1 uppercase tracking-wider">
                                    <Target className="w-3 h-3 text-blue-600" />
                                    Hari Ini
                                  </span>
                                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                    {note.todayNotes}
                                  </p>
                                </div>
                              )}

                              {/* Blockers */}
                              {note.blockers ? (
                                <div className="space-y-1 bg-amber-50/60 border border-amber-200 rounded-xl p-2.5">
                                  <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1 uppercase tracking-wider">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    Kendala & Blocker
                                  </span>
                                  <p className="text-xs text-amber-950 whitespace-pre-wrap leading-relaxed font-semibold">
                                    {note.blockers}
                                  </p>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span>Tidak ada kendala / blocker</span>
                                </div>
                              )}

                              {/* General Notes */}
                              {note.generalNotes && (
                                <div className="space-y-1 bg-slate-50 border border-slate-200/70 rounded-xl p-2.5">
                                  <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1 uppercase tracking-wider">
                                    <FileText className="w-3 h-3 text-slate-400" />
                                    Catatan Tambahan
                                  </span>
                                  <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                                    {note.generalNotes}
                                  </p>
                                </div>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {!isLoading && filteredNotes.length === 0 && notes.length > 0 && (
            <div className="text-center py-8 text-slate-400">
              <p className="text-xs font-semibold">Tidak ada catatan yang cocok dengan filter atau pencarian Anda.</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center flex-shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            💡 Tips: Anda dapat langsung menyalin rekap harian semua anggota untuk dibagikan ke grup WhatsApp/Slack.
          </div>
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
