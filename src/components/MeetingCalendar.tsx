// src/components/MeetingCalendar.tsx
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Video,
  FileText,
  Building2,
  GraduationCap,
  Briefcase,
  List,
  Grid3X3,
  Filter,
  Search,
  X,
  Users,
  Loader2,
  ChevronUp,
  ClipboardList
} from 'lucide-react';
import { Meeting, MeetingType, User, ProjectDefinition } from '../../types';

interface MeetingCalendarProps {
  meetings: Meeting[];
  users: User[];
  projects: ProjectDefinition[];
  currentUser: User | null;
  onAddMeeting: () => void;
  onViewMeeting: (meeting: Meeting) => void;
}

const MEETING_TYPE_CONFIG: Record<MeetingType, { label: string; shortLabel: string; color: string; bgColor: string; icon: React.ElementType }> = {
  internal: { label: 'Internal Kementerian', shortLabel: 'Internal', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Users },
  external: { label: 'Eksternal Kementerian', shortLabel: 'Eksternal', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Building2 },
  bimtek: { label: 'Bimtek', shortLabel: 'Bimtek', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: GraduationCap },
  audiensi: { label: 'Audiensi', shortLabel: 'Audiensi', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: Briefcase },
};

type MeetingStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

const STATUS_CONFIG: Record<MeetingStatus, { label: string; color: string; bgColor: string; borderColor: string }> = {
  scheduled: { label: 'Terjadwal', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  ongoing: { label: 'Berlangsung', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  completed: { label: 'Selesai', color: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' },
  cancelled: { label: 'Dibatalkan', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
};

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAYS_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const ITEMS_PER_PAGE = 10;

// Parse date string (YYYY-MM-DD) without timezone conversion
const parseDateLocal = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Format date to Indonesian locale without timezone issues
const formatDateIndonesian = (dateStr: string): string => {
  const date = parseDateLocal(dateStr);
  return `${DAYS_FULL[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
};

// Format date short for mobile
const formatDateShort = (dateStr: string): string => {
  const date = parseDateLocal(dateStr);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
};

// Format Date object to YYYY-MM-DD string in local timezone
const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const MeetingCalendar: React.FC<MeetingCalendarProps> = ({
  meetings,
  projects,
  onAddMeeting,
  onViewMeeting,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [filterType, setFilterType] = useState<MeetingType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<MeetingStatus | 'all'>('all');
  const [filterPic, setFilterPic] = useState<string>('all');
  const [filterDisposisi, setFilterDisposisi] = useState<'all' | 'with' | 'without'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Lazy loading state for list view
  const [visiblePastCount, setVisiblePastCount] = useState(ITEMS_PER_PAGE);
  const [visibleFutureCount, setVisibleFutureCount] = useState(ITEMS_PER_PAGE);
  const [loadingMore, setLoadingMore] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const todayMarkerRef = useRef<HTMLDivElement>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get unique PICs from meetings
  const uniquePics = useMemo(() => {
    const picSet = new Set<string>();
    meetings.forEach(m => {
      (m.pic || []).forEach(pic => picSet.add(pic));
    });
    return Array.from(picSet).sort();
  }, [meetings]);

  // Active filter count
  const activeFilterCount = (filterType !== 'all' ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0) + (filterPic !== 'all' ? 1 : 0) + (filterDisposisi !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0);

  // Filter meetings
  const filteredMeetings = useMemo(() => {
    let filtered = meetings;

    if (filterType !== 'all') {
      filtered = filtered.filter(m => m.type === filterType);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(m => m.status === filterStatus);
    }

    if (filterPic !== 'all') {
      filtered = filtered.filter(m => (m.pic || []).includes(filterPic));
    }

    if (filterDisposisi === 'with') {
      filtered = filtered.filter(m => m.hasDisposisi === true);
    } else if (filterDisposisi === 'without') {
      filtered = filtered.filter(m => !m.hasDisposisi);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(query) ||
        m.inviter?.name?.toLowerCase().includes(query) ||
        m.location?.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query) ||
        (m.pic || []).some(p => p.toLowerCase().includes(query)) ||
        (m.invitees || []).some(i => i.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [meetings, filterType, filterStatus, filterPic, filterDisposisi, searchQuery]);

  // Get calendar data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: { date: Date; isCurrentMonth: boolean; meetings: Meeting[] }[] = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({ date, isCurrentMonth: false, meetings: [] });
    }

    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      const dateStr = formatDateToString(date);
      const dayMeetings = filteredMeetings.filter(m => {
        if (m.endDate) {
          /**
           * Multi-day Check:
           * The meeting is shown if current calendar date (dateStr) is between start (m.date) and end (m.endDate) inclusive.
           */
          return dateStr >= m.date && dateStr <= m.endDate;
        }
        return m.date === dateStr;
      });
      days.push({ date, isCurrentMonth: true, meetings: dayMeetings });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false, meetings: [] });
    }

    return days;
  }, [currentDate, filteredMeetings]);

  // Split meetings into past and future for list view
  const { pastMeetings, futureMeetings, todayMeetings } = useMemo(() => {
    const today = formatDateToString(new Date());
    const sorted = filteredMeetings.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

    return {
      pastMeetings: sorted.filter(m => m.date < today).reverse(), // Most recent past first
      todayMeetings: sorted.filter(m => {
        if (m.endDate) {
          return today >= m.date && today <= m.endDate;
        }
        return m.date === today;
      }),
      futureMeetings: sorted.filter(m => m.date > today)
    };
  }, [filteredMeetings]);

  // Visible meetings with lazy loading
  const visiblePastMeetings = pastMeetings.slice(0, visiblePastCount);
  const visibleFutureMeetings = futureMeetings.slice(0, visibleFutureCount);
  const hasMorePast = pastMeetings.length > visiblePastCount;
  const hasMoreFuture = futureMeetings.length > visibleFutureCount;

  // Load more past meetings
  const loadMorePast = useCallback(() => {
    if (loadingMore || !hasMorePast) return;
    setLoadingMore(true);
    setTimeout(() => {
      setVisiblePastCount(prev => prev + ITEMS_PER_PAGE);
      setLoadingMore(false);
    }, 300);
  }, [loadingMore, hasMorePast]);

  // Load more future meetings
  const loadMoreFuture = useCallback(() => {
    if (loadingMore || !hasMoreFuture) return;
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleFutureCount(prev => prev + ITEMS_PER_PAGE);
      setLoadingMore(false);
    }, 300);
  }, [loadingMore, hasMoreFuture]);

  // Scroll to today marker when switching to list view
  useEffect(() => {
    if (viewMode === 'list' && todayMarkerRef.current && listContainerRef.current) {
      setTimeout(() => {
        todayMarkerRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
      }, 100);
    }
  }, [viewMode]);

  // Infinite scroll handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    // Load more past when scrolling to top
    if (scrollTop < 100 && hasMorePast && !loadingMore) {
      loadMorePast();
    }

    // Load more future when scrolling to bottom
    if (scrollHeight - scrollTop - clientHeight < 100 && hasMoreFuture && !loadingMore) {
      loadMoreFuture();
    }
  }, [hasMorePast, hasMoreFuture, loadingMore, loadMorePast, loadMoreFuture]);

  // Get meetings for selected date (calendar view)
  const displayMeetings = useMemo(() => {
    if (selectedDate) {
      const dateStr = formatDateToString(selectedDate);
      return filteredMeetings.filter(m => {
        if (m.endDate) {
          return dateStr >= m.date && dateStr <= m.endDate;
        }
        return m.date === dateStr;
      });
    }
    return [];
  }, [filteredMeetings, selectedDate]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate?.toDateString() === date.toDateString();
  };

  const getProject = (projectId?: string) => projects.find(p => p.id === projectId);

  // Get Disposisi status color
  const getDisposisiStatusColor = (status?: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Mixed':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const clearFilters = () => {
    setFilterType('all');
    setFilterStatus('all');
    setFilterPic('all');
    setFilterDisposisi('all');
    setSearchQuery('');
  };

  // Render meeting card
  const renderMeetingCard = (meeting: Meeting, showDate: boolean = true) => {
    const typeConfig = MEETING_TYPE_CONFIG[meeting.type];
    const statusConfig = STATUS_CONFIG[meeting.status];
    const TypeIcon = typeConfig.icon;
    const project = getProject(meeting.projectId);

    return (
      <div
        key={meeting.id}
        onClick={() => onViewMeeting(meeting)}
        className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${statusConfig.bgColor} ${statusConfig.borderColor}`}
      >
        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
          <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${typeConfig.bgColor} ${typeConfig.color}`}>
            <TypeIcon size={10} className="sm:w-3 sm:h-3" />
            <span className="sm:hidden">{typeConfig.shortLabel}</span>
            <span className="hidden sm:inline">{typeConfig.label}</span>
          </span>
          <div className="flex items-center gap-1.5">
            {meeting.hasDisposisi && meeting.disposisiCount && meeting.disposisiCount > 0 && (
              <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border ${getDisposisiStatusColor(meeting.disposisiStatus)}`} title={`Disposisi: ${meeting.disposisiStatus || 'Unknown'}`}>
                <ClipboardList size={10} className="sm:w-3 sm:h-3" />
                <span>{meeting.disposisiCount}</span>
              </span>
            )}
            <span className={`text-[10px] sm:text-xs font-medium ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>
        <h4 className="font-semibold text-sm sm:text-base text-slate-800 mb-1.5 sm:mb-2 line-clamp-2">{meeting.title}</h4>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-600">
          {showDate && (
            <div className="flex items-center gap-1">
              <Calendar size={12} className="sm:w-3.5 sm:h-3.5" />
              <span className="sm:hidden">{formatDateShort(meeting.date)}</span>
              <span className="hidden sm:inline">{formatDateIndonesian(meeting.date)}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock size={12} className="sm:w-3.5 sm:h-3.5" />
            <span>{meeting.startTime?.slice(0, 5)} - {meeting.endTime?.slice(0, 5)}</span>
          </div>
          <div className="flex items-center gap-1 min-w-0">
            {meeting.isOnline ? <Video size={12} className="sm:w-3.5 sm:h-3.5 flex-shrink-0" /> : <MapPin size={12} className="sm:w-3.5 sm:h-3.5 flex-shrink-0" />}
            <span className="truncate max-w-[80px] sm:max-w-[150px]" title={meeting.isOnline ? 'Online' : meeting.location}>{meeting.isOnline ? 'Online' : meeting.location}</span>
          </div>
        </div>
        <div className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
          {project && <div className="flex items-center gap-1"><Briefcase size={12} /><span>{project.name}</span></div>}
          <div className="flex items-center gap-1"><Building2 size={12} /><span>Dari: {meeting.inviter.name}</span></div>
        </div>
        {(meeting.suratUndangan || meeting.suratTugas || meeting.laporan) && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-200/50">
            <FileText size={10} className="sm:w-3 sm:h-3 text-slate-400" />
            <span className="text-[10px] sm:text-xs text-slate-500">
              {[meeting.suratUndangan && 'Undangan', meeting.suratTugas && 'ST', meeting.laporan && 'Laporan'].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
        {meeting.hasDisposisi && meeting.disposisiStatus && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-200/50">
            <ClipboardList size={10} className="sm:w-3 sm:h-3 text-slate-400" />
            <span className="text-[10px] sm:text-xs text-slate-500">
              Disposisi: <span className="font-medium">{meeting.disposisiStatus}</span>
              {meeting.disposisiCount && meeting.disposisiCount > 1 && ` (${meeting.disposisiCount} assignee)`}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="hidden sm:block">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="text-gov-600" size={24} />
              Jadwal Kegiatan
            </h1>
            <p className="text-sm text-slate-500 mt-1">Rapat, Audiensi, dan Bimtek</p>
          </div>
          <div className="sm:hidden flex items-center gap-2">
            <Calendar className="text-gov-600" size={20} />
            <h1 className="text-lg font-bold text-slate-800">Jadwal</h1>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="flex bg-slate-100 p-0.5 sm:p-1 rounded-lg">
              <button onClick={() => setViewMode('calendar')} className={`p-1.5 sm:p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-gov-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <Grid3X3 size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 sm:p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-gov-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <List size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            </div>

            <button onClick={() => setShowFilters(!showFilters)} className={`sm:hidden relative p-2 rounded-lg border transition-colors ${activeFilterCount > 0 ? 'bg-gov-50 border-gov-200 text-gov-600' : 'bg-white border-slate-200 text-slate-600'}`}>
              <Filter size={16} />
              {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-gov-600 text-white text-[10px] rounded-full flex items-center justify-center">{activeFilterCount}</span>}
            </button>

            <div className="hidden sm:flex relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari jadwal..." className="pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:border-gov-400 focus:ring-1 focus:ring-gov-400 outline-none w-[180px]" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded"><X size={14} className="text-slate-400" /></button>}
            </div>

            <select value={filterType} onChange={(e) => setFilterType(e.target.value as MeetingType | 'all')} className="hidden sm:block px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:border-gov-400 focus:ring-1 focus:ring-gov-400 outline-none">
              <option value="all">Semua Jenis</option>
              <option value="internal">Internal</option>
              <option value="external">Eksternal</option>
              <option value="audiensi">Audiensi</option>
              <option value="bimtek">Bimtek</option>
            </select>

            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as MeetingStatus | 'all')} className="hidden sm:block px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:border-gov-400 focus:ring-1 focus:ring-gov-400 outline-none">
              <option value="all">Semua Status</option>
              <option value="scheduled">Terjadwal</option>
              <option value="ongoing">Berlangsung</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>

            <select value={filterPic} onChange={(e) => setFilterPic(e.target.value)} className="hidden sm:block px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:border-gov-400 focus:ring-1 focus:ring-gov-400 outline-none max-w-[150px]">
              <option value="all">Semua PIC</option>
              {uniquePics.map(pic => <option key={pic} value={pic}>{pic}</option>)}
            </select>

            <select value={filterDisposisi} onChange={(e) => setFilterDisposisi(e.target.value as 'all' | 'with' | 'without')} className="hidden sm:block px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:border-gov-400 focus:ring-1 focus:ring-gov-400 outline-none">
              <option value="all">Semua Disposisi</option>
              <option value="with">Dengan Disposisi</option>
              <option value="without">Tanpa Disposisi</option>
            </select>

            <button onClick={onAddMeeting} className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors font-medium text-sm">
              <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Tambah</span>
            </button>
          </div>
        </div>

        {/* Mobile Filter Panel */}
        {showFilters && (
          <div className="sm:hidden mt-3 pt-3 border-t border-slate-100 space-y-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari jadwal..." className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5"><X size={14} className="text-slate-400" /></button>}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Filter</span>
              {activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-gov-600 font-medium">Reset</button>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={filterType} onChange={(e) => setFilterType(e.target.value as MeetingType | 'all')} className="px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-600">
                <option value="all">Semua Jenis</option>
                <option value="internal">Internal</option>
                <option value="external">Eksternal</option>
                <option value="audiensi">Audiensi</option>
                <option value="bimtek">Bimtek</option>
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as MeetingStatus | 'all')} className="px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-600">
                <option value="all">Semua Status</option>
                <option value="scheduled">Terjadwal</option>
                <option value="ongoing">Berlangsung</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
              <select value={filterPic} onChange={(e) => setFilterPic(e.target.value)} className="px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-600">
                <option value="all">Semua PIC</option>
                {uniquePics.map(pic => <option key={pic} value={pic}>{pic}</option>)}
              </select>
              <select value={filterDisposisi} onChange={(e) => setFilterDisposisi(e.target.value as 'all' | 'with' | 'without')} className="px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-600">
                <option value="all">Semua Disposisi</option>
                <option value="with">Dengan Disposisi</option>
                <option value="without">Tanpa Disposisi</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="flex-1 p-2 sm:p-6 overflow-auto">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-2 sm:px-6 py-3 sm:py-4 border-b border-slate-100">
                <div className="flex items-center gap-1 sm:gap-4">
                  <button onClick={() => navigateMonth('prev')} className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg transition-colors"><ChevronLeft size={18} className="sm:w-5 sm:h-5" /></button>
                  <h2 className="text-base sm:text-xl font-bold text-slate-800 min-w-[120px] sm:min-w-[180px] text-center">
                    {isMobile ? `${MONTHS_SHORT[currentDate.getMonth()]} ${currentDate.getFullYear()}` : `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                  </h2>
                  <button onClick={() => navigateMonth('next')} className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg transition-colors"><ChevronRight size={18} className="sm:w-5 sm:h-5" /></button>
                </div>
                <button onClick={goToToday} className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-gov-600 hover:bg-gov-50 rounded-lg transition-colors">Hari Ini</button>
              </div>
              <div className="p-1 sm:p-4">
                <div className="grid grid-cols-7 mb-1 sm:mb-2">
                  {DAYS.map(day => <div key={day} className="text-center text-[10px] sm:text-xs font-semibold text-slate-500 py-1 sm:py-2">{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                  {calendarData.map((day, index) => (
                    <button key={index} onClick={() => setSelectedDate(day.date)} className={`min-h-[48px] sm:min-h-[100px] p-0.5 sm:p-2 rounded-md sm:rounded-lg border transition-all text-left ${day.isCurrentMonth ? 'bg-white' : 'bg-slate-50'} ${isSelected(day.date) ? 'border-gov-400 ring-1 sm:ring-2 ring-gov-100' : 'border-slate-100 hover:border-slate-200'} ${isToday(day.date) ? 'bg-gov-50' : ''}`}>
                      <div className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 text-center sm:text-left ${isToday(day.date) ? 'text-gov-600' : day.isCurrentMonth ? 'text-slate-700' : 'text-slate-400'}`}>{day.date.getDate()}</div>
                      <div className="sm:hidden flex justify-center gap-0.5 flex-wrap">
                        {day.meetings.slice(0, 3).map(meeting => {
                          const config = MEETING_TYPE_CONFIG[meeting.type];
                          const hasDisposisi = meeting.hasDisposisi && meeting.disposisiCount && meeting.disposisiCount > 0;
                          return (
                            <div key={meeting.id} className="relative">
                              <div className={`w-1.5 h-1.5 rounded-full ${config.bgColor.replace('100', '500')}`} />
                              {hasDisposisi && (
                                <div className="absolute -top-0.5 -right-0.5 w-1 h-1 rounded-full bg-amber-500 border border-white" title="Memiliki Disposisi" />
                              )}
                            </div>
                          );
                        })}
                        {day.meetings.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                      </div>
                      <div className="hidden sm:block space-y-0.5">
                        {day.meetings.slice(0, 2).map(meeting => {
                          const config = MEETING_TYPE_CONFIG[meeting.type];
                          const hasDisposisi = meeting.hasDisposisi && meeting.disposisiCount && meeting.disposisiCount > 0;
                          return (
                            <div key={meeting.id} className="relative">
                              <div className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded truncate ${config.bgColor} ${config.color}`} title={meeting.title}>
                                {hasDisposisi && <ClipboardList size={8} className="inline mr-0.5" />}
                                {meeting.title}
                              </div>
                            </div>
                          );
                        })}
                        {day.meetings.length > 2 && <div className="text-[10px] text-slate-500 px-1">+{day.meetings.length - 2} lagi</div>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* List View - Full width with all meetings */}
        {viewMode === 'list' && (
          <div ref={listContainerRef} onScroll={handleScroll} className="flex-1 overflow-auto">
            <div className="p-3 sm:p-6 max-w-4xl mx-auto">
              {filteredMeetings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="mx-auto text-slate-300 mb-3" size={48} />
                  <p className="text-slate-500">Tidak ada jadwal ditemukan</p>
                  <button onClick={onAddMeeting} className="mt-4 text-sm text-gov-600 hover:text-gov-700 font-medium">+ Tambah Jadwal</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Load More Past Button */}
                  {hasMorePast && (
                    <button onClick={loadMorePast} disabled={loadingMore} className="w-full py-3 flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                      {loadingMore ? <Loader2 size={16} className="animate-spin" /> : <ChevronUp size={16} />}
                      <span>Muat {pastMeetings.length - visiblePastCount} jadwal sebelumnya</span>
                    </button>
                  )}

                  {/* Past Meetings */}
                  {visiblePastMeetings.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        Jadwal Sebelumnya
                      </h3>
                      <div className="space-y-2 sm:space-y-3 opacity-75">
                        {visiblePastMeetings.map(meeting => renderMeetingCard(meeting))}
                      </div>
                    </div>
                  )}

                  {/* Today Marker */}
                  <div ref={todayMarkerRef} className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t-2 border-gov-400"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-4 py-1 bg-gov-600 text-white text-sm font-semibold rounded-full shadow-sm">
                        Hari Ini - {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                    </div>
                  </div>

                  {/* Today's Meetings */}
                  {todayMeetings.length > 0 && (
                    <div className="space-y-2 sm:space-y-3">
                      {todayMeetings.map(meeting => renderMeetingCard(meeting, false))}
                    </div>
                  )}
                  {todayMeetings.length === 0 && (
                    <p className="text-center text-sm text-slate-400 py-2">Tidak ada jadwal hari ini</p>
                  )}

                  {/* Future Meetings */}
                  {visibleFutureMeetings.length > 0 && (
                    <div className="space-y-3 mt-4">
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-gov-500"></span>
                        Jadwal Mendatang
                      </h3>
                      <div className="space-y-2 sm:space-y-3">
                        {visibleFutureMeetings.map(meeting => renderMeetingCard(meeting))}
                      </div>
                    </div>
                  )}

                  {/* Load More Future */}
                  {hasMoreFuture && (
                    <button onClick={loadMoreFuture} disabled={loadingMore} className="w-full py-3 flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                      {loadingMore ? <Loader2 size={16} className="animate-spin" /> : null}
                      <span>Muat {futureMeetings.length - visibleFutureCount} jadwal lainnya</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Calendar View - Side Panel for Selected Date */}
        {viewMode === 'calendar' && (
          <div className="lg:w-96 border-t lg:border-t-0 lg:border-l max-h-[40vh] lg:max-h-none border-slate-200 bg-white overflow-auto">
            <div className="p-3 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4">
                {selectedDate ? `${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]}` : 'Pilih Tanggal'}
              </h3>
              {!selectedDate ? (
                <div className="text-center py-8">
                  <Calendar className="mx-auto text-slate-300 mb-2" size={40} />
                  <p className="text-sm text-slate-500">Klik tanggal untuk melihat jadwal</p>
                </div>
              ) : displayMeetings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="mx-auto text-slate-300 mb-2" size={40} />
                  <p className="text-sm text-slate-500">Tidak ada jadwal</p>
                  <button onClick={onAddMeeting} className="mt-3 text-sm text-gov-600 hover:text-gov-700 font-medium">+ Tambah Jadwal</button>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {displayMeetings.map(meeting => renderMeetingCard(meeting, false))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingCalendar;
