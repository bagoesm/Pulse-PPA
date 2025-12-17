import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Task, Status, Priority, User, UserStatus, ChristmasDecorationSettings, Announcement } from '../../types';
import StatusBubble from './StatusBubble';
import SakuraAnimation from './SakuraAnimation';
import SnowAnimation from './SnowAnimation';
import ChristmasDecorations from './ChristmasDecorations';
import ChristmasSettingsModal from './ChristmasSettingsModal';
import NotificationIcon from './NotificationIcon';
import AnnouncementBanner from './AnnouncementBanner';
import { 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Zap, 
  Coffee, 
  Flame, 
  AlertTriangle,
  Briefcase,
  Search,
  Filter,
  Users,
  Clock,
  Target,
  Award,
  Calendar,
  BarChart3,
  TrendingDown,
  Eye,
  ChevronDown,
  RefreshCw,
  Plus,
  MessageCircle,
  Gift
} from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
  users: User[];   // <-- NOW FROM DATABASE
  userStatuses: UserStatus[];
  onCreateStatus: () => void;
  onDeleteStatus: (statusId: string) => void;
  currentUser: User | null;
  onUserCardClick?: (userName: string) => void; // New prop for handling card clicks
  christmasSettings?: ChristmasDecorationSettings;
  onUpdateChristmasSettings?: (settings: ChristmasDecorationSettings) => void;
  // Notification props
  notifications?: any[];
  onMarkAllAsRead?: () => void;
  onNotificationClick?: (notification: any) => void;
  onDeleteNotification?: (notificationId: string) => void;
  // Announcement props
  announcements?: Announcement[];
  onDismissAnnouncement?: (id: string) => void;
}

type WorkloadFilter = 'all' | 'relaxed' | 'balanced' | 'busy' | 'overload';
type SortOption = 'workload' | 'name' | 'tasks' | 'urgent' | 'performance';
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

const USERS_PER_PAGE = 12;

