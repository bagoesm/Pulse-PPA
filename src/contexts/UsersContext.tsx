// src/contexts/UsersContext.tsx
// Domain context for Users and UserStatuses
// Integrates VisibilityMiddleware for satker-based data filtering
// Validates: Requirements 4.1, 4.2, 4.3
import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, UserStatus } from '../../types';
import { useAuth } from './AuthContext';
import { visibilityMiddleware } from '../services/VisibilityMiddleware';

interface UsersContextType {
    // Users
    allUsers: User[];
    setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
    taskAssignableUsers: User[];

    // User Statuses
    userStatuses: UserStatus[];
    setUserStatuses: React.Dispatch<React.SetStateAction<UserStatus[]>>;

    // Fetch operations
    fetchUsers: () => Promise<User[]>;
    fetchUserStatuses: () => Promise<void>;
    clearUsers: () => void;
    isUsersLoading: boolean;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

export const useUsers = () => {
    const context = useContext(UsersContext);
    if (!context) {
        throw new Error('useUsers must be used within a UsersProvider');
    }
    return context;
};

interface UsersProviderProps {
    children: ReactNode;
    session: any;
}

export const UsersProvider: React.FC<UsersProviderProps> = ({ children, session }) => {
    const { currentUser } = useAuth();
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);

    // Computed: Task assignable users (exclude Super Admin)
    const taskAssignableUsers = useMemo(() =>
        allUsers.filter(user => user.role !== 'Super Admin'),
        [allUsers]
    );

    const fetchUsers = useCallback(async (): Promise<User[]> => {
        setIsUsersLoading(true);
        try {
            // Build base query
            let query = supabase.from('profiles').select('*');
            
            // Apply visibility filter based on satker access
            // Property 6: Data Filter Excludes Unauthorized Satkers
            // Validates: Requirements 4.1, 4.2
            if (currentUser?.id) {
                // Get accessible satker IDs for the current user
                const accessibleSatkerIds = await visibilityMiddleware.getAccessibleSatkerIds(currentUser.id);
                
                // Get all divisi to map names to IDs
                const { data: satkersData } = await supabase.from('master_divisi').select('id, name');
                
                if (satkersData && accessibleSatkerIds.length > 0) {
                    // Filter satker names that the user can access
                    const accessibleSatkerNames = satkersData
                        .filter((s: any) => accessibleSatkerIds.includes(s.id))
                        .map((s: any) => s.name);
                    
                    // Apply filter: show users from accessible satkers or users without divisi
                    // Admins see all users (handled by VisibilityMiddleware returning empty filter)
                    if (accessibleSatkerNames.length > 0 && currentUser.role !== 'Super Admin') {
                        // For non-admins: filter by accessible satker names
                        // Users without divisi (null/empty) are always visible
                        query = query.or(`divisi.is.null,divisi.eq.,divisi.in.(${accessibleSatkerNames.map((n: string) => `"${n}"`).join(',')})`);
                    }
                } else if (currentUser.role !== 'Super Admin') {
                    // User has no accessible satkers and is not admin
                    // Show only users without divisi
                    query = query.or('divisi.is.null,divisi.eq.');
                }
            }
            
            const { data: usersData, error: usersErr } = await query;
            if (usersErr) {
                console.error('Error fetch profiles:', usersErr);
                return [];
            }
            if (usersData) {
                const mappedUsers = usersData.map((user: any) => ({
                    ...user,
                    sakuraAnimationEnabled: user.sakura_animation_enabled || false,
                    snowAnimationEnabled: user.snow_animation_enabled || false,
                    moneyAnimationEnabled: user.money_animation_enabled || false,
                    profilePhoto: user.profile_photo || undefined,
                    profilePhotoPath: user.profile_photo_path || undefined,
                    divisi: user.divisi || undefined
                })) as User[];
                setAllUsers(mappedUsers);
                return mappedUsers;
            }
            return [];
        } finally {
            setIsUsersLoading(false);
        }
    }, [currentUser]);

    const fetchUserStatuses = useCallback(async () => {
        const { data: statusesData } = await supabase.from('user_statuses').select('*');
        if (statusesData) {
            const now = new Date();
            const validStatuses = statusesData.filter((s: any) => new Date(s.expires_at) > now);
            const mappedStatuses = validStatuses.map((s: any) => ({
                ...s,
                userId: s.user_id,
                createdAt: s.created_at,
                expiresAt: s.expires_at
            }));
            setUserStatuses(mappedStatuses);
        }
    }, []);

    const clearUsers = useCallback(() => {
        setAllUsers([]);
        setUserStatuses([]);
    }, []);

    // Auto-fetch when session changes
    useEffect(() => {
        if (session) {
            fetchUsers();
            fetchUserStatuses();
        } else {
            clearUsers();
        }
    }, [session, fetchUsers, fetchUserStatuses, clearUsers]);

    const value: UsersContextType = {
        allUsers,
        setAllUsers,
        taskAssignableUsers,
        userStatuses,
        setUserStatuses,
        fetchUsers,
        fetchUserStatuses,
        clearUsers,
        isUsersLoading
    };

    return (
        <UsersContext.Provider value={value}>
            {children}
        </UsersContext.Provider>
    );
};

export default UsersContext;
