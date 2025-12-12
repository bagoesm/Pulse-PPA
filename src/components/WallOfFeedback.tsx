import React, { useState } from 'react';
import { Feedback, FeedbackCategory, FeedbackStatus, User } from '../../types';
import { 
    MessageSquarePlus, ChevronUp, ChevronDown, Search, Plus, Filter, Send, X, 
    MessageCircle, Trash2, Edit, Lock, CheckCircle2, Clock, MapPin, Save
} from 'lucide-react';

interface WallOfFeedbackProps {
  feedbacks: Feedback[];
  currentUser: User;
  onAddFeedback: (title: string, description: string, category: FeedbackCategory) => void;
  onVote: (feedbackId: string, type: 'up' | 'down') => void;
  onDeleteFeedback: (id: string) => void;
  onUpdateStatus: (id: string, status: FeedbackStatus, response?: string) => void;
}

const CATEGORIES: FeedbackCategory[] = ['Fitur Baru', 'Bug', 'Peningkatan', 'Lainnya'];

const WallOfFeedback: React.FC<WallOfFeedbackProps> = ({ 
    feedbacks, currentUser, onAddFeedback, onVote, onDeleteFeedback, onUpdateStatus 
}) => {
  const [activeTab, setActiveTab] = useState<'Voting' | 'Roadmap'>('Voting');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | 'All'>('All');
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Form State
  const [newFeedback, setNewFeedback] = useState<{title: string, description: string, category: FeedbackCategory}>({
      title: '', description: '', category: 'Fitur Baru'
  });
  
  const [editingFeedback, setEditingFeedback] = useState<{id: string, status: FeedbackStatus, response: string} | null>(null);

  const canModerate = currentUser.role === 'Super Admin' || currentUser.role === 'Atasan';

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(newFeedback.title && newFeedback.description) {
          onAddFeedback(newFeedback.title, newFeedback.description, newFeedback.category);
          setNewFeedback({ title: '', description: '', category: 'Fitur Baru' });
          setIsAddModalOpen(false);
      }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingFeedback) {
          onUpdateStatus(editingFeedback.id, editingFeedback.status, editingFeedback.response);
          setIsEditModalOpen(false);
          setEditingFeedback(null);
      }
  };

  const openEditModal = (fb: Feedback) => {
      setEditingFeedback({
          id: fb.id,
          status: fb.status,
          response: fb.adminResponse || ''
      });
      setIsEditModalOpen(true);
  };

  const getCategoryColor = (cat: FeedbackCategory) => {
      switch(cat) {
          case 'Fitur Baru': return 'bg-purple-100 text-purple-700';
          case 'Bug': return 'bg-red-100 text-red-700';
          case 'Peningkatan': return 'bg-blue-100 text-blue-700';
          default: return 'bg-slate-100 text-slate-700';
      }
  };

  const getStatusBadge = (status: FeedbackStatus) => {
      switch(status) {
          case 'Planned': return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase"><MapPin size={10} /> Planned</span>;
          case 'In Progress': return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold uppercase"><Clock size={10} /> In Progress</span>;
          case 'Done': return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase"><CheckCircle2 size={10} /> Deployed</span>;
          default: return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">Open Voting</span>;
      }
  };

  const filteredFeedbacks = feedbacks.filter(f => {
      const matchSearch = f.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          f.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = categoryFilter === 'All' || f.category === categoryFilter;
      
      // Tab Logic
      const isRoadmapItem = f.status !== 'Open';
      const matchTab = activeTab === 'Roadmap' ? isRoadmapItem : !isRoadmapItem;

      return matchSearch && matchCategory && matchTab;
  });

  // Sort: Voting tab by popularity, Roadmap tab by Status then Date
  const sortedFeedbacks = [...filteredFeedbacks].sort((a, b) => {
      if (activeTab === 'Voting') {
        return (b.upvotes.length - b.downvotes.length) - (a.upvotes.length - a.downvotes.length);
      } else {
         // Roadmap sort: In Progress -> Planned -> Done
         const statusOrder = { 'In Progress': 0, 'Planned': 1, 'Done': 2, 'Open': 3 };
         return statusOrder[a.status] - statusOrder[b.status];
      }
  });

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50 flex flex-col">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    <MessageSquarePlus className="text-gov-600" />
                    Wall of Feedback
                </h2>
                <p className="text-sm text-slate-500 mt-1">Sampaikan ide, kritik, dan saran untuk kemajuan sistem kerja kita.</p>
            </div>
            
            <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-gov-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg shadow-gov-200 hover:bg-gov-700 hover:shadow-xl transition-all flex items-center gap-2"
            >
                <Plus size={18} /> Buat Feedback
            </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 w-fit mb-6 shadow-sm">
             <button 
                onClick={() => setActiveTab('Voting')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'Voting' ? 'bg-gov-50 text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <MessageCircle size={16} /> Saran & Ide (Voting)
             </button>
             <button 
                onClick={() => setActiveTab('Roadmap')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'Roadmap' ? 'bg-gov-50 text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <MapPin size={16} /> Roadmap Pengembangan
             </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center">
             <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Cari feedback..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 transition-all"
                />
            </div>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                <button 
                    onClick={() => setCategoryFilter('All')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${categoryFilter === 'All' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    Semua
                </button>
                {CATEGORIES.map(cat => (
                    <button 
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${categoryFilter === cat ? 'bg-gov-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
            {sortedFeedbacks.length > 0 ? (
                sortedFeedbacks.map(fb => {
                    const voteCount = fb.upvotes.length - fb.downvotes.length;
                    const isUpvoted = fb.upvotes.includes(currentUser.id);
                    const isDownvoted = fb.downvotes.includes(currentUser.id);
                    const isLocked = fb.status !== 'Open';

                    return (
                        <div key={fb.id} className={`bg-white p-6 rounded-xl shadow-sm border flex gap-5 transition-all relative group ${isLocked ? 'border-slate-200 bg-slate-50/50' : 'border-slate-200 hover:border-gov-300'}`}>
                            
                            {/* Vote Column */}
                            <div className="flex flex-col items-center gap-1">
                                {isLocked ? (
                                    <div className="flex flex-col items-center text-slate-400 gap-1 mt-2">
                                        <Lock size={18} />
                                        <span className="text-sm font-bold">{voteCount}</span>
                                    </div>
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => onVote(fb.id, 'up')}
                                            className={`p-1 rounded hover:bg-slate-100 transition-colors ${isUpvoted ? 'text-green-600' : 'text-slate-400'}`}
                                        >
                                            <ChevronUp size={28} strokeWidth={isUpvoted ? 3 : 2} />
                                        </button>
                                        <span className={`text-lg font-bold ${voteCount > 0 ? 'text-green-600' : voteCount < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                            {voteCount}
                                        </span>
                                        <button 
                                            onClick={() => onVote(fb.id, 'down')}
                                            className={`p-1 rounded hover:bg-slate-100 transition-colors ${isDownvoted ? 'text-red-600' : 'text-slate-400'}`}
                                        >
                                            <ChevronDown size={28} strokeWidth={isDownvoted ? 3 : 2} />
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex gap-2 items-center">
                                        {getStatusBadge(fb.status)}
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getCategoryColor(fb.category)}`}>
                                            {fb.category}
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-400 shrink-0">{fb.createdAt}</span>
                                </div>
                                
                                <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight">{fb.title}</h3>
                                <p className="text-sm text-slate-600 mb-4 leading-relaxed">{fb.description}</p>
                                
                                {/* Admin Response Box */}
                                {fb.adminResponse && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
                                        <p className="text-xs font-bold text-blue-700 mb-1 flex items-center gap-1">
                                            <MessageCircle size={12} /> Tanggapan Admin:
                                        </p>
                                        <p className="text-xs text-blue-900 leading-relaxed">
                                            "{fb.adminResponse}"
                                        </p>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                        {fb.createdBy.charAt(0)}
                                    </div>
                                    <span className="text-xs font-semibold text-slate-500">
                                        {fb.createdBy}
                                    </span>
                                </div>
                            </div>

                            {/* Admin Controls */}
                            {canModerate && (
                                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => openEditModal(fb)}
                                        className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-gov-600 hover:border-gov-300 rounded-lg shadow-sm"
                                        title="Ubah Status / Respon"
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button 
                                        onClick={() => { if(window.confirm('Hapus feedback ini?')) onDeleteFeedback(fb.id); }}
                                        className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300 rounded-lg shadow-sm"
                                        title="Hapus Feedback"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                })
            ) : (
                <div className="col-span-1 lg:col-span-2 flex flex-col items-center justify-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                    <MessageSquarePlus size={48} className="mb-4 opacity-50" />
                    <p>Belum ada feedback di kategori ini.</p>
                </div>
            )}
        </div>

        {/* Create Modal */}
        {isAddModalOpen && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-800">Buat Feedback Baru</h3>
                        <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Judul Feedback</label>
                            <input 
                                type="text"
                                required 
                                value={newFeedback.title}
                                onChange={e => setNewFeedback({...newFeedback, title: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                                placeholder="Contoh: Fitur Export PDF..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Kategori</label>
                            <select 
                                value={newFeedback.category}
                                onChange={e => setNewFeedback({...newFeedback, category: e.target.value as FeedbackCategory})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm bg-white"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Deskripsi</label>
                            <textarea 
                                required
                                rows={4}
                                value={newFeedback.description}
                                onChange={e => setNewFeedback({...newFeedback, description: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm resize-none"
                                placeholder="Jelaskan detail feedback anda..."
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                             <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium text-sm hover:bg-slate-100 rounded-lg">Batal</button>
                             <button type="submit" className="px-4 py-2 bg-gov-600 text-white font-bold text-sm rounded-lg hover:bg-gov-700 flex items-center gap-2">
                                <Send size={16} /> Posting Feedback
                             </button>
                        </div>
                    </form>
                </div>
             </div>
        )}

        {/* Admin Edit Modal */}
        {isEditModalOpen && editingFeedback && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-800">Kelola Feedback (Admin)</h3>
                        <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                        <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg mb-4">
                            Mengubah status menjadi "Planned", "In Progress", atau "Done" akan mengunci fitur voting untuk user.
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Status Feedback</label>
                            <select 
                                value={editingFeedback.status}
                                onChange={e => setEditingFeedback({...editingFeedback, status: e.target.value as FeedbackStatus})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm bg-white"
                            >
                                <option value="Open">Open (Voting Aktif)</option>
                                <option value="Planned">Planned (Direncanakan)</option>
                                <option value="In Progress">In Progress (Sedang Dikerjakan)</option>
                                <option value="Done">Done (Selesai/Deployed)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tanggapan Admin / Detail</label>
                            <textarea 
                                rows={3}
                                value={editingFeedback.response}
                                onChange={e => setEditingFeedback({...editingFeedback, response: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm resize-none"
                                placeholder="Contoh: Fitur ini akan dikerjakan pada Q4 2023..."
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                             <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium text-sm hover:bg-slate-100 rounded-lg">Batal</button>
                             <button type="submit" className="px-4 py-2 bg-gov-600 text-white font-bold text-sm rounded-lg hover:bg-gov-700 flex items-center gap-2">
                                <Save size={16} /> Simpan Perubahan
                             </button>
                        </div>
                    </form>
                </div>
             </div>
        )}
    </div>
  );
};

export default WallOfFeedback;