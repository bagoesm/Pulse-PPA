// src/contexts/DivisionContext.tsx
// Central context for Satuan Kerja-based data isolation
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '../../types';
import { useAuth } from './AuthContext';
import { useUsers } from './UsersContext';

interface DivisionContextType {
    // Master data
    divisiList: string[];
    setDivisiList: React.Dispatch<React.SetStateAction<string[]>>;
    
    // Current user's divisi
    currentDivisi: string | null;
    
    // Selected divisi for filtering (default = currentDivisi)
    selectedDivisi: string | 'All';
    setSelectedDivisi: (divisi: string | 'All') => void;
    resetToMyDivisi: () => void;
    
    // Whether filtering is active (viewing another division)
    isDivisiFilterActive: boolean;
    
    // Users in selected divisi
    divisiUserNames: string[];
    
    // Helper: check if a user name belongs to the selected divisi
    isInSelectedDivisi: (userName: string) => boolean;
    
    // Helper: check if a user ID belongs to the selected divisi
    isUserIdInSelectedDivisi: (userId: string) => boolean;
    
    // Helper: filter data by divisi (returns true if item should be shown)
    shouldShowByDivisi: (createdByName?: string, picNames?: string[]) => boolean;
    
    // Fetch divisi list
    fetchDivisiList: () => Promise<void>;
    
    // Manage divisi list
    addDivisi: (name: string) => Promise<{success: boolean, error?: string}>;
    removeDivisi: (name: string) => Promise<{success: boolean, error?: string}>;
}

const DivisionContext = createContext<DivisionContextType | undefined>(undefined);

export const useDivision = () => {
    const context = useContext(DivisionContext);
    if (!context) {
        throw new Error('useDivision must be used within a DivisionProvider');
    }
    return context;
};

interface DivisionProviderProps {
    children: ReactNode;
    session: any;
}

