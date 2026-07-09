import { Meeting, User } from '../../types';

interface ExportOptions {
  filename?: string;
  sheetName?: string;
}

/**
 * Formats a given date to DD/MM/YYYY.
 */
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Maps meeting data to an array of objects suitable for Excel export.
 */
export const prepareMeetingDataForExcel = (meetings: Meeting[], users: User[]) => {
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : userId; // Fallback to ID if not found
  };

  return meetings.map((meeting, index) => {
    // Format tanggal
    let tanggalStr = formatDate(meeting.date);
    if (meeting.endDate && meeting.endDate !== meeting.date) {
      tanggalStr += ` - ${formatDate(meeting.endDate)}`;
    }

    // Format PIC names (Map UUID to Name)
    const picList = meeting.pic && meeting.pic.length > 0
      ? meeting.pic.map(getUserName).join(', ')
      : '-';

    // Format Invitees (Map UUID to Name if applicable, invitees are sometimes names sometimes IDs based on schema, but let's try mapping first)
    const invitees = meeting.invitees && meeting.invitees.length > 0
      ? meeting.invitees.map(inv => {
          // Check if inv is a UUID or already a name (simple length/format check or just try find)
          const user = users.find(u => u.id === inv);
          return user ? user.name : inv;
        }).join(', ')
      : '-';

    return {
      'No': index + 1,
      'Judul Kegiatan': meeting.title || '-',
      'Jenis': meeting.type || '-',
      'Tanggal': tanggalStr,
      'Waktu': `${meeting.startTime || '-'} s/d ${meeting.endTime || '-'}`,
      'Lokasi': meeting.isOnline ? `Online (${meeting.onlineLink || '-'})` : (meeting.location || '-'),
      'Status': meeting.status || '-',
      'Penyelenggara': meeting.inviter?.name || '-',
      'PIC (Tim Kita)': picList,
      'Daftar Undangan': invitees,
      'Deskripsi': meeting.description || '-',
      'Jumlah Disposisi': meeting.disposisiCount || 0,
      'Status Disposisi': meeting.disposisiStatus || '-',
    };
  });
};

/**
 * Generates and downloads an Excel file containing the meetings data.
 */
export const exportMeetingsToExcel = async (meetings: Meeting[], users: User[], options: ExportOptions = {}) => {
  const XLSX = await import('xlsx');
  const {
    filename = `Jadwal_Kegiatan_${new Date().toISOString().split('T')[0]}.xlsx`,
    sheetName = 'Jadwal Kegiatan'
  } = options;

  // 1. Map data to flat JSON format
  const excelData = prepareMeetingDataForExcel(meetings, users);

  // 2. Create a worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Auto-size columns slightly
  const columnWidths = [
    { wch: 5 },  // No
    { wch: 40 }, // Judul
    { wch: 15 }, // Jenis
    { wch: 20 }, // Tanggal
    { wch: 15 }, // Waktu
    { wch: 30 }, // Lokasi
    { wch: 15 }, // Status
    { wch: 25 }, // Penyelenggara
    { wch: 30 }, // PIC
    { wch: 30 }, // Daftar Undangan
    { wch: 40 }, // Deskripsi
    { wch: 15 }, // Jml Disposisi
    { wch: 15 }, // Status Disposisi
  ];
  worksheet['!cols'] = columnWidths;

  // 3. Create a workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // 4. Download file
  XLSX.writeFile(workbook, filename);
};
