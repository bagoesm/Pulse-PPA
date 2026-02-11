// src/hooks/useUserHandlers.ts
// Comprehensive user handlers - CRUD, profile photo operations
import { useCallback, startTransition } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '../../types';

interface UseUserHandlersProps {
    currentUser: User | null;
    allUsers: User[];
    setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
    fetchAllData: () => Promise<void>;
    showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    hideNotification: () => void;
    setActiveTab: (tab: string) => void;
    setFilters: React.Dispatch<React.SetStateAction<any>>;
}

export const useUserHandlers = ({
    currentUser,
    allUsers,
    setAllUsers,
    setCurrentUser,
    fetchAllData,
    showNotification,
    hideNotification,
    setActiveTab,
    setFilters
}: UseUserHandlersProps) => {

    // Add new user with Supabase auth
    const handleAddUser = useCallback(async (newUser: User) => {
        try {
            if (!newUser.email || !newUser.password || !newUser.name) {
                showNotification('Data Tidak Lengkap', 'Email, password, dan nama wajib diisi.', 'warning');
                return;
            }

            hideNotification();

            try {
                const { createClient } = await import('@supabase/supabase-js');
                const adminClient = createClient(
                    import.meta.env.VITE_SUPABASE_URL,
                    import.meta.env.VITE_SUPABASE_ANON_KEY,
                    {
                        auth: {
                            autoRefreshToken: false,
                            persistSession: false,
                            detectSessionInUrl: false,
                            storageKey: `admin-create-${Date.now()}`
                        }
                    }
                );

                const { data: authUser, error: authError } = await adminClient.auth.signUp({
                    email: newUser.email,
                    password: newUser.password,
                    options: {
                        emailRedirectTo: undefined,
                        data: {
                            name: newUser.name,
                            role: newUser.role,
                            jabatan: newUser.jabatan,
                            initials: newUser.initials
                        },
                        // Disable email confirmation for admin-created users
                        // Note: This requires email confirmation to be disabled in Supabase settings
                        // or using service role key
                    }
                });

                if (authError) throw authError;
                if (!authUser.user) throw new Error('Failed to create auth user');

                await adminClient.auth.signOut();

                const profileData = {
                    id: authUser.user.id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role,
                    jabatan: newUser.jabatan || null,
                    initials: newUser.initials,
                    sakura_animation_enabled: newUser.sakuraAnimationEnabled || false,
                    snow_animation_enabled: newUser.snowAnimationEnabled || false,
                    money_animation_enabled: newUser.moneyAnimationEnabled || false
                };

                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert([profileData])
                    .select()
                    .single();

                if (profileError) {
                    showNotification('Gagal Membuat Profil', `User auth berhasil dibuat tetapi gagal membuat profil: ${profileError.message}`, 'warning');
                    return;
                }

                await fetchAllData();
                showNotification(
                    'User Berhasil Ditambahkan!',
                    `User ${newUser.name} berhasil ditambahkan dengan email ${newUser.email}. User dapat langsung login jika email confirmation dinonaktifkan di Supabase.`,
                    'success'
                );

            } catch (authCreateError: any) {
                console.error('Auth creation error:', authCreateError);
                if (authCreateError.message?.includes('already registered') || authCreateError.message?.includes('User already registered')) {
                    showNotification('Email Sudah Terdaftar', `Email ${newUser.email} sudah terdaftar.`, 'error');
                } else if (authCreateError.message?.includes('Password')) {
                    showNotification('Password Tidak Valid', `Password tidak valid: ${authCreateError.message}`, 'error');
                } else if (authCreateError.message?.includes('Email') || authCreateError.message?.includes('confirmation')) {
                    showNotification(
                        'Konfirmasi Email Diperlukan', 
                        `User berhasil dibuat tetapi memerlukan konfirmasi email. Silakan cek email ${newUser.email} atau nonaktifkan email confirmation di Supabase Dashboard > Authentication > Settings > Email Auth > Disable "Enable email confirmations".`, 
                        'warning'
                    );
                    // Still fetch data as the user might be created
                    await fetchAllData();
                } else {
                    showNotification('Gagal Membuat User', `Gagal membuat user: ${authCreateError.message}`, 'error');
                }
            }
        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [fetchAllData, hideNotification, showNotification]);

    // Edit existing user
    const handleEditUser = useCallback(async (updatedUser: User) => {
        try {
            const originalUser = allUsers.find(u => u.id === updatedUser.id);
            const emailChanged = originalUser && originalUser.email !== updatedUser.email;

            // Update password di Supabase auth jika password diisi
            if (updatedUser.password && updatedUser.password.trim() !== '') {
                try {
                    // Gunakan RPC function untuk update password (lebih aman daripada service role di frontend)
                    const { error: passwordError } = await supabase.rpc('admin_update_user_password', {
                        user_id: updatedUser.id,
                        new_password: updatedUser.password
                    });

                    if (passwordError) {
                        // Jika RPC function belum ada, tampilkan pesan yang informatif
                        if (passwordError.message.includes('function') || passwordError.message.includes('does not exist')) {
                            showNotification(
                                'Fitur Belum Tersedia', 
                                'Fitur update password memerlukan database function. Silakan setup database function terlebih dahulu atau gunakan Supabase Dashboard untuk reset password.', 
                                'warning'
                            );
                        } else {
                            showNotification('Gagal Update Password', `Gagal mengupdate password: ${passwordError.message}`, 'error');
                        }
                        // Lanjutkan update profile meskipun password gagal
                    }
                } catch (passwordErr: any) {
                    showNotification('Gagal Update Password', `Gagal mengupdate password: ${passwordErr.message}`, 'warning');
                    // Lanjutkan update profile meskipun password gagal
                }
            }

            const { error: profileError } = await supabase.from('profiles').update({
                name: updatedUser.name,
                role: updatedUser.role,
                jabatan: updatedUser.jabatan,
                initials: updatedUser.initials,
                email: updatedUser.email,
                sakura_animation_enabled: updatedUser.sakuraAnimationEnabled || false,
                snow_animation_enabled: updatedUser.snowAnimationEnabled || false,
                money_animation_enabled: updatedUser.moneyAnimationEnabled || false
            }).eq('id', updatedUser.id);

            if (profileError) {
                showNotification('Gagal Mengupdate Profil', `Gagal mengupdate profil: ${profileError.message}`, 'error');
                return;
            }

            if (emailChanged) {
                showNotification('Profil Diupdate', `Profil ${updatedUser.name} diperbarui. Email auth masih email lama.`, 'success');
            } else if (updatedUser.password && updatedUser.password.trim() !== '') {
                showNotification('User Berhasil Diupdate!', `Data user ${updatedUser.name} berhasil diperbarui termasuk password.`, 'success');
            } else {
                showNotification('User Berhasil Diupdate!', `Data user ${updatedUser.name} berhasil diperbarui.`, 'success');
            }

            setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
            if (currentUser?.id === updatedUser.id) setCurrentUser(updatedUser);

        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [allUsers, currentUser, setAllUsers, setCurrentUser, showNotification]);

    // Delete user
    const handleDeleteUser = useCallback(async (userId: string) => {
        try {
            const userToDelete = allUsers.find(u => u.id === userId);
            const userName = userToDelete?.name || 'User';

            if (currentUser?.role !== 'Super Admin') {
                showNotification('Akses Ditolak', 'Hanya Super Admin yang dapat menghapus user.', 'error');
                return;
            }

            const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);

            if (profileError) {
                showNotification('Gagal Menghapus', `Gagal menghapus user: ${profileError.message}`, 'error');
                return;
            }

            setAllUsers(prev => prev.filter(u => u.id !== userId));
            showNotification('User Dihapus', `Profil user ${userName} berhasil dihapus.`, 'success');
        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [allUsers, currentUser, setAllUsers, showNotification]);

    // Upload profile photo
    const handleUploadProfilePhoto = useCallback(async (file: File) => {
        if (!currentUser) return;

        try {
            const oldPhotoPath = currentUser.profilePhotoPath;
            const fileName = `${currentUser.id}_${Date.now()}.jpg`;

            const { error: uploadError } = await supabase.storage
                .from('profile-photos')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('profile-photos')
                .getPublicUrl(fileName);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    profile_photo: urlData.publicUrl,
                    profile_photo_path: fileName
                })
                .eq('id', currentUser.id);

            if (updateError) throw updateError;

            if (oldPhotoPath && oldPhotoPath !== fileName) {
                await supabase.storage.from('profile-photos').remove([oldPhotoPath]);
            }

            const updatedUser = {
                ...currentUser,
                profilePhoto: urlData.publicUrl,
                profilePhotoPath: fileName
            };
            setCurrentUser(updatedUser);
            setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
        } catch (error) {
            throw error;
        }
    }, [currentUser, setAllUsers, setCurrentUser]);

    // Remove profile photo
    const handleRemoveProfilePhoto = useCallback(async () => {
        if (!currentUser) return;

        try {
            if (currentUser.profilePhotoPath) {
                await supabase.storage.from('profile-photos').remove([currentUser.profilePhotoPath]);
            }

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ profile_photo: null, profile_photo_path: null })
                .eq('id', currentUser.id);

            if (updateError) throw updateError;

            const updatedUser = {
                ...currentUser,
                profilePhoto: undefined,
                profilePhotoPath: undefined
            };
            setCurrentUser(updatedUser);
            setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
        } catch (error) {
            throw error;
        }
    }, [currentUser, setAllUsers, setCurrentUser]);

    // Handle user card click from dashboard
    const handleUserCardClick = useCallback((userName: string) => {
        startTransition(() => setActiveTab('Semua Task'));
        setFilters((prev: any) => ({
            ...prev,
            pic: userName,
            search: '',
            category: 'All',
            priority: 'All',
            status: 'All',
            projectId: 'All'
        }));
    }, [setActiveTab, setFilters]);

    return {
        handleAddUser,
        handleEditUser,
        handleDeleteUser,
        handleUploadProfilePhoto,
        handleRemoveProfilePhoto,
        handleUserCardClick
    };
};

export default useUserHandlers;
