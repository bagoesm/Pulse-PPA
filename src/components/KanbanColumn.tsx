import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, Status, ProjectDefinition } from '../../types';
import TaskCard from './TaskCard';

interface KanbanColumnProps {
  status: Status;
  tasks: Task[];
  projects: ProjectDefinition[];
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: Status) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onTaskClick: (task: Task) => void;
  onTaskShare?: (task: Task) => void;
  checkEditPermission: (task: Task) => boolean;
}

const TASKS_PER_PAGE = 20;

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tasks,
  projects,
  onDragOver,
  onDrop,
  onDragStart,
  onTaskClick,
  onTaskShare,
  checkEditPermission
}) => {
  const [visibleTasks, setVisibleTasks] = useState<Task[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Sort tasks by priority and date
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Priority order: Urgent > High > Medium > Low
      const priorityOrder = { 'Urgent': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Then by deadline (earliest first)
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [tasks]);

  // Load initial tasks
  useEffect(() => {
    const initialTasks = sortedTasks.slice(0, TASKS_PER_PAGE);
    setVisibleTasks(initialTasks);
    setCurrentPage(0);
  }, [sortedTasks]);

  // Load more tasks function
  const loadMoreTasks = useCallback(() => {
    if (isLoading) return;
    
    const nextPage = currentPage + 1;
    const startIndex = nextPage * TASKS_PER_PAGE;
    const endIndex = startIndex + TASKS_PER_PAGE;
    const newTasks = sortedTasks.slice(startIndex, endIndex);
    
    if (newTasks.length > 0) {
      setIsLoading(true);
      // Simulate loading delay
      setTimeout(() => {
        setVisibleTasks(prev => [...prev, ...newTasks]);
        setCurrentPage(nextPage);
        setIsLoading(false);
      }, 200);
    }
  }, [sortedTasks, currentPage, isLoading]);

  // Scroll handler for lazy loading
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50;
    
    if (isNearBottom && !isLoading && visibleTasks.length < sortedTasks.length) {
      loadMoreTasks();
    }
  }, [loadMoreTasks, isLoading, visibleTasks.length, sortedTasks.length]);

  const getStatusColor = () => {
    switch (status) {
      case Status.Done: return 'bg-green-500';
      case Status.ToDo: return 'bg-slate-400';
      case Status.InProgress: return 'bg-gov-500';
      default: return 'bg-orange-400';
    }
  };

  return (
    <div 
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, status)}
      className="flex-1 flex flex-col min-w-[220px] sm:min-w-[280px] bg-slate-100/50 rounded-xl border border-slate-200/60 max-h-full"
    >
      {/* Column Header */}
      <div className="p-3 sm:p-4 flex items-center justify-between sticky top-0 bg-slate-100/50 backdrop-blur-sm z-10 rounded-t-xl">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <h3 className="font-bold text-slate-700 text-xs sm:text-sm tracking-wide">{status}</h3>
          <span className="bg-slate-200 text-slate-600 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold">
            {tasks.length}
          </span>
          {visibleTasks.length < tasks.length && (
            <span className="bg-blue-100 text-blue-600 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium hidden sm:inline">
              +{tasks.length - visibleTasks.length}
            </span>
          )}
        </div>
        <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
      </div>

      {/* Tasks Container */}
      <div 
        className="flex-1 overflow-y-auto px-2 sm:px-3 pb-2 sm:pb-3 kanban-scroll" 
        onScroll={handleScroll}
      >
        {visibleTasks.length > 0 ? (
          <>
            {visibleTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                projects={projects}
                onDragStart={onDragStart} 
                onClick={onTaskClick}
                onShare={onTaskShare}
                canEdit={checkEditPermission(task)}
              />
            ))}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center justify-center p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-gov-500 rounded-full animate-spin"></div>
                  <span className="text-xs">Loading...</span>
                </div>
              </div>
            )}
            
            {/* Load More Button (if many tasks remaining) */}
            {!isLoading && visibleTasks.length < tasks.length && tasks.length - visibleTasks.length > 10 && (
              <button
                onClick={loadMoreTasks}
                className="w-full p-3 mt-2 text-xs font-medium text-slate-600 hover:text-gov-600 hover:bg-white/50 rounded-lg border-2 border-dashed border-slate-200 hover:border-gov-200 transition-all"
              >
                Load {Math.min(TASKS_PER_PAGE, tasks.length - visibleTasks.length)} more tasks
              </button>
            )}
            
            {/* End indicator */}
            {visibleTasks.length >= tasks.length && tasks.length > TASKS_PER_PAGE && (
              <div className="text-center p-2 text-xs text-slate-400">
                All {tasks.length} tasks loaded
              </div>
            )}
          </>
        ) : (
          <div className="h-32 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg mx-1">
            <span className="text-xs">Kosong</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;