// src/AppContent.tsx - UI rendering and handler functions
// State comes from contexts (Auth, Data, UI)
import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense, useTransition } from 'react';
import { supabase } from './lib/supabaseClient';
import { Plus, Search, Layout, CalendarRange, Briefcase, FileText, ListTodo, Loader2 } from 'lucide-react';
import { Task, Status, Category, Priority, FilterState, User, ProjectDefinition, ViewMode, Feedback, FeedbackCategory, FeedbackStatus, DocumentTemplate, UserStatus, Attachment, Comment, ChristmasDecorationSettings, Announcement, DataInventoryItem, TaskActivity, Meeting, MeetingInviter } from '../types';
import Sidebar from './components/Sidebar';
import TaskCard from './components/TaskCard';
import LoginPage from './components/LoginPage';
import NotificationIcon from './components/NotificationIcon';
import { useNotifications } from './hooks/useNotifications';
import UserAvatar from './components/UserAvatar';
import SearchableSelect from './components/SearchableSelect';
import MobileNav from './components/MobileNav';
import ModalsContainer from './components/ModalsContainer';
import { useTaskShare } from './hooks/useTaskShare';
import { useDebounce } from './hooks/useDebounce';
import { useAuth } from './contexts/AuthContext';
// import { useData } from './contexts/DataContext'; // Deprecated
import { useTasks } from './contexts/TasksContext';
import { useProjects } from './contexts/ProjectsContext';
import { useMeetings } from './contexts/MeetingsContext';
import { useUsers } from './contexts/UsersContext';
import { useMasterData } from './contexts/MasterDataContext';
import { useAppContent } from './contexts/AppContentContext';
import { useUI } from './contexts/UIContext';
import { useEpics } from './contexts/EpicsContext';
import { useUserHandlers } from './hooks/useUserHandlers';
import { useTaskHandlers } from './hooks/useTaskHandlers';
import { useProjectHandlers } from './hooks/useProjectHandlers';
import { useEpicHandlers } from './hooks/useEpicHandlers';
import { useMeetingHandlers } from './hooks/useMeetingHandlers';
import { useMasterDataHandlers } from './hooks/useMasterDataHandlers';
import { useTemplateHandlers } from './hooks/useTemplateHandlers';
import { useFeedbackHandlers } from './hooks/useFeedbackHandlers';
import { useMiscHandlers } from './hooks/useMiscHandlers';
import { useProjectHelpers } from './hooks/useProjectHelpers';
import KanbanColumn from './components/KanbanColumn';

