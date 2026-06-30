// src/contexts/BMNContext.tsx
// Domain context for BMN (Barang Milik Negara) - State-owned Asset Management
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BMNItem, BMNUploadHistory, BMNFilters, BMNStats } from '../../types';

interface BMNContextType {
    // State
    bmnItems: BMNItem[];
    setBmnItems: React.Dispatch<React.SetStateAction<BMNItem[]>>;
    uploadHistory: BMNUploadHistory[];
    setUploadHistory: React.Dispatch<React.SetStateAction<BMNUploadHistory[]>>;
    filters: BMNFilters;
    setFilters: React.Dispatch<React.SetStateAction<BMNFilters>>;
    searchQuery: string;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    isLoading: boolean;
    error: string | null;

    // Fetch operations
    fetchBMNItems: () => Promise<void>;
    fetchUploadHistory: () => Promise<void>;
    
    // CRUD operations
    createBMNItem: (item: Omit<BMNItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<BMNItem>;
    updateBMNItem: (id: string, updates: Partial<BMNItem>) => Promise<void>;
    deleteBMNItem: (id: string) => Promise<void>;
    
    // Clear operations
    clearBMNData: () => void;
}

const BMNContext = createContext<BMNContextType | undefined>(undefined);

export const useBMN = () => {
    const context = useContext(BMNContext);
    if (!context) {
        throw new Error('useBMN must be used within a BMNProvider');
    }
    return context;
};

interface BMNProviderProps {
    children: ReactNode;
    session: any;
}

export const BMNProvider: React.FC<BMNProviderProps> = ({ children, session }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [bmnItems, setBmnItems] = useState<BMNItem[]>([]);
    const [uploadHistory, setUploadHistory] = useState<BMNUploadHistory[]>([]);
    const [filters, setFilters] = useState<BMNFilters>({
        search: '',
        jenisBMN: 'All',
        statusBMN: 'All',
        kondisi: 'All',
        namaSatker: 'All'
    });
    const [searchQuery, setSearchQuery] = useState('');

    /**
     * Fetch BMN Items from database
     * Validates: Requirements 6.1
     */
    const fetchBMNItems = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('bmn_items')
                .select('*, profiles:held_by(id, name)')
                .order('created_at', { ascending: false });

            if (fetchError) {
                throw fetchError;
            }

            if (data) {
                // Map database fields to BMNItem interface
                const mappedItems: BMNItem[] = data.map((item: any) => ({
                    id: item.id,
                    kodeBarang: item.kode_barang,
                    namaBarang: item.nama_barang,
                    jenisBMN: item.jenis_bmn,
                    merk: item.merk,
                    tipe: item.tipe,
                    statusBMN: item.status_bmn,
                    kondisi: item.kondisi,
                    nilaiPerolehan: item.nilai_perolehan,
                    tahunPerolehan: item.tahun_perolehan,
                    tanggalPerolehan: item.tanggal_perolehan,
                    umurAset: item.umur_aset,
                    jumlah: item.jumlah,
                    satuan: item.satuan,
                    luas: item.luas,
                    namaSatker: item.nama_satker,
                    alamat: item.alamat,
                    kota: item.kota,
                    provinsi: item.provinsi,
                    nomorRegister: item.nomor_register,
                    nup: item.nup,
                    nomorSertifikat: item.nomor_sertifikat,
                    tanggalSertifikat: item.tanggal_sertifikat,
                    tanggalPengapusan: item.tanggal_pengapusan,
                    alasanPengapusan: item.alasan_pengapusan,
                    keterangan: item.keterangan,
                    rawData: item.raw_data, // Map raw_data from database
                    createdBy: item.created_by,
                    createdAt: item.created_at,
                    updatedAt: item.updated_at,
                    uploadBatchId: item.upload_batch_id,
                    heldBy: item.held_by,
                    holder: item.profiles ? { id: item.profiles.id, name: item.profiles.name } : null
                }));

                setBmnItems(mappedItems);
            }
        } catch (err) {
            console.error('Error fetching BMN items:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch BMN items');
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Fetch Upload History from database with user names
     * Validates: Requirements 3.1, 16.2
     */
    const fetchUploadHistory = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // First, fetch upload history
            const { data: historyData, error: fetchError } = await supabase
                .from('bmn_upload_history')
                .select('*')
                .order('uploaded_at', { ascending: false });

            if (fetchError) {
                throw fetchError;
            }

            if (historyData && historyData.length > 0) {
                // Get unique user IDs (filter only valid UUIDs)
                const userIds = new Set<string>();
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                
                historyData.forEach((item: any) => {
                    if (item.uploaded_by && uuidRegex.test(item.uploaded_by)) {
                        userIds.add(item.uploaded_by);
                    }
                    if (item.rolled_back_by && uuidRegex.test(item.rolled_back_by)) {
                        userIds.add(item.rolled_back_by);
                    }
                });

                // Fetch user names only if we have valid UUIDs
                let usersData: any[] = [];
                if (userIds.size > 0) {
                    const { data } = await supabase
                        .from('profiles')
                        .select('id, name')
                        .in('id', Array.from(userIds));
                    usersData = data || [];
                }

                // Create a map of user ID to name
                const userMap = new Map<string, string>();
                if (usersData) {
                    usersData.forEach((user: any) => {
                        userMap.set(user.id, user.name);
                    });
                }

                // Map database fields to BMNUploadHistory interface with user names
                const mappedHistory: BMNUploadHistory[] = historyData.map((item: any) => ({
                    id: item.id,
                    filename: item.filename,
                    fileSize: item.file_size,
                    fileType: item.file_type,
                    totalRecords: item.total_records,
                    successfulRecords: item.successful_records,
                    failedRecords: item.failed_records,
                    status: item.status,
                    errorDetails: item.error_details,
                    uploadedBy: userMap.get(item.uploaded_by) || item.uploaded_by, // Use name if found, fallback to UUID
                    uploadedAt: item.uploaded_at,
                    rolledBackAt: item.rolled_back_at,
                    rolledBackBy: item.rolled_back_by ? (userMap.get(item.rolled_back_by) || item.rolled_back_by) : undefined,
                    previousDataSnapshot: item.previous_data_snapshot
                }));

                setUploadHistory(mappedHistory);
            } else {
                setUploadHistory([]);
            }
        } catch (err) {
            console.error('Error fetching upload history:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch upload history');
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Create a new BMN Item
     * Validates: Requirements 17.7
     */
    const createBMNItem = useCallback(async (
        item: Omit<BMNItem, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<BMNItem> => {
        setIsLoading(true);
        setError(null);
        try {
            // Map BMNItem interface to database fields
            const dbItem = {
                kode_barang: item.kodeBarang,
                nama_barang: item.namaBarang,
                jenis_bmn: item.jenisBMN,
                merk: item.merk,
                tipe: item.tipe,
                status_bmn: item.statusBMN,
                kondisi: item.kondisi,
                nilai_perolehan: item.nilaiPerolehan,
                tahun_perolehan: item.tahunPerolehan,
                tanggal_perolehan: item.tanggalPerolehan,
                umur_aset: item.umurAset,
                jumlah: item.jumlah,
                satuan: item.satuan,
                luas: item.luas,
                nama_satker: item.namaSatker,
                alamat: item.alamat,
                kota: item.kota,
                provinsi: item.provinsi,
                nomor_register: item.nomorRegister,
                nup: item.nup,
                nomor_sertifikat: item.nomorSertifikat,
                tanggal_sertifikat: item.tanggalSertifikat,
                tanggal_pengapusan: item.tanggalPengapusan,
                alasan_pengapusan: item.alasanPengapusan,
                keterangan: item.keterangan,
                created_by: item.createdBy,
                upload_batch_id: item.uploadBatchId,
                held_by: item.heldBy
            };

            const { data, error: createError } = await supabase
                .from('bmn_items')
                .insert([dbItem])
                .select('*, profiles:held_by(id, name)')
                .single();

            if (createError) {
                throw createError;
            }

            if (!data) {
                throw new Error('No data returned from insert operation');
            }

            // Map response back to BMNItem
            const newItem: BMNItem = {
                id: data.id,
                kodeBarang: data.kode_barang,
                namaBarang: data.nama_barang,
                jenisBMN: data.jenis_bmn,
                merk: data.merk,
                tipe: data.tipe,
                statusBMN: data.status_bmn,
                kondisi: data.kondisi,
                nilaiPerolehan: data.nilai_perolehan,
                tahunPerolehan: data.tahun_perolehan,
                tanggalPerolehan: data.tanggal_perolehan,
                umurAset: data.umur_aset,
                jumlah: data.jumlah,
                satuan: data.satuan,
                luas: data.luas,
                namaSatker: data.nama_satker,
                alamat: data.alamat,
                kota: data.kota,
                provinsi: data.provinsi,
                nomorRegister: data.nomor_register,
                nup: data.nup,
                nomorSertifikat: data.nomor_sertifikat,
                tanggalSertifikat: data.tanggal_sertifikat,
                tanggalPengapusan: data.tanggal_pengapusan,
                alasanPengapusan: data.alasan_pengapusan,
                keterangan: data.keterangan,
                createdBy: data.created_by,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                uploadBatchId: data.upload_batch_id,
                heldBy: data.held_by,
                holder: data.profiles ? { id: data.profiles.id, name: data.profiles.name } : null
            };

            // Update local state
            setBmnItems(prev => [newItem, ...prev]);

            return newItem;
        } catch (err) {
            console.error('Error creating BMN item:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to create BMN item';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Update an existing BMN Item
     * Validates: Requirements 17.7
     */
    const updateBMNItem = useCallback(async (
        id: string,
        updates: Partial<BMNItem>
    ): Promise<void> => {
        setIsLoading(true);
        setError(null);
        try {
            // Map BMNItem interface to database fields
            const dbUpdates: any = {};
            
            if (updates.kodeBarang !== undefined) dbUpdates.kode_barang = updates.kodeBarang;
            if (updates.namaBarang !== undefined) dbUpdates.nama_barang = updates.namaBarang;
            if (updates.jenisBMN !== undefined) dbUpdates.jenis_bmn = updates.jenisBMN;
            if (updates.merk !== undefined) dbUpdates.merk = updates.merk;
            if (updates.tipe !== undefined) dbUpdates.tipe = updates.tipe;
            if (updates.statusBMN !== undefined) dbUpdates.status_bmn = updates.statusBMN;
            if (updates.kondisi !== undefined) dbUpdates.kondisi = updates.kondisi;
            if (updates.nilaiPerolehan !== undefined) dbUpdates.nilai_perolehan = updates.nilaiPerolehan;
            if (updates.tahunPerolehan !== undefined) dbUpdates.tahun_perolehan = updates.tahunPerolehan;
            if (updates.tanggalPerolehan !== undefined) dbUpdates.tanggal_perolehan = updates.tanggalPerolehan;
            if (updates.umurAset !== undefined) dbUpdates.umur_aset = updates.umurAset;
            if (updates.jumlah !== undefined) dbUpdates.jumlah = updates.jumlah;
            if (updates.satuan !== undefined) dbUpdates.satuan = updates.satuan;
            if (updates.luas !== undefined) dbUpdates.luas = updates.luas;
            if (updates.namaSatker !== undefined) dbUpdates.nama_satker = updates.namaSatker;
            if (updates.alamat !== undefined) dbUpdates.alamat = updates.alamat;
            if (updates.kota !== undefined) dbUpdates.kota = updates.kota;
            if (updates.provinsi !== undefined) dbUpdates.provinsi = updates.provinsi;
            if (updates.nomorRegister !== undefined) dbUpdates.nomor_register = updates.nomorRegister;
            if (updates.nup !== undefined) dbUpdates.nup = updates.nup;
            if (updates.nomorSertifikat !== undefined) dbUpdates.nomor_sertifikat = updates.nomorSertifikat;
            if (updates.tanggalSertifikat !== undefined) dbUpdates.tanggal_sertifikat = updates.tanggalSertifikat;
            if (updates.tanggalPengapusan !== undefined) dbUpdates.tanggal_pengapusan = updates.tanggalPengapusan;
            if (updates.alasanPengapusan !== undefined) dbUpdates.alasan_pengapusan = updates.alasanPengapusan;
            if (updates.keterangan !== undefined) dbUpdates.keterangan = updates.keterangan;
            if (updates.uploadBatchId !== undefined) dbUpdates.upload_batch_id = updates.uploadBatchId;
            if (updates.heldBy !== undefined) dbUpdates.held_by = updates.heldBy;

            // Always update the updated_at timestamp
            dbUpdates.updated_at = new Date().toISOString();

            const { error: updateError } = await supabase
                .from('bmn_items')
                .update(dbUpdates)
                .eq('id', id);

            if (updateError) {
                throw updateError;
            }

            // Update local state
            setBmnItems(prev => prev.map(item => 
                item.id === id 
                    ? { ...item, ...updates, updatedAt: dbUpdates.updated_at }
                    : item
            ));
        } catch (err) {
            console.error('Error updating BMN item:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to update BMN item';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Delete a BMN Item
     * Validates: Requirements 17.7
     */
    const deleteBMNItem = useCallback(async (id: string): Promise<void> => {
        setIsLoading(true);
        setError(null);
        try {
            const { error: deleteError } = await supabase
                .from('bmn_items')
                .delete()
                .eq('id', id);

            if (deleteError) {
                throw deleteError;
            }

            // Update local state
            setBmnItems(prev => prev.filter(item => item.id !== id));
        } catch (err) {
            console.error('Error deleting BMN item:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete BMN item';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Clear all BMN data from state
     */
    const clearBMNData = useCallback(() => {
        setBmnItems([]);
        setUploadHistory([]);
        setFilters({
            search: '',
            jenisBMN: 'All',
            statusBMN: 'All',
            kondisi: 'All',
            namaSatker: 'All'
        });
        setSearchQuery('');
        setError(null);
    }, []);

    // Auto-fetch data when user logs in
    const userId = session?.user?.id;
    useEffect(() => {
        if (userId) {
            fetchBMNItems();
            fetchUploadHistory();
        } else {
            clearBMNData();
        }
    }, [userId, fetchBMNItems, fetchUploadHistory, clearBMNData]);

    const value: BMNContextType = {
        bmnItems,
        setBmnItems,
        uploadHistory,
        setUploadHistory,
        filters,
        setFilters,
        searchQuery,
        setSearchQuery,
        isLoading,
        error,
        fetchBMNItems,
        fetchUploadHistory,
        createBMNItem,
        updateBMNItem,
        deleteBMNItem,
        clearBMNData
    };

    return (
        <BMNContext.Provider value={value}>
            {children}
        </BMNContext.Provider>
    );
};

export default BMNContext;
