// src/components/surat/ImportSuratModal.tsx
import React, { useState, useRef } from 'react';
import { X, Upload, Check, AlertCircle, FileSpreadsheet, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabaseClient';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useUsers } from '../../contexts/UsersContext';
import { disposisiService } from '../../services/DisposisiService';
import { User, Surat } from '../../../types';

interface ImportSuratModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User | null;
    currentUserName: string;
    showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

interface ParsedSurat {
    rowNum: number;
    isValid: boolean;
    errors: string[];
    data: Partial<Surat>;
    kegiatan: {
        title: string;
        date: string | null;
    } | null;
    disposisi: {
        text: string;
        deadline: string | null;
        assignees: string[]; // User IDs matched
        assigneeNames: string[]; // Originally parsed strings
    } | null;
    raw: any;
    existingId?: string;
    duplicateAction?: 'skip' | 'overwrite';
}

const EXPECTED_HEADERS = [
    'Jenis Surat',
    'Nomor Surat',
    'Tanggal Surat',
    'Jenis Naskah',
    'Hal/Perihal',
    'Asal/Tujuan Surat', // Combine for easy input, map later based on Jenis
    'Klasifikasi',
    'Sifat Surat',
    'Bidang Tugas',
    'Tanggal Diterima/Dikirim',
];

const ImportSuratModal: React.FC<ImportSuratModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    currentUser,
    currentUserName,
    showNotification
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedSurat[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { bidangTugasList, sifatSuratList } = useMasterData();
    const { allUsers } = useUsers();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // Validate file type
        const fileType = selectedFile.name.split('.').pop()?.toLowerCase();
        if (!['csv', 'xlsx', 'xls'].includes(fileType || '')) {
            showNotification('Format Tidak Valid', 'Silakan upload file CSV atau Excel (.xlsx, .xls)', 'error');
            return;
        }

        setFile(selectedFile);
        processFile(selectedFile);
    };

    const parseExcelDate = (excelValue: any): string | null => {
        if (!excelValue) return null;

        // If it's already a Date object
        if (excelValue instanceof Date) {
            if (isNaN(excelValue.getTime())) return null;
            return excelValue.toISOString();
        }

        // If it's a number (Excel date serial format)
        if (typeof excelValue === 'number') {
            // Excel epoch is Jan 1, 1900. Formula accounts for Excel's 1900 leap year bug
            const date = new Date((excelValue - (25567 + 2)) * 86400 * 1000);

            // Ensure date is valid after conversion
            if (isNaN(date.getTime())) return null;

            // Format to ISO string
            return date.toISOString();
        }

        // If it's a string, try standard parsing
        if (typeof excelValue === 'string') {
            const dateStr = excelValue.trim();

            // Handle common DD/MM/YYYY or similar textual formats if needed
            let day, month, year;
            const separator = dateStr.includes('/') ? '/' : (dateStr.includes('-') ? '-' : null);

            if (separator) {
                const parts = dateStr.split(separator);

                // Assume format DD/MM/YYYY or YYYY-MM-DD
                if (parts.length === 3) {
                    // If first part is > 31, it's likely YYYY-MM-DD
                    if (parts[0].length === 4) {
                        year = parseInt(parts[0], 10);
                        month = parseInt(parts[1], 10) - 1; // 0-indexed month
                        day = parseInt(parts[2], 10);
                    } else {
                        // Assume DD/MM/YYYY
                        day = parseInt(parts[0], 10);
                        month = parseInt(parts[1], 10) - 1;
                        year = parseInt(parts[2], 10);

                        // Handle 2 digit years loosely
                        if (year < 100) {
                            year += 2000;
                        }
                    }

                    const d = new Date(year, month, day);
                    if (!isNaN(d.getTime())) {
                        // Set to local timezone midnight to avoid timezone shift on save
                        d.setHours(12, 0, 0, 0);
                        return d.toISOString();
                    }
                }
            }

            // Fallback to native parsing
            const parsed = new Date(excelValue);
            if (!isNaN(parsed.getTime())) {
                return parsed.toISOString();
            }
        }

        return null;
    };

    const processFile = (file: File) => {
        setIsProcessing(true);
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });

                // Get first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert to JSON
                const rawRows = XLSX.utils.sheet_to_json(worksheet);

                const parsedRows: ParsedSurat[] = [];

                if (rawRows.length === 0) {
                    showNotification('File Kosong', 'Tidak ada data ditemukan dalam file', 'warning');
                    setIsProcessing(false);
                    return;
                }

                // We process based on index or heuristic matching for headers
                rawRows.forEach((row: any, index: number) => {
                    // Normalizing row keys to handle case-insensitivity and standard mapping
                    const normalizedRow: Record<string, any> = {};

                    Object.keys(row).forEach(key => {
                        const cleanKey = key.trim().toLowerCase().replace(/\s+/g, ' ');
                        normalizedRow[cleanKey] = row[key];
                    });

                    // Helper to find value by potential column names
                    const getValue = (keys: string[]) => {
                        for (const key of keys) {
                            const match = Object.keys(normalizedRow).find(k => k.includes(key.toLowerCase()));
                            if (match) return normalizedRow[match];
                        }
                        return null;
                    };

                    const jenisSuratRaw = getValue(['jenis surat', 'jenis']);
                    let jenisSurat: 'Masuk' | 'Keluar' | undefined;

                    if (jenisSuratRaw) {
                        const lowerJenis = String(jenisSuratRaw).toLowerCase();
                        if (lowerJenis.includes('masuk')) jenisSurat = 'Masuk';
                        else if (lowerJenis.includes('keluar')) jenisSurat = 'Keluar';
                    }

                    const nomorSurat = getValue(['nomor surat', 'no surat', 'nomor']);

                    // Date parsing
                    const tglSuratRaw = getValue(['tanggal surat', 'tgl surat']);
                    const tanggalSurat = parseExcelDate(tglSuratRaw);

                    const tglEventRaw = getValue(['tanggal terima', 'tanggal kirim', 'tanggal diterima', 'tgl terima', 'tgl kirim']);
                    const tanggalEvent = parseExcelDate(tglEventRaw);

                    const hal = getValue(['hal', 'perihal']);
                    const asalSuratRaw = getValue(['asal surat', 'asal pengirim']);
                    const tujuanSuratRaw = getValue(['tujuan surat']);

                    const klasifikasi = getValue(['klasifikasi']);
                    const jenisNaskah = getValue(['jenis naskah']);
                    const sifat = getValue(['sifat surat', 'sifat']);
                    const bidang = getValue(['bidang tugas']);

                    // Kegiatan parsing
                    const kegiatanJudul = getValue(['judul kegiatan']);
                    const kegiatanTanggalRaw = getValue(['tanggal kegiatan']);
                    const kegiatanTanggal = parseExcelDate(kegiatanTanggalRaw);

                    // Disposisi parsing
                    const disposisiText = getValue(['disposisi']);
                    const disposisiBatasRaw = getValue(['batas waktu disposisi', 'batas waktu']);
                    const disposisiBatas = parseExcelDate(disposisiBatasRaw);
                    const assigneesRaw = getValue(['detail disposisi']);

                    // Links (saved to keterangan or parsed per schema)
                    const linkSurat = getValue(['link file surat']);
                    const linkLaporan = getValue(['link file laporan disposisi']);
                    const hasilTindakLanjut = getValue(['hasil tindak lanjut']);

                    const errors: string[] = [];

                    if (!jenisSurat) errors.push('Jenis Surat tidak valid (harus "Masuk" atau "Keluar")');
                    if (!nomorSurat) errors.push('Nomor Surat kosong');
                    if (!tanggalSurat) errors.push('Tanggal Surat kosong atau format tidak valid');

                    // Set up kegiatan payload
                    let kegiatanPayload: ParsedSurat['kegiatan'] = null;
                    if (kegiatanJudul) {
                        if (!kegiatanTanggal) errors.push('Tanggal Kegiatan tidak valid meskipun Judul Kegiatan diisi');
                        kegiatanPayload = {
                            title: String(kegiatanJudul).trim(),
                            date: kegiatanTanggal
                        };
                    }

                    // Set up disposisi payload
                    let disposisiPayload: ParsedSurat['disposisi'] = null;
                    if (disposisiText) {
                        const assigneesMatched: string[] = [];
                        const assigneesOriginal: string[] = [];

                        if (!assigneesRaw) {
                            errors.push('Assignee Disposisi kosong meskipun teks Disposisi diisi');
                        } else {
                            // Smarter parsing for Assignee text, checking for academic strings like ", S.Si."
                            const rawString = String(assigneesRaw).trim();

                            // Strategy 1: If it contains semicolons, we safely assume it's the strict separator.
                            if (rawString.includes(';')) {
                                const assigneeList = rawString.split(';').map(s => s.trim()).filter(Boolean);
                                assigneeList.forEach(nameOrEmail => {
                                    assigneesOriginal.push(nameOrEmail);
                                    const searchStr = nameOrEmail.toLowerCase();
                                    const matchedUser = allUsers.find(u =>
                                        (u.name && u.name.trim().toLowerCase() === searchStr) ||
                                        (u.email && u.email.trim().toLowerCase() === searchStr)
                                    );
                                    if (matchedUser) {
                                        assigneesMatched.push(matchedUser.id);
                                    } else {
                                        errors.push(`Assignee "${nameOrEmail}" tidak ditemukan di sistem`);
                                    }
                                });
                            } else {
                                // Strategy 2: Commas might be separators OR part of academic titles (e.g., "Anita, S.Si., Budi").
                                // Attempt a heuristic approach: Iterate all system users and see if their exact name exists in the raw string.
                                // Sort by longest name first to prevent partial matches (e.g. matching "Budi" inside "Budi Santoso").
                                const sortedUsers = [...allUsers].sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));
                                let remainingString = rawString.toLowerCase();

                                sortedUsers.forEach(u => {
                                    if (!u.name) return;
                                    const lowerName = u.name.trim().toLowerCase();
                                    if (lowerName && remainingString.includes(lowerName)) {
                                        assigneesMatched.push(u.id);
                                        assigneesOriginal.push(u.name);
                                        // Remove matched name to prevent double counting
                                        remainingString = remainingString.replace(lowerName, '');
                                    }
                                });

                                // Clean remaining string of common punctuation/titles to check if any unmatched chunks remain
                                const checkString = remainingString
                                    .replace(/s\.si\./g, '')
                                    .replace(/s\.stat\./g, '')
                                    .replace(/a\.md\.ak\./g, '')
                                    .replace(/s\.a\.p\./g, '')
                                    .replace(/s\.kom\./g, '')
                                    .replace(/s\.e\./g, '')
                                    .replace(/m\.si\./g, '')
                                    .replace(/,/g, '')
                                    .replace(/\./g, '')
                                    .trim();

                                // If significant text remains, it implies an assignee couldn't be matched
                                if (checkString.length > 5) {
                                    errors.push(`Beberapa assignee dalam "${rawString}" tidak dapat dicocokkan dengan data user di sistem. Coba gunakan pemisah titik koma (;)`);
                                }
                            }

                            if (assigneesMatched.length === 0 && errors.length === 0) {
                                errors.push('Tidak ada Assignee Disposisi yang valid ditemukan di sistem');
                            }
                        }

                        disposisiPayload = {
                            text: String(disposisiText).trim(),
                            deadline: disposisiBatas,
                            assignees: assigneesMatched,
                            assigneeNames: assigneesOriginal
                        };
                    }

                    // Map to Surat
                    const suratData: Partial<Surat> = {
                        jenisSurat: jenisSurat,
                        nomorSurat: nomorSurat ? String(nomorSurat).trim() : '',
                        tanggalSurat: tanggalSurat || '',
                        hal: hal ? String(hal).trim() : '',
                        klasifikasiSurat: klasifikasi ? String(klasifikasi).trim() : '',
                        jenisNaskah: jenisNaskah ? String(jenisNaskah).trim() : '',
                        sifatSurat: sifat ? String(sifat).trim() : '',
                        bidangTugas: bidang ? String(bidang).trim() : '',
                        createdBy: currentUserName,
                    };

                    if (jenisSurat === 'Masuk') {
                        suratData.asalSurat = asalSuratRaw ? String(asalSuratRaw).trim() : '';
                        suratData.tujuanSurat = tujuanSuratRaw ? String(tujuanSuratRaw).trim() : ''; // Some setups still distinguish even on incoming
                        suratData.tanggalDiterima = tanggalEvent || undefined;
                    } else if (jenisSurat === 'Keluar') {
                        suratData.asalSurat = asalSuratRaw ? String(asalSuratRaw).trim() : '';
                        suratData.tujuanSurat = tujuanSuratRaw ? String(tujuanSuratRaw).trim() : '';
                        suratData.tanggalDikirim = tanggalEvent || undefined;
                    }

                    // Store extra metadata gracefully
                    if (linkSurat || linkLaporan || hasilTindakLanjut) {
                        const extraKeterangan = [
                            linkSurat ? `Link Surat: ${linkSurat}` : null,
                            linkLaporan ? `Link Laporan Disposisi: ${linkLaporan}` : null,
                            hasilTindakLanjut ? `Hasil Tindak Lanjut: ${hasilTindakLanjut}` : null
                        ].filter(Boolean).join('\n');

                        suratData.hal = suratData.hal ? `${suratData.hal}\n\n${extraKeterangan}` : extraKeterangan;
                    }

                    parsedRows.push({
                        rowNum: index + 2, // Excel rows start at 1, +1 for header
                        isValid: errors.length === 0,
                        errors,
                        data: suratData,
                        kegiatan: kegiatanPayload,
                        disposisi: disposisiPayload,
                        raw: row
                    });
                });

                // Pre-flight check for duplicate Nomor Surat
                const nomorSuratsToCheck = parsedRows
                    .filter(r => r.data.nomorSurat)
                    .map(r => r.data.nomorSurat as string);

                if (nomorSuratsToCheck.length > 0) {
                    const { data: existingSurats } = await supabase
                        .from('surats')
                        .select('id, nomor_surat')
                        .in('nomor_surat', nomorSuratsToCheck);

                    if (existingSurats && existingSurats.length > 0) {
                        const existingMap = new Map();
                        existingSurats.forEach(s => existingMap.set(s.nomor_surat, s.id));

                        parsedRows.forEach(row => {
                            if (row.data.nomorSurat && existingMap.has(row.data.nomorSurat)) {
                                row.existingId = existingMap.get(row.data.nomorSurat);
                                row.duplicateAction = 'skip'; // Default to skip
                                // If it's otherwise valid, add an info message instead of invalidating
                                if (row.isValid) {
                                    row.errors.push(`Nomor Surat "${row.data.nomorSurat}" sudah ada di sistem.`);
                                }
                            }
                        });
                    }
                }

                setParsedData(parsedRows);
            } catch (error: any) {
                console.error("Error parsing Excel:", error);
                showNotification('Gagal Membaca File', 'Pastikan format file benar sesuai template', 'error');
            } finally {
                setIsProcessing(false);
            }
        };

        reader.onerror = () => {
            showNotification('Gagal Membaca File', 'Terjadi kesalahan sistem', 'error');
            setIsProcessing(false);
        };

        if (file) {
            reader.readAsArrayBuffer(file);
        }
    };

    const handleImport = async () => {
        const validRows = parsedData.filter(d => d.isValid);

        // Find rows that we actually need to process (skip 'skip' ones)
        const rowsToProcess = validRows.filter(r => r.duplicateAction !== 'skip');

        if (rowsToProcess.length === 0) {
            if (validRows.some(r => r.duplicateAction === 'skip')) {
                showNotification('Import Dilewati', 'Silakan pilih aksi Timpa (Overwrite) pada baris yang duplikat jika ingin memprosesnya, atau abaikan data.', 'info');
            } else {
                showNotification('Tidak Ada Data Valid', 'Perbaiki error pada file sebelum import', 'warning');
            }
            return;
        }

        setIsImporting(true);

        try {
            let insertedCount = 0;
            let updatedCount = 0;

            // Execute insertions sequentially
            for (const row of rowsToProcess) {
                const suratPayload = {
                    jenis_surat: row.data.jenisSurat,
                    nomor_surat: row.data.nomorSurat,
                    tanggal_surat: row.data.tanggalSurat,
                    hal: row.data.hal || null,
                    asal_surat: row.data.asalSurat || null,
                    tujuan_surat: row.data.tujuanSurat || null,
                    klasifikasi_surat: row.data.klasifikasiSurat || null,
                    jenis_naskah: row.data.jenisNaskah || null,
                    sifat_surat: row.data.sifatSurat || null,
                    bidang_tugas: row.data.bidangTugas || null,
                    tanggal_diterima: row.data.tanggalDiterima || null,
                    tanggal_dikirim: row.data.tanggalDikirim || null,
                    created_by: currentUserName,
                    created_by_id: currentUser?.id || null,
                    updated_at: new Date().toISOString()
                };

                let suratData;
                let suratError;

                if (row.existingId && row.duplicateAction === 'overwrite') {
                    // Update existing surat
                    const { data, error } = await supabase
                        .from('surats')
                        .update(suratPayload)
                        .eq('id', row.existingId)
                        .select()
                        .single();
                    suratData = data;
                    suratError = error;

                    if (!suratError && suratData) {
                        updatedCount++;
                        // Clean up relations for the overwrite
                        if (suratData.meeting_id) {
                            await supabase.from('meetings').delete().eq('id', suratData.meeting_id);
                        }
                        await supabase.from('disposisi').delete().eq('surat_id', suratData.id);
                    }
                } else {
                    // Insert new surat
                    const insertPayload = {
                        ...suratPayload,
                        created_at: new Date().toISOString()
                    };
                    const { data, error } = await supabase
                        .from('surats')
                        .insert(insertPayload)
                        .select()
                        .single();
                    suratData = data;
                    suratError = error;

                    if (!suratError) insertedCount++;
                }

                if (suratError) {
                    if (suratError.code === '23505' || suratError.message?.includes('ux_surats_nomor_surat')) {
                        throw new Error(`Baris ${row.rowNum}: Nomor Surat "${row.data.nomorSurat}" sudah terdaftar di sistem. Mohon cek kembali opsi duplikat Anda.`);
                    }
                    throw suratError;
                }

                let meetingId: string | undefined;

                // Create Kegiatan if present
                if (row.kegiatan) {
                    const inviterName = row.data.jenisSurat === 'Masuk' ? row.data.asalSurat || 'Eksternal' : currentUserName;
                    const meetingPayload = {
                        title: row.kegiatan.title,
                        type: 'internal',
                        description: `Kegiatan terkait surat ${row.data.nomorSurat}${row.data.hal ? `: ${row.data.hal}` : ''}`,
                        date: row.kegiatan.date || new Date().toISOString().split('T')[0],
                        start_time: '09:00',
                        end_time: '10:00',
                        location: '',
                        is_online: false,
                        inviter: { id: `inv_${Date.now()}`, name: inviterName, organization: inviterName },
                        invitees: [],
                        pic: row.disposisi ? row.disposisi.assigneeNames : [], // Let assignees be PIC if available
                        surat_undangan: null,
                        surat_tugas: null,
                        attachments: [],
                        links: [],
                        status: 'scheduled',
                        linked_surat_id: suratData.id,
                        created_by: currentUserName,
                        created_by_id: currentUser?.id || null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    const { data: meetingData, error: meetingError } = await supabase
                        .from('meetings')
                        .insert(meetingPayload)
                        .select()
                        .single();

                    if (meetingError) throw meetingError;
                    meetingId = meetingData.id;

                    // Update surat with meeting_id
                    await supabase
                        .from('surats')
                        .update({ meeting_id: meetingId })
                        .eq('id', suratData.id);
                }

                // Create Disposisi if present & assigned locally or linked to a Meeting immediately
                if (row.disposisi) {
                    // Create disposisi via service
                    // Note: disposisiService handles linking optionally to meetings
                    await disposisiService.createMultiUserDisposisi(
                        suratData.id,
                        meetingId || null, // Ensure that if it is disconnected it receives null
                        row.disposisi.assignees,
                        row.disposisi.text,
                        currentUser?.id || currentUserName,
                        currentUser,
                        row.disposisi.deadline || undefined,
                        currentUserName,
                        row.data.nomorSurat || '',
                        row.kegiatan?.title || 'Dokumen Import'
                    );
                }

                insertedCount++; // Count is tracked above per-branch
            }

            showNotification('Import Berhasil', `${insertedCount} ditambahkan, ${updatedCount} diperbarui. Relasi terkait juga telah dimitigasi.`, 'success');
            onSuccess(); // Refresh List
            handleClose();
        } catch (error: any) {
            console.error('Import Error:', error);
            showNotification('Gagal Import Data', error.message || 'Terjadi kesalahan database', 'error');
        } finally {
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setParsedData([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onClose();
    };

    const downloadTemplate = () => {
        // Create a template workbook based on exactly 23 columns
        const templateData = [
            {
                'Jenis Surat': 'Masuk',
                'Nomor Surat': '273/PR.07/12/2025',
                'Tanggal Surat': '01/01/2026',
                'Jenis Naskah': 'Nota Dinas',
                'Hal/Perihal': 'Permintaan data dan dokumen pendukung',
                'Asal Surat': 'Sekretaris Kementerian PPPA',
                'Tujuan Surat': 'Biro Data dan Informasi (Internal)',
                'Klasifikasi': '-',
                'Sifat Surat': '-',
                'Bidang Tugas': '-',
                'Tanggal Diterima': '01/01/2026',
                'Tanggal Dikirim': '-',
                'Disposisi': 'Teman-teman PIC Laporan Kinerja agar ditindaklanjuti',
                'Hasil Tindak Lanjut': '-',
                'Tanggal Kegiatan': '09/01/2026',
                'Judul Kegiatan': 'Permintaan data dan dokumen pendukung',
                'Ada Disposisi': 'Ya',
                'Jumlah Disposisi': 6,
                'Status Disposisi': 'Complete',
                'Detail Disposisi': 'Budi Santoso ; Ahmad Zikri', // Assignees equivalent
                'Link File Laporan Disposisi': 'https://bit.ly/Laporankinerja',
                'Link File Surat': 'https://nextcloud.kemenpppa.go.id/index',
                'Asal Pengirim': 'Internal'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);

        // Set column widths matching 23 columns precisely
        ws['!cols'] = [
            { wch: 12 }, // Jenis Surat
            { wch: 25 }, // Nomor Surat
            { wch: 15 }, // Tanggal Surat
            { wch: 15 }, // Jenis Naskah
            { wch: 40 }, // Hal/Perihal
            { wch: 25 }, // Asal Surat
            { wch: 25 }, // Tujuan Surat
            { wch: 15 }, // Klasifikasi
            { wch: 15 }, // Sifat Surat
            { wch: 15 }, // Bidang Tugas
            { wch: 18 }, // Tanggal Diterima
            { wch: 18 }, // Tanggal Dikirim
            { wch: 45 }, // Disposisi
            { wch: 25 }, // Hasil Tindak Lanjut
            { wch: 18 }, // Tanggal Kegiatan
            { wch: 35 }, // Judul Kegiatan
            { wch: 15 }, // Ada Disposisi
            { wch: 15 }, // Jumlah Disposisi
            { wch: 18 }, // Status Disposisi
            { wch: 35 }, // Detail Disposisi
            { wch: 30 }, // Link File Laporan Disposisi
            { wch: 30 }, // Link File Surat
            { wch: 18 }  // Asal Pengirim
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template Import Surat');
        XLSX.writeFile(wb, `Template_Import_Surat.xlsx`);
    };

    if (!isOpen) return null;

    const validCount = parsedData.filter(d => d.isValid).length;
    const invalidCount = parsedData.filter(d => !d.isValid).length;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-gov-600 to-gov-700 text-white px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <FileSpreadsheet size={24} />
                        <h3 className="text-xl font-bold">Import Surat dari Excel / CSV</h3>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto w-full">
                    {/* Step 1: Upload File */}
                    {!file && (
                        <div className="flex flex-col items-center justify-center space-y-6 py-8">
                            <div className="text-center max-w-lg">
                                <p className="text-slate-600 mb-6">
                                    Upload file Excel (<code>.xlsx</code>, <code>.xls</code>) atau CSV yang berisi data surat.
                                    Pastikan format kolom sesuai dengan template standar.
                                </p>
                                <div className="flex justify-center mb-8">
                                    <button
                                        onClick={downloadTemplate}
                                        className="text-gov-600 hover:text-gov-700 font-medium underline flex items-center gap-2"
                                    >
                                        <FileSpreadsheet size={16} />
                                        Download Template Excel
                                    </button>
                                </div>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".xlsx, .xls, .csv"
                                className="hidden"
                            />

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center justify-center w-full max-w-xl h-48 border-2 border-dashed border-gov-300 rounded-xl bg-gov-50 hover:bg-gov-100 transition-colors cursor-pointer group"
                            >
                                <div className="p-4 bg-white rounded-full shadow-sm text-gov-600 group-hover:scale-110 transition-transform mb-4">
                                    <Upload size={32} />
                                </div>
                                <p className="text-gov-800 font-semibold mb-1">Klik untuk Memilih File</p>
                                <p className="text-sm text-slate-500">atau drag and drop (Max 10MB)</p>
                            </button>
                        </div>
                    )}

                    {/* Processing State */}
                    {isProcessing && (
                        <div className="py-20 flex flex-col items-center justify-center">
                            <Loader2 size={48} className="animate-spin text-gov-600 mb-4" />
                            <p className="text-lg font-medium text-slate-700">Memproses file...</p>
                        </div>
                    )}

                    {/* Step 2: Review Data */}
                    {file && !isProcessing && parsedData.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-3">
                                    <FileSpreadsheet size={24} className="text-slate-500" />
                                    <div>
                                        <p className="font-semibold text-slate-800">{file.name}</p>
                                        <p className="text-sm text-slate-500">{parsedData.length} Baris Data Ditemukan</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setFile(null);
                                        setParsedData([]);
                                    }}
                                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                                >
                                    Ganti File
                                </button>
                            </div>

                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                                        <Check size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-green-800">Data Valid (Siap Disimpan)</p>
                                        <p className="text-2xl font-bold text-green-700">{validCount}</p>
                                    </div>
                                </div>

                                <div className={`bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3 ${invalidCount === 0 ? 'opacity-50' : ''}`}>
                                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                                        <AlertCircle size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-red-800">Data Invalid (Dilewati)</p>
                                        <p className="text-2xl font-bold text-red-700">{invalidCount}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Preview Table */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col mt-4">
                                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                                    <span className="font-semibold text-sm text-slate-700">Preview Semua Data</span>
                                </div>
                                <div className="overflow-x-auto max-h-[350px]">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-600 uppercase bg-slate-50 sticky top-0 shadow-sm z-10">
                                            <tr>
                                                <th className="px-3 py-2 border-b">Status</th>
                                                <th className="px-3 py-2 border-b">Row</th>
                                                <th className="px-3 py-2 border-b">Aksi Duplikat</th>
                                                <th className="px-3 py-2 border-b">Jenis</th>
                                                <th className="px-3 py-2 border-b">Nomor Surat</th>
                                                <th className="px-3 py-2 border-b">Tanggal Surat</th>
                                                <th className="px-3 py-2 border-b whitespace-nowrap">Asal / Tujuan</th>
                                                <th className="px-3 py-2 border-b">Perihal</th>
                                                <th className="px-3 py-2 border-b">Ada Kegiatan?</th>
                                                <th className="px-3 py-2 border-b">Ada Disposisi?</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedData.map((row, idx) => (
                                                <tr key={idx} className={`border-b ${row.isValid && !row.existingId ? 'hover:bg-slate-50' : (row.existingId ? 'bg-yellow-50 hover:bg-yellow-100' : 'bg-red-50 hover:bg-red-100')}`}>
                                                    <td className="px-3 py-2">
                                                        {row.isValid && !row.existingId ? (
                                                            <span className="inline-flex items-center p-1 rounded-full bg-green-100 text-green-700" title="Valid">
                                                                <Check size={14} />
                                                            </span>
                                                        ) : row.isValid && row.existingId ? (
                                                            <span className="inline-flex items-center p-1 rounded-full bg-yellow-100 text-yellow-700 group relative cursor-help">
                                                                <AlertCircle size={14} />
                                                                <div className="absolute hidden group-hover:block bottom-full mb-1 w-max max-w-xs bg-black text-white text-xs p-2 rounded shadow-lg z-20">
                                                                    Data Duplikat. Pilih tipe Aksi.
                                                                </div>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center p-1 rounded-full bg-red-100 text-red-700 group relative cursor-help">
                                                                <AlertCircle size={14} />
                                                                <div className="absolute hidden group-hover:block bottom-full mb-1 w-max max-w-xs bg-black text-white text-xs p-2 rounded shadow-lg z-20">
                                                                    <ul className="list-disc pl-3">
                                                                        {row.errors.map((e, i) => <li key={i}>{e}</li>)}
                                                                    </ul>
                                                                </div>
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-500">{row.rowNum}</td>
                                                    <td className="px-3 py-2">
                                                        {row.existingId ? (
                                                            <select
                                                                value={row.duplicateAction}
                                                                onChange={(e) => {
                                                                    const newData = [...parsedData];
                                                                    const thisRow = newData.find(r => r.rowNum === row.rowNum);
                                                                    if (thisRow) thisRow.duplicateAction = e.target.value as 'skip' | 'overwrite';
                                                                    setParsedData(newData);
                                                                }}
                                                                className="text-xs border border-slate-300 rounded p-1 bg-white outline-none focus:border-gov-500 text-slate-700"
                                                            >
                                                                <option value="skip">Lewati (Skip)</option>
                                                                <option value="overwrite">Timpa (Overwrite)</option>
                                                            </select>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs italic">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap font-medium">
                                                        <span className={`px-2 py-0.5 rounded text-xs ${row.data.jenisSurat === 'Masuk' ? 'bg-green-100 text-green-800' : (row.data.jenisSurat === 'Keluar' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600')}`}>
                                                            {row.data.jenisSurat || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 font-mono text-xs">{row.data.nomorSurat || '-'}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                        {row.data.tanggalSurat ? new Date(row.data.tanggalSurat).toLocaleDateString('id-ID') : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 max-w-[150px] truncate" title={row.data.jenisSurat === 'Masuk' ? row.data.asalSurat : row.data.tujuanSurat}>
                                                        {row.data.jenisSurat === 'Masuk' ? row.data.asalSurat : row.data.tujuanSurat || '-'}
                                                    </td>
                                                    <td className="px-3 py-2 max-w-[200px] truncate" title={row.data.hal}>{row.data.hal || '-'}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        {row.kegiatan ? (
                                                            <span className="inline-flex items-center justify-center p-1 rounded-full bg-blue-100 text-blue-700" title={row.kegiatan.title}>
                                                                <Check size={14} />
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        {row.disposisi ? (
                                                            <span className="inline-flex items-center justify-center p-1 rounded-full bg-purple-100 text-purple-700" title={`Ke: ${row.disposisi.assigneeNames.join(', ')}`}>
                                                                <Check size={14} />
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={handleClose}
                        disabled={isImporting}
                        className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!file || validCount === 0 || isImporting}
                        className="px-6 py-2.5 bg-gov-600 hover:bg-gov-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {isImporting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <Upload size={18} />
                                Simpan {validCount} Data
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportSuratModal;
