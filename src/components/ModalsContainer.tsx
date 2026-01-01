// src/components/ModalsContainer.tsx
// All application modals in one container to reduce AppContent size
import React, { lazy, Suspense } from 'react';
import { Task, User, ProjectDefinition, Comment, TaskActivity, Announcement, Meeting, MeetingInviter } from '../../types';

// Small modals - regular imports (keep synchronous for fast feedback)
import AddProjectModal from './AddProjectModal';
import StatusModal from './StatusModal';
import ProfilePhotoModal from './ProfilePhotoModal';
import NotificationModal from './NotificationModal';
import ConfirmModal from './ConfirmModal';

// Heavy modals - lazy loaded for better initial load performance
const TaskViewModal = lazy(() => import('./TaskViewModal'));
const AddTaskModal = lazy(() => import('./AddTaskModal'));
const TaskShareModal = lazy(() => import('./TaskShareModal'));
const AnnouncementModal = lazy(() => import('./AnnouncementModal'));
const MeetingViewModal = lazy(() => import('./MeetingViewModal'));
const AddMeetingModal = lazy(() => import('./AddMeetingModal'));

interface ModalsContainerProps {
    // Current User
    currentUser: User | null;

    // Task View Modal
    isTaskViewModalOpen: boolean;
    setIsTaskViewModalOpen: (open: boolean) => void;
    viewingTask: Task | null;
    setViewingTask: (task: Task | null) => void;
    checkEditPermission: (task: Task) => boolean;
    handleEditFromView: () => void;
    comments: Comment[];
    taskActivities: TaskActivity[];
    handleAddComment: (taskId: string, content: string) => Promise<void>;
    handleDeleteComment: (commentId: string) => Promise<void>;
    handleStatusChangeFromView: (taskId: string, newStatus: string) => Promise<void>;
    // Checklist handlers
    handleAddChecklistItem: (taskId: string, text: string) => Promise<void>;
    handleToggleChecklistItem: (taskId: string, checklistId: string) => Promise<void>;
    handleRemoveChecklistItem: (taskId: string, checklistId: string) => Promise<void>;
    handleUpdateChecklistItem: (taskId: string, checklistId: string, text: string) => Promise<void>;

    // Add Task Modal
    isModalOpen: boolean;
    setIsModalOpen: (open: boolean) => void;
    editingTask: Task | null;
    setEditingTask: (task: Task | null) => void;
    handleSaveTask: (task: Omit<Task, 'id'> | Task) => Promise<void>;
    handleDeleteTask: (taskId: string) => Promise<void>;
    checkDeletePermission: (task: Task) => boolean;
    handleAddMeeting: (fromTask?: boolean) => void;

    // Common data
    projects: ProjectDefinition[];
    taskAssignableUsers: User[];
    allUsers: User[];
    subCategories: string[];
    masterCategories: any[];
    masterSubCategories: any[];
    categorySubcategoryRelations: any[];
    allTasks: Task[]; // All tasks for dependency selection

    // Add Project Modal
    isProjectModalOpen: boolean;
    setIsProjectModalOpen: (open: boolean) => void;
    editingProject: ProjectDefinition | null;
    setEditingProject: (project: ProjectDefinition | null) => void;
    handleSaveProject: (project: Omit<ProjectDefinition, 'id'> | ProjectDefinition) => Promise<void>;

    // Status Modal
    isStatusModalOpen: boolean;
    setIsStatusModalOpen: (open: boolean) => void;
    handleSaveStatus: (status: any) => Promise<void>;

    // Profile Photo Modal
    isProfilePhotoModalOpen: boolean;
    setIsProfilePhotoModalOpen: (open: boolean) => void;
    handleUploadProfilePhoto: (file: File) => Promise<void>;
    handleRemoveProfilePhoto: () => Promise<void>;

    // Notification Modal
    notificationModal: {
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
    };
    hideNotification: () => void;

    // Confirm Modal
    confirmModal: {
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
        onConfirm: () => void;
        confirmText: string;
        cancelText: string;
    };
    hideConfirm: () => void;

    // Announcement Modal
    isAnnouncementModalOpen: boolean;
    setIsAnnouncementModalOpen: (open: boolean) => void;
    editingAnnouncement: Announcement | null;
    setEditingAnnouncement: (announcement: Announcement | null) => void;
    handleSaveAnnouncement: (announcement: any) => Promise<void>;

    // Task Share Modal
    shareState: {
        isTaskShareOpen: boolean;
        selectedTask: Task | null;
    };
    closeShare: () => void;

