// src/components/Dashboard.tsx
// Refactored - main Dashboard component using extracted hooks and components

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Task, Status, Priority, User, UserStatus, ChristmasDecorationSettings, Announcement } from '../../types';

// Extracted hooks
import { useDashboardFilters, WorkloadFilter } from '../hooks/useDashboardFilters';
import { useWorkloadAnalysis } from '../hooks/useWorkloadAnalysis';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useTaskShare } from '../hooks/useTaskShare';

// Extracted components
import DashboardHeader from './DashboardHeader';
import DashboardStatsCards from './DashboardStatsCards';
import WorkloadDistribution from './WorkloadDistribution';
import DashboardFilters from './DashboardFilters';
import UserWorkloadCard from './UserWorkloadCard';
import LeaderboardModal from './LeaderboardModal';

// Other components
import SiPalingSection from './SiPalingSection';
import AnnouncementBanner from './AnnouncementBanner';
import ChristmasSettingsModal from './ChristmasSettingsModal';
import ShareModal from './ShareModal';
import TaskShareModal from './TaskShareModal';

import { CheckCircle2, RefreshCw, Users } from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
  users: User[];
  userStatuses: UserStatus[];
  onCreateStatus: () => void;
  onDeleteStatus: (statusId: string) => void;
  currentUser: User | null;
  onUserCardClick?: (userName: string) => void;
  christmasSettings?: ChristmasDecorationSettings;
  onUpdateChristmasSettings?: (settings: ChristmasDecorationSettings) => void;
  notifications?: any[];
  onMarkAllAsRead?: () => void;
  onNotificationClick?: (notification: any) => void;
  onDeleteNotification?: (notificationId: string) => void;
  onDismissAll?: () => void;
  announcements?: Announcement[];
  onDismissAnnouncement?: (id: string) => void;
}

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
  onDismissAll,
  announcements = [],
  onDismissAnnouncement
}) => {
  // Local UI state
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [isChristmasModalOpen, setIsChristmasModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Use extracted hooks
  const {
    searchTerm, setSearchTerm,
    workloadFilter, setWorkloadFilter,
    sortBy, setSortBy,
    dateFilter, setDateFilter,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
    displayedUsers, setDisplayedUsers,
    getFilteredTasksByDate,
    USERS_PER_PAGE
  } = useDashboardFilters();

  const { analyzedUsers, dashboardStats } = useWorkloadAnalysis({
    users,
    tasks,
    getFilteredTasksByDate
  });

  const {
    isLeaderboardOpen, setIsLeaderboardOpen,
    leaderboardPeriod, setLeaderboardPeriod,
    leaderboardData
  } = useLeaderboard({ users, tasks });

  const { shareState, openWeeklyShare, closeShare } = useTaskShare();

  // Task stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === Status.Done).length;
  const activeTasksCount = totalTasks - completedTasks;
  const urgentCount = tasks.filter(t => t.priority === Priority.Urgent && t.status !== Status.Done).length;

  // Filter dan sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = analyzedUsers;

    if (searchTerm) {
      filtered = filtered.filter(data =>
        data.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        data.user.jabatan?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (workloadFilter !== 'all') {
      filtered = filtered.filter(data => data.visuals.category === workloadFilter);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'workload': return b.score - a.score;
        case 'name': return a.userName.localeCompare(b.userName);
        case 'tasks': return b.activeCount - a.activeCount;
        case 'urgent': return b.urgentCount - a.urgentCount;
        case 'performance':
          if (b.performanceScore !== a.performanceScore) return b.performanceScore - a.performanceScore;
          return b.completionRate - a.completionRate;
        default: return b.score - a.score;
      }
    });

    return filtered;
  }, [analyzedUsers, searchTerm, workloadFilter, sortBy]);

  // Infinity scroll
  const visibleUsers = filteredAndSortedUsers.slice(0, displayedUsers);
  const hasMoreUsers = displayedUsers < filteredAndSortedUsers.length;

  const loadMore = useCallback(() => {
    if (hasMoreUsers && !isLoading) {
      setIsLoading(true);
      setTimeout(() => {
        setDisplayedUsers(prev => Math.min(prev + USERS_PER_PAGE, filteredAndSortedUsers.length));
        setIsLoading(false);
      }, 300);
    }
  }, [hasMoreUsers, isLoading, filteredAndSortedUsers.length, setDisplayedUsers, USERS_PER_PAGE]);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current || isLoading || !hasMoreUsers) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      if ((scrollTop + clientHeight) / scrollHeight > 0.8) loadMore();
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [loadMore, isLoading, hasMoreUsers]);

  // Active announcements
  const activeAnnouncements = announcements.filter(announcement => {
    const now = new Date();
    const isNotExpired = !announcement.expiresAt || new Date(announcement.expiresAt) > now;
    return announcement.isActive && isNotExpired;
  });

  return (
    <div ref={scrollContainerRef} className="p-4 md:p-6 h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <DashboardHeader
        currentUser={currentUser}
        onCreateStatus={onCreateStatus}
        onOpenChristmasSettings={() => setIsChristmasModalOpen(true)}
        notifications={notifications}
        onMarkAllAsRead={onMarkAllAsRead}
        onNotificationClick={onNotificationClick}
        onDeleteNotification={onDeleteNotification}
        onDismissAll={onDismissAll}
      />

      {/* Announcements */}
      {activeAnnouncements.length > 0 && (
        <div className="space-y-4">
          {activeAnnouncements.map(announcement => (
            <AnnouncementBanner
              key={announcement.id}
              announcement={announcement}
              onDismiss={onDismissAnnouncement ? () => onDismissAnnouncement(announcement.id) : undefined}
              canDismiss={false}
            />
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <DashboardStatsCards
        activeTasksCount={activeTasksCount}
        completedTasks={completedTasks}
        totalTasks={totalTasks}
        urgentCount={urgentCount}
        avgCompletionRate={dashboardStats.avgCompletionRate}
        highPerformers={dashboardStats.highPerformers}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
      />

      {/* Workload Distribution */}
      <WorkloadDistribution
        distribution={dashboardStats.workloadDistribution}
        avgCompletionRate={dashboardStats.avgCompletionRate}
        totalUpcomingDeadlines={dashboardStats.totalUpcomingDeadlines}
        totalUsers={users.length}
      />

      {/* Si Paling Section */}
      <SiPalingSection tasks={tasks} users={users} />

      {/* Filters */}
      <DashboardFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        workloadFilter={workloadFilter}
        setWorkloadFilter={setWorkloadFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        visibleCount={visibleUsers.length}
        filteredCount={filteredAndSortedUsers.length}
        totalCount={users.length}
      />

      {/* User Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 mb-6">
        {visibleUsers.map(data => (
          <UserWorkloadCard
            key={data.userName}
            data={data}
            userStatus={userStatuses.find(s => s.userId === data.user.id)}
            isHovered={hoveredCard === data.user.id}
            christmasSettings={christmasSettings}
            currentUser={currentUser}
            onHover={setHoveredCard}
            onClick={() => onUserCardClick?.(data.userName)}
            onDeleteStatus={onDeleteStatus}
            onShare={openWeeklyShare}
          />
        ))}
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-200">
            <RefreshCw size={16} className="animate-spin text-gov-600" />
            <span className="text-sm text-slate-600 font-medium">Memuat data...</span>
          </div>
        </div>
      )}

      {/* End of Data */}
      {!hasMoreUsers && filteredAndSortedUsers.length > USERS_PER_PAGE && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <CheckCircle2 size={16} className="text-green-600" />
            <span className="text-sm text-slate-600">Menampilkan semua {filteredAndSortedUsers.length} anggota tim</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredAndSortedUsers.length === 0 && (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-600 mb-2">Tidak ada anggota tim ditemukan</h3>
          <p className="text-slate-500 mb-4">Coba ubah filter atau kata kunci pencarian</p>
          <button
            onClick={() => { setSearchTerm(''); setWorkloadFilter('all'); }}
            className="px-4 py-2 bg-gov-600 text-white rounded-lg font-medium hover:bg-gov-700 transition-colors"
          >
            Reset Filter
          </button>
        </div>
      )}

      {/* Modals */}
      {isChristmasModalOpen && onUpdateChristmasSettings && (
        <ChristmasSettingsModal
          isOpen={isChristmasModalOpen}
          onClose={() => setIsChristmasModalOpen(false)}
          currentSettings={christmasSettings}
          onSave={onUpdateChristmasSettings}
          currentUserName={currentUser?.name || 'Admin'}
        />
      )}

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        leaderboardData={leaderboardData}
        period={leaderboardPeriod}
        setPeriod={setLeaderboardPeriod}
      />

      <ShareModal
        isOpen={shareState.isWeeklyShareOpen}
        onClose={closeShare}
        tasks={tasks}
        users={users}
        currentUser={currentUser}
      />

      {shareState.selectedTask && (
        <TaskShareModal
          isOpen={shareState.isTaskShareOpen}
          onClose={closeShare}
          task={shareState.selectedTask}
          users={users}
        />
      )}
    </div>
  );
};

export default Dashboard;
