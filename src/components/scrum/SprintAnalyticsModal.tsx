import React, { useState, useMemo } from 'react';
import { 
  X, TrendingDown, BarChart3, Calendar, Target, 
  CheckCircle2, AlertCircle, Sparkles, Clock, Zap
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine 
} from 'recharts';
import { Sprint, Task, Status } from '../../../types';

interface SprintAnalyticsModalProps {
  sprint: Sprint;
  allSprints: Sprint[];
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
}

export const SprintAnalyticsModal: React.FC<SprintAnalyticsModalProps> = ({
  sprint,
  allSprints,
  tasks,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'burndown' | 'velocity'>('burndown');

  if (!isOpen) return null;

  // 1. BURNDOWN CHART CALCULATION
  const burndownData = useMemo(() => {
    const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
    const totalSp = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    
    // Status Done and Testing VA/PT are counted as completed/burned-down SP
    const isTaskCompletedOrTesting = (status: Status | string) => {
      return status === Status.Done || status === Status.TestingVAPT;
    };

    const doneTasks = sprintTasks.filter(t => t.status === Status.Done);
    const testingTasks = sprintTasks.filter(t => t.status === Status.TestingVAPT);
    const doneSp = doneTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const testingSp = testingTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const totalCompletedSp = doneSp + testingSp;

    // Parse date without timezone shift
    const parseYMD = (str?: string) => {
      if (!str) return new Date();
      const clean = str.split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
      return new Date(str);
    };

    const startDate = parseYMD(sprint.startDate);
    startDate.setHours(0, 0, 0, 0);

    let endDate: Date;
    if (sprint.endDate) {
      endDate = parseYMD(sprint.endDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 13);
      endDate.setHours(23, 59, 59, 999);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate total sprint days (e.g. 14 days)
    const diffTime = Math.max(0, endDate.getTime() - startDate.getTime());
    const dayCount = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));

    // Helper to extract completion date safely
    const getTaskCompletionDate = (t: Task): Date | null => {
      const raw = (t as any).updated_status_at || (t as any).updated_at || t.updatedAt || (t as any).created_at || t.createdAt;
      if (!raw) return null;
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    };

    const isSprintCompleted = sprint.status === 'Completed';

    const dataPoints = [];

    // Point 0: Sprint Start Baseline (Mulai)
    dataPoints.push({
      day: 'Awal',
      date: 'Mulai',
      ideal: totalSp,
      actual: totalSp
    });

    // Calculate daily data points for Day 1 through Day N
    for (let i = 1; i <= dayCount; i++) {
      const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + (i - 1));
      const dayDate = new Date(currentDate);
      dayDate.setHours(0, 0, 0, 0);

      const isPast = dayDate < today;
      const isCurrentDay = dayDate.getTime() === today.getTime();
      const isFuture = dayDate > today;

      // Ideal Line: Linear reduction from totalSp down to 0 on the final day
      const idealRemaining = Math.max(0, Math.round(totalSp - (totalSp / dayCount) * i));

      // Actual Line:
      let actualRemaining: number | null = null;

      if (isSprintCompleted) {
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);

        const completedSoFar = sprintTasks
          .filter(t => {
            if (!isTaskCompletedOrTesting(t.status)) return false;
            const compDate = getTaskCompletionDate(t);
            return compDate ? compDate <= endOfDay : true;
          })
          .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

        actualRemaining = Math.max(0, totalSp - completedSoFar);
      } else if (isCurrentDay) {
        // Today: reflects current real-time remaining story points
        actualRemaining = Math.max(0, totalSp - totalCompletedSp);
      } else if (isPast) {
        // If sprint is past its endDate and not completed, the final day should reflect current state
        if (i === dayCount && today > endDate) {
          actualRemaining = Math.max(0, totalSp - totalCompletedSp);
        } else {
          const endOfDay = new Date(currentDate);
          endOfDay.setHours(23, 59, 59, 999);

          const completedSoFar = sprintTasks
            .filter(t => {
              if (!isTaskCompletedOrTesting(t.status)) return false;
              const compDate = getTaskCompletionDate(t);
              return compDate ? compDate <= endOfDay : false;
            })
            .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

          actualRemaining = Math.max(0, totalSp - completedSoFar);
        }
      } else if (isFuture) {
        // Future days: null so line doesn't project ahead
        actualRemaining = null;
      }

      const dayLabel = `${currentDate.getDate()}/${currentDate.getMonth() + 1}`;
      dataPoints.push({
        day: `Hari ${i}`,
        date: dayLabel,
        ideal: idealRemaining,
        actual: actualRemaining
      });
    }

    return {
      points: dataPoints,
      totalSp,
      completedSp: totalCompletedSp,
      doneSp,
      testingSp
    };
  }, [sprint, tasks]);

  // 2. VELOCITY CHART CALCULATION
  const velocityData = useMemo(() => {
    const isTaskCompletedOrTesting = (status: Status | string) => {
      return status === Status.Done || status === Status.TestingVAPT;
    };

    // Sprints belonging to the same project, sorted chronologically
    const projectSprints = allSprints
      .filter(s => s.projectId === sprint.projectId)
      .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
      .slice(-7); // Last 7 sprints

    const chartPoints = projectSprints.map(s => {
      const sTasks = tasks.filter(t => t.sprintId === s.id);
      const committed = sTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const completed = sTasks.filter(t => isTaskCompletedOrTesting(t.status)).reduce((sum, t) => sum + (t.storyPoints || 0), 0);

      return {
        name: s.name.length > 12 ? s.name.substring(0, 10) + '...' : s.name,
        fullName: s.name,
        status: s.status,
        committed,
        completed
      };
    });

    const completedSprints = chartPoints.filter(p => p.status === 'Completed');
    const avgVelocity = completedSprints.length > 0
      ? Math.round(completedSprints.reduce((sum, p) => sum + p.completed, 0) / completedSprints.length)
      : (chartPoints.length > 0 ? Math.round(chartPoints.reduce((sum, p) => sum + p.completed, 0) / chartPoints.length) : 0);

    return {
      points: chartPoints,
      avgVelocity
    };
  }, [sprint, allSprints, tasks]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-100 animate-zoomIn flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-slate-50/70 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">Analitik & Performa Sprint</h3>
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

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-100 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('burndown')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'burndown'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>Sprint Burndown Chart</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('velocity')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'velocity'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Velocity Chart</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* 1. BURNDOWN TAB */}
          {activeTab === 'burndown' && (
            <div className="space-y-5">
              
              {/* Burndown KPI Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Total Komitmen</div>
                  <div className="text-xl font-extrabold text-slate-800 mt-0.5">
                    {burndownData.totalSp} <span className="text-xs font-normal text-slate-400">SP</span>
                  </div>
                </div>

                <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100">
                  <div className="text-[11px] font-bold text-emerald-700 uppercase flex items-center justify-between flex-wrap gap-1">
                    <span>Telah Selesai</span>
                    {burndownData.testingSp > 0 && (
                      <span 
                        className="text-[9px] font-semibold text-emerald-700 bg-emerald-100/90 border border-emerald-200/60 px-1.5 py-0.5 rounded-md"
                        title={`Done: ${burndownData.doneSp} SP + Testing VA/PT: ${burndownData.testingSp} SP`}
                      >
                        incl. {burndownData.testingSp} SP VA/PT
                      </span>
                    )}
                  </div>
                  <div className="text-xl font-extrabold text-emerald-800 mt-0.5">
                    {burndownData.completedSp} <span className="text-xs font-normal text-emerald-600">SP</span>
                  </div>
                </div>

                <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-100">
                  <div className="text-[11px] font-bold text-amber-700 uppercase">Sisa Story Points</div>
                  <div className="text-xl font-extrabold text-amber-800 mt-0.5">
                    {Math.max(0, burndownData.totalSp - burndownData.completedSp)} <span className="text-xs font-normal text-amber-600">SP</span>
                  </div>
                </div>
              </div>

              {/* Burndown Line Chart */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                <div className="text-xs font-bold text-slate-600 mb-3 flex items-center justify-between flex-wrap gap-2">
                  <span>Garis Tren Sisa SP (Ideal vs Aktual)</span>
                  <span className="text-[11px] font-medium text-slate-400">
                    Termasuk Done & Testing VA/PT
                  </span>
                </div>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={burndownData.points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: 'none', 
                          borderRadius: '12px', 
                          color: '#fff', 
                          fontSize: '12px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
                        }}
                        formatter={(val: any, name: string) => [
                          val !== null && val !== undefined ? `${val} SP` : '-',
                          name
                        ]}
                        labelFormatter={(_label: string, payload: any) => {
                          if (payload && payload[0] && payload[0].payload) {
                            const p = payload[0].payload;
                            return p.date === 'Mulai' || p.day === 'Awal' ? 'Awal Sprint (Baseline)' : `${p.day} (${p.date})`;
                          }
                          return _label;
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Line 
                        type="linear" 
                        name="Garis Ideal" 
                        dataKey="ideal" 
                        stroke="#94a3b8" 
                        strokeDasharray="5 5" 
                        strokeWidth={2} 
                        dot={false} 
                      />
                      <Line 
                        type="monotone" 
                        name="Aktual Sisa SP" 
                        dataKey="actual" 
                        stroke="#6366f1" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#6366f1', strokeWidth: 1, stroke: '#fff' }} 
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}

          {/* 2. VELOCITY TAB */}
          {activeTab === 'velocity' && (
            <div className="space-y-5">
              
              {/* Velocity Summary Banner */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-900">Rata-Rata Kecepatan Tim (Average Velocity)</span>
                  <div className="text-2xl font-extrabold text-indigo-700 mt-0.5">
                    {velocityData.avgVelocity} <span className="text-xs font-normal text-indigo-500">Story Points / Sprint</span>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500 max-w-xs">
                  Gunakan angka ini sebagai referensi kapasitas saat merencanakan sprint berikutnya.
                </div>
              </div>

              {/* Velocity Bar Chart */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                <div className="text-xs font-bold text-slate-600 mb-3 flex items-center justify-between">
                  <span>Direncanakan (Committed) vs Diselesaikan (Completed)</span>
                  <span className="text-[11px] font-normal text-slate-400">7 Sprint Terakhir</span>
                </div>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={velocityData.points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: 'none', 
                          borderRadius: '12px', 
                          color: '#fff', 
                          fontSize: '12px' 
                        }} 
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <ReferenceLine 
                        y={velocityData.avgVelocity} 
                        stroke="#f59e0b" 
                        strokeDasharray="3 3" 
                        label={{ value: 'Rata-rata', fill: '#d97706', fontSize: 10, position: 'top' }} 
                      />
                      <Bar name="Direncanakan" dataKey="committed" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                      <Bar name="Diselesaikan" dataKey="completed" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition-all text-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
