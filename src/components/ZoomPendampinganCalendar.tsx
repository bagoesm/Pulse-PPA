// src/components/ZoomPendampinganCalendar.tsx
import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, Clock, 
  User as UserIcon, MapPin, Video, Search, Edit, Trash2, ExternalLink, Info, X, Check, Copy, Filter, AlertCircle
} from 'lucide-react';
import { ZoomMeeting, ZoomAccount } from '../../types';
import UserAvatar from './UserAvatar';

interface ZoomPendampinganCalendarProps {
  meetings: ZoomMeeting[];
  usersMap: Record<string, string>;
  usersPhotoMap?: Record<string, string>;
  accounts: ZoomAccount[];
  isDatinOrAdmin: boolean;
  onViewMeeting: (meeting: ZoomMeeting) => void;
  onEditMeeting: (meeting: ZoomMeeting) => void;
  onDeleteMeeting: (id: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; dotColor: string }> = {
  Scheduled: { label: 'Terjadwal', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-100', dotColor: 'bg-blue-500' },
  Completed: { label: 'Selesai', color: 'text-green-700', bgColor: 'bg-green-50 border-green-100', dotColor: 'bg-green-500' },
  Cancelled: { label: 'Batal', color: 'text-red-700', bgColor: 'bg-red-50 border-red-100', dotColor: 'bg-red-500' },
};

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
const DAYS_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Helper to format date to string YYYY-MM-DD
const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to parse date YYYY-MM-DD local
const parseDateLocal = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Format date to Indonesian format
const formatDateIndonesian = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = parseDateLocal(dateStr);
  return `${DAYS_FULL[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

// Format short date for timeline items
const formatDateShortIndonesian = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = parseDateLocal(dateStr);
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${date.getDate()} ${monthsShort[date.getMonth()]}`;
};

export const ZoomPendampinganCalendar: React.FC<ZoomPendampinganCalendarProps> = ({
  meetings,
  usersMap,
  usersPhotoMap = {},
  isDatinOrAdmin,
  onViewMeeting,
  onEditMeeting,
  onDeleteMeeting,
}) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'operator'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date()); // Default to today
  const [searchTerm, setSearchTerm] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Clickable Operator filter for the Fokus Operator sidebar
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);

  // Filter meetings specifically for "Pendampingan Zoom" and apply header filters
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      // 1. Must be Pendampingan Zoom type
      const isPendampingan = m.jenisRapat === 'Pendampingan Zoom';
      if (!isPendampingan) return false;

      // 2. Search query matches
      const matchesSearch = 
        m.kegiatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.unitKerja.toLowerCase().includes(searchTerm.toLowerCase());

      // 3. Header Operator filter matches
      let matchesOperator = true;
      if (operatorFilter !== 'All') {
        const assignedIds = m.operatorIds || (m.operatorId ? [m.operatorId] : []);
        matchesOperator = assignedIds.includes(operatorFilter);
      }

      // 4. Status filter matches
      const matchesStatus = statusFilter === 'All' || m.status === statusFilter;

      return matchesSearch && matchesOperator && matchesStatus;
    });
  }, [meetings, searchTerm, operatorFilter, statusFilter]);

  // Double-filter list of meetings when operator is selected interactively in the Fokus Operator view
  const operatorFilteredMeetings = useMemo(() => {
    if (!selectedOperatorId) return filteredMeetings;
    
    return filteredMeetings.filter((m) => {
      const assignedIds = m.operatorIds && m.operatorIds.length > 0
        ? m.operatorIds
        : (m.operatorId ? [m.operatorId] : []);
      
      if (selectedOperatorId === 'unassigned') {
        return assignedIds.length === 0;
      }
      return assignedIds.includes(selectedOperatorId);
    });
  }, [filteredMeetings, selectedOperatorId]);

  // Compute meetings for active month (pre-search/operator filters to get stable monthly counts)
  const activeMonthMeetingsAll = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const prefix = `${year}-${month}`;
    return meetings.filter(m => m.jenisRapat === 'Pendampingan Zoom' && m.tanggal.startsWith(prefix));
  }, [meetings, currentDate]);

  // Compute total monthly assignments count for each operator
  const operatorMonthlyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let unassignedCount = 0;

    activeMonthMeetingsAll.forEach((m) => {
      const opIds = m.operatorIds && m.operatorIds.length > 0
        ? m.operatorIds
        : (m.operatorId ? [m.operatorId] : []);

      if (opIds.length === 0) {
        unassignedCount++;
      } else {
        opIds.forEach((id) => {
          counts[id] = (counts[id] || 0) + 1;
        });
      }
    });

    const list = Object.keys(counts).map((id) => ({
      id,
      name: usersMap[id] || `ID: ${id}`,
      photo: usersPhotoMap[id],
      count: counts[id]
    }));

    list.sort((a, b) => b.count - a.count);

    return { list, unassignedCount };
  }, [activeMonthMeetingsAll, usersMap, usersPhotoMap]);

  // Extract unique operators actually assigned to Pendampingan Zoom for filter dropdown
  const availableOperators = useMemo(() => {
    const ids = new Set<string>();
    meetings.forEach((m) => {
      if (m.jenisRapat === 'Pendampingan Zoom') {
        const opIds = m.operatorIds || (m.operatorId ? [m.operatorId] : []);
        opIds.forEach(id => ids.add(id));
      }
    });

    return Array.from(ids)
      .map(id => ({ id, name: usersMap[id] || `ID: ${id}` }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [meetings, usersMap]);

  // Generate calendar days for the grid (42 cells to cover grid layouts)
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay(); // 0 = Sun, 1 = Mon ...
    const totalDays = lastDay.getDate();

    const days: { date: Date; isCurrentMonth: boolean; dayMeetings: ZoomMeeting[] }[] = [];

    // Fills previous month's ending days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({ date, isCurrentMonth: false, dayMeetings: [] });
    }

    // Fills current month's days
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      const dateStr = formatDateToString(date);
      const dayMtgs = filteredMeetings.filter(m => m.tanggal === dateStr);
      days.push({ date, isCurrentMonth: true, dayMeetings: dayMtgs });
    }

    // Fills next month's beginning days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false, dayMeetings: [] });
    }

    return days;
  }, [currentDate, filteredMeetings]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
    setSelectedDate(null);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate?.toDateString() === date.toDateString();
  };

  // Get meetings for the selected date
  const selectedDateMeetings = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = formatDateToString(selectedDate);
    return filteredMeetings
      .filter(m => m.tanggal === dateStr)
      .sort((a, b) => a.waktuMulai.localeCompare(b.waktuMulai));
  }, [selectedDate, filteredMeetings]);

  // All meetings in the active month (shown if no date selected)
  const activeMonthMeetings = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const prefix = `${year}-${month}`;
    return filteredMeetings
      .filter(m => m.tanggal.startsWith(prefix))
      .sort((a, b) => {
        const dateCompare = a.tanggal.localeCompare(b.tanggal);
        if (dateCompare !== 0) return dateCompare;
        return a.waktuMulai.localeCompare(b.waktuMulai);
      });
  }, [currentDate, filteredMeetings]);

  // Generate calendar data filtered for a specific operator (or unassigned category)
  const getOperatorCalendarData = (opId: string) => {
    return calendarData.map(day => {
      const dayOpMeetings = day.dayMeetings.filter(m => {
        const assignedIds = m.operatorIds && m.operatorIds.length > 0
          ? m.operatorIds
          : (m.operatorId ? [m.operatorId] : []);
        
        if (opId === 'unassigned') {
          return assignedIds.length === 0;
        }
        return assignedIds.includes(opId);
      });
      return {
        ...day,
        dayMeetings: dayOpMeetings
      };
    });
  };

  const handleCopyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Sleek, flat calendar timeline item representation for Zoom card details with larger text size
  const renderCompactMeetingCard = (m: ZoomMeeting) => {
    const statusVal = m.status || 'Scheduled';
    const cfg = STATUS_CONFIG[statusVal] || STATUS_CONFIG.Scheduled;
    
    return (
      <div 
        key={m.id}
        onClick={() => onViewMeeting(m)}
        className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 px-2.5 rounded-xl transition-all cursor-pointer group relative"
      >
        {/* Left Side: Time info */}
        <div className="flex flex-col shrink-0 min-w-[75px] pt-0.5">
          <span className="text-xs font-extrabold text-slate-800 leading-tight">
            {m.waktuMulai}
          </span>
          <span className="text-[10px] font-bold text-slate-400 leading-tight">
            s.d. {m.waktuSelesai}
          </span>
          {!selectedDate && (
            <span className="text-[10.5px] font-extrabold text-gov-600 uppercase mt-0.5">
              {m.tanggal.substring(8, 10)} {MONTHS[parseInt(m.tanggal.substring(5, 7)) - 1].substring(0, 3)}
            </span>
          )}
        </div>

        {/* Status indicator line dot */}
        <div className="flex flex-col items-center self-stretch shrink-0 pt-1.5">
          <div className={`w-2.5 h-2.5 rounded-full ${cfg.dotColor} shrink-0 ring-4 ring-white shadow-3xs`} />
          <div className="w-0.5 flex-1 bg-slate-100 my-1 group-last:hidden" />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Title */}
          <h5 className="font-bold text-slate-800 text-sm leading-snug group-hover:text-gov-700 transition-colors truncate" title={m.kegiatan}>
            {m.kegiatan}
          </h5>

          {/* Badges / Meta Info Row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="bg-slate-100 text-slate-655 px-2 py-0.5 rounded text-[9.5px] font-extrabold uppercase truncate max-w-[90px]" title={m.unitKerja}>
              {m.unitKerja}
            </span>
            <span className="bg-gov-50 text-gov-700 border border-gov-100/40 px-2 py-0.5 rounded text-[9.5px] font-extrabold truncate max-w-[120px]" title={m.zoomAccount?.name || 'Zoom belum diset'}>
              {m.zoomAccount?.name || 'Zoom belum diset'}
            </span>
            
            {/* Direct Zoom Link if exists */}
            {m.zoomLink && (
              <a
                href={m.zoomLink}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()} // Prevent trigger select row
                className="flex items-center gap-0.5 text-gov-600 hover:text-gov-800 text-[9px] font-extrabold bg-gov-50 hover:bg-gov-100/50 border border-gov-200/50 px-1.5 py-0.5 rounded-md transition-colors"
                title="Buka Link Zoom"
              >
                <ExternalLink size={9} />
                Zoom
              </a>
            )}
          </div>
        </div>

        {/* Right Side: Avatar Stack and Hover Actions */}
        <div className="flex flex-col items-end gap-1.5 shrink-0 pl-1">
          {/* Overlapping operator avatar bubble stack */}
          <div className="flex -space-x-1.5 items-center">
            {m.operatorIds && m.operatorIds.length > 0 ? (
              m.operatorIds.map(id => (
                <div key={id} className="relative group/avatar" title={usersMap[id] || 'Operator'}>
                  <UserAvatar 
                    name={usersMap[id] || 'Operator'} 
                    profilePhoto={usersPhotoMap[id]} 
                    size="xs" 
                    className="ring-1.5 ring-white shadow-3xs" 
                  />
                </div>
              ))
            ) : m.operatorId ? (
              <div className="relative group/avatar" title={usersMap[m.operatorId] || 'Operator'}>
                <UserAvatar 
                  name={usersMap[m.operatorId] || 'Operator'} 
                  profilePhoto={usersPhotoMap[m.operatorId]} 
                  size="xs" 
                  className="ring-1.5 ring-white shadow-3xs" 
                />
              </div>
            ) : (
              <span className="text-[8.5px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100/40">Belum Ditugaskan</span>
            )}
          </div>

          {/* Action icons on hover */}
          <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewMeeting(m);
              }}
              className="p-0.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
              title="Detail"
            >
              <Info size={12} />
            </button>
            {isDatinOrAdmin && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditMeeting(m);
                  }}
                  className="p-0.5 text-blue-500 hover:text-blue-700 rounded hover:bg-blue-50 transition-colors"
                  title="Edit"
                >
                  <Edit size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteMeeting(m.id);
                  }}
                  className="p-0.5 text-red-500 hover:text-red-750 rounded hover:bg-red-555 transition-colors"
                  title="Hapus"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters & View Mode Toggle Row */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
        {/* Toggle Mode and Section Title */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <h4 className="font-bold text-slate-800 text-sm sm:text-base">Filter & Tampilan Pendampingan</h4>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => {
                setViewMode('calendar');
                setSelectedOperatorId(null);
              }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white text-gov-600 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-850'
              }`}
            >
              <Calendar size={14} />
              Fokus Kalender
            </button>
            <button
              onClick={() => {
                setViewMode('operator');
                setSelectedDate(null); // Clear selected date to show full month overview initially
              }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'operator'
                  ? 'bg-white text-gov-600 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-850'
              }`}
            >
              <UserIcon size={14} />
              Fokus Operator
            </button>
          </div>
        </div>

        {/* Search & Filter Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Keyword Search */}
          <div className="md:col-span-2 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cari Rapat Pendampingan</span>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari kegiatan atau unit kerja..."
                className="w-full text-sm bg-slate-50 text-slate-800 placeholder-slate-400 pl-11 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-500 focus:border-gov-500 h-[38px]"
              />
            </div>
          </div>

          {/* Filter Operator */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Operator Bertugas</span>
            <select
              value={operatorFilter}
              onChange={(e) => setOperatorFilter(e.target.value)}
              className="w-full text-sm bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-500 font-semibold cursor-pointer h-[38px]"
            >
              <option value="All">Semua Operator</option>
              {availableOperators.map((op) => (
                <option key={op.id} value={op.id}>{op.name}</option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Status Rapat</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-sm bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-500 font-semibold cursor-pointer h-[38px]"
            >
              <option value="All">Semua Status</option>
              <option value="Scheduled">Terjadwal</option>
              <option value="Completed">Selesai</option>
              <option value="Cancelled">Batal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area based on View Mode */}
      {viewMode === 'calendar' ? (
        /* 1. FOCUS CALENDAR VIEW (2 Columns: Grid lg:col-span-3, Sidebar lg:col-span-1) */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start animate-fadeIn">
          {/* Left Side: Calendar Grid (Col Span 3) */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Calendar Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigateMonth('prev')} 
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 bg-white"
                >
                  <ChevronLeft size={16} className="text-slate-600" />
                </button>
                <h3 className="text-lg font-bold text-slate-800 min-w-[140px] text-center capitalize">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <button 
                  onClick={() => navigateMonth('next')} 
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 bg-white"
                >
                  <ChevronRight size={16} className="text-slate-600" />
                </button>
              </div>
              
              <button 
                onClick={goToToday} 
                className="px-4 py-1.5 text-xs font-bold text-gov-600 hover:bg-gov-50 bg-white border border-gov-100 rounded-xl transition-all shadow-2xs"
              >
                Hari Ini
              </button>
            </div>

            <div className="p-4">
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 mb-2 border-b border-slate-100 pb-2">
                {DAYS.map((day, idx) => (
                  <div 
                    key={day} 
                    className={`text-center text-xs font-bold uppercase tracking-wider py-1 ${
                      idx === 0 ? 'text-red-500' : 'text-slate-400'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Cells */}
              <div className="grid grid-cols-7 gap-1">
                {calendarData.map((day, idx) => {
                  const isDaySelected = isSelected(day.date);
                  const isDayToday = isToday(day.date);

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        const isAlreadySelected = selectedDate?.toDateString() === day.date.toDateString();
                        setSelectedDate(isAlreadySelected ? null : day.date);
                      }}
                      disabled={!day.isCurrentMonth}
                      className={`min-h-[72px] sm:min-h-[96px] p-2 rounded-xl border transition-all text-left flex flex-col justify-between group ${
                        day.isCurrentMonth 
                          ? 'bg-white border-slate-100 hover:border-slate-300' 
                          : 'bg-slate-50/50 border-transparent text-slate-300 pointer-events-none'
                      } ${
                        isDaySelected 
                          ? 'ring-2 ring-gov-500 border-gov-500 bg-gov-50/20' 
                          : ''
                      } ${
                        isDayToday 
                          ? 'bg-gov-50/50 border-gov-100' 
                          : ''
                      }`}
                    >
                      {/* Day Number */}
                      <div className="flex items-center justify-between">
                        <span className={`text-xs sm:text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          isDayToday ? 'bg-gov-600 text-white shadow-xs' : isDaySelected ? 'text-gov-700 bg-gov-100' : day.isCurrentMonth ? 'text-slate-700' : 'text-slate-300'
                        }`}>
                          {day.date.getDate()}
                        </span>
                      </div>

                      {/* Fills details or count badge */}
                      <div className="mt-2 w-full space-y-1">
                        {day.dayMeetings.slice(0, 2).map((meeting) => {
                          const statusVal = meeting.status || 'Scheduled';
                          const cfg = STATUS_CONFIG[statusVal] || STATUS_CONFIG.Scheduled;
                          
                          return (
                            <div 
                              key={meeting.id}
                              className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md border truncate font-medium flex items-center gap-1 ${cfg.bgColor} ${cfg.color}`}
                              title={`${meeting.waktuMulai} - ${meeting.kegiatan}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor} shrink-0`} />
                              <span className="truncate">{meeting.waktuMulai} {meeting.unitKerja}</span>
                            </div>
                          );
                        })}

                        {day.dayMeetings.length > 2 && (
                          <div className="text-[9px] text-slate-400 font-bold px-1 flex items-center justify-center bg-slate-50 rounded py-0.5 border border-slate-150">
                            +{day.dayMeetings.length - 2} lagi
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Side: Detailed Schedule List (Col Span 1) */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm h-[450px] lg:h-[700px] flex flex-col justify-between overflow-hidden">
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                <h4 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <Calendar size={18} className="text-gov-600" />
                  <span>Jadwal Rapat Zoom</span>
                </h4>
                {selectedDate && (
                  <button 
                    onClick={() => setSelectedDate(null)}
                    className="text-xs text-slate-400 hover:text-slate-655 flex items-center gap-1 hover:underline"
                  >
                    <X size={12} />
                    Reset
                  </button>
                )}
              </div>

              <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide mt-3 mb-2 shrink-0">
                {selectedDate 
                  ? `Tanggal: ${formatDateIndonesian(formatDateToString(selectedDate))}`
                  : `Menampilkan semua pendampingan bulan ini`}
              </div>

              <div className="space-y-1.5 overflow-y-auto pr-1 flex-1 scrollbar-thin">
                {selectedDateMeetings.length === 0 && selectedDate ? (
                  <div className="text-center py-10 text-slate-400">
                    <Info size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-semibold">Tidak ada jadwal pendampingan.</p>
                  </div>
                ) : (
                  (selectedDate ? selectedDateMeetings : activeMonthMeetings).map((m) => renderCompactMeetingCard(m))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 2. FOCUS OPERATOR VIEW (3-Column Layout: Grid lg:col-span-2, Operators lg:col-span-1, Zoom details lg:col-span-1) */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start animate-fadeIn">
          {/* Left: Monthly Calendar Grid (Col Span 2) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Calendar Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigateMonth('prev')} 
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 bg-white"
                >
                  <ChevronLeft size={16} className="text-slate-600" />
                </button>
                <h3 className="text-lg font-bold text-slate-800 min-w-[140px] text-center capitalize">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <button 
                  onClick={() => navigateMonth('next')} 
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 bg-white"
                >
                  <ChevronRight size={16} className="text-slate-600" />
                </button>
              </div>
              
              <button 
                onClick={goToToday} 
                className="px-4 py-1.5 text-xs font-bold text-gov-600 hover:bg-gov-50 bg-white border border-gov-100 rounded-xl transition-all shadow-2xs"
              >
                Hari Ini
              </button>
            </div>

            <div className="p-4">
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 mb-2 border-b border-slate-100 pb-2">
                {DAYS.map((day, idx) => (
                  <div 
                    key={day} 
                    className={`text-center text-xs font-bold uppercase tracking-wider py-1 ${
                      idx === 0 ? 'text-red-500' : 'text-slate-400'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Cells with Operator Photos */}
              <div className="grid grid-cols-7 gap-1">
                {calendarData.map((day, idx) => {
                  const isDaySelected = isSelected(day.date);
                  const isDayToday = isToday(day.date);
                  
                  // Filter day meetings based on global filters + active operator selected filter
                  const dayMeetings = operatorFilteredMeetings.filter(m => m.tanggal === formatDateToString(day.date));
                  
                  // Extract unique operators assigned on this day
                  const dayOperators = new Set<string>();
                  let hasUnassigned = false;
                  dayMeetings.forEach(m => {
                    const opIds = m.operatorIds && m.operatorIds.length > 0
                      ? m.operatorIds
                      : (m.operatorId ? [m.operatorId] : []);
                    if (opIds.length === 0) hasUnassigned = true;
                    else opIds.forEach(id => dayOperators.add(id));
                  });
                  const dayOpIds = Array.from(dayOperators);

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        const isAlreadySelected = selectedDate?.toDateString() === day.date.toDateString();
                        setSelectedDate(isAlreadySelected ? null : day.date);
                      }}
                      disabled={!day.isCurrentMonth}
                      className={`min-h-[76px] sm:min-h-[96px] p-1.5 sm:p-2 rounded-xl border transition-all text-left flex flex-col justify-between group ${
                        day.isCurrentMonth 
                          ? 'bg-white border-slate-100 hover:border-slate-300' 
                          : 'bg-slate-50/50 border-transparent text-slate-300 pointer-events-none'
                      } ${
                        isDaySelected 
                          ? 'ring-2 ring-gov-500 border-gov-500 bg-gov-50/20' 
                          : ''
                      } ${
                        isDayToday 
                          ? 'bg-gov-50/50 border-gov-100' 
                          : ''
                      }`}
                    >
                      {/* Day Number */}
                      <div className="flex items-center justify-between">
                        <span className={`text-xs sm:text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          isDayToday 
                            ? 'bg-gov-600 text-white shadow-xs' 
                            : isDaySelected
                              ? 'text-gov-700 bg-gov-100'
                              : day.isCurrentMonth
                                ? 'text-slate-700'
                                : 'text-slate-300'
                        }`}>
                          {day.date.getDate()}
                        </span>
                      </div>

                      {/* Display Operator Avatars inside the date cell */}
                      <div className="mt-1.5 w-full flex flex-wrap gap-0.5 sm:gap-1 items-center">
                        {dayOpIds.slice(0, 3).map(id => (
                          <div key={id} className="relative" title={usersMap[id] || 'Operator'}>
                            <UserAvatar 
                              name={usersMap[id] || 'Operator'} 
                              profilePhoto={usersPhotoMap[id]} 
                              size="xs" 
                              className="border border-white shadow-3xs" 
                            />
                          </div>
                        ))}
                        {dayOpIds.length > 3 && (
                          <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-extrabold text-slate-500 shadow-3xs">
                            +{dayOpIds.length - 3}
                          </div>
                        )}
                        {hasUnassigned && (
                          <div className="relative" title="Butuh Operator">
                            <AlertCircle size={16} className="text-amber-500 bg-amber-50 rounded-full border border-amber-100 p-0.5" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center Column: Operator task counts list (Col Span 1) */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm h-[450px] lg:h-[700px] flex flex-col justify-between overflow-hidden">
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                <h4 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <UserIcon size={18} className="text-gov-600" />
                  <span>Jadwal Tugas Operator</span>
                </h4>
                {selectedOperatorId && (
                  <button 
                    onClick={() => setSelectedOperatorId(null)}
                    className="text-xs text-slate-400 hover:text-slate-655 flex items-center gap-1 hover:underline"
                  >
                    <X size={12} />
                    Reset
                  </button>
                )}
              </div>

              <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide mt-3 mb-2 shrink-0">
                Bulan berjalan: {MONTHS[currentDate.getMonth()]}
              </div>

              <div className="space-y-2 overflow-y-auto pr-1 flex-1 scrollbar-thin">
                {/* Operator Rows */}
                {operatorMonthlyCounts.list.map((op) => {
                  const isActive = selectedOperatorId === op.id;
                  return (
                    <button
                      key={op.id}
                      onClick={() => setSelectedOperatorId(isActive ? null : op.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                        isActive 
                          ? 'bg-gov-50 border-gov-200 text-gov-700 shadow-3xs' 
                          : 'bg-slate-50/50 border-slate-150 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar name={op.name} profilePhoto={op.photo} size="sm" />
                        <span className="font-bold text-xs sm:text-sm truncate">{op.name}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-lg font-extrabold whitespace-nowrap ${
                        isActive ? 'bg-gov-600 text-white' : 'bg-slate-100 border border-slate-200 text-slate-600'
                      }`}>
                        {op.count} Rapat
                      </span>
                    </button>
                  );
                })}

                {/* Unassigned row */}
                {operatorMonthlyCounts.unassignedCount > 0 && (
                  <button
                    onClick={() => setSelectedOperatorId(selectedOperatorId === 'unassigned' ? null : 'unassigned')}
                    className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                      selectedOperatorId === 'unassigned'
                        ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-3xs'
                        : 'bg-amber-50/30 border-amber-100 text-amber-700 hover:bg-amber-50/60 hover:border-amber-250'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                        <AlertCircle size={14} />
                      </div>
                      <span className="font-bold text-xs sm:text-sm truncate">Belum Ditugaskan</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-lg font-extrabold whitespace-nowrap ${
                      selectedOperatorId === 'unassigned' ? 'bg-amber-600 text-white' : 'bg-amber-100 border border-amber-200 text-amber-700'
                    }`}>
                      {operatorMonthlyCounts.unassignedCount} Rapat
                    </span>
                  </button>
                )}

                {operatorMonthlyCounts.list.length === 0 && operatorMonthlyCounts.unassignedCount === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                    Tidak ada penugasan bulan ini.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Zoom Schedule List (Col Span 1) */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm h-[450px] lg:h-[700px] flex flex-col justify-between overflow-hidden">
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                <h4 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <Calendar size={18} className="text-gov-600" />
                  <span>Detail Rapat Zoom</span>
                </h4>
                {(selectedDate || selectedOperatorId) && (
                  <button 
                    onClick={() => {
                      setSelectedDate(null);
                      setSelectedOperatorId(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-655 flex items-center gap-1 hover:underline"
                  >
                    <X size={12} />
                    Reset Semua
                  </button>
                )}
              </div>

              <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide mt-3 mb-2 shrink-0">
                {selectedDate 
                  ? `Tanggal: ${formatDateIndonesian(formatDateToString(selectedDate))}`
                  : selectedOperatorId
                    ? `Operator: ${selectedOperatorId === 'unassigned' ? 'Belum Ditugaskan' : (usersMap[selectedOperatorId] || 'Memuat...')}`
                    : `Menampilkan semua pendampingan bulan ini`}
              </div>

              <div className="space-y-1.5 overflow-y-auto pr-1 flex-1 scrollbar-thin">
                {(() => {
                  let displayList = activeMonthMeetings; // Default to current month meetings
                  
                  if (selectedDate) {
                    const dateStr = formatDateToString(selectedDate);
                    displayList = operatorFilteredMeetings.filter(m => m.tanggal === dateStr);
                  } else if (selectedOperatorId) {
                    displayList = operatorFilteredMeetings.filter(m => {
                      const year = currentDate.getFullYear();
                      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                      return m.tanggal.startsWith(`${year}-${month}`);
                    });
                  }

                  if (displayList.length === 0) {
                    return (
                      <div className="text-center py-10 text-slate-400">
                        <Info size={28} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs font-semibold">Tidak ada jadwal pendampingan.</p>
                      </div>
                    );
                  }

                  return displayList.map((m) => renderCompactMeetingCard(m));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZoomPendampinganCalendar;
