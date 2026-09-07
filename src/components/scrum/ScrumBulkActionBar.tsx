import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeftRight, Flag, Users, X, Check, ChevronDown, 
  Layers, Play, Sparkles, Folder 
} from 'lucide-react';
import { Sprint, Priority, User } from '../../../types';
import CompactPICSelector from '../CompactPICSelector';

interface ScrumBulkActionBarProps {
  selectedCount: number;
  activeSprint: Sprint | null;
  plannedSprints: Sprint[];
  backlogSections: { id: string; title: string }[];
  allUsers: User[];
  onMoveTasks: (target: { type: 'sprint' | 'backlog'; id: string | null }) => void;
  onChangePriority: (priority: Priority) => void;
  onChangePic: (picList: string[]) => void;
  onClearSelection: () => void;
}

export const ScrumBulkActionBar: React.FC<ScrumBulkActionBarProps> = ({
  selectedCount,
  activeSprint,
  plannedSprints,
  backlogSections,
  allUsers,
  onMoveTasks,
  onChangePriority,
  onChangePic,
  onClearSelection
}) => {
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false);
  const [isPicMenuOpen, setIsPicMenuOpen] = useState(false);

  const moveMenuRef = useRef<HTMLDivElement>(null);
  const priorityMenuRef = useRef<HTMLDivElement>(null);
  const picMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) {
        setIsMoveMenuOpen(false);
      }
      if (priorityMenuRef.current && !priorityMenuRef.current.contains(e.target as Node)) {
        setIsPriorityMenuOpen(false);
      }
      if (picMenuRef.current && !picMenuRef.current.contains(e.target as Node)) {
        setIsPicMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slideUp">
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3.5 sm:gap-5 flex-wrap">
        
        {/* Selection Count Badge */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-100">
            {selectedCount} tugas dipilih
          </span>
        </div>

        <div className="h-4 w-[1px] bg-slate-700 hidden sm:block" />

        {/* Action 1: Move to... */}
        <div className="relative" ref={moveMenuRef}>
          <button
            type="button"
            onClick={() => {
              setIsMoveMenuOpen(!isMoveMenuOpen);
              setIsPriorityMenuOpen(false);
              setIsPicMenuOpen(false);
            }}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition-all border border-slate-700 cursor-pointer text-indigo-300 hover:text-white"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Pindahkan ke...</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isMoveMenuOpen && (
            <div className="absolute bottom-full mb-2 left-0 w-64 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-medium animate-zoomIn max-h-80 overflow-y-auto">
              
              {/* Active Sprint */}
              {activeSprint && (
                <>
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Sprint Aktif
                  </div>
                  <button
                    onClick={() => {
                      onMoveTasks({ type: 'sprint', id: activeSprint.id });
                      setIsMoveMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 cursor-pointer font-bold"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="truncate">{activeSprint.name}</span>
                  </button>
                  <div className="h-[1px] bg-slate-100 my-1" />
                </>
              )}

              {/* Planned Sprints */}
              {plannedSprints.length > 0 && (
                <>
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Sprint Direncanakan
                  </div>
                  {plannedSprints.map(ps => (
                    <button
                      key={ps.id}
                      onClick={() => {
                        onMoveTasks({ type: 'sprint', id: ps.id });
                        setIsMoveMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="truncate">{ps.name}</span>
                    </button>
                  ))}
                  <div className="h-[1px] bg-slate-100 my-1" />
                </>
              )}

              {/* Backlog Sections */}
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Field Backlog
              </div>
              {backlogSections.map(sec => (
                <button
                  key={sec.id}
                  onClick={() => {
                    onMoveTasks({ type: 'backlog', id: sec.id === 'default' ? null : sec.id });
                    setIsMoveMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2 cursor-pointer"
                >
                  <Folder className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{sec.title}</span>
                </button>
              ))}

            </div>
          )}
        </div>

        {/* Action 2: Change Priority */}
        <div className="relative" ref={priorityMenuRef}>
          <button
            type="button"
            onClick={() => {
              setIsPriorityMenuOpen(!isPriorityMenuOpen);
              setIsMoveMenuOpen(false);
              setIsPicMenuOpen(false);
            }}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition-all border border-slate-700 cursor-pointer text-amber-300 hover:text-white"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Prioritas</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isPriorityMenuOpen && (
            <div className="absolute bottom-full mb-2 left-0 w-44 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-bold animate-zoomIn">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Set Prioritas
              </div>
              {(['Low', 'Medium', 'High', 'Urgent'] as Priority[]).map((prio) => (
                <button
                  key={prio}
                  onClick={() => {
                    onChangePriority(prio);
                    setIsPriorityMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <span className={`w-2 h-2 rounded-full ${
                    prio === 'Urgent' ? 'bg-rose-500' :
                    prio === 'High' ? 'bg-orange-500' :
                    prio === 'Medium' ? 'bg-amber-500' : 'bg-slate-400'
                  }`} />
                  <span>{prio}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action 3: Change PIC */}
        <div className="relative" ref={picMenuRef}>
          <button
            type="button"
            onClick={() => {
              setIsPicMenuOpen(!isPicMenuOpen);
              setIsMoveMenuOpen(false);
              setIsPriorityMenuOpen(false);
            }}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition-all border border-slate-700 cursor-pointer text-emerald-300 hover:text-white"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Set PIC</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isPicMenuOpen && (
            <div className="absolute bottom-full mb-2 -left-12 sm:left-0 w-64 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 p-3 z-50 text-xs animate-zoomIn">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Pilih PIC untuk {selectedCount} tugas
              </div>
              <CompactPICSelector
                users={allUsers}
                selected={[]}
                onChange={(names) => {
                  onChangePic(names);
                  setIsPicMenuOpen(false);
                }}
              />
            </div>
          )}
        </div>

        <div className="h-4 w-[1px] bg-slate-700 hidden sm:block" />

        {/* Clear Selection Button */}
        <button
          type="button"
          onClick={onClearSelection}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          title="Batalkan Pilihan"
        >
          <X className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
};
