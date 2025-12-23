// src/contexts/MeetingsContext.tsx
// Domain context for Meetings and Meeting Inviters
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Meeting, MeetingInviter } from '../../types';

interface MeetingsContextType {
    meetings: Meeting[];
    setMeetings: React.Dispatch<React.SetStateAction<Meeting[]>>;
    meetingInviters: MeetingInviter[];
    setMeetingInviters: React.Dispatch<React.SetStateAction<MeetingInviter[]>>;
    fetchMeetings: () => Promise<void>;
    clearMeetings: () => void;
    isMeetingsLoading: boolean;
}

const MeetingsContext = createContext<MeetingsContextType | undefined>(undefined);

export const useMeetings = () => {
    const context = useContext(MeetingsContext);
    if (!context) {
        throw new Error('useMeetings must be used within a MeetingsProvider');
    }
    return context;
};

interface MeetingsProviderProps {
    children: ReactNode;
    session: any;
}

export const MeetingsProvider: React.FC<MeetingsProviderProps> = ({ children, session }) => {
    const [isMeetingsLoading, setIsMeetingsLoading] = useState(false);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [meetingInviters, setMeetingInviters] = useState<MeetingInviter[]>([]);

    const fetchMeetings = useCallback(async () => {
        setIsMeetingsLoading(true);
        try {
            // Fetch meetings and comments in parallel
            const [meetingsResult, commentsResult] = await Promise.all([
                supabase.from('meetings').select('*').order('date', { ascending: true }),
                supabase.from('meeting_comments').select('*').order('created_at', { ascending: false })
            ]);

            const meetingsData = meetingsResult.data;
            const commentsData = commentsResult.data || [];

            if (meetingsData) {
                // Group comments by meeting_id
                const commentsByMeetingId = new Map<string, any[]>();
                commentsData.forEach((c: any) => {
                    const meetingId = c.meeting_id;
                    if (!commentsByMeetingId.has(meetingId)) {
                        commentsByMeetingId.set(meetingId, []);
                    }
                    commentsByMeetingId.get(meetingId)!.push({
                        id: c.id,
                        taskId: '', // Not used for meeting comments
                        userId: c.user_id,
                        userName: c.user_name,
                        content: c.content,
                        createdAt: c.created_at,
                        updatedAt: c.updated_at
                    });
                });

                const mappedMeetings = meetingsData.map((m: any) => ({
                    id: m.id,
                    title: m.title,
                    type: m.type,
                    description: m.description,
                    date: m.date,
                    startTime: m.start_time,
                    endTime: m.end_time,
                    location: m.location,
                    isOnline: m.is_online,
                    onlineLink: m.online_link,
                    inviter: m.inviter || { id: '', name: '', organization: '' },
                    invitees: m.invitees || [],
                    pic: m.pic || [],
                    projectId: m.project_id,
                    suratUndangan: m.surat_undangan,
                    suratTugas: m.surat_tugas,
                    laporan: m.laporan,
                    attachments: (m.attachments || []).map((att: any, idx: number) => ({
                        ...att,
                        id: att.id || `att_${m.id}_${idx}`
                    })),
                    links: (m.links || []).map((link: any, idx: number) => ({
                        ...link,
                        id: link.id || `link_${m.id}_${idx}`
                    })),
                    notes: m.notes,
                    status: m.status,
                    createdBy: m.created_by,
                    createdAt: m.created_at,
                    updatedAt: m.updated_at,
                    comments: commentsByMeetingId.get(m.id) || []
                }));
                setMeetings(mappedMeetings);

                // Extract unique inviters
                const invitersMap = new Map<string, MeetingInviter>();
                mappedMeetings.forEach((m: Meeting) => {
                    if (m.inviter?.id && m.inviter?.name) {
                        invitersMap.set(m.inviter.id, m.inviter);
                    }
                });
                setMeetingInviters(Array.from(invitersMap.values()));
            }
        } finally {
            setIsMeetingsLoading(false);
        }
    }, []);

    const clearMeetings = useCallback(() => {
        setMeetings([]);
        setMeetingInviters([]);
    }, []);

    useEffect(() => {
        if (session) {
            fetchMeetings();
        } else {
            clearMeetings();
        }
    }, [session, fetchMeetings, clearMeetings]);

    const value: MeetingsContextType = {
        meetings,
        setMeetings,
        meetingInviters,
        setMeetingInviters,
        fetchMeetings,
        clearMeetings,
        isMeetingsLoading
    };

    return (
        <MeetingsContext.Provider value={value}>
            {children}
        </MeetingsContext.Provider>
    );
};

export default MeetingsContext;
