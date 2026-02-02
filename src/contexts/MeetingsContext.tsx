// src/contexts/MeetingsContext.tsx
// Domain context for Meetings and Meeting Inviters
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Meeting, MeetingInviter } from '../../types';
import { linkingService } from '../services/LinkingService';
import { mappers } from '../utils/mappers';

interface MeetingsContextType {
    meetings: Meeting[];
    setMeetings: React.Dispatch<React.SetStateAction<Meeting[]>>;
    meetingInviters: MeetingInviter[];
    setMeetingInviters: React.Dispatch<React.SetStateAction<MeetingInviter[]>>;
    fetchMeetings: () => Promise<void>;
    clearMeetings: () => void;
    isMeetingsLoading: boolean;
    linkToSurat: (
        kegiatanId: string,
        suratId: string,
        disposisiData: {
            assignees: string[];
            disposisiText: string;
            deadline?: string;
            createdBy: string;
        }
    ) => Promise<void>;
    unlinkFromSurat: (kegiatanId: string, suratId: string) => Promise<void>;
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
            // Fetch from the view that includes disposisi information
            const { data: meetingsData, error: meetingsError } = await supabase
                .from('meetings_with_disposisi')
                .select('*')
                .order('date', { ascending: true });

            // Fallback to regular meetings table if view doesn't exist
            const finalMeetingsData = meetingsError 
                ? (await supabase.from('meetings').select('*').order('date', { ascending: true })).data
                : meetingsData;

            // Fetch comments
            const { data: commentsData } = await supabase
                .from('meeting_comments')
                .select('*')
                .order('created_at', { ascending: false });

            if (finalMeetingsData) {
                // Group comments by meeting_id
                const commentsByMeetingId = new Map<string, any[]>();
                (commentsData || []).forEach((c: any) => {
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

                // OPTIMIZATION: Use centralized mapper
                const mappedMeetings = finalMeetingsData.map((m: any) => {
                    const meeting = mappers.meeting(m);
                    // Add comments from grouped data
                    meeting.comments = commentsByMeetingId.get(m.id) || [];
                    return meeting;
                });
                
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

    /**
     * Link Kegiatan to Surat with Disposisi
     * Validates: Requirements 3.1, 4.1, 4.2
     */
    const linkToSurat = useCallback(async (
        kegiatanId: string,
        suratId: string,
        disposisiData: {
            assignees: string[];
            disposisiText: string;
            deadline?: string;
            createdBy: string;
        }
    ) => {
        try {
            await linkingService.linkSuratToKegiatan(suratId, kegiatanId, disposisiData);
            // Refresh meetings to get updated data
            await fetchMeetings();
        } catch (error) {
            console.error('Error linking Kegiatan to Surat:', error);
            throw error;
        }
    }, [fetchMeetings]);

    /**
     * Unlink Kegiatan from Surat
     * Validates: Requirements 3.5
     */
    const unlinkFromSurat = useCallback(async (
        kegiatanId: string,
        suratId: string
    ) => {
        try {
            await linkingService.unlinkSuratFromKegiatan(suratId, kegiatanId);
            // Refresh meetings to get updated data
            await fetchMeetings();
        } catch (error) {
            console.error('Error unlinking Kegiatan from Surat:', error);
            throw error;
        }
    }, [fetchMeetings]);

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
        isMeetingsLoading,
        linkToSurat,
        unlinkFromSurat,
    };

    return (
        <MeetingsContext.Provider value={value}>
            {children}
        </MeetingsContext.Provider>
    );
};

export default MeetingsContext;
