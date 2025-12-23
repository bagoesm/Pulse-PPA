// src/hooks/useMiscHandlers.ts
// Miscellaneous handlers - christmas, announcement, data inventory, status, notifications
import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Announcement, DataInventoryItem, ChristmasDecorationSettings, UserStatus, User } from '../../types';

interface UseMiscHandlersProps {
    currentUser: User | null;
    announcements: Announcement[];
    setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
    dataInventory: DataInventoryItem[];
    setDataInventory: React.Dispatch<React.SetStateAction<DataInventoryItem[]>>;
    userStatuses: UserStatus[];
    setUserStatuses: React.Dispatch<React.SetStateAction<UserStatus[]>>;
    christmasSettings: ChristmasDecorationSettings;
    setChristmasSettings: React.Dispatch<React.SetStateAction<ChristmasDecorationSettings>>;
    editingAnnouncement: Announcement | null;
    setEditingAnnouncement: React.Dispatch<React.SetStateAction<Announcement | null>>;
    setIsAnnouncementModalOpen: (open: boolean) => void;
    setIsStatusModalOpen: (open: boolean) => void;
    showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    fetchAllData: () => Promise<void>;
}

export const useMiscHandlers = ({
    currentUser,
    announcements,
    setAnnouncements,
    dataInventory,
    setDataInventory,
    userStatuses,
    setUserStatuses,
    christmasSettings,
    setChristmasSettings,
    editingAnnouncement,
    setEditingAnnouncement,
    setIsAnnouncementModalOpen,
    setIsStatusModalOpen,
    showNotification,
    fetchAllData
}: UseMiscHandlersProps) => {

    // === CHRISTMAS SETTINGS ===
    const handleUpdateChristmasSettings = useCallback(async (settings: ChristmasDecorationSettings) => {
        try {
            const { data: existing } = await supabase.from('christmas_settings').select('id').single();

            const settingsData = {
                santa_hat_enabled: settings.santaHatEnabled,
                bauble_enabled: settings.baubleEnabled,
                candy_enabled: settings.candyEnabled,
                enabled_by: currentUser?.id,
                enabled_at: new Date().toISOString()
            };

            if (existing) {
                await supabase.from('christmas_settings').update(settingsData).eq('id', existing.id);
            } else {
                await supabase.from('christmas_settings').insert([settingsData]);
            }

            setChristmasSettings(settings);
            showNotification('Christmas Settings Diperbarui!', 'Pengaturan dekorasi Natal berhasil disimpan.', 'success');
        } catch (error: any) {
            showNotification('Gagal Update Settings', error.message, 'error');
        }
    }, [currentUser, setChristmasSettings, showNotification]);

    // === ANNOUNCEMENT HANDLERS ===
    const handleCreateAnnouncement = useCallback(() => {
        setEditingAnnouncement(null);
        setIsAnnouncementModalOpen(true);
    }, [setEditingAnnouncement, setIsAnnouncementModalOpen]);

    const handleEditAnnouncement = useCallback((announcement: Announcement) => {
        setEditingAnnouncement(announcement);
        setIsAnnouncementModalOpen(true);
    }, [setEditingAnnouncement, setIsAnnouncementModalOpen]);

    const handleSaveAnnouncement = useCallback(async (announcementData: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            const payload = {
                title: announcementData.title,
                description: announcementData.description,
                type: announcementData.type,
                emoji: announcementData.emoji,
                background_color: announcementData.backgroundColor,
                text_color: announcementData.textColor,
                is_active: announcementData.isActive,
                created_by: announcementData.createdBy,
                expires_at: announcementData.expiresAt,
                updated_at: new Date().toISOString()
            };

            if (editingAnnouncement) {
                const { data, error } = await supabase
                    .from('announcements')
                    .update(payload)
                    .eq('id', editingAnnouncement.id)
                    .select()
                    .single();

                if (error) {
                    showNotification('Gagal Update Pengumuman', error.message, 'error');
                    return;
                }

                if (data) {
                    const mapped: Announcement = {
                        id: data.id,
                        title: data.title,
                        description: data.description,
                        type: data.type,
                        emoji: data.emoji,
                        backgroundColor: data.background_color,
                        textColor: data.text_color,
                        isActive: data.is_active,
                        createdBy: data.created_by,
                        createdAt: data.created_at,
                        updatedAt: data.updated_at,
                        expiresAt: data.expires_at
                    };
                    setAnnouncements(prev => prev.map(a => a.id === editingAnnouncement.id ? mapped : a));
                    showNotification('Pengumuman Diperbarui!', `"${announcementData.title}" berhasil diperbarui.`, 'success');
                }
            } else {
                const { data, error } = await supabase
                    .from('announcements')
                    .insert([{ ...payload, created_at: new Date().toISOString() }])
                    .select()
                    .single();

                if (error) {
                    showNotification('Gagal Tambah Pengumuman', error.message, 'error');
                    return;
                }

                if (data) {
                    const mapped: Announcement = {
                        id: data.id,
                        title: data.title,
                        description: data.description,
                        type: data.type,
                        emoji: data.emoji,
                        backgroundColor: data.background_color,
                        textColor: data.text_color,
                        isActive: data.is_active,
                        createdBy: data.created_by,
                        createdAt: data.created_at,
                        updatedAt: data.updated_at,
                        expiresAt: data.expires_at
                    };
                    setAnnouncements(prev => [mapped, ...prev]);
                    showNotification('Pengumuman Dibuat!', `"${announcementData.title}" berhasil ditambahkan.`, 'success');
                }
            }

            setIsAnnouncementModalOpen(false);
            setEditingAnnouncement(null);
        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [editingAnnouncement, setAnnouncements, setEditingAnnouncement, setIsAnnouncementModalOpen, showNotification]);

    const handleDeleteAnnouncement = useCallback(async (id: string) => {
        try {
            const { error } = await supabase.from('announcements').delete().eq('id', id);
            if (error) {
                showNotification('Gagal Hapus Pengumuman', error.message, 'error');
                return;
            }
            setAnnouncements(prev => prev.filter(a => a.id !== id));
            showNotification('Pengumuman Dihapus', 'Pengumuman berhasil dihapus.', 'success');
        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [setAnnouncements, showNotification]);

    const handleToggleAnnouncementActive = useCallback(async (id: string, isActive: boolean) => {
        try {
            const { error } = await supabase.from('announcements')
                .update({ is_active: isActive, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) {
                showNotification('Gagal Update Status', error.message, 'error');
                return;
            }

            setAnnouncements(prev => prev.map(a =>
                a.id === id ? { ...a, isActive, updatedAt: new Date().toISOString() } : a
            ));
        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [setAnnouncements, showNotification]);

    // === DATA INVENTORY HANDLERS ===
    const handleAddDataInventory = useCallback(async (itemData: Omit<DataInventoryItem, 'id' | 'createdAt' | 'createdBy'>) => {
        if (!currentUser) return;

        try {
            const { data, error } = await supabase.from('data_inventory').insert([{
                title: itemData.title,
                description: itemData.description,
                links: itemData.links,
                created_by: currentUser.name,
                created_at: new Date().toISOString()
            }]).select().single();

            if (error) {
                showNotification('Gagal Tambah Data', error.message, 'error');
                return;
            }

            if (data) {
                const mapped: DataInventoryItem = {
                    id: data.id,
                    title: data.title,
                    description: data.description,
                    links: data.links || [],
                    createdBy: data.created_by,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at
                };
                setDataInventory(prev => [mapped, ...prev]);
                showNotification('Data Ditambahkan!', `"${itemData.title}" berhasil ditambahkan.`, 'success');
            }
        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [currentUser, setDataInventory, showNotification]);

    const handleUpdateDataInventory = useCallback(async (item: DataInventoryItem) => {
        try {
            const { data, error } = await supabase.from('data_inventory')
                .update({
                    title: item.title,
                    description: item.description,
                    links: item.links,
                    updated_at: new Date().toISOString()
                })
                .eq('id', item.id)
                .select()
                .single();

            if (error) {
                showNotification('Gagal Update Data', error.message, 'error');
                return;
            }

            if (data) {
                const mapped: DataInventoryItem = {
                    id: data.id,
                    title: data.title,
                    description: data.description,
                    links: data.links || [],
                    createdBy: data.created_by,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at
                };
                setDataInventory(prev => prev.map(i => i.id === item.id ? mapped : i));
                showNotification('Data Diperbarui!', `"${item.title}" berhasil diperbarui.`, 'success');
            }
        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [setDataInventory, showNotification]);

    const handleDeleteDataInventory = useCallback(async (id: string) => {
        try {
            const { error } = await supabase.from('data_inventory').delete().eq('id', id);
            if (error) {
                showNotification('Gagal Hapus Data', error.message, 'error');
                return;
            }
            setDataInventory(prev => prev.filter(i => i.id !== id));
            showNotification('Data Dihapus', 'Data berhasil dihapus.', 'success');
        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [setDataInventory, showNotification]);

    // === STATUS HANDLERS ===
    const handleCreateStatus = useCallback(() => {
        setIsStatusModalOpen(true);
    }, [setIsStatusModalOpen]);

    const handleSaveStatus = useCallback(async (statusData: Omit<UserStatus, 'id' | 'userId' | 'createdAt' | 'expiresAt'>) => {
        if (!currentUser) return;

        try {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            const { data, error } = await supabase.from('user_statuses').insert([{
                user_id: currentUser.id,
                type: statusData.type,
                content: statusData.content,
                emoji: statusData.emoji,
                expires_at: expiresAt.toISOString()
            }]).select().single();

            if (error) {
                showNotification('Gagal Set Status', error.message, 'error');
                return;
            }

            if (data) {
                const mapped: UserStatus = {
                    id: data.id,
                    userId: data.user_id,
                    type: data.type,
                    content: data.content,
                    emoji: data.emoji,
                    createdAt: data.created_at,
                    expiresAt: data.expires_at
                };
                setUserStatuses(prev => [...prev, mapped]);
                setIsStatusModalOpen(false);
            }
        } catch (error: any) {
            showNotification('Kesalahan', `Terjadi kesalahan: ${error.message}`, 'error');
        }
    }, [currentUser, setUserStatuses, setIsStatusModalOpen, showNotification]);

    const handleDeleteStatus = useCallback(async (statusId: string) => {
        try {
            const { error } = await supabase.from('user_statuses').delete().eq('id', statusId);
            if (!error) {
                setUserStatuses(prev => prev.filter(s => s.id !== statusId));
            }
        } catch (error) {
            console.error('Error deleting status:', error);
        }
    }, [setUserStatuses]);

    return {
        // Christmas
        handleUpdateChristmasSettings,
        // Announcement
        handleCreateAnnouncement,
        handleEditAnnouncement,
        handleSaveAnnouncement,
        handleDeleteAnnouncement,
        handleToggleAnnouncementActive,
        // Data Inventory
        handleAddDataInventory,
        handleUpdateDataInventory,
        handleDeleteDataInventory,
        // Status
        handleCreateStatus,
        handleSaveStatus,
        handleDeleteStatus
    };
};

export default useMiscHandlers;
