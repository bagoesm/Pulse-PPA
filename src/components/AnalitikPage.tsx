import React, { useMemo, useState } from 'react';
import { useTasks } from '../contexts/TasksContext';
import { useDisposisi } from '../contexts/DisposisiContext';
import { useDivision } from '../contexts/DivisionContext';
import { useUsers } from '../contexts/UsersContext';
import DivisionFilter from './DivisionFilter';
import { Status } from '../../types';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  CheckCircle, 
  FileText, 
  Clock, 
  BarChart2,
  Flame 
} from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4']; // Modern palette
const STATUS_COLORS: Record<string, string> = {
  [Status.ToDo]: '#cbd5e1', 
  [Status.InProgress]: '#6366f1', 
  [Status.Pending]: '#f59e0b', 
  [Status.Review]: '#a855f7', 
  [Status.Done]: '#10b981' 
};

const DISPOSISI_COLORS: Record<string, string> = {
  'Pending': '#f59e0b',
  'In Progress': '#6366f1',
  'Completed': '#10b981',
  'Cancelled': '#ef4444'
};

const SLA_COLORS: Record<string, string> = {
  'Tepat Waktu (Aman)': '#10b981', 
  'Kritis (< 3 Hari)': '#f59e0b',  
  'Terlambat (Overdue)': '#ef4444', 
};

const PRIORITY_COLORS: Record<string, string> = {
  'Urgent': '#ef4444',   
  'High': '#f97316',     
  'Medium': '#6366f1',   
  'Low': '#94a3b8',      
};

