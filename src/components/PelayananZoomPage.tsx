// src/components/PelayananZoomPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Video, Calendar, Clock, User as UserIcon, MapPin, 
  Search, Filter, Plus, FileText, CheckCircle2, XCircle, 
  AlertCircle, Copy, Check, ExternalLink, SlidersHorizontal, 
  ChevronRight, RefreshCw, BarChart2, Briefcase, Activity, X,
  FileSpreadsheet, Upload
} from 'lucide-react';
import { ZoomMeeting, ZoomAccount, ZoomEditor } from '../../types';
import { zoomService } from '../services/ZoomService';
import AddZoomScheduleModal from './AddZoomScheduleModal';
import ZoomAccountManager from './ZoomAccountManager';
import SearchableSelect from './SearchableSelect';
import { exportZoomMeetingsToExcel } from '../utils/exportZoomExcel';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Cell, PieChart, Pie, Legend, LabelList,
  ComposedChart, Line
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import ImportZoomScheduleModal from './ImportZoomScheduleModal';

interface PelayananZoomPageProps {
  showNotification?: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
    const isSingleVal = payload.length === 1 && (payload[0].name === 'value' || payload[0].name === 'Jumlah Rapat');
    
    return (
      <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-md text-slate-800 text-xs space-y-1">
        <p className="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1">{label}</p>
        <div className="space-y-0.5">
          {payload.map((entry: any, index: number) => {
            const displayName = entry.name === 'value' ? 'Jumlah Rapat' : entry.name;
            return (
              <div key={index} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 font-medium text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                  {displayName}:
                </span>
                <span className="font-bold text-slate-900">{entry.value}</span>
              </div>
            );
          })}
        </div>
        {!isSingleVal && (
          <div className="border-t border-slate-100 pt-1.5 mt-1.5 flex items-center justify-between font-bold text-slate-900">
            <span>Total:</span>
            <span>{total} Rapat</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};


const PelayananZoomPage: React.FC<PelayananZoomPageProps> = ({ showNotification }) => {
  const { currentUser } = useAuth();

  // Navigation state
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'schedules' | 'accounts'>('dashboard');

  // Data states
  const [meetings, setMeetings] = useState<ZoomMeeting[]>([]);
  const [accounts, setAccounts] = useState<ZoomAccount[]>([]);
  const [chartYearFilter, setChartYearFilter] = useState<string>('All');

  // Month formatter helper
  const formatMonthLabel = useCallback((yearMonth: string) => {
    const [year, month] = yearMonth.split('-');
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    const monthIdx = parseInt(month, 10) - 1;
    return `${monthNames[monthIdx]} ${year}`;
  }, []);

  // Extract unique years present in meetings
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    meetings.forEach(m => {
      if (m.tanggal) {
        yearsSet.add(m.tanggal.substring(0, 4));
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [meetings]);

  // Display months calculation
  const displayMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    meetings.forEach(m => {
      if (m.tanggal) {
        const yMonth = m.tanggal.substring(0, 7); // 'YYYY-MM'
        if (chartYearFilter === 'All' || yMonth.startsWith(chartYearFilter)) {
          monthsSet.add(yMonth);
        }
      }
    });
    const sorted = Array.from(monthsSet).sort();
    if (sorted.length === 0) {
      const currentYearMonth = new Date().toLocaleDateString('en-CA').substring(0, 7);
      if (chartYearFilter === 'All' || currentYearMonth.startsWith(chartYearFilter)) {
        sorted.push(currentYearMonth);
      } else {
        sorted.push(`${chartYearFilter}-01`);
      }
    }
    // If "All" (Last 12 Months), we slice to the last 12
    if (chartYearFilter === 'All') {
      return sorted.slice(-12);
    }
    return sorted;
  }, [meetings, chartYearFilter]);

  // Extract unique years present in displayMonths for title suffix
  const activeYearsString = useMemo(() => {
    const years = Array.from(new Set(displayMonths.map(m => m.split('-')[0]))).sort();
    if (years.length === 0) return '';
    return ` (${years.join(', ')})`;
  }, [displayMonths]);

  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [zoomEditors, setZoomEditors] = useState<ZoomEditor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [accountFilter, setAccountFilter] = useState<string>('All');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [dateRangePreset, setDateRangePreset] = useState<'All' | 'Today' | 'Week' | 'Month' | 'Custom'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, accountFilter, startDateFilter, endDateFilter]);

  // Sync date pickers with selected preset
  useEffect(() => {
    if (dateRangePreset === 'All') {
      setStartDateFilter('');
      setEndDateFilter('');
    } else if (dateRangePreset === 'Today') {
      const todayStr = new Date().toLocaleDateString('en-CA');
      setStartDateFilter(todayStr);
      setEndDateFilter(todayStr);
    } else if (dateRangePreset === 'Week') {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(now.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6); // Sunday

      setStartDateFilter(monday.toLocaleDateString('en-CA'));
      setEndDateFilter(sunday.toLocaleDateString('en-CA'));
    } else if (dateRangePreset === 'Month') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      setStartDateFilter(startOfMonth.toLocaleDateString('en-CA'));
      setEndDateFilter(endOfMonth.toLocaleDateString('en-CA'));
    }
  }, [dateRangePreset]);

  const [chartViewMode, setChartViewMode] = useState<'summary' | 'monthly'>('summary');

  // Chart month detail modal states
  const [clickedMonthMeetings, setClickedMonthMeetings] = useState<ZoomMeeting[]>([]);
  const [clickedMonthLabel, setClickedMonthLabel] = useState<string>('');
  const [isMonthDetailModalOpen, setIsMonthDetailModalOpen] = useState(false);
  const [clickedChartType, setClickedChartType] = useState<'unit' | 'operator' | 'status' | 'jenis' | 'account' | null>(null);
  const [modalDynamicFilter, setModalDynamicFilter] = useState<string>('All');

  const handleChartMonthClick = useCallback((chartType: 'unit' | 'operator' | 'status' | 'jenis' | 'account', state: any) => {
    if (state && state.activeLabel) {
      const monthLabel = state.activeLabel;
      const clickedMonthStr = displayMonths.find(m => formatMonthLabel(m) === monthLabel);
      if (clickedMonthStr) {
        const monthMeetings = meetings.filter(m => m.tanggal?.startsWith(clickedMonthStr));
        setClickedMonthMeetings(monthMeetings);
        setClickedMonthLabel(monthLabel);
        setClickedChartType(chartType);
        setModalDynamicFilter('All');
        setIsMonthDetailModalOpen(true);
      }
    }
  }, [displayMonths, formatMonthLabel, meetings]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<ZoomMeeting | null>(null);
  const [selectedMeetingDetail, setSelectedMeetingDetail] = useState<ZoomMeeting | null>(null);

  // Clipboard states
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Individual Chart Filter States
  const [unitFilter, setUnitFilter] = useState<'all' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [unitCustomStart, setUnitCustomStart] = useState('');
  const [unitCustomEnd, setUnitCustomEnd] = useState('');

  const [accountFilterState, setAccountFilterState] = useState<'all' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [accountCustomStart, setAccountCustomStart] = useState('');
  const [accountCustomEnd, setAccountCustomEnd] = useState('');

  const [operatorFilter, setOperatorFilter] = useState<'all' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [operatorCustomStart, setOperatorCustomStart] = useState('');
  const [operatorCustomEnd, setOperatorCustomEnd] = useState('');

  const [statusFilterState, setStatusFilterState] = useState<'all' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [statusCustomStart, setStatusCustomStart] = useState('');
  const [statusCustomEnd, setStatusCustomEnd] = useState('');

  const [meetingTypeFilter, setMeetingTypeFilter] = useState<'all' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [meetingTypeCustomStart, setMeetingTypeCustomStart] = useState('');
  const [meetingTypeCustomEnd, setMeetingTypeCustomEnd] = useState('');

  // Export/Import Modal States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  // Authorization check (includes Super Admin, Datin, and designated Zoom Editors)
  const isDatinOrAdmin = useMemo(() => {
    if (!currentUser) return false;
    const isDatinOrAdminUser = currentUser.role === 'Super Admin' || currentUser.divisi === 'Biro Data dan Informasi';
    const isEditor = zoomEditors.some(e => e.userId === currentUser.id);
    return isDatinOrAdminUser || isEditor;
  }, [currentUser, zoomEditors]);

  const handleOpenExportModal = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    setExportStartDate(startDateFilter || startOfMonth);
    setExportEndDate(endDateFilter || today);
    setIsExportModalOpen(true);
  };

