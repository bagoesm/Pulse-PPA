// src/components/ProjectEpicsSection.tsx
import React from 'react';
import { Epic, Task } from '../../types';
import { Plus, Layers } from 'lucide-react';
import EpicCard from './EpicCard';

interface ProjectEpicsSectionProps {
    epics: Epic[];
    projectTasks: Task[];
    getEpicProgress: (epicId: string, tasks: Task[]) => number;
    onEpicClick?: (epic: Epic) => void;
    onEditEpic?: (epic: Epic) => void;
    onDeleteEpic?: (epicId: string) => Promise<void>;
    onCreateEpic?: () => void;
    canManage?: boolean;
}

const ProjectEpicsSection: React.FC<ProjectEpicsSectionProps> = ({
    epics,
    projectTasks,
    getEpicProgress,
    onEpicClick,
    onEditEpic,
    onDeleteEpic,
    onCreateEpic,
    canManage = false
}) => {
    return (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                        <Layers size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Epics & Milestones</h3>
                        <p className="text-[11px] text-slate-500 font-medium">Pengelompokan fitur dan target utama project</p>
                    </div>
                </div>
                {canManage && onCreateEpic && (
                    <button
                        onClick={onCreateEpic}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-purple-200 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-50 transition-all shadow-sm"
                    >
                        <Plus size={14} />
                        Tambah Epic
                    </button>
                )}
            </div>

            <div className="p-6">
                {epics.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
                        <div className="p-3 bg-white rounded-full text-slate-300 mb-3 shadow-sm">
                            <Layers size={32} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-700">Belum ada Epic</h4>
                        <p className="text-xs text-slate-500 max-w-[240px] mt-1 italic">
                            Gunakan Epic untuk mengelompokkan task ke dalam fitur atau milestone besar.
                        </p>
                        {canManage && onCreateEpic && (
                            <button
                                onClick={onCreateEpic}
                                className="mt-4 text-xs font-bold text-purple-600 hover:text-purple-700"
                            >
                                + Buat Epic Pertama
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {epics.map(epic => (
                            <EpicCard
                                key={epic.id}
                                epic={epic}
                                tasks={projectTasks.filter(t => t.epicId === epic.id)}
                                onEdit={() => onEditEpic && onEditEpic(epic)}
                                onDelete={() => onDeleteEpic && onDeleteEpic(epic.id)}
                                onClick={() => onEpicClick && onEpicClick(epic)}
                                progress={getEpicProgress(epic.id, projectTasks)}
                                canEdit={canManage}
                                canDelete={canManage}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default ProjectEpicsSection;
