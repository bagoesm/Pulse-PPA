import React, { useState } from 'react';
import { 
  CheckCircle2, AlertTriangle, ArrowRight, X, Sparkles, 
  Layers, RefreshCw, Calendar, Target, Check 
} from 'lucide-react';
import { Sprint, Task, Backlog } from '../../../types';

interface SprintCompletionModalProps {
  sprint: Sprint;
  tasks: Task[];
  plannedSprints: Sprint[];
  backlogSections: { id: string; title: string }[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (destination: { type: 'sprint' | 'backlog'; targetId: string } | null) => Promise<void>;
}

export const SprintCompletionModal: React.FC<SprintCompletionModalProps> = ({
  sprint,
  tasks,
  plannedSprints,
  backlogSections,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [carryoverType, setCarryoverType] = useState<'sprint' | 'backlog'>('backlog');
  const [selectedSprintId, setSelectedSprintId] = useState<string>(
    plannedSprints.length > 0 ? plannedSprints[0].id : ''
  );
  const [selectedBacklogId, setSelectedBacklogId] = useState<string>('default');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Calculate metrics
  const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
  const completedTasks = sprintTasks.filter(t => t.status === 'Done');
  const unfinishedTasks = sprintTasks.filter(t => t.status !== 'Done');

  const totalSp = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const completedSp = completedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const unfinishedSp = unfinishedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  
  const completionPercent = totalSp > 0 ? Math.round((completedSp / totalSp) * 100) : (
    sprintTasks.length > 0 ? Math.round((completedTasks.length / sprintTasks.length) * 100) : 100
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (unfinishedTasks.length === 0) {
        await onConfirm(null);
      } else {
        if (carryoverType === 'sprint') {
          await onConfirm({ type: 'sprint', targetId: selectedSprintId });
        } else {
          await onConfirm({ type: 'backlog', targetId: selectedBacklogId });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-zoomIn flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-50/70 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">Selesaikan Sprint</h3>
              <p className="text-xs text-slate-400 font-medium">{sprint.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Performance Summary Cards */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Ringkasan Performa</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                completionPercent >= 80 ? 'bg-emerald-100 text-emerald-800' :
                completionPercent >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {completionPercent}% Tercapai
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
                <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Selesai
                </div>
                <div className="text-xl font-extrabold text-slate-800 mt-1">
                  {completedTasks.length} <span className="text-xs font-normal text-slate-500">Tugas</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-400">
                  {completedSp} Story Points
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
                <div className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Belum Selesai
                </div>
                <div className="text-xl font-extrabold text-slate-800 mt-1">
                  {unfinishedTasks.length} <span className="text-xs font-normal text-slate-500">Tugas</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-400">
                  {unfinishedSp} Story Points
                </div>
              </div>
            </div>
          </div>

          {/* Incomplete Tasks Carryover Handling */}
          {unfinishedTasks.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <ArrowRight className="w-4 h-4 text-indigo-500" />
                Pindahkan {unfinishedTasks.length} tugas yang belum selesai ke:
              </div>

              <div className="space-y-2">
                {/* Option 1: Move to Planned Sprint */}
                <label className={`flex flex-col p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  carryoverType === 'sprint'
                    ? 'border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-500/10'
                    : 'border-slate-200 hover:bg-slate-50/50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="carryoverType"
                        value="sprint"
                        checked={carryoverType === 'sprint'}
                        onChange={() => setCarryoverType('sprint')}
                        disabled={plannedSprints.length === 0}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-bold text-slate-700">
                        Sprint Direncanakan (Planned Sprint)
                      </span>
                    </div>
                    {plannedSprints.length === 0 && (
                      <span className="text-[10px] text-slate-400 font-semibold">(Tidak ada sprint yang siap)</span>
                    )}
                  </div>

                  {carryoverType === 'sprint' && plannedSprints.length > 0 && (
                    <div className="mt-2.5 ml-6">
                      <select
                        value={selectedSprintId}
                        onChange={(e) => setSelectedSprintId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        {plannedSprints.map(ps => (
                          <option key={ps.id} value={ps.id}>
                            {ps.name} {ps.goal ? `— Goal: ${ps.goal}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </label>

                {/* Option 2: Move to Backlog */}
                <label className={`flex flex-col p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  carryoverType === 'backlog'
                    ? 'border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-500/10'
                    : 'border-slate-200 hover:bg-slate-50/50'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="carryoverType"
                      value="backlog"
                      checked={carryoverType === 'backlog'}
                      onChange={() => setCarryoverType('backlog')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      Kembalikan ke Backlog
                    </span>
                  </div>

                  {carryoverType === 'backlog' && (
                    <div className="mt-2.5 ml-6">
                      <select
                        value={selectedBacklogId}
                        onChange={(e) => setSelectedBacklogId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        {backlogSections.map(bs => (
                          <option key={bs.id} value={bs.id}>
                            {bs.title} {bs.id === 'default' ? '(Utama)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </label>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-800">
              <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-xs font-bold">
                Luar biasa! Semua tugas di sprint ini telah selesai dikerjakan 100%. Tidak ada tugas yang perlu dipindahkan.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-all text-xs cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (unfinishedTasks.length > 0 && carryoverType === 'sprint' && !selectedSprintId)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-sm text-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Selesaikan Sprint
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
