// src/components/ScrumBoard.tsx
// Scrum module with Jira-style Vertical Backlog Planning, Sprint management, Kanban Board, Story Points, and Subtask integration
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { queryClient } from '../lib/queryClient';
import { 
  Layers, Plus, RefreshCw, Trash2, Calendar, Target,
  CheckCircle2, AlertCircle, ChevronDown, ChevronRight,
  Play, Check, X, ArrowLeftRight, Clock, User, Sparkles,
  HelpCircle, ChevronUp, GripVertical, AlertTriangle, ArrowRight, ArrowLeft,
  Search, Pencil, ChevronsUpDown, FolderPlus, CheckSquare, Square,
  TrendingDown, FileSpreadsheet, FileText, Download, MessageSquare,
  MessageSquareQuote
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
import ScrumFilterBar from './ScrumFilterBar';
import { Task, Sprint, Subtask, Status, SprintStatus, User as UserType, Backlog, Priority } from '../../types';

// Scrum Modular Extensions
import { StoryPointsPicker } from './scrum/StoryPointsPicker';
import { SprintCompletionModal } from './scrum/SprintCompletionModal';
import { ScrumBulkActionBar } from './scrum/ScrumBulkActionBar';
import { SprintAnalyticsModal } from './scrum/SprintAnalyticsModal';
import { SprintRetroModal } from './scrum/SprintRetroModal';
import { SprintDailyNotesModal } from './scrum/SprintDailyNotesModal';
import { exportSprintToExcel, exportSprintToPDF } from '../utils/sprintExport';

// Typing animation component for the welcome landing page
const ProjectNameTyper: React.FC<{ projectNames: string[] }> = ({ projectNames }) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const words = useMemo(() => {
    if (projectNames && projectNames.length > 0) return projectNames;
    return ['Proyek Anda', 'Sistem Informasi', 'Website Portal', 'Aplikasi Mobile', 'Dashboard PPA'];
  }, [projectNames]);

  useEffect(() => {
    let timer: any;
    const currentWord = words[currentWordIndex % words.length];

    if (isDeleting) {
      timer = setTimeout(() => {
        setCurrentText(prev => prev.slice(0, -1));
      }, 30);
    } else {
      timer = setTimeout(() => {
        setCurrentText(currentWord.slice(0, currentText.length + 1));
      }, 70);
    }

    if (!isDeleting && currentText === currentWord) {
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, 2500);
    } else if (isDeleting && currentText === '') {
      setIsDeleting(false);
      setCurrentWordIndex(prev => prev + 1);
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentWordIndex, words]);

  return (
    <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-gov-600 to-indigo-600 font-extrabold pr-1 select-none">
      {currentText}
      <span className="absolute right-[-4px] top-0 bottom-0 w-[3px] bg-gov-600 animate-pulse" />
    </span>
  );
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
};

