// src/contexts/SuratsContext.tsx
// Domain context for Surats (Letters)
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Surat } from '../../types';
import { mapSuratsFromDB } from '../utils/suratMappers';
import { linkingService } from '../services/LinkingService';

interface SuratsContextType {
    surats: Surat[];
    setSurats: React.Dispatch<React.SetStateAction<Surat[]>>;
    fetchSurats: () => Promise<void>;
    clearSurats: () => void;
    isSuratsLoading: boolean;
    linkToKegiatan: (
        suratId: string,
        kegiatanId: string,
        disposisiData: {
            assignees: string[];
            disposisiText: string;
            deadline?: string;
            createdBy: string;
        }
    ) => Promise<void>;
    unlinkFromKegiatan: (suratId: string, kegiatanId: string) => Promise<void>;
}

const SuratsContext = createContext<SuratsContextType | undefined>(undefined);

export const useSurats = () => {
    const context = useContext(SuratsContext);
    if (!context) {
        throw new Error('useSurats must be used within a SuratsProvider');
    }
    return context;
};

interface SuratsProviderProps {
    children: ReactNode;
    session: any;
}

export const SuratsProvider: React.FC<SuratsProviderProps> = ({ children, session }) => {
    const [isSuratsLoading, setIsSuratsLoading] = useState(false);
    const [surats, setSurats] = useState<Surat[]>([]);

    const fetchSurats = useCallback(async () => {
        setIsSuratsLoading(true);
        try {
            // Fetch from the view that includes disposisi information
            const { data, error } = await supabase
                .from('surats_with_disposisi')
                .select('*')
                .order('tanggal_surat', { ascending: false });

            if (error) {
                // Fallback to regular surats table if view doesn't exist
                console.warn('View surats_with_disposisi not found, falling back to surats table:', error);
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('surats')
                    .select('*')
                    .order('tanggal_surat', { ascending: false });

                if (fallbackError) throw fallbackError;

                if (fallbackData) {
                    setSurats(mapSuratsFromDB(fallbackData));
                }
            } else if (data) {
                setSurats(mapSuratsFromDB(data));
            }
        } catch (error) {
            console.error('Error fetching surats:', error);
        } finally {
            setIsSuratsLoading(false);
        }
    }, []);

    const clearSurats = useCallback(() => {
        setSurats([]);
    }, []);

    /**
     * Link Surat to Kegiatan with Disposisi
     * Validates: Requirements 3.1, 4.1, 4.2
     */
    const linkToKegiatan = useCallback(async (
        suratId: string,
        kegiatanId: string,
        disposisiData: {
            assignees: string[];
            disposisiText: string;
            deadline?: string;
            createdBy: string;
        }
    ) => {
        try {
            await linkingService.linkSuratToKegiatan(suratId, kegiatanId, disposisiData);
            // Refresh surats to get updated data
            await fetchSurats();
        } catch (error) {
            console.error('Error linking Surat to Kegiatan:', error);
            throw error;
        }
    }, [fetchSurats]);

    /**
     * Unlink Surat from Kegiatan
     * Validates: Requirements 3.5
     */
    const unlinkFromKegiatan = useCallback(async (
        suratId: string,
        kegiatanId: string
    ) => {
        try {
            await linkingService.unlinkSuratFromKegiatan(suratId, kegiatanId);
            // Refresh surats to get updated data
            await fetchSurats();
        } catch (error) {
            console.error('Error unlinking Surat from Kegiatan:', error);
            throw error;
        }
    }, [fetchSurats]);

    useEffect(() => {
        if (session) {
            fetchSurats();
        } else {
            clearSurats();
        }
    }, [session, fetchSurats, clearSurats]);

    const value: SuratsContextType = {
        surats,
        setSurats,
        fetchSurats,
        clearSurats,
        isSuratsLoading,
        linkToKegiatan,
        unlinkFromKegiatan,
    };

    return (
        <SuratsContext.Provider value={value}>
            {children}
        </SuratsContext.Provider>
    );
};

export default SuratsContext;
