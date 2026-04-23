// src/contexts/DivisionContext.tsx
// Central context for Satuan Kerja-based data isolation
// Integrates VisibilityMiddleware for satker visibility filtering
// Validates: Requirements 4.1, 4.3
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '../../types';
import { useAuth } from './AuthContext';
import { useUsers } from './UsersContext';
import { visibilityMiddleware } from '../services/VisibilityMiddleware';
import { useVisibilityFilter } from '../hooks/useVisibilityFilter';

interface DivisionContextType {
    // Master data
    divisiList: string[];
    setDivisiList: React.Dispatch<React.SetStateAction<string[]>>;
    
    // Current user's divisi
    currentDivisi: string | null;
    
    // Selected divisi for filtering (default = currentDivisi)
    selectedDivisi: string;
    setSelectedDivisi: (divisi: string) => void;
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
    
    // Use visibility filter hook to get accessible satker IDs
    // Validates: Requirements 4.1, 4.3
    const { accessibleSatkerIds, loading: visibilityLoading } = useVisibilityFilter(currentUser?.id);
    
    const [divisiList, setDivisiList] = useState<string[]>([]);
    const [selectedDivisi, setSelectedDivisiState] = useState<string>('');

    // Current user's divisi
    const currentDivisi = currentUser?.divisi || null;

    // Initialize selectedDivisi when currentUser changes
    useEffect(() => {
        if (currentUser) {
            if (currentUser.divisi) {
                // All users (including Super Admin) default to their own divisi
                setSelectedDivisiState(currentUser.divisi);
            } else {
                // Users without divisi: set to first accessible divisi or empty
                // This will be handled by the component
                setSelectedDivisiState('');
            }
        }
    }, [currentUser?.id, currentUser?.divisi]);

    // Fetch divisi list from master_divisi table with visibility filtering
    // Validates: Requirements 4.1, 4.3
    const fetchDivisiList = useCallback(async () => {
        try {
            // First, get all active divisi from master_divisi
            const { data, error } = await supabase
                .from('master_divisi')
                .select('name')
                .eq('is_active', true)
                .order('display_order');

            if (error) {
                console.error('Error fetching divisi list:', error);
                return;
            }

            if (!data) {
                setDivisiList([]);
                return;
            }

            // Super Admin sees all divisi
            if (currentUser?.role === 'Super Admin') {
                setDivisiList(data.map((d: any) => d.name));
                return;
            }

            // For non-admin users, filter divisi based on accessible satkers
            // Get divisi data to map names to IDs
            const { data: satkersData } = await supabase
                .from('master_divisi')
                .select('id, name');

            if (satkersData && accessibleSatkerIds.length > 0) {
                // Filter divisi that the user can access
                const accessibleSatkerNames = satkersData
                    .filter((s: any) => accessibleSatkerIds.includes(s.id))
                    .map((s: any) => s.name);
                
                // Filter divisi list to only show accessible divisi
                const filteredDivisi = data
                    .map((d: any) => d.name)
                    .filter((name: string) => accessibleSatkerNames.includes(name));
                
                setDivisiList(filteredDivisi);
            } else if (accessibleSatkerIds.length === 0 && (currentUser?.role === 'Atasan' || currentUser?.role === 'Staff')) {
                // User has no accessible divisi - show empty list
                setDivisiList([]);
            } else {
                // Fallback: show all (shouldn't happen normally)
                setDivisiList(data.map((d: any) => d.name));
            }
        } catch (err) {
            console.error('Error fetching divisi list:', err);
        }
    }, [currentUser?.role, accessibleSatkerIds]);

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
        if (!selectedDivisi) {
            return [];
        }
        return allUsers
            .filter(u => u.divisi === selectedDivisi)
            .map(u => u.name);
    }, [selectedDivisi, allUsers]);

    // Map user IDs in selected divisi
    const divisiUserIds = useMemo(() => {
        if (!selectedDivisi) {
            return new Set<string>();
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
        if (!selectedDivisi || !currentDivisi) return false;
        return selectedDivisi !== currentDivisi;
    }, [selectedDivisi, currentDivisi]);

    // Helper: check by user name
    const isInSelectedDivisi = useCallback((userName: string) => {
        if (!selectedDivisi) return false;
        return divisiUserNamesSet.has(userName);
    }, [selectedDivisi, divisiUserNamesSet]);

    // Helper: check by user ID
    const isUserIdInSelectedDivisi = useCallback((userId: string) => {
        if (!selectedDivisi) return false;
        
        // First check: UUID-based lookup (new data)
        if (divisiUserIds.has(userId)) {
            return true;
        }
        
        // Fallback: Name-based lookup (legacy data)
        if (divisiUserNamesSet.has(userId)) {
            return true;
        }
        
        return false;
    }, [selectedDivisi, divisiUserIds, divisiUserNamesSet]);

    // Helper: combined check for createdBy + PIC
    const shouldShowByDivisi = useCallback((createdByName?: string, picNames?: string[]) => {
        if (!selectedDivisi) return false;

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
    const setSelectedDivisi = useCallback((divisi: string) => {
        setSelectedDivisiState(divisi);
    }, []);

    // Reset to own divisi
    const resetToMyDivisi = useCallback(() => {
        if (currentDivisi) {
            setSelectedDivisiState(currentDivisi);
        }
    }, [currentDivisi]);

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