const ScrumBoard: React.FC = () => {
  const { currentUser } = useAuth();
  const { projects, isProjectsLoading } = useProjects();
  const { 
    sprints, 
    createSprint, 
    updateSprint, 
    deleteSprint, 
    assignTaskToSprint,
    isSprintsLoading,
    backlogs,
    createBacklog,
    updateBacklog,
    deleteBacklog,
    assignTaskToBacklog,
    isBacklogsLoading
  } = useSprints();
  const { tasks, isTasksLoading } = useTasks();
  const { subtasks, getSubtasksByParent } = useSubtasks();
  const { 
    showConfirm, 
    showToast, 
    showNotification, 
    draggedTaskId, 
    setDraggedTaskId, 
    setViewingTask, 
    setIsTaskViewModalOpen,
    setIsModalOpen,
    setFilters
  } = useUI();
  const { allUsers } = useUsers();

  // Selected project state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // Tab state: 'planning' (Backlog & Planning) | 'board' (Active Sprint Board)
  const [activeTab, setActiveTab] = useState<'planning' | 'board'>('planning');

  // Search query for projects welcome landing page
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  // Local Backlog Filter States
  const [backlogSearch, setBacklogSearch] = useState('');
  const [backlogCategory, setBacklogCategory] = useState('All');
  const [backlogPriority, setBacklogPriority] = useState('All');
  const [backlogPic, setBacklogPic] = useState('All');

  // Active Sprint Board Filter states
  const [boardSearch, setBoardSearch] = useState('');
  const [boardCategory, setBoardCategory] = useState('All');
  const [boardPriority, setBoardPriority] = useState('All');
  const [boardPic, setBoardPic] = useState('All');

  // Accordion toggle states for Sprints and Backlog in Jira-style list
  const [expandedSprintIds, setExpandedSprintIds] = useState<Record<string, boolean>>({
    'active': true,
    'backlog': true,
    'backlog-default': true
  });

  // Subtask accordion toggles on Kanban Board
  const [expandedTaskSubtasks, setExpandedTaskSubtasks] = useState<Record<string, boolean>>({});

  // inline SP edit task ID
  const [editingSpTaskId, setEditingSpTaskId] = useState<string | null>(null);
  const [tempSpValue, setTempSpValue] = useState<string>('');

  // inline PIC edit state
  const [editingPicTaskId, setEditingPicTaskId] = useState<string | null>(null);

  // Backlog Sorting states
  const [backlogSortBy, setBacklogSortBy] = useState<string>('created_desc');
  const [backlogSortByMap, setBacklogSortByMap] = useState<Record<string, string>>({});

  // Move Task Menu state (holds task.id of the currently open destination dropdown)
  const [openMoveMenuTaskId, setOpenMoveMenuTaskId] = useState<string | null>(null);

  // Multiple Backlog Fields Management state
  const [isCreateBacklogModalOpen, setIsCreateBacklogModalOpen] = useState(false);
  const [newBacklogTitle, setNewBacklogTitle] = useState('');
  const [isSubmittingBacklog, setIsSubmittingBacklog] = useState(false);

  // Edit Backlog Section Title state
  const [editingBacklogId, setEditingBacklogId] = useState<string | null>(null);
  const [tempBacklogTitle, setTempBacklogTitle] = useState('');
  const [defaultBacklogTitle, setDefaultBacklogTitle] = useState('Backlog Proyek');

  // Edit Sprint Modal State
  const [isEditSprintModalOpen, setIsEditSprintModalOpen] = useState(false);
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
  const [editingSprintName, setEditingSprintName] = useState('');
  const [editingSprintGoal, setEditingSprintGoal] = useState('');
  const [editingSprintDesc, setEditingSprintDesc] = useState('');
  const [editingSprintStart, setEditingSprintStart] = useState('');
  const [editingSprintEnd, setEditingSprintEnd] = useState('');
  const [isSubmittingEditSprint, setIsSubmittingEditSprint] = useState(false);

  // Multi-Select Task IDs for Bulk Actions
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Fibonacci Story Points Picker task ID
  const [pickerSpTaskId, setPickerSpTaskId] = useState<string | null>(null);

  // Sprint Completion Modal State
  const [completingSprint, setCompletingSprint] = useState<Sprint | null>(null);

  // Sprint Analytics Modal State
  const [analyticsSprint, setAnalyticsSprint] = useState<Sprint | null>(null);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

  // Sprint Export Menu Dropdown State (sprint.id)
  const [openExportMenuSprintId, setOpenExportMenuSprintId] = useState<string | null>(null);

  // Sprint Retrospective Modal State
  const [retroSprint, setRetroSprint] = useState<Sprint | null>(null);
  const [isRetroModalOpen, setIsRetroModalOpen] = useState(false);

  // Sprint Daily Notes Modal State
  const [dailyNotesSprint, setDailyNotesSprint] = useState<Sprint | null>(null);
  const [isDailyNotesModalOpen, setIsDailyNotesModalOpen] = useState(false);

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

  // Filtered projects based on search query for landing welcome view
  const filteredActiveProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return projectsWithActiveSprint;
    const query = projectSearchQuery.toLowerCase();
    return projectsWithActiveSprint.filter(p => 
      p.name.toLowerCase().includes(query) || 
      (p.description && p.description.toLowerCase().includes(query)) ||
      (p.manager && p.manager.toLowerCase().includes(query))
    );
  }, [projectsWithActiveSprint, projectSearchQuery]);

  const filteredOtherProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return otherProjects;
    const query = projectSearchQuery.toLowerCase();
    return otherProjects.filter(p => 
      p.name.toLowerCase().includes(query) || 
      (p.description && p.description.toLowerCase().includes(query)) ||
      (p.manager && p.manager.toLowerCase().includes(query))
    );
  }, [otherProjects, projectSearchQuery]);

  // Project Sprints
  const projectSprints = useMemo(() => {
    if (!selectedProjectId) return [];
    return sprints.filter(s => s.projectId === selectedProjectId);
  }, [sprints, selectedProjectId]);

  // Project Tasks (all tasks belonging to this project)
  const projectTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return tasks
      .filter(t => t.projectId === selectedProjectId)
      .sort((a, b) => new Date(a.createdAt || a.created_at || 0).getTime() - new Date(b.createdAt || b.created_at || 0).getTime());
  }, [tasks, selectedProjectId]);

  // Filtered tasks for the Planning tab (applies to active sprint tasks, planned sprint tasks, and backlog tasks)
  const filteredPlanningTasks = useMemo(() => {
    let filtered = projectTasks;
    
    if (backlogSearch.trim() !== '') {
      const q = backlogSearch.toLowerCase();
      filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
    }
    
    if (backlogCategory !== 'All') {
      filtered = filtered.filter(t => t.category === backlogCategory);
    }
    
    if (backlogPriority !== 'All') {
      filtered = filtered.filter(t => t.priority === backlogPriority);
    }
    
    if (backlogPic !== 'All') {
      filtered = filtered.filter(t => (t.pic || []).includes(backlogPic));
    }
    
    return filtered;
  }, [projectTasks, backlogSearch, backlogCategory, backlogPriority, backlogPic]);

  // Project Backlogs
  const projectBacklogs = useMemo(() => {
    if (!selectedProjectId) return [];
    return backlogs.filter(b => b.projectId === selectedProjectId);
  }, [backlogs, selectedProjectId]);

  // All Backlog Sections (Default + Custom)
  const allBacklogSections = useMemo(() => {
    return [
      { id: 'default', title: defaultBacklogTitle, isDefault: true },
      ...projectBacklogs.map(b => ({ ...b, isDefault: false }))
    ];
  }, [defaultBacklogTitle, projectBacklogs]);

  // Load project default backlog title from storage
  useEffect(() => {
    if (selectedProjectId) {
      const saved = localStorage.getItem(`scrum_default_backlog_title_${selectedProjectId}`);
      setDefaultBacklogTitle(saved || 'Backlog Proyek');
    }
  }, [selectedProjectId]);

  // Get Backlog Tasks for a specific section
  const getBacklogTasks = useCallback((sectionId: string) => {
    const list = filteredPlanningTasks.filter(t => {
      if (t.sprintId || t.status === Status.Done) return false;
      if (sectionId === 'default') {
        return !t.backlogId || t.backlogId === 'default' || !projectBacklogs.some(b => b.id === t.backlogId);
      }
      return t.backlogId === sectionId;
    });

    const sortBy = backlogSortByMap[sectionId] || backlogSortBy;
    return [...list].sort((a, b) => {
      if (sortBy === 'created_desc') {
        return new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime();
      }
      if (sortBy === 'created_asc') {
        return new Date(a.createdAt || a.created_at || 0).getTime() - new Date(b.createdAt || b.created_at || 0).getTime();
      }
      if (sortBy === 'title_asc') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'title_desc') {
        return b.title.localeCompare(a.title);
      }
      if (sortBy === 'sp_desc') {
        return (b.storyPoints || 0) - (a.storyPoints || 0);
      }
      if (sortBy === 'sp_asc') {
        return (a.storyPoints || 0) - (b.storyPoints || 0);
      }
      if (sortBy === 'priority_desc' || sortBy === 'priority_asc') {
        const priorityWeight = { 'Urgent': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
        const wA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
        const wB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
        return sortBy === 'priority_desc' ? wB - wA : wA - wB;
      }
      return 0;
    });
  }, [filteredPlanningTasks, projectBacklogs, backlogSortByMap, backlogSortBy]);

  // Overall Backlog Tasks (all tasks with no sprint assigned)
  const backlogTasks = useMemo(() => {
    return filteredPlanningTasks.filter(t => !t.sprintId && t.status !== Status.Done);
  }, [filteredPlanningTasks]);

  // Unique categories in project tasks for backlog filtering
  const uniqueCategories = useMemo(() => {
    const cats = new Set(projectTasks.map(t => t.category).filter(Boolean));
    return Array.from(cats);
  }, [projectTasks]);

  // Active Sprint
  const activeSprint = useMemo(() => {
    return projectSprints.find(s => s.status === 'Active');
  }, [projectSprints]);

  // Filtered tasks for the Active Sprint Board (tab 2)
  const filteredBoardTasks = useMemo(() => {
    if (!activeSprint) return [];
    
    let filtered = projectTasks.filter(t => t.sprintId === activeSprint.id);
    
    if (boardSearch.trim() !== '') {
      const q = boardSearch.toLowerCase();
      filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
    }
    
    if (boardCategory !== 'All') {
      filtered = filtered.filter(t => t.category === backlogCategory);
    }
    
    if (boardPriority !== 'All') {
      filtered = filtered.filter(t => t.priority === boardPriority);
    }
    
    if (boardPic !== 'All') {
      filtered = filtered.filter(t => (t.pic || []).includes(boardPic));
    }
    
    return filtered;
  }, [projectTasks, activeSprint, boardSearch, boardCategory, boardPriority, boardPic]);

  // Expand / collapse section helper
  const toggleSprintAccordion = (sprintId: string) => {
    setExpandedSprintIds(prev => ({
      ...prev,
      [sprintId]: !(prev[sprintId] ?? true)
    }));
  };

  // Toggle All Accordions helper
  const toggleAllAccordions = () => {
    const isActiveOpen = expandedSprintIds['active'] ?? true;
    const isAnySprintOpen = projectSprints.filter(s => s.status === 'Planned').some(s => expandedSprintIds[s.id] ?? true);
    const isAnyBacklogOpen = allBacklogSections.some(sec => expandedSprintIds['backlog-' + sec.id] ?? true);
    const isAnyOpen = isActiveOpen || isAnySprintOpen || isAnyBacklogOpen;

    const nextState = !isAnyOpen;
    const nextMap: Record<string, boolean> = {
      'active': nextState,
    };
    projectSprints.forEach(s => {
      nextMap[s.id] = nextState;
    });
    allBacklogSections.forEach(sec => {
      nextMap['backlog-' + sec.id] = nextState;
    });
    setExpandedSprintIds(nextMap);
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

  // Handle Drop onto a specific Backlog Section
  const handleDropToBacklog = async (e: React.DragEvent, sectionId: string | null = null) => {
    e.preventDefault();
    const taskId = draggedTaskId;
    if (!taskId) return;

    const task = projectTasks.find(t => t.id === taskId);
    if (!task) {
      setDraggedTaskId(null);
      return;
    }

    const targetBacklogId = sectionId === 'default' ? null : sectionId;
    const currentBacklogId = task.backlogId || null;
    if (!task.sprintId && currentBacklogId === targetBacklogId) {
      setDraggedTaskId(null);
      return; // already here
    }

    const success = await assignTaskToBacklog(taskId, targetBacklogId);
    if (success) {
      const targetTitle = targetBacklogId 
        ? (projectBacklogs.find(b => b.id === targetBacklogId)?.title || 'Field Backlog')
        : defaultBacklogTitle;
      showToast(`Task "${task.title}" dipindahkan ke "${targetTitle}".`, 'info');
    }
    setDraggedTaskId(null);
  };

  // Handle Move Task to a specific Backlog Section
  const handleMoveTaskToBacklog = async (task: Task, sectionId: string | null = null) => {
    const targetBacklogId = sectionId === 'default' ? null : sectionId;
    const currentBacklogId = task.backlogId || null;
    if (!task.sprintId && currentBacklogId === targetBacklogId) return;

    const success = await assignTaskToBacklog(task.id, targetBacklogId);
    if (success) {
      const targetTitle = targetBacklogId 
        ? (projectBacklogs.find(b => b.id === targetBacklogId)?.title || 'Field Backlog')
        : defaultBacklogTitle;
      showToast(`Task "${task.title}" dipindahkan ke "${targetTitle}".`, 'info');
    }
  };

  // Handle Save Backlog Title
  const handleSaveBacklogTitle = async (sectionId: string) => {
    if (!tempBacklogTitle.trim()) {
      showToast('Judul backlog tidak boleh kosong.', 'warning');
      return;
    }
    if (sectionId === 'default') {
      setDefaultBacklogTitle(tempBacklogTitle.trim());
      if (selectedProjectId) {
        localStorage.setItem(`scrum_default_backlog_title_${selectedProjectId}`, tempBacklogTitle.trim());
      }
      showToast('Judul Backlog Utama diperbarui.', 'success');
      setEditingBacklogId(null);
      return;
    }

    const success = await updateBacklog(sectionId, { title: tempBacklogTitle.trim() });
    if (success) {
      showToast('Judul Backlog diperbarui.', 'success');
      setEditingBacklogId(null);
    } else {
      showToast('Gagal memperbarui judul backlog.', 'error');
    }
  };

  // Handle Create Backlog Submit
  const handleCreateBacklogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBacklogTitle.trim() || !selectedProjectId) return;

    setIsSubmittingBacklog(true);
    try {
      const created = await createBacklog({
        projectId: selectedProjectId,
        title: newBacklogTitle.trim()
      });
      if (created) {
        setIsCreateBacklogModalOpen(false);
        setNewBacklogTitle('');
        setExpandedSprintIds(prev => ({ ...prev, ['backlog-' + created.id]: true }));
        showToast(`Field Backlog "${created.title}" berhasil dibuat.`, 'success');
      } else {
        showToast('Gagal membuat field backlog.', 'error');
      }
    } finally {
      setIsSubmittingBacklog(false);
    }
  };

  // Handle Edit Sprint Modal handlers
  const handleOpenEditSprint = (sprint: Sprint) => {
    setEditingSprintId(sprint.id);
    setEditingSprintName(sprint.name);
    setEditingSprintGoal(sprint.goal || '');
    setEditingSprintDesc(sprint.description || '');
    setEditingSprintStart(sprint.startDate || '');
    setEditingSprintEnd(sprint.endDate || '');
    setIsEditSprintModalOpen(true);
  };

  const handleEditSprintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSprintId || !editingSprintName.trim()) return;

    setIsSubmittingEditSprint(true);
    try {
      const success = await updateSprint(editingSprintId, {
        name: editingSprintName.trim(),
        goal: editingSprintGoal.trim() || undefined,
        description: editingSprintDesc.trim() || undefined,
        startDate: editingSprintStart || undefined,
        endDate: editingSprintEnd || undefined
      });
      if (success) {
        setIsEditSprintModalOpen(false);
        setEditingSprintId(null);
        showToast('Sprint berhasil diperbarui.', 'success');
      } else {
        showToast('Gagal memperbarui Sprint.', 'error');
      }
    } finally {
      setIsSubmittingEditSprint(false);
    }
  };

  // Trigger AddTaskModal with current project locked
  const handleCreateTaskForProject = () => {
    if (selectedProjectId) {
      setFilters(prev => ({ ...prev, projectId: selectedProjectId }));
    }
    setIsModalOpen(true);
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

  // Multi-select Task handlers
  const handleToggleTaskSelection = (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleBulkMoveTasks = async (target: { type: 'sprint' | 'backlog'; id: string | null }) => {
    if (selectedTaskIds.size === 0) return;
    const taskIds = Array.from(selectedTaskIds);
    
    for (const id of taskIds) {
      if (target.type === 'sprint') {
        await assignTaskToSprint(id, target.id);
      } else {
        await assignTaskToBacklog(id, target.id);
      }
    }

    showToast(`${taskIds.length} tugas berhasil dipindahkan.`, 'success');
    setSelectedTaskIds(new Set());
  };

  const handleBulkChangePriority = async (priority: Priority) => {
    if (selectedTaskIds.size === 0) return;
    const taskIds = Array.from(selectedTaskIds);

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ priority })
        .in('id', taskIds);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast(`Prioritas ${taskIds.length} tugas diubah ke ${priority}.`, 'success');
      setSelectedTaskIds(new Set());
    } catch (err) {
      console.error('Error updating task priority:', err);
      showToast('Gagal mengubah prioritas tugas.', 'error');
    }
  };

  const handleBulkChangePic = async (picList: string[]) => {
    if (selectedTaskIds.size === 0) return;
    const taskIds = Array.from(selectedTaskIds);

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ pic: picList })
        .in('id', taskIds);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast(`PIC untuk ${taskIds.length} tugas berhasil diperbarui.`, 'success');
      setSelectedTaskIds(new Set());
    } catch (err) {
      console.error('Error updating task PIC:', err);
      showToast('Gagal memperbarui PIC tugas.', 'error');
    }
  };

  const handleSelectSp = async (taskId: string, points: number | null) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ story_points: points })
        .eq('id', taskId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast(points !== null ? `Story points diatur ke ${points}.` : 'Story points dihapus.', 'success');
    } catch (err) {
      console.error('Error updating story points:', err);
      showToast('Gagal mengubah story points.', 'error');
    }
    setPickerSpTaskId(null);
  };

  // Complete a Sprint (Active -> Completed) using interactive modal
  const handleCompleteSprint = (sprint: Sprint) => {
    setCompletingSprint(sprint);
  };

  const handleConfirmCompleteSprint = async (carryover: { type: 'sprint' | 'backlog'; targetId: string } | null) => {
    if (!completingSprint) return;

    const sprintTasks = projectTasks.filter(t => t.sprintId === completingSprint.id);
    const unfinishedTasks = sprintTasks.filter(t => t.status !== Status.Done);

    if (unfinishedTasks.length > 0 && carryover) {
      if (carryover.type === 'sprint') {
        for (const task of unfinishedTasks) {
          await assignTaskToSprint(task.id, carryover.targetId);
        }
      } else {
        const backlogId = carryover.targetId === 'default' ? null : carryover.targetId;
        for (const task of unfinishedTasks) {
          await assignTaskToBacklog(task.id, backlogId);
        }
      }
    }

    const success = await updateSprint(completingSprint.id, { 
      status: 'Completed',
      endDate: new Date().toISOString()
    });

    if (success) {
      showToast(`Sprint "${completingSprint.name}" berhasil diselesaikan!`, 'success');
      setCompletingSprint(null);
      setActiveTab('planning');
    } else {
      showToast('Gagal menyelesaikan sprint.', 'error');
    }
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
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {!isSprintCompleted && (
                  <button
                    type="button"
                    onClick={(e) => handleToggleTaskSelection(task.id, e)}
                    className="p-1 text-slate-300 hover:text-indigo-600 rounded transition-colors cursor-pointer flex-shrink-0"
                    title={selectedTaskIds.has(task.id) ? "Batalkan pilihan" : "Pilih tugas"}
                  >
                    {selectedTaskIds.has(task.id) ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                    )}
                  </button>
                )}

                {!isSprintCompleted && (
                  <div className="text-slate-400 p-0.5 hover:bg-slate-50 rounded cursor-grab active:cursor-grabbing flex-shrink-0">
                    <GripVertical className="w-4 h-4" />
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

                {/* Story Points Fibonacci Picker */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSprintCompleted) return;
                      setPickerSpTaskId(pickerSpTaskId === task.id ? null : task.id);
                    }}
                    disabled={isSprintCompleted}
                    title="Klik untuk ubah Story Points (Fibonacci)"
                    className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg border border-indigo-100 font-extrabold transition-all flex items-center gap-0.5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span>SP:</span>
                    <span>{task.storyPoints !== null && task.storyPoints !== undefined ? task.storyPoints : '-'}</span>
                  </button>

                  {pickerSpTaskId === task.id && (
                    <StoryPointsPicker
                      currentSp={task.storyPoints}
                      onSelect={(pts) => handleSelectSp(task.id, pts)}
                      onClose={() => setPickerSpTaskId(null)}
                    />
                  )}
                </div>

                {/* Move Task Menu / Dropdown */}
                {!isSprintCompleted && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMoveMenuTaskId(openMoveMenuTaskId === task.id ? null : task.id);
                      }}
                      className="p-1.5 bg-slate-50 hover:bg-gov-50 text-slate-600 hover:text-gov-700 rounded-lg border border-slate-200 font-bold transition-all flex items-center gap-1 cursor-pointer shadow-3xs text-[11px]"
                      title="Pindahkan tugas ke Sprint atau Field Backlog lain"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Pindah</span>
                    </button>

                    {openMoveMenuTaskId === task.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMoveMenuTaskId(null);
                          }} 
                        />
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1.5 z-50 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 text-xs animate-zoomIn max-h-72 overflow-y-auto"
                        >
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                            Pindahkan Tugas Ke:
                          </div>

                          {/* 1. Active Sprint */}
                          {activeSprint && (
                            <div className="mb-2">
                              <div className="text-[10px] font-extrabold text-emerald-600 px-2 py-0.5 flex items-center gap-1">
                                <Play className="w-2.5 h-2.5" />
                                Sprint Aktif
                              </div>
                              <button
                                disabled={task.sprintId === activeSprint.id}
                                onClick={() => {
                                  handleMoveTaskDirectly(task, activeSprint);
                                  setOpenMoveMenuTaskId(null);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg font-semibold flex items-center justify-between transition-colors ${
                                  task.sprintId === activeSprint.id
                                    ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                                    : 'hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 cursor-pointer'
                                }`}
                              >
                                <span className="truncate">{activeSprint.name}</span>
                                {task.sprintId === activeSprint.id && <span className="text-[9px] bg-slate-200 text-slate-600 px-1 py-0.5 rounded">Saat ini</span>}
                              </button>
                            </div>
                          )}

                          {/* 2. Planned Sprints */}
                          {projectSprints.filter(s => s.status === 'Planned').length > 0 && (
                            <div className="mb-2 border-t border-slate-100 pt-1">
                              <div className="text-[10px] font-extrabold text-indigo-600 px-2 py-0.5 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                Sprint Direncanakan
                              </div>
                              {projectSprints.filter(s => s.status === 'Planned').map(sprint => (
                                <button
                                  key={sprint.id}
                                  disabled={task.sprintId === sprint.id}
                                  onClick={() => {
                                    handleMoveTaskDropdown(task, sprint.id);
                                    setOpenMoveMenuTaskId(null);
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg font-semibold flex items-center justify-between transition-colors ${
                                    task.sprintId === sprint.id
                                      ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                                      : 'hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 cursor-pointer'
                                  }`}
                                >
                                  <span className="truncate">{sprint.name}</span>
                                  {task.sprintId === sprint.id && <span className="text-[9px] bg-slate-200 text-slate-600 px-1 py-0.5 rounded">Saat ini</span>}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* 3. Backlog Fields */}
                          <div className="border-t border-slate-100 pt-1">
                            <div className="text-[10px] font-extrabold text-slate-500 px-2 py-0.5 flex items-center gap-1">
                              <Layers className="w-2.5 h-2.5" />
                              Field Backlog
                            </div>
                            {allBacklogSections.map(section => {
                              const isDefault = section.id === 'default';
                              const isCurrent = !task.sprintId && (
                                isDefault 
                                  ? (!task.backlogId || task.backlogId === 'default' || !projectBacklogs.some(b => b.id === task.backlogId))
                                  : task.backlogId === section.id
                              );

                              return (
                                <button
                                  key={section.id}
                                  disabled={isCurrent}
                                  onClick={() => {
                                    handleMoveTaskToBacklog(task, isDefault ? null : section.id);
                                    setOpenMoveMenuTaskId(null);
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg font-semibold flex items-center justify-between transition-colors ${
                                    isCurrent
                                      ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                                      : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900 cursor-pointer'
                                  }`}
                                >
                                  <span className="truncate">{section.title}</span>
                                  {isCurrent && <span className="text-[9px] bg-slate-200 text-slate-600 px-1 py-0.5 rounded">Saat ini</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
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
      {!selectedProjectId ? (
        <div className="flex-1 overflow-y-auto p-6 sm:p-12 bg-slate-50/50 text-slate-800 flex flex-col items-center justify-start custom-scrollbar relative w-full h-full min-h-0 select-none">
          {/* Ambient lighting effects */}
          <div className="absolute top-0 inset-x-0 h-[400px] bg-gradient-to-b from-gov-500/10 via-indigo-500/5 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-gov-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1.5s' }} />

          <div className="w-full max-w-4xl flex flex-col items-center mt-8 sm:mt-16 text-center">
            {/* Logo and Badge */}
            <div className="mb-6 flex items-center justify-center animate-fadeIn">
              <div className="relative p-4 bg-gradient-to-tr from-gov-500 to-indigo-600 rounded-3xl shadow-xl shadow-gov-500/15 text-white ring-4 ring-gov-500/10">
                <Layers className="w-10 h-10" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                </span>
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-center max-w-3xl leading-tight text-slate-800 mb-4">
              Pakai metode Scrum untuk <br />
              <ProjectNameTyper projectNames={projects.map(p => p.name)} />
            </h1>

            {/* Sub-headline */}
            <p className="text-slate-500 text-xs sm:text-sm md:text-base text-center max-w-xl mt-2 font-medium leading-relaxed">
              Sederhanakan manajemen backlog, kelola bobot story points, jalankan sprint, dan pantau subtask tim Anda secara visual dan real-time.
            </p>

            {/* Search Input Bar */}
            <div className="mt-10 w-full max-w-lg mx-auto px-4 z-10">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-gov-500 to-indigo-500 rounded-2xl blur opacity-15 group-focus-within:opacity-40 transition duration-300"></div>
                <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-md focus-within:border-gov-400 transition-all duration-300">
                  <Search className="w-5 h-5 text-slate-400 ml-4 flex-shrink-0" />
                  <input
                    type="text"
                    value={projectSearchQuery}
                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                    placeholder="Cari nama proyek..."
                    className="w-full pl-3 pr-4 py-3 bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none text-sm sm:text-base font-semibold"
                  />
                  {projectSearchQuery && (
                    <button
                      onClick={() => setProjectSearchQuery('')}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all mr-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Projects Listing Grid */}
          <div className="w-full max-w-5xl mt-16 pb-12 z-10 space-y-12">
            {isProjectsLoading ? (
              <div className="space-y-4">
                <div className="h-6 w-48 bg-slate-250 rounded-md animate-pulse"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="bg-white border border-slate-200 rounded-2xl p-6 h-40 animate-pulse"></div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* 1. Projects with Active Sprints */}
                {filteredActiveProjects.length > 0 && (
                  <div className="space-y-4 text-left">
                    <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <h2 className="text-xs sm:text-sm font-bold text-slate-700 tracking-wider uppercase">Proyek dengan Sprint Aktif</h2>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-bold">
                        {filteredActiveProjects.length} Proyek
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredActiveProjects.map(proj => {
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
                            className="bg-white hover:bg-slate-50/50 border border-slate-200/80 hover:border-gov-400 hover:shadow-md rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between group relative overflow-hidden text-left shadow-2xs"
                          >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50/50 rounded-bl-full flex items-center justify-center -mr-3 -mt-3 transition-all group-hover:bg-emerald-50/80">
                              <Clock className="w-4.5 h-4.5 text-emerald-500 mr-3 mt-3" />
                            </div>

                            <div className="space-y-3">
                              <h4 className="font-bold text-slate-800 text-sm sm:text-base leading-tight group-hover:text-gov-600 transition-colors pr-6">
                                {proj.name}
                              </h4>
                              <p className="text-xs text-slate-500 line-clamp-2">
                                {proj.description || 'Tidak ada deskripsi proyek.'}
                              </p>

                              {activeSprint && (
                                <div className="bg-emerald-50/40 border border-emerald-100/50 rounded-xl p-3 space-y-2 mt-2">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-700">{activeSprint.name}</span>
                                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200/50 text-[9px] px-2 py-0.5 rounded font-bold">
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

                            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500 font-medium">
                              <span>Manajer: <strong className="text-slate-750 font-semibold">{proj.manager || '-'}</strong></span>
                              <span className="text-gov-600 font-bold group-hover:underline flex items-center gap-1">
                                Buka Papan <ArrowRight className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Other Projects */}
                {filteredOtherProjects.length > 0 && (
                  <div className="space-y-4 text-left">
                    <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                      <Layers className="w-4 h-4 text-slate-400" />
                      <h2 className="text-xs sm:text-sm font-bold text-slate-700 tracking-wider uppercase">Proyek Lainnya</h2>
                      <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-bold">
                        {filteredOtherProjects.length} Proyek
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredOtherProjects.map(proj => {
                        const projTasks = tasks.filter(t => t.projectId === proj.id);
                        const totalSp = projTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
                        const projSprintsCount = sprints.filter(s => s.projectId === proj.id).length;

                        return (
                          <div
                            key={proj.id}
                            onClick={() => {
                              setSelectedProjectId(proj.id);
                              setActiveTab('planning'); // Go to backlog & planning
                            }}
                            className="bg-white hover:bg-slate-50/50 border border-slate-200/80 hover:border-gov-400 shadow-2xs rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between group text-left"
                          >
                            <div className="space-y-3">
                              <h4 className="font-bold text-slate-800 text-sm sm:text-base leading-tight group-hover:text-gov-600 transition-colors">
                                {proj.name}
                              </h4>
                              <p className="text-xs text-slate-500 line-clamp-2">
                                {proj.description || 'Tidak ada deskripsi proyek.'}
                              </p>

                              <div className="flex flex-wrap gap-2 mt-3">
                                <span className="bg-slate-50 border border-slate-200/80 text-slate-600 text-[10px] px-2 py-0.5 rounded font-semibold">
                                  {projTasks.length} Tugas
                                </span>
                                <span className="bg-slate-50 border border-slate-200/80 text-slate-600 text-[10px] px-2 py-0.5 rounded font-semibold">
                                  {totalSp} SP
                                </span>
                                <span className="bg-slate-50 border border-slate-200/80 text-slate-600 text-[10px] px-2 py-0.5 rounded font-semibold">
                                  {projSprintsCount} Sprint
                                </span>
                              </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500 font-medium">
                              <span>Manajer: <strong className="text-slate-750 font-semibold">{proj.manager || '-'}</strong></span>
                              <span className="text-gov-600 font-bold group-hover:underline flex items-center gap-1">
                                Mulai Scrum <ArrowRight className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {filteredActiveProjects.length === 0 && filteredOtherProjects.length === 0 && (
                  <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl p-8 max-w-md mx-auto shadow-2xs">
                    <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-700">Proyek Tidak Ditemukan</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-2">
                      Tidak ada proyek dengan nama "{projectSearchQuery}" di workspace ini. Silakan periksa kembali kata kunci pencarian Anda.
                    </p>
                    <button
                      onClick={() => setProjectSearchQuery('')}
                      className="mt-4 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold px-4 py-2 rounded-xl transition-all text-xs border border-slate-200"
                    >
                      Reset Pencarian
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          
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
          
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
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
                    <ScrumFilterBar
                      searchVal={backlogSearch}
                      onSearchChange={setBacklogSearch}
                      categoryVal={backlogCategory}
                      onCategoryChange={setBacklogCategory}
                      priorityVal={backlogPriority}
                      onPriorityChange={setBacklogPriority}
                      picVal={backlogPic}
                      onPicChange={setBacklogPic}
                      uniqueCategories={uniqueCategories}
                      allUsers={allUsers}
                      onReset={() => {
                        setBacklogSearch('');
                        setBacklogCategory('All');
                        setBacklogPriority('All');
                        setBacklogPic('All');
                      }}
                      searchPlaceholder="Cari tugas di backlog & sprint..."
                    />
                    
                    {/* QUICK ACTION & ACCORDION CONTROL BAR */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/70">
                          {activeSprint ? '1 Sprint Aktif' : '0 Sprint Aktif'}
                        </span>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                          {projectSprints.filter(s => s.status === 'Planned').length} Sprint Direncanakan
                        </span>
                        <span className="text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                          {allBacklogSections.length} Field Backlog ({backlogTasks.length} Tugas)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Collapse All / Expand All Button */}
                        <button
                          onClick={toggleAllAccordions}
                          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition-all text-xs cursor-pointer border border-slate-200"
                          title="Buka atau tutup seluruh bagian"
                        >
                          <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {(expandedSprintIds['active'] ?? true) ||
                            projectSprints.filter(s => s.status === 'Planned').some(s => expandedSprintIds[s.id] ?? true) ||
                            allBacklogSections.some(sec => expandedSprintIds['backlog-' + sec.id] ?? true)
                              ? 'Tutup Semua'
                              : 'Buka Semua'}
                          </span>
                        </button>

                        {/* Quick Create Task */}
                        <button
                          onClick={handleCreateTaskForProject}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm text-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Buat Tugas</span>
                        </button>

                        {/* Add Sprint */}
                        <button
                          onClick={() => setIsCreateModalOpen(true)}
                          className="flex items-center gap-1.5 bg-gov-600 hover:bg-gov-700 text-white font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm text-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Sprint</span>
                        </button>

                        {/* Add Backlog Field */}
                        <button
                          onClick={() => setIsCreateBacklogModalOpen(true)}
                          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm text-xs cursor-pointer"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                          <span>Tambah Field Backlog</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* JIRA STYLE SECTION 1: ACTIVE SPRINT */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
                      {/* Active Sprint Section Header */}
                      <div className="p-4 sm:p-5 border-b border-slate-100 bg-gov-25/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <button
                          onClick={() => toggleSprintAccordion('active')}
                          className="flex items-center gap-2.5 font-bold text-slate-800 hover:text-slate-900 transition-colors text-left cursor-pointer group"
                        >
                          {(expandedSprintIds['active'] ?? true) ? (
                            <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600 flex-shrink-0 transition-transform" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 flex-shrink-0 transition-transform" />
                          )}
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
                        </button>

                        {activeSprint && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-indigo-100">
                              {getSprintStoryPoints(activeSprint.id)} Story Points
                            </span>

                            {/* Analytics & Burndown Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setAnalyticsSprint(activeSprint);
                                setIsAnalyticsModalOpen(true);
                              }}
                              className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition-all border border-indigo-200 cursor-pointer"
                              title="Lihat Burndown & Velocity Chart"
                            >
                              <TrendingDown className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Analitik</span>
                            </button>

                            {/* Retrospective Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setRetroSprint(activeSprint);
                                setIsRetroModalOpen(true);
                              }}
                              className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition-all border border-amber-200 cursor-pointer"
                              title="Papan Evaluasi & Retrospektif Sprint"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Retrospektif</span>
                            </button>

                            {/* Daily Standup Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setDailyNotesSprint(activeSprint);
                                setIsDailyNotesModalOpen(true);
                              }}
                              className="flex items-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition-all border border-teal-200 cursor-pointer"
                              title="Catatan Daily Standup Sprint"
                            >
                              <MessageSquareQuote className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Daily Standup</span>
                            </button>

                            {/* Export Dropdown */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setOpenExportMenuSprintId(openExportMenuSprintId === activeSprint.id ? null : activeSprint.id)}
                                className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition-all border border-slate-200 cursor-pointer"
                                title="Export Laporan Sprint"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Export</span>
                              </button>

                              {openExportMenuSprintId === activeSprint.id && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setOpenExportMenuSprintId(null)} 
                                  />
                                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-bold animate-zoomIn">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        exportSprintToExcel({
                                          sprint: activeSprint,
                                          tasks: projectTasks,
                                          projectName: selectedProject?.name || 'Proyek',
                                          users: allUsers
                                        });
                                        setOpenExportMenuSprintId(null);
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-emerald-700 cursor-pointer"
                                    >
                                      <FileSpreadsheet className="w-4 h-4" />
                                      <span>Export Excel (.xlsx)</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        exportSprintToPDF({
                                          sprint: activeSprint,
                                          tasks: projectTasks,
                                          projectName: selectedProject?.name || 'Proyek',
                                          users: allUsers
                                        });
                                        setOpenExportMenuSprintId(null);
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-rose-700 cursor-pointer"
                                    >
                                      <FileText className="w-4 h-4" />
                                      <span>Export PDF (.pdf)</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenEditSprint(activeSprint)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg transition-all border border-slate-200 cursor-pointer"
                              title="Edit Sprint Aktif"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCompleteSprint(activeSprint)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Selesaikan Sprint
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Active Sprint Tasks List */}
                      {(expandedSprintIds['active'] ?? true) && (
                        activeSprint ? (
                          <div 
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDropToSprint(e, activeSprint)}
                            className="p-4"
                          >
                            {renderTaskList(filteredPlanningTasks.filter(t => t.sprintId === activeSprint.id), activeSprint.id)}
                          </div>
                        ) : (
                          <div className="p-8 text-center text-slate-400 text-xs border-t border-slate-100">
                            Tidak ada sprint yang sedang berjalan. Klik tombol <strong>"Mulai"</strong> di sprint yang direncanakan di bawah untuk memulainya.
                          </div>
                        )
                      )}
                    </div>

                    {/* JIRA STYLE SECTION 2: PLANNED SPRINTS */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Sprint Direncanakan (Planned)</h3>
                          <span className="bg-slate-200 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                            {projectSprints.filter(s => s.status === 'Planned').length}
                          </span>
                        </div>
                        <button
                          onClick={() => setIsCreateModalOpen(true)}
                          className="flex items-center gap-1.5 bg-gov-600 hover:bg-gov-700 text-white font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm text-xs sm:text-sm cursor-pointer"
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
                          const sprintTasks = filteredPlanningTasks.filter(t => t.sprintId === sprint.id);
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
                                  className="flex items-center gap-2 font-bold text-slate-700 hover:text-slate-900 transition-colors text-left cursor-pointer"
                                >
                                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                                  <div>
                                    <span className="text-sm font-extrabold text-slate-800">{sprint.name}</span>
                                    {sprint.goal && (
                                      <p className="text-xs text-slate-400 font-semibold mt-0.5 line-clamp-1">Goal: {sprint.goal}</p>
                                    )}
                                  </div>
                                </button>

                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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
                                    onClick={() => handleOpenEditSprint(sprint)}
                                    className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
                                    title="Edit Sprint"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
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
                                    className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-all cursor-pointer"
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

                    {/* JIRA STYLE SECTION 3: MULTIPLE BACKLOG FIELDS */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Field Backlog</h3>
                          <span className="bg-slate-200 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                            {allBacklogSections.length} Bagian
                          </span>
                        </div>
                        <button
                          onClick={() => setIsCreateBacklogModalOpen(true)}
                          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm text-xs sm:text-sm cursor-pointer"
                        >
                          <FolderPlus className="w-4 h-4" />
                          Tambah Field Backlog
                        </button>
                      </div>

                      {/* Render All Backlog Sections */}
                      {allBacklogSections.map(section => {
                        const isDefault = section.id === 'default';
                        const sectionTasks = getBacklogTasks(section.id);
                        const totalSp = sectionTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
                        const isExpanded = expandedSprintIds['backlog-' + section.id] ?? true;
                        const isEditingThisTitle = editingBacklogId === section.id;

                        return (
                          <div 
                            key={section.id}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDropToBacklog(e, section.id)}
                            className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden"
                          >
                            {/* Backlog Section Header */}
                            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <button
                                  onClick={() => toggleSprintAccordion('backlog-' + section.id)}
                                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                                  title={isExpanded ? "Tutup Backlog" : "Buka Backlog"}
                                >
                                  {isExpanded ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                                </button>

                                {isEditingThisTitle ? (
                                  <div className="flex items-center gap-1.5 flex-1 max-w-sm" onClick={e => e.stopPropagation()}>
                                    <input
                                      type="text"
                                      value={tempBacklogTitle}
                                      onChange={e => setTempBacklogTitle(e.target.value)}
                                      className="bg-white border border-gov-400 rounded-lg px-2.5 py-1 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-gov-500/20 w-full"
                                      autoFocus
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleSaveBacklogTitle(section.id);
                                        if (e.key === 'Escape') setEditingBacklogId(null);
                                      }}
                                    />
                                    <button
                                      onClick={() => handleSaveBacklogTitle(section.id)}
                                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                      title="Simpan"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingBacklogId(null)}
                                      className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                      title="Batal"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span 
                                      onClick={() => toggleSprintAccordion('backlog-' + section.id)}
                                      className="text-sm font-extrabold text-slate-800 hover:text-gov-700 cursor-pointer transition-colors truncate"
                                    >
                                      {section.title}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingBacklogId(section.id);
                                        setTempBacklogTitle(section.title);
                                      }}
                                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded transition-colors cursor-pointer"
                                      title="Ubah Nama Judul Field Backlog"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    {isDefault && (
                                      <span className="text-[10px] bg-slate-200/70 text-slate-600 font-semibold px-2 py-0.5 rounded">
                                        Utama
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                                  {sectionTasks.length} Tugas
                                </span>
                                <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-extrabold px-2.5 py-1 rounded-lg">
                                  {totalSp} SP
                                </span>

                                {/* If custom backlog: Delete button */}
                                {!isDefault && (
                                  <button
                                    onClick={() => {
                                      showConfirm(
                                        'Hapus Field Backlog',
                                        `Apakah Anda yakin ingin menghapus field backlog "${section.title}"?\n\nTugas-tugas di dalamnya otomatis dikembalikan ke Backlog Utama.`,
                                        async () => {
                                          const success = await deleteBacklog(section.id);
                                          if (success) {
                                            showToast(`Field backlog "${section.title}" dihapus.`, 'info');
                                          }
                                        }
                                      );
                                    }}
                                    className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-all ml-1 cursor-pointer"
                                    title="Hapus Field Backlog ini"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Backlog Tasks List */}
                            {isExpanded && (
                              <div className="p-4">
                                {/* Backlog Sort Selector */}
                                <div className="flex justify-end mb-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 font-semibold">Urutkan:</span>
                                    <SearchableSelect
                                      options={sortOptions}
                                      value={backlogSortByMap[section.id] || 'created_desc'}
                                      onChange={(val) => setBacklogSortByMap(prev => ({ ...prev, [section.id]: val }))}
                                      className="w-48"
                                    />
                                  </div>
                                </div>

                                {renderTaskList(sectionTasks, null, false)}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs bg-slate-100 text-slate-600 border px-2 py-0.5 rounded-md font-semibold">
                                        {compSp} SP • {completedTasks.length} Task
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRetroSprint(completedSprint);
                                          setIsRetroModalOpen(true);
                                        }}
                                        className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors border border-amber-100 cursor-pointer"
                                        title="Papan Evaluasi & Retrospektif Sprint"
                                      >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDailyNotesSprint(completedSprint);
                                          setIsDailyNotesModalOpen(true);
                                        }}
                                        className="p-1.5 hover:bg-teal-50 text-teal-600 rounded-lg transition-colors border border-teal-100 cursor-pointer"
                                        title="Lihat Catatan Daily Standup"
                                      >
                                        <MessageSquareQuote className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditSprint(completedSprint)}
                                        className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                                        title="Edit Sprint (Nama, Goal, Periode, Catatan)"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAnalyticsSprint(completedSprint);
                                          setIsAnalyticsModalOpen(true);
                                        }}
                                        className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors border border-indigo-100 cursor-pointer"
                                        title="Lihat Burndown / Velocity Chart"
                                      >
                                        <TrendingDown className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          exportSprintToExcel({
                                            sprint: completedSprint,
                                            tasks: projectTasks,
                                            projectName: selectedProject?.name || 'Proyek',
                                            users: allUsers
                                          });
                                        }}
                                        className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors border border-emerald-100 cursor-pointer"
                                        title="Export ke Excel (.xlsx)"
                                      >
                                        <FileSpreadsheet className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          exportSprintToPDF({
                                            sprint: completedSprint,
                                            tasks: projectTasks,
                                            projectName: selectedProject?.name || 'Proyek',
                                            users: allUsers
                                          });
                                        }}
                                        className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors border border-rose-100 cursor-pointer"
                                        title="Export ke PDF (.pdf)"
                                      >
                                        <FileText className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
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
                  <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 p-4 sm:p-6 pb-2 animate-fadeIn">
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
                      <div className="flex-1 flex flex-col min-h-0">
                        {/* Unified Active Sprint Header & Filter Panel */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-xs animate-fadeIn text-left space-y-4">
                          {/* Top row: Sprint Title & Status, Actions */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="flex h-2.5 w-2.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                              </span>
                              <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">{activeSprint.name}</h2>
                              <span className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[9px] px-2 py-0.5 rounded font-extrabold uppercase tracking-wide">
                                Aktif
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-start sm:justify-end">
                              <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                                {getSprintStoryPoints(activeSprint.id)} SP
                              </span>

                              {/* Analytics & Burndown Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setAnalyticsSprint(activeSprint);
                                  setIsAnalyticsModalOpen(true);
                                }}
                                className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition-all border border-indigo-200 cursor-pointer"
                                title="Lihat Burndown & Velocity Chart"
                              >
                                <TrendingDown className="w-3.5 h-3.5" />
                                <span>Analitik</span>
                              </button>

                              {/* Retrospective Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setRetroSprint(activeSprint);
                                  setIsRetroModalOpen(true);
                                }}
                                className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition-all border border-amber-200 cursor-pointer"
                                title="Papan Evaluasi & Retrospektif Sprint"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Retrospektif</span>
                              </button>

                              {/* Daily Standup Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setDailyNotesSprint(activeSprint);
                                  setIsDailyNotesModalOpen(true);
                                }}
                                className="flex items-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition-all border border-teal-200 cursor-pointer"
                                title="Catatan Daily Standup Sprint"
                              >
                                <MessageSquareQuote className="w-3.5 h-3.5" />
                                <span>Daily Standup</span>
                              </button>

                              {/* Export Dropdown */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setOpenExportMenuSprintId(openExportMenuSprintId === `board-${activeSprint.id}` ? null : `board-${activeSprint.id}`)}
                                  className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition-all border border-slate-200 cursor-pointer"
                                  title="Export Laporan Sprint"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Export</span>
                                </button>

                                {openExportMenuSprintId === `board-${activeSprint.id}` && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-40" 
                                      onClick={() => setOpenExportMenuSprintId(null)} 
                                    />
                                    <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-bold animate-zoomIn">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          exportSprintToExcel({
                                            sprint: activeSprint,
                                            tasks: projectTasks,
                                            projectName: selectedProject?.name || 'Proyek',
                                            users: allUsers
                                          });
                                          setOpenExportMenuSprintId(null);
                                        }}
                                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-emerald-700 cursor-pointer"
                                      >
                                        <FileSpreadsheet className="w-4 h-4" />
                                        <span>Export Excel (.xlsx)</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          exportSprintToPDF({
                                            sprint: activeSprint,
                                            tasks: projectTasks,
                                            projectName: selectedProject?.name || 'Proyek',
                                            users: allUsers
                                          });
                                          setOpenExportMenuSprintId(null);
                                        }}
                                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-rose-700 cursor-pointer"
                                      >
                                        <FileText className="w-4 h-4" />
                                        <span>Export PDF (.pdf)</span>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Edit Sprint Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditSprint(activeSprint)}
                                className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition-all border border-slate-200 cursor-pointer"
                                title="Edit Nama, Goal, Periode, & Catatan Sprint"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Edit Sprint</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCompleteSprint(activeSprint)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm text-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Selesaikan Sprint
                              </button>
                            </div>
                          </div>

                          {/* Middle row: Goals & Period & Description */}
                          {(activeSprint.goal || activeSprint.startDate || activeSprint.endDate || activeSprint.description) && (
                            <div className="flex flex-wrap gap-2.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
                              {activeSprint.goal && (
                                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                                  <Target className="w-3.5 h-3.5 text-gov-600 flex-shrink-0" />
                                  <span className="font-semibold text-slate-700">Goal:</span>
                                  <span className="text-slate-600">{activeSprint.goal}</span>
                                </div>
                              )}
                              {(activeSprint.startDate || activeSprint.endDate) && (
                                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                                  <Calendar className="w-3.5 h-3.5 text-gov-600 flex-shrink-0" />
                                  <span className="font-semibold text-slate-700">Periode:</span>
                                  <span className="text-slate-600">{activeSprint.startDate ? formatDate(activeSprint.startDate) : '-'} s/d {activeSprint.endDate ? formatDate(activeSprint.endDate) : '-'}</span>
                                </div>
                              )}
                              {activeSprint.description && (
                                <p className="text-xs text-slate-500 italic mt-0.5 line-clamp-1 flex-1 min-w-[200px]" title={activeSprint.description}>
                                  Desc: {activeSprint.description}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Bottom row: Search & Filters (Merged inline ScrumFilterBar style to save space!) */}
                          <div className="flex flex-col lg:flex-row gap-2.5 border-t border-slate-100 pt-4 bg-slate-50/50 -mx-5 -mb-5 p-4 rounded-b-2xl">
                            <div className="relative flex-1">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                              <input
                                type="text"
                                placeholder="Cari tugas di papan..."
                                value={boardSearch}
                                onChange={(e) => setBoardSearch(e.target.value)}
                                className="w-full bg-white hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-lg pl-8 pr-4 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gov-400 focus:border-gov-400 transition-all font-medium text-slate-800 placeholder-slate-400"
                              />
                            </div>

                            <div className="flex flex-wrap gap-2 flex-shrink-0">
                              <SearchableSelect
                                options={[
                                  { value: 'All', label: 'Semua Kategori' },
                                  ...uniqueCategories.map(cat => ({ value: cat, label: cat }))
                                ]}
                                value={boardCategory}
                                onChange={boardCategory => setBoardCategory(boardCategory)}
                                className="w-full sm:w-40 text-xs"
                                placeholder="Pilih Kategori"
                              />

                              <SearchableSelect
                                options={[
                                  { value: 'All', label: 'Semua Prioritas' },
                                  { value: 'Low', label: 'Low' },
                                  { value: 'Medium', label: 'Medium' },
                                  { value: 'High', label: 'High' },
                                  { value: 'Urgent', label: 'Urgent' }
                                ]}
                                value={boardPriority}
                                onChange={boardPriority => setBoardPriority(boardPriority)}
                                className="w-full sm:w-40 text-xs"
                                placeholder="Pilih Prioritas"
                              />

                              <SearchableSelect
                                options={[
                                  { value: 'All', label: 'Semua PIC' },
                                  ...allUsers.map(u => ({ value: u.name, label: u.name }))
                                ]}
                                value={boardPic}
                                onChange={boardPic => setBoardPic(boardPic)}
                                className="w-full sm:w-40 text-xs"
                                placeholder="Pilih PIC"
                              />

                              {(boardSearch !== '' || boardCategory !== 'All' || boardPriority !== 'All' || boardPic !== 'All') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBoardSearch('');
                                    setBoardCategory('All');
                                    setBoardPriority('All');
                                    setBoardPic('All');
                                  }}
                                  className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1.5 rounded transition-all hover:bg-rose-50 cursor-pointer flex-shrink-0"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 5-COLUMN KANBAN BOARD */}
                        <div className="flex-1 flex overflow-x-auto gap-4 pb-4 scrollbar-thin scrollbar-thumb-slate-300 min-h-[550px] lg:min-h-[650px]">
                          {Object.values(Status).map((status) => {
                            const statusTasks = filteredBoardTasks.filter(t => t.status === status);
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
                                    <div className="text-center py-10 text-xs text-slate-450 border border-dashed border-slate-200/80 rounded-xl bg-white/40">
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
                                                : 'bg-slate-50 border-slate-100 text-slate-650'
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
                                                  className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded border border-slate-200 cursor-pointer"
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
                                                className="flex-1 text-xs border border-slate-350 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gov-500"
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

      {/* 7. CREATE BACKLOG MODAL */}
      {isCreateBacklogModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-zoomIn">
            <div className="px-6 py-5 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-gov-600" />
                Tambah Field Backlog
              </h3>
              <button 
                onClick={() => setIsCreateBacklogModalOpen(false)} 
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBacklogSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Judul Field Backlog *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Contoh: Backlog Desain / Backlog Q3 / Technical Debt"
                  value={newBacklogTitle}
                  onChange={(e) => setNewBacklogTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500 transition-all"
                />
                <p className="text-xs text-slate-400">
                  Field backlog baru akan muncul sebagai wadah terpisah di perencanaan Scrum untuk mengelompokkan tugas.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateBacklogModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-all text-sm cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBacklog || !newBacklogTitle.trim()}
                  className="px-4 py-2.5 bg-gov-600 hover:bg-gov-700 text-white font-bold rounded-xl transition-all shadow-sm text-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingBacklog && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Simpan Field Backlog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. EDIT SPRINT MODAL */}
      {isEditSprintModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-zoomIn">
            <div className="px-6 py-5 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-500" />
                Edit Rencana Sprint
              </h3>
              <button 
                onClick={() => setIsEditSprintModalOpen(false)} 
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSprintSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Sprint *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Sprint"
                  value={editingSprintName}
                  onChange={(e) => setEditingSprintName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sprint Goal / Target</label>
                <input
                  type="text"
                  placeholder="Apa target utama sprint ini?"
                  value={editingSprintGoal}
                  onChange={(e) => setEditingSprintGoal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={editingSprintStart}
                    onChange={(e) => setEditingSprintStart(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={editingSprintEnd}
                    onChange={(e) => setEditingSprintEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catatan / Deskripsi Sprint</label>
                <textarea
                  rows={3}
                  placeholder="Catatan sprint, target detail, atau catatan khusus..."
                  value={editingSprintDesc}
                  onChange={(e) => setEditingSprintDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500 transition-all resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditSprintModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-all text-sm cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditSprint || !editingSprintName.trim()}
                  className="px-4 py-2.5 bg-gov-600 hover:bg-gov-700 text-white font-bold rounded-xl transition-all shadow-sm text-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingEditSprint && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. BULK ACTION BAR */}
      <ScrumBulkActionBar
        selectedCount={selectedTaskIds.size}
        activeSprint={activeSprint}
        plannedSprints={projectSprints.filter(s => s.status === 'Planned')}
        backlogSections={allBacklogSections}
        allUsers={allUsers}
        onMoveTasks={handleBulkMoveTasks}
        onChangePriority={handleBulkChangePriority}
        onChangePic={handleBulkChangePic}
        onClearSelection={() => setSelectedTaskIds(new Set())}
      />

      {/* 10. SPRINT COMPLETION MODAL */}
      {completingSprint && (
        <SprintCompletionModal
          sprint={completingSprint}
          tasks={projectTasks}
          plannedSprints={projectSprints.filter(s => s.status === 'Planned')}
          backlogSections={allBacklogSections}
          isOpen={true}
          onClose={() => setCompletingSprint(null)}
          onConfirm={handleConfirmCompleteSprint}
        />
      )}

      {/* 11. SPRINT ANALYTICS MODAL (BURNDOWN & VELOCITY) */}
      {isAnalyticsModalOpen && analyticsSprint && (
        <SprintAnalyticsModal
          sprint={analyticsSprint}
          allSprints={projectSprints}
          tasks={projectTasks}
          isOpen={true}
          onClose={() => {
            setIsAnalyticsModalOpen(false);
            setAnalyticsSprint(null);
          }}
        />
      )}

      {/* 12. SPRINT RETROSPECTIVE MODAL (3-COLUMN BOARD) */}
      {isRetroModalOpen && retroSprint && (
        <SprintRetroModal
          sprint={retroSprint}
          isOpen={true}
          onClose={() => {
            setIsRetroModalOpen(false);
            setRetroSprint(null);
          }}
          currentUser={currentUser}
        />
      )}

      {/* 13. SPRINT DAILY NOTES MODAL (DAILY STANDUP) */}
      {isDailyNotesModalOpen && dailyNotesSprint && (
        <SprintDailyNotesModal
          sprint={dailyNotesSprint}
          isOpen={true}
          onClose={() => {
            setIsDailyNotesModalOpen(false);
            setDailyNotesSprint(null);
          }}
          currentUser={currentUser}
        />
      )}

    </div>
  );
};

export default ScrumBoard;
