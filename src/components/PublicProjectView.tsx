// src/components/PublicProjectView.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Task, ProjectDefinition, Status, Priority, Category, Epic } from '../../types';
import { 
  Globe, Loader2, Calendar, User, CheckCircle2, AlertCircle, 
  BarChart3, Layers, LayoutGrid, Download, ExternalLink, X, CheckSquare, Users as UsersIcon,
  Activity
} from 'lucide-react';
import TaskCard from './TaskCard';
import UserAvatar from './UserAvatar';

// Icon mapping
import {
  Briefcase, Code, Database, Globe as GlobeIcon, Smartphone, Monitor, Server, Cloud, Shield,
  Zap, Target, Rocket, Star, Heart, Lightbulb, Settings, Users, FileText, BarChart3 as BarIcon, Layers as LayersIcon
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Briefcase, Code, Database, Globe: GlobeIcon, Smartphone, Monitor, Server, Cloud, Shield,
  Zap, Target, Rocket, Star, Heart, Lightbulb, Settings, Users, FileText, BarChart3: BarIcon, Layers: LayersIcon
};

const getColorClasses = (color: string = 'blue') => {
  const colorMap: Record<string, { bg: string; text: string; ring: string; border: string; from: string; to: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-200', border: 'border-blue-200', from: 'from-blue-500', to: 'to-indigo-600' },
    green: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200', border: 'border-emerald-200', from: 'from-emerald-500', to: 'to-teal-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-200', border: 'border-purple-200', from: 'from-purple-500', to: 'to-violet-600' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-200', border: 'border-orange-200', from: 'from-orange-500', to: 'to-amber-600' },
    red: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-200', border: 'border-red-200', from: 'from-red-500', to: 'to-rose-600' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', ring: 'ring-indigo-200', border: 'border-indigo-200', from: 'from-indigo-500', to: 'to-purple-600' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-700', ring: 'ring-pink-200', border: 'border-pink-200', from: 'from-pink-500', to: 'to-rose-500' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-700', ring: 'ring-teal-200', border: 'border-teal-200', from: 'from-teal-500', to: 'to-emerald-600' },
  };
  return colorMap[color] || colorMap.blue;
};

interface PublicProjectViewProps {
  shareToken: string;
}