    // Meeting View Modal
    isMeetingViewModalOpen: boolean;
    setIsMeetingViewModalOpen: (open: boolean) => void;
    viewingMeeting: Meeting | null;
    setViewingMeeting: (meeting: Meeting | null) => void;
    checkMeetingEditPermission: (meeting: Meeting) => boolean;
    checkMeetingDeletePermission: (meeting: Meeting) => boolean;
    handleEditMeetingFromView: () => void;
    handleDeleteMeetingFromView: () => void;
    handleAddMeetingComment: (meetingId: string, content: string) => Promise<void>;
    handleDeleteMeetingComment: (meetingId: string, commentId: string) => Promise<void>;

    // Meeting Edit Modal
    isMeetingModalOpen: boolean;
    setIsMeetingModalOpen: (open: boolean) => void;
    editingMeeting: Meeting | null;
    setEditingMeeting: (meeting: Meeting | null) => void;
    isMeetingFromTask: boolean;
    setIsMeetingFromTask: (fromTask: boolean) => void;
    handleSaveMeeting: (meeting: any) => Promise<void>;
    handleDeleteMeeting: (meetingId: string) => Promise<void>;
    meetingInviters: MeetingInviter[];
    handleBackToTask: () => void;
}

const ModalsContainer: React.FC<ModalsContainerProps> = (props) => {
    const {
        currentUser,
        // Task View Modal
        isTaskViewModalOpen, setIsTaskViewModalOpen, viewingTask, setViewingTask,
        checkEditPermission, handleEditFromView, comments, taskActivities,
        handleAddComment, handleDeleteComment, handleStatusChangeFromView,
        handleAddChecklistItem, handleToggleChecklistItem, handleRemoveChecklistItem, handleUpdateChecklistItem,
        // Add Task Modal
        isModalOpen, setIsModalOpen, editingTask, setEditingTask,
        handleSaveTask, handleDeleteTask, checkDeletePermission, handleAddMeeting,
        // Common
        projects, taskAssignableUsers, allUsers, subCategories,
        masterCategories, masterSubCategories, categorySubcategoryRelations, allTasks,
        // Project Modal
        isProjectModalOpen, setIsProjectModalOpen, editingProject, setEditingProject, handleSaveProject,
        // Status Modal
        isStatusModalOpen, setIsStatusModalOpen, handleSaveStatus,
        // Profile Photo Modal
        isProfilePhotoModalOpen, setIsProfilePhotoModalOpen, handleUploadProfilePhoto, handleRemoveProfilePhoto,
        // Notification Modal
        notificationModal, hideNotification,
        // Confirm Modal
        confirmModal, hideConfirm,
        // Announcement Modal
        isAnnouncementModalOpen, setIsAnnouncementModalOpen, editingAnnouncement, setEditingAnnouncement, handleSaveAnnouncement,
        // Task Share Modal
        shareState, closeShare,
        // Meeting View Modal
        isMeetingViewModalOpen, setIsMeetingViewModalOpen, viewingMeeting, setViewingMeeting,
        checkMeetingEditPermission, checkMeetingDeletePermission, handleEditMeetingFromView, handleDeleteMeetingFromView,
        handleAddMeetingComment, handleDeleteMeetingComment,
        // Meeting Edit Modal
        isMeetingModalOpen, setIsMeetingModalOpen, editingMeeting, setEditingMeeting,
        isMeetingFromTask, setIsMeetingFromTask, handleSaveMeeting, handleDeleteMeeting,
        meetingInviters, handleBackToTask
    } = props;

    return (
        <>
            {/* Task View Modal */}
            <Suspense fallback={null}>
                <TaskViewModal
                    isOpen={isTaskViewModalOpen}
                    onClose={() => { setIsTaskViewModalOpen(false); setViewingTask(null); }}
                    onEdit={handleEditFromView}
                    task={viewingTask}
                    currentUser={currentUser}
                    canEdit={viewingTask ? checkEditPermission(viewingTask) : false}
                    projects={projects}
                    users={taskAssignableUsers}
                    comments={comments}
                    activities={taskActivities}
                    onAddComment={handleAddComment}
                    onDeleteComment={handleDeleteComment}
                    onStatusChange={handleStatusChangeFromView}
                    allTasks={allTasks}
                    onBlockingTaskClick={(taskId) => {
                        // Find the blocking task and open it
                        const blockingTask = allTasks.find(t => t.id === taskId);
                        if (blockingTask) {
                            setViewingTask(blockingTask);
                        }
                    }}
                    onAddChecklistItem={handleAddChecklistItem}
                    onToggleChecklistItem={handleToggleChecklistItem}
                    onRemoveChecklistItem={handleRemoveChecklistItem}
                    onUpdateChecklistItem={handleUpdateChecklistItem}
                />
            </Suspense>

            {/* Add/Edit Task Modal */}
            <Suspense fallback={null}>
                <AddTaskModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveTask}
                    onDelete={handleDeleteTask}
                    initialData={editingTask}
                    currentUser={currentUser}
                    canEdit={editingTask ? checkEditPermission(editingTask) : true}
                    canDelete={editingTask ? checkDeletePermission(editingTask) : false}
                    projects={projects}
                    users={taskAssignableUsers}
                    subCategories={subCategories}
                    masterCategories={masterCategories}
                    masterSubCategories={masterSubCategories}
                    categorySubcategoryRelations={categorySubcategoryRelations}
                    onSwitchToMeeting={() => {
                        setIsModalOpen(false);
                        setEditingTask(null);
                        handleAddMeeting(true);
                    }}
                    allTasks={allTasks}
                />
            </Suspense>

            {/* Add/Edit Project Modal */}
            <AddProjectModal
                isOpen={isProjectModalOpen}
                onClose={() => { setIsProjectModalOpen(false); setEditingProject(null); }}
                onSave={handleSaveProject}
                users={taskAssignableUsers}
                editingProject={editingProject}
            />

            {/* Status Modal */}
            <StatusModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                onSave={handleSaveStatus}
                currentUser={currentUser}
            />

            {/* Profile Photo Modal */}
            {currentUser && (
                <ProfilePhotoModal
                    isOpen={isProfilePhotoModalOpen}
                    onClose={() => setIsProfilePhotoModalOpen(false)}
                    currentUser={currentUser}
                    onSave={handleUploadProfilePhoto}
                    onRemove={handleRemoveProfilePhoto}
                />
            )}

            {/* Notification Modal */}
            <NotificationModal
                isOpen={notificationModal.isOpen}
                onClose={hideNotification}
                title={notificationModal.title}
                message={notificationModal.message}
                type={notificationModal.type}
                autoClose={notificationModal.type === 'success'}
                autoCloseDelay={4000}
            />

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={hideConfirm}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmText={confirmModal.confirmText}
                cancelText={confirmModal.cancelText}
            />

            {/* Announcement Modal */}
            <Suspense fallback={null}>
                <AnnouncementModal
                    isOpen={isAnnouncementModalOpen}
                    onClose={() => { setIsAnnouncementModalOpen(false); setEditingAnnouncement(null); }}
                    onSave={handleSaveAnnouncement}
                    editingAnnouncement={editingAnnouncement}
                    currentUser={currentUser}
                />
            </Suspense>

            {/* Task Share Modal */}
            {shareState.selectedTask && (
                <Suspense fallback={null}>
                    <TaskShareModal
                        isOpen={shareState.isTaskShareOpen}
                        onClose={closeShare}
                        task={shareState.selectedTask}
                        users={allUsers}
                    />
                </Suspense>
            )}

            {/* Meeting View Modal */}
            <Suspense fallback={null}>
                <MeetingViewModal
                    isOpen={isMeetingViewModalOpen}
                    onClose={() => { setIsMeetingViewModalOpen(false); setViewingMeeting(null); }}
                    meeting={viewingMeeting}
                    projects={projects}
                    canEdit={viewingMeeting ? checkMeetingEditPermission(viewingMeeting) : false}
                    canDelete={viewingMeeting ? checkMeetingDeletePermission(viewingMeeting) : false}
                    onEdit={handleEditMeetingFromView}
                    onDelete={handleDeleteMeetingFromView}
                    onAddComment={(content) => handleAddMeetingComment(viewingMeeting!.id, content)}
                    onDeleteComment={(commentId) => handleDeleteMeetingComment(viewingMeeting!.id, commentId)}
                    currentUser={currentUser}
                    allUsers={allUsers}
                />
            </Suspense>

            {/* Meeting Edit Modal */}
            <Suspense fallback={null}>
                <AddMeetingModal
                    isOpen={isMeetingModalOpen}
                    onClose={() => { setIsMeetingModalOpen(false); setEditingMeeting(null); setIsMeetingFromTask(false); }}
                    onSave={(data) => { handleSaveMeeting(data); setIsMeetingFromTask(false); }}
                    onDelete={handleDeleteMeeting}
                    initialData={editingMeeting}
                    currentUser={currentUser}
                    canEdit={true}
                    canDelete={editingMeeting ? checkMeetingDeletePermission(editingMeeting) : false}
                    projects={projects}
                    users={taskAssignableUsers}
                    existingInviters={meetingInviters}
                    fromTaskModal={isMeetingFromTask}
                    onBackToTask={handleBackToTask}
                />
            </Suspense>
        </>
    );
};

export default ModalsContainer;
