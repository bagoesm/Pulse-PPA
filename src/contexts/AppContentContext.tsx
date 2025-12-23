// src/contexts/AppContentContext.tsx
// Domain context for Feedbacks, Document Templates, Announcements, DataInventory, ChristmasSettings
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
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
    const [isAppContentLoading, setIsAppContentLoading] = useState(false);

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

    const fetchFeedbacks = useCallback(async () => {
        const { data: fbData } = await supabase.from('feedbacks').select('*');
        if (fbData) {
            const mappedFb = fbData.map((f: any) => ({
                ...f,
                adminResponse: f.admin_response ?? f.adminResponse ?? '',
                createdBy: f.created_by ?? f.createdBy ?? 'Unknown',
                createdAt: f.created_at ? new Date(f.created_at).toISOString().split('T')[0] : (f.createdAt || '')
            }));
            setFeedbacks(mappedFb);
        }
    }, []);

    const fetchDocumentTemplates = useCallback(async () => {
        const { data: tmplData } = await supabase.from('document_templates').select('*');
        if (tmplData) {
            const mappedTmpl = tmplData.map((t: any) => ({
                ...t,
                fileType: t.file_type ?? t.fileType ?? '',
                fileSize: typeof t.file_size === 'number' ? t.file_size : Number(t.file_size) || 0,
                uploadedBy: t.uploaded_by ?? t.uploadedBy ?? '',
                updatedAt: t.updated_at ? new Date(t.updated_at).toISOString().split('T')[0] : (t.updatedAt || ''),
                filePath: t.file_path ?? t.filePath ?? '',
                fileUrl: t.file_url ?? t.fileUrl ?? '',
                downloadCount: t.download_count ?? t.downloadCount ?? 0
            }));
            setDocumentTemplates(mappedTmpl);
        }
    }, []);

    const fetchAnnouncements = useCallback(async () => {
        const { data: announcementsData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
        if (announcementsData) {
            const mappedAnnouncements = announcementsData.map((a: any) => ({
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
            setAnnouncements(mappedAnnouncements);
        }
    }, []);

    const fetchDataInventory = useCallback(async () => {
        const { data: inventoryData } = await supabase.from('data_inventory').select('*').order('created_at', { ascending: false });
        if (inventoryData) {
            const mappedInventory = inventoryData.map((item: any) => ({
                id: item.id,
                title: item.title,
                description: item.description,
                links: item.links || [],
                createdBy: item.created_by,
                createdAt: item.created_at,
                updatedAt: item.updated_at
            }));
            setDataInventory(mappedInventory);
        }
    }, []);

    const fetchChristmasSettings = useCallback(async () => {
        const { data: christmasData, error: christmasErr } = await supabase.from('christmas_settings').select('*').single();
        if (christmasData && !christmasErr) {
            setChristmasSettings({
                id: christmasData.id,
                santaHatEnabled: christmasData.santa_hat_enabled || false,
                baubleEnabled: christmasData.bauble_enabled || false,
                candyEnabled: christmasData.candy_enabled || false,
                enabledBy: christmasData.enabled_by,
                enabledAt: christmasData.enabled_at
            });
        }
    }, []);

    const clearAppContent = useCallback(() => {
        setFeedbacks([]);
        setDocumentTemplates([]);
        setTemplateFilePaths({});
        setAnnouncements([]);
        setDataInventory([]);
    }, []);

    useEffect(() => {
        if (session) {
            setIsAppContentLoading(true);
            Promise.all([
                fetchFeedbacks(),
                fetchDocumentTemplates(),
                fetchAnnouncements(),
                fetchDataInventory(),
                fetchChristmasSettings()
            ]).finally(() => setIsAppContentLoading(false));
        } else {
            clearAppContent();
        }
    }, [session, fetchFeedbacks, fetchDocumentTemplates, fetchAnnouncements, fetchDataInventory, fetchChristmasSettings, clearAppContent]);

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