// Lazy loaded heavy components
const Dashboard = lazy(() => import('./components/Dashboard'));
const ProjectOverview = lazy(() => import('./components/ProjectOverview'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const WallOfFeedback = lazy(() => import('./components/WallOfFeedback'));
import TimelineView from './components/TimelineView'; // Static import for performance
// const TimelineView = lazy(() => import('./components/TimelineView')); // Removed lazy
const DocumentTemplates = lazy(() => import('./components/DocumentTemplates'));
const DataInventory = lazy(() => import('./components/DataInventory'));
const AnnouncementManager = lazy(() => import('./components/AnnouncementManager'));
const MeetingCalendar = lazy(() => import('./components/MeetingCalendar'));
const AddMeetingModal = lazy(() => import('./components/AddMeetingModal'));
const MeetingViewModal = lazy(() => import('./components/MeetingViewModal'));
const ActivityLogPage = lazy(() => import('./components/ActivityLogPage'));

// Loading fallback
const PageLoader: React.FC = () => (
  <div className="flex-1 flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="animate-spin text-gov-600" size={40} />
      <span className="text-sm text-slate-500">Memuat...</span>
    </div>
  </div>
);


const AppContent: React.FC = () => {
  const [isPending, startTransition] = useTransition();

  // ===== FROM AUTH CONTEXT =====
  const {
    session,
    currentUser,
    setCurrentUser,
    isLoadingAuth,
    authError,
    handleLogin,
    handleLogout
  } = useAuth();

  // ===== DATA HOOKS (Migrated from useData) =====
  const {
    tasks, setTasks,
    comments, setComments,
    taskActivities, setTaskActivities,
    allUniquePics,
    getMeetingsAsTasks,
    getFilteredTasks
  } = useTasks();

  const { projects, setProjects } = useProjects();
  const { epics, setEpics, getEpicsByProject, getEpicProgress } = useEpics();

  const {
    meetings, setMeetings,
    meetingInviters, setMeetingInviters
  } = useMeetings();

  const {
    allUsers, setAllUsers,
    taskAssignableUsers,
    userStatuses, setUserStatuses,
    fetchUsers // Use fetchUsers instead of fetchAllData
  } = useUsers();

  const {
    jabatanList, setJabatanList,
    subCategories, setSubCategories,
    masterCategories, setMasterCategories,
    masterSubCategories, setMasterSubCategories,
    categorySubcategoryRelations, setCategorySubcategoryRelations
  } = useMasterData();

  const {
    feedbacks, setFeedbacks,
    documentTemplates, setDocumentTemplates,
    templateFilePaths, setTemplateFilePaths,
    announcements, setAnnouncements,
    dataInventory, setDataInventory,
    christmasSettings, setChristmasSettings
  } = useAppContent();

  const fetchAllData = useCallback(async () => {
    // Re-implement fetchAllData if needed, or rely on individual context triggers
    // For manual refresh scenarios (like MiscHandlers)
    await fetchUsers();
    // ... others usually fetch on mount
  }, [fetchUsers]);

  // ===== UI STATE FROM CONTEXT =====
  const {
    // Shared State that was in useData
    activeTab, setActiveTab,
    filters, setFilters,
    viewMode, setViewMode,
    debouncedSearch, setDebouncedSearch,

    // Modal States
    isModalOpen, setIsModalOpen,
    isProjectModalOpen, setIsProjectModalOpen,
    isStatusModalOpen, setIsStatusModalOpen,
    isTaskViewModalOpen, setIsTaskViewModalOpen,
    isAnnouncementModalOpen, setIsAnnouncementModalOpen,
    isProfilePhotoModalOpen, setIsProfilePhotoModalOpen,
    isMeetingModalOpen, setIsMeetingModalOpen,
    isMeetingViewModalOpen, setIsMeetingViewModalOpen,
    isMeetingFromTask, setIsMeetingFromTask,
    // Editing States
    editingTask, setEditingTask,
    viewingTask, setViewingTask,
    editingProject, setEditingProject,
    editingAnnouncement, setEditingAnnouncement,
    editingMeeting, setEditingMeeting,
    viewingMeeting, setViewingMeeting,
    // Other UI State
    draggedTaskId, setDraggedTaskId,
    suratSubTab, setSuratSubTab,
    projectRefreshTrigger, triggerProjectRefresh,
    // Epic Modal States
    isEpicModalOpen, setIsEpicModalOpen,
    editingEpic, setEditingEpic,
    defaultEpicProjectId, setDefaultEpicProjectId,
    // Notification & Confirm Modals
    notificationModal, showNotification, hideNotification,
    confirmModal, showConfirm, hideConfirm
  } = useUI();

  // ===== COMPUTED DATA =====
  // Compute meetingsAsTasks
  const meetingsAsTasks = useMemo(() =>
    getMeetingsAsTasks(meetings),
    [getMeetingsAsTasks, meetings]
  );

  // Compute allTasksWithMeetings
  const allTasksWithMeetings = useMemo(() =>
    [...tasks, ...meetingsAsTasks],
    [tasks, meetingsAsTasks]
  );

  // Compute filteredTasks
  const filteredTasks = useMemo(() =>
    getFilteredTasks(
      allTasksWithMeetings,
      debouncedSearch,
      {
        category: filters.category,
        pic: filters.pic,
        priority: filters.priority,
        status: filters.status,
        projectId: filters.projectId,
        epicId: filters.epicId
      },
      activeTab
    ),
    [getFilteredTasks, allTasksWithMeetings, debouncedSearch, filters, activeTab]
  );

  // Alias for hooks that expect setProjectRefreshTrigger
  const setProjectRefreshTrigger = useCallback((fn: (prev: number) => number) => {
    triggerProjectRefresh();
  }, [triggerProjectRefresh]);

  // Share functionality
  const { shareState, openTaskShare, closeShare } = useTaskShare();

  const columns = Object.values(Status);

  // Reset category filter ketika pindah tab yang bukan 'Semua Task'
  useEffect(() => {
    if (activeTab !== 'Semua Task' && filters.category !== 'All') {
      setFilters(prev => ({ ...prev, category: 'All' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ===== HOOKS - imported handler functions =====
  // Navigation helpers (needed for useNotifications)
  const handleTaskNavigation = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setViewingTask(task);
      setIsTaskViewModalOpen(true);
      // Don't change tab - just show the modal on current page
    }
  }, [tasks]);

  const handleMeetingNavigation = useCallback((meetingId: string) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (meeting) {
      setViewingMeeting(meeting);
      setIsMeetingViewModalOpen(true);
      // Don't change tab - just show the modal on current page
    }
  }, [meetings]);

  // Modal helper
  const openNewTaskModal = useCallback(() => {
    setEditingTask(null);
    setIsModalOpen(true);
  }, []);

  // Notifications hook (needs navigation callbacks)
  const {
    notifications,
    createAssignmentNotification,
    createCommentNotification,
    createMentionNotification,
    createMeetingNotification,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
    deleteNotification,
    dismissAllNotifications
  } = useNotifications({
    currentUser,
    tasks,
    onTaskNavigation: handleTaskNavigation,
    onMeetingNavigation: handleMeetingNavigation
  });

  // User handlers
  const {
    handleAddUser,
    handleEditUser,
    handleDeleteUser,
    handleUploadProfilePhoto,
    handleRemoveProfilePhoto,
    handleUserCardClick
  } = useUserHandlers({
    currentUser,
    allUsers,
    setAllUsers,
    setCurrentUser,
    fetchAllData,
    showNotification,
    hideNotification,
    setActiveTab,
    setFilters
  });

  // Task handlers
  const {
    checkEditPermission,
    checkDeletePermission,
    logTaskActivity,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleSaveTask,
    handleDeleteTask,
    handleStatusChangeFromView,
    handleAddComment,
    handleDeleteComment,
    handleTaskClick,
    handleEditClick,
    handleEditFromView,
    // Checklist handlers
    handleAddChecklistItem,
    handleToggleChecklistItem,
    handleRemoveChecklistItem,
    handleUpdateChecklistItem
  } = useTaskHandlers({
    currentUser,
    tasks,
    setTasks,
    comments,
    setComments,
    taskActivities,
    setTaskActivities,
    allUsers,
    editingTask,
    setEditingTask,
    viewingTask,
    setViewingTask,
    draggedTaskId,
    setDraggedTaskId,
    setIsModalOpen,
    setIsTaskViewModalOpen,
    setProjectRefreshTrigger,
    showNotification,
    createAssignmentNotification,
    createCommentNotification,
    createMentionNotification,
    meetings,
    setViewingMeeting,
    setIsMeetingViewModalOpen
  });

  // Project handlers
  const {
    checkProjectEditPermission,
    checkProjectDeletePermission,
    handleSaveProject,
    handleDeleteProject,
    handleEditProject,
    handleCreateProject
  } = useProjectHandlers({
    currentUser,
    projects,
    setProjects,
    editingProject,
    setEditingProject,
    setIsProjectModalOpen,
    setProjectRefreshTrigger,
    showNotification
  });

  // Epic handlers
  const epicHandlers = useEpicHandlers({
    currentUser,
    epics,
    setEpics,
    editingEpic,
    setEditingEpic,
    setIsEpicModalOpen,
    setProjectRefreshTrigger,
    showNotification
  });

  // Meeting handlers
  const {
    checkMeetingEditPermission,
    checkMeetingDeletePermission,
    handleAddMeeting,
    handleBackToTask,
    handleEditMeeting,
    handleViewMeeting,
    handleEditMeetingFromView,
    handleSaveMeeting,
    handleDeleteMeeting,
    handleDeleteMeetingFromView,
    handleAddComment: handleAddMeetingComment,
    handleDeleteComment: handleDeleteMeetingComment
  } = useMeetingHandlers({
    currentUser,
    meetings,
    setMeetings,
    meetingInviters,
    setMeetingInviters,
    editingMeeting,
    setEditingMeeting,
    viewingMeeting,
    setViewingMeeting,
    setIsMeetingModalOpen,
    setIsMeetingViewModalOpen,
    setIsMeetingFromTask,
    setIsModalOpen,
    showNotification,
    allUsers,
    createMentionNotification,
    createMeetingNotification
  });

  // Master data handlers  
  const {
    handleAddJabatan,
    handleDeleteJabatan,
    handleAddSubCategory,
    handleDeleteSubCategory,
    handleAddMasterCategory,
    handleUpdateMasterCategory,
    handleDeleteMasterCategory,
    handleAddMasterSubCategory,
    handleUpdateMasterSubCategory,
    handleDeleteMasterSubCategory
  } = useMasterDataHandlers({
    jabatanList,
    setJabatanList,
    subCategories,
    setSubCategories,
    masterCategories,
    setMasterCategories,
    masterSubCategories,
    setMasterSubCategories,
    categorySubcategoryRelations,
    setCategorySubcategoryRelations
  });

  // Template handlers
  const {
    handleAddTemplate,
    handleDeleteTemplate,
    handleDownloadTemplate
  } = useTemplateHandlers({
    currentUser,
    documentTemplates,
    setDocumentTemplates,
    templateFilePaths,
    setTemplateFilePaths
  });

  // Feedback handlers
  const {
    handleAddFeedback,
    handleUpdateFeedbackStatus,
    handleDeleteFeedback,
    handleVoteFeedback
  } = useFeedbackHandlers({
    currentUser,
    feedbacks,
    setFeedbacks,
    showNotification
  });

  // Misc handlers (christmas, announcement, data inventory, status)
  const {
    handleUpdateChristmasSettings,
    handleCreateAnnouncement,
    handleEditAnnouncement,
    handleSaveAnnouncement,
    handleDeleteAnnouncement,
    handleToggleAnnouncementActive,
    handleAddDataInventory,
    handleUpdateDataInventory,
    handleDeleteDataInventory,
    handleCreateStatus,
    handleSaveStatus,
    handleDeleteStatus
  } = useMiscHandlers({
    currentUser,
    announcements,
    setAnnouncements,
    dataInventory,
    setDataInventory,
    userStatuses,
    setUserStatuses,
    christmasSettings,
    setChristmasSettings,
    editingAnnouncement,
    setEditingAnnouncement,
    setIsAnnouncementModalOpen,
    setIsStatusModalOpen,
    showNotification,
    fetchAllData
  });

  // ProjectOverview and DocumentTemplates helper functions
  const { fetchProjects, fetchProjectTasks, fetchUniqueManagers, updatePinnedLinks } = useProjectHelpers();

  // DocumentTemplates helper - fix templates without file paths
  const fixLegacyTemplates = useCallback(async () => {
    for (const template of documentTemplates) {
      if (!template.filePath && !templateFilePaths[template.id]) {
        try {
          const { data: fileList } = await supabase.storage.from('document-templates').list();
          const matchingFile = fileList?.find(file => file.name.toLowerCase().includes(template.name.toLowerCase()));
          if (matchingFile) {
            await supabase.from('document_templates').update({ file_path: matchingFile.name }).eq('id', template.id);
            setDocumentTemplates(prev => prev.map(t => t.id === template.id ? { ...t, filePath: matchingFile.name } : t));
          }
        } catch (err) {
          console.error('Error fixing legacy template:', err);
        }
      }
    }
  }, [documentTemplates, templateFilePaths, setDocumentTemplates]);

  // ===== HANDLERS NOW IMPORTED FROM HOOKS =====
  // All handlers (handleAddUser, handleSaveTask, handleDeleteMeeting, etc.) 
  // are now provided by the imported hooks above. See:
  // - useUserHandlers: User CRUD + profile photo
  // - useTaskHandlers: Task CRUD + drag/drop + comments
  // - useProjectHandlers: Project CRUD
  // - useMeetingHandlers: Meeting CRUD
  // - useMasterDataHandlers: Jabatan + categories
  // - useTemplateHandlers: Document templates
  // - useFeedbackHandlers: Feedback CRUD + voting
  // - useMiscHandlers: Christmas + announcements + data inventory + status

  // meetingsAsTasks, allTasksWithMeetings, and filteredTasks now come from DataContext

  // --- Loading UI & Login rendering ---
  if (isLoadingAuth) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-gov-600" size={48} />
      </div>
    );
  }

  // Render Login if not authenticated or profile not loaded
  if (!session || !currentUser) {
    return <LoginPage onLogin={handleLogin} error={authError} />;
  }

  // --- Main App UI ---
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">

      {/* Mobile Navigation */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          startTransition(() => setActiveTab(tab));
          if (tab !== 'Surat & Dokumen') setSuratSubTab('Tasks');
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfilePhotoModalOpen(true)}
      />

      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          startTransition(() => setActiveTab(tab));
          if (tab !== 'Surat & Dokumen') setSuratSubTab('Tasks');
        }}
        currentUser={currentUser}
        users={allUsers}
        onSwitchUser={() => { }} // Disabled for real auth
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 ml-0 md:ml-64 flex flex-col h-screen overflow-hidden pt-14 pb-16 md:pt-0 md:pb-0 relative">
        {/* Global Loading Overlay for Transitions */}
        {isPending && (
          <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-gov-200 border-t-gov-600 rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-gov-700">Memuat tampilan...</span>
            </div>
          </div>
        )}

        {/* Top Header / Filter Bar - HIDDEN for special pages */}
        {activeTab !== 'Dashboard' && activeTab !== 'Project' && activeTab !== 'Master Data' && activeTab !== 'Saran Masukan' && activeTab !== 'Pengumuman' && activeTab !== 'Inventori Data' && activeTab !== 'Jadwal Kegiatan' && activeTab !== 'Activity Log' && (
          <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-3 sm:py-4 z-20 relative">
            <div className="flex flex-col gap-3 sm:gap-4 mb-3 sm:mb-4">
              {/* Title Section */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold text-slate-800">{activeTab}</h2>
                  <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">Kelola dan pantau aktivitas tim anda.</p>
                </div>

                {/* Notification Icon & Profile Photo */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <NotificationIcon
                    notifications={notifications}
                    onMarkAllAsRead={markAllAsRead}
                    onNotificationClick={handleNotificationClick}
                    onDeleteNotification={deleteNotification}
                    onDismissAll={dismissAllNotifications}
                  />
                  {currentUser && (
                    <div className="hidden md:block">
                      <UserAvatar
                        name={currentUser.name}
                        profilePhoto={currentUser.profilePhoto}
                        size="md"
                        onClick={() => setIsProfilePhotoModalOpen(true)}
                        showEditHint
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons Row - All buttons in horizontal alignment */}
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* View Switcher */}
                  {!(activeTab === 'Surat & Dokumen' && suratSubTab === 'Templates') && (
                    <div className="flex bg-slate-100 p-0.5 sm:p-1 rounded-lg">
                      <button
                        onClick={() => startTransition(() => setViewMode('Board'))}
                        className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${viewMode === 'Board' ? 'bg-white text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <Layout size={14} /> <span className="hidden sm:inline">Board</span>
                      </button>
                      <button
                        onClick={() => startTransition(() => setViewMode('Timeline'))}
                        className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${viewMode === 'Timeline' ? 'bg-white text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <CalendarRange size={14} /> <span className="hidden sm:inline">Timeline</span>
                      </button>
                    </div>
                  )}

                  {/* Surat & Dokumen Sub-Nav */}
                  {activeTab === 'Surat & Dokumen' && (
                    <div className="flex bg-slate-100 p-0.5 sm:p-1 rounded-lg">
                      <button
                        onClick={() => startTransition(() => setSuratSubTab('Tasks'))}
                        className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${suratSubTab === 'Tasks' ? 'bg-white text-gov-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <ListTodo size={14} /> <span className="hidden sm:inline">Daftar Surat/Task</span><span className="sm:hidden">Task</span>
                      </button>
                      <button
                        onClick={() => startTransition(() => setSuratSubTab('Templates'))}
                        className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${suratSubTab === 'Templates' ? 'bg-white text-gov-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <FileText size={14} /> <span className="hidden sm:inline">Template Dokumen</span><span className="sm:hidden">Template</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons - Only show "Tambah Task" for non-project tabs */}
                {!(activeTab === 'Surat & Dokumen' && suratSubTab === 'Templates') && (
                  <div className="flex gap-2">
                    <button
                      onClick={openNewTaskModal}
                      className="flex items-center gap-1 sm:gap-2 bg-gov-600 text-white px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold hover:bg-gov-700 hover:shadow-lg hover:shadow-gov-200 transition-all transform active:scale-95 text-xs sm:text-sm"
                    >
                      <Plus size={14} />
                      <span className="hidden sm:inline">Tambah Task</span>
                      <span className="sm:hidden">Task</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Filter Bar */}
            {!(activeTab === 'Surat & Dokumen' && suratSubTab === 'Templates') && (
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Cari task..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white transition-all"
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar items-center">
                  {/* CATEGORY FILTER - hanya tampil di halaman "Semua Task" */}
                  {/* CATEGORY FILTER - hanya tampil di halaman "Semua Task" */}
                  {activeTab === 'Semua Task' ? (
                    <SearchableSelect
                      options={Object.values(Category).map(c => ({ value: c, label: c }))}
                      value={filters.category === 'All' ? '' : filters.category}
                      onChange={(val) => setFilters(prev => ({ ...prev, category: (val || 'All') as Category | 'All' }))}
                      placeholder="Kategori"
                      emptyOption="Semua Kategori"
                      className="min-w-[100px]"
                    />
                  ) : null}

                  <SearchableSelect
                    options={projects.map(p => ({ value: p.id, label: p.name }))}
                    value={filters.projectId === 'All' ? '' : filters.projectId}
                    onChange={(val) => setFilters(prev => ({ ...prev, projectId: val || 'All', epicId: 'All' }))}
                    placeholder="Project"
                    emptyOption="Semua Project"
                    className="min-w-[120px]"
                  />

                  {/* Epic Filter - only show when a project is selected */}
                  {filters.projectId !== 'All' && (
                    <SearchableSelect
                      options={getEpicsByProject(filters.projectId).map(e => ({ value: e.id, label: e.name }))}
                      value={filters.epicId === 'All' ? '' : filters.epicId}
                      onChange={(val) => setFilters(prev => ({ ...prev, epicId: val || 'All' }))}
                      placeholder="Epic"
                      emptyOption="Semua Epic"
                      className="min-w-[100px]"
                    />
                  )}

                  <SearchableSelect
                    options={allUniquePics.map(pic => ({ value: pic, label: pic }))}
                    value={filters.pic === 'All' ? '' : filters.pic}
                    onChange={(val) => setFilters(prev => ({ ...prev, pic: val || 'All' }))}
                    placeholder="PIC"
                    emptyOption="Semua PIC"
                    className="min-w-[100px]"
                  />

                  <SearchableSelect
                    options={Object.values(Priority).map(p => ({ value: p, label: p }))}
                    value={filters.priority === 'All' ? '' : filters.priority}
                    onChange={(val) => setFilters(prev => ({ ...prev, priority: (val || 'All') as Priority | 'All' }))}
                    placeholder="Prioritas"
                    emptyOption="Semua Prioritas"
                    className="min-w-[100px]"
                  />
                </div>
              </div>
            )}
          </header>
        )}
        {/* Content Area */}
        {activeTab === 'Dashboard' ? (
          <Dashboard
            tasks={allTasksWithMeetings}
            users={taskAssignableUsers}
            userStatuses={userStatuses}
            onCreateStatus={handleCreateStatus}
            onDeleteStatus={handleDeleteStatus}
            currentUser={currentUser}
            onUserCardClick={handleUserCardClick}
            christmasSettings={christmasSettings}
            onUpdateChristmasSettings={handleUpdateChristmasSettings}
            notifications={notifications}
            onMarkAllAsRead={markAllAsRead}
            onNotificationClick={handleNotificationClick}
            onDeleteNotification={deleteNotification}
            onDismissAll={dismissAllNotifications}
            announcements={announcements}
          />
        ) : activeTab === 'Project' ? (
          <ProjectOverview
            onTaskClick={handleTaskClick}
            onEditProject={(project) => {
              // Set editing project and open modal
              setEditingProject(project);
              setIsProjectModalOpen(true);
            }}
            onDeleteProject={async (projectId) => {
              // Check if project has tasks
              const projectTasks = tasks.filter(t => t.projectId === projectId);
              if (projectTasks.length > 0) {
                showNotification(
                  'Tidak Dapat Menghapus Project',
                  `Project ini masih memiliki ${projectTasks.length} task aktif.Hapus atau pindahkan task terlebih dahulu sebelum menghapus project.`,
                  'warning'
                );
                return;
              }

              // Find project name for confirmation
              const project = projects.find(p => p.id === projectId);
              const projectName = project?.name || 'Project';

              // Show confirmation modal
              showConfirm(
                'Hapus Project',
                `Apakah Anda yakin ingin menghapus project "${projectName}" ?\n\nTindakan ini tidak dapat dibatalkan.`,
                async () => {
                  try {
                    const { error } = await supabase.from('projects').delete().eq('id', projectId);
                    if (!error) {
                      setProjects(prev => prev.filter(p => p.id !== projectId));
                      setProjectRefreshTrigger(prev => prev + 1); // Trigger refresh
                      showNotification('Project Berhasil Dihapus!', `Project "${projectName}" berhasil dihapus.`, 'success');
                    } else {
                      showNotification('Gagal Hapus Project', error.message || 'Terjadi kesalahan saat menghapus project.', 'error');
                    }
                  } catch (error: any) {
                    showNotification('Kesalahan Tidak Terduga', `Terjadi kesalahan: ${error.message} `, 'error');
                  }
                },
                'error',
                'Hapus',
                'Batal'
              );
            }}
            onCreateProject={() => {
              setEditingProject(null);
              setIsProjectModalOpen(true);
            }}
            canManageProjects={currentUser?.role === 'Super Admin' || currentUser?.role === 'Atasan'}
            currentUserName={currentUser?.name}
            refreshTrigger={projectRefreshTrigger}
            fetchProjects={fetchProjects}
            fetchProjectTasks={fetchProjectTasks}
            fetchUniqueManagers={fetchUniqueManagers}
            onUpdatePinnedLinks={updatePinnedLinks}
            users={allUsers}
            meetings={meetings}
            allTasks={tasks}
            epics={epics}
            getEpicsByProject={getEpicsByProject}
            getEpicProgress={getEpicProgress}
            onEpicClick={(epic) => {
              // Handle opening epic details or filtering by epic
            }}
            onCreateEpic={(projectId) => {
              setDefaultEpicProjectId(projectId || null);
              epicHandlers.handleCreateEpic(projectId);
            }}
            onEditEpic={epicHandlers.handleEditEpic}
            onDeleteEpic={epicHandlers.handleDeleteEpic}
          />
        ) : activeTab === 'Saran Masukan' ? (
          <WallOfFeedback
            feedbacks={feedbacks || []}
            currentUser={currentUser}
            onAddFeedback={handleAddFeedback}
            onVote={handleVoteFeedback}
            onDeleteFeedback={handleDeleteFeedback}
            onUpdateStatus={handleUpdateFeedbackStatus}
          />
        ) : activeTab === 'Pengumuman' ? (
          <div className="p-6 h-full overflow-y-auto bg-slate-50">
            <AnnouncementManager
              announcements={announcements}
              onCreateAnnouncement={handleCreateAnnouncement}
              onEditAnnouncement={handleEditAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
              onToggleActive={handleToggleAnnouncementActive}
              currentUser={currentUser}
            />
          </div>
        ) : activeTab === 'Jadwal Kegiatan' ? (
          <MeetingCalendar
            meetings={meetings}
            users={taskAssignableUsers}
            projects={projects}
            currentUser={currentUser}
            onAddMeeting={() => handleAddMeeting(false)}
            onEditMeeting={handleEditMeeting}
            onViewMeeting={handleViewMeeting}
          />
        ) : activeTab === 'Inventori Data' ? (
          <DataInventory
            items={dataInventory}
            currentUser={currentUser}
            onAddItem={handleAddDataInventory}
            onUpdateItem={handleUpdateDataInventory}
            onDeleteItem={handleDeleteDataInventory}
          />
        ) : activeTab === 'Activity Log' ? (
          <Suspense fallback={<PageLoader />}>
            <ActivityLogPage
              currentUser={currentUser}
              users={allUsers}
              projects={projects}
            />
          </Suspense>
        ) : activeTab === 'Master Data' ? (
          <UserManagement
            users={allUsers}
            currentUser={currentUser}
            onAddUser={handleAddUser}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            jabatanList={jabatanList}
            onAddJabatan={handleAddJabatan}
            onDeleteJabatan={handleDeleteJabatan}
            subCategories={subCategories}
            onAddSubCategory={handleAddSubCategory}
            onDeleteSubCategory={handleDeleteSubCategory}
            masterCategories={masterCategories}
            masterSubCategories={masterSubCategories}
            categorySubcategoryRelations={categorySubcategoryRelations}
            onAddMasterCategory={handleAddMasterCategory}
            onUpdateMasterCategory={handleUpdateMasterCategory}
            onDeleteMasterCategory={handleDeleteMasterCategory}
            onAddMasterSubCategory={handleAddMasterSubCategory}
            onUpdateMasterSubCategory={handleUpdateMasterSubCategory}
            onDeleteMasterSubCategory={handleDeleteMasterSubCategory}
          />
        ) : activeTab === 'Surat & Dokumen' && suratSubTab === 'Templates' ? (
          <DocumentTemplates
            templates={documentTemplates}
            currentUser={currentUser}
            onAddTemplate={handleAddTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onDownloadTemplate={handleDownloadTemplate}
            onFixLegacyTemplates={fixLegacyTemplates}
          />
        ) : (
          <div className="flex-1 overflow-x-auto overflow-y-hidden bg-slate-50 p-3 sm:p-6">

            {/* Board View */}
            {viewMode === 'Board' ? (
              <div className="flex h-full gap-3 sm:gap-6 min-w-[900px] sm:min-w-[1200px]">
                {columns.map(status => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    tasks={filteredTasks.filter(t => t.status === status)}
                    projects={projects}
                    users={allUsers}
                    allTasks={tasks}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragStart={handleDragStart}
                    onTaskClick={handleTaskClick}
                    onTaskShare={openTaskShare}
                    checkEditPermission={checkEditPermission}
                  />
                ))}
              </div>
            ) : (
              <TimelineView
                tasks={filteredTasks}
                projects={projects}
                users={taskAssignableUsers}
                categories={masterCategories}
                subCategories={masterSubCategories}
                onTaskClick={handleTaskClick}
                epics={epics}
                epicFilter={filters.epicId}
                projectFilter={filters.projectId}
              />
            )}
          </div>
        )}

      </main>

      {/* All Modals - extracted to ModalsContainer */}
      < ModalsContainer
        currentUser={currentUser}
        // Task View Modal
        isTaskViewModalOpen={isTaskViewModalOpen}
        setIsTaskViewModalOpen={setIsTaskViewModalOpen}
        viewingTask={viewingTask}
        setViewingTask={setViewingTask}
        checkEditPermission={checkEditPermission}
        handleEditFromView={handleEditFromView}
        comments={comments}
        taskActivities={taskActivities}
        handleAddComment={handleAddComment}
        handleDeleteComment={handleDeleteComment}
        handleStatusChangeFromView={handleStatusChangeFromView}
        // Checklist handlers
        handleAddChecklistItem={handleAddChecklistItem}
        handleToggleChecklistItem={handleToggleChecklistItem}
        handleRemoveChecklistItem={handleRemoveChecklistItem}
        handleUpdateChecklistItem={handleUpdateChecklistItem}
        // Add Task Modal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        editingTask={editingTask}
        setEditingTask={setEditingTask}
        handleSaveTask={handleSaveTask}
        handleDeleteTask={handleDeleteTask}
        checkDeletePermission={checkDeletePermission}
        handleAddMeeting={handleAddMeeting}
        // Common data
        projects={projects}
        taskAssignableUsers={taskAssignableUsers}
        allUsers={allUsers}
        subCategories={subCategories}
        masterCategories={masterCategories}
        masterSubCategories={masterSubCategories}
        categorySubcategoryRelations={categorySubcategoryRelations}
        allTasks={tasks}
        epics={epics}
        // Epic Modal
        isEpicModalOpen={isEpicModalOpen}
        setIsEpicModalOpen={setIsEpicModalOpen}
        editingEpic={editingEpic}
        setEditingEpic={setEditingEpic}
        defaultEpicProjectId={defaultEpicProjectId}
        handleSaveEpic={epicHandlers.handleSaveEpic}
        handleDeleteEpic={epicHandlers.handleDeleteEpic}
        // Project Modal
        isProjectModalOpen={isProjectModalOpen}
        setIsProjectModalOpen={setIsProjectModalOpen}
        editingProject={editingProject}
        setEditingProject={setEditingProject}
        handleSaveProject={handleSaveProject}
        // Status Modal
        isStatusModalOpen={isStatusModalOpen}
        setIsStatusModalOpen={setIsStatusModalOpen}
        handleSaveStatus={handleSaveStatus}
        // Profile Photo Modal
        isProfilePhotoModalOpen={isProfilePhotoModalOpen}
        setIsProfilePhotoModalOpen={setIsProfilePhotoModalOpen}
        handleUploadProfilePhoto={handleUploadProfilePhoto}
        handleRemoveProfilePhoto={handleRemoveProfilePhoto}
        // Notification Modal
        notificationModal={notificationModal}
        hideNotification={hideNotification}
        // Confirm Modal
        confirmModal={confirmModal}
        hideConfirm={hideConfirm}
        // Announcement Modal
        isAnnouncementModalOpen={isAnnouncementModalOpen}
        setIsAnnouncementModalOpen={setIsAnnouncementModalOpen}
        editingAnnouncement={editingAnnouncement}
        setEditingAnnouncement={setEditingAnnouncement}
        handleSaveAnnouncement={handleSaveAnnouncement}
        // Task Share Modal
        shareState={shareState}
        closeShare={closeShare}
        // Meeting View Modal
        isMeetingViewModalOpen={isMeetingViewModalOpen}
        setIsMeetingViewModalOpen={setIsMeetingViewModalOpen}
        viewingMeeting={viewingMeeting}
        setViewingMeeting={setViewingMeeting}
        checkMeetingEditPermission={checkMeetingEditPermission}
        checkMeetingDeletePermission={checkMeetingDeletePermission}
        handleEditMeetingFromView={handleEditMeetingFromView}
        handleDeleteMeetingFromView={handleDeleteMeetingFromView}
        handleAddMeetingComment={(mId, c) => handleAddMeetingComment(mId, c, allUsers, createMentionNotification, createCommentNotification)}
        handleDeleteMeetingComment={handleDeleteMeetingComment}
        // Meeting Edit Modal
        isMeetingModalOpen={isMeetingModalOpen}
        setIsMeetingModalOpen={setIsMeetingModalOpen}
        editingMeeting={editingMeeting}
        setEditingMeeting={setEditingMeeting}
        isMeetingFromTask={isMeetingFromTask}
        setIsMeetingFromTask={setIsMeetingFromTask}
        handleSaveMeeting={handleSaveMeeting}
        handleDeleteMeeting={handleDeleteMeeting}
        meetingInviters={meetingInviters}
        handleBackToTask={handleBackToTask}
      />
    </div >
  );
};

// Export AppContent component - to be used within providers from App.tsx
export default AppContent;