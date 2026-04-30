// src/components/TaskExportModal.tsx
// Modal untuk export task dengan filter dan pilihan format (PDF & Text)

import React, { useState, useMemo } from 'react';
import { X, Download, FileText, Copy, Check, Filter, Calendar, User, FolderOpen, Tag, AlertCircle, Search } from 'lucide-react';
import { Task, User as UserType, ProjectDefinition, Epic, Category, Status, Priority } from '../../types';
import { exportTasksToPDF } from '../utils/taskExportPDF';
import { exportTasksToText } from '../utils/taskExportText';
import { formatDate } from '../utils/formatters';
import SearchableSelect from './SearchableSelect';
import MultiSelectChip from './MultiSelectChip';

interface TaskExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  users: UserType[];
  projects: ProjectDefinition[];
  epics: Epic[];
}

const TaskExportModal: React.FC<TaskExportModalProps> = ({
  isOpen,
  onClose,
  tasks,
  users,
  projects,
  epics
}) => {
  // Filter states - changed to arrays for multiple selection
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedEpic, setSelectedEpic] = useState<string>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedPICs, setSelectedPICs] = useState<string[]>([]);
  const [dateRangePreset, setDateRangePreset] = useState<string>('all'); // 'all', 'today', 'thisWeek', 'thisMonth', 'custom'
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // Export states
  const [exportVersion, setExportVersion] = useState<'summary' | 'detailed'>('detailed'); // 'summary' or 'detailed'
  const [isExporting, setIsExporting] = useState(false);
  const [textCopied, setTextCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Manual selection states
  const [selectionMode, setSelectionMode] = useState<'filter' | 'manual'>('filter'); // 'filter' or 'manual'
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [manualSearchQuery, setManualSearchQuery] = useState<string>(''); // Search in manual mode

  // Calculate date range based on preset
  const getDateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (dateRangePreset) {
      case 'today': {
        const dateStr = today.toISOString().split('T')[0];
        return { from: dateStr, to: dateStr };
      }
      case 'thisWeek': {
        const firstDay = new Date(today);
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday as first day
        firstDay.setDate(today.getDate() + diff);
        
        const lastDay = new Date(firstDay);
        lastDay.setDate(firstDay.getDate() + 6);
        
        return {
          from: firstDay.toISOString().split('T')[0],
          to: lastDay.toISOString().split('T')[0]
        };
      }
      case 'thisMonth': {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        return {
          from: firstDay.toISOString().split('T')[0],
          to: lastDay.toISOString().split('T')[0]
        };
      }
      case 'custom':
        return { from: dateFrom, to: dateTo };
      default:
        return { from: '', to: '' };
    }
  }, [dateRangePreset, dateFrom, dateTo]);

  // Get unique PICs - directly from users list (profiles only)
  const allPICs = useMemo(() => {
    return users
      .map(user => user.name)
      .filter(name => name && name.trim())
      .sort();
  }, [users]);

  // Get base filtered tasks (for filter mode)
  const baseFilteredTasks = useMemo(() => {
    const { from, to } = getDateRange;
    
    return tasks.filter(task => {
      // Project filter
      if (selectedProject !== 'all' && task.projectId !== selectedProject) return false;
      
      // Epic filter
      if (selectedEpic !== 'all' && task.epicId !== selectedEpic) return false;
      
      // Category filter - multiple selection
      if (selectedCategories.length > 0 && !selectedCategories.includes(task.category)) return false;
      
      // Status filter - multiple selection
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(task.status)) return false;
      
      // Priority filter - multiple selection
      if (selectedPriorities.length > 0 && !selectedPriorities.includes(task.priority)) return false;
      
      // PIC filter - multiple selection, check if any task PIC matches selected PICs
      if (selectedPICs.length > 0) {
        const taskPics = Array.isArray(task.pic) ? task.pic : [task.pic];
        // Map UUID to names for comparison
        const taskPicNames = taskPics.map(pic => {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pic);
          if (isUUID) {
            const user = users.find(u => u.id === pic);
            return user ? user.name : pic;
          }
          return pic;
        });
        const hasMatchingPIC = taskPicNames.some(pic => selectedPICs.includes(pic));
        if (!hasMatchingPIC) return false;
      }
      
      // Date range filter based on deadline
      if (from && task.deadline < from) return false;
      if (to && task.deadline > to) return false;
      
      return true;
    });
  }, [tasks, selectedProject, selectedEpic, selectedCategories, selectedStatuses, selectedPriorities, selectedPICs, getDateRange, users]);

  // Final filtered tasks based on selection mode
  const filteredTasks = useMemo(() => {
    if (selectionMode === 'manual') {
      return tasks.filter(task => selectedTaskIds.has(task.id));
    }
    return baseFilteredTasks;
  }, [selectionMode, tasks, selectedTaskIds, baseFilteredTasks]);

  // Tasks to display in manual mode (with filters and search applied)
  const manualModeTasks = useMemo(() => {
    let filtered = baseFilteredTasks; // Apply same filters as auto mode
    
    // Apply search query
    if (manualSearchQuery.trim()) {
      const query = manualSearchQuery.toLowerCase();
      filtered = filtered.filter(task => {
        const projectName = task.projectId 
          ? projects.find(p => p.id === task.projectId)?.name || ''
          : '';
        const picNames = Array.isArray(task.pic) ? task.pic.join(' ') : task.pic;
        
        return (
          task.title.toLowerCase().includes(query) ||
          task.category.toLowerCase().includes(query) ||
          task.status.toLowerCase().includes(query) ||
          task.priority.toLowerCase().includes(query) ||
          projectName.toLowerCase().includes(query) ||
          picNames.toLowerCase().includes(query)
        );
      });
    }
    
    return filtered;
  }, [baseFilteredTasks, manualSearchQuery, projects]);

  // Get filtered epics based on selected project
  const filteredEpics = useMemo(() => {
    if (selectedProject === 'all') return epics;
    return epics.filter(epic => epic.projectId === selectedProject);
  }, [epics, selectedProject]);

  // Reset filters
  const resetFilters = () => {
    setSelectedProject('all');
    setSelectedEpic('all');
    setSelectedCategories([]);
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setSelectedPICs([]);
    setDateRangePreset('all');
    setDateFrom('');
    setDateTo('');
    setManualSearchQuery(''); // Also reset search in manual mode
  };

  // Manual selection handlers
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const selectAllTasks = () => {
    setSelectedTaskIds(new Set(manualModeTasks.map(t => t.id)));
  };

  const deselectAllTasks = () => {
    setSelectedTaskIds(new Set());
  };

  const isAllSelected = selectedTaskIds.size === manualModeTasks.length && manualModeTasks.length > 0;
  const isSomeSelected = selectedTaskIds.size > 0 && selectedTaskIds.size < manualModeTasks.length;

  // Export to PDF
  const handleExportPDF = async () => {
    if (filteredTasks.length === 0) {
      alert('Tidak ada task yang sesuai dengan filter');
      return;
    }

    setIsExporting(true);
    try {
      const { from, to } = getDateRange;
      const dateRangeLabel = dateRangePreset === 'today' ? 'Hari Ini' :
                             dateRangePreset === 'thisWeek' ? 'Minggu Ini' :
                             dateRangePreset === 'thisMonth' ? 'Bulan Ini' :
                             dateRangePreset === 'custom' ? 'Custom' : undefined;
      
      await exportTasksToPDF(filteredTasks, {
        projects,
        epics,
        users,
        version: exportVersion,
        filters: {
          project: selectedProject !== 'all' ? projects.find(p => p.id === selectedProject)?.name : undefined,
          epic: selectedEpic !== 'all' ? epics.find(e => e.id === selectedEpic)?.name : undefined,
          category: selectedCategories.length > 0 ? selectedCategories.join(', ') : undefined,
          status: selectedStatuses.length > 0 ? selectedStatuses.join(', ') : undefined,
          priority: selectedPriorities.length > 0 ? selectedPriorities.join(', ') : undefined,
          pic: selectedPICs.length > 0 ? selectedPICs.join(', ') : undefined,
          dateRangeLabel,
          dateFrom: from,
          dateTo: to
        }
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Gagal mengekspor PDF. Silakan coba lagi.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to Text (copyable)
  const handleExportText = () => {
    if (filteredTasks.length === 0) {
      alert('Tidak ada task yang sesuai dengan filter');
      return;
    }

    const { from, to } = getDateRange;
    const dateRangeLabel = dateRangePreset === 'today' ? 'Hari Ini' :
                           dateRangePreset === 'thisWeek' ? 'Minggu Ini' :
                           dateRangePreset === 'thisMonth' ? 'Bulan Ini' :
                           dateRangePreset === 'custom' ? 'Custom' : undefined;

    const textContent = exportTasksToText(filteredTasks, {
      projects,
      epics,
      users,
      version: exportVersion,
      filters: {
        project: selectedProject !== 'all' ? projects.find(p => p.id === selectedProject)?.name : undefined,
        epic: selectedEpic !== 'all' ? epics.find(e => e.id === selectedEpic)?.name : undefined,
        category: selectedCategories.length > 0 ? selectedCategories.join(', ') : undefined,
        status: selectedStatuses.length > 0 ? selectedStatuses.join(', ') : undefined,
        priority: selectedPriorities.length > 0 ? selectedPriorities.join(', ') : undefined,
        pic: selectedPICs.length > 0 ? selectedPICs.join(', ') : undefined,
        dateRangeLabel,
        dateFrom: from,
        dateTo: to
      }
    });

    navigator.clipboard.writeText(textContent);
    setTextCopied(true);
    setTimeout(() => setTextCopied(false), 2000);
  };

  // Preview text
  const previewText = useMemo(() => {
    if (!showPreview || filteredTasks.length === 0) return '';
    return exportTasksToText(filteredTasks.slice(0, 5), { projects, epics, users });
  }, [showPreview, filteredTasks, projects, epics, users]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-gov-600 to-gov-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Download size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Export Task</h2>
              <p className="text-sm text-white/80">Download task dengan filter dan detail lengkap</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Selection Mode Toggle */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Mode Seleksi Task
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectionMode('filter')}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                  selectionMode === 'filter'
                    ? 'bg-gov-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <div className="text-left">
                  <div className="font-bold">Filter Otomatis</div>
                  <div className="text-xs opacity-80 mt-1">Export otomatis berdasarkan filter</div>
                </div>
              </button>
              <button
                onClick={() => setSelectionMode('manual')}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                  selectionMode === 'manual'
                    ? 'bg-gov-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <div className="text-left">
                  <div className="font-bold">Pilih Manual</div>
                  <div className="text-xs opacity-80 mt-1">Centang task yang diinginkan</div>
                </div>
              </button>
            </div>
          </div>

          {/* Filter Section - Show in both modes */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter size={20} className="text-gov-600" />
              <h3 className="text-lg font-bold text-slate-800">
                {selectionMode === 'filter' ? 'Filter Task' : 'Filter & Cari Task'}
              </h3>
              <button
                onClick={resetFilters}
                className="ml-auto text-sm text-gov-600 hover:text-gov-700 font-medium"
              >
                Reset Filter
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <FolderOpen size={16} className="inline mr-1" />
                  Project
                </label>
                <SearchableSelect
                  options={projects.map(p => ({ value: p.id, label: p.name }))}
                  value={selectedProject === 'all' ? '' : selectedProject}
                  onChange={(val) => {
                    setSelectedProject(val || 'all');
                    setSelectedEpic('all'); // Reset epic when project changes
                  }}
                  placeholder="Project"
                  emptyOption="Semua Project"
                  className="w-full"
                />
              </div>

              {/* Epic Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Tag size={16} className="inline mr-1" />
                  Epic
                </label>
                <SearchableSelect
                  options={filteredEpics.map(e => ({ value: e.id, label: e.name }))}
                  value={selectedEpic === 'all' ? '' : selectedEpic}
                  onChange={(val) => setSelectedEpic(val || 'all')}
                  placeholder="Epic"
                  emptyOption="Semua Epic"
                  className="w-full"
                  disabled={selectedProject === 'all'}
                />
              </div>

              {/* Category Filter - Multiple Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Tag size={16} className="inline mr-1" />
                  Kategori (Multiple)
                </label>
                <MultiSelectChip
                  options={Object.values(Category).map(cat => ({ value: cat, label: cat }))}
                  value={selectedCategories}
                  onChange={setSelectedCategories}
                  placeholder="Pilih kategori..."
                  searchPlaceholder="Cari kategori..."
                  className="w-full"
                />
              </div>

              {/* Status Filter - Multiple Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <AlertCircle size={16} className="inline mr-1" />
                  Status (Multiple)
                </label>
                <MultiSelectChip
                  options={Object.values(Status).map(status => ({ value: status, label: status }))}
                  value={selectedStatuses}
                  onChange={setSelectedStatuses}
                  placeholder="Pilih status..."
                  searchPlaceholder="Cari status..."
                  className="w-full"
                />
              </div>

              {/* Priority Filter - Multiple Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <AlertCircle size={16} className="inline mr-1" />
                  Prioritas (Multiple)
                </label>
                <MultiSelectChip
                  options={Object.values(Priority).map(priority => ({ value: priority, label: priority }))}
                  value={selectedPriorities}
                  onChange={setSelectedPriorities}
                  placeholder="Pilih prioritas..."
                  searchPlaceholder="Cari prioritas..."
                  className="w-full"
                />
              </div>

              {/* PIC Filter - Multiple Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <User size={16} className="inline mr-1" />
                  PIC (Multiple)
                </label>
                <MultiSelectChip
                  options={allPICs.map(pic => ({ value: pic, label: pic }))}
                  value={selectedPICs}
                  onChange={setSelectedPICs}
                  placeholder="Pilih PIC..."
                  searchPlaceholder="Cari PIC..."
                  className="w-full"
                />
              </div>

              {/* Date Range Preset */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Calendar size={16} className="inline mr-1" />
                  Rentang Tanggal (Deadline)
                </label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setDateRangePreset('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      dateRangePreset === 'all'
                        ? 'bg-gov-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setDateRangePreset('today')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      dateRangePreset === 'today'
                        ? 'bg-gov-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Hari Ini
                  </button>
                  <button
                    onClick={() => setDateRangePreset('thisWeek')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      dateRangePreset === 'thisWeek'
                        ? 'bg-gov-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Minggu Ini
                  </button>
                  <button
                    onClick={() => setDateRangePreset('thisMonth')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      dateRangePreset === 'thisMonth'
                        ? 'bg-gov-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Bulan Ini
                  </button>
                  <button
                    onClick={() => setDateRangePreset('custom')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      dateRangePreset === 'custom'
                        ? 'bg-gov-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Custom
                  </button>
                </div>
                
                {/* Custom Date Range Inputs */}
                {dateRangePreset === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Dari</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Sampai</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                )}
                
                {/* Show selected date range */}
                {dateRangePreset !== 'all' && getDateRange.from && (
                  <p className="text-xs text-slate-500 mt-2">
                    📅 {formatDate(getDateRange.from)} - {formatDate(getDateRange.to)}
                  </p>
                )}
              </div>
            </div>
            </div>

          {/* Manual Selection List - Only show in manual mode */}
          {selectionMode === 'manual' && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-bold text-slate-800">Pilih Task</h3>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={selectAllTasks}
                    className="text-sm text-gov-600 hover:text-gov-700 font-medium"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={deselectAllTasks}
                    className="text-sm text-gov-600 hover:text-gov-700 font-medium"
                  >
                    Hapus Semua
                  </button>
                </div>
              </div>
              
              {/* Search box for manual mode */}
              <div className="mb-3">
                <input
                  type="text"
                  value={manualSearchQuery}
                  onChange={(e) => setManualSearchQuery(e.target.value)}
                  placeholder="Cari task berdasarkan judul, kategori, status, PIC..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-500 focus:border-transparent"
                />
              </div>
              
              <div className="border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
                {manualModeTasks.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    {manualSearchQuery.trim() ? 'Tidak ada task yang sesuai dengan pencarian' : 'Tidak ada task tersedia'}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {manualModeTasks.map(task => {
                      const projectName = task.projectId 
                        ? projects.find(p => p.id === task.projectId)?.name 
                        : null;
                      const picNames = Array.isArray(task.pic) ? task.pic.join(', ') : task.pic;
                      
                      return (
                        <label
                          key={task.id}
                          className="flex items-start gap-3 p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTaskIds.has(task.id)}
                            onChange={() => toggleTaskSelection(task.id)}
                            className="mt-1 w-4 h-4 text-gov-600 border-slate-300 rounded focus:ring-gov-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-800 truncate">
                              {task.title}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100">
                                {task.status}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100">
                                {task.priority}
                              </span>
                              {projectName && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                                  {projectName}
                                </span>
                              )}
                              <span className="text-slate-600">
                                PIC: {picNames}
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="mt-2 text-sm text-slate-600">
                {selectedTaskIds.size} dari {manualModeTasks.length} task dipilih
                {manualSearchQuery.trim() && ` (dari ${baseFilteredTasks.length} task yang difilter)`}
              </div>
            </div>
          )}

          {/* Export Version Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              <FileText size={16} className="inline mr-1" />
              Versi Export
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setExportVersion('summary')}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                  exportVersion === 'summary'
                    ? 'bg-gov-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <div className="text-left">
                  <div className="font-bold">Versi Singkat</div>
                  <div className="text-xs opacity-80 mt-1">Hanya tabel ringkasan task</div>
                </div>
              </button>
              <button
                onClick={() => setExportVersion('detailed')}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                  exportVersion === 'detailed'
                    ? 'bg-gov-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <div className="text-left">
                  <div className="font-bold">Versi Lengkap</div>
                  <div className="text-xs opacity-80 mt-1">Tabel + detail setiap task</div>
                </div>
              </button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Task yang akan diexport:</p>
                <p className="text-2xl font-bold text-gov-600">{filteredTasks.length}</p>
              </div>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-sm text-gov-600 hover:text-gov-700 font-medium"
              >
                {showPreview ? 'Sembunyikan' : 'Lihat'} Preview
              </button>
            </div>
          </div>

          {/* Preview */}
          {showPreview && filteredTasks.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-bold text-slate-700 mb-2">Preview (5 task pertama):</h4>
              <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">
                {previewText}
              </pre>
            </div>
          )}
        </div>

        {/* Footer - Export Buttons */}
        <div className="border-t border-slate-200 p-6 bg-slate-50">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExportPDF}
              disabled={isExporting || filteredTasks.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gov-600 text-white rounded-lg font-medium hover:bg-gov-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText size={20} />
              {isExporting ? 'Mengekspor...' : 'Download PDF'}
            </button>
            
            <button
              onClick={handleExportText}
              disabled={filteredTasks.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {textCopied ? (
                <>
                  <Check size={20} />
                  Tersalin!
                </>
              ) : (
                <>
                  <Copy size={20} />
                  Copy Text
                </>
              )}
            </button>
          </div>
          
          {filteredTasks.length === 0 && (
            <p className="text-sm text-amber-600 text-center mt-3">
              Tidak ada task yang sesuai dengan filter yang dipilih
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskExportModal;
