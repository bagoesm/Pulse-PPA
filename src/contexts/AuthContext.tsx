// src/contexts/AuthContext.tsx
// FULL Auth Context with all authentication logic
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '../../types';

interface AuthContextType {
    // State
    session: any;
    currentUser: User | null;
    isLoadingAuth: boolean;
    authError: string | undefined;

    // Handlers
    handleLogin: (email: string, password: string) => Promise<void>;
    handleLogout: () => Promise<void>;
    setAuthError: (error: string | undefined) => void;
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
    refetchUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
    onShowNotification?: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, onShowNotification }) => {
    const [session, setSession] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [authError, setAuthError] = useState<string | undefined>(undefined);

    // Helper to show notification
    const showNotification = useCallback((title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => {
        if (onShowNotification) {
            onShowNotification(title, message, type);
        }
    }, [onShowNotification]);

    // Fetch user profile from database
    const fetchUserProfile = useCallback(async (userId: string) => {
        try {
            const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
            if (error) {
                console.error('fetchUserProfile error', error);
                if (error.code === '42501' || error.message.includes('policy')) {
                    showNotification(
                        'RLS Policy Error',
                        'Terjadi masalah dengan database policies. Silakan setup RLS policies terlebih dahulu.',
                        'error'
                    );
                }
                setCurrentUser(null);
            } else if (data) {
                const mappedUser = {
                    ...data,
                    sakuraAnimationEnabled: data.sakura_animation_enabled || false,
                    snowAnimationEnabled: data.snow_animation_enabled || false,
                    moneyAnimationEnabled: data.money_animation_enabled || false,
                    profilePhoto: data.profile_photo || undefined,
                    profilePhotoPath: data.profile_photo_path || undefined
                } as User;
                setCurrentUser(mappedUser);
            }
        } catch (err) {
            console.error('fetchUserProfile unexpected', err);
            showNotification('Gagal Memuat Profil', 'Tidak dapat memuat profil user.', 'error');
        }
    }, [showNotification]);

    // Refetch current user profile
    const refetchUserProfile = useCallback(async () => {
        if (session?.user?.id) {
            await fetchUserProfile(session.user.id);
        }
    }, [session, fetchUserProfile]);

    // Handle login
    const handleLogin = useCallback(async (email: string, password: string) => {
        try {
            setIsLoadingAuth(true);
            setAuthError(undefined);

            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                console.error('Login error:', error);
                setAuthError(error.message || 'Gagal login');
                setIsLoadingAuth(false);
                return;
            }

            const sess = data?.session ?? null;
            if (sess) {
                setSession(sess);
                await fetchUserProfile(sess.user.id);
            } else {
                const { data: sessData } = await supabase.auth.getSession();
                const s = sessData?.session ?? null;
                setSession(s);
                if (s) await fetchUserProfile(s.user.id);
            }
            setIsLoadingAuth(false);
        } catch (err: any) {
            console.error('Unexpected login error:', err);
            setAuthError(err?.message || 'Terjadi kesalahan saat login');
            setIsLoadingAuth(false);
        }
    }, [fetchUserProfile]);

    // Handle logout
    const handleLogout = useCallback(async () => {
        try {
            await supabase.auth.signOut();
            setCurrentUser(null);
            setSession(null);
            localStorage.clear();
            sessionStorage.clear();
        } catch (error: any) {
            console.error('Logout error:', error);
            setCurrentUser(null);
            setSession(null);
            localStorage.clear();
            sessionStorage.clear();
        }
    }, []);

    // Initialize auth state
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                setIsLoadingAuth(true);
                const { data } = await supabase.auth.getSession();
                const sess = data?.session ?? null;
                if (mounted) {
                    setSession(sess);
                    if (sess) await fetchUserProfile(sess.user.id);
                }
            } catch (err) {
                console.error('Error getting session', err);
            } finally {
                if (mounted) setIsLoadingAuth(false);
            }
        };

        init();

        const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
            setSession(sess);
            if (sess) {
                fetchUserProfile(sess.user.id);
            } else {
                setCurrentUser(null);
            }
        });

        return () => {
            mounted = false;
            sub.subscription?.unsubscribe?.();
        };
    }, [fetchUserProfile]);

    const value: AuthContextType = {
        session,
        currentUser,
        isLoadingAuth,
        authError,
        handleLogin,
        handleLogout,
        setAuthError,
        setCurrentUser,
        refetchUserProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
