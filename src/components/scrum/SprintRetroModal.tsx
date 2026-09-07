import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, ThumbsUp, AlertTriangle, Lightbulb, Plus, Trash2, 
  Copy, Check, MessageSquare, Sparkles, RefreshCw, Calendar, Target, User
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Sprint, SprintRetroItem, SprintRetroCategory, User as UserType } from '../../../types';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';

interface SprintRetroModalProps {
  sprint: Sprint;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserType | null;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
};

export const SprintRetroModal: React.FC<SprintRetroModalProps> = ({
  sprint,
  isOpen,
  onClose,
  currentUser
}) => {
  const { showToast } = useUI();
  const { currentUser: authCurrentUser } = useAuth();
  const activeUser = currentUser || authCurrentUser;

  const [items, setItems] = useState<SprintRetroItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New item draft inputs per category
  const [draftInputs, setDraftInputs] = useState<Record<SprintRetroCategory, string>>({
    went_well: '',
    challenges: '',
    improvements: ''
  });
  const [isSubmitting, setIsSubmitting] = useState<Record<SprintRetroCategory, boolean>>({
    went_well: false,
    challenges: false,
    improvements: false
  });
  const [isCopied, setIsCopied] = useState(false);

  // Fetch retro items from Supabase
  const fetchRetroItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sprint_retrospectives')
        .select('*')
        .eq('sprint_id', sprint.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mapped: SprintRetroItem[] = (data || []).map((row: any) => ({
        id: row.id,
        sprintId: row.sprint_id,
        category: row.category as SprintRetroCategory,
        content: row.content,
        authorName: row.author_name,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      setItems(mapped);
    } catch (err) {
      console.error('Error fetching sprint retrospectives:', err);
      showToast('Gagal memuat catatan retrospektif.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [sprint.id, showToast]);

  useEffect(() => {
    if (isOpen) {
      fetchRetroItems();
    }
  }, [isOpen, fetchRetroItems]);

  if (!isOpen) return null;

  // Add new retro item
  const handleAddItem = async (category: SprintRetroCategory) => {
    const text = draftInputs[category].trim();
    if (!text) return;

    setIsSubmitting(prev => ({ ...prev, [category]: true }));
    const author = activeUser?.name || 'Anggota Tim';

    try {
      const { data, error } = await supabase
        .from('sprint_retrospectives')
        .insert({
          sprint_id: sprint.id,
          category,
          content: text,
          author_name: author,
          created_by: activeUser?.id || null
        })
        .select()
        .single();

      if (error) throw error;

      const newItem: SprintRetroItem = {
        id: data.id,
        sprintId: data.sprint_id,
        category: data.category as SprintRetroCategory,
        content: data.content,
        authorName: data.author_name,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      setItems(prev => [...prev, newItem]);
      setDraftInputs(prev => ({ ...prev, [category]: '' }));
      showToast('Catatan evaluasi ditambahkan.', 'success');
    } catch (err) {
      console.error('Error adding retro item:', err);
      showToast('Gagal menambahkan catatan evaluasi.', 'error');
    } finally {
      setIsSubmitting(prev => ({ ...prev, [category]: false }));
    }
  };

  // Delete retro item
  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('sprint_retrospectives')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev => prev.filter(i => i.id !== itemId));
      showToast('Catatan dihapus.', 'info');
    } catch (err) {
      console.error('Error deleting retro item:', err);
      showToast('Gagal menghapus catatan.', 'error');
    }
  };

  // Copy plain text summary of retrospective to clipboard
  const handleCopySummary = () => {
    const wentWellItems = items.filter(i => i.category === 'went_well');
    const challengeItems = items.filter(i => i.category === 'challenges');
    const improvementItems = items.filter(i => i.category === 'improvements');

    const lines: string[] = [
      `📋 NOTULA SPRINT RETROSPECTIVE`,
      `Sprint: ${sprint.name}`,
      `Periode: ${formatDate(sprint.startDate)} s/d ${formatDate(sprint.endDate)}`,
      sprint.goal ? `Sprint Goal: ${sprint.goal}` : '',
      `Tanggal Rapat: ${new Date().toLocaleDateString('id-ID')}`,
      '',
      `🟢 1. CAPAIAN BAIK (WHAT WENT WELL):`,
      wentWellItems.length > 0
        ? wentWellItems.map((it, idx) => `   ${idx + 1}. ${it.content} (${it.authorName || 'Anonim'})`).join('\n')
        : '   (Tidak ada catatan)',
      '',
      `🔴 2. KENDALA & HAMBATAN (CHALLENGES):`,
      challengeItems.length > 0
        ? challengeItems.map((it, idx) => `   ${idx + 1}. ${it.content} (${it.authorName || 'Anonim'})`).join('\n')
        : '   (Tidak ada catatan)',
      '',
      `💡 3. CATATAN & RENCANA PERBAIKAN (IMPROVEMENTS):`,
      improvementItems.length > 0
        ? improvementItems.map((it, idx) => `   ${idx + 1}. ${it.content} (${it.authorName || 'Anonim'})`).join('\n')
        : '   (Tidak ada catatan)',
      ''
    ];

    navigator.clipboard.writeText(lines.filter(l => l !== undefined).join('\n'));
    setIsCopied(true);
    showToast('Ringkasan notula disalin ke clipboard!', 'success');
    setTimeout(() => setIsCopied(false), 2500);
  };

  const columns: {
    key: SprintRetroCategory;
    title: string;
    description: string;
    icon: React.ReactNode;
    headerBg: string;
    cardBg: string;
    borderColor: string;
    badgeColor: string;
    placeholder: string;
  }[] = [
    {
      key: 'went_well',
      title: 'Capaian Baik',
      description: 'Hal positif, kerja sama solid, atau target yang tercapai lebih cepat.',
      icon: <ThumbsUp className="w-4 h-4 text-emerald-600" />,
      headerBg: 'bg-emerald-50/80 border-emerald-200/70',
      cardBg: 'bg-emerald-50/30 border-emerald-200/80',
      borderColor: 'border-emerald-300',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      placeholder: 'Tulis hal yang berjalan baik di sprint ini...'
    },
    {
      key: 'challenges',
      title: 'Kendala & Hambatan',
      description: 'Hambatan komunikasi, keterlambatan approval/disposisi, atau teknis.',
      icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
      headerBg: 'bg-rose-50/80 border-rose-200/70',
      cardBg: 'bg-rose-50/30 border-rose-200/80',
      borderColor: 'border-rose-300',
      badgeColor: 'bg-rose-100 text-rose-800',
      placeholder: 'Tulis kendala yang dihadapi tim...'
    },
    {
      key: 'improvements',
      title: 'Catatan Evaluasi & Ide',
      description: 'Kesimpulan evaluasi, saran, dan ide perbaikan untuk sprint berikutnya.',
      icon: <Lightbulb className="w-4 h-4 text-amber-600" />,
      headerBg: 'bg-amber-50/80 border-amber-200/70',
      cardBg: 'bg-amber-50/30 border-amber-200/80',
      borderColor: 'border-amber-300',
      badgeColor: 'bg-amber-100 text-amber-800',
      placeholder: 'Tulis catatan evaluasi atau ide perbaikan...'
    }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-[9999] animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden border border-slate-100 animate-zoomIn flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-800">Sprint Retrospective</h3>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                  {sprint.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">{sprint.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs transition-all cursor-pointer"
              title="Salin ringkasan notula evaluasi ke clipboard"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{isCopied ? 'Tersalin!' : 'Salin Notula'}</span>
            </button>

            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-header Sprint Metadata */}
        {(sprint.goal || sprint.startDate || sprint.endDate) && (
          <div className="px-6 py-2.5 bg-slate-100/40 border-b border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500">
            {sprint.goal && (
              <div className="flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-semibold text-slate-700">Goal:</span>
                <span>{sprint.goal}</span>
              </div>
            )}
            {(sprint.startDate || sprint.endDate) && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-semibold text-slate-700">Periode:</span>
                <span>{formatDate(sprint.startDate)} s/d {formatDate(sprint.endDate)}</span>
              </div>
            )}
          </div>
        )}

        {/* 3-Column Retrospective Board */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/40">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mb-2" />
              <p className="text-xs">Memuat catatan retrospektif...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 h-full items-start">
              {columns.map(col => {
                const columnItems = items.filter(i => i.category === col.key);
                const draftText = draftInputs[col.key];
                const isSubmittingThis = isSubmitting[col.key];

                return (
                  <div 
                    key={col.key}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col overflow-hidden max-h-[68vh]"
                  >
                    {/* Column Header */}
                    <div className={`p-3.5 border-b ${col.headerBg} flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        {col.icon}
                        <h4 className="text-xs font-bold text-slate-800">{col.title}</h4>
                      </div>
                      <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${col.badgeColor}`}>
                        {columnItems.length}
                      </span>
                    </div>

                    <div className="px-3.5 pt-2 pb-1 text-[11px] text-slate-400 font-medium">
                      {col.description}
                    </div>

                    {/* Quick Add Input Card */}
                    <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                      <textarea
                        rows={2}
                        value={draftText}
                        onChange={(e) => setDraftInputs(prev => ({ ...prev, [col.key]: e.target.value }))}
                        placeholder={col.placeholder}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            handleAddItem(col.key);
                          }
                        }}
                      />
                      <div className="flex justify-between items-center mt-1.5">
                        <span className="text-[10px] text-slate-400">Ctrl+Enter untuk simpan</span>
                        <button
                          type="button"
                          disabled={!draftText.trim() || isSubmittingThis}
                          onClick={() => handleAddItem(col.key)}
                          className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-1 rounded-lg text-xs transition-all shadow-3xs disabled:opacity-40 cursor-pointer"
                        >
                          {isSubmittingThis ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                          <span>Tambah</span>
                        </button>
                      </div>
                    </div>

                    {/* Column Items List (Sticky Notes) */}
                    <div className="p-3 overflow-y-auto space-y-2.5 flex-1 min-h-[160px] max-h-[42vh]">
                      {columnItems.length === 0 ? (
                        <div className="py-8 text-center text-slate-300 text-xs border border-dashed border-slate-200 rounded-xl">
                          Belum ada catatan
                        </div>
                      ) : (
                        columnItems.map(item => (
                          <div 
                            key={item.id}
                            className={`p-3 rounded-xl border ${col.cardBg} transition-all hover:shadow-2xs group flex flex-col justify-between`}
                          >
                            <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                              {item.content}
                            </p>
                            
                            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/50 text-[10px] text-slate-400">
                              <span className="font-semibold text-slate-600 flex items-center gap-1 truncate">
                                <User className="w-3 h-3 text-slate-400" />
                                {item.authorName || 'Anonim'}
                              </span>
                              
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID') : ''}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-slate-300 hover:text-rose-600 p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                  title="Hapus catatan"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
          <span>Catatan tersimpan otomatis sebagai arsip evaluasi sprint ini.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer text-xs"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
