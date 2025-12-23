// src/contexts/UIContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Task, ProjectDefinition, Announcement, FilterState, ViewMode, Meeting } from '../../types';

interface NotificationModalState {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
}

interface ConfirmModalState {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    onConfirm: () => void;
    confirmText: string;
    cancelText: string;
}

interface UIContextType {
    // Navigation
    activeTab: string;
    setActiveTab: (tab: string) => void;
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    suratSubTab: 'Tasks' | 'Templates';
    setSuratSubTab: (tab: 'Tasks' | 'Templates') => void;

    // Filters
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    resetFilters: () => void;

    // Debounced search
    debouncedSearch: string;
    setDebouncedSearch: React.Dispatch<React.SetStateAction<string>>;

    // Modal States
    isModalOpen: boolean;
    setIsModalOpen: (open: boolean) => void;
    isProjectModalOpen: boolean;
    setIsProjectModalOpen: (open: boolean) => void;
    isStatusModalOpen: boolean;
    setIsStatusModalOpen: (open: boolean) => void;
    isTaskViewModalOpen: boolean;
    setIsTaskViewModalOpen: (open: boolean) => void;
    isAnnouncementModalOpen: boolean;
    setIsAnnouncementModalOpen: (open: boolean) => void;
    isProfilePhotoModalOpen: boolean;
    setIsProfilePhotoModalOpen: (open: boolean) => void;

    // Meeting Modal States
    isMeetingModalOpen: boolean;
    setIsMeetingModalOpen: (open: boolean) => void;
    isMeetingViewModalOpen: boolean;
    setIsMeetingViewModalOpen: (open: boolean) => void;
    isMeetingFromTask: boolean;
    setIsMeetingFromTask: (isFromTask: boolean) => void;

    // Editing States
    editingTask: Task | null;
    setEditingTask: (task: Task | null) => void;
    viewingTask: Task | null;
    setViewingTask: (task: Task | null) => void;
    editingProject: ProjectDefinition | null;
    setEditingProject: (project: ProjectDefinition | null) => void;
    editingAnnouncement: Announcement | null;
    setEditingAnnouncement: (announcement: Announcement | null) => void;
    editingMeeting: Meeting | null;
    setEditingMeeting: (meeting: Meeting | null) => void;
    viewingMeeting: Meeting | null;
    setViewingMeeting: (meeting: Meeting | null) => void;

    // Drag State
    draggedTaskId: string | null;
    setDraggedTaskId: (id: string | null) => void;

    // Refresh Triggers
    projectRefreshTrigger: number;
    triggerProjectRefresh: () => void;

    // Notification Modal
    notificationModal: NotificationModalState;
    showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    hideNotification: () => void;

    // Confirm Modal
    confirmModal: ConfirmModalState;
    showConfirm: (
        title: string,
        message: string,
        onConfirm: () => void,
        type?: 'success' | 'error' | 'warning' | 'info',
        confirmText?: string,
        cancelText?: string
    ) => void;
    hideConfirm: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};

interface UIProviderProps {
    children: ReactNode;
}

const defaultFilters: FilterState = {
    search: '',
    category: 'All',
    pic: 'All',
    priority: 'All',
    status: 'All',
    projectId: 'All',
};

export const UIProvider: React.FC<UIProviderProps> = ({ children }) => {
    // Navigation
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [viewMode, setViewMode] = useState<ViewMode>('Board');
    const [suratSubTab, setSuratSubTab] = useState<'Tasks' | 'Templates'>('Tasks');

    // Filters
    const [filters, setFilters] = useState<FilterState>(defaultFilters);
    const resetFilters = useCallback(() => setFilters(defaultFilters), []);

    // Debounced Search
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');

    // Debounce effect
    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(filters.search);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [filters.search]);

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isTaskViewModalOpen, setIsTaskViewModalOpen] = useState(false);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [isProfilePhotoModalOpen, setIsProfilePhotoModalOpen] = useState(false);

    // Meeting Modal States
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
    const [isMeetingViewModalOpen, setIsMeetingViewModalOpen] = useState(false);
    const [isMeetingFromTask, setIsMeetingFromTask] = useState(false);

    // Editing States
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [viewingTask, setViewingTask] = useState<Task | null>(null);
    const [editingProject, setEditingProject] = useState<ProjectDefinition | null>(null);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
    const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
    const [viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);

    // Drag State
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

    // Refresh Triggers
    const [projectRefreshTrigger, setProjectRefreshTrigger] = useState(0);
    const triggerProjectRefresh = useCallback(() => {
        setProjectRefreshTrigger(prev => prev + 1);
    }, []);

    // Notification Modal
    const [notificationModal, setNotificationModal] = useState<NotificationModalState>({
        isOpen: false,
        title: '',
        message: '',
        type: 'success'
    });

    const showNotification = useCallback((
        title: string,
        message: string,
        type: 'success' | 'error' | 'warning' | 'info' = 'info'
    ) => {
        setNotificationModal({ isOpen: true, title, message, type });
    }, []);

    const hideNotification = useCallback(() => {
        setNotificationModal(prev => ({ ...prev, isOpen: false }));
    }, []);

    // Confirm Modal
    const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        onConfirm: () => { },
        confirmText: 'Konfirmasi',
        cancelText: 'Batal'
    });

    const showConfirm = useCallback((
        title: string,
        message: string,
        onConfirm: () => void,
        type: 'success' | 'error' | 'warning' | 'info' = 'warning',
        confirmText: string = 'Konfirmasi',
        cancelText: string = 'Batal'
    ) => {
        setConfirmModal({ isOpen: true, title, message, type, onConfirm, confirmText, cancelText });
    }, []);

    const hideConfirm = useCallback(() => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }, []);

    const value: UIContextType = {
        // Navigation
        activeTab, setActiveTab,
        viewMode, setViewMode,
        suratSubTab, setSuratSubTab,

        // Filters
        filters, setFilters, resetFilters,

        // Debounced Search
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

        // Drag State
        draggedTaskId, setDraggedTaskId,

        // Refresh Triggers
        projectRefreshTrigger, triggerProjectRefresh,

        // Notification Modal
        notificationModal, showNotification, hideNotification,

        // Confirm Modal
        confirmModal, showConfirm, hideConfirm
    };

    return (
        <UIContext.Provider value={value}>
            {children}
        </UIContext.Provider>
    );
};

export default UIContext;
