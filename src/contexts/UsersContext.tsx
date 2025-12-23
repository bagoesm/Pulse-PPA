// src/contexts/UsersContext.tsx
// Domain context for Users and UserStatuses
import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, UserStatus } from '../../types';

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
            const { data: usersData, error: usersErr } = await supabase.from('profiles').select('*');
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
                    profilePhotoPath: user.profile_photo_path || undefined
                })) as User[];
                setAllUsers(mappedUsers);
                return mappedUsers;
            }
            return [];
        } finally {
            setIsUsersLoading(false);
        }
    }, []);

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
