import React from 'react';
import { Clock, ChevronRight, X, Calendar, AlertTriangle, PlayCircle, ClipboardList, HelpCircle } from 'lucide-react';
import { Task, Status } from '../../types';

interface OverdueTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onViewTask: (task: Task) => void;
  onViewAllTasks: () => void;
  onSnooze: () => void;
}

const OverdueTasksModal: React.FC<OverdueTasksModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onViewTask,
  onViewAllTasks,
  onSnooze
}) => {
  if (!isOpen || tasks.length === 0) return null;

  // Function to calculate how many days a task is overdue
  const getDaysOverdue = (deadlineStr: string | undefined) => {
    if (!deadlineStr) return 0;
    try {
      const deadline = new Date(deadlineStr);
      deadline.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - deadline.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch (e) {
      return 0;
    }
  };

  // Format date to local Indonesian format
  const formatDateIndo = (dateStr: string | undefined) => {
    if (!dateStr) return 'Tidak ada deadline';
    try {
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
      return new Date(dateStr).toLocaleDateString('id-ID', options);
    } catch (e) {
      return dateStr;
    }
  };

  // Group tasks
  const todayStr = new Date().getFullYear() + '-' + 
      String(new Date().getMonth() + 1).padStart(2, '0') + '-' + 
      String(new Date().getDate()).padStart(2, '0');

  const overdueTasks = tasks.filter(task => {
    const daysOverdue = getDaysOverdue(task.deadline);
    return daysOverdue > 0;
  });

  const inProgressTasks = tasks.filter(task => {
    const daysOverdue = getDaysOverdue(task.deadline);
    return daysOverdue === 0 && (
      task.status === Status.InProgress || 
      task.status === Status.Pending || 
      task.status === Status.Review
    );
  });

  const toDoTasks = tasks.filter(task => {
    const daysOverdue = getDaysOverdue(task.deadline);
    return daysOverdue === 0 && task.status === Status.ToDo;
  });

  const hasOverdue = overdueTasks.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all duration-300">
      {/* Custom Keyframes for Ringing Bell Animation */}
      <style>{`
        @keyframes ring-bell {
          0%, 100% { transform: rotate(0); }
          10%, 30%, 50%, 70%, 90% { transform: rotate(12deg); }
          20%, 40%, 60%, 80% { transform: rotate(-12deg); }
        }
        .animate-ring-bell {
          animation: ring-bell 1.8s ease-in-out infinite;
          transform-origin: top center;
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-300 flex flex-col max-h-[85vh] border border-slate-100">
        
        {/* Header - changes background and icon depending on overdue tasks presence */}
        <div className={`relative overflow-hidden px-6 py-5 text-white flex items-center gap-4 transition-all duration-300 ${
          hasOverdue 
            ? 'bg-gradient-to-r from-red-500 via-orange-500 to-amber-500' 
            : 'bg-gradient-to-r from-gov-600 via-sky-600 to-teal-500'
        }`}>
          <div className={`bg-white/20 p-2.5 rounded-2xl backdrop-blur-md flex-shrink-0 ${hasOverdue ? 'animate-ring-bell' : ''}`}>
            {hasOverdue ? (
              <AlertTriangle className="text-white" size={28} />
            ) : (
              <ClipboardList className="text-white" size={28} />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight">
              {hasOverdue ? 'Tugas Terlewati Deadline!' : 'Tugas Aktif Kamu'}
            </h3>
            <p className="text-white/80 text-xs sm:text-sm mt-0.5 font-medium">
              {hasOverdue 
                ? `Kamu memiliki ${overdueTasks.length} tugas terlupakan yang melewati batas waktu.`
                : `Kamu memiliki ${tasks.length} tugas aktif yang sedang berjalan.`}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full text-white/85 hover:text-white transition-colors flex-shrink-0 self-start"
          >
            <X size={20} />
          </button>
        </div>

        {/* Task List Body with Groupings */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6 max-h-[50vh] bg-slate-50/50">
          
          {/* GROUP 1: TERLEWAT DEADLINE (YANG TERLUPAKAN) */}
          {overdueTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-l-4 border-red-500 pl-2">
                <h4 className="text-sm font-bold text-red-600 tracking-wide uppercase">Terlewat Deadline (Terlupakan)</h4>
                <span className="bg-red-100 text-red-700 text-xs font-extrabold px-2 py-0.5 rounded-full">
                  {overdueTasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {overdueTasks.map(task => {
                  const daysOverdue = getDaysOverdue(task.deadline);
                  return (
                    <div 
                      key={task.id}
                      onClick={() => onViewTask(task)}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-red-400 hover:shadow-md transition-all cursor-pointer group flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          {task.category}
                        </span>
                        <h5 className="text-sm font-semibold text-slate-800 group-hover:text-red-600 transition-colors truncate mt-1">
                          {task.title}
                        </h5>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                          <Calendar size={11} />
                          <span>Deadline: {formatDateIndo(task.deadline)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-red-600 text-white rounded-lg shadow-sm">
                          Terlewat {daysOverdue} hari
                        </span>
                        <span className="text-[10px] text-slate-400 group-hover:text-red-500 transition-colors flex items-center gap-0.5">
                          Detail <ChevronRight size={10} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* GROUP 2: SEDANG DIKERJAKAN */}
          {inProgressTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-l-4 border-sky-500 pl-2">
                <h4 className="text-sm font-bold text-sky-700 tracking-wide uppercase">Sedang Dikerjakan</h4>
                <span className="bg-sky-100 text-sky-800 text-xs font-extrabold px-2 py-0.5 rounded-full">
                  {inProgressTasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {inProgressTasks.map(task => (
                  <div 
                    key={task.id}
                    onClick={() => onViewTask(task)}
                    className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-sky-400 hover:shadow-md transition-all cursor-pointer group flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <span className="text-[9px] font-bold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {task.category}
                      </span>
                      <h5 className="text-sm font-semibold text-slate-800 group-hover:text-sky-600 transition-colors truncate mt-1">
                        {task.title}
                      </h5>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                        <Calendar size={11} />
                        <span>Deadline: {formatDateIndo(task.deadline)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-sky-500 text-white rounded-lg shadow-sm">
                        {task.status}
                      </span>
                      <span className="text-[10px] text-slate-400 group-hover:text-sky-500 transition-colors flex items-center gap-0.5">
                        Detail <ChevronRight size={10} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GROUP 3: BELUM MULAI (TO DO) */}
          {toDoTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-l-4 border-slate-400 pl-2">
                <h4 className="text-sm font-bold text-slate-600 tracking-wide uppercase">Belum Mulai (To Do)</h4>
                <span className="bg-slate-200 text-slate-700 text-xs font-extrabold px-2 py-0.5 rounded-full">
                  {toDoTasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {toDoTasks.map(task => (
                  <div 
                    key={task.id}
                    onClick={() => onViewTask(task)}
                    className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-slate-400 hover:shadow-md transition-all cursor-pointer group flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <span className="text-[9px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {task.category}
                      </span>
                      <h5 className="text-sm font-semibold text-slate-800 group-hover:text-slate-600 transition-colors truncate mt-1">
                        {task.title}
                      </h5>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                        <Calendar size={11} />
                        <span>Deadline: {formatDateIndo(task.deadline)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-400 text-white rounded-lg shadow-sm">
                        Belum Mulai
                      </span>
                      <span className="text-[10px] text-slate-400 group-hover:text-slate-600 transition-colors flex items-center gap-0.5">
                        Detail <ChevronRight size={10} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5 sm:justify-between items-center">
          <button
            onClick={onSnooze}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow active:scale-95"
          >
            <Clock size={16} className="text-slate-400" />
            <span>Ingatkan Nanti (1 Jam)</span>
          </button>
          
          <div className="w-full sm:w-auto flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-sm transition-all active:scale-95"
            >
              Tutup
            </button>
            <button
              onClick={onViewAllTasks}
              className="flex-2 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gov-600 hover:bg-gov-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-gov-100 hover:shadow-lg active:scale-95"
            >
              <span>Semua Task</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OverdueTasksModal;
