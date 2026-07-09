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

export const exportTasksToPDF = async (tasks: Task[], options: ExportOptions) => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const { projects, epics, filters, version = 'detailed' } = options;
  
  // Create new PDF document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Set font
  doc.setFont('helvetica');

  // Title
  doc.setFontSize(18);
  doc.setTextColor(31, 41, 55); // slate-800
  doc.text('Laporan Task', 14, 15);

  // Export date
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Diekspor pada: ${new Date().toLocaleString('id-ID')}`, 14, 22);

  // Filter info
  let yPos = 30;
  if (filters && Object.values(filters).some(v => v)) {
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text('Filter yang diterapkan:', 14, yPos);
    yPos += 6;

    doc.setFontSize(9);
    if (filters.project) {
      doc.text(`• Project: ${filters.project}`, 16, yPos);
      yPos += 5;
    }
    if (filters.epic) {
      doc.text(`• Epic: ${filters.epic}`, 16, yPos);
      yPos += 5;
    }
    if (filters.category) {
      doc.text(`• Kategori: ${filters.category}`, 16, yPos);
      yPos += 5;
    }
    if (filters.status) {
      doc.text(`• Status: ${filters.status}`, 16, yPos);
      yPos += 5;
    }
    if (filters.priority) {
      doc.text(`• Prioritas: ${filters.priority}`, 16, yPos);
      yPos += 5;
    }
    if (filters.pic) {
      doc.text(`• PIC: ${filters.pic}`, 16, yPos);
      yPos += 5;
    }
    if (filters.dateRangeLabel) {
      const dateRange = filters.dateRangeLabel === 'Custom' 
        ? `${filters.dateFrom ? formatDate(filters.dateFrom) : '...'} - ${filters.dateTo ? formatDate(filters.dateTo) : '...'}`
        : filters.dateRangeLabel;
      doc.text(`• Rentang Tanggal: ${dateRange}`, 16, yPos);
      yPos += 5;
    }
    yPos += 3;
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

  // Summary statistics
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Task: ${tasks.length}`, 14, yPos);
  yPos += 5;
  
  if (options.aiSummary) {
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55); // slate-800
    doc.setFont('helvetica', 'bold');
    doc.text('AI Summary:', 14, yPos);
    yPos += 5;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // slate-600
    const splitSummary = doc.splitTextToSize(options.aiSummary, 260); // landscape width margin
    doc.text(splitSummary, 16, yPos);
    yPos += (splitSummary.length * 4) + 4;
  }
  
  // Status breakdown
  doc.setFontSize(9);
  orderedStatuses.forEach(status => {
    const count = tasksByStatus[status].length;
    doc.text(`  • ${status}: ${count} task`, 16, yPos);
    yPos += 4;
  });
  yPos += 5;

  // Create tables grouped by status
  orderedStatuses.forEach((status, statusIndex) => {
    const statusTasks = tasksByStatus[status];
    
    // Status header
    if (statusIndex > 0) {
      doc.addPage();
      yPos = 15;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235); // gov-600
    doc.text(`${status} (${statusTasks.length} task)`, 14, yPos);
    yPos += 8;

    // Prepare table data for this status
    const tableData = statusTasks.map((task, index) => {
      const projectName = task.projectId 
        ? projects.find(p => p.id === task.projectId)?.name || '-'
        : '-';
      
      const epicName = task.epicId
        ? epics.find(e => e.id === task.epicId)?.name || '-'
        : '-';

      const picNames = Array.isArray(task.pic) ? task.pic.join(', ') : task.pic;
      const isSubtask = (task as any).isSubtask;
      const parentTaskTitle = (task as any).parentTaskTitle;

      return [
        index + 1,
        isSubtask ? `[SUBTASK] ${task.title}` : task.title,
        task.category,
        isSubtask ? 'Subtask' : (task.subCategory || '-'),
        isSubtask ? `Parent: ${parentTaskTitle}` : projectName,
        isSubtask ? (projectName !== '-' ? `Proj: ${projectName}` : '-') : epicName,
        picNames,
        task.priority,
        formatDate(task.startDate),
        formatDate(task.deadline)
      ];
    });

    // Create table
    autoTable(doc, {
      startY: yPos,
      head: [[
        'No',
        'Judul Task',
        'Kategori',
        'Sub Kategori',
        'Project',
        'Epic',
        'PIC',
        'Prioritas',
        'Mulai',
        'Deadline'
      ]],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      headStyles: {
        fillColor: [37, 99, 235], // gov-600
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' }, // No
        1: { cellWidth: 45 }, // Judul
        2: { cellWidth: 28 }, // Kategori
        3: { cellWidth: 22 }, // Sub Kategori
        4: { cellWidth: 28 }, // Project
        5: { cellWidth: 22 }, // Epic
        6: { cellWidth: 28 }, // PIC
        7: { cellWidth: 18, halign: 'center' }, // Prioritas
        8: { cellWidth: 20, halign: 'center' }, // Mulai
        9: { cellWidth: 20, halign: 'center' } // Deadline
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // slate-50
      },
      margin: { left: 14, right: 14 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 5;
  });

  // Add detailed pages for each task grouped by status (only if version is 'detailed')
  if (version === 'detailed') {
    orderedStatuses.forEach(status => {
      const statusTasks = tasksByStatus[status];
      
      statusTasks.forEach((task, taskIndex) => {
        doc.addPage();
    
      const isSubtask = (task as any).isSubtask;
      const parentTaskTitle = (task as any).parentTaskTitle;

      // Task header with status
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text(`[${status}] ${isSubtask ? '[SUBTASK] ' : ''}${task.title}`, 14, 15);

      let detailY = 25;
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);

      // Basic info
      const projectName = task.projectId 
        ? projects.find(p => p.id === task.projectId)?.name || '-'
        : '-';
    
    const epicName = task.epicId
      ? epics.find(e => e.id === task.epicId)?.name || '-'
      : '-';

    const picNames = Array.isArray(task.pic) ? task.pic.join(', ') : task.pic;

    const details = [
      isSubtask ? ['Jenis', 'Subtask'] : null,
      isSubtask ? ['Parent Task', parentTaskTitle] : null,
      ['Kategori', task.category],
      ['Sub Kategori', isSubtask ? 'Subtask' : (task.subCategory || '-')],
      ['Project', projectName],
      ['Epic', epicName],
      ['PIC', picNames],
      ['Prioritas', task.priority],
      ['Status', task.status],
      ['Tanggal Mulai', formatDate(task.startDate)],
      ['Deadline', formatDate(task.deadline)],
      ['Dibuat Oleh', task.createdBy]
    ].filter(Boolean) as string[][];

    autoTable(doc, {
      startY: detailY,
      body: details,
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold', textColor: [71, 85, 105] },
        1: { cellWidth: 'auto', textColor: [31, 41, 55] }
      }
    });

    detailY = (doc as any).lastAutoTable.finalY + 10;

    // Checklists
    if (task.checklists && task.checklists.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text('Checklist:', 14, detailY);
      detailY += 6;

      doc.setFontSize(9);
      task.checklists.forEach(item => {
        const status = item.isCompleted ? '[✓]' : '[ ]';
        doc.text(`${status} ${item.text}`, 16, detailY);
        detailY += 5;
      });
      detailY += 3;
    }

    // Attachments
    if (task.attachments && task.attachments.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text('Lampiran:', 14, detailY);
      detailY += 6;

      doc.setFontSize(9);
      task.attachments.forEach(att => {
        doc.text(`• ${att.name} (${(att.size / 1024).toFixed(2)} KB)`, 16, detailY);
        detailY += 5;
      });
      detailY += 3;
    }

    // Links
    if (task.links && task.links.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text('Link:', 14, detailY);
      detailY += 6;

      doc.setFontSize(9);
      doc.setTextColor(37, 99, 235); // gov-600
      task.links.forEach(link => {
        doc.textWithLink(link.title, 16, detailY, { url: link.url });
        detailY += 5;
      });
    }
      });
    });
  }

  // Save PDF
  const versionLabel = version === 'summary' ? 'Ringkasan' : 'Lengkap';
  const fileName = `Task_Export_${versionLabel}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
