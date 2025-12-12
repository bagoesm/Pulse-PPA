// src/components/ProjectOverview.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { Task, ProjectDefinition, Status, Priority, User } from '../../types';
import { 
  Briefcase, 
  Users, 
  FileText, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle,
  Download,
  Paperclip,
  ChevronLeft,
  List,
  Search
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';       // for generating signed URLs

interface ProjectOverviewProps {
  projects: ProjectDefinition[];
  tasks: Task[];
  users: User[];   // <-- Wajib sekarang!
}

const ITEMS_PER_PAGE = 10;

const ProjectOverview: React.FC<ProjectOverviewProps> = ({ projects, tasks, users }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [taskSearch, setTaskSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'All'>('All');

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProjectId, taskSearch, statusFilter, priorityFilter]);

  // ---------------------------------------------------------------------------
  // Project-level statistics
  // ---------------------------------------------------------------------------
  const getProjectStats = (projectId: string) => {
    const projectTasks = tasks.filter(t => t.projectId === projectId);

    const total = projectTasks.length;
    const completed = projectTasks.filter(t => t.status === Status.Done).length;

    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

    // Unique team PIC (PIC = task.pic)
    const team = Array.from(new Set(projectTasks.map(t => t.pic)));

    const documents = projectTasks.flatMap(t => t.attachments || []).length;

    return { total, completed, progress, team, documents, projectTasks };
  };

  const getMemberStressInProject = (pic: string, projectTasks: Task[]) => {
    const active = projectTasks.filter(t => t.pic === pic && t.status !== Status.Done);

    let score = 0;
    active.forEach(t => {
      if (t.priority === Priority.Urgent) score += 4;
      else if (t.priority === Priority.High) score += 3;
      else if (t.priority === Priority.Medium) score += 2;
      else score += 1;
    });

    return { score, taskCount: active.length };
  };

  const getStressLabel = (score: number) => {
    if (score === 0) return { label: 'Idle', color: 'bg-slate-100 text-slate-500' };
    if (score < 4) return { label: 'Low', color: 'bg-emerald-100 text-emerald-700' };
    if (score < 8) return { label: 'Medium', color: 'bg-blue-100 text-blue-700' };
    if (score < 12) return { label: 'High', color: 'bg-orange-100 text-orange-700' };
    return { label: 'Overload', color: 'bg-red-100 text-red-700' };
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedStats = selectedProjectId ? getProjectStats(selectedProjectId) : null;

  // ---------------------------------------------------------------------------
  // Tasks Filtering + Pagination
  // ---------------------------------------------------------------------------
  const allProjectTasks = selectedStats?.projectTasks ?? [];

  const filteredProjectTasks = useMemo(() => {
    return allProjectTasks.filter(t => {
      const matchSearch =
        t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
        t.pic.toLowerCase().includes(taskSearch.toLowerCase());

      const matchStatus = statusFilter === 'All' || t.status === statusFilter;
      const matchPriority = priorityFilter === 'All' || t.priority === priorityFilter;

      return matchSearch && matchStatus && matchPriority;
    });
  }, [allProjectTasks, taskSearch, statusFilter, priorityFilter]);

  const totalPages = Math.ceil(filteredProjectTasks.length / ITEMS_PER_PAGE);

  const paginatedTasks = filteredProjectTasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ---------------------------------------------------------------------------
  // PROJECT LIST VIEW
  // ---------------------------------------------------------------------------
  if (!selectedProjectId) {
    return (
      <div className="p-8 h-full overflow-y-auto bg-slate-50">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
          <Briefcase className="text-gov-600" />
          Daftar Project
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.map(project => {
            const stats = getProjectStats(project.id);

            return (
              <div
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-gov-300 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-gov-50 group-hover:text-gov-600 transition-colors">
                    <Briefcase size={24} />
                  </div>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                    {stats.total} Task
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-gov-700">
                  {project.name}
                </h3>
                <p className="text-sm text-slate-500 mb-6 line-clamp-2 h-10">{project.description}</p>

                <div className="space-y-4">
                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium text-slate-600">Progress</span>
                      <span className="font-bold text-slate-800">{stats.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gov-500 rounded-full" style={{ width: `${stats.progress}%` }} />
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                      <Users size={14} />
                      <span>{stats.team.length} Orang</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                      <Paperclip size={14} />
                      <span>{stats.documents} File</span>
                    </div>
                    <div className="flex items-center gap-1 text-gov-600 text-xs font-bold group-hover:translate-x-1 transition-transform">
                      Detail <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PROJECT DETAIL VIEW
  // ---------------------------------------------------------------------------
  if (!selectedProject || !selectedStats) return null;

  const documentsList = selectedStats.projectTasks.flatMap(t =>
    (t.attachments || []).map(a => ({
      ...a,
      taskTitle: t.title
    }))
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center">
        <div>
          <button
            onClick={() => setSelectedProjectId(null)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-gov-600 mb-2 transition-colors font-medium"
          >
            <ArrowLeft size={16} /> Kembali ke Daftar Project
          </button>

          <h1 className="text-2xl font-bold text-slate-800">{selectedProject.name}</h1>
          <p className="text-sm text-slate-500 mt-1">{selectedProject.description}</p>
        </div>

        <div className="flex gap-6">
          <div className="text-right">
            <p className="text-xs text-slate-400 font-semibold uppercase">Project Manager</p>
            <p className="font-bold text-slate-700">{selectedProject.manager}</p>
          </div>
          <div className="text-right pl-6 border-l border-slate-100">
            <p className="text-xs text-slate-400 font-semibold uppercase">Progress</p>
            <p className="font-bold text-gov-600 text-lg">{selectedStats.progress}%</p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* LEFT COLUMN */}
          <div className="xl:col-span-2 space-y-8">
            {/* TASK LIST */}
            <section>
              <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <List size={16} /> Daftar Tugas ({filteredProjectTasks.length})
                </h3>

                <div className="flex gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari..."
                      value={taskSearch}
                      onChange={(e) => setTaskSearch(e.target.value)}
                      className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-400 outline-none w-40"
                    />
                  </div>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as Status | 'All')}
                    className="px-2 py-1.5 text-xs border rounded-lg bg-white text-slate-600"
                  >
                    <option value="All">Semua Status</option>
                    {Object.values(Status).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  {/* Priority Filter */}
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as Priority | 'All')}
                    className="px-2 py-1.5 text-xs border rounded-lg bg-white text-slate-600"
                  >
                    <option value="All">Semua Prioritas</option>
                    {Object.values(Priority).map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TASK TABLE */}
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {paginatedTasks.length > 0 ? (
                  <>
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Task</th>
                          <th className="px-4 py-3">PIC</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Prioritas</th>
                          <th className="px-4 py-3 text-right">Deadline</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y">
                        {paginatedTasks.map(task => (
                          <tr key={task.id} className="hover:bg-slate-50 transition">
                            {/* Name */}
                            <td className="px-4 py-3 font-medium text-slate-800">
                              <div>{task.title}</div>
                              <div className="text-[10px] text-slate-400">{task.subCategory}</div>
                            </td>

                            {/* PIC */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                  {task.pic.charAt(0)}
                                </div>
                                <span className="text-slate-600">{task.pic}</span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${
                                task.status === Status.Done
                                  ? 'bg-green-100 text-green-700'
                                  : task.status === Status.ToDo
                                  ? 'bg-slate-100 text-slate-600'
                                  : task.status === Status.InProgress
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {task.status}
                              </span>
                            </td>

                            {/* Priority */}
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${
                                task.priority === Priority.Urgent
                                  ? 'bg-red-100 text-red-700'
                                  : task.priority === Priority.High
                                  ? 'bg-orange-100 text-orange-700'
                                  : task.priority === Priority.Medium
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {task.priority}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-right text-xs text-slate-500 font-mono">
                              {task.deadline}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t">
                      <span className="text-xs text-slate-500">
                        Halaman <b>{currentPage}</b> dari {totalPages || 1}
                      </span>

                      <div className="flex gap-2">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(p => p - 1)}
                          className="p-1.5 rounded-md border disabled:opacity-40 hover:bg-slate-100"
                        >
                          <ChevronLeft size={14} />
                        </button>

                        <button
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(p => p + 1)}
                          className="p-1.5 rounded-md border disabled:opacity-40 hover:bg-slate-100"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-slate-400">
                    Tidak ada task sesuai filter
                  </div>
                )}
              </div>
            </section>

            {/* DOCUMENTS SECTION */}
            <section>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText size={16} /> Dokumen Project ({documentsList.length})
              </h3>

              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {documentsList.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Nama File</th>
                        <th className="px-4 py-3">Tipe</th>
                        <th className="px-4 py-3">Task</th>
                        <th className="px-4 py-3 text-right">Download</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {documentsList.map((d, i) => (
                        <tr key={`${d.id}-${i}`} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 flex items-center gap-2 text-slate-700">
                            <FileText size={16} className="text-gov-500" />
                            {d.name}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{d.type || 'FILE'}</td>
                          <td className="px-4 py-3 text-slate-500">{d.taskTitle}</td>
                          <td className="px-4 py-3 text-right">
  <button
    onClick={async () => {
      try {
        if (d.url) {
          window.open(d.url, "_blank");
          return;
        }
        // fallback: if we have a storage path but no url, create signed url on demand
        if (d.path) {
          const { data, error } = await supabase
            .storage
            .from('attachment')
            .createSignedUrl(d.path, 60 * 60);
          if (error || !data?.signedUrl) {
            alert('Gagal membuat URL download.');
            return;
          }
          window.open(data.signedUrl, '_blank');
          return;
        }
        alert('File belum tersedia untuk di-download.');
      } catch (err) {
        console.error(err);
        alert('Terjadi kesalahan saat mencoba download file.');
      }
    }}
    className="p-1.5 text-slate-400 hover:text-gov-600 hover:bg-gov-50 rounded transition-colors"
    aria-label={`Download ${d.name}`}
  >
    <Download size={16} />
  </button>
</td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-slate-400">
                    Belum ada dokumen yang diunggah.
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-8">
            {/* TEAM STRESS */}
            <section>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users size={16} /> Tim & Beban Kerja
              </h3>

              <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
                {selectedStats.team.map(member => {
                  const stress = getMemberStressInProject(member, selectedStats.projectTasks);
                  const label = getStressLabel(stress.score);

                  return (
                    <div key={member} className="flex items-center justify-between border-b pb-3 last:border-none">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-700">
                          {member.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{member}</p>
                          <p className="text-[10px] text-slate-400">{stress.taskCount} Task Aktif</p>
                        </div>
                      </div>

                      <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${label.color}`}>
                        {label.label} ({stress.score})
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* SUMMARY STATS */}
            <section>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CheckCircle2 size={16} /> Statistik
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border text-center shadow-sm">
                  <span className="text-2xl font-bold text-slate-800">{selectedStats.total}</span>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Total Task</span>
                </div>

                <div className="bg-white p-4 rounded-xl border text-center shadow-sm">
                  <span className="text-2xl font-bold text-green-600">{selectedStats.completed}</span>
                  <span className="block text-[10px] text-green-600/60 uppercase font-bold">Selesai</span>
                </div>

                <div className="col-span-2 bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center px-6">
                  <div>
                    <span className="block text-xl font-bold text-red-600">
                      {selectedStats.projectTasks.filter(
                        t => t.priority === Priority.Urgent && t.status !== Status.Done
                      ).length}
                    </span>
                    <span className="block text-[10px] text-red-400 uppercase font-bold">Urgent Active</span>
                  </div>

                  <AlertTriangle size={28} className="text-red-200" />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectOverview;
