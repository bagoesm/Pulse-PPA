// src/hooks/useMeetingHandlers.ts
// Meeting CRUD operations
import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Meeting, MeetingInviter, User } from '../../types';

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
    showNotification
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
        return meeting.createdBy === currentUser.name;
    }, [currentUser]);

    // Helper to map database meeting to frontend format
    const mapMeeting = useCallback((data: any): Meeting => ({
        id: data.id,
        title: data.title,
        type: data.type,
        description: data.description,
        date: data.date,
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
                const { data, error } = await supabase
                    .from('meetings')
                    .update(payload)
                    .eq('id', editingMeeting.id)
                    .select()
                    .single();

                if (error) {
                    showNotification('Gagal Update Jadwal', error.message, 'error');
                    return;
                }

                if (data) {
                    setMeetings(prev => prev.map(m => m.id === editingMeeting.id ? mapMeeting(data) : m));
                    showNotification('Jadwal Diupdate!', `"${meetingData.title}" berhasil diperbarui.`, 'success');
                }
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

                    showNotification('Jadwal Ditambahkan!', `"${meetingData.title}" berhasil ditambahkan.`, 'success');
                }
            }

            setIsMeetingModalOpen(false);
            setEditingMeeting(null);
        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [editingMeeting, mapMeeting, setMeetings, setMeetingInviters, setIsMeetingModalOpen, setEditingMeeting, showNotification]);

    // Delete meeting
    const handleDeleteMeeting = useCallback(async (meetingId: string) => {
        try {
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
        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [setMeetings, setIsMeetingViewModalOpen, setViewingMeeting, showNotification]);

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
