// src/components/ProjectTeamSection.tsx
// Team workload section for project detail view

import React from 'react';
import { Task, Status, Priority } from '../../types';
import { Users, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ProjectStats {
    total: number;
    completed: number;
    progress: number;
    team: string[];
    documents: number;
    projectTasks: Task[];
}

interface WorkloadBreakdown {
    urgentCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
}

interface MemberWorkload {
    workloadPoints: number;
    taskCount: number;
    breakdown: WorkloadBreakdown;
}

interface WorkloadLabel {
    label: string;
    color: string;
    description: string;
}

interface ProjectTeamSectionProps {
    stats: ProjectStats | null;
    getMemberWorkloadInProject: (pic: string, projectTasks: Task[]) => MemberWorkload;
    getWorkloadLabel: (points: number, taskCount: number) => WorkloadLabel;
}

const ProjectTeamSection: React.FC<ProjectTeamSectionProps> = ({
    stats, getMemberWorkloadInProject, getWorkloadLabel
}) => {
    const projectTasks = stats?.projectTasks || [];
    const team = stats?.team || [];

    const urgentActiveCount = projectTasks.filter(
        t => t.priority === Priority.Urgent && t.status !== Status.Done
    ).length;

    return (
        <div className="space-y-8">
            {/* TEAM WORKLOAD */}
            <section>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Users size={16} /> Tim & Beban Kerja
                </h3>

                {/* Workload Info Card */}
                <div className="bg-gradient-to-r from-gov-50 to-blue-50 rounded-xl border border-gov-200 p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-gov-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">?</span>
                        </div>
                        <h4 className="font-bold text-gov-700 text-sm">Cara Hitung Beban Kerja</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { color: 'red', label: 'Urgent = 4 poin' },
                            { color: 'orange', label: 'High = 3 poin' },
                            { color: 'blue', label: 'Medium = 2 poin' },
                            { color: 'slate', label: 'Low = 1 poin' }
                        ].map(item => (
                            <div key={item.color} className="flex items-center gap-2 bg-white/60 rounded-lg p-2">
                                <div className={`w-3 h-3 bg-${item.color}-500 rounded-full`}></div>
                                <span className="text-xs font-medium text-slate-700">{item.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 text-[10px] text-gov-600 bg-white/40 rounded-lg p-2">
                        💡 <strong>Tips:</strong> Semakin tinggi poin, semakin berat beban kerja anggota tim
                    </div>
                </div>

                <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
                    {team.map((member, index) => {
                        const workload = getMemberWorkloadInProject(member, projectTasks);
                        const label = getWorkloadLabel(workload.workloadPoints, workload.taskCount);

                        const getAvatarStyle = () => {
                            if (workload.workloadPoints === 0) return 'bg-slate-100 text-slate-600';
                            if (workload.workloadPoints <= 3) return 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200';
                            if (workload.workloadPoints <= 8) return 'bg-blue-100 text-blue-700 ring-2 ring-blue-200';
                            if (workload.workloadPoints <= 15) return 'bg-orange-100 text-orange-700 ring-2 ring-orange-200';
                            return 'bg-red-100 text-red-700 ring-2 ring-red-200';
                        };

                        return (
                            <div key={`${member}-${index}`} className="group hover:bg-slate-50 rounded-lg p-3 -m-1 transition-all border-b pb-4 last:border-none">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${getAvatarStyle()}`}>
                                            {typeof member === 'string' && member.length > 0 ? member.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 group-hover:text-gov-700 transition-colors">{member}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] text-slate-400">{workload.taskCount} task aktif</p>
                                                {workload.workloadPoints > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                                        <span className="text-[10px] font-bold text-slate-600">{workload.workloadPoints} poin</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1.5 text-[10px] font-bold rounded-full ${label.color} shadow-sm`}>
                                        {label.label}
                                    </span>
                                </div>

                                {/* Progress bar */}
                                {workload.taskCount > 0 && (
                                    <div className="mb-3">
                                        <div className="flex justify-between text-[9px] text-slate-500 mb-1">
                                            <span>Beban Kerja</span>
                                            <span>{Math.min(100, (workload.workloadPoints / 20) * 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${workload.workloadPoints <= 3 ? 'bg-emerald-400' :
                                                        workload.workloadPoints <= 8 ? 'bg-blue-400' :
                                                            workload.workloadPoints <= 15 ? 'bg-orange-400' : 'bg-red-400'
                                                    }`}
                                                style={{ width: `${Math.min(100, (workload.workloadPoints / 20) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Priority breakdown */}
                                {workload.taskCount > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {workload.breakdown.urgentCount > 0 && (
                                            <div className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded-md border border-red-100">
                                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                <span className="text-[9px] font-bold">{workload.breakdown.urgentCount} Urgent</span>
                                            </div>
                                        )}
                                        {workload.breakdown.highCount > 0 && (
                                            <div className="flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded-md border border-orange-100">
                                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                                <span className="text-[9px] font-bold">{workload.breakdown.highCount} High</span>
                                            </div>
                                        )}
                                        {workload.breakdown.mediumCount > 0 && (
                                            <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                <span className="text-[9px] font-bold">{workload.breakdown.mediumCount} Medium</span>
                                            </div>
                                        )}
                                        {workload.breakdown.lowCount > 0 && (
                                            <div className="flex items-center gap-1 bg-slate-50 text-slate-700 px-2 py-1 rounded-md border border-slate-100">
                                                <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                                                <span className="text-[9px] font-bold">{workload.breakdown.lowCount} Low</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Empty state */}
                                {workload.taskCount === 0 && (
                                    <div className="text-center py-2">
                                        <span className="text-[10px] text-slate-400 italic">✨ Siap menerima tugas baru</span>
                                    </div>
                                )}
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
                        <span className="text-2xl font-bold text-slate-800">{stats?.total || 0}</span>
                        <span className="block text-[10px] text-slate-400 uppercase font-bold">Total Task</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border text-center shadow-sm">
                        <span className="text-2xl font-bold text-green-600">{stats?.completed || 0}</span>
                        <span className="block text-[10px] text-green-600/60 uppercase font-bold">Selesai</span>
                    </div>

                    <div className="col-span-2 bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center px-6">
                        <div>
                            <span className="block text-xl font-bold text-red-600">{urgentActiveCount}</span>
                            <span className="block text-[10px] text-red-400 uppercase font-bold">Urgent Active</span>
                        </div>
                        <AlertTriangle size={28} className="text-red-200" />
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ProjectTeamSection;