const AnalitikPage: React.FC = () => {
  const { tasks } = useTasks();
  const { disposisi } = useDisposisi();
  const { shouldShowByDivisi, selectedDivisi, isUserIdInSelectedDivisi } = useDivision();
  const { allUsers } = useUsers();
  const [timeFilter, setTimeFilter] = useState<'all' | 'this_month' | 'last_month' | 'this_year'>('this_month');

  const isDateInFilter = (dateString?: string) => {
    if (timeFilter === 'all') return true;
    if (!dateString) return false;
    
    const d = new Date(dateString);
    const now = new Date();
    
    if (timeFilter === 'this_month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (timeFilter === 'last_month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
    }
    if (timeFilter === 'this_year') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const filteredTasks = useMemo(() => {
    let result = tasks;
    result = result.filter(t => isDateInFilter(t.startDate || (t as any).createdAt));
    if (selectedDivisi !== 'All') {
      result = result.filter(t => shouldShowByDivisi(t.createdBy, t.pic));
    }
    return result;
  }, [tasks, selectedDivisi, shouldShowByDivisi, timeFilter]);

  const filteredDisposisi = useMemo(() => {
    let result = disposisi;
    result = result.filter(d => isDateInFilter(d.createdAt));
    if (selectedDivisi !== 'All') {
      result = result.filter(d => 
        shouldShowByDivisi(d.createdBy, []) || isUserIdInSelectedDivisi(d.assignedTo)
      );
    }
    return result;
  }, [disposisi, selectedDivisi, shouldShowByDivisi, isUserIdInSelectedDivisi, timeFilter]);

  const kpiData = useMemo(() => {
    const totalTasks = filteredTasks.length;
    const activeTasks = filteredTasks.filter(t => t.status !== Status.Done).length;
    const completedTasks = totalTasks - activeTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const activeDisposisi = filteredDisposisi.filter(d => d.status !== 'Completed').length;
    
    let totalWithDeadline = 0;
    let onTimeTasks = 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    filteredTasks.forEach(t => {
      if (t.status === Status.Done) return;
      if (!t.deadline) {
        onTimeTasks++;
        totalWithDeadline++;
        return;
      }
      totalWithDeadline++;
      const deadline = new Date(t.deadline);
      deadline.setHours(0, 0, 0, 0);
      const diffTime = deadline.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0) {
        onTimeTasks++;
      }
    });
    
    const slaRate = totalWithDeadline > 0 ? Math.round((onTimeTasks / totalWithDeadline) * 100) : 100;

    return { totalTasks, activeTasks, completionRate, activeDisposisi, slaRate };
  }, [filteredTasks, filteredDisposisi]);

  const taskStatusData = useMemo(() => {
    const counts = {
      [Status.ToDo]: 0,
      [Status.InProgress]: 0,
      [Status.Pending]: 0,
      [Status.Review]: 0,
      [Status.Done]: 0,
    };
    filteredTasks.forEach(t => {
      if (counts[t.status] !== undefined) counts[t.status]++;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key as Status]
    })).filter(d => d.value > 0);
  }, [filteredTasks]);

  const picWorkloadData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTasks.forEach(t => {
      if (t.status !== Status.Done) { 
        t.pic.forEach(p => {
          counts[p] = (counts[p] || 0) + 1;
        });
      }
    });
    return Object.keys(counts)
      .map(key => ({ name: key, jumlah: counts[key] }))
      .sort((a, b) => b.jumlah - a.jumlah); 
  }, [filteredTasks]);

  const trendData = useMemo(() => {
    const now = new Date();
    let datesToGenerate: Date[] = [];
    let formatLabel: (d: Date) => string;
    let matchGroup: (t: any, d: Date) => boolean;

    if (timeFilter === "this_month" || timeFilter === "last_month") {
      const targetDate = timeFilter === "this_month" ? now : new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      datesToGenerate = Array.from({length: daysInMonth}, (_, i) => new Date(year, month, i + 1));
      formatLabel = (d) => `${d.getDate()} ${d.toLocaleDateString("id-ID", { month: "short" })}`;
      matchGroup = (t, d) => {
        const tDateStr = t.startDate || (t as any).createdAt;
        if (!tDateStr) return false;
        const tDate = new Date(tDateStr);
        return tDate.getDate() === d.getDate() && tDate.getMonth() === d.getMonth() && tDate.getFullYear() === d.getFullYear();
      };
    } else {
      if (timeFilter === "this_year") {
        datesToGenerate = Array.from({length: 12}, (_, i) => new Date(now.getFullYear(), i, 1));
      } else {
        datesToGenerate = Array.from({length: 12}, (_, i) => new Date(now.getFullYear(), now.getMonth() - 11 + i, 1));
      }
      formatLabel = (d) => d.toLocaleDateString("id-ID", { month: "short" });
      matchGroup = (t, d) => {
        const tDateStr = t.startDate || (t as any).createdAt;
        if (!tDateStr) return false;
        const tDate = new Date(tDateStr);
        return tDate.getMonth() === d.getMonth() && tDate.getFullYear() === d.getFullYear();
      };
    }

    return datesToGenerate.map(dateObj => {
      const masuk = filteredTasks.filter(t => matchGroup(t, dateObj)).length;
      const selesai = filteredTasks.filter(t => t.status === Status.Done && matchGroup(t, dateObj)).length;
      return { name: formatLabel(dateObj), Masuk: masuk, Selesai: selesai };
    });
  }, [filteredTasks, timeFilter]);

  const disposisiStatusData = useMemo(() => {
    const counts = { 'Pending': 0, 'In Progress': 0, 'Completed': 0, 'Cancelled': 0 };
    filteredDisposisi.forEach(d => {
      if (counts[d.status as keyof typeof counts] !== undefined) {
        counts[d.status as keyof typeof counts]++;
      }
    });
    return Object.keys(counts).map(key => ({
      name: key, value: counts[key as keyof typeof counts]
    })).filter(d => d.value > 0);
  }, [filteredDisposisi]);

  const slaData = useMemo(() => {
    const counts = { 'Tepat Waktu (Aman)': 0, 'Kritis (< 3 Hari)': 0, 'Terlambat (Overdue)': 0 };
    const now = new Date();
    now.setHours(0, 0, 0, 0); 
    
    filteredTasks.forEach(t => {
      if (t.status === Status.Done) return; 
      if (!t.deadline) {
        counts['Tepat Waktu (Aman)']++;
        return;
      }
      const deadline = new Date(t.deadline);
      deadline.setHours(0, 0, 0, 0);
      const diffTime = deadline.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) { counts['Terlambat (Overdue)']++; } 
      else if (diffDays <= 3) { counts['Kritis (< 3 Hari)']++; } 
      else { counts['Tepat Waktu (Aman)']++; }
    });
    return Object.keys(counts).map(key => ({
      name: key, value: counts[key as keyof typeof counts]
    })).filter(d => d.value > 0);
  }, [filteredTasks]);

  const priorityData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTasks.forEach(t => {
      if (t.status === Status.Done) return; 
      const prio = t.priority || 'Low';
      counts[prio] = (counts[prio] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key, value: counts[key]
    })).sort((a, b) => b.value - a.value); 
  }, [filteredTasks]);

  return (
    <div className="p-4 sm:p-8 w-full mx-auto h-full overflow-y-auto bg-slate-50/50">
      
      {/* Premium Header */}
      <div className="relative mb-8 rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 p-6 sm:p-8 shadow-xl shadow-indigo-200 overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 opacity-20">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="100" fill="white"/>
          </svg>
        </div>
        <div className="absolute bottom-0 left-10 translate-y-1/2 opacity-10">
          <svg width="150" height="150" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="200" transform="rotate(45 100 100)" fill="white"/>
          </svg>
        </div>
        
        <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 z-10">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Dashboard Analitik</h1>
            <p className="text-indigo-100 mt-2 font-medium max-w-xl">Pusat wawasan dan metrik performa pekerjaan tim Anda. Gunakan filter di bawah untuk menajamkan data.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 w-full xl:w-auto">
            <span className="text-sm font-semibold text-white/90 pl-3">Filter:</span>
            <select 
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="text-sm font-bold text-indigo-900 bg-white hover:bg-slate-50 rounded-xl px-4 py-2.5 border-none focus:ring-2 focus:ring-indigo-400 cursor-pointer outline-none transition-all shadow-sm"
            >
              <option value="all">Semua Waktu</option>
              <option value="this_month">Bulan Ini</option>
              <option value="last_month">Bulan Lalu</option>
              <option value="this_year">Tahun Ini</option>
            </select>
            
            <div className="w-px h-6 bg-white/20 mx-1 hidden sm:block"></div>
            
            <div className="flex-1 sm:flex-none">
              <DivisionFilter compact />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-6 shadow-md shadow-slate-200/50 border border-slate-100 flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300">
          <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600">
            <BarChart2 className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Tugas Aktif</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{kpiData.activeTasks}</h3>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-md shadow-slate-200/50 border border-slate-100 flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300">
          <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Penyelesaian</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{kpiData.completionRate}%</h3>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-md shadow-slate-200/50 border border-slate-100 flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300">
          <div className="bg-amber-50 p-4 rounded-2xl text-amber-600">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Kepatuhan SLA</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{kpiData.slaRate}%</h3>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-md shadow-slate-200/50 border border-slate-100 flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300">
          <div className="bg-rose-50 p-4 rounded-2xl text-rose-600">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Disposisi Aktif</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{kpiData.activeDisposisi}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        
        {/* Top Performers / Workload Leaderboard */}
        <div className="bg-white rounded-3xl shadow-md shadow-slate-200/50 border border-slate-100 xl:col-span-1 p-6 sm:p-8 flex flex-col h-[450px]">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-orange-100 p-2.5 rounded-xl text-orange-600">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800">Beban Kerja PIC</h2>
              <p className="text-xs font-semibold text-slate-400">Peringkat tugas belum selesai</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-5">
            {picWorkloadData.length > 0 ? (
              picWorkloadData.map((item, index) => {
                const user = allUsers.find(u => u.name === item.name);
                const avatar = user?.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random`;
                const maxWorkload = picWorkloadData[0].jumlah;
                const percentage = (item.jumlah / maxWorkload) * 100;
                
                return (
                  <div key={index} className="flex items-center gap-4 group">
                    <div className="relative flex-shrink-0">
                      <img src={avatar} alt={item.name} className="w-12 h-12 rounded-full object-cover ring-4 ring-transparent group-hover:ring-indigo-100 transition-all" />
                      {index < 3 && (
                        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black text-white ${index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-slate-300' : 'bg-orange-400'}`}>
                          {index + 1}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-end mb-1.5">
                        <span className="text-sm font-bold text-slate-700 truncate mr-2">{item.name}</span>
                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg flex-shrink-0">{item.jumlah}</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-1000 ease-out" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">Tidak ada tugas aktif</div>
            )}
          </div>
        </div>

        {/* Trend Area Chart */}
        <div className="bg-white rounded-3xl shadow-md shadow-slate-200/50 border border-slate-100 xl:col-span-2 p-6 sm:p-8 flex flex-col h-[450px]">
          <div className="mb-8">
            <h2 className="text-xl font-extrabold text-slate-800">Tren Pekerjaan</h2>
            <p className="text-xs font-semibold text-slate-400">Dinamika tugas baru masuk vs diselesaikan</p>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSelesai" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 600 }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontWeight: 600, fontSize: '13px' }}/>
                <Area type="monotone" dataKey="Masuk" stroke="#f59e0b" fillOpacity={1} fill="url(#colorMasuk)" strokeWidth={3} />
                <Area type="monotone" dataKey="Selesai" stroke="#10b981" fillOpacity={1} fill="url(#colorSelesai)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Status Tugas (Pie) */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md shadow-slate-200/50 border border-slate-100 flex flex-col h-[350px]">
          <h2 className="text-lg font-extrabold text-slate-800 mb-1">Status Tugas</h2>
          <div className="flex-1 min-h-[200px]">
            {taskStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={85}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}/>
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">Tidak ada data</div>
            )}
          </div>
        </div>

        {/* Status Deadline / SLA (Pie) */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md shadow-slate-200/50 border border-slate-100 flex flex-col h-[350px]">
          <h2 className="text-lg font-extrabold text-slate-800 mb-1">Kepatuhan Deadline</h2>
          <div className="flex-1 min-h-[200px]">
            {slaData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slaData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={85}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                  >
                    {slaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SLA_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}/>
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">Tidak ada data tugas aktif</div>
            )}
          </div>
        </div>

        {/* Peta Prioritas (Bar) */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md shadow-slate-200/50 border border-slate-100 flex flex-col h-[350px]">
          <h2 className="text-lg font-extrabold text-slate-800 mb-6">Peta Prioritas</h2>
          <div className="flex-1 min-h-[200px]">
            {priorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" name="Jumlah" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">Tidak ada data</div>
            )}
          </div>
        </div>

        {/* Status Disposisi (Bar) */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md shadow-slate-200/50 border border-slate-100 flex flex-col h-[350px]">
          <h2 className="text-lg font-extrabold text-slate-800 mb-6">Status Disposisi</h2>
          <div className="flex-1 min-h-[200px]">
            {disposisiStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={disposisiStatusData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" name="Jumlah" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {disposisiStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DISPOSISI_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">Tidak ada data</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalitikPage;
