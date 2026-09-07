import { Sprint, Task, User } from '../../types';

interface SprintExportOptions {
  sprint: Sprint;
  tasks: Task[];
  projectName: string;
  users?: User[];
}

/**
 * Export Sprint report to Excel (.xlsx)
 */
export const exportSprintToExcel = async ({
  sprint,
  tasks,
  projectName,
  users = []
}: SprintExportOptions) => {
  const XLSX = await import('xlsx');

  const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
  const completedTasks = sprintTasks.filter(t => t.status === 'Done');
  const totalSp = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const completedSp = completedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const rate = totalSp > 0 ? Math.round((completedSp / totalSp) * 100) : (
    sprintTasks.length > 0 ? Math.round((completedTasks.length / sprintTasks.length) * 100) : 0
  );

  // 1. Summary Sheet Data
  const summaryRows = [
    { 'Properti': 'Nama Sprint', 'Keterangan': sprint.name },
    { 'Properti': 'Nama Proyek', 'Keterangan': projectName },
    { 'Properti': 'Sprint Goal / Target', 'Keterangan': sprint.goal || '-' },
    { 'Properti': 'Status Sprint', 'Keterangan': sprint.status },
    { 'Properti': 'Tanggal Mulai', 'Keterangan': sprint.startDate || '-' },
    { 'Properti': 'Tanggal Selesai', 'Keterangan': sprint.endDate || '-' },
    { 'Properti': 'Total Tugas', 'Keterangan': sprintTasks.length },
    { 'Properti': 'Tugas Selesai (Done)', 'Keterangan': completedTasks.length },
    { 'Properti': 'Tugas Belum Selesai', 'Keterangan': sprintTasks.length - completedTasks.length },
    { 'Properti': 'Total Story Points', 'Keterangan': totalSp },
    { 'Properti': 'Story Points Selesai', 'Keterangan': completedSp },
    { 'Properti': 'Tingkat Keberhasilan (%)', 'Keterangan': `${rate}%` },
    { 'Properti': 'Waktu Ekspor', 'Keterangan': new Date().toLocaleString('id-ID') }
  ];

  // 2. Tasks Sheet Data
  const taskRows = sprintTasks.map((t, idx) => {
    // Resolve PIC names
    const picNames = (t.pic || []).map(picIdOrName => {
      const found = users.find(u => u.id === picIdOrName || u.name === picIdOrName);
      return found ? found.name : picIdOrName;
    }).join(', ');

    return {
      'No': idx + 1,
      'Judul Tugas': t.title,
      'Kategori': t.category || '-',
      'Prioritas': t.priority || '-',
      'Status': t.status,
      'PIC (Penanggung Jawab)': picNames || 'Unassigned',
      'Story Points': t.storyPoints !== null && t.storyPoints !== undefined ? t.storyPoints : '-',
      'Tanggal Dibuat': t.createdAt ? new Date(t.createdAt).toLocaleDateString('id-ID') : '-'
    };
  });

  // Create Workbook
  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  const wsTasks = XLSX.utils.json_to_sheet(taskRows);

  // Set column widths
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 45 }];
  wsTasks['!cols'] = [
    { wch: 5 },  // No
    { wch: 35 }, // Judul
    { wch: 15 }, // Kategori
    { wch: 12 }, // Prioritas
    { wch: 15 }, // Status
    { wch: 25 }, // PIC
    { wch: 12 }, // SP
    { wch: 15 }  // Tanggal
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Sprint');
  XLSX.utils.book_append_sheet(wb, wsTasks, 'Daftar Tugas');

  // Clean filename
  const cleanName = sprint.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `Laporan_Sprint_${cleanName}.xlsx`);
};

/**
 * Export Sprint report to PDF (.pdf)
 */
export const exportSprintToPDF = async ({
  sprint,
  tasks,
  projectName,
  users = []
}: SprintExportOptions) => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
  const completedTasks = sprintTasks.filter(t => t.status === 'Done');
  const totalSp = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const completedSp = completedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const rate = totalSp > 0 ? Math.round((completedSp / totalSp) * 100) : (
    sprintTasks.length > 0 ? Math.round((completedTasks.length / sprintTasks.length) * 100) : 0
  );

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Colors
  const primaryColor: [number, number, number] = [30, 41, 59]; // slate-800
  const accentColor: [number, number, number] = [79, 70, 229]; // indigo-600

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.text('LAPORAN SPRINT - PULSE PPA', 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Kementerian Pemberdayaan Perempuan dan Perlindungan Anak • Diekspor pada: ${new Date().toLocaleString('id-ID')}`, 14, 22);

  // Horizontal divider
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 25, 283, 25);

  // Metadata Grid
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...accentColor);
  doc.text(`Sprint: ${sprint.name}`, 14, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Proyek: ${projectName}`, 14, 38);
  doc.text(`Goal: ${sprint.goal || '-'}`, 14, 44);

  doc.text(`Periode: ${sprint.startDate || '-'} s/d ${sprint.endDate || '-'}`, 130, 32);
  doc.text(`Status: ${sprint.status}`, 130, 38);
  doc.text(`Pencapaian: ${completedTasks.length}/${sprintTasks.length} Tugas (${rate}%) | ${completedSp}/${totalSp} Story Points`, 130, 44);

  // Task Table data
  const tableData = sprintTasks.map((t, idx) => {
    const picNames = (t.pic || []).map(picIdOrName => {
      const found = users.find(u => u.id === picIdOrName || u.name === picIdOrName);
      return found ? found.name : picIdOrName;
    }).join(', ');

    return [
      idx + 1,
      t.title,
      t.category || '-',
      t.priority || '-',
      t.status,
      picNames || 'Unassigned',
      t.storyPoints !== null && t.storyPoints !== undefined ? String(t.storyPoints) : '-'
    ];
  });

  // Render Table
  autoTable(doc, {
    startY: 50,
    head: [['No', 'Judul Tugas', 'Kategori', 'Prioritas', 'Status', 'PIC', 'SP']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 90 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
      4: { cellWidth: 30 },
      5: { cellWidth: 60 },
      6: { cellWidth: 15, halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  // Save PDF
  const cleanName = sprint.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Laporan_Sprint_${cleanName}.pdf`);
};
