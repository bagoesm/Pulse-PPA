// src/contexts/DivisionContext.tsx
// Central context for Satuan Kerja-based data isolation
// Integrates VisibilityMiddleware for satker visibility filtering
// Validates: Requirements 4.1, 4.3
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
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

    // Fetch divisi list from master_divisi table with visibility filtering using React Query
    // Validates: Requirements 4.1, 4.3
    const { data: queryDivisiList, refetch: refetchDivisiList } = useQuery({
        queryKey: ['divisiList', currentUser?.id, currentUser?.role, accessibleSatkerIds],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('master_divisi')
                .select('name')
                .eq('is_active', true)
                .order('display_order');

            if (error || !data) {
                return [];
            }

            // Super Admin sees all divisi
            if (currentUser?.role === 'Super Admin') {
                return data.map((d: any) => d.name);
            }

            // For non-admin users, filter divisi based on accessible satkers
            const { data: satkersData } = await supabase
                .from('master_divisi')
                .select('id, name');

            if (satkersData && accessibleSatkerIds.length > 0) {
                const accessibleSatkerNames = satkersData
                    .filter((s: any) => accessibleSatkerIds.includes(s.id))
                    .map((s: any) => s.name);
                
                return data
                    .map((d: any) => d.name)
                    .filter((name: string) => accessibleSatkerNames.includes(name));
            } else if (accessibleSatkerIds.length === 0 && (currentUser?.role === 'Atasan' || currentUser?.role === 'Staff')) {
                return [];
            } else {
                return data.map((d: any) => d.name);
            }
        },
        enabled: !!session && !!currentUser,
    });

    const [divisiList, setDivisiList] = useState<string[]>([]);

    useEffect(() => {
        if (queryDivisiList) {
            setDivisiList(queryDivisiList);
        }
    }, [queryDivisiList]);

    const fetchDivisiList = useCallback(async () => {
        await refetchDivisiList();
    }, [refetchDivisiList]);

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
            
            await queryClient.invalidateQueries({ queryKey: ['divisiList'] });
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }, []);

    const removeDivisi = useCallback(async (name: string) => {
        try {
            const { error } = await supabase
                .from('master_divisi')
                .delete()
                .eq('name', name);

            if (error) return { success: false, error: error.message };
            
            await queryClient.invalidateQueries({ queryKey: ['divisiList'] });
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }, []);

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
