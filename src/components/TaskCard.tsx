import React from 'react';
import { Task, Priority, Category, ProjectDefinition, User, Status } from '../../types';
import { Calendar, Layers, Paperclip, Link2, CheckSquare } from 'lucide-react';
import PICDisplay from './PICDisplay';
import ShareButton from './ShareButton';

interface TaskCardProps {
  task: Task;
  projects: ProjectDefinition[];
  users?: User[];
  allTasks?: Task[]; // For checking blocking task status
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: (task: Task) => void;
  onShare?: (task: Task) => void;
  canEdit: boolean;
}

const getPriorityColor = (priority: Priority) => {
  switch (priority) {
    case Priority.Urgent:
      return 'bg-red-100 text-red-700 border-red-200';
    case Priority.High:
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case Priority.Medium:
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case Priority.Low:
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const getCategoryColor = (category: Category) => {
  // Just a subtle differentiation, keeping main theme consistent
  return 'bg-teal-50 text-teal-700 border-teal-100';
};

const TaskCard: React.FC<TaskCardProps> = React.memo(({ task, projects, users = [], allTasks = [], onDragStart, onClick, onShare, canEdit }) => {
  const project = task.projectId ? projects.find(p => p.id === task.projectId) : null;
  const hasAttachments = task.attachments && task.attachments.length > 0;

  // Check if task is blocked by unfinished tasks
  const blockingTasks = (task.blockedBy || []).map(id => allTasks.find(t => t.id === id)).filter(Boolean) as Task[];
  const unfinishedBlockers = blockingTasks.filter(t => t.status !== Status.Done);
  const isBlocked = unfinishedBlockers.length > 0;

  // Check how many tasks THIS task is blocking
  const blockedTasks = allTasks.filter(t => t.blockedBy && t.blockedBy.includes(task.id));
  const blocksOthers = blockedTasks.length > 0;

  // Checklist progress
  const checklistCount = task.checklists?.length || 0;
  const completedChecklistCount = task.checklists?.filter(c => c.isCompleted).length || 0;
  const hasChecklists = checklistCount > 0;

  return (
    <div
      draggable={canEdit}
      onDragStart={(e) => canEdit && onDragStart(e, task.id)}
      onClick={() => onClick(task)}
      className={`bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-200 transition-all mb-2 sm:mb-3 group relative
        ${canEdit ? 'cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gov-300' : 'cursor-default opacity-90'}
      `}
    >
      <div className="flex justify-between items-center mb-2">
        <span className={`text-[9px] sm:text-[10px] uppercase font-bold px-1.5 sm:px-2 py-0.5 rounded border ${getCategoryColor(task.category)}`}>
          {task.category}
        </span>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {onShare && (
            <ShareButton
              onClick={() => onShare(task)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            />
          )}
          <span className={`text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
        </div>
      </div>

      <h3 className="text-xs sm:text-sm font-semibold text-slate-800 mb-1 leading-snug group-hover:text-gov-700 transition-colors line-clamp-2">
        {task.title}
      </h3>

      {/* Project Indicator or Subcategory */}
      {project ? (
        <div className="flex flex-col gap-0.5 mb-2 sm:mb-3">
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gov-700 font-medium">
            <Layers size={10} />
            <span className="truncate">{project.name}</span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium pl-3.5 truncate">
            {task.subCategory}
          </p>
        </div>
      ) : (
        <p className="text-[10px] sm:text-xs text-slate-400 mb-2 sm:mb-3 font-medium truncate">
          {task.subCategory}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-slate-50 mt-2">
        <div className="flex items-center gap-2 sm:gap-3 text-slate-500">
          <div className="flex items-center gap-1">
            <Calendar size={10} />
            <span className="text-[9px] sm:text-[10px] font-medium">
              {task.startDate === task.deadline
                ? task.deadline
                : `${task.deadline}`
              }
            </span>
          </div>
          {hasAttachments && (
            <div className="flex items-center gap-1 text-slate-400" title={`${task.attachments.length} attachment(s)`}>
              <Paperclip size={10} />
              <span className="text-[9px] sm:text-[10px] font-medium">{task.attachments.length}</span>
            </div>
          )}
          {isBlocked && (
            <div
              className="flex items-center gap-1 text-amber-500"
              title={`Diblokir oleh ${unfinishedBlockers.length} task: ${unfinishedBlockers.map(t => t.title).join(', ')}`}
            >
              <Link2 size={10} />
              <span className="text-[9px] sm:text-[10px] font-medium">{unfinishedBlockers.length}</span>
            </div>
          )}
          {blocksOthers && (
            <div
              className="flex items-center gap-1 text-orange-500"
              title={`Memblokir ${blockedTasks.length} task: ${blockedTasks.map(t => t.title).join(', ')}`}
            >
              <Link2 size={10} className="rotate-90" />
              <span className="text-[9px] sm:text-[10px] font-medium">{blockedTasks.length}</span>
            </div>
          )}
          {hasChecklists && (
            <div
              className={`flex items-center gap-1 ${completedChecklistCount === checklistCount ? 'text-green-500' : 'text-slate-400'}`}
              title={`${completedChecklistCount}/${checklistCount} checklist selesai`}
            >
              <CheckSquare size={10} />
              <span className="text-[9px] sm:text-[10px] font-medium">{completedChecklistCount}/{checklistCount}</span>
            </div>
          )}
        </div>

        <PICDisplay
          pic={task.pic}
          users={users}
          maxVisible={2}
          size="sm"
          showNames={false}
          className="flex-shrink-0"
        />
      </div>

      {/* Ownership Indicator */}
      {!canEdit && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Optional: Lock icon or similar could go here */}
        </div>
      )}
    </div>
  );
});

export default TaskCard;