  const handleExecuteExport = () => {
    if (!exportStartDate || !exportEndDate) {
      alert('Silakan pilih rentang tanggal ekspor.');
      return;
    }
    exportZoomMeetingsToExcel(meetings, usersMap, exportStartDate, exportEndDate);
    setIsExportModalOpen(false);
  };

  useEffect(() => {
    fetchData();
    fetchUsers();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [mtgs, accs, eds] = await Promise.all([
        zoomService.getMeetings(),
        zoomService.getAccounts(),
        zoomService.getZoomEditors()
      ]);

      // Automatically mark past scheduled meetings as completed
      const now = new Date();
      const meetingsToUpdate: string[] = [];
      const processedMeetings = mtgs.map((m) => {
        if (m.status === 'Scheduled') {
          const cleanTime = (m.waktuSelesai || '23:59').trim().replace('.', ':');
          const [hours, minutes] = cleanTime.split(':');
          const hr = (hours || '23').padStart(2, '0');
          const mn = (minutes || '59').padStart(2, '0');
          const meetingEnd = new Date(`${m.tanggal}T${hr}:${mn}:00`);
          
          if (meetingEnd < now) {
            meetingsToUpdate.push(m.id);
            return { ...m, status: 'Completed' as const };
          }
        }
        return m;
      });

      setMeetings(processedMeetings);
      setAccounts(accs);
      setZoomEditors(eds);

      // Perform background update to Supabase for the status change
      if (meetingsToUpdate.length > 0) {
        Promise.all(
          meetingsToUpdate.map((id) =>
            supabase.from('zoom_meetings').update({ status: 'Completed' }).eq('id', id)
          )
        ).catch((err) => {
          console.error('Error updating past meetings status in database:', err);
        });
      }
    } catch (err) {
      console.error('Error fetching zoom data:', err);
      setError('Gagal memuat data pelayanan Zoom. Silakan periksa koneksi Anda.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await supabase.from('profiles').select('id, name');
      if (data) {
        const uMap: Record<string, string> = {};
        data.forEach((u) => {
          uMap[u.id] = u.name;
        });
        setUsersMap(uMap);
      }
    } catch (err) {
      console.error('Error loading users map:', err);
    }
  };

  // Save/Update Meeting callback
  const handleSaveMeeting = (meeting: ZoomMeeting) => {
    // Refresh data
    fetchData();
    // Update active details if it was edited
    if (editingMeeting) {
      setSelectedMeetingDetail(meeting);
    }
    setIsAddModalOpen(false);
    setEditingMeeting(null);
  };

  const handleCloseAddEditModal = () => {
    setIsAddModalOpen(false);
    if (editingMeeting) {
      setSelectedMeetingDetail(editingMeeting);
    }
    setEditingMeeting(null);
  };

  const handleDeleteMeeting = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus jadwal pelayanan Zoom ini?')) return;

    try {
      setLoading(true);
      await zoomService.deleteMeeting(id);
      setSelectedMeetingDetail(null);
      fetchData();
    } catch (err) {
      console.error('Error deleting meeting:', err);
      setError('Gagal menghapus jadwal rapat.');
      setLoading(false);
    }
  };

  // Clipboard helper
  const handleCopyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(type);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter meetings
  const filteredMeetings = meetings.filter((m) => {
    const matchesSearch = m.kegiatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.unitKerja.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.jenisRapat.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || m.status === statusFilter;
    
    const matchesAccount = accountFilter === 'All' || m.zoomAccountId === accountFilter;
    
    const matchesDate = (!startDateFilter || m.tanggal >= startDateFilter) &&
      (!endDateFilter || m.tanggal <= endDateFilter);

    return matchesSearch && matchesStatus && matchesAccount && matchesDate;
  });

