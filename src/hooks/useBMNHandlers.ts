// src/hooks/useBMNHandlers.ts
// Custom hook for BMN handlers - file upload, CRUD operations, export, and permissions
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.8, 9.9, 11.1, 11.2, 12.2, 12.3

import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, BMNItem, BMNParseResult, BMNExportOptions } from '../../types';
import { parseExcelFile, parseCSVFile } from '../utils/bmnParser';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface UseBMNHandlersProps {
    currentUser: User | null;
    bmnItems: BMNItem[];
    setBmnItems: React.Dispatch<React.SetStateAction<BMNItem[]>>;
    showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    fetchBMNItems: () => Promise<void>;
    fetchUploadHistory: () => Promise<void>;
}

export const useBMNHandlers = ({
    currentUser,
    bmnItems,
    setBmnItems,
    showNotification,
    fetchBMNItems,
    fetchUploadHistory
}: UseBMNHandlersProps) => {

    // ==================== PERMISSION CHECKS ====================
    // Validates: Requirements 12.2, 12.3

    /**
     * Check if user can upload BMN data
     * All logged-in users (Staff, Atasan, Super Admin) can upload
     */
    /**
     * Check if a user is BMN Editor for a specific Satker
     */
    const checkIsBMNEditor = useCallback(async (userId: string, satkerName: string): Promise<boolean> => {
        if (!currentUser) return false;
        if (currentUser.role === 'Super Admin') return true;
        if (!satkerName) return false;
        
        try {
            const { count, error } = await supabase
                .from('bmn_editors')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('nama_satker', satkerName);
                
            if (error) return false;
            return (count || 0) > 0;
        } catch {
            return false;
        }
    }, [currentUser]);

    /**
     * Check if user can upload BMN data
     */
    const canUploadBMN = useCallback(async (satkerName?: string): Promise<boolean> => {
        if (!currentUser) return false;
        if (currentUser.role === 'Super Admin') return true;
        if (!satkerName) return false;
        return checkIsBMNEditor(currentUser.id, satkerName);
    }, [currentUser, checkIsBMNEditor]);

    /**
     * Check if user can edit BMN item
     */
    const canEditBMN = useCallback(async (satkerName?: string): Promise<boolean> => {
        if (!currentUser) return false;
        if (currentUser.role === 'Super Admin') return true;
        if (!satkerName) return false;
        return checkIsBMNEditor(currentUser.id, satkerName);
    }, [currentUser, checkIsBMNEditor]);

    /**
     * Check if user can delete BMN item
     */
    const canDeleteBMN = useCallback(async (satkerName?: string): Promise<boolean> => {
        if (!currentUser) return false;
        if (currentUser.role === 'Super Admin') return true;
        if (!satkerName) return false;
        return checkIsBMNEditor(currentUser.id, satkerName);
    }, [currentUser, checkIsBMNEditor]);

    // ==================== FILE UPLOAD HANDLER ====================
    // Validates: Requirements 3.1, 3.2, 3.3, 3.4

    /**
     * Handle file upload with validation and parsing
     * Supports Excel (.xlsx, .xls) and CSV (.csv) formats
     * @param file - File to upload
     * @param targetSatker - Satker whose data will be replaced
     */
    const handleUploadFile = useCallback(async (
        file: File, 
        targetSatker: string, 
        uploadMode: 'replace' | 'upsert' = 'replace'
    ): Promise<void> => {
        // Check permission
        const hasPermission = await canUploadBMN(targetSatker);
        if (!hasPermission) {
            showNotification(
                'Akses Ditolak',
                `Anda tidak memiliki izin untuk mengupload data BMN untuk Satker ${targetSatker}.`,
                'error'
            );
            return;
        }

        if (!currentUser) {
            showNotification('Login Diperlukan', 'Anda harus login untuk mengupload data BMN.', 'warning');
            return;
        }

        if (!targetSatker) {
            showNotification('Satker Diperlukan', 'Silakan pilih satker terlebih dahulu.', 'warning');
            return;
        }

        try {
            // Validate file type
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            if (!['xlsx', 'xls', 'csv'].includes(fileExtension || '')) {
                showNotification(
                    'Format File Tidak Valid',
                    'Hanya file Excel (.xlsx, .xls) atau CSV (.csv) yang diperbolehkan.',
                    'error'
                );
                return;
            }

            // Validate file size (max 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                showNotification(
                    'File Terlalu Besar',
                    'Ukuran file maksimal adalah 10MB.',
                    'error'
                );
                return;
            }

            showNotification('Memproses File', 'Sedang membaca dan memvalidasi data...', 'info');

            // Parse file based on type
            let parseResult: BMNParseResult;
            if (fileExtension === 'csv') {
                parseResult = await parseCSVFile(file, currentUser.id);
            } else {
                parseResult = await parseExcelFile(file, currentUser.id);
            }

            // Check for parsing errors
            if (!parseResult.success || parseResult.errors.length > 0) {
                const errorMessages = parseResult.errors
                    .slice(0, 5) // Show first 5 errors
                    .map(err => `Baris ${err.row}: ${err.message}`)
                    .join('\n');
                
                const moreErrors = parseResult.errors.length > 5 
                    ? `\n... dan ${parseResult.errors.length - 5} error lainnya`
                    : '';

                showNotification(
                    'Validasi Gagal',
                    `Ditemukan ${parseResult.errors.length} error:\n${errorMessages}${moreErrors}`,
                    'error'
                );
                return;
            }

            // Show warnings if any
            if (parseResult.warnings.length > 0) {
                const warningMessages = parseResult.warnings
                    .slice(0, 3)
                    .map(warn => `Baris ${warn.row}: ${warn.message}`)
                    .join('\n');
                
                showNotification(
                    'Peringatan',
                    `${parseResult.warnings.length} peringatan ditemukan:\n${warningMessages}`,
                    'warning'
                );
            }

            if (parseResult.data.length === 0) {
                showNotification(
                    'Tidak Ada Data',
                    'File tidak mengandung data yang valid untuk diimport.',
                    'warning'
                );
                return;
            }

            showNotification('Menyimpan Data', uploadMode === 'upsert' ? 'Sedang memproses dan memperbarui data...' : 'Sedang menghapus data lama dan menyimpan data baru...', 'info');

            // Step 1: Handle Deletion or Fetching Existing Items
            // Normalize satker name for comparison (remove quotes, trim, lowercase)
            const normalizeSatkerName = (name: string): string => {
                return name.replace(/^["']|["']$/g, '').trim().toLowerCase();
            };
            
            const normalizedTargetSatker = normalizeSatkerName(targetSatker);
            
            // Get all items in database to resolve matches and assignments
            const { data: existingItems, error: fetchError } = await supabase
                .from('bmn_items')
                .select('id, nama_satker, kode_barang, nomor_register, nup, held_by');
            
            if (fetchError) {
                console.error('Fetch error:', fetchError);
                showNotification(
                    'Gagal Mengambil Data Lama',
                    `Gagal mengambil data lama: ${fetchError.message}`,
                    'error'
                );
                return;
            }

            let itemsToDelete: any[] = [];
            let savedAssignments: any[] = [];

            if (uploadMode === 'replace') {
                if (normalizedTargetSatker === 'semua satuan kerja') {
                    // Extract unique satkers from the Excel data
                    const excelSatkers = Array.from(new Set(
                        parseResult.data
                            .map(item => normalizeSatkerName(item.namaSatker || ''))
                            .filter(Boolean)
                    ));
                    
                    itemsToDelete = existingItems?.filter(item => 
                        excelSatkers.includes(normalizeSatkerName(item.nama_satker || ''))
                    ) || [];
                } else {
                    // Filter items that match the target satker (case-insensitive)
                    itemsToDelete = existingItems?.filter(item => 
                        normalizeSatkerName(item.nama_satker || '') === normalizedTargetSatker
                    ) || [];
                }
                
                // Save current assignments for restoration
                savedAssignments = itemsToDelete
                    .filter(item => item.held_by !== null && item.held_by !== undefined)
                    .map(item => ({
                        kodeBarang: item.kode_barang,
                        nomorRegister: item.nomor_register,
                        nup: item.nup,
                        heldBy: item.held_by
                    }));
                
                if (itemsToDelete.length > 0) {
                    const idsToDelete = itemsToDelete.map(item => item.id);
                    
                    console.log(`Deleting ${idsToDelete.length} existing items for target satkers`);
                    
                    const { error: deleteError } = await supabase
                        .from('bmn_items')
                        .delete()
                        .in('id', idsToDelete);

                    if (deleteError) {
                        console.error('Delete error:', deleteError);
                        showNotification(
                            'Gagal Menghapus Data Lama',
                            `Gagal menghapus data lama: ${deleteError.message}`,
                            'error'
                        );
                        return;
                    }
                    
                    console.log(`Successfully deleted ${idsToDelete.length} items`);
                }
            } else {
                // Upsert Mode: Keep existing assignments from all matched items in database
                savedAssignments = existingItems
                    ?.filter(item => item.held_by !== null && item.held_by !== undefined)
                    .map(item => ({
                        kodeBarang: item.kode_barang,
                        nomorRegister: item.nomor_register,
                        nup: item.nup,
                        heldBy: item.held_by
                    })) || [];
            }

            // Step 2: Create upload history record to get UUID
            const historyRecord = {
                filename: file.name,
                file_size: file.size,
                file_type: fileExtension,
                total_records: parseResult.totalRows,
                successful_records: parseResult.validRows,
                failed_records: parseResult.invalidRows,
                status: 'Processing' as const, // Set to Processing initially
                error_details: parseResult.errors.length > 0 ? parseResult.errors : null,
                uploaded_by: currentUser.id,
                uploaded_at: new Date().toISOString()
            };

            const { data: historyData, error: historyError } = await supabase
                .from('bmn_upload_history')
                .insert([historyRecord])
                .select()
                .single();

            if (historyError || !historyData) {
                console.error('History error:', historyError);
                showNotification(
                    'Gagal Membuat History',
                    `Gagal membuat upload history: ${historyError?.message || 'Unknown error'}`,
                    'error'
                );
                return;
            }

            // Step 3: Use the UUID from history record as upload_batch_id
            const uploadBatchId = historyData.id;

            // Add uploadBatchId to all items
            const itemsWithBatchId = parseResult.data.map(item => ({
                ...item,
                uploadBatchId,
                createdBy: currentUser.id,
                createdAt: new Date().toISOString()
            }));

            // Step 4: Map to database format and insert BMN items
            // Normalize nama_satker to remove quotes and extra whitespace
            const normalizeSatkerForStorage = (name: string | undefined): string | undefined => {
                if (!name) return undefined;
                return name.replace(/^["']|["']$/g, '').trim();
            };
            
            const dbItems = itemsWithBatchId.map(item => {
                const matchingAssignment = savedAssignments.find(saved => 
                    saved.kodeBarang === item.kodeBarang && (
                        (saved.nup && item.nup && saved.nup === item.nup) ||
                        (saved.nomorRegister && item.nomorRegister && saved.nomorRegister === item.nomorRegister) ||
                        (!saved.nup && !item.nup && !saved.nomorRegister && !item.nomorRegister)
                    )
                );

                // If upsert, find matching item ID to edit
                let existingId: string | undefined = undefined;
                if (uploadMode === 'upsert') {
                    const matchedExisting = existingItems?.find(existing => 
                        existing.kode_barang === item.kodeBarang && (
                            (existing.nup && item.nup && existing.nup === item.nup) ||
                            (existing.nomor_register && item.nomorRegister && existing.nomor_register === item.nomorRegister) ||
                            (!existing.nup && !item.nup && !existing.nomor_register && !item.nomorRegister)
                        )
                    );
                    if (matchedExisting) {
                        existingId = matchedExisting.id;
                    }
                }

                return {
                    ...(existingId ? { id: existingId } : {}),
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
                    nama_satker: normalizeSatkerForStorage(item.namaSatker),
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
                    raw_data: item.rawData,
                    created_by: item.createdBy,
                    upload_batch_id: uploadBatchId,
                    held_by: matchingAssignment ? matchingAssignment.heldBy : null
                };
            });

            // Perform bulk insert or upsert
            const { error: insertError } = uploadMode === 'upsert'
                ? await supabase.from('bmn_items').upsert(dbItems)
                : await supabase.from('bmn_items').insert(dbItems);

            if (insertError) {
                console.error('Save error:', insertError);
                
                // Update history status to Failed
                await supabase
                    .from('bmn_upload_history')
                    .update({ status: 'Failed' })
                    .eq('id', uploadBatchId);
                
                showNotification(
                    'Gagal Menyimpan',
                    `Gagal menyimpan data BMN: ${insertError.message}`,
                    'error'
                );
                return;
            }

            // Step 5: Update history status to Completed
            const { error: updateHistoryError } = await supabase
                .from('bmn_upload_history')
                .update({ status: 'Completed' })
                .eq('id', uploadBatchId);

            if (updateHistoryError) {
                console.error('Failed to update history status:', updateHistoryError);
            }

            // Refresh data
            await fetchBMNItems();
            await fetchUploadHistory();

            showNotification(
                'Upload Berhasil',
                uploadMode === 'upsert'
                    ? `Berhasil memperbarui/menambah data BMN. ${parseResult.validRows} dari ${parseResult.totalRows} baris data berhasil diproses.`
                    : targetSatker === 'Semua Satuan Kerja'
                        ? `Berhasil mengganti data BMN untuk seluruh Satker yang terdaftar di file Excel. ${parseResult.validRows} dari ${parseResult.totalRows} baris data berhasil diimport.`
                        : `Berhasil mengganti data untuk satker ${targetSatker}. ${parseResult.validRows} dari ${parseResult.totalRows} baris data berhasil diimport.`,
                'success'
            );

        } catch (error) {
            console.error('Upload error:', error);
            showNotification(
                'Kesalahan',
                `Terjadi kesalahan saat mengupload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'error'
            );
        }
    }, [currentUser, canUploadBMN, showNotification, fetchBMNItems, fetchUploadHistory]);

    // ==================== CRUD OPERATIONS ====================
    // Validates: Requirements 9.9, 11.1, 11.2

    /**
     * Handle save BMN (create or update)
     */
    const handleSaveBMN = useCallback(async (
        bmnData: Partial<BMNItem>,
        editingId?: string
    ): Promise<void> => {
        // Check permission
        const satkerToCheck = bmnData.namaSatker || '';
        const hasPermission = await canEditBMN(satkerToCheck);
        if (!hasPermission) {
            showNotification(
                'Akses Ditolak',
                `Anda tidak memiliki izin untuk mengedit data BMN untuk Satker ${satkerToCheck || '(belum ditentukan)'}.`,
                'error'
            );
            return;
        }

        if (!currentUser) {
            showNotification('Login Diperlukan', 'Anda harus login untuk menyimpan data BMN.', 'warning');
            return;
        }

        try {
            // Validate required fields
            if (!bmnData.kodeBarang || !bmnData.namaBarang || !bmnData.statusBMN) {
                showNotification(
                    'Data Tidak Lengkap',
                    'Kode Barang, Nama Barang, dan Status BMN wajib diisi.',
                    'error'
                );
                return;
            }

            // Map to database format
            const dbData = {
                kode_barang: bmnData.kodeBarang,
                nama_barang: bmnData.namaBarang,
                jenis_bmn: bmnData.jenisBMN,
                merk: bmnData.merk,
                tipe: bmnData.tipe,
                status_bmn: bmnData.statusBMN,
                kondisi: bmnData.kondisi,
                nilai_perolehan: bmnData.nilaiPerolehan,
                tahun_perolehan: bmnData.tahunPerolehan,
                tanggal_perolehan: bmnData.tanggalPerolehan,
                umur_aset: bmnData.umurAset,
                jumlah: bmnData.jumlah,
                satuan: bmnData.satuan,
                luas: bmnData.luas,
                nama_satker: bmnData.namaSatker,
                alamat: bmnData.alamat,
                kota: bmnData.kota,
                provinsi: bmnData.provinsi,
                nomor_register: bmnData.nomorRegister,
                nup: bmnData.nup,
                nomor_sertifikat: bmnData.nomorSertifikat,
                tanggal_sertifikat: bmnData.tanggalSertifikat,
                tanggal_pengapusan: bmnData.tanggalPengapusan,
                alasan_pengapusan: bmnData.alasanPengapusan,
                keterangan: bmnData.keterangan,
                created_by: bmnData.createdBy || currentUser.id,
                upload_batch_id: bmnData.uploadBatchId,
                held_by: bmnData.heldBy
            };

            if (editingId) {
                // Update existing item
                const { data: updatedData, error } = await supabase
                    .from('bmn_items')
                    .update({
                        ...dbData,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingId)
                    .select()
                    .single();

                if (error) {
                    console.error('Update error:', error);
                    showNotification(
                        'Gagal Update',
                        `Gagal mengupdate data: ${error.message}`,
                        'error'
                    );
                    return;
                }

                if (updatedData) {
                    // Map back to BMNItem format
                    const mappedItem: BMNItem = {
                        id: updatedData.id,
                        kodeBarang: updatedData.kode_barang,
                        namaBarang: updatedData.nama_barang,
                        jenisBMN: updatedData.jenis_bmn,
                        merk: updatedData.merk,
                        tipe: updatedData.tipe,
                        statusBMN: updatedData.status_bmn,
                        kondisi: updatedData.kondisi,
                        nilaiPerolehan: updatedData.nilai_perolehan,
                        tahunPerolehan: updatedData.tahun_perolehan,
                        tanggalPerolehan: updatedData.tanggal_perolehan,
                        umurAset: updatedData.umur_aset,
                        jumlah: updatedData.jumlah,
                        satuan: updatedData.satuan,
                        luas: updatedData.luas,
                        namaSatker: updatedData.nama_satker,
                        alamat: updatedData.alamat,
                        kota: updatedData.kota,
                        provinsi: updatedData.provinsi,
                        nomorRegister: updatedData.nomor_register,
                        nup: updatedData.nup,
                        nomorSertifikat: updatedData.nomor_sertifikat,
                        tanggalSertifikat: updatedData.tanggal_sertifikat,
                        tanggalPengapusan: updatedData.tanggal_pengapusan,
                        alasanPengapusan: updatedData.alasan_pengapusan,
                        keterangan: updatedData.keterangan,
                        rawData: updatedData.raw_data,
                        createdBy: updatedData.created_by,
                        createdAt: updatedData.created_at,
                        updatedAt: updatedData.updated_at,
                        uploadBatchId: updatedData.upload_batch_id,
                        heldBy: updatedData.held_by,
                        holder: updatedData.held_by ? bmnData.holder : null
                    };

                    // Update local state preserving existing properties not returned by DB (e.g. holder info if already fetched/cached)
                    setBmnItems(prev => prev.map(item => 
                        item.id === editingId ? { ...item, ...mappedItem } : item
                    ));

                    showNotification(
                        'Update Berhasil',
                        'Data BMN berhasil diupdate.',
                        'success'
                    );
                }
            } else {
                // Create new item
                const { data: insertedData, error } = await supabase
                    .from('bmn_items')
                    .insert([dbData])
                    .select()
                    .single();

                if (error) {
                    console.error('Insert error:', error);
                    showNotification(
                        'Gagal Menyimpan',
                        `Gagal menyimpan data: ${error.message}`,
                        'error'
                    );
                    return;
                }

                if (insertedData) {
                    // Map back to BMNItem format
                    const mappedItem: BMNItem = {
                        id: insertedData.id,
                        kodeBarang: insertedData.kode_barang,
                        namaBarang: insertedData.nama_barang,
                        jenisBMN: insertedData.jenis_bmn,
                        merk: insertedData.merk,
                        tipe: insertedData.tipe,
                        statusBMN: insertedData.status_bmn,
                        kondisi: insertedData.kondisi,
                        nilaiPerolehan: insertedData.nilai_perolehan,
                        tahunPerolehan: insertedData.tahun_perolehan,
                        tanggalPerolehan: insertedData.tanggal_perolehan,
                        umurAset: insertedData.umur_aset,
                        jumlah: insertedData.jumlah,
                        satuan: insertedData.satuan,
                        luas: insertedData.luas,
                        namaSatker: insertedData.nama_satker,
                        alamat: insertedData.alamat,
                        kota: insertedData.kota,
                        provinsi: insertedData.provinsi,
                        nomorRegister: insertedData.nomor_register,
                        nup: insertedData.nup,
                        nomorSertifikat: insertedData.nomor_sertifikat,
                        tanggalSertifikat: insertedData.tanggal_sertifikat,
                        tanggalPengapusan: insertedData.tanggal_pengapusan,
                        alasanPengapusan: insertedData.alasan_pengapusan,
                        keterangan: insertedData.keterangan,
                        rawData: insertedData.raw_data,
                        createdBy: insertedData.created_by,
                        createdAt: insertedData.created_at,
                        updatedAt: insertedData.updated_at,
                        uploadBatchId: insertedData.upload_batch_id,
                        heldBy: insertedData.held_by,
                        holder: insertedData.held_by ? bmnData.holder : null
                    };

                    // Update local state
                    setBmnItems(prev => [mappedItem, ...prev]);

                    showNotification(
                        'Berhasil Disimpan',
                        'Data BMN baru berhasil ditambahkan.',
                        'success'
                    );
                }
            }

        } catch (error) {
            console.error('Save error:', error);
            showNotification(
                'Kesalahan',
                `Terjadi kesalahan saat menyimpan data: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'error'
            );
        }
    }, [currentUser, canEditBMN, showNotification, setBmnItems, checkIsBMNEditor]);

    /**
     * Handle delete BMN with confirmation
     */
    const handleDeleteBMN = useCallback(async (id: string): Promise<void> => {
        // Check permission
        const targetItem = bmnItems.find(item => item.id === id);
        const satkerToCheck = targetItem?.namaSatker || '';
        const hasPermission = await canDeleteBMN(satkerToCheck);
        if (!hasPermission) {
            showNotification(
                'Akses Ditolak',
                `Anda tidak memiliki izin untuk menghapus data BMN untuk Satker ${satkerToCheck || '(belum ditentukan)'}.`,
                'error'
            );
            return;
        }

        if (!currentUser) {
            showNotification('Login Diperlukan', 'Anda harus login untuk menghapus data BMN.', 'warning');
            return;
        }

        try {
            const { error } = await supabase
                .from('bmn_items')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Delete error:', error);
                showNotification(
                    'Gagal Menghapus',
                    `Gagal menghapus data: ${error.message}`,
                    'error'
                );
                return;
            }

            // Update local state
            setBmnItems(prev => prev.filter(item => item.id !== id));

            showNotification(
                'Berhasil Dihapus',
                'Data BMN berhasil dihapus.',
                'success'
            );

        } catch (error) {
            console.error('Delete error:', error);
            showNotification(
                'Kesalahan',
                `Terjadi kesalahan saat menghapus data: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'error'
            );
        }
    }, [currentUser, canDeleteBMN, showNotification, setBmnItems, bmnItems, checkIsBMNEditor]);

    // ==================== EXPORT OPERATIONS ====================
    // Validates: Requirements 11.1, 11.2

    /**
     * Handle export data to Excel or CSV
     */
    const handleExportData = useCallback(async (options: BMNExportOptions): Promise<void> => {
        try {
            if (bmnItems.length === 0) {
                showNotification(
                    'Tidak Ada Data',
                    'Tidak ada data untuk diekspor.',
                    'warning'
                );
                return;
            }

            showNotification('Memproses Export', 'Sedang menyiapkan file...', 'info');

            // Prepare data for export
            const exportData = bmnItems.map(item => ({
                'Kode Barang': item.kodeBarang,
                'Nama Barang': item.namaBarang,
                'Jenis BMN': item.jenisBMN || '',
                'Merk': item.merk || '',
                'Tipe': item.tipe || '',
                'Status BMN': item.statusBMN,
                'Kondisi': item.kondisi || '',
                'Nilai Perolehan': item.nilaiPerolehan || '',
                'Tahun Perolehan': item.tahunPerolehan || '',
                'Tanggal Perolehan': item.tanggalPerolehan || '',
                'Jumlah': item.jumlah || '',
                'Satuan': item.satuan || '',
                'Luas': item.luas || '',
                'Nama Satker': item.namaSatker || '',
                'Alamat': item.alamat || '',
                'Kota': item.kota || '',
                'Provinsi': item.provinsi || '',
                'Nomor Register': item.nomorRegister || '',
                'Nomor Sertifikat': item.nomorSertifikat || '',
                'Tanggal Sertifikat': item.tanggalSertifikat || '',
                'Tanggal Pengapusan': item.tanggalPengapusan || '',
                'Alasan Pengapusan': item.alasanPengapusan || '',
                'Keterangan': item.keterangan || ''
            }));

            // Create worksheet
            const worksheet = XLSX.utils.json_to_sheet(exportData);

            // Set column widths
            const columnWidths = [
                { wch: 15 }, // Kode Barang
                { wch: 30 }, // Nama Barang
                { wch: 20 }, // Jenis BMN
                { wch: 15 }, // Merk
                { wch: 15 }, // Tipe
                { wch: 15 }, // Status BMN
                { wch: 15 }, // Kondisi
                { wch: 15 }, // Nilai Perolehan
                { wch: 15 }, // Tahun Perolehan
                { wch: 15 }, // Tanggal Perolehan
                { wch: 10 }, // Jumlah
                { wch: 10 }, // Satuan
                { wch: 10 }, // Luas
                { wch: 25 }, // Nama Satker
                { wch: 30 }, // Alamat
                { wch: 15 }, // Kota
                { wch: 15 }, // Provinsi
                { wch: 15 }, // Nomor Register
                { wch: 15 }, // Nomor Sertifikat
                { wch: 15 }, // Tanggal Sertifikat
                { wch: 15 }, // Tanggal Pengapusan
                { wch: 25 }, // Alasan Pengapusan
                { wch: 30 }  // Keterangan
            ];
            worksheet['!cols'] = columnWidths;

            // Create workbook
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Data BMN');

            // Generate filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = options.filename || `BMN_Export_${timestamp}`;

            // Export based on format
            if (options.format === 'csv') {
                // Export as CSV
                const csv = XLSX.utils.sheet_to_csv(worksheet);
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                saveAs(blob, `${filename}.csv`);
            } else {
                // Export as Excel
                const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                saveAs(blob, `${filename}.xlsx`);
            }

            showNotification(
                'Export Berhasil',
                `Data berhasil diekspor ke ${options.format === 'csv' ? 'CSV' : 'Excel'}.`,
                'success'
            );

        } catch (error) {
            console.error('Export error:', error);
            showNotification(
                'Kesalahan',
                `Terjadi kesalahan saat mengekspor data: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'error'
            );
        }
    }, [bmnItems, showNotification]);

    return {
        // Permission checks
        canUploadBMN,
        canEditBMN,
        canDeleteBMN,
        
        // Handlers
        handleUploadFile,
        handleSaveBMN,
        handleDeleteBMN,
        handleExportData
    };
};

export default useBMNHandlers;
