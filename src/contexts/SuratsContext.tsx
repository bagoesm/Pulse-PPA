// src/contexts/SuratsContext.tsx
// Domain context for Surats (Letters)
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Surat } from '../../types';
import { mapSuratsFromDB } from '../utils/suratMappers';

interface SuratsContextType {
    surats: Surat[];
    setSurats: React.Dispatch<React.SetStateAction<Surat[]>>;
    fetchSurats: () => Promise<void>;
    clearSurats: () => void;
    isSuratsLoading: boolean;
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
            const { data, error } = await supabase
                .from('surats')
                .select('*')
                .order('tanggal_surat', { ascending: false });

            if (error) throw error;

            if (data) {
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
        isSuratsLoading
    };

    return (
        <SuratsContext.Provider value={value}>
            {children}
        </SuratsContext.Provider>
    );
};

export default SuratsContext;
