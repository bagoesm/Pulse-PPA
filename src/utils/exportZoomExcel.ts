import * as XLSX from 'xlsx';
import { ZoomMeeting } from '../../types';

/**
 * Generates and downloads an Excel workbook containing detailed Zoom meetings data
 * and a Formulated Statistics Dashboard sheet with cell-based bar charts.
 */
export const exportZoomMeetingsToExcel = (
  meetings: ZoomMeeting[],
  usersMap: Record<string, string>,
  startDate: string,
  endDate: string
) => {
  // 1. Filter and sort meetings by date range
  const filtered = meetings.filter(m => {
    if (!m.tanggal) return false;
    return m.tanggal >= startDate && m.tanggal <= endDate;
  }).sort((a, b) => {
    const dateCompare = a.tanggal.localeCompare(b.tanggal);
    if (dateCompare !== 0) return dateCompare;
    return a.waktuMulai.localeCompare(b.waktuMulai);
  });

  const wb = XLSX.utils.book_new();

  // --- SHEET 1: RINGKASAN & STATISTIK ---
  const wsStats: XLSX.WorkSheet = {};
  let rowIdx = 1;

  const writeCell = (col: string, row: number, val: any, isFormula = false) => {
    const cellRef = `${col}${row}`;
    if (isFormula) {
      wsStats[cellRef] = { t: 's', f: val };
    } else if (typeof val === 'number') {
      wsStats[cellRef] = { t: 'n', v: val };
    } else {
      wsStats[cellRef] = { t: 's', v: String(val) };
    }
  };

  // Title block
  writeCell('A', rowIdx, 'LAPORAN STATISTIK PELAYANAN ZOOM VIDEO CONFERENCE');
  rowIdx++;
  writeCell('A', rowIdx, `Periode Laporan: ${startDate} s/d ${endDate}`);
  rowIdx += 2; // Spacing, next table starts at row 4

  // Helper function to write summary tables with cell-charts formula
  const writeSummaryTable = (
    title: string,
    headers: string[],
    data: [string, number][]
  ) => {
    writeCell('A', rowIdx, title);
    rowIdx++;
    
    // Headers
    headers.forEach((h, i) => {
      const col = String.fromCharCode(65 + i); // A, B, C
      writeCell(col, rowIdx, h);
    });
    const headerRow = rowIdx;
    rowIdx++;

    // Data rows
    data.forEach(([name, count]) => {
      writeCell('A', rowIdx, name);
      writeCell('B', rowIdx, count);
      // Excel formula: =REPT("█", B{rowIdx}) to draw cell bar charts
      writeCell('C', rowIdx, `REPT("█", B${rowIdx})`, true);
      rowIdx++;
    });

    // Total row
    writeCell('A', rowIdx, 'Total');
    const startRow = headerRow + 1;
    const endRow = rowIdx - 1;
    if (endRow >= startRow) {
      writeCell('B', rowIdx, `SUM(B${startRow}:B${endRow})`, true);
    } else {
      writeCell('B', rowIdx, 0);
    }
    
    rowIdx += 3; // Spacing after each table
  };

  // Compute statistics for the filtered period
  // 1. Top 5 Unit Kerja Teraktif
  const unitCounts: Record<string, number> = {};
  filtered.forEach(m => {
    const name = m.unitKerja || 'Lainnya';
    unitCounts[name] = (unitCounts[name] || 0) + 1;
  });
  const unitData = Object.entries(unitCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 2. Top 5 Petugas/Operator Teraktif
  const opCounts: Record<string, number> = {};
  filtered.forEach(m => {
    const ids = m.operatorIds && m.operatorIds.length > 0 
      ? m.operatorIds 
      : (m.operatorId ? [m.operatorId] : []);
    ids.forEach(id => {
      const name = usersMap[id] || 'Memuat...';
      opCounts[name] = (opCounts[name] || 0) + 1;
    });
  });
  const opData = Object.entries(opCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 3. Distribusi Status Rapat
  const statusCounts: Record<string, number> = { 'Terjadwal': 0, 'Selesai': 0, 'Batal': 0 };
  filtered.forEach(m => {
    if (m.status === 'Scheduled') statusCounts['Terjadwal']++;
    else if (m.status === 'Completed') statusCounts['Selesai']++;
    else if (m.status === 'Cancelled') statusCounts['Batal']++;
  });
  const statusData = Object.entries(statusCounts);

  // 4. Top 5 Jenis Rapat Terbanyak
  const typeCounts: Record<string, number> = {};
  filtered.forEach(m => {
    const name = m.jenisRapat || 'Lainnya';
    typeCounts[name] = (typeCounts[name] || 0) + 1;
  });
  const typeData = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 5. Tingkat Utilisasi Akun Zoom
  const accCounts: Record<string, number> = {};
  filtered.forEach(m => {
    const name = m.zoomAccount?.name || 'Belum Diatur';
    accCounts[name] = (accCounts[name] || 0) + 1;
  });
  const accData = Object.entries(accCounts)
    .sort((a, b) => b[1] - a[1]);

  // Write all tables to sheet
  writeSummaryTable('1. Top 5 Unit Kerja Teraktif', ['Unit Kerja', 'Jumlah Rapat', 'Visualisasi Grafik (Excel Chart)'], unitData);
  writeSummaryTable('2. Top 5 Petugas/Operator Teraktif', ['Nama Petugas', 'Jumlah Rapat', 'Visualisasi Grafik (Excel Chart)'], opData);
  writeSummaryTable('3. Distribusi Status Rapat', ['Status Rapat', 'Jumlah Rapat', 'Visualisasi Grafik (Excel Chart)'], statusData);
  writeSummaryTable('4. Top 5 Jenis Rapat Terbanyak', ['Jenis Rapat', 'Jumlah Rapat', 'Visualisasi Grafik (Excel Chart)'], typeData);
  writeSummaryTable('5. Tingkat Utilisasi Akun Zoom', ['Akun Zoom', 'Jumlah Rapat', 'Visualisasi Grafik (Excel Chart)'], accData);

  // Set reference range and column widths
  wsStats['!ref'] = `A1:C${rowIdx}`;
  wsStats['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 35 }];

  // --- SHEET 2: DETAIL DATA RAPAT ---
  const rawData = filtered.map((m, idx) => {
    const ops = m.operatorIds && m.operatorIds.length > 0
      ? m.operatorIds.map(id => usersMap[id] || 'Memuat...').join(', ')
      : (m.operatorId ? (usersMap[m.operatorId] || 'Memuat...') : 'Belum Ditugaskan');

    return {
      'No': idx + 1,
      'Tanggal': m.tanggal || '-',
      'Waktu Mulai': m.waktuMulai || '-',
      'Waktu Selesai': m.waktuSelesai || '-',
      'Tema Kegiatan': m.kegiatan || '-',
      'Akun Zoom': m.zoomAccount?.name || 'Belum Diatur',
      'Lokasi': m.lokasi || '-',
      'Unit Kerja / Satker': m.unitKerja || '-',
      'Jenis Rapat': m.jenisRapat || '-',
      'Operator / Penanggung Jawab': ops,
      'Status Rapat': m.status === 'Scheduled' ? 'Terjadwal' : m.status === 'Completed' ? 'Selesai' : 'Batal',
      'Link Zoom': m.zoomLink || '-',
      'Meeting ID': m.meetingId || '-',
      'Passcode': m.passcode || '-'
    };
  });

  const wsDetail = XLSX.utils.json_to_sheet(rawData);
  wsDetail['!cols'] = [
    { wch: 5 },   // No
    { wch: 15 },  // Tanggal
    { wch: 12 },  // Waktu Mulai
    { wch: 12 },  // Waktu Selesai
    { wch: 35 },  // Tema Kegiatan
    { wch: 20 },  // Akun Zoom
    { wch: 15 },  // Lokasi
    { wch: 25 },  // Unit Kerja
    { wch: 15 },  // Jenis Rapat
    { wch: 30 },  // Operator
    { wch: 15 },  // Status Rapat
    { wch: 35 },  // Link Zoom
    { wch: 20 },  // Meeting ID
    { wch: 15 }   // Passcode
  ];

  // Append sheets
  XLSX.utils.book_append_sheet(wb, wsStats, 'Ringkasan & Statistik');
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Data Rapat Detail');

  // Save file
  const filename = `Laporan_Pelayanan_Zoom_${startDate.replace(/-/g, '')}_to_${endDate.replace(/-/g, '')}.xlsx`;
  XLSX.writeFile(wb, filename);
};
