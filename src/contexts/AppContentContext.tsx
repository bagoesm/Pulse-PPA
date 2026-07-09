// src/contexts/AppContentContext.tsx
// Domain context for Feedbacks, Document Templates, Announcements, DataInventory, ChristmasSettings
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { supabase } from '../lib/supabaseClient';
import { Feedback, DocumentTemplate, Announcement, DataInventoryItem, ChristmasDecorationSettings } from '../../types';

interface AppContentContextType {
    // Feedbacks
    feedbacks: Feedback[];
    setFeedbacks: React.Dispatch<React.SetStateAction<Feedback[]>>;

    // Document Templates
    documentTemplates: DocumentTemplate[];
    setDocumentTemplates: React.Dispatch<React.SetStateAction<DocumentTemplate[]>>;
    templateFilePaths: { [key: string]: string };
    setTemplateFilePaths: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;

    // Announcements
    announcements: Announcement[];
    setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;

    // Data Inventory
    dataInventory: DataInventoryItem[];
    setDataInventory: React.Dispatch<React.SetStateAction<DataInventoryItem[]>>;

    // Christmas Settings
    christmasSettings: ChristmasDecorationSettings;
    setChristmasSettings: React.Dispatch<React.SetStateAction<ChristmasDecorationSettings>>;

    // Fetch operations
    fetchFeedbacks: () => Promise<void>;
    fetchDocumentTemplates: () => Promise<void>;
    fetchAnnouncements: () => Promise<void>;
    fetchDataInventory: () => Promise<void>;
    fetchChristmasSettings: () => Promise<void>;
    clearAppContent: () => void;
    isAppContentLoading: boolean;
}

const AppContentContext = createContext<AppContentContextType | undefined>(undefined);

export const useAppContent = () => {
    const context = useContext(AppContentContext);
    if (!context) {
        throw new Error('useAppContent must be used within an AppContentProvider');
    }
    return context;
};

interface AppContentProviderProps {
    children: ReactNode;
    session: any;
}

