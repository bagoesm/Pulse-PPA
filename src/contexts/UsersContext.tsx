import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
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

    // Fetch all users via React Query
    const { data: queryAllUsers, isLoading: isUsersQueryLoading, refetch: refetchUsers } = useQuery({
        queryKey: ['users', currentUser?.id, currentUser?.role],
        queryFn: async (): Promise<User[]> => {
            if (!currentUser) return [];

            let query = supabase.from('profiles').select('*');
            
            if (currentUser.id) {
                const accessibleSatkerIds = await visibilityMiddleware.getAccessibleSatkerIds(currentUser.id);
                const { data: satkersData } = await supabase.from('master_divisi').select('id, name');
                
                if (satkersData && accessibleSatkerIds.length > 0) {
                    const accessibleSatkerNames = satkersData
                        .filter((s: any) => accessibleSatkerIds.includes(s.id))
                        .map((s: any) => s.name);
                    
                    if (accessibleSatkerNames.length > 0 && currentUser.role !== 'Super Admin') {
                        query = query.or(`divisi.is.null,divisi.eq.,divisi.in.(${accessibleSatkerNames.map((n: string) => `"${n}"`).join(',')})`);
                    }
                } else if (currentUser.role !== 'Super Admin') {
                    query = query.or('divisi.is.null,divisi.eq.');
                }
            }
            
            const { data: usersData, error: usersErr } = await query;
            if (usersErr) {
                console.error('Error fetch profiles:', usersErr);
                return [];
            }
            if (usersData) {
                return usersData.map((user: any) => ({
                    ...user,
                    sakuraAnimationEnabled: user.sakura_animation_enabled || false,
                    snowAnimationEnabled: user.snow_animation_enabled || false,
                    moneyAnimationEnabled: user.money_animation_enabled || false,
                    flowerDecorationEnabled: user.flower_decoration_enabled || false,
                    header_color: user.header_color || null,
                    profilePhoto: user.profile_photo || undefined,
                    profilePhotoPath: user.profile_photo_path || undefined,
                    divisi: user.divisi || undefined,
                    nip: user.nip || undefined
                })) as User[];
            }
            return [];
        },
        enabled: !!session && !!currentUser,
    });

    // Fetch user statuses via React Query
    const { data: queryUserStatuses, refetch: refetchUserStatuses } = useQuery({
        queryKey: ['userStatuses'],
        queryFn: async (): Promise<UserStatus[]> => {
            const { data: statusesData } = await supabase.from('user_statuses').select('*');
            if (statusesData) {
                const now = new Date();
                const validStatuses = statusesData.filter((s: any) => new Date(s.expires_at) > now);
                return validStatuses.map((s: any) => ({
                    ...s,
                    userId: s.user_id,
                    createdAt: s.created_at,
                    expiresAt: s.expires_at
                }));
            }
            return [];
        },
        enabled: !!session,
    });

    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);

    useEffect(() => {
        if (queryAllUsers) {
            setAllUsers(queryAllUsers);
        }
    }, [queryAllUsers]);

    useEffect(() => {
        if (queryUserStatuses) {
            setUserStatuses(queryUserStatuses);
        }
    }, [queryUserStatuses]);

    const isUsersLoading = isUsersQueryLoading;

    // Computed: Task assignable users (exclude Super Admin)
    const taskAssignableUsers = useMemo(() =>
        allUsers.filter(user => user.role !== 'Super Admin'),
        [allUsers]
    );

    const fetchUsers = useCallback(async (): Promise<User[]> => {
        const { data } = await refetchUsers();
        return data || [];
    }, [refetchUsers]);

    const fetchUserStatuses = useCallback(async () => {
        await refetchUserStatuses();
    }, [refetchUserStatuses]);

    const clearUsers = useCallback(() => {
        setAllUsers([]);
        setUserStatuses([]);
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['userStatuses'] });
    }, []);

    // Auto-fetch/clear based on session
    useEffect(() => {
        if (!session) {
            clearUsers();
        }
    }, [session, clearUsers]);

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