export const DivisionProvider: React.FC<DivisionProviderProps> = ({ children, session }) => {
    const { currentUser } = useAuth();
    const { allUsers } = useUsers();
    
    const [divisiList, setDivisiList] = useState<string[]>([]);
    const [selectedDivisi, setSelectedDivisiState] = useState<string | 'All'>('All');

    // Current user's divisi
    const currentDivisi = currentUser?.divisi || null;

    // Initialize selectedDivisi when currentUser changes
    useEffect(() => {
        if (currentUser) {
            if (currentUser.role === 'Super Admin') {
                // Super Admin sees all by default
                setSelectedDivisiState('All');
            } else if (currentUser.divisi) {
                // Regular users see their own divisi by default
                setSelectedDivisiState(currentUser.divisi);
            } else {
                // Users without divisi see all (fallback)
                setSelectedDivisiState('All');
            }
        }
    }, [currentUser?.id, currentUser?.role, currentUser?.divisi]);

    // Fetch divisi list from master_divisi table
    const fetchDivisiList = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('master_divisi')
                .select('name')
                .eq('is_active', true)
                .order('display_order');

            if (error) {
                console.error('Error fetching divisi list:', error);
                return;
            }

            if (data) {
                setDivisiList(data.map((d: any) => d.name));
            }
        } catch (err) {
            console.error('Error fetching divisi list:', err);
        }
    }, []);

    // Fetch on mount when session exists
    useEffect(() => {
        if (session) {
            fetchDivisiList();
        }
    }, [session, fetchDivisiList]);

    // Manage divisi list
    const addDivisi = useCallback(async (name: string) => {
        try {
            // Get max display_order
            const { data: maxData } = await supabase
                .from('master_divisi')
                .select('display_order')
                .order('display_order', { ascending: false })
                .limit(1);
                
            const nextOrder = (maxData?.[0]?.display_order || 0) + 1;

            const { error } = await supabase
                .from('master_divisi')
                .insert([{ name, display_order: nextOrder }]);

            if (error) return { success: false, error: error.message };
            
            await fetchDivisiList();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }, [fetchDivisiList]);

    const removeDivisi = useCallback(async (name: string) => {
        try {
            // Soft delete or hard delete? Let's hard delete for simplicity unless there are errors
            const { error } = await supabase
                .from('master_divisi')
                .delete()
                .eq('name', name);

            if (error) return { success: false, error: error.message };
            
            await fetchDivisiList();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }, [fetchDivisiList]);

    // Compute user names in selected divisi
    const divisiUserNames = useMemo(() => {
        if (selectedDivisi === 'All') {
            return allUsers.map(u => u.name);
        }
        return allUsers
            .filter(u => u.divisi === selectedDivisi)
            .map(u => u.name);
    }, [selectedDivisi, allUsers]);

    // Map user IDs in selected divisi
    const divisiUserIds = useMemo(() => {
        if (selectedDivisi === 'All') {
            return new Set(allUsers.map(u => u.id));
        }
        return new Set(
            allUsers
                .filter(u => u.divisi === selectedDivisi)
                .map(u => u.id)
        );
    }, [selectedDivisi, allUsers]);

    // Set of user names for fast lookup
    const divisiUserNamesSet = useMemo(() => {
        return new Set(divisiUserNames);
    }, [divisiUserNames]);

    // Whether the filter is active (viewing a different divisi)
    const isDivisiFilterActive = useMemo(() => {
        if (selectedDivisi === 'All') {
            // For Super Admin, 'All' is the default, so not "actively filtering"
            if (currentUser?.role === 'Super Admin') return false;
            // For non-Super Admin without divisi, 'All' is fallback
            if (!currentDivisi) return false;
            // For regular users, 'All' means they expanded their view
            return true;
        }
        return selectedDivisi !== currentDivisi;
    }, [selectedDivisi, currentDivisi, currentUser?.role]);

    // Helper: check by user name
    const isInSelectedDivisi = useCallback((userName: string) => {
        if (selectedDivisi === 'All') return true;
        return divisiUserNamesSet.has(userName);
    }, [selectedDivisi, divisiUserNamesSet]);

    // Helper: check by user ID
    const isUserIdInSelectedDivisi = useCallback((userId: string) => {
        if (selectedDivisi === 'All') return true;
        return divisiUserIds.has(userId);
    }, [selectedDivisi, divisiUserIds]);

    // Helper: combined check for createdBy + PIC (Opsi C)
    const shouldShowByDivisi = useCallback((createdByName?: string, picNames?: string[]) => {
        if (selectedDivisi === 'All') return true;

        // Check if creator is in selected divisi
        if (createdByName && divisiUserNamesSet.has(createdByName)) {
            return true;
        }

        // Check if any PIC is in selected divisi
        if (picNames && picNames.length > 0) {
            return picNames.some(pic => divisiUserNamesSet.has(pic));
        }

        return false;
    }, [selectedDivisi, divisiUserNamesSet]);

    // Set selected divisi
    const setSelectedDivisi = useCallback((divisi: string | 'All') => {
        setSelectedDivisiState(divisi);
    }, []);

    // Reset to own divisi
    const resetToMyDivisi = useCallback(() => {
        if (currentUser?.role === 'Super Admin') {
            setSelectedDivisiState('All');
        } else if (currentDivisi) {
            setSelectedDivisiState(currentDivisi);
        } else {
            setSelectedDivisiState('All');
        }
    }, [currentDivisi, currentUser?.role]);

    const value: DivisionContextType = {
        divisiList,
        setDivisiList,
        currentDivisi,
        selectedDivisi,
        setSelectedDivisi,
        resetToMyDivisi,
        isDivisiFilterActive,
        divisiUserNames,
        isInSelectedDivisi,
        isUserIdInSelectedDivisi,
        shouldShowByDivisi,
        fetchDivisiList,
        addDivisi,
        removeDivisi,
    };

    return (
        <DivisionContext.Provider value={value}>
            {children}
        </DivisionContext.Provider>
    );
};

export default DivisionContext;