const Dashboard: React.FC<DashboardProps> = ({ 
  tasks, 
  users, 
  userStatuses, 
  onCreateStatus, 
  onDeleteStatus, 
  currentUser,
  onUserCardClick,
  christmasSettings = { santaHatEnabled: false, baubleEnabled: false, candyEnabled: false },
  onUpdateChristmasSettings,
  notifications = [],
  onMarkAllAsRead,
  onNotificationClick,
  onDeleteNotification,
  announcements = [],
  onDismissAnnouncement
}) => {
  // State untuk filtering dan searching
  const [searchTerm, setSearchTerm] = useState('');
  const [workloadFilter, setWorkloadFilter] = useState<WorkloadFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('workload');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // State untuk filter tanggal
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // State untuk animasi sakura
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  
  // State untuk Christmas settings modal
  const [isChristmasModalOpen, setIsChristmasModalOpen] = useState(false);

  // Reset page saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, workloadFilter, sortBy, dateFilter, customStartDate, customEndDate]);

  // Fungsi untuk mendapatkan range tanggal berdasarkan filter
  const getDateRange = () => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    switch (dateFilter) {
      case 'today':
        return {
          start: startOfToday,
          end: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1)
        };
      case 'week':
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return { start: startOfWeek, end: endOfWeek };
      case 'month':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        return { start: startOfMonth, end: endOfMonth };
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        }
        return null;
      default:
        return null;
    }
  };

  // Filter tasks berdasarkan tanggal
  const getFilteredTasksByDate = (userTasks: Task[]) => {
    const dateRange = getDateRange();
    if (!dateRange) return userTasks;

    return userTasks.filter(task => {
      // Untuk task yang selesai, gunakan tanggal selesai (estimasi berdasarkan status)
      // Untuk task aktif, gunakan tanggal deadline atau start date
      let taskDate: Date;
      
      if (task.status === Status.Done) {
        // Estimasi: task selesai mendekati deadline
        taskDate = new Date(task.deadline);
      } else {
        // Untuk task aktif, gunakan start date
        taskDate = new Date(task.startDate);
      }

      return taskDate >= dateRange.start && taskDate <= dateRange.end;
    });
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === Status.Done).length;
  const activeTasksCount = totalTasks - completedTasks;
  const urgentCount = tasks.filter(t => t.priority === Priority.Urgent && t.status !== Status.Done).length;

  const getWorkloadAnalysis = (userTasks: Task[]) => {
    // Filter tasks berdasarkan periode jika ada filter tanggal
    const filteredTasks = getFilteredTasksByDate(userTasks);
    const allUserTasks = userTasks; // Simpan semua task untuk beberapa kalkulasi
    
    const active = filteredTasks.filter(t => t.status !== Status.Done);
    const completed = filteredTasks.filter(t => t.status === Status.Done);
    
    let score = 0;
    let urgentCount = 0, highCount = 0, mediumCount = 0, lowCount = 0;

    active.forEach(t => {
      if (t.priority === Priority.Urgent) { score += 4; urgentCount++; }
      else if (t.priority === Priority.High) { score += 3; highCount++; }
      else if (t.priority === Priority.Medium) { score += 2; mediumCount++; }
      else { score += 1; lowCount++; }
    });

    // Hitung deadline yang mendekat (dalam 3 hari) - selalu dari semua task aktif
    const allActive = allUserTasks.filter(t => t.status !== Status.Done);
    const upcomingDeadlines = allActive.filter(t => {
      const deadline = new Date(t.deadline);
      const today = new Date();
      const diffTime = deadline.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 3 && diffDays >= 0;
    }).length;

    // Hitung completion rate berdasarkan periode
    const completionRate = filteredTasks.length > 0 ? (completed.length / filteredTasks.length) * 100 : 0;
    
    // Hitung performance score berdasarkan completed tasks dalam periode
    const performanceScore = completed.reduce((sum, task) => {
      if (task.priority === Priority.Urgent) return sum + 4;
      if (task.priority === Priority.High) return sum + 3;
      if (task.priority === Priority.Medium) return sum + 2;
      return sum + 1;
    }, 0);

    // Hitung rata-rata waktu penyelesaian (estimasi)
    const avgCompletionTime = completed.length > 0 ? 
      completed.reduce((sum, task) => {
        const start = new Date(task.startDate);
        const end = new Date(task.deadline);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return sum + Math.max(1, days);
      }, 0) / completed.length : 0;

    return { 
      score, 
      activeCount: active.length, 
      completedCount: completed.length,
      totalTasks: filteredTasks.length,
      urgentCount, 
      highCount, 
      mediumCount, 
      lowCount,
      upcomingDeadlines,
      completionRate,
      performanceScore,
      avgCompletionTime,
      details: active,
      // Tambahan untuk perbandingan periode
      allTimeCompleted: allUserTasks.filter(t => t.status === Status.Done).length,
      allTimeTotal: allUserTasks.length
    };
  };

  const getWorkloadVisuals = (score: number) => {
    if (score === 0) return { 
      label: 'Idle', 
      color: 'bg-slate-400', 
      textColor: 'text-slate-700', 
      bg: 'bg-slate-50', 
      icon: Coffee, 
      message: 'Tidak ada tugas aktif',
      category: 'relaxed' as WorkloadFilter
    };
    if (score < 6) return { 
      label: 'Relaxed', 
      color: 'bg-emerald-500', 
      textColor: 'text-emerald-700', 
      bg: 'bg-emerald-50', 
      icon: Coffee, 
      message: 'Beban kerja ringan',
      category: 'relaxed' as WorkloadFilter
    };
    if (score < 15) return { 
      label: 'Balanced', 
      color: 'bg-gov-500', 
      textColor: 'text-gov-700', 
      bg: 'bg-gov-50', 
      icon: Zap, 
      message: 'Beban kerja seimbang',
      category: 'balanced' as WorkloadFilter
    };
    if (score < 25) return { 
      label: 'Busy', 
      color: 'bg-orange-500', 
      textColor: 'text-orange-700', 
      bg: 'bg-orange-50', 
      icon: AlertTriangle, 
      message: 'Cukup sibuk',
      category: 'busy' as WorkloadFilter
    };
    return { 
      label: 'Overload', 
      color: 'bg-red-500', 
      textColor: 'text-red-700', 
      bg: 'bg-red-50', 
      icon: Flame, 
      message: 'Butuh bantuan segera',
      category: 'overload' as WorkloadFilter
    };
  };

  // Analisis data users dengan workload
  const analyzedUsers = useMemo(() => {
    return users.map(u => {
      const userTasks = tasks.filter(t => Array.isArray(t.pic) ? t.pic.includes(u.name) : t.pic === u.name);
      const analysis = getWorkloadAnalysis(userTasks);
      const visuals = getWorkloadVisuals(analysis.score);
      
      return { 
        user: u, 
        userName: u.name,
        ...analysis,
        visuals
      };
    });
  }, [users, tasks]);

  // Filter dan sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = analyzedUsers;

    // Filter berdasarkan search
    if (searchTerm) {
      filtered = filtered.filter(data => 
        data.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        data.user.jabatan?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter berdasarkan workload
    if (workloadFilter !== 'all') {
      filtered = filtered.filter(data => data.visuals.category === workloadFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'workload':
          return b.score - a.score;
        case 'name':
          return a.userName.localeCompare(b.userName);
        case 'tasks':
          return b.activeCount - a.activeCount;
        case 'urgent':
          return b.urgentCount - a.urgentCount;
        case 'performance':
          // Sort berdasarkan performance score (completed tasks dalam periode)
          if (b.performanceScore !== a.performanceScore) {
            return b.performanceScore - a.performanceScore;
          }
          // Jika performance score sama, sort berdasarkan completion rate
          return b.completionRate - a.completionRate;
        default:
          return b.score - a.score;
      }
    });

    return filtered;
  }, [analyzedUsers, searchTerm, workloadFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedUsers.length / USERS_PER_PAGE);
  const paginatedUsers = filteredAndSortedUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  );

  // Load more function untuk lazy loading
  const loadMore = useCallback(() => {
    if (currentPage < totalPages && !isLoading) {
      setIsLoading(true);
      // Simulate loading delay
      setTimeout(() => {
        setCurrentPage(prev => prev + 1);
        setIsLoading(false);
      }, 300);
    }
  }, [currentPage, totalPages, isLoading]);

  // Stats untuk dashboard
  const dashboardStats = useMemo(() => {
    const workloadDistribution = {
      relaxed: analyzedUsers.filter(u => u.visuals.category === 'relaxed').length,
      balanced: analyzedUsers.filter(u => u.visuals.category === 'balanced').length,
      busy: analyzedUsers.filter(u => u.visuals.category === 'busy').length,
      overload: analyzedUsers.filter(u => u.visuals.category === 'overload').length,
    };

    const avgCompletionRate = analyzedUsers.reduce((sum, u) => sum + u.completionRate, 0) / analyzedUsers.length;
    const totalUpcomingDeadlines = analyzedUsers.reduce((sum, u) => sum + u.upcomingDeadlines, 0);
    const highPerformers = analyzedUsers.filter(u => u.completionRate > 80 && u.activeCount > 0).length;

    return {
      workloadDistribution,
      avgCompletionRate,
      totalUpcomingDeadlines,
      highPerformers
    };
  }, [analyzedUsers]);

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-50">

      {/* HEADER */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Dashboard Manajemen Tim</h1>
          <p className="text-slate-600">Pantau performa dan beban kerja tim secara real-time</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Notification Icon */}
          {onNotificationClick && onMarkAllAsRead && onDeleteNotification && (
            <NotificationIcon
              notifications={notifications}
              onMarkAllAsRead={onMarkAllAsRead}
              onNotificationClick={onNotificationClick}
              onDeleteNotification={onDeleteNotification}
            />
          )}
          
          {/* Christmas Settings Button (Admin Only) */}
          {currentUser?.role === 'Super Admin' && (
            <button
              onClick={() => setIsChristmasModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-green-600 text-white rounded-lg font-medium hover:from-red-700 hover:to-green-700 shadow-md hover:shadow-lg transition-all"
            >
              <Gift size={18} />
              Dekorasi Natal
            </button>
          )}
          
          {/* Create Status Button */}
          <button
            onClick={onCreateStatus}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gov-600 to-blue-600 text-white rounded-lg font-medium hover:from-gov-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all"
          >
            <MessageCircle size={18} />
            Buat Status
          </button>
        </div>
      </div>

      {/* ANNOUNCEMENTS SECTION */}
      {announcements.length > 0 && (
        <div className="space-y-4">
          {announcements
            .filter(announcement => {
              const now = new Date();
              const isNotExpired = !announcement.expiresAt || new Date(announcement.expiresAt) > now;
              return announcement.isActive && isNotExpired;
            })
            .map(announcement => (
              <AnnouncementBanner
                key={announcement.id}
                announcement={announcement}
                onDismiss={onDismissAnnouncement ? () => onDismissAnnouncement(announcement.id) : undefined}
                canDismiss={false} // Users can't dismiss announcements, only admins can deactivate
              />
            ))}
        </div>
      )}

      {/* TOP STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Active Tasks */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Briefcase size={20} />
            </div>
            <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-full">
              {((activeTasksCount / totalTasks) * 100).toFixed(0)}%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-1">{activeTasksCount}</h3>
          <p className="text-sm text-slate-500">Task Aktif</p>
        </div>

        {/* Completion Rate */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <Target size={20} />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
              {dashboardStats.avgCompletionRate.toFixed(0)}%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-1">{completedTasks}</h3>
          <p className="text-sm text-slate-500">Task Selesai</p>
        </div>

        {/* Urgent Tasks */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <AlertCircle size={20} />
            </div>
            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
              Urgent
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-1">{urgentCount}</h3>
          <p className="text-sm text-slate-500">Butuh Perhatian</p>
        </div>

        {/* High Performers */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <Award size={20} />
            </div>
            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
              Top
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-1">{dashboardStats.highPerformers}</h3>
          <p className="text-sm text-slate-500">High Performers</p>
        </div>
      </div>

      {/* WORKLOAD DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Workload Distribution Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-gov-600" />
            Distribusi Beban Kerja Tim
          </h3>
          
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="w-8 h-8 bg-emerald-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                <Coffee size={16} className="text-white" />
              </div>
              <span className="block text-2xl font-bold text-emerald-700">{dashboardStats.workloadDistribution.relaxed}</span>
              <span className="text-xs text-emerald-600 font-medium">Relaxed</span>
            </div>
            
            <div className="text-center p-4 bg-gov-50 rounded-lg border border-gov-100">
              <div className="w-8 h-8 bg-gov-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
              <span className="block text-2xl font-bold text-gov-700">{dashboardStats.workloadDistribution.balanced}</span>
              <span className="text-xs text-gov-600 font-medium">Balanced</span>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-100">
              <div className="w-8 h-8 bg-orange-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                <AlertTriangle size={16} className="text-white" />
              </div>
              <span className="block text-2xl font-bold text-orange-700">{dashboardStats.workloadDistribution.busy}</span>
              <span className="text-xs text-orange-600 font-medium">Busy</span>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-100">
              <div className="w-8 h-8 bg-red-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                <Flame size={16} className="text-white" />
              </div>
              <span className="block text-2xl font-bold text-red-700">{dashboardStats.workloadDistribution.overload}</span>
              <span className="text-xs text-red-600 font-medium">Overload</span>
            </div>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Eye size={20} className="text-gov-600" />
            Insights
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
              <Clock size={16} className="text-orange-600" />
              <div>
                <p className="text-sm font-bold text-orange-800">{dashboardStats.totalUpcomingDeadlines}</p>
                <p className="text-xs text-orange-600">Deadline 3 hari ke depan</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
              <TrendingUp size={16} className="text-green-600" />
              <div>
                <p className="text-sm font-bold text-green-800">{dashboardStats.avgCompletionRate.toFixed(1)}%</p>
                <p className="text-xs text-green-600">Rata-rata completion rate</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Users size={16} className="text-blue-600" />
              <div>
                <p className="text-sm font-bold text-blue-800">{users.length}</p>
                <p className="text-xs text-blue-600">Total anggota tim</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Users size={20} className="text-gov-600" />
              Analisis Tim ({filteredAndSortedUsers.length} dari {users.length} anggota)
            </h3>
            <div className="flex items-center gap-4">
              <p className="text-sm text-slate-500">Pantau beban kerja dan performa setiap anggota tim</p>
              {dateFilter !== 'all' && (
                <div className="flex items-center gap-2 px-3 py-1 bg-gov-50 text-gov-700 rounded-full text-xs font-medium">
                  <Calendar size={12} />
                  <span>
                    {dateFilter === 'today' && 'Hari Ini'}
                    {dateFilter === 'week' && 'Minggu Ini'}
                    {dateFilter === 'month' && 'Bulan Ini'}
                    {dateFilter === 'custom' && customStartDate && customEndDate && 
                      `${new Date(customStartDate).toLocaleDateString('id-ID')} - ${new Date(customEndDate).toLocaleDateString('id-ID')}`
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-4 w-full lg:w-auto">
            {/* Row 1: Search dan Date Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau jabatan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm w-full sm:w-64"
                />
              </div>

              {/* Date Filter */}
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                  className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm bg-white appearance-none cursor-pointer"
                >
                  <option value="all">Semua Periode</option>
                  <option value="today">Hari Ini</option>
                  <option value="week">Minggu Ini</option>
                  <option value="month">Bulan Ini</option>
                  <option value="custom">Periode Custom</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Custom Date Range (jika dipilih) */}
            {dateFilter === 'custom' && (
              <div className="flex flex-col sm:flex-row gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Dari Tanggal</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                  />
                </div>
              </div>
            )}

            {/* Row 2: Workload Filter dan Sort */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Workload Filter */}
              <div className="relative">
                <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={workloadFilter}
                  onChange={(e) => setWorkloadFilter(e.target.value as WorkloadFilter)}
                  className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm bg-white appearance-none cursor-pointer"
                >
                  <option value="all">Semua Beban Kerja</option>
                  <option value="relaxed">Relaxed</option>
                  <option value="balanced">Balanced</option>
                  <option value="busy">Busy</option>
                  <option value="overload">Overload</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Sort */}
              <div className="relative">
                <BarChart3 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm bg-white appearance-none cursor-pointer"
                >
                  <option value="workload">Urutkan: Beban Kerja</option>
                  <option value="performance">Urutkan: Performa Terbaik</option>
                  <option value="name">Urutkan: Nama</option>
                  <option value="tasks">Urutkan: Jumlah Task</option>
                  <option value="urgent">Urutkan: Task Urgent</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* USER GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        {paginatedUsers.map(data => {
          const VisualIcon = data.visuals.icon;
          const percentage = Math.min((data.score / 30) * 100, 100);
          
          // Get user's current status
          const userStatus = userStatuses.find(s => s.userId === data.user.id);

          const isHoveredWithSakura = hoveredCard === data.user.id && data.user.sakuraAnimationEnabled;
          const isHoveredWithSnow = hoveredCard === data.user.id && data.user.snowAnimationEnabled;
          const hasActiveAnimation = isHoveredWithSakura || isHoveredWithSnow;

          return (
            <div 
              key={data.userName} 
              className={`rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 group cursor-pointer transform hover:scale-[1.02] relative ${
                isHoveredWithSakura 
                  ? 'bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200 shadow-pink-100/50 hover:shadow-lg' 
                  : isHoveredWithSnow
                  ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-blue-100/50 hover:shadow-lg'
                  : 'bg-white border-slate-200 hover:shadow-lg hover:border-gov-300'
              }`}
              onClick={() => onUserCardClick?.(data.userName)}
              onMouseEnter={() => setHoveredCard(data.user.id)}
              onMouseLeave={() => setHoveredCard(null)}
              title={`Klik untuk melihat semua task ${data.userName} (${data.activeCount} aktif, ${data.completedCount} selesai)`}
            >
              {/* Christmas Decorations */}
              <ChristmasDecorations 
                santaHatEnabled={christmasSettings.santaHatEnabled}
                baubleEnabled={christmasSettings.baubleEnabled}
                candyEnabled={christmasSettings.candyEnabled}
                position="card-top"
              />
              <ChristmasDecorations 
                santaHatEnabled={christmasSettings.santaHatEnabled}
                baubleEnabled={christmasSettings.baubleEnabled}
                candyEnabled={christmasSettings.candyEnabled}
                position="card-bottom"
              />
              {/* Sakura Animation */}
              <SakuraAnimation 
                isActive={hoveredCard === data.user.id && data.user.sakuraAnimationEnabled === true}
                petalCount={6}
              />
              {/* Snow Animation */}
              <SnowAnimation 
                isActive={hoveredCard === data.user.id && data.user.snowAnimationEnabled === true}
                flakeCount={40}
              />
              {/* HEADER */}
              <div className={`p-5 border-b transition-colors ${
                isHoveredWithSakura ? 'border-pink-100' : 
                isHoveredWithSnow ? 'border-blue-100' : 
                'border-slate-100'
              }`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3 relative">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 border-white shadow-sm ${
                        isHoveredWithSakura ? 'bg-pink-400' : 
                        isHoveredWithSnow ? 'bg-blue-400' : 
                        data.visuals.color
                      } text-white group-hover:scale-110 transition-all`}>
                        {data.userName.charAt(0).toUpperCase()}
                      </div>
                      {/* Santa Hat Decoration */}
                      <ChristmasDecorations 
                        santaHatEnabled={christmasSettings.santaHatEnabled}
                        baubleEnabled={christmasSettings.baubleEnabled}
                        candyEnabled={christmasSettings.candyEnabled}
                        position="avatar"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-bold transition-colors ${
                        isHoveredWithSakura ? 'text-pink-800' : 
                        isHoveredWithSnow ? 'text-blue-800' : 
                        'text-slate-800 group-hover:text-gov-700'
                      }`}>{data.userName}</h4>
                      <p className={`text-xs transition-colors ${
                        isHoveredWithSakura ? 'text-pink-600' : 
                        isHoveredWithSnow ? 'text-blue-600' : 
                        'text-slate-500'
                      }`}>{data.user.jabatan || 'Staff'}</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye size={16} className={
                        isHoveredWithSakura ? 'text-pink-600' : 
                        isHoveredWithSnow ? 'text-blue-600' : 
                        'text-gov-600'
                      } />
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors ${
                    isHoveredWithSakura 
                      ? 'bg-pink-100 text-pink-700' 
                      : isHoveredWithSnow
                      ? 'bg-blue-100 text-blue-700'
                      : `${data.visuals.bg} ${data.visuals.textColor}`
                  }`}>
                    <VisualIcon size={12} />
                    {data.visuals.label}
                  </span>
                </div>

                {/* User Status */}
                {userStatus && (
                  <div className="mb-3">
                    <StatusBubble
                      status={userStatus}
                      onDelete={() => onDeleteStatus(userStatus.id)}
                      canDelete={currentUser?.id === userStatus.userId}
                      showTimeLeft={currentUser?.id === userStatus.userId}
                    />
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <span className={`block text-lg font-bold transition-colors ${
                      isHoveredWithSakura ? 'text-pink-700' : 
                      isHoveredWithSnow ? 'text-blue-700' : 
                      'text-slate-800'
                    }`}>{data.activeCount}</span>
                    <span className={`text-[9px] font-medium transition-colors ${
                      isHoveredWithSakura ? 'text-pink-600' : 
                      isHoveredWithSnow ? 'text-blue-600' : 
                      'text-slate-500'
                    }`}>Aktif</span>
                  </div>
                  <div>
                    <span className={`block text-lg font-bold transition-colors ${
                      isHoveredWithSakura ? 'text-pink-700' : 
                      isHoveredWithSnow ? 'text-blue-700' : 
                      'text-green-600'
                    }`}>{data.completedCount}</span>
                    <span className={`text-[9px] font-medium transition-colors ${
                      isHoveredWithSakura ? 'text-pink-600' : 
                      isHoveredWithSnow ? 'text-blue-600' : 
                      'text-green-600'
                    }`}>Selesai</span>
                  </div>
                  <div>
                    <span className={`block text-lg font-bold transition-colors ${
                      isHoveredWithSakura ? 'text-pink-700' : 
                      isHoveredWithSnow ? 'text-blue-700' : 
                      'text-gov-600'
                    }`}>{data.completionRate.toFixed(0)}%</span>
                    <span className={`text-[9px] font-medium transition-colors ${
                      isHoveredWithSakura ? 'text-pink-600' : 
                      isHoveredWithSnow ? 'text-blue-600' : 
                      'text-gov-600'
                    }`}>Rate</span>
                  </div>
                  <div>
                    <span className={`block text-lg font-bold transition-colors ${
                      isHoveredWithSakura ? 'text-pink-700' : 
                      isHoveredWithSnow ? 'text-blue-700' : 
                      'text-purple-600'
                    }`}>{data.performanceScore}</span>
                    <span className={`text-[9px] font-medium transition-colors ${
                      isHoveredWithSakura ? 'text-pink-600' : 
                      isHoveredWithSnow ? 'text-blue-600' : 
                      'text-purple-600'
                    }`}>Poin</span>
                  </div>
                </div>

                {/* Performance Badge untuk periode tertentu */}
                {dateFilter !== 'all' && data.performanceScore > 0 && (
                  <div className="mt-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                      isHoveredWithSakura 
                        ? 'bg-pink-100 text-pink-700'
                        : isHoveredWithSnow
                        ? 'bg-blue-100 text-blue-700'
                        : data.performanceScore >= 10 ? 'bg-purple-100 text-purple-700' :
                          data.performanceScore >= 5 ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                    }`}>
                      <Award size={10} />
                      {data.performanceScore >= 10 ? 'Top Performer' :
                       data.performanceScore >= 5 ? 'Good Performer' : 'Active'}
                    </span>
                  </div>
                )}
              </div>

              {/* BODY */}
              <div className="p-5">
                {/* Workload Meter */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className={`font-semibold transition-colors ${
                      isHoveredWithSakura ? 'text-pink-700' : 
                      isHoveredWithSnow ? 'text-blue-700' : 
                      'text-slate-600'
                    }`}>Beban Kerja: {data.score} poin</span>
                    <span className={`transition-colors ${
                      isHoveredWithSakura ? 'text-pink-500' : 
                      isHoveredWithSnow ? 'text-blue-500' : 
                      'text-slate-400'
                    }`}>{percentage.toFixed(0)}% kapasitas</span>
                  </div>
                  <div className={`h-2.5 w-full rounded-full overflow-hidden transition-colors ${
                    isHoveredWithSakura ? 'bg-pink-100' : 
                    isHoveredWithSnow ? 'bg-blue-100' : 
                    'bg-slate-100'
                  }`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        isHoveredWithSakura ? 'bg-pink-400' : 
                        isHoveredWithSnow ? 'bg-blue-400' : 
                        data.visuals.color
                      }`} 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-2 italic transition-colors ${
                    isHoveredWithSakura ? 'text-pink-600' : 
                    isHoveredWithSnow ? 'text-blue-600' : 
                    'text-slate-500'
                  }`}>"{data.visuals.message}"</p>
                </div>

                {/* Upcoming Deadlines Alert */}
                {data.upcomingDeadlines > 0 && (
                  <div className={`mb-4 p-2 rounded-lg flex items-center gap-2 transition-colors ${
                    isHoveredWithSakura 
                      ? 'bg-pink-50 border border-pink-200' 
                      : isHoveredWithSnow
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-orange-50 border border-orange-200'
                  }`}>
                    <Clock size={14} className={
                      isHoveredWithSakura ? 'text-pink-600' : 
                      isHoveredWithSnow ? 'text-blue-600' : 
                      'text-orange-600'
                    } />
                    <span className={`text-xs font-medium transition-colors ${
                      isHoveredWithSakura ? 'text-pink-700' : 
                      isHoveredWithSnow ? 'text-blue-700' : 
                      'text-orange-700'
                    }`}>
                      {data.upcomingDeadlines} deadline dalam 3 hari
                    </span>
                  </div>
                )}

                {/* Priority Breakdown */}
                <div className="grid grid-cols-4 gap-2">
                  <div className={`text-center p-2 rounded-lg transition-colors ${
                    isHoveredWithSakura 
                      ? 'bg-pink-50 border border-pink-100 hover:bg-pink-100' 
                      : isHoveredWithSnow
                      ? 'bg-blue-50 border border-blue-100 hover:bg-blue-100'
                      : 'bg-red-50 border border-red-100 hover:bg-red-100'
                  }`}>
                    <span className={`block text-lg font-bold transition-colors ${
                      isHoveredWithSakura ? 'text-pink-700' : 
                      isHoveredWithSnow ? 'text-blue-700' : 
                      'text-red-600'
                    }`}>{data.urgentCount}</span>
                    <span className={`text-[9px] font-semibold uppercase transition-colors ${
                      isHoveredWithSakura ? 'text-pink-600' : 
                      isHoveredWithSnow ? 'text-blue-600' : 
                      'text-red-500'
                    }`}>Urgent</span>
                  </div>
                  <div className={`text-center p-2 rounded-lg transition-colors ${
                    isHoveredWithSakura 
                      ? 'bg-pink-50 border border-pink-100 hover:bg-pink-100' 
                      : isHoveredWithSnow
                      ? 'bg-blue-50 border border-blue-100 hover:bg-blue-100'
                      : 'bg-orange-50 border border-orange-100 hover:bg-orange-100'
                  }`}>
                    <span className={`block text-lg font-bold transition-colors ${
                      isHoveredWithSakura ? 'text-pink-700' : 
                      isHoveredWithSnow ? 'text-blue-700' : 
                      'text-orange-600'
                    }`}>{data.highCount}</span>
                    <span className={`text-[9px] font-semibold uppercase transition-colors ${
                      isHoveredWithSakura ? 'text-pink-600' : 
                      isHoveredWithSnow ? 'text-blue-600' : 
                      'text-orange-500'
                    }`}>High</span>
                  </div>
                  <div className={`text-center p-2 rounded-lg transition-colors ${
                    isHoveredWithSakura 
                      ? 'bg-pink-50 border border-pink-100 hover:bg-pink-100' 
                      : isHoveredWithSnow
                      ? 'bg-blue-50 border border-blue-100 hover:bg-blue-100'
                      : 'bg-blue-50 border border-blue-100 hover:bg-blue-100'
                  }`}>
                    <span className={`block text-lg font-bold transition-colors ${
                      isHoveredWithSakura ? 'text-pink-700' : 
                      isHoveredWithSnow ? 'text-blue-700' : 
                      'text-blue-600'
                    }`}>{data.mediumCount}</span>
                    <span className={`text-[9px] font-semibold uppercase transition-colors ${
                      isHoveredWithSakura ? 'text-pink-600' : 
                      isHoveredWithSnow ? 'text-blue-600' : 
                      'text-blue-500'
                    }`}>Med</span>
                  </div>
                  <div className={`text-center p-2 rounded-lg transition-colors ${
                    isHoveredWithSakura 
                      ? 'bg-pink-50 border border-pink-100 hover:bg-pink-100' 
                      : isHoveredWithSnow
                      ? 'bg-blue-50 border border-blue-100 hover:bg-blue-100'
                      : 'bg-slate-50 border border-slate-100 hover:bg-slate-100'
                  }`}>
                    <span className={`block text-lg font-bold transition-colors ${
                      isHoveredWithSakura ? 'text-pink-700' : 
                      isHoveredWithSnow ? 'text-blue-700' : 
                      'text-slate-600'
                    }`}>{data.lowCount}</span>
                    <span className={`text-[9px] font-semibold uppercase transition-colors ${
                      isHoveredWithSakura ? 'text-pink-600' : 
                      isHoveredWithSnow ? 'text-blue-600' : 
                      'text-slate-500'
                    }`}>Low</span>
                  </div>
                </div>

                {/* Click hint */}
                <div className="mt-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className={`text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                    isHoveredWithSakura ? 'text-pink-600' : 
                    isHoveredWithSnow ? 'text-blue-600' : 
                    'text-gov-600'
                  }`}>
                    <Eye size={12} />
                    Klik untuk lihat task
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* PAGINATION / LOAD MORE */}
      {filteredAndSortedUsers.length > USERS_PER_PAGE && (
        <div className="text-center">
          {currentPage < totalPages ? (
            <button
              onClick={loadMore}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gov-600 text-white rounded-lg font-medium hover:bg-gov-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Muat Lebih Banyak
                  <ChevronDown size={16} />
                </>
              )}
            </button>
          ) : (
            <p className="text-sm text-slate-500 py-4">
              Menampilkan semua {filteredAndSortedUsers.length} anggota tim
            </p>
          )}
        </div>
      )}

      {/* EMPTY STATE */}
      {filteredAndSortedUsers.length === 0 && (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-600 mb-2">Tidak ada anggota tim ditemukan</h3>
          <p className="text-slate-500 mb-4">Coba ubah filter atau kata kunci pencarian</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setWorkloadFilter('all');
            }}
            className="px-4 py-2 bg-gov-600 text-white rounded-lg font-medium hover:bg-gov-700 transition-colors"
          >
            Reset Filter
          </button>
        </div>
      )}

      {/* Christmas Settings Modal */}
      {isChristmasModalOpen && onUpdateChristmasSettings && (
        <ChristmasSettingsModal
          isOpen={isChristmasModalOpen}
          onClose={() => setIsChristmasModalOpen(false)}
          currentSettings={christmasSettings}
          onSave={onUpdateChristmasSettings}
          currentUserName={currentUser?.name || 'Admin'}
        />
      )}

    </div>
  );
};

const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-gov-600" viewBox="0 0 24 24">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
);

export default Dashboard;