  // Sort meetings: newest date & time at the top
  const sortedMeetings = [...filteredMeetings].sort((a, b) => {
    const dateCompare = b.tanggal.localeCompare(a.tanggal);
    if (dateCompare !== 0) return dateCompare;
    return b.waktuMulai.localeCompare(a.waktuMulai);
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedMeetings.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedMeetings.slice(indexOfFirstItem, indexOfLastItem);

  // Helper to filter meetings for charts by date range
  const getFilteredMeetingsForChart = useCallback((
    filterType: 'all' | 'week' | 'month' | 'year' | 'custom',
    customStart: string,
    customEnd: string
  ) => {
    const now = new Date();
    return meetings.filter((m) => {
      if (!m.tanggal) return false;
      const mDate = new Date(m.tanggal);
      
      switch (filterType) {
        case 'week': {
          // Minggu Ini: dari Hari Minggu sampai Sabtu minggu berjalan
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          
          return mDate >= startOfWeek && mDate <= endOfWeek;
        }
        case 'month': {
          // Bulan Ini
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          return mDate >= startOfMonth && mDate <= endOfMonth;
        }
        case 'year': {
          // Tahun Ini
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
          return mDate >= startOfYear && mDate <= endOfYear;
        }
        case 'custom': {
          if (customStart && customEnd) {
            const start = new Date(customStart);
            start.setHours(0, 0, 0, 0);
            const end = new Date(customEnd);
            end.setHours(23, 59, 59, 999);
            return mDate >= start && mDate <= end;
          } else if (customStart) {
            const start = new Date(customStart);
            start.setHours(0, 0, 0, 0);
            return mDate >= start;
          } else if (customEnd) {
            const end = new Date(customEnd);
            end.setHours(23, 59, 59, 999);
            return mDate <= end;
          }
          return true;
        }
        case 'all':
        default:
          return true;
      }
    });
  }, [meetings]);

  // 1. Top 10 Satker / Unit Kerja
  const unitStats = useMemo(() => {
    const filtered = getFilteredMeetingsForChart(unitFilter, unitCustomStart, unitCustomEnd);
    const counts: Record<string, number> = {};
    filtered.forEach(m => {
      const name = m.unitKerja || 'Lainnya';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [getFilteredMeetingsForChart, unitFilter, unitCustomStart, unitCustomEnd]);

  // 2. Akun Zoom Usage
  const accountStats = useMemo(() => {
    const filtered = getFilteredMeetingsForChart(accountFilterState, accountCustomStart, accountCustomEnd);
    const counts: Record<string, number> = {};
    filtered.forEach(m => {
      const name = m.zoomAccount?.name || 'Belum Diatur';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [getFilteredMeetingsForChart, accountFilterState, accountCustomStart, accountCustomEnd]);

  // 3. Top 10 Petugas/Operator Teraktif
  const operatorStats = useMemo(() => {
    const filtered = getFilteredMeetingsForChart(operatorFilter, operatorCustomStart, operatorCustomEnd);
    const counts: Record<string, number> = {};
    filtered.forEach(m => {
      const ids = m.operatorIds && m.operatorIds.length > 0 
        ? m.operatorIds 
        : (m.operatorId ? [m.operatorId] : []);
      
      ids.forEach(id => {
        const name = usersMap[id] || 'Memuat...';
        counts[name] = (counts[name] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [getFilteredMeetingsForChart, operatorFilter, operatorCustomStart, operatorCustomEnd, usersMap]);

  // 4. Distribusi Status Rapat
  const statusStats = useMemo(() => {
    const filtered = getFilteredMeetingsForChart(statusFilterState, statusCustomStart, statusCustomEnd);
    const counts: Record<string, number> = {
      'Terjadwal': 0,
      'Selesai': 0,
      'Batal': 0
    };
    filtered.forEach(m => {
      if (m.status === 'Scheduled') counts['Terjadwal']++;
      else if (m.status === 'Completed') counts['Selesai']++;
      else if (m.status === 'Cancelled') counts['Batal']++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [getFilteredMeetingsForChart, statusFilterState, statusCustomStart, statusCustomEnd]);

  // Colors for Status Chart
  const STATUS_COLORS = {
    'Terjadwal': '#3b82f6', // blue-500
    'Selesai': '#10b981',   // green-500
    'Batal': '#ef4444'      // red-500
  };

  // 5. Perbandingan Jenis Rapat
  const meetingTypeStats = useMemo(() => {
    const filtered = getFilteredMeetingsForChart(meetingTypeFilter, meetingTypeCustomStart, meetingTypeCustomEnd);
    const counts: Record<string, number> = {
      'Pendampingan Zoom': 0,
      'Peminjaman Zoom': 0
    };
    filtered.forEach(m => {
      const name = m.jenisRapat || 'Lainnya (Legacy)';
      const displayName = (name === 'Pendampingan Zoom' || name === 'Peminjaman Zoom') ? name : 'Lainnya (Legacy)';
      counts[displayName] = (counts[displayName] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [getFilteredMeetingsForChart, meetingTypeFilter, meetingTypeCustomStart, meetingTypeCustomEnd]);


  // 1. Monthly Unit Kerja Dataset
  const monthlyUnitStats = useMemo(() => {
    const topUnits = unitStats.slice(0, 5).map(u => u.name);
    return displayMonths.map(month => {
      const row: any = { month: formatMonthLabel(month) };
      topUnits.forEach(u => { row[u] = 0; });
      row['Lainnya'] = 0;
      let total = 0;

      meetings
        .filter(m => m.tanggal?.startsWith(month))
        .forEach(m => {
          total++;
          const uName = m.unitKerja || 'Lainnya';
          if (topUnits.includes(uName)) {
            row[uName] = (row[uName] || 0) + 1;
          } else {
            row['Lainnya'] = (row['Lainnya'] || 0) + 1;
          }
        });
      row.totalCount = total;
      return row;
    });
  }, [displayMonths, meetings, unitStats, formatMonthLabel]);

  // 2. Monthly Operator Dataset
  const monthlyOperatorStats = useMemo(() => {
    const topOperators = operatorStats.slice(0, 5).map(o => o.name);
    return displayMonths.map(month => {
      const row: any = { month: formatMonthLabel(month) };
      topOperators.forEach(o => { row[o] = 0; });
      row['Lainnya'] = 0;
      let total = 0;

      meetings
        .filter(m => m.tanggal?.startsWith(month))
        .forEach(m => {
          total++;
          const ids = m.operatorIds && m.operatorIds.length > 0 
            ? m.operatorIds 
            : (m.operatorId ? [m.operatorId] : []);
          
          ids.forEach(id => {
            const name = usersMap[id] || 'Lainnya';
            if (topOperators.includes(name)) {
              row[name] = (row[name] || 0) + 1;
            } else {
              row['Lainnya'] = (row['Lainnya'] || 0) + 1;
            }
          });
        });
      row.totalCount = total;
      return row;
    });
  }, [displayMonths, meetings, operatorStats, usersMap, formatMonthLabel]);

  // 3. Monthly Status Dataset
  const monthlyStatusStats = useMemo(() => {
    return displayMonths.map(month => {
      const row = {
        month: formatMonthLabel(month),
        'Terjadwal': 0,
        'Selesai': 0,
        'Batal': 0,
        totalCount: 0
      };
      let total = 0;
      meetings
        .filter(m => m.tanggal?.startsWith(month))
        .forEach(m => {
          total++;
          if (m.status === 'Scheduled') row['Terjadwal']++;
          else if (m.status === 'Completed') row['Selesai']++;
          else if (m.status === 'Cancelled') row['Batal']++;
        });
      row.totalCount = total;
      return row;
    });
  }, [displayMonths, meetings, formatMonthLabel]);

  // 4. Monthly Jenis Rapat Dataset
  const monthlyJenisStats = useMemo(() => {
    return displayMonths.map(month => {
      const row = {
        month: formatMonthLabel(month),
        'Pendampingan Zoom': 0,
        'Peminjaman Zoom': 0,
        totalCount: 0
      };
      let total = 0;
      meetings
        .filter(m => m.tanggal?.startsWith(month))
        .forEach(m => {
          total++;
          if (m.jenisRapat === 'Pendampingan Zoom') row['Pendampingan Zoom']++;
          else if (m.jenisRapat === 'Peminjaman Zoom') row['Peminjaman Zoom']++;
        });
      row.totalCount = total;
      return row;
    });
  }, [displayMonths, meetings, formatMonthLabel]);

  // 5. Monthly Akun Zoom Dataset
  const monthlyAccountStats = useMemo(() => {
    const topAccounts = accountStats.slice(0, 5).map(a => a.name);
    return displayMonths.map(month => {
      const row: any = { month: formatMonthLabel(month) };
      topAccounts.forEach(a => { row[a] = 0; });
      row['Lainnya'] = 0;
      row['Belum Diatur'] = 0;
      let total = 0;

      meetings
        .filter(m => m.tanggal?.startsWith(month))
        .forEach(m => {
          total++;
          const accName = m.zoomAccount?.name;
          if (!accName) {
            row['Belum Diatur'] = (row['Belum Diatur'] || 0) + 1;
          } else if (topAccounts.includes(accName)) {
            row[accName] = (row[accName] || 0) + 1;
          } else {
            row['Lainnya'] = (row['Lainnya'] || 0) + 1;
          }
        });
      row.totalCount = total;
      return row;
    });
  }, [displayMonths, meetings, accountStats, formatMonthLabel]);

  // Filtered meetings options inside month details modal
  const filterOptions = useMemo(() => {
    if (!clickedChartType || clickedMonthMeetings.length === 0) return [];

    const options: { value: string; label: string; count: number }[] = [
      { value: 'All', label: 'Semua', count: clickedMonthMeetings.length }
    ];

    if (clickedChartType === 'unit') {
      const unitsMap = new Map<string, number>();
      clickedMonthMeetings.forEach(m => {
        const u = m.unitKerja || 'Lainnya';
        unitsMap.set(u, (unitsMap.get(u) || 0) + 1);
      });
      Array.from(unitsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([name, count]) => {
          options.push({ value: name, label: name, count });
        });
    } else if (clickedChartType === 'operator') {
      const opMap = new Map<string, number>();
      clickedMonthMeetings.forEach(m => {
        const ids = m.operatorIds && m.operatorIds.length > 0 
          ? m.operatorIds 
          : (m.operatorId ? [m.operatorId] : []);
        
        if (ids.length === 0) {
          opMap.set('Belum Ditugaskan', (opMap.get('Belum Ditugaskan') || 0) + 1);
        } else {
          const uniqueNames = new Set(ids.map(id => usersMap[id] || 'Lainnya'));
          uniqueNames.forEach(name => {
            opMap.set(name, (opMap.get(name) || 0) + 1);
          });
        }
      });
      Array.from(opMap.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([name, count]) => {
          options.push({ value: name, label: name, count });
        });
    } else if (clickedChartType === 'status') {
      const statusMap = {
        'Completed': { label: 'Selesai', count: 0 },
        'Scheduled': { label: 'Terjadwal', count: 0 },
        'Cancelled': { label: 'Batal', count: 0 }
      };
      clickedMonthMeetings.forEach(m => {
        if (m.status === 'Completed' || m.status === 'Scheduled' || m.status === 'Cancelled') {
          statusMap[m.status].count++;
        }
      });
      Object.entries(statusMap).forEach(([val, info]) => {
        if (info.count > 0) {
          options.push({ value: val, label: info.label, count: info.count });
        }
      });
    } else if (clickedChartType === 'jenis') {
      const jenisMap = {
        'Pendampingan Zoom': 0,
        'Peminjaman Zoom': 0
      };
      clickedMonthMeetings.forEach(m => {
        if (m.jenisRapat === 'Pendampingan Zoom') jenisMap['Pendampingan Zoom']++;
        else if (m.jenisRapat === 'Peminjaman Zoom') jenisMap['Peminjaman Zoom']++;
      });
      Object.entries(jenisMap).forEach(([name, count]) => {
        if (count > 0) {
          options.push({ value: name, label: name, count });
        }
      });
    } else if (clickedChartType === 'account') {
      const accMap = new Map<string, number>();
      clickedMonthMeetings.forEach(m => {
        const name = m.zoomAccount?.name || 'Belum Diatur';
        accMap.set(name, (accMap.get(name) || 0) + 1);
      });
      Array.from(accMap.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([name, count]) => {
          options.push({ value: name, label: name, count });
        });
    }

    return options;
  }, [clickedChartType, clickedMonthMeetings, usersMap]);

  // Filtered meetings inside month details modal
  const filteredModalMeetings = useMemo(() => {
    if (modalDynamicFilter === 'All') return clickedMonthMeetings;

    return clickedMonthMeetings.filter(m => {
      if (clickedChartType === 'unit') {
        return (m.unitKerja || 'Lainnya') === modalDynamicFilter;
      }
      if (clickedChartType === 'operator') {
        if (modalDynamicFilter === 'Belum Ditugaskan') {
          return !m.operatorId && (!m.operatorIds || m.operatorIds.length === 0);
        }
        const ids = m.operatorIds && m.operatorIds.length > 0 
          ? m.operatorIds 
          : (m.operatorId ? [m.operatorId] : []);
        return ids.some(id => (usersMap[id] || 'Lainnya') === modalDynamicFilter);
      }
      if (clickedChartType === 'status') {
        return m.status === modalDynamicFilter;
      }
      if (clickedChartType === 'jenis') {
        return m.jenisRapat === modalDynamicFilter;
      }
      if (clickedChartType === 'account') {
        return (m.zoomAccount?.name || 'Belum Diatur') === modalDynamicFilter;
      }
      return true;
    });
  }, [clickedMonthMeetings, modalDynamicFilter, clickedChartType, usersMap]);

  // Summary statistics
  const stats = {
    total: meetings.length,
    scheduled: meetings.filter(m => m.status === 'Scheduled').length,
    completed: meetings.filter(m => m.status === 'Completed').length,
    today: meetings.filter(m => m.tanggal === new Date().toISOString().split('T')[0]).length,
    accountsActive: accounts.length
  };

  const renderChartFilter = (
    filterType: 'all' | 'week' | 'month' | 'year' | 'custom',
    setFilterType: (val: 'all' | 'week' | 'month' | 'year' | 'custom') => void,
    customStart: string,
    setCustomStart: (val: string) => void,
    customEnd: string,
    setCustomEnd: (val: string) => void
  ) => {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-gov-500 font-semibold cursor-pointer"
        >
          <option value="all">Semua Waktu</option>
          <option value="week">Minggu Ini</option>
          <option value="month">Bulan Ini</option>
          <option value="year">Tahun Ini</option>
          <option value="custom">Kustom Tanggal</option>
        </select>
        
        {filterType === 'custom' && (
          <div className="flex items-center gap-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 animate-fadeIn">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-transparent text-slate-700 focus:outline-none max-w-[110px] text-xs font-medium"
            />
            <span className="text-slate-400 font-bold">-</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-transparent text-slate-700 focus:outline-none max-w-[110px] text-xs font-medium"
            />
          </div>
        )}
      </div>
    );
  };

  const formatDateStr = (dateStr: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
  };

  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto bg-slate-50">
      
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 bg-gov-600 rounded-xl text-white shadow-md shadow-gov-600/10">
              <Video size={20} className="animate-pulse" />
            </div>
            Pelayanan Zoom Meeting
          </h2>
          <p className="text-sm sm:text-base text-slate-500 mt-1">
            Portal koordinasi pelayanan video conference divisi Data dan Informasi (Datin).
          </p>
        </div>

        {isDatinOrAdmin && (
          <button
            onClick={() => {
              setEditingMeeting(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gov-600 to-gov-700 hover:from-gov-700 hover:to-gov-800 text-white rounded-xl font-bold text-sm shadow-md shadow-gov-600/10 hover:shadow-lg hover:shadow-gov-600/20 transition-all self-start"
          >
            <Plus size={16} />
            Buat Jadwal Pelayanan
          </button>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 mb-6 gap-6">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`pb-3 font-bold text-base transition-colors relative ${
            activeSubTab === 'dashboard' ? 'text-gov-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Dashboard Statistik
          {activeSubTab === 'dashboard' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gov-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('schedules')}
          className={`pb-3 font-bold text-base transition-colors relative ${
            activeSubTab === 'schedules' ? 'text-gov-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Jadwal Rapat
          {activeSubTab === 'schedules' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gov-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('accounts')}
          className={`pb-3 font-bold text-base transition-colors relative ${
            activeSubTab === 'accounts' ? 'text-gov-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Kelola Akun Zoom
          {activeSubTab === 'accounts' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gov-600 rounded-full" />
          )}
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 border border-red-100 px-4 py-3 rounded-2xl text-sm flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={fetchData} className="ml-auto flex items-center gap-1 hover:underline text-xs">
            <RefreshCw size={12} /> Coba Lagi
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && meetings.length === 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white h-24 rounded-2xl border border-slate-200 animate-pulse"></div>
            ))}
          </div>
          <div className="bg-white h-96 rounded-2xl border border-slate-200 animate-pulse"></div>
        </div>
      ) : activeSubTab === 'dashboard' ? (
        <div className="space-y-6">
          
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-500 text-sm font-bold">Total Jadwal</span>
                <div className="p-1 bg-slate-50 rounded-lg text-slate-500"><Calendar size={14} /></div>
              </div>
              <div className="text-3xl font-black text-slate-800">{stats.total}</div>
              <div className="text-xs text-slate-400 mt-1">Seluruh pelayanan Zoom</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-blue-600 text-sm font-bold">Rapat Aktif/Terjadwal</span>
                <div className="p-1 bg-blue-50 rounded-lg text-blue-500"><Clock size={14} /></div>
              </div>
              <div className="text-3xl font-black text-blue-600">{stats.scheduled}</div>
              <div className="text-xs text-blue-400 mt-1">Akan datang & butuh operator</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-green-600 text-sm font-bold">Rapat Hari Ini</span>
                <div className="p-1 bg-green-50 rounded-lg text-green-500"><Activity size={14} /></div>
              </div>
              <div className="text-3xl font-black text-green-600">{stats.today}</div>
              <div className="text-xs text-green-400 mt-1">Jadwal pada hari ini</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-purple-600 text-sm font-bold">Akun Zoom Aktif</span>
                <div className="p-1 bg-purple-50 rounded-lg text-purple-500"><Video size={14} /></div>
              </div>
              <div className="text-3xl font-black text-purple-600">{stats.accountsActive}</div>
              <div className="text-xs text-purple-400 mt-1">Akun zoom terdaftar</div>
            </div>
          </div>

          {/* Visualizations Controls & Section */}
          {meetings.length > 0 && (
            <>
              {/* Toggle Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 border border-slate-200 rounded-2xl mb-6 gap-3 shadow-2xs">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <BarChart2 className="text-gov-600 animate-pulse" size={18} />
                    Visualisasi & Tren Pelayanan
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Analisis statistik penggunaan akun Zoom dan operator.</p>
                </div>
                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                  {chartViewMode === 'monthly' && availableYears.length > 1 && (
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl shadow-3xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tahun:</span>
                      <select
                        value={chartYearFilter}
                        onChange={(e) => setChartYearFilter(e.target.value)}
                        className="text-xs bg-transparent text-slate-700 font-bold focus:outline-none cursor-pointer pr-1"
                      >
                        <option value="All">Semua Tahun</option>
                        {availableYears.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
                    <button
                      onClick={() => setChartViewMode('summary')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        chartViewMode === 'summary'
                          ? 'bg-white text-gov-750 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Akumulasi Total
                    </button>
                    <button
                      onClick={() => setChartViewMode('monthly')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        chartViewMode === 'monthly'
                          ? 'bg-white text-gov-750 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Banding Bulanan (Tren)
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Satker Usage (Top 10 Unit Kerja Teraktif) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {chartViewMode === 'summary' ? 'Top 10 Unit Kerja Teraktif' : `Tren Bulanan Unit Kerja${activeYearsString}`}
                      </h4>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
                        {chartViewMode === 'summary' ? 'Frekuensi penggunaan Zoom per unit kerja.' : 'Grafik tren penggunaan Zoom per bulan.'}
                      </p>
                    </div>
                    {chartViewMode === 'summary' && renderChartFilter(unitFilter, setUnitFilter, unitCustomStart, setUnitCustomStart, unitCustomEnd, setUnitCustomEnd)}
                  </div>
                  <div className="h-80">
                    {chartViewMode === 'summary' ? (
                      unitStats.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">Tidak ada data untuk periode ini.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={unitStats} margin={{ top: 10, right: 10, left: -25, bottom: 45 }}>
                            <XAxis 
                              dataKey="name" 
                              stroke="#94a3b8" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false} 
                              interval={0}
                              angle={-35}
                              textAnchor="end"
                              tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 12)}...` : value}
                            />
                            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" name="Jumlah Rapat" fill="#0f766e" radius={[6, 6, 0, 0]} maxBarSize={30}>
                              <LabelList dataKey="value" position="top" fontSize={10} fill="#475569" fontWeight="bold" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart onClick={(state) => handleChartMonthClick('unit', state)} style={{ cursor: 'pointer' }} data={monthlyUnitStats} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                          {unitStats.slice(0, 5).map((u, i) => {
                            const colors = ['#0f766e', '#0d9488', '#14b8a6', '#2dd4bf', '#99f6e4'];
                            return (
                              <Bar 
                                key={u.name} 
                                dataKey={u.name} 
                                name={u.name}
                                stackId="a" 
                                fill={colors[i % colors.length]} 
                              />
                            );
                          })}
                          <Bar dataKey="Lainnya" name="Lainnya" stackId="a" fill="#cbd5e1" />
                          <Line type="monotone" dataKey="totalCount" stroke="transparent" legendType="none" activeDot={false} dot={false}>
                            <LabelList dataKey="totalCount" position="top" fontSize={10} fill="#475569" fontWeight="bold" />
                          </Line>
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Chart 2: Top 10 Petugas Teraktif */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {chartViewMode === 'summary' ? 'Top 10 Petugas Teraktif' : `Tren Bulanan Petugas${activeYearsString}`}
                      </h4>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
                        {chartViewMode === 'summary' ? 'Operator paling sering ditugaskan.' : 'Frekuensi penugasan operator per bulan.'}
                      </p>
                    </div>
                    {chartViewMode === 'summary' && renderChartFilter(operatorFilter, setOperatorFilter, operatorCustomStart, setOperatorCustomStart, operatorCustomEnd, setOperatorCustomEnd)}
                  </div>
                  <div className="h-80">
                    {chartViewMode === 'summary' ? (
                      operatorStats.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">Tidak ada data untuk periode ini.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={operatorStats} margin={{ top: 10, right: 10, left: -25, bottom: 45 }}>
                            <XAxis 
                              dataKey="name" 
                              stroke="#94a3b8" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false} 
                              interval={0}
                              angle={-35}
                              textAnchor="end"
                              tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 12)}...` : value}
                            />
                            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" name="Jumlah Rapat" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={30}>
                              <LabelList dataKey="value" position="top" fontSize={10} fill="#475569" fontWeight="bold" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart onClick={(state) => handleChartMonthClick('operator', state)} style={{ cursor: 'pointer' }} data={monthlyOperatorStats} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                          {operatorStats.slice(0, 5).map((op, i) => {
                            const colors = ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'];
                            return (
                              <Bar 
                                key={op.name} 
                                dataKey={op.name} 
                                name={op.name}
                                stackId="a" 
                                fill={colors[i % colors.length]} 
                              />
                            );
                          })}
                          <Bar dataKey="Lainnya" name="Lainnya" stackId="a" fill="#cbd5e1" />
                          <Line type="monotone" dataKey="totalCount" stroke="transparent" legendType="none" activeDot={false} dot={false}>
                            <LabelList dataKey="totalCount" position="top" fontSize={10} fill="#475569" fontWeight="bold" />
                          </Line>
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Chart 3: Distribusi Status Rapat */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {chartViewMode === 'summary' ? 'Distribusi Status Rapat' : `Tren Bulanan Status Rapat${activeYearsString}`}
                      </h4>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
                        {chartViewMode === 'summary' ? 'Perbandingan status seluruh jadwal rapat.' : 'Penyebaran status penyelesaian rapat per bulan.'}
                      </p>
                    </div>
                    {chartViewMode === 'summary' && renderChartFilter(statusFilterState, setStatusFilterState, statusCustomStart, setStatusCustomStart, statusCustomEnd, setStatusCustomEnd)}
                  </div>
                  <div className="h-80 flex items-center justify-center">
                    {chartViewMode === 'summary' ? (
                      meetings.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">Tidak ada data untuk periode ini.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusStats}
                              cx="50%"
                              cy="48%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {statusStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || '#cbd5e1'} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart onClick={(state) => handleChartMonthClick('status', state)} style={{ cursor: 'pointer' }} data={monthlyStatusStats} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                          <Bar dataKey="Selesai" name="Selesai" stackId="a" fill="#10b981" />
                          <Bar dataKey="Terjadwal" name="Terjadwal" stackId="a" fill="#3b82f6" />
                          <Bar dataKey="Batal" name="Batal" stackId="a" fill="#ef4444" />
                          <Line type="monotone" dataKey="totalCount" stroke="transparent" legendType="none" activeDot={false} dot={false}>
                            <LabelList dataKey="totalCount" position="top" fontSize={10} fill="#475569" fontWeight="bold" />
                          </Line>
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Chart 4: Perbandingan Jenis Rapat */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {chartViewMode === 'summary' ? 'Perbandingan Jenis Rapat' : `Tren Bulanan Jenis Rapat${activeYearsString}`}
                      </h4>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
                        {chartViewMode === 'summary' ? 'Distribusi penggunaan berdasarkan jenis layanan Zoom.' : 'Jumlah layanan Pendampingan vs Peminjaman per bulan.'}
                      </p>
                    </div>
                    {chartViewMode === 'summary' && renderChartFilter(meetingTypeFilter, setMeetingTypeFilter, meetingTypeCustomStart, setMeetingTypeCustomStart, meetingTypeCustomEnd, setMeetingTypeCustomEnd)}
                  </div>
                  <div className="h-80">
                    {chartViewMode === 'summary' ? (
                      meetingTypeStats.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">Tidak ada data untuk periode ini.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            data={meetingTypeStats}
                            margin={{ top: 10, right: 20, left: 30, bottom: 5 }}
                          >
                            <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={130} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" name="Jumlah Rapat" radius={[0, 6, 6, 0]} maxBarSize={30}>
                              <LabelList dataKey="value" position="right" fontSize={10} fill="#475569" fontWeight="bold" />
                              {meetingTypeStats.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.name === 'Pendampingan Zoom' ? '#6366f1' : entry.name === 'Peminjaman Zoom' ? '#3b82f6' : '#94a3b8'} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart onClick={(state) => handleChartMonthClick('jenis', state)} style={{ cursor: 'pointer' }} data={monthlyJenisStats} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                          <Bar dataKey="Pendampingan Zoom" name="Pendampingan Zoom" stackId="a" fill="#6366f1" />
                          <Bar dataKey="Peminjaman Zoom" name="Peminjaman Zoom" stackId="a" fill="#3b82f6" />
                          <Line type="monotone" dataKey="totalCount" stroke="transparent" legendType="none" activeDot={false} dot={false}>
                            <LabelList dataKey="totalCount" position="top" fontSize={10} fill="#475569" fontWeight="bold" />
                          </Line>
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Chart 5: Tingkat Utilisasi Akun Zoom (Lebar Penuh) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 lg:col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {chartViewMode === 'summary' ? 'Tingkat Utilisasi Akun Zoom' : `Tren Bulanan Utilisasi Akun Zoom${activeYearsString}`}
                      </h4>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
                        {chartViewMode === 'summary' ? 'Jumlah penggunaan rapat untuk masing-masing akun.' : 'Grafik penggunaan masing-masing akun Zoom per bulan.'}
                      </p>
                    </div>
                    {chartViewMode === 'summary' && renderChartFilter(accountFilterState, setAccountFilterState, accountCustomStart, setAccountCustomStart, accountCustomEnd, setAccountCustomEnd)}
                  </div>
                  <div className="h-80">
                    {chartViewMode === 'summary' ? (
                      accountStats.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">Tidak ada data untuk periode ini.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={accountStats} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" name="Jumlah Rapat" fill="#ea580c" radius={[6, 6, 0, 0]} maxBarSize={45}>
                              <LabelList dataKey="value" position="top" fontSize={10} fill="#475569" fontWeight="bold" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart onClick={(state) => handleChartMonthClick('account', state)} style={{ cursor: 'pointer' }} data={monthlyAccountStats} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                          {accountStats.slice(0, 5).map((acc, i) => {
                            const colors = ['#ea580c', '#f97316', '#fb923c', '#ffcaa5', '#ffe5d9'];
                            return (
                              <Bar 
                                key={acc.name} 
                                dataKey={acc.name} 
                                name={acc.name}
                                stackId="a" 
                                fill={colors[i % colors.length]} 
                              />
                            );
                          })}
                          <Bar dataKey="Lainnya" name="Lainnya" stackId="a" fill="#cbd5e1" />
                          <Bar dataKey="Belum Diatur" name="Belum Diatur" stackId="a" fill="#e2e8f0" />
                          <Line type="monotone" dataKey="totalCount" stroke="transparent" legendType="none" activeDot={false} dot={false}>
                            <LabelList dataKey="totalCount" position="top" fontSize={10} fill="#475569" fontWeight="bold" />
                          </Line>
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : activeSubTab === 'schedules' ? (
        <div className="space-y-6">
          
          {/* Search, Filter, and Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
            {/* Search Bar & Export/Import Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari kegiatan, unit kerja, jenis rapat..."
                  className="w-full text-sm bg-slate-50 text-slate-800 placeholder-slate-400 pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-500 focus:border-gov-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleOpenExportModal}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/10 hover:shadow-lg transition-all whitespace-nowrap"
                >
                  <FileSpreadsheet size={16} />
                  <span>Ekspor ke Excel</span>
                </button>
                {isDatinOrAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gov-600 hover:bg-gov-700 text-white rounded-xl font-bold text-sm shadow-md shadow-gov-600/10 hover:shadow-lg transition-all whitespace-nowrap"
                  >
                    <Upload size={16} />
                    <span>Impor Excel</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filters Row */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${startDateFilter || endDateFilter || dateRangePreset === 'Custom' ? 'lg:grid-cols-5' : 'md:grid-cols-3'} gap-4`}>
              {/* Status Filter */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Status Rapat</span>
                <SearchableSelect
                  options={[
                    { value: 'All', label: 'Semua Status' },
                    { value: 'Scheduled', label: 'Terjadwal' },
                    { value: 'Completed', label: 'Selesai' },
                    { value: 'Cancelled', label: 'Batal' }
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder="Cari status..."
                  emptyOption="Semua Status"
                />
              </div>

              {/* Account Filter */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Akun Zoom</span>
                <SearchableSelect
                  options={[
                    { value: 'All', label: 'Semua Akun Zoom' },
                    ...accounts.map(acc => ({ value: acc.id, label: acc.name }))
                  ]}
                  value={accountFilter}
                  onChange={setAccountFilter}
                  placeholder="Cari akun..."
                  emptyOption="Semua Akun Zoom"
                />
              </div>

              {/* Date Preset Filter */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Periode Rapat</span>
                <select
                  value={dateRangePreset}
                  onChange={(e) => setDateRangePreset(e.target.value as any)}
                  className="w-full text-sm bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-500 font-semibold cursor-pointer h-[38px]"
                >
                  <option value="All">Semua Waktu</option>
                  <option value="Today">Hari Ini</option>
                  <option value="Week">Minggu Ini</option>
                  <option value="Month">Bulan Ini</option>
                  <option value="Custom">Kustom Tanggal</option>
                </select>
              </div>

              {/* Start Date Filter (Conditional) */}
              {(dateRangePreset === 'Custom' || startDateFilter || endDateFilter) && (
                <div className="space-y-1 animate-fadeIn">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Mulai Tanggal</span>
                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => {
                      setStartDateFilter(e.target.value);
                      setDateRangePreset('Custom');
                    }}
                    className="w-full text-sm bg-slate-50 text-slate-800 p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-500 h-[38px]"
                  />
                </div>
              )}

              {/* End Date Filter (Conditional) */}
              {(dateRangePreset === 'Custom' || startDateFilter || endDateFilter) && (
                <div className="space-y-1 animate-fadeIn">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Sampai Tanggal</span>
                  <input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => {
                      setEndDateFilter(e.target.value);
                      setDateRangePreset('Custom');
                    }}
                    className="w-full text-sm bg-slate-50 text-slate-800 p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-500 h-[38px]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Meetings List/Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-base">Jadwal Pelayanan Zoom Terbaru</h4>
              <span className="text-sm text-slate-400 font-medium">
                Menampilkan {sortedMeetings.length > 0 ? indexOfFirstItem + 1 : 0}-
                {Math.min(indexOfLastItem, sortedMeetings.length)} dari {sortedMeetings.length} rapat
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-3">Tanggal & Waktu</th>
                    <th className="px-6 py-3">Kegiatan</th>
                    <th className="px-6 py-3">Operator</th>
                    <th className="px-6 py-3">Akun Zoom</th>
                    <th className="px-6 py-3">Lokasi</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 text-base">
                        Tidak ada jadwal pelayanan Zoom yang cocok dengan filter Anda.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((m) => (
                      <tr
                        key={m.id}
                        onClick={() => setSelectedMeetingDetail(m)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer text-sm"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-slate-800">{formatDateStr(m.tanggal)}</div>
                          <div className="text-slate-500 mt-0.5 flex items-center gap-1.5 text-xs">
                            <Clock size={13} />
                            {m.waktuMulai} - {m.waktuSelesai}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 max-w-md truncate" title={m.kegiatan}>
                            {m.kegiatan}
                          </div>
                          <div className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                            <Briefcase size={12} /> {m.unitKerja} | {m.jenisRapat}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                          <span className="font-medium">
                            {m.operatorIds && m.operatorIds.length > 0
                              ? m.operatorIds.map(id => usersMap[id] || 'Memuat...').join(', ')
                              : (m.operatorId ? (usersMap[m.operatorId] || 'Memuat...') : 'Belum Ditugaskan')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                          <span className="font-semibold text-gov-700 bg-gov-50 px-2.5 py-1 rounded-lg border border-gov-100">
                            {m.zoomAccount?.name || 'Belum Diatur'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin size={13} className="text-slate-400" />
                            {m.lokasi}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full font-semibold text-xs ${
                            m.status === 'Completed'
                              ? 'bg-green-50 text-green-700 border border-green-100'
                              : m.status === 'Cancelled'
                                ? 'bg-red-50 text-red-700 border border-red-100'
                                : 'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}>
                            {m.status === 'Completed' ? 'Selesai' : m.status === 'Cancelled' ? 'Batal' : 'Terjadwal'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {sortedMeetings.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
                <div>
                  Menampilkan <span className="font-bold text-slate-700">{indexOfFirstItem + 1}</span> sampai{' '}
                  <span className="font-bold text-slate-700">
                    {Math.min(indexOfLastItem, sortedMeetings.length)}
                  </span>{' '}
                  dari <span className="font-bold text-slate-700">{sortedMeetings.length}</span> rapat
                </div>
                
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPage(prev => Math.max(prev - 1, 1));
                    }}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:hover:bg-white font-semibold transition-colors flex items-center gap-1"
                  >
                    Sebelumnya
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      Math.abs(pageNum - currentPage) <= 1
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentPage(pageNum);
                          }}
                          className={`w-9 h-9 rounded-xl font-bold transition-colors ${
                            currentPage === pageNum
                              ? 'bg-gov-600 text-white shadow-md shadow-gov-600/10'
                              : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    
                    if (
                      (pageNum === 2 && currentPage > 3) ||
                      (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                    ) {
                      return <span key={pageNum} className="px-1 text-slate-400">...</span>;
                    }
                    
                    return null;
                  })}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPage(prev => Math.min(prev + 1, totalPages));
                    }}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:hover:bg-white font-semibold transition-colors flex items-center gap-1"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Zoom Account Manager Tab */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <ZoomAccountManager
            accounts={accounts}
            meetings={meetings}
            onRefresh={fetchData}
          />
        </div>
      )}

      {/* Detail Meeting Modal */}
      {selectedMeetingDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col border border-slate-100 max-h-[85vh] animate-fadeIn">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
              <div>
                <span className={`px-2.5 py-0.5 rounded-full font-semibold text-xs uppercase tracking-wider ${
                  selectedMeetingDetail.status === 'Completed'
                    ? 'bg-green-50 text-green-700'
                    : selectedMeetingDetail.status === 'Cancelled'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-blue-50 text-blue-700'
                }`}>
                  {selectedMeetingDetail.status === 'Completed' ? 'Selesai' : selectedMeetingDetail.status === 'Cancelled' ? 'Batal' : 'Terjadwal'}
                </span>
                <h4 className="text-lg font-bold text-slate-800 mt-1">{selectedMeetingDetail.kegiatan}</h4>
              </div>
              <button
                onClick={() => setSelectedMeetingDetail(null)}
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
              
              {/* Meeting Info Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold text-xs">TANGGAL & WAKTU</span>
                  <p className="font-bold text-slate-700">
                    {formatDateStr(selectedMeetingDetail.tanggal)} <br />
                    {selectedMeetingDetail.waktuMulai} - {selectedMeetingDetail.waktuSelesai}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold text-xs">AKUN ZOOM</span>
                  <p className="font-bold text-gov-700">
                    {selectedMeetingDetail.zoomAccount?.name || 'Belum Ditentukan'} <br />
                    <span className="text-xs text-slate-500 font-normal">
                      {selectedMeetingDetail.zoomAccount?.email || ''}
                    </span>
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold text-xs">LOKASI / TEMPAT</span>
                  <p className="font-bold text-slate-700 flex items-center gap-1">
                    <MapPin size={14} className="text-slate-400" />
                    {selectedMeetingDetail.lokasi}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold text-xs">UNIT KERJA & JENIS</span>
                  <p className="font-bold text-slate-700">
                    {selectedMeetingDetail.unitKerja} <br />
                    <span className="text-xs text-slate-500 font-normal">
                      Rapat {selectedMeetingDetail.jenisRapat}
                    </span>
                  </p>
                </div>
                <div className="col-span-2 space-y-1 border-t border-slate-150 pt-2.5">
                  <span className="text-slate-400 font-bold text-xs">OPERATOR / PENANGGUNG JAWAB</span>
                  <p className="font-bold text-slate-700 flex items-center gap-1.5">
                    <UserIcon size={14} className="text-slate-400" />
                    {selectedMeetingDetail.operatorIds && selectedMeetingDetail.operatorIds.length > 0
                      ? selectedMeetingDetail.operatorIds.map(id => usersMap[id] || 'Memuat...').join(', ')
                      : (selectedMeetingDetail.operatorId ? (usersMap[selectedMeetingDetail.operatorId] || 'Memuat...') : 'Belum Ditugaskan')}
                  </p>
                </div>
              </div>

              {/* Zoom Credentials Box */}
              {selectedMeetingDetail.zoomLink || selectedMeetingDetail.meetingId ? (
                <div className="bg-gradient-to-r from-gov-500/5 to-gov-600/5 p-4 rounded-xl border border-gov-500/10 space-y-3">
                  <h5 className="font-bold text-gov-800 flex items-center gap-1.5 text-sm">
                    <Video size={16} className="text-gov-600" />
                    Tautan & Kredensial Zoom
                  </h5>
                  
                  {selectedMeetingDetail.zoomLink && (
                    <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-lg border border-slate-150">
                      <span className="text-slate-600 font-medium truncate flex-1">{selectedMeetingDetail.zoomLink}</span>
                      <div className="flex items-center gap-1">
                        <a
                          href={selectedMeetingDetail.zoomLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-slate-500 hover:text-gov-600 hover:bg-slate-50 rounded"
                          title="Buka Link"
                        >
                          <ExternalLink size={16} />
                        </a>
                        <button
                          onClick={() => handleCopyToClipboard(selectedMeetingDetail.zoomLink!, 'link')}
                          className="p-1 text-slate-500 hover:text-gov-600 hover:bg-slate-50 rounded"
                          title="Salin Link"
                        >
                          {copiedId === 'link' ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {selectedMeetingDetail.meetingId && (
                      <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-slate-150">
                        <div>
                          <span className="text-xs text-slate-400 block font-semibold">MEETING ID</span>
                          <span className="font-bold text-slate-800">{selectedMeetingDetail.meetingId}</span>
                        </div>
                        <button
                          onClick={() => handleCopyToClipboard(selectedMeetingDetail.meetingId!, 'id')}
                          className="p-1 text-slate-500 hover:text-gov-600 rounded hover:bg-slate-50"
                        >
                          {copiedId === 'id' ? <Check size={16} className="text-green-600" /> : <Copy size={14} />}
                        </button>
                      </div>
                    )}

                    {selectedMeetingDetail.passcode && (
                      <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-slate-150">
                        <div>
                          <span className="text-xs text-slate-400 block font-semibold">PASSCODE</span>
                          <span className="font-bold text-slate-800">{selectedMeetingDetail.passcode}</span>
                        </div>
                        <button
                          onClick={() => handleCopyToClipboard(selectedMeetingDetail.passcode!, 'pass')}
                          className="p-1 text-slate-500 hover:text-gov-600 rounded hover:bg-slate-50"
                        >
                          {copiedId === 'pass' ? <Check size={16} className="text-green-600" /> : <Copy size={14} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-100 p-4 rounded-xl text-center text-slate-500 italic text-sm">
                  Tautan Zoom belum ditambahkan untuk jadwal ini.
                </div>
              )}

              {/* Original Undangan Text Collapse */}
              {selectedMeetingDetail.undanganText && (
                <div className="space-y-1.5">
                  <span className="text-slate-400 font-bold block uppercase tracking-wider text-xs">Teks Undangan Asli</span>
                  <pre className="bg-slate-900 text-slate-300 p-3 rounded-xl max-h-[150px] overflow-y-auto font-mono text-xs whitespace-pre-wrap leading-relaxed">
                    {selectedMeetingDetail.undanganText}
                  </pre>
                </div>
              )}

            </div>

            {/* Footer / Actions */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-2xl">
              {isDatinOrAdmin ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingMeeting(selectedMeetingDetail);
                      setSelectedMeetingDetail(null);
                      setIsAddModalOpen(true);
                    }}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-colors"
                  >
                    Edit Rapat
                  </button>
                  <button
                    onClick={() => handleDeleteMeeting(selectedMeetingDetail.id)}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl text-sm transition-colors"
                  >
                    Hapus
                  </button>
                </div>
              ) : (
                <div></div>
              )}

              <div className="flex gap-2">
                {selectedMeetingDetail.undanganText && (
                  <button
                    onClick={() => handleCopyToClipboard(selectedMeetingDetail.undanganText!, 'undangan')}
                    className="px-4 py-2 bg-gov-50 hover:bg-gov-100 text-gov-700 font-bold rounded-xl text-sm flex items-center gap-1.5 transition-colors"
                  >
                    {copiedId === 'undangan' ? (
                      <>
                        <Check size={14} className="text-green-600" />
                        Tersalin
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Salin Undangan
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setSelectedMeetingDetail(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-sm transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Add/Edit Schedule Modal */}
      <AddZoomScheduleModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddEditModal}
        onSave={handleSaveMeeting}
        initialData={editingMeeting}
      />

      {/* Import Schedule Modal */}
      <ImportZoomScheduleModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchData}
        currentUser={currentUser}
        showNotification={showNotification || (() => {})}
      />

      {/* Export to Excel Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 p-6 animate-fadeIn space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-600" size={20} />
                Ekspor Data Rapat ke Excel
              </h3>
              <button 
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-600">
              <p>Pilih rentang tanggal untuk laporan rapat dan grafik statistik yang ingin diekspor ke Excel.</p>
              
              {/* Date Presets */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const startOfWeek = new Date(now);
                    startOfWeek.setDate(now.getDate() - now.getDay());
                    setExportStartDate(startOfWeek.toISOString().split('T')[0]);
                    setExportEndDate(now.toISOString().split('T')[0]);
                  }}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Minggu Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    setExportStartDate(startOfMonth.toISOString().split('T')[0]);
                    setExportEndDate(now.toISOString().split('T')[0]);
                  }}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const startOfYear = new Date(now.getFullYear(), 0, 1);
                    setExportStartDate(startOfYear.toISOString().split('T')[0]);
                    setExportEndDate(now.toISOString().split('T')[0]);
                  }}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Tahun Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExportStartDate('1970-01-01');
                    setExportEndDate(new Date().toISOString().split('T')[0]);
                  }}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Semua Waktu
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700 text-xs uppercase tracking-wider">Mulai Tanggal</label>
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full text-sm bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700 text-xs uppercase tracking-wider">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="w-full text-sm bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteExport}
                className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/10 transition-colors flex items-center gap-1.5"
              >
                <FileSpreadsheet size={16} />
                Unduh Laporan Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Month Detail Modal */}
      {isMonthDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fadeIn" 
            onClick={() => setIsMonthDetailModalOpen(false)}
          />
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col z-10 overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Calendar size={18} className="text-gov-600" />
                  Daftar Rapat - {clickedMonthLabel}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {clickedChartType === 'unit' && 'Saringan berdasarkan Unit Kerja yang aktif pada bulan ini.'}
                  {clickedChartType === 'operator' && 'Saringan berdasarkan Petugas / Operator yang bertugas pada bulan ini.'}
                  {clickedChartType === 'status' && 'Saringan berdasarkan Status Penyelesaian rapat pada bulan ini.'}
                  {clickedChartType === 'jenis' && 'Saringan berdasarkan Jenis Rapat Zoom pada bulan ini.'}
                  {clickedChartType === 'account' && 'Saringan berdasarkan Akun Zoom yang digunakan pada bulan ini.'}
                </p>
              </div>
              <button
                onClick={() => setIsMonthDetailModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contextual Pills Filter */}
            <div className="flex gap-2 overflow-x-auto px-6 py-3 bg-slate-50/20 border-b border-slate-100 shrink-0 scrollbar-none">
              {filterOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setModalDynamicFilter(option.value)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                    modalDynamicFilter === option.value
                      ? 'bg-gov-600 border-gov-600 text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  {option.label} ({option.count})
                </button>
              ))}
            </div>
            
            {/* Table Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredModalMeetings.length === 0 ? (
                <div className="text-center py-12 text-slate-400 italic text-sm">Tidak ada data rapat pada saringan ini.</div>
              ) : (
                <div className="border border-slate-150 rounded-2xl overflow-x-auto shadow-2xs">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-150">
                        <th className="px-5 py-3">Tanggal & Waktu</th>
                        <th className="px-5 py-3">Nama Kegiatan</th>
                        <th className="px-5 py-3">Akun Zoom</th>
                        <th className="px-5 py-3">Operator</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredModalMeetings.map((m) => (
                        <tr
                          key={m.id}
                          onClick={() => {
                            setSelectedMeetingDetail(m);
                          }}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer text-xs"
                        >
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="font-bold text-slate-800">{formatDateStr(m.tanggal)}</div>
                            <div className="text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <Clock size={12} className="text-slate-400" />
                              {m.waktuMulai} - {m.waktuSelesai}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-800 max-w-xs truncate" title={m.kegiatan}>
                              {m.kegiatan}
                            </div>
                            <div className="text-slate-400 text-[10px] mt-0.5 flex items-center gap-1">
                              <Briefcase size={11} className="text-slate-400" /> {m.unitKerja} | {m.jenisRapat}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                            <span className="font-semibold text-gov-700 bg-gov-50 px-2 py-0.5 rounded border border-gov-100">
                              {m.zoomAccount?.name || 'Belum Diatur'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                            <span>
                              {m.operatorIds && m.operatorIds.length > 0
                                ? m.operatorIds.map(id => usersMap[id] || 'Memuat...').join(', ')
                                : (m.operatorId ? (usersMap[m.operatorId] || 'Memuat...') : 'Belum Ditugaskan')}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : m.status === 'Cancelled'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {m.status === 'Completed' ? 'Selesai' : m.status === 'Cancelled' ? 'Batal' : 'Terjadwal'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <span className="text-xs text-slate-400 font-semibold">Menampilkan {filteredModalMeetings.length} dari {clickedMonthMeetings.length} Rapat</span>
              <button
                type="button"
                onClick={() => setIsMonthDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PelayananZoomPage;
