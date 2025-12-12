import React from 'react';
import { Task, Status, Priority, User } from '../../types';
import { 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Zap, 
  Coffee, 
  Flame, 
  AlertTriangle,
  Briefcase
} from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
  users: User[];   // <-- NOW FROM DATABASE
}

const Dashboard: React.FC<DashboardProps> = ({ tasks, users }) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === Status.Done).length;
  const activeTasksCount = totalTasks - completedTasks;
  const urgentCount = tasks.filter(t => t.priority === Priority.Urgent && t.status !== Status.Done).length;

  const getStressLevel = (userTasks: Task[]) => {
    const active = userTasks.filter(t => t.status !== Status.Done);
    let score = 0;

    active.forEach(t => {
      if (t.priority === Priority.Urgent) score += 4;
      else if (t.priority === Priority.High) score += 3;
      else if (t.priority === Priority.Medium) score += 2;
      else score += 1;
    });

    return { score, count: active.length, details: active };
  };

  const getStressVisuals = (score: number) => {
    if (score < 6) return { label: 'Relaxed', color: 'bg-emerald-500', textColor: 'text-emerald-700', bg: 'bg-emerald-50', icon: Coffee, message: 'Beban kerja ringan' };
    if (score < 15) return { label: 'Balanced', color: 'bg-gov-500', textColor: 'text-gov-700', bg: 'bg-gov-50', icon: Zap, message: 'Beban kerja wajar' };
    if (score < 25) return { label: 'Busy', color: 'bg-orange-500', textColor: 'text-orange-700', bg: 'bg-orange-50', icon: AlertTriangle, message: 'Cukup sibuk' };
    return { label: 'Overload', color: 'bg-red-500', textColor: 'text-red-700', bg: 'bg-red-50', icon: Flame, message: 'Butuh bantuan segera' };
  };

  const sortedUsers = users.map(u => {
    const userTasks = tasks.filter(t => t.pic === u.name);
    const stress = getStressLevel(userTasks);
    return { user: u.name, ...stress };
  }).sort((a, b) => b.score - a.score);

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-50">

      {/* TOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* 1 */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Briefcase size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Active Task</p>
            <h3 className="text-2xl font-bold text-slate-800">{activeTasksCount}</h3>
          </div>
        </div>

        {/* 2 */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Selesai (Done)</p>
            <h3 className="text-2xl font-bold text-slate-800">{completedTasks}</h3>
          </div>
        </div>

        {/* 3 */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Urgent Active</p>
            <h3 className="text-2xl font-bold text-slate-800">{urgentCount}</h3>
          </div>
        </div>

        {/* 4 */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Avg. Workload</p>
            <h3 className="text-2xl font-bold text-slate-800">
              {(activeTasksCount / users.length).toFixed(1)} 
              <span className="text-xs text-slate-400"> task/orang</span>
            </h3>
          </div>
        </div>
      </div>

      {/* STRESS SECTION */}
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <ActivityIcon /> Analisis Beban Kerja & Stress Level
      </h3>

      {/* USER GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedUsers.map(data => {
          const visuals = getStressVisuals(data.score);
          const VisualIcon = visuals.icon;
          const percentage = Math.min((data.score / 30) * 100, 100);

          const urgentC = data.details.filter(t => t.priority === Priority.Urgent).length;
          const highC = data.details.filter(t => t.priority === Priority.High).length;
          const mediumC = data.details.filter(t => t.priority === Priority.Medium).length;
          const lowC = data.details.filter(t => t.priority === Priority.Low).length;

          return (
            <div key={data.user} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* HEADER */}
              <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 border-white shadow-sm ${visuals.color} text-white`}>
                    {data.user.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{data.user}</h4>
                    <p className="text-xs text-slate-500">{data.count} Active Tasks</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${visuals.bg} ${visuals.textColor}`}>
                  <VisualIcon size={12} />
                  {visuals.label}
                </span>
              </div>

              {/* BODY */}
              <div className="p-5">
                {/* Stress Meter */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-600">Stress Score: {data.score}</span>
                    <span className="text-slate-400">{percentage.toFixed(0)}% Capacity</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${visuals.color}`} 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2 italic">"{visuals.message}"</p>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-4 gap-2 mt-6">
                  <div className="text-center p-2 rounded-lg bg-red-50 border border-red-100">
                    <span className="block text-xl font-bold text-red-600">{urgentC}</span>
                    <span className="text-[10px] text-red-400 font-semibold uppercase">Urgent</span>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-orange-50 border border-orange-100">
                    <span className="block text-xl font-bold text-orange-600">{highC}</span>
                    <span className="text-[10px] text-orange-400 font-semibold uppercase">High</span>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-blue-50 border border-blue-100">
                    <span className="block text-xl font-bold text-blue-600">{mediumC}</span>
                    <span className="text-[10px] text-blue-400 font-semibold uppercase">Med</span>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="block text-xl font-bold text-slate-600">{lowC}</span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Low</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-gov-600" viewBox="0 0 24 24">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
);

export default Dashboard;
