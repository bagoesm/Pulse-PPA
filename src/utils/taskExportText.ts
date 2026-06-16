// src/utils/taskExportText.ts
// Utility untuk export tasks ke format text yang bisa dicopy

import { Task, ProjectDefinition, Epic, User } from '../../types';
import { formatDate } from './formatters';

interface ExportOptions {
  projects: ProjectDefinition[];
  epics: Epic[];
  users: User[];
  version?: 'summary' | 'detailed'; // 'summary' = ringkasan saja, 'detailed' = dengan detail
  filters?: {
    project?: string;
    epic?: string;
    category?: string;
    status?: string;
    priority?: string;
    pic?: string;
    dateRangeLabel?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  aiSummary?: string;
}

export const exportTasksToText = (tasks: Task[], options: ExportOptions): string => {
  const { projects, epics, filters, version = 'detailed' } = options;
  
  let output = '';
  
  // Header
  output += '═══════════════════════════════════════════════════════════════\n';
  output += '                      LAPORAN TASK                             \n';
  output += '═══════════════════════════════════════════════════════════════\n';
  output += `Diekspor pada: ${new Date().toLocaleString('id-ID')}\n`;
  output += `Total Task: ${tasks.length}\n`;
  output += '═══════════════════════════════════════════════════════════════\n\n';

  // Filter info
  if (filters && Object.values(filters).some(v => v)) {
    output += 'FILTER YANG DITERAPKAN:\n';
    output += '───────────────────────────────────────────────────────────────\n';
    if (filters.project) output += `• Project: ${filters.project}\n`;
    if (filters.epic) output += `• Epic: ${filters.epic}\n`;
    if (filters.category) output += `• Kategori: ${filters.category}\n`;
    if (filters.status) output += `• Status: ${filters.status}\n`;
    if (filters.priority) output += `• Prioritas: ${filters.priority}\n`;
    if (filters.pic) output += `• PIC: ${filters.pic}\n`;
    if (filters.dateRangeLabel) {
      const dateRange = filters.dateRangeLabel === 'Custom' 
        ? `${filters.dateFrom ? formatDate(filters.dateFrom) : '...'} - ${filters.dateTo ? formatDate(filters.dateTo) : '...'}`
        : filters.dateRangeLabel;
      output += `• Rentang Tanggal: ${dateRange}\n`;
    }
    output += '\n';
  }

  // AI Summary
  if (options.aiSummary) {
    output += 'AI SUMMARY:\n';
    output += '───────────────────────────────────────────────────────────────\n';
    output += options.aiSummary + '\n\n';
  }

  // Group tasks by status
  const tasksByStatus = tasks.reduce((acc, task) => {
    if (!acc[task.status]) {
      acc[task.status] = [];
    }
    acc[task.status].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  // Define status order
  const statusOrder = ['To Do', 'In Progress', 'Pending', 'Review', 'Done'];
  const orderedStatuses = statusOrder.filter(status => tasksByStatus[status]);

  // Task list grouped by status
  orderedStatuses.forEach((status, statusIndex) => {
    const statusTasks = tasksByStatus[status];
    
    // Status header
    output += '\n';
    output += '═══════════════════════════════════════════════════════════════\n';
    output += `                    ${status.toUpperCase()} (${statusTasks.length} TASK)                    \n`;
    output += '═══════════════════════════════════════════════════════════════\n';
    
    statusTasks.forEach((task, index) => {
      const projectName = task.projectId 
        ? projects.find(p => p.id === task.projectId)?.name || '-'
        : '-';
      
      const epicName = task.epicId
        ? epics.find(e => e.id === task.epicId)?.name || '-'
        : '-';

      const picNames = Array.isArray(task.pic) ? task.pic.join(', ') : task.pic;

      const isSubtask = (task as any).isSubtask;
      const parentTaskTitle = (task as any).parentTaskTitle;

      output += `\n[${index + 1}] ${isSubtask ? '[SUBTASK] ' : ''}${task.title}\n`;
      output += '───────────────────────────────────────────────────────────────\n';
      
      // Essential info only for summary version
      if (version === 'summary') {
        if (isSubtask) {
          output += `Parent Task     : ${parentTaskTitle}\n`;
        }
        output += `PIC             : ${picNames}\n`;
        output += `Tanggal Mulai   : ${formatDate(task.startDate)}\n`;
        output += `Deadline        : ${formatDate(task.deadline)}\n`;
      } else {
        // Full basic info for detailed version
        if (isSubtask) {
          output += `Jenis           : Subtask\n`;
          output += `Parent Task     : ${parentTaskTitle}\n`;
        }
        output += `Kategori        : ${task.category}\n`;
        output += `Sub Kategori    : ${task.subCategory || '-'}\n`;
        output += `Project         : ${projectName}\n`;
        output += `Epic            : ${epicName}\n`;
        output += `PIC             : ${picNames}\n`;
        output += `Prioritas       : ${task.priority}\n`;
        output += `Tanggal Mulai   : ${formatDate(task.startDate)}\n`;
        output += `Deadline        : ${formatDate(task.deadline)}\n`;
        output += `Dibuat Oleh     : ${task.createdBy}\n`;
      }

      // Only show detailed info if version is 'detailed'
      if (version === 'detailed') {
        // Checklists
        if (task.checklists && task.checklists.length > 0) {
          output += `\nChecklist (${task.checklists.filter(c => c.isCompleted).length}/${task.checklists.length} selesai):\n`;
          task.checklists.forEach(item => {
            const status = item.isCompleted ? '[✓]' : '[ ]';
            output += `  ${status} ${item.text}\n`;
          });
        }

        // Subtasks info
        if (task.subtaskCount && task.subtaskCount > 0) {
          output += `\nSubtask: ${task.subtaskDoneCount || 0}/${task.subtaskCount} selesai\n`;
        }

        // Attachments
        if (task.attachments && task.attachments.length > 0) {
          output += `\nLampiran (${task.attachments.length}):\n`;
          task.attachments.forEach(att => {
            output += `  • ${att.name} (${(att.size / 1024).toFixed(2)} KB)\n`;
          });
        }

        // Links
        if (task.links && task.links.length > 0) {
          output += `\nLink (${task.links.length}):\n`;
          task.links.forEach(link => {
            output += `  • ${link.title}\n    ${link.url}\n`;
          });
        }

        // Blocked by
        if (task.blockedBy && task.blockedBy.length > 0) {
          output += `\nDiblokir oleh: ${task.blockedBy.length} task\n`;
        }
      }

      output += '\n';
    });
  });

  // Footer
  output += '═══════════════════════════════════════════════════════════════\n';
  output += `                    AKHIR LAPORAN (${tasks.length} Task)                    \n`;
  output += '═══════════════════════════════════════════════════════════════\n';

  return output;
};

// Export summary only (ringkasan tanpa detail)
export const exportTasksSummaryToText = (tasks: Task[], options: ExportOptions): string => {
  const { projects, epics } = options;
  
  let output = '';
  
  // Header
  output += '═══════════════════════════════════════════════════════════════\n';
  output += '                   RINGKASAN TASK                              \n';
  output += '═══════════════════════════════════════════════════════════════\n';
  output += `Diekspor pada: ${new Date().toLocaleString('id-ID')}\n`;
  output += `Total Task: ${tasks.length}\n\n`;

  // AI Summary
  if (options.aiSummary) {
    output += 'AI SUMMARY:\n';
    output += '───────────────────────────────────────────────────────────────\n';
    output += options.aiSummary + '\n\n';
  }

  // Statistics
  const statusCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityCounts = tasks.reduce((acc, task) => {
    acc[task.priority] = (acc[task.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  output += 'STATISTIK STATUS:\n';
  Object.entries(statusCounts).forEach(([status, count]) => {
    output += `  ${status}: ${count}\n`;
  });

  output += '\nSTATISTIK PRIORITAS:\n';
  Object.entries(priorityCounts).forEach(([priority, count]) => {
    output += `  ${priority}: ${count}\n`;
  });

  output += '\n═══════════════════════════════════════════════════════════════\n\n';

  // Task list (summary)
  tasks.forEach((task, index) => {
    const projectName = task.projectId 
      ? projects.find(p => p.id === task.projectId)?.name || '-'
      : '-';
    
    const picNames = Array.isArray(task.pic) ? task.pic.join(', ') : task.pic;
    const isSubtask = (task as any).isSubtask;
    const parentTaskTitle = (task as any).parentTaskTitle;

    output += `${index + 1}. ${isSubtask ? '[SUBTASK] ' : ''}${task.title}\n`;
    output += `   Status: ${task.status} | Prioritas: ${task.priority} | PIC: ${picNames} | Deadline: ${formatDate(task.deadline)}\n`;
    if (isSubtask) {
      output += `   Parent Task: ${parentTaskTitle}\n`;
    } else if (projectName !== '-') {
      output += `   Project: ${projectName}\n`;
    }
    output += '\n';
  });

  output += '═══════════════════════════════════════════════════════════════\n';

  return output;
};

// Export for markdown format
export const exportTasksToMarkdown = (tasks: Task[], options: ExportOptions): string => {
  const { projects, epics } = options;
  
  let output = '';
  
  // Header
  output += '# Laporan Task\n\n';
  output += `**Diekspor pada:** ${new Date().toLocaleString('id-ID')}  \n`;
  output += `**Total Task:** ${tasks.length}\n\n`;

  // Filter info
  if (options.filters && Object.values(options.filters).some(v => v)) {
    output += '## Filter yang Diterapkan\n\n';
    if (options.filters.project) output += `- **Project:** ${options.filters.project}\n`;
    if (options.filters.epic) output += `- **Epic:** ${options.filters.epic}\n`;
    if (options.filters.category) output += `- **Kategori:** ${options.filters.category}\n`;
    if (options.filters.status) output += `- **Status:** ${options.filters.status}\n`;
    if (options.filters.priority) output += `- **Prioritas:** ${options.filters.priority}\n`;
    if (options.filters.pic) output += `- **PIC:** ${options.filters.pic}\n`;
    if (options.filters.dateFrom || options.filters.dateTo) {
      const dateRange = `${options.filters.dateFrom ? formatDate(options.filters.dateFrom) : '...'} - ${options.filters.dateTo ? formatDate(options.filters.dateTo) : '...'}`;
      output += `- **Periode:** ${dateRange}\n`;
    }
    output += '\n';
  }

  // AI Summary
  if (options.aiSummary) {
    output += '## AI Summary\n\n';
    output += options.aiSummary + '\n\n';
  }

  // Table
  output += '## Daftar Task\n\n';
  output += '| No | Judul | Kategori | PIC | Prioritas | Status | Deadline |\n';
  output += '|----|-------|----------|-----|-----------|--------|----------|\n';

  tasks.forEach((task, index) => {
    const picNames = Array.isArray(task.pic) ? task.pic.join(', ') : task.pic;
    const isSubtask = (task as any).isSubtask;
    const typeLabel = isSubtask ? 'Subtask' : 'Task';
    output += `| ${index + 1} | ${task.title} (${typeLabel}) | ${task.category} | ${picNames} | ${task.priority} | ${task.status} | ${formatDate(task.deadline)} |\n`;
  });

  output += '\n';

  // Detailed sections
  output += '## Detail Task\n\n';
  tasks.forEach((task, index) => {
    const projectName = task.projectId 
      ? projects.find(p => p.id === task.projectId)?.name || '-'
      : '-';
    
    const epicName = task.epicId
      ? epics.find(e => e.id === task.epicId)?.name || '-'
      : '-';

    const picNames = Array.isArray(task.pic) ? task.pic.join(', ') : task.pic;

    const isSubtask = (task as any).isSubtask;
    const parentTaskTitle = (task as any).parentTaskTitle;
    
    output += `### ${index + 1}. ${isSubtask ? '[Subtask] ' : ''}${task.title}\n\n`;
    if (isSubtask) {
      output += `- **Parent Task:** ${parentTaskTitle}\n`;
    }
    output += `- **Kategori:** ${task.category}\n`;
    output += `- **Sub Kategori:** ${task.subCategory || '-'}\n`;
    output += `- **Project:** ${projectName}\n`;
    output += `- **Epic:** ${epicName}\n`;
    output += `- **PIC:** ${picNames}\n`;
    output += `- **Prioritas:** ${task.priority}\n`;
    output += `- **Status:** ${task.status}\n`;
    output += `- **Tanggal Mulai:** ${formatDate(task.startDate)}\n`;
    output += `- **Deadline:** ${formatDate(task.deadline)}\n`;
    output += `- **Dibuat Oleh:** ${task.createdBy}\n\n`;

    if (task.checklists && task.checklists.length > 0) {
      output += `**Checklist:**\n`;
      task.checklists.forEach(item => {
        const status = item.isCompleted ? 'x' : ' ';
        output += `- [${status}] ${item.text}\n`;
      });
      output += '\n';
    }

    if (task.attachments && task.attachments.length > 0) {
      output += `**Lampiran:**\n`;
      task.attachments.forEach(att => {
        output += `- ${att.name} (${(att.size / 1024).toFixed(2)} KB)\n`;
      });
      output += '\n';
    }

    if (task.links && task.links.length > 0) {
      output += `**Link:**\n`;
      task.links.forEach(link => {
        output += `- [${link.title}](${link.url})\n`;
      });
      output += '\n';
    }

    output += '---\n\n';
  });

  return output;
};
