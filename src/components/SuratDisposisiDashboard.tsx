// src/components/SuratDisposisiDashboard.tsx
// Comprehensive statistics dashboard for Surat Agenda, Disposisi, and Kegiatan
import React, { useState, useMemo } from 'react';
import {
  FileText, ClipboardList, CheckCircle2, AlertTriangle, Clock,
  Calendar, Inbox, Send, Building2, TrendingUp, RefreshCw, BarChart2,
  Video, Laptop, Users, CheckSquare, Layers
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { useSurats } from '../contexts/SuratsContext';
import { useDisposisi } from '../contexts/DisposisiContext';
import { useUsers } from '../contexts/UsersContext';
import { useDivision } from '../contexts/DivisionContext';
import { useMasterData } from '../contexts/MasterDataContext';
import { useMeetings } from '../contexts/MeetingsContext';
import { useVisibilityFilter } from '../hooks/useVisibilityFilter';
import { User } from '../../types';
import DivisionFilter from './DivisionFilter';

interface SuratDisposisiDashboardProps {
  currentUser: User | null;
  showNotification?: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const formatIndonesianDate = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const SuratDisposisiDashboard: React.FC<SuratDisposisiDashboardProps> = ({ currentUser }) => {
  const { surats, isSuratsLoading, fetchSurats } = useSurats();
  const { disposisi, isLoading: isDisposisiLoading, fetchDisposisi } = useDisposisi();
  const { meetings, isMeetingsLoading, fetchMeetings } = useMeetings();
  const { allUsers } = useUsers();
  const { isUserIdInSelectedDivisi, selectedDivisi, shouldShowByDivisi } = useDivision();
  const { unitInternalList } = useMasterData();

  // Satker visibility filter
  const { accessibleSatkerIds, satkerIdToNameMap, loading: satkerLoading } = useVisibilityFilter(currentUser?.id);

  // Tabs: 'persuratan' | 'disposisi' | 'kegiatan'
  const [activeSubTab, setActiveSubTab] = useState<'persuratan' | 'disposisi' | 'kegiatan'>('persuratan');

  // Local filter states
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Date Preset Helpers
  const setDatePreset = (preset: 'all' | 'today' | 'week' | 'month' | 'year') => {
    const formatDate = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const today = new Date();
    
    switch (preset) {
      case 'today':
        setStartDate(formatDate(today));
        setEndDate(formatDate(today));
        break;
      case 'week': {
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); // start on Monday
        const startOfWeek = new Date(today.setDate(diff));
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        setStartDate(formatDate(startOfWeek));
        setEndDate(formatDate(endOfWeek));
        break;
      }
      case 'month': {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        setStartDate(formatDate(firstDay));
        setEndDate(formatDate(lastDay));
        break;
      }
      case 'year': {
        const firstDay = new Date(today.getFullYear(), 0, 1);
        const lastDay = new Date(today.getFullYear(), 11, 31);
        setStartDate(formatDate(firstDay));
        setEndDate(formatDate(lastDay));
        break;
      }
      case 'all':
      default:
        setStartDate('');
        setEndDate('');
        break;
    }
  };

  const isPresetActive = (preset: 'today' | 'week' | 'month' | 'year'): boolean => {
    const formatDate = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const today = new Date();

    switch (preset) {
      case 'today':
        return startDate === formatDate(today) && endDate === formatDate(today);
      case 'week': {
        const temp = new Date(today);
        const day = temp.getDay();
        const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(temp.setDate(diff));
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return startDate === formatDate(startOfWeek) && endDate === formatDate(endOfWeek);
      }
      case 'month': {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return startDate === formatDate(firstDay) && endDate === formatDate(lastDay);
      }
      case 'year': {
        const firstDay = new Date(today.getFullYear(), 0, 1);
        const lastDay = new Date(today.getFullYear(), 11, 31);
        return startDate === formatDate(firstDay) && endDate === formatDate(lastDay);
      }
      default:
        return false;
    }
  };

  // Manual refresh logic
  const handleRefresh = async () => {
    await Promise.all([fetchSurats(), fetchDisposisi(), fetchMeetings()]);
  };

  // 1. Filter Surat by Satker Visibility
  const satkerFilteredSurats = useMemo(() => {
    if (satkerLoading) return [];
    if (currentUser?.role === 'Super Admin') return surats;
    if (accessibleSatkerIds.length === 0) return [];
    
    const currentUserDivisi = currentUser?.divisi;
    if (!currentUserDivisi) return [];
    
    const accessibleDivisiNames = Object.values(satkerIdToNameMap);
    const usersInAccessibleDivisi = allUsers.filter(u => u.divisi && accessibleDivisiNames.includes(u.divisi));
    const accessibleUserIds = usersInAccessibleDivisi.map(u => u.id);
    const accessibleUserNames = usersInAccessibleDivisi.map(u => u.name);

    return surats.filter(surat =>
      accessibleUserIds.includes(surat.createdBy) || accessibleUserNames.includes(surat.createdBy)
    );
  }, [surats, accessibleSatkerIds, satkerIdToNameMap, allUsers, currentUser, satkerLoading]);

  // 2. Filter Disposisi by Satker Visibility
  const satkerFilteredDisposisi = useMemo(() => {
    if (accessibleSatkerIds.length === 0) return disposisi;
    const currentUserDivisi = currentUser?.divisi;
    if (!currentUserDivisi) return [];
    
    const usersInSameSatker = allUsers
      .filter(u => u.divisi === currentUserDivisi)
      .map(u => u.id);

    return disposisi.filter(d =>
      usersInSameSatker.includes(d.createdBy) || usersInSameSatker.includes(d.assignedTo)
    );
  }, [disposisi, accessibleSatkerIds, allUsers, currentUser]);

  // 3. Filter by Selected Divisi (Global Dropdown)
  const divisionFilteredSurats = useMemo(() => {
    return satkerFilteredSurats.filter(surat => isUserIdInSelectedDivisi(surat.createdBy));
  }, [satkerFilteredSurats, isUserIdInSelectedDivisi]);

  const divisionFilteredDisposisi = useMemo(() => {
    return selectedDivisi === 'All'
      ? satkerFilteredDisposisi
      : satkerFilteredDisposisi.filter(d => isUserIdInSelectedDivisi(d.assignedTo) || isUserIdInSelectedDivisi(d.createdBy));
  }, [satkerFilteredDisposisi, selectedDivisi, isUserIdInSelectedDivisi]);

  const divisionFilteredMeetings = useMemo(() => {
    return selectedDivisi === 'All'
      ? meetings
      : meetings.filter(m => shouldShowByDivisi(m.createdBy, m.pic || []));
  }, [meetings, selectedDivisi, shouldShowByDivisi]);

  // 4. Filter by local Date Range
  const finalFilteredSurats = useMemo(() => {
    return divisionFilteredSurats.filter(surat => {
      if (!surat.tanggalSurat) return false;
      const date = new Date(surat.tanggalSurat);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (date < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (date > end) return false;
      }
      return true;
    });
  }, [divisionFilteredSurats, startDate, endDate]);

  const finalFilteredDisposisi = useMemo(() => {
    return divisionFilteredDisposisi.filter(d => {
      if (!d.createdAt) return false;
      const date = new Date(d.createdAt);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (date < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (date > end) return false;
      }
      return true;
    });
  }, [divisionFilteredDisposisi, startDate, endDate]);

  const finalFilteredMeetings = useMemo(() => {
    return divisionFilteredMeetings.filter(m => {
      if (!m.date) return false;
      const date = new Date(m.date);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (date < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (date > end) return false;
      }
      return true;
    });
  }, [divisionFilteredMeetings, startDate, endDate]);

  // Calculations for Summary Cards
  const stats = useMemo(() => {
    const totalSurat = finalFilteredSurats.length;
    const suratMasuk = finalFilteredSurats.filter(s => s.jenisSurat === 'Masuk').length;
    const suratKeluar = finalFilteredSurats.filter(s => s.jenisSurat === 'Keluar').length;

    const totalDisposisi = finalFilteredDisposisi.length;
    const disposisiCompleted = finalFilteredDisposisi.filter(d => d.status === 'Completed').length;
    const disposisiActive = finalFilteredDisposisi.filter(d => d.status === 'Pending' || d.status === 'In Progress').length;
    const completionRate = totalDisposisi > 0 ? Math.round((disposisiCompleted / totalDisposisi) * 100) : 0;

    const today = new Date();
    const overdueDisposisi = finalFilteredDisposisi.filter(d => {
      if (d.status === 'Completed' || d.status === 'Cancelled' || !d.deadline) return false;
      return new Date(d.deadline) < today;
    }).length;

    const totalKegiatan = finalFilteredMeetings.length;
    const kegiatanCompleted = finalFilteredMeetings.filter(m => m.status === 'completed').length;
    const kegiatanScheduled = finalFilteredMeetings.filter(m => m.status === 'scheduled' || m.status === 'ongoing').length;
    const kegiatanOnline = finalFilteredMeetings.filter(m => m.isOnline).length;
    const onlineRate = totalKegiatan > 0 ? Math.round((kegiatanOnline / totalKegiatan) * 100) : 0;

    return {
      totalSurat,
      suratMasuk,
      suratKeluar,
      totalDisposisi,
      disposisiCompleted,
      disposisiActive,
      completionRate,
      overdueDisposisi,
      totalKegiatan,
      kegiatanCompleted,
      kegiatanScheduled,
      kegiatanOnline,
      onlineRate
    };
  }, [finalFilteredSurats, finalFilteredDisposisi, finalFilteredMeetings]);

  // Chart Data 1: Tren Surat Masuk vs Keluar (Monthly)
  const trendData = useMemo(() => {
    const monthsMap: Record<string, { month: string; masuk: number; keluar: number; sortKey: string }> = {};

    if (!startDate && !endDate) {
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = d.toLocaleString('id-ID', { month: 'short', year: '2-digit' });
        const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthsMap[sortKey] = { month: monthLabel, masuk: 0, keluar: 0, sortKey };
      }
    }

    finalFilteredSurats.forEach(s => {
      if (!s.tanggalSurat) return;
      const d = new Date(s.tanggalSurat);
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('id-ID', { month: 'short', year: '2-digit' });

      if (!monthsMap[sortKey]) {
        monthsMap[sortKey] = { month: monthLabel, masuk: 0, keluar: 0, sortKey };
      }

      if (s.jenisSurat === 'Masuk') {
        monthsMap[sortKey].masuk += 1;
      } else {
        monthsMap[sortKey].keluar += 1;
      }
    });

    return Object.values(monthsMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [finalFilteredSurats, startDate, endDate]);

  // Chart Data 2: Status Disposisi
  const disposisiStatusData = useMemo(() => {
    const counts = { Pending: 0, 'In Progress': 0, Completed: 0, Cancelled: 0 };
    finalFilteredDisposisi.forEach(d => {
      if (counts[d.status] !== undefined) {
        counts[d.status] += 1;
      }
    });
    return [
      { name: 'Pending', value: counts.Pending, color: '#f59e0b' },
      { name: 'In Progress', value: counts['In Progress'], color: '#3b82f6' },
      { name: 'Selesai', value: counts.Completed, color: '#10b981' },
      { name: 'Dibatalkan', value: counts.Cancelled, color: '#94a3b8' }
    ].filter(item => item.value > 0);
  }, [finalFilteredDisposisi]);

  // Chart Data 3: Sumber Surat Masuk (Internal vs Eksternal)
  const incomingSourceData = useMemo(() => {
    let internal = 0;
    let eksternal = 0;
    const incomingSurats = finalFilteredSurats.filter(s => s.jenisSurat === 'Masuk');

    incomingSurats.forEach(s => {
      if (s.asalSurat && unitInternalList.includes(s.asalSurat)) {
        internal += 1;
      } else {
        eksternal += 1;
      }
    });

    return [
      { name: 'Internal Satker', value: internal, color: '#3b82f6' },
      { name: 'Eksternal KemenPPPA', value: eksternal, color: '#8b5cf6' }
    ].filter(item => item.value > 0);
  }, [finalFilteredSurats, unitInternalList]);

  // Chart Data 4: Tujuan Surat Keluar (Internal vs Eksternal vs Campuran)
  const outgoingDestinationData = useMemo(() => {
    let internal = 0;
    let eksternal = 0;
    let campuran = 0;
    const outgoingSurats = finalFilteredSurats.filter(s => s.jenisSurat === 'Keluar');

    outgoingSurats.forEach(s => {
      if (s.tujuanSuratList && s.tujuanSuratList.length > 0) {
        const hasInternal = s.tujuanSuratList.some(t => t.type === 'Internal');
        const hasEksternal = s.tujuanSuratList.some(t => t.type === 'Eksternal');

        if (hasInternal && hasEksternal) {
          campuran += 1;
        } else if (hasInternal) {
          internal += 1;
        } else {
          eksternal += 1;
        }
      } else if (s.tujuanSurat) {
        const isInternal = unitInternalList.some(unit => s.tujuanSurat?.includes(unit));
        if (isInternal) {
          internal += 1;
        } else {
          eksternal += 1;
        }
      } else {
        eksternal += 1; // Default fallback
      }
    });

    return [
      { name: 'Tujuan Internal', value: internal, color: '#10b981' },
      { name: 'Tujuan Eksternal', value: eksternal, color: '#f59e0b' },
      { name: 'Campuran', value: campuran, color: '#ec4899' }
    ].filter(item => item.value > 0);
  }, [finalFilteredSurats, unitInternalList]);

  // Chart Data 5: Distribusi Jenis Naskah
  const jenisNaskahData = useMemo(() => {
    const counts: Record<string, number> = {};
    finalFilteredSurats.forEach(s => {
      if (s.jenisNaskah) {
        counts[s.jenisNaskah] = (counts[s.jenisNaskah] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7); // top 7 types
  }, [finalFilteredSurats]);

  // Chart Data 6: Beban Kerja Disposisi per PIC (Top 8)
  const picWorkloadData = useMemo(() => {
    const workload: Record<string, { name: string; completed: number; active: number; total: number }> = {};

    finalFilteredDisposisi.forEach(d => {
      const picName = allUsers.find(u => u.id === d.assignedTo)?.name || 'Unknown';
      if (!workload[d.assignedTo]) {
        workload[d.assignedTo] = { name: picName, completed: 0, active: 0, total: 0 };
      }
      workload[d.assignedTo].total += 1;
      if (d.status === 'Completed') {
        workload[d.assignedTo].completed += 1;
      } else {
        workload[d.assignedTo].active += 1;
      }
    });

    return Object.values(workload)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [finalFilteredDisposisi, allUsers]);

  // Urgent Dispositions watch table
  const urgentDisposisiList = useMemo(() => {
    const today = new Date();
    const alertThreshold = new Date();
    alertThreshold.setDate(today.getDate() + 3);

    return finalFilteredDisposisi
      .filter(d => {
        if (d.status === 'Completed' || d.status === 'Cancelled' || !d.deadline) return false;
        const dl = new Date(d.deadline);
        return dl < alertThreshold;
      })
      .map(d => {
        const picUser = allUsers.find(u => u.id === d.assignedTo);
        const isOverdue = new Date(d.deadline!) < today;
        return {
          id: d.id,
          text: d.disposisiText,
          picName: picUser?.name || 'Unknown',
          deadline: d.deadline!,
          status: d.status,
          isOverdue,
          suratNo: surats.find(s => s.id === d.suratId)?.nomorSurat || '-'
        };
      })
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5);
  }, [finalFilteredDisposisi, allUsers, surats]);

  // --- KEGIATAN STATS ---

  // Chart Data 7: Tren Jumlah Kegiatan (Monthly)
  const meetingTrendData = useMemo(() => {
    const monthsMap: Record<string, { month: string; internal: number; external: number; bimtek: number; audiensi: number; total: number; sortKey: string }> = {};

    if (!startDate && !endDate) {
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = d.toLocaleString('id-ID', { month: 'short', year: '2-digit' });
        const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthsMap[sortKey] = { month: monthLabel, internal: 0, external: 0, bimtek: 0, audiensi: 0, total: 0, sortKey };
      }
    }

    finalFilteredMeetings.forEach(m => {
      if (!m.date) return;
      const d = new Date(m.date);
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('id-ID', { month: 'short', year: '2-digit' });

      if (!monthsMap[sortKey]) {
        monthsMap[sortKey] = { month: monthLabel, internal: 0, external: 0, bimtek: 0, audiensi: 0, total: 0, sortKey };
      }

      monthsMap[sortKey].total += 1;
      if (m.type === 'internal') monthsMap[sortKey].internal += 1;
      else if (m.type === 'external') monthsMap[sortKey].external += 1;
      else if (m.type === 'bimtek') monthsMap[sortKey].bimtek += 1;
      else if (m.type === 'audiensi') monthsMap[sortKey].audiensi += 1;
    });

    return Object.values(monthsMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [finalFilteredMeetings, startDate, endDate]);

  // Chart Data 8: Distribusi Tipe Rapat
  const meetingTypeDistribution = useMemo(() => {
    const counts = { internal: 0, external: 0, bimtek: 0, audiensi: 0 };
    finalFilteredMeetings.forEach(m => {
      if (counts[m.type] !== undefined) {
        counts[m.type] += 1;
      }
    });

    return [
      { name: 'Internal', value: counts.internal, color: '#3b82f6' },
      { name: 'External', value: counts.external, color: '#ef4444' },
      { name: 'Bimtek', value: counts.bimtek, color: '#10b981' },
      { name: 'Audiensi', value: counts.audiensi, color: '#f59e0b' }
    ].filter(item => item.value > 0);
  }, [finalFilteredMeetings]);

  // Chart Data 9: Rapat Online vs Offline
  const meetingFormatData = useMemo(() => {
    let online = 0;
    let offline = 0;
    finalFilteredMeetings.forEach(m => {
      if (m.isOnline) online += 1;
      else offline += 1;
    });

    return [
      { name: 'Online (Zoom/Virtual)', value: online, color: '#0ea5e9' },
      { name: 'Offline (Tatap Muka)', value: offline, color: '#64748b' }
    ].filter(item => item.value > 0);
  }, [finalFilteredMeetings]);

  // Chart Data 10: Keaktifan PIC dalam Kegiatan (Top 8)
  const picMeetingActivityData = useMemo(() => {
    const counts: Record<string, number> = {};
    finalFilteredMeetings.forEach(m => {
      (m.pic || []).forEach(picId => {
        const name = allUsers.find(u => u.id === picId)?.name || picId;
        counts[name] = (counts[name] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [finalFilteredMeetings, allUsers]);

  // Upcoming meetings watch table
  const upcomingMeetingsList = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return finalFilteredMeetings
      .filter(m => m.date >= todayStr && m.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5)
      .map(m => {
        const pics = (m.pic || []).map(picId => allUsers.find(u => u.id === picId)?.name || picId);
        return {
          id: m.id,
          title: m.title,
          date: m.date,
          time: `${m.startTime} - ${m.endTime}`,
          location: m.location,
          isOnline: m.isOnline,
          pics: pics.join(', ') || '-',
          type: m.type
        };
      });
  }, [finalFilteredMeetings, allUsers]);

  const isLoading = isSuratsLoading || isDisposisiLoading || isMeetingsLoading || satkerLoading;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
      {/* Title & Global controls Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-gov-600" />
              Dashboard Statistik
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-1">
              Monitoring persuratan masuk/keluar, keaktifan disposisi, serta agenda kegiatan Satker.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Division Filter Integration */}
            <DivisionFilter />

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center justify-center border border-slate-200/50"
              title="Segarkan Data"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="mt-5 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-slate-700 text-sm font-medium">
              <Calendar size={16} className="text-slate-400" />
              <span>Rentang Tanggal:</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-400 outline-none text-slate-700"
              />
              <span className="text-slate-400 text-xs">sampai</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-400 outline-none text-slate-700"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => setDatePreset('all')}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50"
                >
                  Hapus
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/50">
              <button
                onClick={() => setDatePreset('today')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  isPresetActive('today') ? 'bg-white text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => setDatePreset('week')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  isPresetActive('week') ? 'bg-white text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Minggu Ini
              </button>
              <button
                onClick={() => setDatePreset('month')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  isPresetActive('month') ? 'bg-white text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Bulan Ini
              </button>
              <button
                onClick={() => setDatePreset('year')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  isPresetActive('year') ? 'bg-white text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tahun Ini
              </button>
            </div>
          </div>

          {/* Sub-tabs buttons */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setActiveSubTab('persuratan')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'persuratan' ? 'bg-white text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText size={14} />
              Persuratan
            </button>
            <button
              onClick={() => setActiveSubTab('disposisi')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'disposisi' ? 'bg-white text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ClipboardList size={14} />
              Disposisi
            </button>
            <button
              onClick={() => setActiveSubTab('kegiatan')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'kegiatan' ? 'bg-white text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar size={14} />
              Kegiatan
            </button>
          </div>
        </div>
      </div>

      {/* RENDER PERSURATAN TAB */}
      {activeSubTab === 'persuratan' && (
        <div className="space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gov-50/40 rounded-bl-full -z-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform"></div>
              <div className="p-3 bg-gov-100/80 text-gov-700 rounded-lg">
                <FileText size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Surat Agenda</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.totalSurat}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 font-medium">
                  <span className="flex items-center gap-1"><Inbox size={12} className="text-blue-500" /> {stats.suratMasuk} Masuk</span>
                  <span className="flex items-center gap-1"><Send size={12} className="text-emerald-500" /> {stats.suratKeluar} Keluar</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/40 rounded-bl-full -z-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform"></div>
              <div className="p-3 bg-blue-100/80 text-blue-700 rounded-lg">
                <Inbox size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Surat Masuk</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.suratMasuk}</h3>
                <p className="text-xs text-slate-500 mt-1.5 font-medium">
                  Persentase Masuk: {stats.totalSurat > 0 ? Math.round(stats.suratMasuk / stats.totalSurat * 100) : 0}%
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/40 rounded-bl-full -z-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform"></div>
              <div className="p-3 bg-emerald-100/80 text-emerald-700 rounded-lg">
                <Send size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Surat Keluar</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.suratKeluar}</h3>
                <p className="text-xs text-slate-500 mt-1.5 font-medium">
                  Persentase Keluar: {stats.totalSurat > 0 ? Math.round(stats.suratKeluar / stats.totalSurat * 100) : 0}%
                </p>
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm lg:col-span-2">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart2 size={16} className="text-gov-600" />
                Tren Volume Surat Masuk vs Keluar
              </h3>
              <div className="h-72">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        labelClassName="font-semibold text-slate-700"
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                      <Area type="monotone" name="Surat Masuk" dataKey="masuk" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorMasuk)" />
                      <Area type="monotone" name="Surat Keluar" dataKey="keluar" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorKeluar)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <FileText size={40} className="stroke-1 mb-2" />
                    <span className="text-sm">Tidak ada data untuk ditampilkan</span>
                  </div>
                )}
              </div>
            </div>

            {/* Top Naskah types */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                <FileText size={16} className="text-gov-600" />
                Jenis Naskah Terbanyak
              </h3>
              <p className="text-xs text-slate-400 mb-4">Top 7 jenis naskah surat masuk/keluar.</p>
              <div className="h-72">
                {jenisNaskahData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={jenisNaskahData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={100} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16}>
                        {jenisNaskahData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <FileText size={40} className="stroke-1 mb-2" />
                    <span className="text-sm">Tidak ada data jenis naskah</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Internal vs External Classification */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Incoming Source */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Inbox size={16} className="text-gov-600" />
                Sumber Surat Masuk (Internal vs Eksternal)
              </h3>
              <p className="text-xs text-slate-400 mb-4">Klasifikasi asal pengirim surat masuk.</p>
              <div className="h-64 flex flex-col justify-center items-center">
                {incomingSourceData.length > 0 ? (
                  <>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={incomingSourceData}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {incomingSourceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} Surat`, 'Jumlah']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex gap-6 mt-4 text-xs font-semibold">
                      {incomingSourceData.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: item.color }}></div>
                          <span className="text-slate-600">{item.name}: {item.value} ({Math.round(item.value / stats.suratMasuk * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Inbox size={40} className="stroke-1 mb-2" />
                    <span className="text-sm">Tidak ada surat masuk terfilter</span>
                  </div>
                )}
              </div>
            </div>

            {/* Outgoing Destination */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Send size={16} className="text-gov-600" />
                Tujuan Surat Keluar (Internal vs Eksternal)
              </h3>
              <p className="text-xs text-slate-400 mb-4">Klasifikasi penerima surat keluar.</p>
              <div className="h-64 flex flex-col justify-center items-center">
                {outgoingDestinationData.length > 0 ? (
                  <>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={outgoingDestinationData}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {outgoingDestinationData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} Surat`, 'Jumlah']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs font-semibold">
                      {outgoingDestinationData.map((item, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: item.color }}></div>
                          <span className="text-slate-600">{item.name}: {item.value} ({Math.round(item.value / stats.suratKeluar * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Send size={40} className="stroke-1 mb-2" />
                    <span className="text-sm">Tidak ada surat keluar terfilter</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER DISPOSISI TAB */}
      {activeSubTab === 'disposisi' && (
        <div className="space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gov-50/40 rounded-bl-full -z-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform"></div>
              <div className="p-3 bg-gov-100/80 text-gov-700 rounded-lg">
                <ClipboardList size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Disposisi</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.totalDisposisi}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 font-medium">
                  <span className="flex items-center gap-1"><Clock size={12} className="text-amber-500" /> {stats.disposisiActive} Aktif</span>
                  <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> {stats.disposisiCompleted} Selesai</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/40 rounded-bl-full -z-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform"></div>
              <div className="p-3 bg-emerald-100/80 text-emerald-700 rounded-lg">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Penyelesaian Disposisi</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.completionRate}%</h3>
                <div className="w-24 bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.completionRate}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className={`p-5 rounded-xl border shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow relative overflow-hidden group ${
              stats.overdueDisposisi > 0 ? 'bg-red-50/30 border-red-200' : 'bg-white border-slate-200/80'
            }`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-50/40 rounded-bl-full -z-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform"></div>
              <div className={`p-3 rounded-lg ${stats.overdueDisposisi > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Disposisi Overdue</p>
                <h3 className={`text-2xl font-bold mt-1 ${stats.overdueDisposisi > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                  {stats.overdueDisposisi}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 font-medium">Melewati batas tenggat waktu</p>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* PIC workload bar chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm lg:col-span-2">
              <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Building2 size={16} className="text-gov-600" />
                Beban Kerja Disposisi per PIC
              </h3>
              <p className="text-xs text-slate-400 mb-4">Jumlah disposisi total dan selesai untuk 8 PIC tersibuk.</p>
              <div className="h-72">
                {picWorkloadData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={picWorkloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickFormatter={(name) => name.split(' ')[0]} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                      <Bar name="Belum Selesai" dataKey="active" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                      <Bar name="Selesai" dataKey="completed" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Building2 size={40} className="stroke-1 mb-2" />
                    <span className="text-sm">Tidak ada data penugasan PIC</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status breakdown pie chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ClipboardList size={16} className="text-gov-600" />
                Status Disposisi
              </h3>
              <div className="h-72 flex flex-col justify-center items-center">
                {disposisiStatusData.length > 0 ? (
                  <>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={disposisiStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {disposisiStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} Disposisi`, 'Jumlah']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-xs font-medium w-full px-4">
                      {disposisiStatusData.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-slate-600 truncate">{item.name} ({item.value})</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <ClipboardList size={40} className="stroke-1 mb-2" />
                    <span className="text-sm">Tidak ada disposisi aktif</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Urgent watch table */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              Pengawasan Disposisi Mendesak (Mendekati / Melewati Tenggat)
            </h3>
            
            {urgentDisposisiList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold text-xs uppercase tracking-wider bg-slate-50/50">
                      <th className="py-3 px-4">No. Surat</th>
                      <th className="py-3 px-4">Instruksi Disposisi</th>
                      <th className="py-3 px-4">PIC Ditugaskan</th>
                      <th className="py-3 px-4">Batas Waktu</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {urgentDisposisiList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-800 text-xs">{item.suratNo}</td>
                        <td className="py-3.5 px-4 max-w-xs truncate text-xs" title={item.text}>
                          {item.text}
                        </td>
                        <td className="py-3.5 px-4 text-xs">{item.picName}</td>
                        <td className="py-3.5 px-4 text-xs font-semibold">
                          <span className={`inline-flex items-center gap-1 ${item.isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                            <Calendar size={12} />
                            {formatIndonesianDate(item.deadline)}
                            {item.isOverdue && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-normal ml-1">Terlewat</span>}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.status === 'In Progress'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-sm">
                <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2 stroke-1" />
                <span>Semua disposisi aman, tidak ada tugas mendesak/terlewat saat ini.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RENDER KEGIATAN TAB */}
      {activeSubTab === 'kegiatan' && (
        <div className="space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gov-50/40 rounded-bl-full -z-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform"></div>
              <div className="p-3 bg-gov-100/80 text-gov-700 rounded-lg">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Kegiatan</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.totalKegiatan}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 font-medium">
                  <span className="flex items-center gap-1"><CheckSquare size={12} className="text-green-500" /> {stats.kegiatanCompleted} Selesai</span>
                  <span className="flex items-center gap-1"><Clock size={12} className="text-blue-500" /> {stats.kegiatanScheduled} Terjadwal</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/40 rounded-bl-full -z-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform"></div>
              <div className="p-3 bg-blue-100/80 text-blue-700 rounded-lg">
                <Video size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kegiatan Online (Virtual)</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.kegiatanOnline}</h3>
                <div className="w-24 bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.onlineRate}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">{stats.onlineRate}% rapat via Zoom/Virtual</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/40 rounded-bl-full -z-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform"></div>
              <div className="p-3 bg-emerald-100/80 text-emerald-700 rounded-lg">
                <Laptop size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kegiatan Offline (Tatap Muka)</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.totalKegiatan - stats.kegiatanOnline}</h3>
                <p className="text-xs text-slate-500 mt-1.5 font-medium">
                  Rapat fisik: {stats.totalKegiatan > 0 ? Math.round((stats.totalKegiatan - stats.kegiatanOnline) / stats.totalKegiatan * 100) : 0}%
                </p>
              </div>
            </div>
          </div>

          {/* Monthly Activity Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm lg:col-span-2">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart2 size={16} className="text-gov-600" />
                Tren Jumlah Kegiatan Rapat
              </h3>
              <div className="h-72">
                {meetingTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={meetingTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                      <Line type="monotone" name="Internal" dataKey="internal" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" name="External" dataKey="external" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" name="Bimtek" dataKey="bimtek" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" name="Audiensi" dataKey="audiensi" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Calendar size={40} className="stroke-1 mb-2" />
                    <span className="text-sm">Tidak ada data tren kegiatan</span>
                  </div>
                )}
              </div>
            </div>

            {/* Meeting Format Distribution */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Laptop size={16} className="text-gov-600" />
                Format Pertemuan
              </h3>
              <div className="h-72 flex flex-col justify-center items-center">
                {meetingFormatData.length > 0 ? (
                  <>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={meetingFormatData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {meetingFormatData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} Kegiatan`, 'Jumlah']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2 mt-4 text-xs font-semibold w-full px-4">
                      {meetingFormatData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: item.color }}></div>
                            <span className="text-slate-600">{item.name}</span>
                          </div>
                          <span className="text-slate-800 font-bold">{item.value} ({stats.totalKegiatan > 0 ? Math.round(item.value / stats.totalKegiatan * 100) : 0}%)</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Laptop size={40} className="stroke-1 mb-2" />
                    <span className="text-sm">Tidak ada data format kegiatan</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Meeting Types & Busy PICs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Meeting Type Pie chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Layers size={16} className="text-gov-600" />
                Distribusi Tipe Kegiatan
              </h3>
              <div className="h-64 flex flex-col justify-center items-center">
                {meetingTypeDistribution.length > 0 ? (
                  <>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={meetingTypeDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={0}
                            outerRadius={65}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {meetingTypeDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} Rapat`, 'Jumlah']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs font-semibold">
                      {meetingTypeDistribution.map((item, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                          <span className="text-slate-600 uppercase tracking-wide text-[10px]">{item.name}: {item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Layers size={40} className="stroke-1 mb-2" />
                    <span className="text-sm">Tidak ada data tipe kegiatan</span>
                  </div>
                )}
              </div>
            </div>

            {/* Busy PICs for Meetings */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Users size={16} className="text-gov-600" />
                Keaktifan PIC dalam Kegiatan
              </h3>
              <p className="text-xs text-slate-400 mb-4">Jumlah kegiatan yang ditangani oleh 8 PIC teraktif.</p>
              <div className="h-64">
                {picMeetingActivityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={picMeetingActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickFormatter={(name) => name.split(' ')[0]} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar name="Jumlah Kegiatan" dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Users size={40} className="stroke-1 mb-2" />
                    <span className="text-sm">Tidak ada PIC yang ditugaskan</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming Meetings Watch List */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-gov-600" />
              Agenda Kegiatan Terdekat (Mendatang)
            </h3>
            
            {upcomingMeetingsList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold text-xs uppercase tracking-wider bg-slate-50/50">
                      <th className="py-3 px-4">Nama Kegiatan</th>
                      <th className="py-3 px-4">Tanggal & Waktu</th>
                      <th className="py-3 px-4">Lokasi / Format</th>
                      <th className="py-3 px-4">PIC Panitia</th>
                      <th className="py-3 px-4">Tipe Rapat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {upcomingMeetingsList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-800 text-xs max-w-xs truncate" title={item.title}>
                          {item.title}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <div className="font-semibold text-slate-700">{formatIndonesianDate(item.date)}</div>
                          <div className="text-slate-400 mt-0.5">{item.time}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <span className={`inline-flex items-center gap-1 font-medium ${item.isOnline ? 'text-blue-600' : 'text-slate-600'}`}>
                            {item.isOnline ? <Video size={12} /> : <Laptop size={12} />}
                            {item.location || (item.isOnline ? 'Virtual Zoom' : 'Fisik')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xxs truncate" title={item.pics}>
                          {item.pics}
                        </td>
                        <td className="py-3.5 px-4 text-xs capitalize">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xxs font-bold ${
                            item.type === 'internal' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            item.type === 'external' ? 'bg-red-50 text-red-700 border border-red-200' :
                            item.type === 'bimtek' ? 'bg-green-50 text-green-700 border border-green-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {item.type}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-sm">
                <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2 stroke-1" />
                <span>Belum ada agenda kegiatan mendatang terdaftar.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuratDisposisiDashboard;
