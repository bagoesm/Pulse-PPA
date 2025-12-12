import React from 'react';
import { Task, User, ProjectDefinition, Priority } from '../../types';

interface TimelineViewProps {
  tasks: Task[];
  projects: ProjectDefinition[];
  users: User[];               // <-- now comes from parent (DB)
  onTaskClick: (task: Task) => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({ tasks, projects, users, onTaskClick }) => {
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.Urgent: return 'bg-red-500';
      case Priority.High: return 'bg-orange-500';
      case Priority.Medium: return 'bg-gov-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Header Dates */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <div className="w-48 p-4 shrink-0 font-bold text-slate-700 text-sm border-r border-slate-200 sticky left-0 bg-slate-50 z-10">
          Tim / Tanggal
        </div>
        <div className="flex overflow-x-auto no-scrollbar">
          {dates.map(date => (
            <div key={date} className="w-32 shrink-0 p-3 text-center border-r border-slate-100 last:border-r-0">
              <div className="text-xs font-semibold text-slate-600">{getDayName(date)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Rows per User */}
      <div className="flex-1 overflow-y-auto overflow-x-auto kanban-scroll">
        {users.map(u => (
          <div key={u.id} className="flex border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
            {/* User Column */}
            <div className="w-48 p-4 shrink-0 border-r border-slate-200 bg-white sticky left-0 z-10 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                {u.name?.charAt(0) ?? '?'}
              </div>
              <span className="text-sm font-medium text-slate-700 truncate">{u.name}</span>
            </div>

            {/* Task Cells */}
            <div className="flex">
              {dates.map(date => {
                const dayTasks = tasks.filter(t => t.pic === u.name && t.deadline === date);
                return (
                  <div key={`${u.id}-${date}`} className="w-32 shrink-0 p-2 border-r border-slate-100 min-h-[80px] relative">
                    <div className="flex flex-col gap-1.5">
                      {dayTasks.map(task => {
                        const project = projects.find(p => p.id === task.projectId);
                        return (
                          <button
                            key={task.id}
                            onClick={() => onTaskClick(task)}
                            className={`w-full text-left p-1.5 rounded text-[10px] text-white shadow-sm hover:opacity-90 transition-opacity truncate block ${getPriorityColor(task.priority)}`}
                            title={task.title}
                          >
                            <div className="font-bold truncate">{task.title}</div>
                            {project && <div className="opacity-80 text-[9px] truncate">{project.name}</div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex gap-4">
        <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /> Urgent</span>
        <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500" /> High</span>
        <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gov-500" /> Medium</span>
        <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-400" /> Low</span>
      </div>
    </div>
  );
};

export default TimelineView;