export const AppContentProvider: React.FC<AppContentProviderProps> = ({ children, session }) => {
    // Feedbacks Query
    const { data: queryFeedbacks, isLoading: isFeedbacksLoading, refetch: refetchFeedbacks } = useQuery({
        queryKey: ['feedbacks'],
        queryFn: async (): Promise<Feedback[]> => {
            const { data: fbData } = await supabase.from('feedbacks').select('*');
            if (fbData) {
                return fbData.map((f: any) => ({
                    ...f,
                    adminResponse: f.admin_response ?? f.adminResponse ?? '',
                    createdBy: f.created_by ?? f.createdBy ?? 'Unknown',
                    createdAt: f.created_at ? new Date(f.created_at).toISOString().split('T')[0] : (f.createdAt || '')
                }));
            }
            return [];
        },
        enabled: !!session,
    });

    // Document Templates Query
    const { data: queryDocumentTemplates, isLoading: isTemplatesLoading, refetch: refetchDocumentTemplates } = useQuery({
        queryKey: ['documentTemplates'],
        queryFn: async (): Promise<DocumentTemplate[]> => {
            const { data: tmplData } = await supabase.from('document_templates').select('*');
            if (tmplData) {
                return tmplData.map((t: any) => ({
                    ...t,
                    fileType: t.file_type ?? t.fileType ?? '',
                    fileSize: typeof t.file_size === 'number' ? t.file_size : Number(t.file_size) || 0,
                    uploadedBy: t.uploaded_by ?? t.uploadedBy ?? '',
                    updatedAt: t.updated_at ? new Date(t.updated_at).toISOString().split('T')[0] : (t.updatedAt || ''),
                    filePath: t.file_path ?? t.filePath ?? '',
                    fileUrl: t.file_url ?? t.fileUrl ?? '',
                    downloadCount: t.download_count ?? t.downloadCount ?? 0
                }));
            }
            return [];
        },
        enabled: !!session,
    });

    // Announcements Query
    const { data: queryAnnouncements, isLoading: isAnnouncementsLoading, refetch: refetchAnnouncements } = useQuery({
        queryKey: ['announcements'],
        queryFn: async (): Promise<Announcement[]> => {
            const { data: announcementsData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
            if (announcementsData) {
                return announcementsData.map((a: any) => ({
                    id: a.id,
                    title: a.title,
                    description: a.description,
                    type: a.type,
                    emoji: a.emoji,
                    backgroundColor: a.background_color,
                    textColor: a.text_color,
                    isActive: a.is_active,
                    createdBy: a.created_by,
                    createdAt: a.created_at,
                    updatedAt: a.updated_at,
                    expiresAt: a.expires_at
                }));
            }
            return [];
        },
        enabled: !!session,
    });

    // Data Inventory Query
    const { data: queryDataInventory, isLoading: isInventoryLoading, refetch: refetchDataInventory } = useQuery({
        queryKey: ['dataInventory'],
        queryFn: async (): Promise<DataInventoryItem[]> => {
            const { data: inventoryData } = await supabase.from('data_inventory').select('*').order('created_at', { ascending: false });
            if (inventoryData) {
                return inventoryData.map((item: any) => ({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    links: item.links || [],
                    createdBy: item.created_by,
                    createdAt: item.created_at,
                    updatedAt: item.updated_at
                }));
            }
            return [];
        },
        enabled: !!session,
    });

    // Christmas Settings Query
    const { data: queryChristmasSettings, isLoading: isChristmasLoading, refetch: refetchChristmasSettings } = useQuery({
        queryKey: ['christmasSettings'],
        queryFn: async (): Promise<ChristmasDecorationSettings> => {
            const { data: christmasData, error: christmasErr } = await supabase.from('christmas_settings').select('*').single();
            if (christmasData && !christmasErr) {
                return {
                    id: christmasData.id,
                    santaHatEnabled: christmasData.santa_hat_enabled || false,
                    baubleEnabled: christmasData.bauble_enabled || false,
                    candyEnabled: christmasData.candy_enabled || false,
                    enabledBy: christmasData.enabled_by,
                    enabledAt: christmasData.enabled_at
                };
            }
            return {
                santaHatEnabled: false,
                baubleEnabled: false,
                candyEnabled: false
            };
        },
        enabled: !!session,
    });

    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>([]);
    const [templateFilePaths, setTemplateFilePaths] = useState<{ [key: string]: string }>({});
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [dataInventory, setDataInventory] = useState<DataInventoryItem[]>([]);
    const [christmasSettings, setChristmasSettings] = useState<ChristmasDecorationSettings>({
        santaHatEnabled: false,
        baubleEnabled: false,
        candyEnabled: false
    });

    useEffect(() => { if (queryFeedbacks) setFeedbacks(queryFeedbacks); }, [queryFeedbacks]);
    useEffect(() => { if (queryDocumentTemplates) setDocumentTemplates(queryDocumentTemplates); }, [queryDocumentTemplates]);
    useEffect(() => { if (queryAnnouncements) setAnnouncements(queryAnnouncements); }, [queryAnnouncements]);
    useEffect(() => { if (queryDataInventory) setDataInventory(queryDataInventory); }, [queryDataInventory]);
    useEffect(() => { if (queryChristmasSettings) setChristmasSettings(queryChristmasSettings); }, [queryChristmasSettings]);

    const isAppContentLoading = isFeedbacksLoading || isTemplatesLoading || isAnnouncementsLoading || isInventoryLoading || isChristmasLoading;

    const fetchFeedbacks = useCallback(async () => { await refetchFeedbacks(); }, [refetchFeedbacks]);
    const fetchDocumentTemplates = useCallback(async () => { await refetchDocumentTemplates(); }, [refetchDocumentTemplates]);
    const fetchAnnouncements = useCallback(async () => { await refetchAnnouncements(); }, [refetchAnnouncements]);
    const fetchDataInventory = useCallback(async () => { await refetchDataInventory(); }, [refetchDataInventory]);
    const fetchChristmasSettings = useCallback(async () => { await refetchChristmasSettings(); }, [refetchChristmasSettings]);

    const clearAppContent = useCallback(() => {
        setFeedbacks([]);
        setDocumentTemplates([]);
        setTemplateFilePaths({});
        setAnnouncements([]);
        setDataInventory([]);
        queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
        queryClient.invalidateQueries({ queryKey: ['documentTemplates'] });
        queryClient.invalidateQueries({ queryKey: ['announcements'] });
        queryClient.invalidateQueries({ queryKey: ['dataInventory'] });
        queryClient.invalidateQueries({ queryKey: ['christmasSettings'] });
    }, []);

    // Auto-fetch/clear based on session
    useEffect(() => {
        if (!session) {
            clearAppContent();
        }
    }, [session, clearAppContent]);

    const value: AppContentContextType = {
        feedbacks,
        setFeedbacks,
        documentTemplates,
        setDocumentTemplates,
        templateFilePaths,
        setTemplateFilePaths,
        announcements,
        setAnnouncements,
        dataInventory,
        setDataInventory,
        christmasSettings,
        setChristmasSettings,
        fetchFeedbacks,
        fetchDocumentTemplates,
        fetchAnnouncements,
        fetchDataInventory,
        fetchChristmasSettings,
        clearAppContent,
        isAppContentLoading
    };

    return (
        <AppContentContext.Provider value={value}>
            {children}
        </AppContentContext.Provider>
    );
};

export default AppContentContext;
