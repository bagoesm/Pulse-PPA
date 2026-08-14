// src/components/ScrumBoard.tsx
// Scrum module with Jira-style Vertical Backlog Planning, Sprint management, Kanban Board, Story Points, and Subtask integration
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { queryClient } from '../lib/queryClient';
import { 
  Layers, Plus, RefreshCw, Trash2, Calendar, Target,
  CheckCircle2, AlertCircle, ChevronDown, ChevronRight,
  Play, Check, X, ArrowLeftRight, Clock, User, Sparkles,
  HelpCircle, ChevronUp, GripVertical, AlertTriangle, ArrowRight, ArrowLeft
} from 'lucide-react';

// Context Hooks
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectsContext';
import { useSprints } from '../contexts/SprintsContext';
import { useTasks } from '../contexts/TasksContext';
import { useSubtasks } from '../contexts/SubtasksContext';
import { useUI } from '../contexts/UIContext';
import { useUsers } from '../contexts/UsersContext';

import SearchableSelect from './SearchableSelect';
import CompactPICSelector from './CompactPICSelector';
import PICDisplay from './PICDisplay';
import { Task, Sprint, Subtask, Status, SprintStatus, User as UserType } from '../../types';

const ScrumBoard: React.FC = () => {
  const { currentUser } = useAuth();
  const { projects, isProjectsLoading } = useProjects();
  const { 
    sprints, 
    createSprint, 
    updateSprint, 
    deleteSprint, 
    assignTaskToSprint,
    isSprintsLoading
  } = useSprints();
  const { tasks, isTasksLoading } = useTasks();
  const { subtasks, getSubtasksByParent } = useSubtasks();
  const { showConfirm, showToast, showNotification, draggedTaskId, setDraggedTaskId, setViewingTask, setIsTaskViewModalOpen } = useUI();
  const { allUsers } = useUsers();

  // Selected project state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // Tab state: 'planning' (Backlog & Planning) | 'board' (Active Sprint Board)
  const [activeTab, setActiveTab] = useState<'planning' | 'board'>('planning');



  // Local Backlog Filter States
  const [backlogSearch, setBacklogSearch] = useState('');
  const [backlogCategory, setBacklogCategory] = useState('All');
  const [backlogPriority, setBacklogPriority] = useState('All');

  // Accordion toggle states for Sprints and Backlog in Jira-style list
  const [expandedSprintIds, setExpandedSprintIds] = useState<Record<string, boolean>>({
    'backlog': true // backlog open by default
  });

  // Subtask accordion toggles on Kanban Board
  const [expandedTaskSubtasks, setExpandedTaskSubtasks] = useState<Record<string, boolean>>({});

  // inline SP edit task ID
  const [editingSpTaskId, setEditingSpTaskId] = useState<string | null>(null);
  const [tempSpValue, setTempSpValue] = useState<string>('');

  // inline PIC edit state
  const [editingPicTaskId, setEditingPicTaskId] = useState<string | null>(null);

  // Backlog Sorting state
  const [backlogSortBy, setBacklogSortBy] = useState<string>('created_desc');

  const sortOptions = [
    { value: 'created_desc', label: 'Terbaru Dibuat' },
    { value: 'created_asc', label: 'Terlama Dibuat' },
    { value: 'priority_desc', label: 'Prioritas (Tinggi ke Rendah)' },
    { value: 'priority_asc', label: 'Prioritas (Rendah ke Tinggi)' },
    { value: 'sp_desc', label: 'Story Points (Tinggi ke Rendah)' },
    { value: 'sp_asc', label: 'Story Points (Rendah ke Tinggi)' },
    { value: 'title_asc', label: 'Judul (A-Z)' },
    { value: 'title_desc', label: 'Judul (Z-A)' },
  ];

  // Sprint Creation Form Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintGoal, setNewSprintGoal] = useState('');
  const [newSprintDesc, setNewSprintDesc] = useState('');
  const [newSprintStart, setNewSprintStart] = useState('');
  const [newSprintEnd, setNewSprintEnd] = useState('');
  const [isSubmittingSprint, setIsSubmittingSprint] = useState(false);

  // Subtask creation state
  const [addingSubtaskTaskId, setAddingSubtaskTaskId] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Selected Project Object
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  // Projects with active sprints
  const projectsWithActiveSprint = useMemo(() => {
    return projects.filter(proj => 
      sprints.some(s => s.projectId === proj.id && s.status === 'Active')
    );
  }, [projects, sprints]);

  // Projects without active sprints
  const otherProjects = useMemo(() => {
    return projects.filter(proj => 
      !sprints.some(s => s.projectId === proj.id && s.status === 'Active')
    );
  }, [projects, sprints]);

  // Project Sprints
  const projectSprints = useMemo(() => {
    if (!selectedProjectId) return [];
    return sprints.filter(s => s.projectId === selectedProjectId);
  }, [sprints, selectedProjectId]);

  // Project Tasks (all tasks belonging to this project)
  const projectTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return tasks.filter(t => t.projectId === selectedProjectId);
  }, [tasks, selectedProjectId]);

  // Backlog tasks (project tasks with no sprint assigned, excluding completed ones, applying local search, filters & sorting)
  const backlogTasks = useMemo(() => {
    let filtered = projectTasks.filter(t => !t.sprintId && t.status !== Status.Done);
    
    if (backlogSearch.trim() !== '') {
      const q = backlogSearch.toLowerCase();
      filtered = filtered.filter(t => t.title.toLowerCase().includes(q));
    }
    
    if (backlogCategory !== 'All') {
      filtered = filtered.filter(t => t.category === backlogCategory);
    }
    
    if (backlogPriority !== 'All') {
      filtered = filtered.filter(t => t.priority === backlogPriority);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (backlogSortBy === 'created_desc') {
        return new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime();
      }
      if (backlogSortBy === 'created_asc') {
        return new Date(a.createdAt || a.created_at || 0).getTime() - new Date(b.createdAt || b.created_at || 0).getTime();
      }
      if (backlogSortBy === 'title_asc') {
        return a.title.localeCompare(b.title);
      }
      if (backlogSortBy === 'title_desc') {
        return b.title.localeCompare(a.title);
      }
      if (backlogSortBy === 'sp_desc') {
        return (b.storyPoints || 0) - (a.storyPoints || 0);
      }
      if (backlogSortBy === 'sp_asc') {
        return (a.storyPoints || 0) - (b.storyPoints || 0);
      }
      if (backlogSortBy === 'priority_desc' || backlogSortBy === 'priority_asc') {
        const priorityWeight = { 'Urgent': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
        const wA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
        const wB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
        return backlogSortBy === 'priority_desc' ? wB - wA : wA - wB;
      }
      return 0;
    });
    
    return filtered;
  }, [projectTasks, backlogSearch, backlogCategory, backlogPriority, backlogSortBy]);

  // Unique categories in project tasks for backlog filtering
  const uniqueCategories = useMemo(() => {
    const cats = new Set(projectTasks.map(t => t.category).filter(Boolean));
    return Array.from(cats);
  }, [projectTasks]);

  // Active Sprint
  const activeSprint = useMemo(() => {
    return projectSprints.find(s => s.status === 'Active');
  }, [projectSprints]);

  // Expand / collapse section helper
  const toggleSprintAccordion = (sprintId: string) => {
    setExpandedSprintIds(prev => ({
      ...prev,
      [sprintId]: !prev[sprintId]
    }));
  };

  // Expand / collapse subtask accordion helper
  const toggleTaskSubtasks = (taskId: string) => {
    setExpandedTaskSubtasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  // Calculate sum of story points
  const getSprintStoryPoints = useCallback((sprintId: string) => {
    return projectTasks
      .filter(t => t.sprintId === sprintId)
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  }, [projectTasks]);

  // Handle Drag Start
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle Drop onto Backlog Section
  const handleDropToBacklog = async (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = draggedTaskId;
    if (!taskId) return;

    const task = projectTasks.find(t => t.id === taskId);
    if (!task || !task.sprintId) {
      setDraggedTaskId(null);
      return; // already in backlog
    }

    const success = await assignTaskToSprint(taskId, null);
    if (success) {
      showToast(`Task "${task.title}" dipindahkan ke Backlog.`, 'info');
    }
    setDraggedTaskId(null);
  };

  // Handle Drop onto a Sprint Section
  const handleDropToSprint = async (e: React.DragEvent, targetSprint: Sprint) => {
    e.preventDefault();
    const taskId = draggedTaskId;
    if (!taskId) return;

    const task = projectTasks.find(t => t.id === taskId);
    if (!task) {
      setDraggedTaskId(null);
      return;
    }
    if (task.sprintId === targetSprint.id) {
      setDraggedTaskId(null);
      return; // already in this sprint
    }

    // Scope Creep Warning: Check if target sprint is Active
    if (targetSprint.status === 'Active') {
      showConfirm(
        '⚠️ Scope Creep Warning',
        `Peringatan: Sprint "${targetSprint.name}" sedang berjalan (Active). Menambahkan tugas baru di tengah sprint dapat mengacaukan estimasi awal.\n\nApakah Anda yakin ingin menambahkan "${task.title}" ke sprint yang aktif?`,
        async () => {
          const success = await assignTaskToSprint(taskId, targetSprint.id);
          if (success) {
            showToast(`Task "${task.title}" dimasukkan ke Active Sprint "${targetSprint.name}".`, 'warning');
          }
          setDraggedTaskId(null);
        },
        'warning',
        'Ya, Tambahkan',
        'Batal'
      );
    } else {
      const success = await assignTaskToSprint(taskId, targetSprint.id);
      if (success) {
        showToast(`Task "${task.title}" dimasukkan ke Sprint "${targetSprint.name}".`, 'success');
      }
      setDraggedTaskId(null);
    }
  };

  // Handle Drop onto Kanban Columns (Sprint Board)
  const handleDropToKanbanColumn = async (e: React.DragEvent, targetStatus: Status) => {
    e.preventDefault();
    const taskId = draggedTaskId;
    if (!taskId) return;

    const task = projectTasks.find(t => t.id === taskId);
    if (!task || task.status === targetStatus) {
      setDraggedTaskId(null);
      return;
    }

    await updateTaskStatus(task, targetStatus);
    setDraggedTaskId(null);
  };

  // Helper to update status directly (fallback for drag failure)
  const updateTaskStatus = async (task: Task, targetStatus: Status) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: targetStatus,
          updated_status_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast(`Status task "${task.title}" diperbarui menjadi ${targetStatus}.`, 'success');
    } catch (err) {
      console.error('Error updating task status:', err);
      showToast('Gagal memindahkan task.', 'error');
    }
  };

  // Move task directly using the Quick Button
  const handleMoveTaskDirectly = async (task: Task, targetSprint: Sprint) => {
    if (targetSprint.status === 'Active') {
      showConfirm(
        '⚠️ Scope Creep Warning',
        `Peringatan: Sprint "${targetSprint.name}" sedang berjalan (Active). Menambahkan tugas baru di tengah sprint dapat mengacaukan estimasi awal.\n\nApakah Anda yakin ingin menambahkan "${task.title}" ke sprint yang aktif?`,
        async () => {
          const success = await assignTaskToSprint(task.id, targetSprint.id);
          if (success) {
            showToast(`Task "${task.title}" dimasukkan ke Active Sprint "${targetSprint.name}".`, 'warning');
          }
        },
        'warning',
        'Ya, Tambahkan',
        'Batal'
      );
    } else {
      const success = await assignTaskToSprint(task.id, targetSprint.id);
      if (success) {
        showToast(`Task "${task.title}" dimasukkan ke Sprint "${targetSprint.name}".`, 'success');
      }
    }
  };

  // Move task via Dropdown selector (100% reliable fallback)
  const handleMoveTaskDropdown = async (task: Task, targetSprintId: string | null) => {
    if (task.sprintId === targetSprintId) return;

    if (targetSprintId === null) {
      const success = await assignTaskToSprint(task.id, null);
      if (success) {
        showToast(`Task "${task.title}" dipindahkan ke Backlog.`, 'info');
      }
      return;
    }

    const targetSprint = projectSprints.find(s => s.id === targetSprintId);
    if (!targetSprint) return;

    if (targetSprint.status === 'Active') {
      showConfirm(
        '⚠️ Scope Creep Warning',
        `Peringatan: Sprint "${targetSprint.name}" sedang berjalan (Active). Menambahkan tugas di tengah sprint dapat meningkatkan beban kerja (Scope Creep).\n\nApakah Anda yakin ingin memindahkan "${task.title}"?`,
        async () => {
          const success = await assignTaskToSprint(task.id, targetSprintId);
          if (success) {
            showToast(`Task "${task.title}" dimasukkan ke Active Sprint "${targetSprint.name}".`, 'warning');
          }
        },
        'warning',
        'Ya, Pindahkan',
        'Batal'
      );
    } else {
      const success = await assignTaskToSprint(task.id, targetSprintId);
      if (success) {
        showToast(`Task "${task.title}" dimasukkan ke Sprint "${targetSprint.name}".`, 'success');
      }
    }
  };

  // Handle inline SP update
  const handleSaveSp = async (taskId: string) => {
    const points = tempSpValue === '' ? null : parseInt(tempSpValue, 10);
    if (points !== null && (isNaN(points) || points < 0)) {
      showToast('Estimasi poin harus berupa angka positif.', 'warning');
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          story_points: points
        })
        .eq('id', taskId);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditingSpTaskId(null);
      showToast('Estimasi bobot berhasil diperbarui.', 'success');
    } catch (err) {
      console.error('Error updating story points:', err);
      showToast('Gagal memperbarui story points.', 'error');
    }
  };

  // Handle inline PIC update (multiple user names array)
  const handleSavePic = async (taskId: string, selectedPicNames: string[]) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          pic: selectedPicNames
        })
        .eq('id', taskId);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast('PIC tugas berhasil diperbarui.', 'success');
    } catch (err) {
      console.error('Error updating task PIC:', err);
      showToast('Gagal memperbarui PIC tugas.', 'error');
    }
  };

  // Toggle Subtask Completion Status
  const handleToggleSubtask = async (subtask: Subtask) => {
    const newStatus = subtask.status === 'Done' ? 'To Do' : 'Done';
    try {
      const { error } = await supabase
        .from('subtasks')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', subtask.id);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Re-fetch to update subtask counts
      showToast(`Subtask "${subtask.title}" diperbarui.`, 'success');
    } catch (err) {
      console.error('Error toggling subtask:', err);
      showToast('Gagal memperbarui status subtask.', 'error');
    }
  };

  // Inline subtask creation
  const handleAddSubtaskSubmit = async (parentTaskId: string) => {
    if (!newSubtaskTitle.trim() || !currentUser) return;

    try {
      const existingCount = subtasks.filter(s => s.parentTaskId === parentTaskId).length;
      const dbData = {
        parent_task_id: parentTaskId,
        title: newSubtaskTitle.trim(),
        description: '',
        pic: [],
        priority: 'Medium',
        status: 'To Do',
        sort_order: existingCount,
        created_by: currentUser.name,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('subtasks')
        .insert([dbData]);

      if (error) throw error;

      setNewSubtaskTitle('');
      setAddingSubtaskTaskId(null);
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast('Subtask berhasil ditambahkan.', 'success');
    } catch (err: any) {
      console.error('Error creating subtask:', err);
      showNotification('Gagal Membuat Subtask', err.message, 'error');
    }
  };

  // Create Sprint Submission
  const handleCreateSprintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSprintName.trim() || !selectedProjectId) return;

    setIsSubmittingSprint(true);
    try {
      const success = await createSprint({
        name: newSprintName.trim(),
        goal: newSprintGoal.trim() || undefined,
        description: newSprintDesc.trim() || undefined,
        projectId: selectedProjectId,
        status: 'Planned',
        startDate: newSprintStart || undefined,
        endDate: newSprintEnd || undefined
      });

      if (success) {
        setIsCreateModalOpen(false);
        setNewSprintName('');
        setNewSprintGoal('');
        setNewSprintDesc('');
        setNewSprintStart('');
        setNewSprintEnd('');
        showToast('Sprint berhasil direncanakan.', 'success');
      } else {
        showToast('Gagal merencanakan Sprint.', 'error');
      }
    } finally {
      setIsSubmittingSprint(false);
    }
  };

  // Start a Sprint (Planned -> Active)
  const handleStartSprint = (sprint: Sprint) => {
    const active = projectSprints.find(s => s.status === 'Active');
    if (active) {
      showNotification(
        'Sprint Aktif Terdeteksi',
        `Anda tidak dapat memulai "${sprint.name}" karena Sprint "${active.name}" sedang aktif. Selesaikan sprint aktif terlebih dahulu.`,
        'warning'
      );
      return;
    }

    showConfirm(
      'Mulai Sprint',
      `Apakah Anda yakin ingin memulai sprint "${sprint.name}"? Ini akan mengubah status sprint menjadi Active.`,
      async () => {
        const success = await updateSprint(sprint.id, { 
          status: 'Active',
          startDate: new Date().toISOString()
        });
        if (success) {
          showToast(`Sprint "${sprint.name}" telah dimulai!`, 'success');
          setActiveTab('board');
        } else {
          showToast('Gagal memulai sprint.', 'error');
        }
      },
      'info',
      'Mulai',
      'Batal'
    );
  };

  // Complete a Sprint (Active -> Completed)
  const handleCompleteSprint = (sprint: Sprint) => {
    const sprintTasks = projectTasks.filter(t => t.sprintId === sprint.id);
    const unfinishedTasks = sprintTasks.filter(t => t.status !== Status.Done);

    showConfirm(
      'Selesaikan Sprint',
      `Apakah Anda yakin ingin menyelesaikan sprint "${sprint.name}"?\n\n` + 
      (unfinishedTasks.length > 0 
        ? `⚠️ Terdeteksi ${unfinishedTasks.length} tugas yang BELUM selesai. Tugas-tugas ini otomatis akan dikembalikan ke Backlog.`
        : '🎉 Semua tugas dalam sprint ini telah diselesaikan dengan sukses!'),
      async () => {
        for (const task of unfinishedTasks) {
          await assignTaskToSprint(task.id, null);
        }
        
        const success = await updateSprint(sprint.id, { 
          status: 'Completed',
          endDate: new Date().toISOString()
        });

        if (success) {
          showToast(`Sprint "${sprint.name}" berhasil diselesaikan!`, 'success');
          setActiveTab('planning');
        } else {
          showToast('Gagal menyelesaikan sprint.', 'error');
        }
      },
      unfinishedTasks.length > 0 ? 'warning' : 'success',
      'Selesaikan',
      'Batal'
    );
  };

  // Render a list of tasks for the vertical list layout (Jira-style)
  const renderTaskList = (tasksList: Task[], sprintId: string | null, isSprintCompleted = false) => {
    if (tasksList.length === 0) {
      return (
        <div className="text-center py-5 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-white/40">
          Tidak ada tugas di dalam section ini. Drag task di sini atau gunakan dropdown pemindah.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {tasksList.map(task => {
          const isEditingSp = editingSpTaskId === task.id;
          return (
            <div
              key={task.id}
              draggable={!isSprintCompleted}
              onDragStart={(e) => handleDragStart(e, task.id)}
              className={`flex flex-col md:flex-row md:items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:border-gov-200 hover:shadow-xs transition-all gap-3 group/row ${
                isSprintCompleted ? 'opacity-70' : 'cursor-grab active:cursor-grabbing'
              }`}
            >
              {/* Task Left: Drag handle & Title details */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {!isSprintCompleted && (
                  <div className="text-slate-400 p-0.5 hover:bg-slate-50 rounded cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4 flex-shrink-0" />
                  </div>
                )}
                
                <div 
                  onClick={() => {
                    setViewingTask(task);
                    setIsTaskViewModalOpen(true);
                  }}
                  className="min-w-0 flex-1 cursor-pointer hover:opacity-85"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] bg-slate-100 text-slate-500 font-extrabold px-1.5 py-0.5 rounded uppercase">
                      {task.category}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold border ${
                      task.priority === 'Urgent' || task.priority === 'High'
                        ? 'bg-rose-50 border-rose-100 text-rose-700'
                        : task.priority === 'Medium'
                        ? 'bg-amber-50 border-amber-100 text-amber-700'
                        : 'bg-slate-50 border-slate-100 text-slate-600'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 mt-1 truncate group-hover/row:text-gov-600 group-hover/row:underline">{task.title}</h4>
                </div>
              </div>

              {/* Task Right: PIC, SP Badge, and Quick Move Buttons */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-100 pt-2.5 md:pt-0">
                {/* PIC Display */}
                {editingPicTaskId === task.id ? (
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <div className="w-56">
                      <CompactPICSelector
                        users={allUsers}
                        selected={task.pic || []}
                        onChange={(selectedNames) => handleSavePic(task.id, selectedNames)}
                      />
                    </div>
                    <button
                      onClick={() => setEditingPicTaskId(null)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                      title="Selesai"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSprintCompleted) return;
                      setEditingPicTaskId(task.id);
                    }}
                    disabled={isSprintCompleted}
                    title="Klik untuk ubah PIC"
                    className="flex items-center gap-1.5 text-slate-500 hover:text-gov-600 font-semibold cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100/80 px-2 py-1 rounded-lg border border-transparent hover:border-slate-200 transition-all truncate"
                  >
                    <PICDisplay pic={task.pic || []} users={allUsers} maxVisible={3} size="sm" showNames={true} />
                  </button>
                )}

                {/* Story Points Inline Editor */}
                {isEditingSp ? (
                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded border border-slate-200 animate-fadeIn">
                    <input
                      type="text"
                      value={tempSpValue}
                      placeholder="SP"
                      onChange={(e) => setTempSpValue(e.target.value)}
                      className="w-10 border border-slate-300 rounded px-1 py-0.5 text-center text-xs font-bold focus:outline-none focus:ring-1 focus:ring-gov-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveSp(task.id);
                        if (e.key === 'Escape') setEditingSpTaskId(null);
                      }}
                    />
                    <button onClick={() => handleSaveSp(task.id)} className="p-0.5 text-emerald-600 hover:bg-slate-100 rounded">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setEditingSpTaskId(null)} className="p-0.5 text-rose-600 hover:bg-slate-100 rounded">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (isSprintCompleted) return;
                      setEditingSpTaskId(task.id);
                      setTempSpValue(task.storyPoints !== null ? String(task.storyPoints) : '');
                    }}
                    disabled={isSprintCompleted}
                    title="Klik untuk ubah Story Points"
                    className="text-[10px] bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 px-2 py-1 rounded-lg border border-indigo-100 font-extrabold transition-all flex items-center gap-0.5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span>SP:</span>
                    <span>{task.storyPoints !== null ? task.storyPoints : '-'}</span>
                  </button>
                )}

                {/* Quick Add to Sprint Button (For Backlog tasks) */}
                {sprintId === null && projectSprints.filter(s => s.status !== 'Completed').length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const targetSprint = activeSprint || projectSprints.filter(s => s.status === 'Planned')[0];
                      if (targetSprint) {
                        handleMoveTaskDirectly(task, targetSprint);
                      }
                    }}
                    className="p-1.5 bg-gov-50 hover:bg-gov-100 text-gov-600 rounded-lg border border-gov-100/60 font-extrabold transition-all flex items-center justify-center cursor-pointer shadow-3xs"
                    title={`Masukkan ke ${activeSprint ? 'Sprint Aktif: ' + activeSprint.name : 'Sprint: ' + projectSprints.filter(s => s.status === 'Planned')[0].name}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Return to Backlog Button (For tasks already inside a planned or active sprint) */}
                {sprintId !== null && !isSprintCompleted && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveTaskDropdown(task, null); // moves back to backlog
                    }}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg border border-slate-200/80 font-extrabold transition-all flex items-center justify-center cursor-pointer shadow-3xs"
                    title="Kembalikan ke Backlog"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 w-full min-h-0 bg-slate-50 overflow-hidden font-sans">
      
      {/* 1. TOP HEADER SELECT BAR */}
      <div className="bg-white border-b border-slate-200/80 px-6 sm:px-8 py-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gov-50 text-gov-600 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">Papan Scrum Birodatin</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Kelola backlog, bobot poin, jalankan sprint, dan pantau subtask autoload secara terintegrasi.</p>
        </div>

        {/* Project Selector Dropdown */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {isProjectsLoading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin text-gov-500" />
              <span>Memuat proyek...</span>
            </div>
          ) : (
            <SearchableSelect
              options={projects.map(p => ({ value: p.id, label: p.name }))}
              value={selectedProjectId}
              onChange={(val) => {
                setSelectedProjectId(val || '');
                setActiveTab('planning'); // default tab on project switch
              }}
              placeholder="Pilih Proyek Scrum..."
              emptyOption="-- Pilih Proyek Scrum --"
              className="w-full sm:w-72"
            />
          )}
        </div>
      </div>

      {/* 2. NO PROJECT SELECTED VIEW */}
      {!selectedProjectId ? (
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/30 custom-scrollbar text-left w-full">
          <div className="space-y-6 sm:space-y-8 animate-fadeIn text-left w-full">
            {/* Header info */}
            <div className="text-left">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">Pilih Proyek Scrum</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">Pilih proyek di bawah ini untuk mengelola sprint backlog, melihat papan Scrum, dan melacak story points.</p>
            </div>

            {/* SECTION 1: PROJECTS WITH ACTIVE SPRINTS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Proyek dengan Sprint Aktif</h3>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  {projectsWithActiveSprint.length} Proyek
                </span>
              </div>

              {projectsWithActiveSprint.length === 0 ? (
                <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-8 text-center text-slate-500 text-sm">
                  Tidak ada proyek dengan sprint yang berjalan saat ini. Anda dapat memulai sprint baru dari menu dropdown proyek di kanan atas.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {projectsWithActiveSprint.map(proj => {
                    const activeSprint = sprints.find(s => s.projectId === proj.id && s.status === 'Active');
                    const sprintTasks = tasks.filter(t => t.sprintId === activeSprint?.id);
                    const sprintSp = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
                    const sprintDone = sprintTasks.filter(t => t.status === Status.Done).length;

                    return (
                      <div
                        key={proj.id}
                        onClick={() => {
                          setSelectedProjectId(proj.id);
                          setActiveTab('board'); // Go directly to active board!
                        }}
                        className="bg-white border border-slate-200 hover:border-gov-400 hover:shadow-md rounded-xl p-4 sm:p-6 cursor-pointer transition-all flex flex-col justify-between group relative overflow-hidden text-left"
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50/20 rounded-bl-full flex items-center justify-center -mr-3 -mt-3 transition-all group-hover:bg-emerald-50/45">
                          <Clock className="w-4.5 h-4.5 text-emerald-500/60 mr-3 mt-3" />
                        </div>

                        <div className="space-y-3">
                          <h4 className="font-bold text-slate-800 text-sm sm:text-base leading-tight group-hover:text-gov-600 transition-colors pr-6">
                            {proj.name}
                          </h4>
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {proj.description || 'Tidak ada deskripsi proyek.'}
                          </p>

                          {activeSprint && (
                            <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-3 space-y-2 mt-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-700">{activeSprint.name}</span>
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] px-2 py-0.5 rounded font-bold">
                                  Aktif
                                </span>
                              </div>
                              
                              <div className="flex justify-between items-center text-[10px] text-slate-500">
                                <span>{sprintTasks.length} Tugas • {sprintSp} SP</span>
                                <span className="font-bold text-emerald-700">
                                  {sprintTasks.length > 0 ? Math.round((sprintDone / sprintTasks.length) * 100) : 0}% Selesai
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-400 font-medium">
                          <span>Manajer: <strong className="text-slate-650 font-semibold">{proj.manager || '-'}</strong></span>
                          <span className="text-gov-600 font-bold group-hover:underline flex items-center gap-0.5">
                            Buka Papan <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* 3. TABS AND SUMMARY STATS */}
          <div className="bg-white border-b border-slate-200 px-6 sm:px-8 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            
            {/* Horizontal Tabs */}
            <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setSelectedProjectId('')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-800 transition-all rounded-lg hover:bg-white hover:shadow-2xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-400" />
                Pilih Proyek
              </button>
              <div className="w-px h-6 bg-slate-200 self-center mx-1" />

              <button
                onClick={() => setActiveTab('planning')}
                className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'planning'
                    ? 'bg-white text-gov-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Backlog & Planning
              </button>
              <button
                onClick={() => setActiveTab('board')}
                className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'board'
                    ? 'bg-white text-gov-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                Active Sprint Board
                {activeSprint && (
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                )}
              </button>
            </div>

            {/* Quick summary stat badges */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
                Backlog: {backlogTasks.length} Task
              </span>
              <span className="bg-gov-50 text-gov-600 px-3 py-1.5 rounded-lg border border-gov-100">
                Active Sprint: {activeSprint ? activeSprint.name : 'Tidak Ada'}
              </span>
              {activeSprint && (
                <span className="bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg border border-purple-100">
                  Sprint SP: {getSprintStoryPoints(activeSprint.id)} Poin
                </span>
              )}
            </div>
          </div>

          {/* LOADING STATE */}
          {isTasksLoading || isSprintsLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="animate-spin text-gov-600" size={32} />
                <span className="text-sm text-slate-500 font-semibold">Memuat Data Scrum...</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              
              {/* TAB 1: BACKLOG & PLANNING (JIRA VERTICAL LAYOUT) */}
              {activeTab === 'planning' && (
                <div className="h-full overflow-y-auto p-6 sm:p-8 space-y-6 scrollbar-thin scrollbar-thumb-slate-300">
                  
                  {/* JIRA STYLE SECTION 1: ACTIVE SPRINT */}
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
                    {/* Active Sprint Section Header */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 bg-gov-25/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                          <h2 className="text-base sm:text-lg font-bold text-slate-800">
                            Sprint Aktif: {activeSprint ? activeSprint.name : 'Belum Ada Sprint Aktif'}
                          </h2>
                        </div>
                        {activeSprint?.goal && (
                          <p className="text-xs text-slate-500 font-semibold mt-1">Goal: {activeSprint.goal}</p>
                        )}
                      </div>

                      {activeSprint && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-indigo-100">
                            {getSprintStoryPoints(activeSprint.id)} Story Points
                          </span>
                          <button
                            onClick={() => handleCompleteSprint(activeSprint)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-all shadow-sm flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Selesaikan Sprint
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Active Sprint Tasks List */}
                    {activeSprint ? (
                      <div 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDropToSprint(e, activeSprint)}
                        className="p-4"
                      >
                        {renderTaskList(projectTasks.filter(t => t.sprintId === activeSprint.id), activeSprint.id)}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-400 text-xs border-t border-slate-100">
                        Tidak ada sprint yang sedang berjalan. Klik tombol <strong>"Mulai"</strong> di sprint yang direncanakan di bawah untuk memulainya.
                      </div>
                    )}
                  </div>

                  {/* JIRA STYLE SECTION 2: PLANNED SPRINTS */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Sprint Direncanakan (Planned)</h3>
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-1.5 bg-gov-600 hover:bg-gov-700 text-white font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm text-xs sm:text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Tambah Sprint
                      </button>
                    </div>

                    {projectSprints.filter(s => s.status === 'Planned').length === 0 ? (
                      <div className="bg-white border border-slate-200 border-dashed rounded-2xl py-8 text-center text-slate-400 text-xs">
                        Tidak ada sprint yang direncanakan. Klik "Tambah Sprint" di atas.
                      </div>
                    ) : (
                      projectSprints.filter(s => s.status === 'Planned').map(sprint => {
                        const sprintTasks = projectTasks.filter(t => t.sprintId === sprint.id);
                        const totalSp = getSprintStoryPoints(sprint.id);
                        const isExpanded = expandedSprintIds[sprint.id] ?? true;

                        return (
                          <div
                            key={sprint.id}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDropToSprint(e, sprint)}
                            className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden"
                          >
                            {/* Sprint Collapsible Header */}
                            <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 bg-slate-50/50">
                              <button
                                onClick={() => toggleSprintAccordion(sprint.id)}
                                className="flex items-center gap-2 font-bold text-slate-700 hover:text-slate-900 transition-colors text-left"
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                                <div>
                                  <span className="text-sm font-extrabold text-slate-800">{sprint.name}</span>
                                  {sprint.goal && (
                                    <p className="text-xs text-slate-400 font-semibold mt-0.5 line-clamp-1">Goal: {sprint.goal}</p>
                                  )}
                                </div>
                              </button>

                              <div className="flex items-center gap-2.5">
                                <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                  {totalSp} Story Points
                                </span>
                                
                                <button
                                  onClick={() => handleStartSprint(sprint)}
                                  className="flex items-center gap-1 bg-gov-600 hover:bg-gov-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs transition-all shadow-sm cursor-pointer"
                                >
                                  <Play className="w-3 h-3" />
                                  Mulai Sprint
                                </button>

                                <button
                                  onClick={() => {
                                    showConfirm(
                                      'Hapus Sprint',
                                      `Apakah Anda yakin ingin menghapus sprint "${sprint.name}"?\n\nTugas-tugas di dalamnya otomatis dikembalikan ke Backlog.`,
                                      async () => {
                                        const success = await deleteSprint(sprint.id);
                                        if (success) {
                                          showToast('Sprint berhasil dihapus.', 'success');
                                        }
                                      }
                                    );
                                  }}
                                  className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded transition-all"
                                  title="Hapus Sprint"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Sprint Tasks List */}
                            {isExpanded && (
                              <div className="p-4">
                                {renderTaskList(sprintTasks, sprint.id)}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* JIRA STYLE SECTION 3: BACKLOG (AT THE BOTTOM) */}
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDropToBacklog}
                    className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden"
                  >
                    {/* Backlog Section Header */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <button
                        onClick={() => toggleSprintAccordion('backlog')}
                        className="flex items-center gap-2 font-bold text-slate-800 hover:text-slate-900 transition-colors text-left"
                      >
                        {expandedSprintIds['backlog'] ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                        <div>
                          <span className="text-sm font-extrabold text-slate-800">Backlog Proyek</span>
                          <p className="text-xs text-slate-400 font-semibold mt-0.5">Tugas yang belum dijadwalkan ke sprint.</p>
                        </div>
                      </button>

                      <div className="flex gap-2">
                        <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                          {backlogTasks.length} Tugas
                        </span>
                        <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-extrabold px-2.5 py-1 rounded-lg">
                          {backlogTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)} SP
                        </span>
                      </div>
                    </div>

                    {/* Backlog Tasks List */}
                    {expandedSprintIds['backlog'] && (
                      <div className="p-4">
                        {/* Backlog Filter Bar */}
                        <div className="flex flex-col sm:flex-row gap-2 mb-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              placeholder="Cari backlog..."
                              value={backlogSearch}
                              onChange={(e) => setBacklogSearch(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gov-500"
                            />
                          </div>
                          
                          <SearchableSelect
                            options={[
                              { value: 'All', label: 'Semua Kategori' },
                              ...uniqueCategories.map(cat => ({ value: cat, label: cat }))
                            ]}
                            value={backlogCategory}
                            onChange={setBacklogCategory}
                            className="w-full sm:w-44"
                          />

                          <SearchableSelect
                            options={[
                              { value: 'All', label: 'Semua Prioritas' },
                              { value: 'Low', label: 'Low' },
                              { value: 'Medium', label: 'Medium' },
                              { value: 'High', label: 'High' },
                              { value: 'Urgent', label: 'Urgent' }
                            ]}
                            value={backlogPriority}
                            onChange={setBacklogPriority}
                            className="w-full sm:w-44"
                          />

                          <SearchableSelect
                            options={sortOptions}
                            value={backlogSortBy}
                            onChange={setBacklogSortBy}
                            className="w-full sm:w-48"
                          />

                          {(backlogSearch || backlogCategory !== 'All' || backlogPriority !== 'All' || backlogSortBy !== 'created_desc') && (
                            <button
                              type="button"
                              onClick={() => {
                                setBacklogSearch('');
                                setBacklogCategory('All');
                                setBacklogPriority('All');
                                setBacklogSortBy('created_desc');
                              }}
                              className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1.5 rounded transition-all hover:bg-rose-50 cursor-pointer flex-shrink-0"
                            >
                              Reset
                            </button>
                          )}
                        </div>

                        {renderTaskList(backlogTasks, null)}
                      </div>
                    )}
                  </div>

                  {/* JIRA STYLE SECTION 4: HISTORY SPRINT COMPLETED (COLLAPSIBLE) */}
                  {projectSprints.filter(s => s.status === 'Completed').length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-100/60">
                        <button
                          onClick={() => toggleSprintAccordion('completed-history')}
                          className="flex items-center gap-2 font-bold text-slate-600 hover:text-slate-800 transition-colors text-left"
                        >
                          {expandedSprintIds['completed-history'] ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                          <div>
                            <span className="text-sm font-bold">Riwayat Sprint Selesai (Completed)</span>
                          </div>
                        </button>
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                          {projectSprints.filter(s => s.status === 'Completed').length} Selesai
                        </span>
                      </div>

                      {expandedSprintIds['completed-history'] && (
                        <div className="p-4 space-y-4">
                          {projectSprints.filter(s => s.status === 'Completed').map(completedSprint => {
                            const completedTasks = projectTasks.filter(t => t.sprintId === completedSprint.id);
                            const compSp = getSprintStoryPoints(completedSprint.id);
                            return (
                              <div key={completedSprint.id} className="bg-white border border-slate-200 rounded-xl p-4">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-sm font-bold text-slate-700">{completedSprint.name}</span>
                                  <span className="text-xs bg-slate-100 text-slate-500 border px-2 py-0.5 rounded-md font-semibold">
                                    {compSp} SP • {completedTasks.length} Task
                                  </span>
                                </div>
                                {renderTaskList(completedTasks, completedSprint.id, true)}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

              {/* TAB 2: ACTIVE SPRINT BOARD */}
              {activeTab === 'board' && (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 sm:p-6 pb-2 animate-fadeIn">
                  {!activeSprint ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm">
                      <div className="w-16 h-16 bg-gov-50 text-gov-600 rounded-2xl flex items-center justify-center mx-auto shadow-md mb-4 animate-bounce">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">Tidak Ada Sprint Aktif</h3>
                      <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
                        Saat ini tidak ada sprint yang berjalan untuk proyek ini. Buka tab **Backlog & Planning** untuk memulai salah satu sprint yang terencana.
                      </p>
                      <button
                        onClick={() => setActiveTab('planning')}
                        className="mt-4 bg-gov-600 hover:bg-gov-700 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-sm text-sm"
                      >
                        Buka Backlog Planning
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {/* Active Sprint Header Info */}
                      <div className="bg-slate-100 border border-slate-200/80 rounded-2xl px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shadow-2xs animate-fadeIn">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <h2 className="text-base sm:text-lg font-extrabold text-slate-700 tracking-tight">{activeSprint.name}</h2>
                          </div>
                          {activeSprint.goal && (
                            <p className="text-xs text-slate-500 font-semibold mt-1">Goal: {activeSprint.goal}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-lg">
                            Poin Sprint: {getSprintStoryPoints(activeSprint.id)} SP
                          </span>
                          <button
                            onClick={() => handleCompleteSprint(activeSprint)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-sm text-xs sm:text-sm flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Selesaikan Sprint
                          </button>
                        </div>
                      </div>

                      {/* 5-COLUMN KANBAN BOARD */}
                      <div className="flex-1 flex overflow-x-auto gap-4 pb-4 scrollbar-thin scrollbar-thumb-slate-300">
                        {Object.values(Status).map((status) => {
                          const statusTasks = projectTasks.filter(t => t.sprintId === activeSprint.id && t.status === status);
                          const totalColumnSp = statusTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

                          return (
                            <div
                              key={status}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => handleDropToKanbanColumn(e, status)}
                              className="flex-1 min-w-[200px] bg-slate-100/60 border border-slate-200/60 rounded-2xl flex flex-col h-full overflow-hidden"
                            >
                              {/* Column Header */}
                              <div className="p-3 flex justify-between items-center border-b border-slate-200/80 bg-slate-50/50">
                                <span className="font-bold text-xs sm:text-sm text-slate-700 uppercase tracking-wider">
                                  {status === 'To Do' ? 'To Do' :
                                   status === 'In Progress' ? 'In Progress' :
                                   status === 'Pending' ? 'Tertunda' :
                                   status === 'Review' ? 'Review' : 'Selesai'}
                                </span>
                                <div className="flex gap-1.5 items-center">
                                  <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                                    {statusTasks.length}
                                  </span>
                                  {totalColumnSp > 0 && (
                                    <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-extrabold">
                                      {totalColumnSp} SP
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Column Cards Container */}
                              <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-300">
                                {statusTasks.length === 0 ? (
                                  <div className="text-center py-10 text-xs text-slate-400 border border-dashed border-slate-200/80 rounded-xl bg-white/40">
                                    Drag tugas ke sini
                                  </div>
                                ) : (
                                  statusTasks.map(task => {
                                    const taskSubtasks = getSubtasksByParent(task.id);
                                    const isSubtaskExpanded = expandedTaskSubtasks[task.id] ?? false;
                                    const subtaskDone = taskSubtasks.filter(s => s.status === 'Done').length;
                                    const totalSub = taskSubtasks.length;
                                    const subPct = totalSub > 0 ? Math.round((subtaskDone / totalSub) * 100) : 0;

                                    return (
                                      <div
                                        key={task.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                        onClick={() => {
                                          setViewingTask(task);
                                          setIsTaskViewModalOpen(true);
                                        }}
                                        className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-sm transition-all cursor-pointer hover:border-gov-200 group relative text-left"
                                      >
                                        <div className="flex justify-between items-start gap-2">
                                          <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase text-left">
                                            {task.category}
                                          </span>
                                          {task.storyPoints !== null && (
                                            <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 font-extrabold">
                                              SP: {task.storyPoints}
                                            </span>
                                          )}
                                        </div>

                                        <h4 className="text-sm font-bold text-slate-700 mt-1 line-clamp-2 group-hover:text-gov-600 group-hover:underline">
                                          {task.title}
                                        </h4>

                                        {/* Task priority and pic info */}
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-xs">
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                            task.priority === 'Urgent' || task.priority === 'High'
                                              ? 'bg-rose-50 border-rose-100 text-rose-700'
                                              : task.priority === 'Medium'
                                              ? 'bg-amber-50 border-amber-100 text-amber-700'
                                              : 'bg-slate-50 border-slate-100 text-slate-600'
                                          }`}>
                                            {task.priority}
                                          </span>
                                          {editingPicTaskId === task.id ? (
                                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                              <div className="w-40">
                                                <CompactPICSelector
                                                  users={allUsers}
                                                  selected={task.pic || []}
                                                  onChange={(selectedNames) => handleSavePic(task.id, selectedNames)}
                                                />
                                              </div>
                                              <button
                                                onClick={() => setEditingPicTaskId(null)}
                                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded border border-slate-200 cursor-pointer"
                                                title="Selesai"
                                              >
                                                <Check className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingPicTaskId(task.id);
                                              }}
                                              title="Klik untuk ubah PIC"
                                              className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-gov-600 font-semibold cursor-pointer hover:bg-slate-50 px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 transition-all truncate"
                                            >
                                              <PICDisplay pic={task.pic || []} users={allUsers} maxVisible={2} size="sm" showNames={false} />
                                            </button>
                                          )}
                                        </div>

                                        {/* SUBTASK AUTOLOAD INTEGRATION SECTION */}
                                        {totalSub > 0 && (
                                          <div className="mt-3 pt-2.5 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                                            <button
                                              onClick={() => toggleTaskSubtasks(task.id)}
                                              className="w-full flex justify-between items-center text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                                            >
                                              <span className="flex items-center gap-1">
                                                Subtask ({subtaskDone}/{totalSub})
                                              </span>
                                              {isSubtaskExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                            </button>

                                            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                              <div 
                                                className={`h-full transition-all duration-300 ${
                                                  subPct === 100 ? 'bg-emerald-500' : 'bg-gov-500'
                                                }`}
                                                style={{ width: `${subPct}%` }}
                                              />
                                            </div>

                                            {isSubtaskExpanded && (
                                              <div className="mt-2 space-y-2 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                                {taskSubtasks.map(sub => (
                                                  <div key={sub.id} className="flex items-start gap-2 text-xs">
                                                    <input
                                                      type="checkbox"
                                                      checked={sub.status === 'Done'}
                                                      onChange={() => handleToggleSubtask(sub)}
                                                      className="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 text-gov-600 focus:ring-gov-500/20 cursor-pointer"
                                                    />
                                                    <span className={`flex-1 break-words font-medium leading-tight ${
                                                      sub.status === 'Done' ? 'text-slate-400 line-through' : 'text-slate-600'
                                                    }`}>
                                                      {sub.title}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Inline Subtask Quick Addition */}
                                        {addingSubtaskTaskId === task.id ? (
                                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex gap-1" onClick={(e) => e.stopPropagation()}>
                                            <input
                                              type="text"
                                              placeholder="Nama subtask..."
                                              value={newSubtaskTitle}
                                              onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                              className="flex-1 text-xs border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gov-500"
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleAddSubtaskSubmit(task.id);
                                                if (e.key === 'Escape') setAddingSubtaskTaskId(null);
                                              }}
                                            />
                                            <button 
                                              onClick={() => handleAddSubtaskSubmit(task.id)}
                                              className="bg-gov-600 hover:bg-gov-700 text-white font-semibold px-2 py-1 rounded-lg text-xs"
                                            >
                                              Simpan
                                            </button>
                                            <button 
                                              onClick={() => setAddingSubtaskTaskId(null)}
                                              className="p-1 hover:bg-slate-100 text-slate-500 rounded"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setAddingSubtaskTaskId(task.id);
                                              setNewSubtaskTitle('');
                                            }}
                                            className="mt-3 w-full flex items-center justify-center gap-1 py-1 border border-dashed border-slate-200 hover:border-slate-300 rounded-lg text-[10px] text-slate-500 font-bold hover:bg-slate-50 transition-all"
                                          >
                                            <Plus className="w-3 h-3" /> Tambah Subtask
                                          </button>
                                        )}



                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* 6. CREATE SPRINT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-zoomIn">
            <div className="px-6 py-5 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                Rencanakan Sprint Baru
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)} 
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSprintSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Sprint *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sprint 1 - Core Auth"
                  value={newSprintName}
                  onChange={(e) => setNewSprintName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sprint Goal / Tujuan</label>
                <input
                  type="text"
                  placeholder="Apa target utama sprint ini?"
                  value={newSprintGoal}
                  onChange={(e) => setNewSprintGoal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={newSprintStart}
                    onChange={(e) => setNewSprintStart(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={newSprintEnd}
                    onChange={(e) => setNewSprintEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catatan / Deskripsi</label>
                <textarea
                  placeholder="Detail catatan perencanaan sprint (opsional)"
                  value={newSprintDesc}
                  rows={3}
                  onChange={(e) => setNewSprintDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500 transition-all resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-all text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSprint}
                  className="px-4 py-2.5 bg-gov-600 hover:bg-gov-700 text-white font-bold rounded-xl transition-all shadow-sm text-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingSprint && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Rencanakan Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ScrumBoard;
