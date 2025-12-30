// src/hooks/useMeetingHandlers.ts
// Meeting CRUD operations
import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Meeting, MeetingInviter, User } from '../../types';
import { parseMentions } from '../components/MentionInput';

interface UseMeetingHandlersProps {
    currentUser: User | null;
    meetings: Meeting[];
    setMeetings: React.Dispatch<React.SetStateAction<Meeting[]>>;
    meetingInviters: MeetingInviter[];
    setMeetingInviters: React.Dispatch<React.SetStateAction<MeetingInviter[]>>;
    editingMeeting: Meeting | null;
    setEditingMeeting: React.Dispatch<React.SetStateAction<Meeting | null>>;
    viewingMeeting: Meeting | null;
    setViewingMeeting: React.Dispatch<React.SetStateAction<Meeting | null>>;
    setIsMeetingModalOpen: (open: boolean) => void;
    setIsMeetingViewModalOpen: (open: boolean) => void;
    setIsMeetingFromTask: (fromTask: boolean) => void;
    setIsModalOpen: (open: boolean) => void;
    showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    allUsers: User[];
    createMentionNotification: (entityId: string, entityTitle: string, mentionerName: string, mentionedNames: string[], isMeeting?: boolean) => Promise<void>;
}

export const useMeetingHandlers = ({
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
    createMentionNotification
}: UseMeetingHandlersProps) => {

    // Permission checks
    const checkMeetingEditPermission = useCallback((meeting: Meeting) => {
        if (!currentUser) return false;
        if (currentUser.role === 'Super Admin') return true;
        if (currentUser.role === 'Atasan') return true;
        const meetingPics = Array.isArray(meeting.pic) ? meeting.pic : [meeting.pic];
        return meeting.createdBy === currentUser.name || meetingPics.includes(currentUser.name);
    }, [currentUser]);

    const checkMeetingDeletePermission = useCallback((meeting: Meeting) => {
        if (!currentUser) return false;
        if (currentUser.role === 'Super Admin') return true;
        if (currentUser.role === 'Atasan') return true;
        // Allow PIC to delete meeting
        const meetingPics = Array.isArray(meeting.pic) ? meeting.pic : [meeting.pic];
        return meeting.createdBy === currentUser.name || meetingPics.includes(currentUser.name);
    }, [currentUser]);

    // Helper to map database meeting to frontend format
    const mapMeeting = useCallback((data: any): Meeting => ({
        id: data.id,
        title: data.title,
        type: data.type,
        description: data.description,
        date: data.date,
        endDate: data.end_date,
        startTime: data.start_time,
        endTime: data.end_time,
        location: data.location,
        isOnline: data.is_online,
        onlineLink: data.online_link,
        inviter: data.inviter,
        invitees: data.invitees || [],
        pic: data.pic || [],
        projectId: data.project_id,
        suratUndangan: data.surat_undangan,
        suratTugas: data.surat_tugas,
        laporan: data.laporan,
        attachments: (data.attachments || []).map((att: any, idx: number) => ({
            ...att,
            id: att.id || `att_${data.id}_${idx}`
        })),
        links: (data.links || []).map((link: any, idx: number) => ({
            ...link,
            id: link.id || `link_${data.id}_${idx}`
        })),
        notes: data.notes,
        status: data.status,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    }), []);

    // Helper to log to activity_logs table (for admin view)
    const logToActivityLogs = useCallback(async (
        action: 'create' | 'update' | 'delete',
        meetingId: string,
        meetingTitle: string,
        projectId?: string,
        projectName?: string
    ) => {
        if (!currentUser) return;
        try {
            const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
            await supabase.from('activity_logs').insert({
                user_id: currentUser.id,
                user_name: currentUser.name,
                action: action,
                entity_type: 'meeting',
                entity_id: meetingId,
                entity_title: meetingTitle,
                project_id: projectId || null,
                project_name: projectName || null,
                user_agent: userAgent,
            });
        } catch (err) {
            console.error('Failed to log activity:', err);
        }
    }, [currentUser]);

    // Modal handlers
    const handleAddMeeting = useCallback((fromTask: boolean = false) => {
        setEditingMeeting(null);
        setViewingMeeting(null);
        setIsMeetingViewModalOpen(false);
        setIsMeetingFromTask(fromTask);
        setIsMeetingModalOpen(true);
    }, [setEditingMeeting, setViewingMeeting, setIsMeetingViewModalOpen, setIsMeetingFromTask, setIsMeetingModalOpen]);

    const handleBackToTask = useCallback(() => {
        setIsMeetingModalOpen(false);
        setIsMeetingFromTask(false);
        setIsModalOpen(true);
    }, [setIsMeetingModalOpen, setIsMeetingFromTask, setIsModalOpen]);

    const handleEditMeeting = useCallback((meeting: Meeting) => {
        setEditingMeeting(meeting);
        setViewingMeeting(null);
        setIsMeetingViewModalOpen(false);
        setIsMeetingFromTask(false);
        setIsMeetingModalOpen(true);
    }, [setEditingMeeting, setViewingMeeting, setIsMeetingViewModalOpen, setIsMeetingFromTask, setIsMeetingModalOpen]);

    const handleViewMeeting = useCallback((meeting: Meeting) => {
        setViewingMeeting(meeting);
        setEditingMeeting(null);
        setIsMeetingModalOpen(false);
        setIsMeetingViewModalOpen(true);
    }, [setViewingMeeting, setEditingMeeting, setIsMeetingModalOpen, setIsMeetingViewModalOpen]);

    const handleEditMeetingFromView = useCallback(() => {
        if (viewingMeeting) {
            setEditingMeeting(viewingMeeting);
            setIsMeetingViewModalOpen(false);
            setIsMeetingModalOpen(true);
        }
    }, [viewingMeeting, setEditingMeeting, setIsMeetingViewModalOpen, setIsMeetingModalOpen]);

    // Save meeting (create or update)
    const handleSaveMeeting = useCallback(async (meetingData: Omit<Meeting, 'id' | 'createdAt'>) => {
        try {
            const payload = {
                title: meetingData.title,
                type: meetingData.type,
                description: meetingData.description,
                date: meetingData.date,
                end_date: meetingData.endDate || null,
                start_time: meetingData.startTime,
                end_time: meetingData.endTime,
                location: meetingData.location,
                is_online: meetingData.isOnline,
                online_link: meetingData.onlineLink,
                inviter: meetingData.inviter,
                invitees: meetingData.invitees,
                pic: meetingData.pic,
                project_id: meetingData.projectId || null,
                surat_undangan: meetingData.suratUndangan,
                surat_tugas: meetingData.suratTugas,
                laporan: meetingData.laporan,
                attachments: meetingData.attachments,
                links: meetingData.links || [],
                notes: meetingData.notes,
                status: meetingData.status,
                created_by: meetingData.createdBy,
                updated_at: new Date().toISOString()
            };

            if (editingMeeting) {
                // First, update the meeting
                const { error: updateError } = await supabase
                    .from('meetings')
                    .update(payload)
                    .eq('id', editingMeeting.id);

                if (updateError) {
                    showNotification('Gagal Update Jadwal', updateError.message, 'error');
                    return;
                }

                // Then fetch the updated data separately (handles RLS better)
                const { data, error: fetchError } = await supabase
                    .from('meetings')
                    .select('*')
                    .eq('id', editingMeeting.id)
                    .maybeSingle();

                // Use fetched data if available, or construct from input
                const updatedMeeting = data ? mapMeeting(data) : {
                    ...editingMeeting,
                    ...meetingData,
                    updatedAt: new Date().toISOString()
                };

                setMeetings(prev => prev.map(m => m.id === editingMeeting.id ? updatedMeeting : m));
                showNotification('Jadwal Diupdate!', `"${meetingData.title}" berhasil diperbarui.`, 'success');

                // Check for new mentions in description/notes
                const oldDescMentions = editingMeeting.description ? parseMentions(editingMeeting.description, allUsers) : [];
                const newDescMentions = meetingData.description ? parseMentions(meetingData.description, allUsers) : [];
                const oldNotesMentions = editingMeeting.notes ? parseMentions(editingMeeting.notes, allUsers) : [];
                const newNotesMentions = meetingData.notes ? parseMentions(meetingData.notes, allUsers) : [];

                const oldMentions = [...new Set([...oldDescMentions, ...oldNotesMentions])];
                const newMentions = [...new Set([...newDescMentions, ...newNotesMentions])];
                const addedMentions = newMentions.filter(name => !oldMentions.includes(name));

                if (addedMentions.length > 0) {
                    await createMentionNotification(editingMeeting.id, meetingData.title, currentUser?.name || 'Unknown', addedMentions, true);
                }

                // Log to activity_logs for admin view
                await logToActivityLogs('update', editingMeeting.id, meetingData.title, meetingData.projectId);
            } else {
                const { data, error } = await supabase
                    .from('meetings')
                    .insert([{ ...payload, created_at: new Date().toISOString() }])
                    .select()
                    .single();

                if (error) {
                    showNotification('Gagal Tambah Jadwal', error.message, 'error');
                    return;
                }

                if (data) {
                    const mappedMeeting = mapMeeting(data);
                    setMeetings(prev => [...prev, mappedMeeting]);

                    if (meetingData.inviter?.id && meetingData.inviter?.name) {
                        setMeetingInviters(prev => [...prev, meetingData.inviter]);
                    }

                    // Send mention notifications for mentions in description/notes
                    const descMentions = meetingData.description ? parseMentions(meetingData.description, allUsers) : [];
                    const notesMentions = meetingData.notes ? parseMentions(meetingData.notes, allUsers) : [];
                    const allMentions = [...new Set([...descMentions, ...notesMentions])];

                    if (allMentions.length > 0) {
                        await createMentionNotification(data.id, meetingData.title, currentUser?.name || 'Unknown', allMentions, true);
                    }

                    showNotification('Jadwal Ditambahkan!', `"${meetingData.title}" berhasil ditambahkan.`, 'success');

                    // Log to activity_logs for admin view
                    await logToActivityLogs('create', data.id, meetingData.title, meetingData.projectId);
                }
            }

            setIsMeetingModalOpen(false);
            setEditingMeeting(null);
        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [editingMeeting, mapMeeting, setMeetings, setMeetingInviters, setIsMeetingModalOpen, setEditingMeeting, showNotification, allUsers, createMentionNotification, currentUser, logToActivityLogs]);

    const handleDeleteMeeting = useCallback(async (meetingId: string) => {
        try {
            // Get meeting data before deletion for logging
            const meetingToDelete = meetings.find(m => m.id === meetingId);

            const { error } = await supabase
                .from('meetings')
                .delete()
                .eq('id', meetingId);

            if (error) {
                showNotification('Gagal Hapus Jadwal', error.message, 'error');
                return;
            }

            setMeetings(prev => prev.filter(m => m.id !== meetingId));
            setIsMeetingViewModalOpen(false);
            setViewingMeeting(null);
            showNotification('Jadwal Dihapus', 'Jadwal berhasil dihapus.', 'success');

            // Log to activity_logs for admin view
            if (meetingToDelete) {
                await logToActivityLogs('delete', meetingId, meetingToDelete.title, meetingToDelete.projectId);
            }
        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [meetings, setMeetings, setIsMeetingViewModalOpen, setViewingMeeting, showNotification, logToActivityLogs]);

    const handleDeleteMeetingFromView = useCallback(() => {
        if (viewingMeeting) {
            handleDeleteMeeting(viewingMeeting.id);
        }
    }, [viewingMeeting, handleDeleteMeeting]);

    // Add comment
    const handleAddComment = useCallback(async (meetingId: string, content: string, allUsers: User[], createMentionNotification: any, createCommentNotification: any) => {
        if (!currentUser) return;

        const { data, error } = await supabase.from('meeting_comments').insert([{
            meeting_id: meetingId,
            user_id: currentUser.id,
            user_name: currentUser.name,
            content: content
        }]).select().single();

        if (error) {
            showNotification('Gagal Tambah Komentar', error.message, 'error');
            return;
        }

        // Update local state if needed (or rely on refetch)
        // For optimal experience we append to the local meeting comments
        const newComment = {
            id: data.id,
            taskId: '', // Not used for meeting comments
            userId: data.user_id,
            userName: data.user_name,
            content: data.content,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };

        setMeetings(prev => prev.map(m => {
            if (m.id === meetingId) {
                return { ...m, comments: [newComment, ...(m.comments || [])] };
            }
            return m;
        }));

        // Also update viewingMeeting so the modal reflects the change immediately
        if (viewingMeeting && viewingMeeting.id === meetingId) {
            setViewingMeeting(prev => prev ? {
                ...prev,
                comments: [newComment, ...(prev.comments || [])]
            } : null);
        }

        // Handle notifications
        const meeting = meetings.find(m => m.id === meetingId);
        if (meeting) {
            const mentionedNames: string[] = [];
            for (const user of allUsers) {
                const escapedName = user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const mentionPattern = new RegExp(`@${escapedName}(?:\\s|$|[.,!?])`, 'i');
                if (mentionPattern.test(content) && !mentionedNames.includes(user.name)) {
                    mentionedNames.push(user.name);
                }
            }

            if (mentionedNames.length > 0) {
                await createMentionNotification(meetingId, meeting.title, currentUser.name, mentionedNames, true);
            }

            const picsToNotify = meeting.pic.filter(pic => !mentionedNames.includes(pic));
            if (picsToNotify.length > 0) {
                await createCommentNotification(meetingId, meeting.title, currentUser.name, picsToNotify, true);
            }
        }
    }, [currentUser, meetings, setMeetings, setViewingMeeting, viewingMeeting, showNotification]);

    // Delete comment
    const handleDeleteComment = useCallback(async (meetingId: string, commentId: string) => {
        const { error } = await supabase.from('meeting_comments').delete().eq('id', commentId);

        if (error) {
            showNotification('Gagal Hapus Komentar', error.message, 'error');
            return;
        }

        setMeetings(prev => prev.map(m => {
            if (m.id === meetingId) {
                return { ...m, comments: (m.comments || []).filter(c => c.id !== commentId) };
            }
            return m;
        }));

        // Also update viewingMeeting so the modal reflects the change immediately
        if (viewingMeeting && viewingMeeting.id === meetingId) {
            setViewingMeeting(prev => prev ? {
                ...prev,
                comments: (prev.comments || []).filter(c => c.id !== commentId)
            } : null);
        }
    }, [setMeetings, setViewingMeeting, viewingMeeting, showNotification]);

    return {
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
        handleAddComment,
        handleDeleteComment
    };
};

export default useMeetingHandlers;