export const PublicProjectView: React.FC<PublicProjectViewProps> = ({ shareToken }) => {
  const [project, setProject] = useState<ProjectDefinition | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // User profiles mapping (for team avatars and task cards)
  const [userProfiles, setUserProfiles] = useState<Record<string, { name: string; profilePhoto?: string }>>({});
  
  // Tabs: 'kanban' | 'epics'
  const [activeTab, setActiveTab] = useState<'kanban' | 'epics'>('kanban');
  
  // Selected task for read-only modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    const fetchPublicData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch project by share_token
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('share_token', shareToken)
          .single();

        if (projectError || !projectData) {
          throw new Error('Project tidak ditemukan atau tautan berbagi telah dinonaktifkan.');
        }

        const p = projectData as ProjectDefinition;
        setProject(p);

        // Fetch user profiles for avatars
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('name, profile_photo');
        
        if (profilesData) {
          const profileMap: Record<string, { name: string; profilePhoto?: string }> = {};
          profilesData.forEach((profile: any) => {
            profileMap[profile.name] = {
              name: profile.name,
              profilePhoto: profile.profile_photo || undefined
            };
          });
          setUserProfiles(profileMap);
        }

        // 2. Fetch tasks and epics concurrently (joining master tables for category/subcategory names)
        const [tasksRes, epicsRes] = await Promise.all([
          supabase.from('tasks').select('*, master_categories:category_id(name), master_sub_categories:sub_category_id(name)').eq('project_id', p.id),
          supabase.from('epics').select('*').eq('project_id', p.id)
        ]);

        const fetchedTasks = (tasksRes.data || []) as any[];
        const fetchedEpics = (epicsRes.data || []) as any[];

        // Map database tasks (snake_case) to frontend Task type (camelCase)
        const mappedTasks = fetchedTasks.map((t: any) => ({
          ...t,
          category: t.master_categories?.name || t.category || '',
          subCategory: t.master_sub_categories?.name || t.sub_category || t.subCategory || '',
          startDate: t.start_date || t.startDate || new Date().toISOString().split('T')[0],
          projectId: t.project_id || t.projectId || null,
          epicId: t.epic_id || t.epicId || null,
          pic: Array.isArray(t.pic) ? t.pic : t.pic ? [t.pic] : [],
          deadline: t.deadline || null,
          attachments: Array.isArray(t.attachments) ? t.attachments : [],
          links: Array.isArray(t.links) ? t.links : [],
          blockedBy: Array.isArray(t.blocked_by) ? t.blocked_by : [],
          checklists: Array.isArray(t.checklists) ? t.checklists : []
        })) as Task[];

        // Map database epics (snake_case) to Epic type
        const mappedEpics = fetchedEpics.map((e: any) => ({
          ...e,
          projectId: e.project_id || e.projectId || '',
          startDate: e.start_date || e.startDate || '',
          targetDate: e.target_date || e.targetDate || '',
          createdBy: e.created_by || e.createdBy || '',
          createdAt: e.created_at || e.createdAt || '',
          updatedAt: e.updated_at || e.updatedAt || ''
        })) as Epic[];

        setTasks(mappedTasks);
        setEpics(mappedEpics);

        if (mappedTasks.length > 0) {
          const taskIds = mappedTasks.map(t => t.id);
          const { data: subtasksData } = await supabase
            .from('subtasks')
            .select('*')
            .in('parent_task_id', taskIds);
          setSubtasks(subtasksData || []);
        }

      } catch (err: any) {
        console.error('Error fetching public project data:', err);
        setError(err.message || 'Terjadi kesalahan saat memuat data.');
      } finally {
        setLoading(false);
      }
    };

    if (shareToken) {
      fetchPublicData();
    }
  }, [shareToken]);

  // Statistics calculations
  const stats = useMemo(() => {
    if (tasks.length === 0) return { total: 0, done: 0, inProgress: 0, pending: 0, todo: 0, progress: 0 };
    const total = tasks.length;
    const done = tasks.filter(t => t.status === Status.Done).length;
    const inProgress = tasks.filter(t => t.status === Status.InProgress).length;
    const pending = tasks.filter(t => t.status === Status.Pending).length;
    const todo = tasks.filter(t => t.status === Status.ToDo).length;
    const progress = Math.round((done / total) * 100);
    return { total, done, inProgress, pending, todo, progress };
  }, [tasks]);

  // Construct users array for TaskCard mapping
  const usersList = useMemo(() => {
    return Object.values(userProfiles).map(u => ({
      id: u.name, // dummy id
      name: u.name,
      email: '',
      role: '',
      initials: u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      profilePhoto: u.profilePhoto
    })) as any;
  }, [userProfiles]);

  if (loading) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-gov-600" size={48} />
        <p className="text-slate-500 font-medium text-sm">Memuat Halaman Publik...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-md text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Ditolak / Tidak Ditemukan</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            {error || 'Project ini tidak tersedia untuk publik. Tautan mungkin telah kedaluwarsa atau dinonaktifkan oleh pemilik project.'}
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
          >
            Kembali ke Portal
          </a>
        </div>
      </div>
    );
  }

  const ProjectIcon = iconMap[project.icon || 'Briefcase'] || Briefcase;
  const projectColor = getColorClasses(project.color);

  // Group tasks by status for Kanban Board
  const tasksByStatus = {
    [Status.ToDo]: tasks.filter(t => t.status === Status.ToDo),
    [Status.InProgress]: tasks.filter(t => t.status === Status.InProgress),
    [Status.Pending]: tasks.filter(t => t.status === Status.Pending),
    [Status.Done]: tasks.filter(t => t.status === Status.Done),
  };



  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Banner / Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3.5 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2.5">
          <img 
            src="/Logo.svg" 
            alt="Logo KemenPPPA" 
            className="w-9 h-9 transition-transform hover:scale-105"
          />
          <div>
            <span className="font-extrabold text-slate-800 text-base leading-none block">Pulse</span>
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mt-0.5 block">Monitoring Publik</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600">
          <Globe size={14} className="text-emerald-500 animate-pulse" />
          <span>Akses Publik (Read-Only)</span>
        </div>
      </nav>

      {/* Hero Header Section */}
      <header className="bg-white border-b border-slate-200 px-6 py-8 sm:py-10">
        <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className={`p-3 sm:p-4 rounded-2xl ring-2 ${projectColor.bg} ${projectColor.text} ${projectColor.ring} shadow-sm shrink-0`}>
              <ProjectIcon size={32} />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-800">{project.name}</h1>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">{project.description || 'Tidak ada deskripsi project.'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 sm:gap-6 bg-slate-50 border border-slate-200 p-4 rounded-2xl w-full md:w-auto">
            <div className="flex-1 md:flex-none">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Manager</span>
              <span className="font-bold text-sm sm:text-base text-slate-700 whitespace-nowrap">{project.manager}</span>
            </div>
            <div className="w-px bg-slate-200 hidden sm:block" />
            <div className="flex-1 md:flex-none">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Target Rilis</span>
              <span className="font-bold text-sm sm:text-base text-slate-700 whitespace-nowrap flex items-center gap-1.5 mt-0.5">
                <Calendar size={14} className="text-slate-400" />
                {project.targetLiveDate ? new Date(project.targetLiveDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
              </span>
            </div>
            <div className="w-px bg-slate-200 hidden sm:block" />
            <div className="flex-1 md:flex-none">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Progress</span>
              <span className={`font-black text-base sm:text-lg ${projectColor.text} block`}>{stats.progress}%</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <BarChart3 size={20} />
            </div>
            <div>
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block">Total Task</span>
              <span className="text-lg font-extrabold text-slate-800">{stats.total}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block">Selesai</span>
              <span className="text-lg font-extrabold text-slate-800">{stats.done}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-gov-50 text-gov-600 flex items-center justify-center shrink-0">
              <Activity size={20} />
            </div>
            <div>
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block">Aktif</span>
              <span className="text-lg font-extrabold text-slate-800">{stats.inProgress}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block">Pending</span>
              <span className="text-lg font-extrabold text-slate-800">{stats.pending}</span>
            </div>
          </div>
        </section>

        {/* Tab Controls */}
            <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all
              ${activeTab === 'kanban' 
                ? `border-gov-600 text-gov-700` 
                : 'border-transparent text-slate-500 hover:text-slate-700'
              }
            `}
          >
            <LayoutGrid size={16} />
            Kanban Board
          </button>
          <button
            onClick={() => setActiveTab('epics')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all
              ${activeTab === 'epics' 
                ? 'border-gov-600 text-gov-700' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
              }
            `}
          >
            <Layers size={16} />
            Daftar Epic ({epics.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'kanban' ? (
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x min-h-[700px] lg:min-h-[800px]">
            {Object.values(Status).map((status) => {
              const statusTasks = tasksByStatus[status] || [];
              const sortedTasks = [...statusTasks].sort((a, b) => {
                const aTime = new Date(a.updated_at || a.updatedAt || a.created_at || a.createdAt || 0).getTime();
                const bTime = new Date(b.updated_at || b.updatedAt || b.created_at || b.createdAt || 0).getTime();
                return bTime - aTime;
              });
              
              const getColColor = () => {
                switch (status) {
                  case Status.Done: return 'bg-green-500';
                  case Status.ToDo: return 'bg-slate-400';
                  case Status.InProgress: return 'bg-gov-500';
                  default: return 'bg-orange-400';
                }
              };

              return (
                <div
                  key={status}
                  className="flex-1 min-w-[280px] sm:min-w-[320px] bg-slate-100/60 rounded-2xl border border-slate-200/50 p-4 flex flex-col h-[650px] lg:h-[750px] snap-center"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-700 text-sm">{status}</h3>
                      <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
                        {statusTasks.length}
                      </span>
                    </div>
                    <div className={`h-2 w-2 rounded-full ${getColColor()}`} />
                  </div>

                  {/* Column Tasks */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {sortedTasks.length > 0 ? (
                      sortedTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          projects={[project]}
                          users={usersList}
                          allTasks={tasks}
                          onDragStart={() => {}}
                          onClick={(t) => setSelectedTask(t)}
                          canEdit={false}
                          subtasks={subtasks.filter(s => s.parent_task_id === task.id)}
                        />
                      ))
                    ) : (
                      <div className="h-28 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-xs text-slate-400">
                        Tidak ada task
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Epics List View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {epics.length > 0 ? (
              epics.map(epic => {
                const epicTasks = tasks.filter(t => t.epicId === epic.id);
                const doneTasks = epicTasks.filter(t => t.status === Status.Done).length;
                const progress = epicTasks.length > 0 ? Math.round((doneTasks / epicTasks.length) * 100) : 0;
                
                return (
                  <div key={epic.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 text-base">{epic.name}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Target: {epic.targetDate ? new Date(epic.targetDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border 
                        ${epic.status === 'Completed' ? 'bg-green-50 border-green-100 text-green-700' : 
                          epic.status === 'In Progress' ? 'bg-blue-50 border-blue-100 text-blue-700' : 
                          'bg-slate-50 border-slate-100 text-slate-600'}
                      `}>
                        {epic.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{epic.description || 'Tidak ada deskripsi.'}</p>
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500">Progress</span>
                        <span className="text-slate-800">{progress}% ({doneTasks}/{epicTasks.length} Task)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-gov-600 h-full transition-all duration-500" 
                          style={{ width: `${progress}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full bg-white border border-dashed border-slate-300 rounded-2xl py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Layers size={24} />
                <span className="text-sm font-medium">Belum ada epic untuk project ini</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 mt-12">
        <p>© {new Date().getFullYear()} Pulse-PPA. Sistem Monitoring Kinerja Kementerian PPPA.</p>
        <p className="mt-1 text-slate-300">Dikembangkan untuk kolaborasi dan transparansi kinerja tim.</p>
      </footer>

      {/* Read-Only Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-teal-50 border border-teal-100 text-teal-700 rounded-full">
                  {selectedTask.category}
                </span>
                <h3 className="font-extrabold text-slate-800 text-lg mt-1">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* Task Meta Stats */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Status</span>
                  <span className="font-bold text-slate-700">{selectedTask.status}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Prioritas</span>
                  <span className="font-bold text-slate-700">{selectedTask.priority}</span>
                </div>
                <div className="col-span-2 border-t border-slate-200/60 pt-2 mt-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">PIC (Penanggung Jawab)</span>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {selectedTask.pic && selectedTask.pic.length > 0 ? (
                      selectedTask.pic.map((picName, idx) => {
                        const profile = userProfiles[picName];
                        return (
                          <div key={idx} className="flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-full pl-1 pr-2.5 py-0.5 shadow-sm">
                            <UserAvatar
                              name={picName}
                              profilePhoto={profile?.profilePhoto}
                              size="xs"
                            />
                            <span className="text-xs font-bold text-slate-700">{picName}</span>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-500 italic">Belum diisi</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Deskripsi</h4>
                <div className="text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100 min-h-12 whitespace-pre-wrap">
                  {selectedTask.description || 'Tidak ada deskripsi.'}
                </div>
              </div>

              {/* Subtasks / Checklist */}
              {subtasks.filter(s => s.parent_task_id === selectedTask.id).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckSquare size={14} />
                    Subtask ({subtasks.filter(s => s.parent_task_id === selectedTask.id).length})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {subtasks.filter(s => s.parent_task_id === selectedTask.id).map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <input
                          type="checkbox"
                          disabled
                          checked={sub.status === Status.Done}
                          className="h-4 w-4 rounded border-slate-300 text-gov-600 focus:ring-gov-500 disabled:opacity-80"
                        />
                        <span className={`text-xs ${sub.status === Status.Done ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}`}>
                          {sub.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklist dari Task */}
              {selectedTask.checklists && selectedTask.checklists.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckSquare size={14} />
                    Checklist ({selectedTask.checklists.length})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {selectedTask.checklists.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <input
                          type="checkbox"
                          disabled
                          checked={c.isCompleted}
                          className="h-4 w-4 rounded border-slate-300 text-gov-600 focus:ring-gov-500 disabled:opacity-80"
                        />
                        <span className={`text-xs ${c.isCompleted ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}`}>
                          {c.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lampiran Dokumen</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedTask.attachments.map((file, idx) => (
                      <a
                        key={idx}
                        href={file.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors group"
                      >
                        <span className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">{file.name}</span>
                        <Download size={14} className="text-slate-400 group-hover:text-gov-600 transition-colors shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              {selectedTask.links && selectedTask.links.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tautan Eksternal</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedTask.links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors group"
                      >
                        <span className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">{link.title || link.url}</span>
                        <ExternalLink size={14} className="text-slate-400 group-hover:text-gov-600 transition-colors shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PublicProjectView;
