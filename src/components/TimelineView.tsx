import React, { useState, useMemo, useCallback } from 'react';
import { Task, User, ProjectDefinition, Priority, Status, Category, Epic } from '../../types';
import { Calendar, User as UserIcon, Clock, X, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import SearchableSelect from './SearchableSelect';

interface TimelineViewProps {
  tasks: Task[];
  projects: ProjectDefinition[];
  users: User[];
  categories?: any[];
  subCategories?: any[];
  onTaskClick: (task: Task) => void;
  // Epic props
  epics?: Epic[];
  epicFilter?: string; // 'All' or epic ID
  projectFilter?: string; // 'All' or project ID
}

const TimelineView: React.FC<TimelineViewProps> = ({
  tasks, projects, users, categories = [], subCategories = [], onTaskClick,
  epics = [], epicFilter = 'All', projectFilter = 'All'
}) => {
  const [sortBy, setSortBy] = useState<'startDate' | 'priority' | 'status' | 'project'>('startDate');
  const [filterStatus, setFilterStatus] = useState<Status | 'All'>('All');
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [timelineViewMode, setTimelineViewMode] = useState<'tasks' | 'epics'>('tasks');

  // Check if filtering by specific project (to show view mode toggle)
  const isFilteringByProject = projectFilter !== 'All';
  const projectEpics = isFilteringByProject ? epics.filter(e => e.projectId === projectFilter) : [];

  // Toggle Epic expansion
  const toggleEpicExpanded = (epicId: string) => {
    setExpandedEpics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(epicId)) {
        newSet.delete(epicId);
      } else {
        newSet.add(epicId);
      }
      return newSet;
    });
  };

  // Check if filtering by specific Epic
  const isFilteringByEpic = epicFilter !== 'All';
  const filteredEpic = isFilteringByEpic ? epics.find(e => e.id === epicFilter) : null;

  // New Filters


  // Generate date range based on current view mode and filters
  const dates = useMemo(() => {
    let relevantDates = [];

    // Determine which data to use based on current view mode and filters
    if (timelineViewMode === 'epics' && isFilteringByProject) {
      // Epic view mode - use project epics dates
      relevantDates = projectEpics
        .flatMap(epic => [epic.startDate, epic.targetDate])
        .filter(Boolean)
        .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date));
    } else if (isFilteringByEpic && filteredEpic) {
      // Filtering by specific epic - use epic dates + its tasks dates
      const epicDates = [filteredEpic.startDate, filteredEpic.targetDate]
        .filter(Boolean)
        .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date));
      
      const epicTaskDates = tasks
        .filter(task => task.epicId === filteredEpic.id)
        .flatMap(task => [task.startDate, task.deadline])
        .filter(Boolean)
        .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date));
      
      relevantDates = [...epicDates, ...epicTaskDates];
    } else {
      // Normal task view - use all tasks and epics dates
      const taskDates = tasks
        .flatMap(task => [task.startDate, task.deadline])
        .filter(Boolean)
        .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date));

      const epicDates = epics
        .flatMap(epic => [epic.startDate, epic.targetDate])
        .filter(Boolean)
        .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date));

      relevantDates = [...taskDates, ...epicDates];
    }

    // If no relevant dates found, use default range
    if (relevantDates.length === 0) {
      const today = new Date();
      return Array.from({ length: 30 }, (_, i) => {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7 + i);
        return date.toISOString().split('T')[0];
      });
    }

    // Sort dates to find earliest and latest
    relevantDates.sort();
    const earliestDateStr = relevantDates[0];
    const latestDateStr = relevantDates[relevantDates.length - 1];

    // Parse dates safely
    const [startYear, startMonth, startDay] = earliestDateStr.split('-').map(Number);
    const [endYear, endMonth, endDay] = latestDateStr.split('-').map(Number);

    // Add 7 days padding before and after
    const startDate = new Date(startYear, startMonth - 1, startDay - 7);
    const endDate = new Date(endYear, endMonth - 1, endDay + 7);

    // Generate date range using reliable date arithmetic
    const dateRange = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate && dateRange.length < 365) {
      dateRange.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dateRange;
  }, [tasks, epics, timelineViewMode, isFilteringByProject, projectEpics, isFilteringByEpic, filteredEpic]);

  // Filter and sort tasks (Priority filter removed - already filtered from parent)
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      // Status Filter
      if (filterStatus !== 'All' && task.status !== filterStatus) return false;



      return true;
    });

    // Sort tasks
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'startDate':
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case 'priority':
          const priorityOrder = { 'Urgent': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'status':
          const statusOrder = { 'To Do': 0, 'In Progress': 1, 'Review': 2, 'Pending': 3, 'Done': 4 };
          return statusOrder[a.status] - statusOrder[b.status];
        case 'project':
          const aProject = projects.find(p => p.id === a.projectId)?.name || 'No Project';
          const bProject = projects.find(p => p.id === b.projectId)?.name || 'No Project';
          return aProject.localeCompare(bProject);
        default:
          return 0;
      }
    });

    return filtered;
  }, [tasks, sortBy, filterStatus, projects]);

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const getPriorityColor = (priority: Priority, isOverdue: boolean = false) => {
    if (isOverdue) return 'bg-red-600 animate-pulse';

    switch (priority) {
      case Priority.Urgent: return 'bg-red-500';
      case Priority.High: return 'bg-orange-500';
      case Priority.Medium: return 'bg-gov-500';
      default: return 'bg-slate-400';
    }
  };

  const isTaskOverdue = (task: Task) => {
    const today = new Date().toISOString().split('T')[0];
    return task.status !== 'Done' && task.deadline < today;
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case Status.Done: return 'bg-green-100 text-green-800 border-green-200';
      case Status.InProgress: return 'bg-blue-100 text-blue-800 border-blue-200';
      case Status.Review: return 'bg-purple-100 text-purple-800 border-purple-200';
      case Status.Pending: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  // Calculate task position and width based on dates
  const getTaskPosition = useCallback((task: Task) => {
    if (!task.startDate || !task.deadline) {
      return null;
    }

    // Find the index of start and end dates in the dates array
    const startIndex = dates.indexOf(task.startDate);
    const endIndex = dates.indexOf(task.deadline);

    // If dates are not found in the timeline, skip this task
    if (startIndex === -1 || endIndex === -1) {
      return null;
    }

    const dayWidth = 120;

    // Calculate position based on array indices
    const left = startIndex * dayWidth;
    const width = Math.max(dayWidth * 0.8, (endIndex - startIndex + 1) * dayWidth - 8);

    return { left, width };
  }, [dates]);

  // Calculate epic position and width based on dates
  const getEpicPosition = useCallback((epic: Epic) => {
    if (!epic.startDate || !epic.targetDate) {
      return null;
    }

    // Find the index of start and end dates in the dates array
    const startIndex = dates.indexOf(epic.startDate);
    const endIndex = dates.indexOf(epic.targetDate);

    // If dates are not found in the timeline, skip this epic
    if (startIndex === -1 || endIndex === -1) {
      return null;
    }

    const dayWidth = 120;

    // Calculate position based on array indices
    const left = startIndex * dayWidth;
    const width = Math.max(dayWidth * 0.8, (endIndex - startIndex + 1) * dayWidth - 8);

    return { left, width };
  }, [dates]);

  const getEpicColor = (epic: Epic) => {
    switch (epic.color) {
      case 'purple': return 'bg-purple-500';
      case 'blue': return 'bg-blue-500';
      case 'green': return 'bg-emerald-500';
      case 'orange': return 'bg-orange-500';
      case 'red': return 'bg-red-500';
      case 'pink': return 'bg-pink-500';
      case 'indigo': return 'bg-indigo-500';
      case 'teal': return 'bg-teal-500';
      default: return 'bg-purple-500';
    }
  };

  const resetFilters = () => {
    setFilterStatus('All');
    setSortBy('startDate');
  };

  const hasActiveFilters = filterStatus !== 'All';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Filters and Controls - Mobile Optimized */}
      <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex flex-col gap-3 sm:gap-4">

          {/* Main Controls Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Sort By */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <label className="text-xs sm:text-sm font-medium text-slate-700 whitespace-nowrap">Urutkan:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2 sm:px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 min-w-[90px] sm:min-w-[110px]"
                >
                  <option value="startDate">Tanggal</option>
                  <option value="priority">Prioritas</option>
                  <option value="status">Status</option>
                  <option value="project">Project</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <label className="text-xs sm:text-sm font-medium text-slate-700 whitespace-nowrap">Status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-2 sm:px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 min-w-[80px] sm:min-w-[100px]"
                >
                  <option value="All">Semua</option>
                  {Object.values(Status).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors ml-auto sm:ml-0"
                >
                  <X size={14} />
                  Reset
                </button>
              )}

              {/* View Mode Toggle - Show when filtering by project */}
              {isFilteringByProject && projectEpics.length > 0 && (
                <div className="flex items-center gap-1 bg-slate-200 rounded-lg p-0.5">
                  <button
                    onClick={() => setTimelineViewMode('tasks')}
                    className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-md transition-colors ${timelineViewMode === 'tasks'
                      ? 'bg-white text-slate-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    Tasks
                  </button>
                  <button
                    onClick={() => setTimelineViewMode('epics')}
                    className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-md transition-colors ${timelineViewMode === 'epics'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    Epics ({projectEpics.length})
                  </button>
                </div>
              )}
            </div>

            <div className="text-xs sm:text-sm text-slate-500 font-medium whitespace-nowrap">
              {timelineViewMode === 'epics' && isFilteringByProject
                ? `${projectEpics.length} epic${projectEpics.length !== 1 ? 's' : ''}`
                : `${filteredAndSortedTasks.length} task${filteredAndSortedTasks.length !== 1 ? 's' : ''}${filteredAndSortedTasks.length !== tasks.length ? ` (dari ${tasks.length})` : ''}`
              }
            </div>
          </div>

          {/* Advanced Filters Row */}

        </div>
      </div>

      {/* Timeline Container */}
      <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'thin' }}>
        <div className="min-w-fit">
          {/* Header Dates */}
          <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
            <div className="w-80 p-4 shrink-0 font-bold text-slate-700 text-sm border-r border-slate-200 sticky left-0 bg-slate-50 z-30">
              Task Details
            </div>
            <div className="flex" style={{ minWidth: `${dates.length * 120}px` }}>
              {dates.map((date, index) => {
                const isToday = date === new Date().toISOString().split('T')[0];

                return (
                  <div key={date} className={`w-30 shrink-0 p-3 text-center border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-gov-50 border-gov-200' : ''}`} style={{ width: '120px' }}>
                    <div className={`text-xs font-semibold ${isToday ? 'text-gov-700' : 'text-slate-600'}`}>
                      {getDayName(date)}
                      {isToday && <div className="text-[10px] text-gov-600 font-bold">TODAY</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task Rows */}
          <div>
            {/* Epic Header Card - Show when filtering by Epic */}
            {isFilteringByEpic && filteredEpic && (
              <div className="border-b border-purple-200 bg-purple-50/50">
                <div
                  className="flex border-b border-purple-200 cursor-pointer hover:bg-purple-100/50 transition-colors"
                  onClick={() => toggleEpicExpanded(filteredEpic.id)}
                >
                  {/* Epic Info Column */}
                  <div className="w-80 p-4 shrink-0 border-r border-purple-200 bg-purple-50 sticky left-0 z-10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                        <Layers size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {expandedEpics.has(filteredEpic.id) ? (
                            <ChevronDown size={16} className="text-purple-600 flex-shrink-0" />
                          ) : (
                            <ChevronRight size={16} className="text-purple-600 flex-shrink-0" />
                          )}
                          <h3 className="font-bold text-purple-900 text-sm truncate">{filteredEpic.name}</h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                            {filteredAndSortedTasks.length} Tasks
                          </span>
                          {filteredEpic.pic && filteredEpic.pic.length > 0 && (
                            <span className="flex items-center gap-1 text-purple-600">
                              <UserIcon size={12} />
                              {filteredEpic.pic.length === 1
                                ? filteredEpic.pic[0]
                                : `${filteredEpic.pic.length} PICs`}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full font-medium ${filteredEpic.status === 'Completed' ? 'bg-green-100 text-green-700' :
                            filteredEpic.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                            {filteredEpic.status}
                          </span>
                        </div>
                        {filteredEpic.description && (
                          <p className="text-xs text-purple-600 mt-1 line-clamp-1">{filteredEpic.description}</p>
                        )}
                        {/* Epic Dates */}
                        <div className="flex items-center gap-3 text-xs text-purple-600 mt-1">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>{new Date(filteredEpic.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                          </div>
                          <span>→</span>
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{new Date(filteredEpic.targetDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Epic Timeline Area - Show epic bar */}
                  <div className="flex-1 relative bg-purple-50/30" style={{ minWidth: `${dates.length * 120}px` }}>
                    {/* Date Grid Background */}
                    <div className="absolute inset-0 flex">
                      {dates.map((date, index) => {
                        const isToday = date === new Date().toISOString().split('T')[0];
                        return (
                          <div
                            key={date}
                            className={`border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-gov-50/30' : ''}`}
                            style={{
                              width: '120px',
                              backgroundColor: isToday ? '#dbeafe' : (index % 2 === 0 ? 'transparent' : '#f8fafc')
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Epic Timeline Bar */}
                    {(() => {
                      const epicPosition = getEpicPosition(filteredEpic);
                      return epicPosition ? (
                        <div className="absolute inset-0 flex items-center" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
                          <div
                            className={`absolute rounded-lg text-white shadow-sm border border-white/20 flex items-center justify-between px-3 py-2 ${getEpicColor(filteredEpic)}`}
                            style={{
                              left: `${epicPosition.left}px`,
                              width: `${epicPosition.width}px`,
                              height: '40px',
                              zIndex: 5
                            }}
                            title={`${filteredEpic.name}\nStart: ${new Date(filteredEpic.startDate).toLocaleDateString('id-ID')}\nTarget: ${new Date(filteredEpic.targetDate).toLocaleDateString('id-ID')}\nStatus: ${filteredEpic.status}`}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Layers size={16} />
                              <span className="font-medium truncate">{filteredEpic.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                                {Math.round((filteredAndSortedTasks.filter(t => t.status === 'Done').length / Math.max(filteredAndSortedTasks.length, 1)) * 100)}%
                              </span>
                              {filteredEpic.status === 'Completed' && <span>✓</span>}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-xs text-purple-400 font-medium">
                            {expandedEpics.has(filteredEpic.id) ? 'Klik untuk collapse tasks' : 'Klik untuk expand tasks'}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Epic List View - Show when in epics view mode and filtering by project */}
            {timelineViewMode === 'epics' && isFilteringByProject && projectEpics.length > 0 && (
              <>
                {projectEpics.map(epic => {
                  const epicTasks = tasks.filter(t => t.epicId === epic.id);
                  const completedTasks = epicTasks.filter(t => t.status === 'Done');
                  const progress = epicTasks.length > 0 ? Math.round((completedTasks.length / epicTasks.length) * 100) : 0;
                  const isExpanded = expandedEpics.has(epic.id);

                  return (
                    <div key={epic.id}>
                      {/* Epic Row */}
                      <div
                        className="flex border-b border-purple-200 cursor-pointer hover:bg-purple-50/50 transition-colors"
                        onClick={() => toggleEpicExpanded(epic.id)}
                      >
                        {/* Epic Info Column */}
                        <div className="w-80 p-4 shrink-0 border-r border-purple-200 bg-white sticky left-0 z-10">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${epic.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                                epic.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                                  epic.color === 'green' ? 'bg-emerald-100 text-emerald-700' :
                                    epic.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                                      'bg-purple-100 text-purple-700'
                              }`}>
                              <Layers size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown size={14} className="text-purple-600 flex-shrink-0" />
                                ) : (
                                  <ChevronRight size={14} className="text-purple-600 flex-shrink-0" />
                                )}
                                <h4 className="font-semibold text-slate-800 text-sm truncate">{epic.name}</h4>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">
                                  {epicTasks.length} Tasks
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-500">{progress}% selesai</span>
                                {epic.pic && epic.pic.length > 0 && (
                                  <>
                                    <span className="text-slate-400">•</span>
                                    <span className="flex items-center gap-1 text-slate-500">
                                      <UserIcon size={10} />
                                      {epic.pic.length === 1 ? epic.pic[0] : `${epic.pic.length} PICs`}
                                    </span>
                                  </>
                                )}
                              </div>
                              {/* Epic Dates */}
                              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                <div className="flex items-center gap-1">
                                  <Calendar size={10} />
                                  <span>{new Date(epic.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                </div>
                                <span>→</span>
                                <div className="flex items-center gap-1">
                                  <Clock size={10} />
                                  <span>{new Date(epic.targetDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Epic Progress Bar Area */}
                        <div className="flex-1 relative" style={{ minWidth: `${dates.length * 120}px` }}>
                          {/* Date Grid Background */}
                          <div className="absolute inset-0 flex">
                            {dates.map((date, index) => {
                              const isToday = date === new Date().toISOString().split('T')[0];
                              return (
                                <div
                                  key={date}
                                  className={`border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-gov-50/30' : ''}`}
                                  style={{
                                    width: '120px',
                                    backgroundColor: isToday ? '#dbeafe' : (index % 2 === 0 ? 'transparent' : '#f8fafc')
                                  }}
                                />
                              );
                            })}
                          </div>

                          {/* Epic Timeline Bar */}
                          {(() => {
                            const epicPosition = getEpicPosition(epic);
                            return epicPosition ? (
                              <div className="absolute inset-0 flex items-center" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
                                <div
                                  className={`absolute rounded-lg text-white shadow-sm border border-white/20 flex items-center justify-between px-3 py-2 ${getEpicColor(epic)}`}
                                  style={{
                                    left: `${epicPosition.left}px`,
                                    width: `${epicPosition.width}px`,
                                    height: '36px',
                                    zIndex: 5
                                  }}
                                  title={`${epic.name}\nStart: ${new Date(epic.startDate).toLocaleDateString('id-ID')}\nTarget: ${new Date(epic.targetDate).toLocaleDateString('id-ID')}\nStatus: ${epic.status}`}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Layers size={14} />
                                    <span className="text-sm font-medium truncate">{epic.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                                      {progress}%
                                    </span>
                                    {epic.status === 'Completed' && <span className="text-sm">✓</span>}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex items-center px-4">
                                <div className="w-full max-w-md">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${epic.color === 'purple' ? 'bg-purple-500' :
                                            epic.color === 'blue' ? 'bg-blue-500' :
                                              epic.color === 'green' ? 'bg-emerald-500' :
                                                epic.color === 'orange' ? 'bg-orange-500' :
                                                  'bg-purple-500'
                                          }`}
                                        style={{ width: `${progress}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-slate-500 font-medium w-10">{progress}%</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Expanded Tasks for this Epic */}
                      {isExpanded && epicTasks.length > 0 && (
                        <div className="bg-purple-50/20">
                          {epicTasks.map(task => {
                            const position = getTaskPosition(task);
                            const taskPics = Array.isArray(task.pic) ? task.pic : [task.pic];
                            return (
                              <div key={task.id} className="flex border-b border-slate-100 hover:bg-slate-50/50 transition-colors min-h-[60px]">
                                {/* Indented Task Info */}
                                <div className="w-80 p-3 pl-12 shrink-0 border-r border-slate-200 bg-white sticky left-0 z-10">
                                  <div className="font-medium text-slate-700 text-xs leading-tight truncate">{task.title}</div>
                                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                                    <span className={`px-1.5 py-0.5 rounded-full font-medium ${task.status === 'Done' ? 'bg-green-100 text-green-700' :
                                        task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                          'bg-slate-100 text-slate-600'
                                      }`}>{task.status}</span>
                                    <span>{taskPics[0]}</span>
                                  </div>
                                </div>
                                {/* Task Timeline */}
                                <div className="flex-1 relative" style={{ minWidth: `${dates.length * 120}px` }}>
                                  {position && (
                                    <div className="absolute inset-0 flex items-center" style={{ paddingLeft: '12px' }}>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                                        className={`absolute rounded text-white shadow-sm hover:shadow-md transition-all text-[10px] font-medium px-2 py-1 truncate ${getPriorityColor(task.priority, isTaskOverdue(task))}`}
                                        style={{ left: `${position.left}px`, width: `${position.width}px`, height: '24px', zIndex: 5 }}
                                      >
                                        {task.title}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {isExpanded && epicTasks.length === 0 && (
                        <div className="py-4 px-12 text-sm text-slate-400 italic bg-purple-50/20 border-b border-slate-100">
                          Belum ada task di epic ini
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* No epics found message - Show when in epics view mode but no epics */}
            {timelineViewMode === 'epics' && isFilteringByProject && projectEpics.length === 0 && (
              <div className="flex items-center justify-center p-12 text-slate-400">
                <div className="text-center">
                  <Layers size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No epics found</p>
                  <p className="text-sm">This project doesn't have any epics yet</p>
                </div>
              </div>
            )}

            {/* Show tasks: normal task view */}
            {timelineViewMode === 'tasks' && (!isFilteringByEpic || (isFilteringByEpic && filteredEpic && expandedEpics.has(filteredEpic.id))) && filteredAndSortedTasks.length > 0 ? (
              filteredAndSortedTasks.map((task) => {
                const position = getTaskPosition(task);
                const project = projects.find(p => p.id === task.projectId);
                const taskPics = Array.isArray(task.pic) ? task.pic : [task.pic];
                const assignedUsers = users.filter(u => taskPics.includes(u.name));

                return (
                  <div key={task.id} className="flex border-b border-slate-100 hover:bg-slate-50/50 transition-colors min-h-[80px]">
                    {/* Task Info Column */}
                    <div className="w-80 p-4 shrink-0 border-r border-slate-200 bg-white sticky left-0 z-10">
                      <div className="flex flex-col gap-2">
                        {/* Task Title */}
                        <div className="font-medium text-slate-800 text-sm leading-tight">
                          {task.title}
                        </div>

                        {/* Task Meta Info */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {/* Status */}
                          <span className={`px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>

                          {/* Priority */}
                          <span className={`px-2 py-1 rounded-full text-white text-xs font-medium ${getPriorityColor(task.priority, isTaskOverdue(task))}`}>
                            {isTaskOverdue(task) ? '⚠️ OVERDUE' : task.priority}
                          </span>

                          {/* Assignees */}
                          <div className="flex items-center gap-1 text-slate-600">
                            <UserIcon size={12} />
                            <span>
                              {taskPics.length === 1
                                ? taskPics[0]
                                : `${taskPics.length} PIC${taskPics.length > 1 ? 's' : ''}`
                              }
                            </span>
                          </div>

                          {/* Project */}
                          {project && (
                            <div className="flex items-center gap-1 text-slate-600">
                              <span className="text-slate-400">•</span>
                              <span>{project.name}</span>
                            </div>
                          )}
                        </div>

                        {/* Dates */}
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>{new Date(task.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                          </div>
                          <span>→</span>
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{new Date(task.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                          </div>

                        </div>
                      </div>
                    </div>

                    {/* Timeline Area */}
                    <div className="flex-1 relative" style={{ minWidth: `${dates.length * 120}px` }}>
                      {/* Date Grid Background */}
                      <div className="absolute inset-0 flex">
                        {dates.map((date, index) => {
                          const isToday = date === new Date().toISOString().split('T')[0];
                          return (
                            <div
                              key={date}
                              className={`border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-gov-50/30' : ''}`}
                              style={{
                                width: '120px',
                                backgroundColor: isToday ? '#dbeafe' : (index % 2 === 0 ? 'transparent' : '#f8fafc')
                              }}
                            />
                          );
                        })}
                      </div>

                      {/* Task Bar */}
                      {position && (
                        <div className="absolute inset-0 flex items-center" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
                          <button
                            onClick={() => onTaskClick(task)}
                            className={`absolute rounded-lg text-white shadow-sm hover:shadow-md transition-all text-xs font-medium px-3 py-2 overflow-hidden border border-white/20 flex items-center gap-2 ${getPriorityColor(task.priority, isTaskOverdue(task))}`}
                            style={{
                              left: `${position.left}px`,
                              width: `${position.width}px`,
                              height: '32px',
                              zIndex: 5
                            }}
                            title={`${task.title}\nStart: ${new Date(task.startDate).toLocaleDateString('id-ID')}\nEnd: ${new Date(task.deadline).toLocaleDateString('id-ID')}\nStatus: ${task.status}\nPriority: ${task.priority}`}
                          >
                            <div className="truncate flex items-center justify-between gap-1 w-full">
                              <span className="truncate">{task.title}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                {task.status === 'Done' && <span className="text-xs">✓</span>}
                              </div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : timelineViewMode === 'tasks' && filteredAndSortedTasks.length === 0 ? (
              <div className="flex items-center justify-center p-12 text-slate-400">
                <div className="text-center">
                  <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No tasks found</p>
                  <p className="text-sm">Try adjusting your filters or add some tasks</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Legend - Mobile Optimized */}
      <div className="p-2 sm:p-3 bg-slate-50 border-t border-slate-200 text-[10px] sm:text-xs text-slate-500">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <span className="flex items-center gap-1 sm:gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /> Urgent</span>
            <span className="flex items-center gap-1 sm:gap-2"><div className="w-2 h-2 rounded-full bg-orange-500" /> High</span>
            <span className="flex items-center gap-1 sm:gap-2"><div className="w-2 h-2 rounded-full bg-gov-500" /> Medium</span>
            <span className="flex items-center gap-1 sm:gap-2"><div className="w-2 h-2 rounded-full bg-slate-400" /> Low</span>
            {(timelineViewMode === 'epics' || isFilteringByEpic) && (
              <span className="flex items-center gap-1 sm:gap-2">
                <Layers size={12} className="text-purple-500" />
                Epic Timeline
              </span>
            )}
          </div>
          <div className="hidden sm:block text-slate-400">
            {timelineViewMode === 'epics' || isFilteringByEpic 
              ? 'Klik epic untuk detail • Bar menunjukkan durasi epic'
              : 'Klik task untuk detail • Scroll horizontal untuk lihat tanggal'
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineView;