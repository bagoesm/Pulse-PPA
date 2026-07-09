// src/components/ImportZoomScheduleModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Check, AlertCircle, FileSpreadsheet, Loader2, Download } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { ZoomMeeting, User } from '../../types';

interface ImportZoomScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User | null;
    showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

interface ParsedZoomMeeting {
    rowNum: number;
    isValid: boolean;
    errors: string[];
    data: Partial<ZoomMeeting>;
    raw: any;
}

const ImportZoomScheduleModal: React.FC<ImportZoomScheduleModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    currentUser,
    showNotification
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedZoomMeeting[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Master Data for mapping
    const [zoomAccounts, setZoomAccounts] = useState<{ id: string; name: string }[]>([]);
    const [profiles, setProfiles] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        const loadMasterData = async () => {
            try {
                const [accsResponse, profilesResponse] = await Promise.all([
                    supabase.from('zoom_accounts').select('id, name'),
                    supabase.from('profiles').select('id, name')
                ]);
                
                if (accsResponse.data) setZoomAccounts(accsResponse.data);
                if (profilesResponse.data) setProfiles(profilesResponse.data);
            } catch (error) {
                console.error('Error loading master data for mapping:', error);
            }
        };

        if (isOpen) {
            loadMasterData();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const parseExcelDate = (excelValue: any): string | null => {
        if (!excelValue) return null;

        if (excelValue instanceof Date) {
            if (isNaN(excelValue.getTime())) return null;
            return excelValue.toISOString().split('T')[0];
        }

        if (typeof excelValue === 'number') {
            const date = new Date(Math.round((excelValue - 25569) * 86400 * 1000));
            if (isNaN(date.getTime())) return null;
            return date.toISOString().split('T')[0];
        }

        if (typeof excelValue === 'string') {
            const dateStr = excelValue.trim();
            const parts = dateStr.split(/[/-]/);
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    // YYYY-MM-DD
                    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                } else if (parts[2].length === 4) {
                    // DD/MM/YYYY
                    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            }
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
                return parsed.toISOString().split('T')[0];
            }
        }

        return null;
    };

    const parseExcelTime = (timeValue: any): string | null => {
        if (!timeValue) return null;
        if (typeof timeValue === 'number') {
            const totalMinutes = Math.round(timeValue * 24 * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
        if (typeof timeValue === 'string') {
            const trimmed = timeValue.trim();
            const match = trimmed.match(/^(\d{1,2})[:.](\d{2})$/);
            if (match) {
                return `${match[1].padStart(2, '0')}:${match[2]}`;
            }
        }
        return null;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        const fileType = selectedFile.name.split('.').pop()?.toLowerCase();
        if (!['csv', 'xlsx', 'xls'].includes(fileType || '')) {
            showNotification('Format Tidak Valid', 'Silakan upload file CSV atau Excel (.xlsx, .xls)', 'error');
            return;
        }

        setFile(selectedFile);
        processFile(selectedFile);
    };

    const processFile = (file: File) => {
        setIsProcessing(true);
        const reader = new FileReader();

        reader.onload = async (e) => {
            const XLSX = await import('xlsx');
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                const parsedRows: ParsedZoomMeeting[] = jsonData.map((row: any, index) => {
                    const errors: string[] = [];
                    const rowNum = index + 2; // Row 1 is header

                    // Map columns loosely based on keywords
                    const findValue = (keys: string[]) => {
                        const foundKey = Object.keys(row).find(k => 
                            keys.some(key => k.toLowerCase().replace(/[\s_]/g, '').includes(key.toLowerCase()))
                        );
                        return foundKey ? row[foundKey] : '';
                    };

                    const rawKegiatan = findValue(['kegiatan', 'acara', 'nama', 'title', 'temakegiatan']);
                    const rawTanggal = findValue(['tanggal', 'date', 'tgl']);
                    const rawWaktuMulai = findValue(['mulai', 'start', 'waktumulai']);
                    const rawWaktuSelesai = findValue(['selesai', 'end', 'waktuselesai']);
                    const rawUnitKerja = findValue(['unitkerja', 'bagian', 'satker', 'divisi', 'unitkerjasatker']);
                    const rawJenisRapat = findValue(['jenis', 'type', 'kategori', 'jenisrapat']);
                    const rawZoomLink = findValue(['link', 'tautan', 'url', 'zoomlink']);
                    const rawMeetingId = findValue(['meetingid', 'idmeeting', 'id']);
                    const rawPasscode = findValue(['passcode', 'sandi', 'password']);
                    const rawLokasi = findValue(['lokasi', 'tempat', 'room']);
                    const rawAkunZoom = findValue(['akunzoom', 'zoomaccount', 'akun']);
                    const rawOperator = findValue(['operator', 'penanggungjawab', 'pj']);
                    const rawStatus = findValue(['status', 'statusrapat']);
                    const rawUndanganText = findValue(['teksundangan', 'undangan', 'invitationtext', 'teks']);

                    // Validations
                    if (!rawKegiatan.toString().trim()) {
                        errors.push('Tema Kegiatan wajib diisi.');
                    }

                    const parsedDate = parseExcelDate(rawTanggal);
                    if (!parsedDate) {
                        errors.push('Tanggal tidak valid (Gunakan format YYYY-MM-DD atau DD/MM/YYYY).');
                    }

                    const parsedStart = parseExcelTime(rawWaktuMulai);
                    if (!parsedStart) {
                        errors.push('Waktu Mulai tidak valid (Gunakan format HH:MM).');
                    }

                    const parsedEnd = parseExcelTime(rawWaktuSelesai);
                    if (!parsedEnd) {
                        errors.push('Waktu Selesai tidak valid (Gunakan format HH:MM).');
                    }

                    if (!rawUnitKerja.toString().trim()) {
                        errors.push('Unit Kerja / Satker wajib diisi.');
                    }

                    // Strict validation for zoom meeting types
                    let finalJenisRapat = rawJenisRapat.toString().trim();
                    if (!finalJenisRapat) {
                        finalJenisRapat = 'Pendampingan Zoom'; // Default
                    } else if (
                        !['Pendampingan Zoom', 'Peminjaman Zoom'].some(
                            t => t.toLowerCase() === finalJenisRapat.toLowerCase()
                        )
                    ) {
                        // Attempt intelligent mapping
                        if (finalJenisRapat.toLowerCase().includes('damping') || finalJenisRapat.toLowerCase().includes('asistensi')) {
                            finalJenisRapat = 'Pendampingan Zoom';
                        } else if (finalJenisRapat.toLowerCase().includes('pinjam') || finalJenisRapat.toLowerCase().includes('sewa')) {
                            finalJenisRapat = 'Peminjaman Zoom';
                        } else {
                            errors.push(`Jenis Rapat harus 'Pendampingan Zoom' atau 'Peminjaman Zoom'.`);
                        }
                    } else {
                        // Standardize casing
                        finalJenisRapat = finalJenisRapat.toLowerCase() === 'pendampingan zoom' ? 'Pendampingan Zoom' : 'Peminjaman Zoom';
                    }

                    // Dynamic Mapping of Akun Zoom
                    let zoomAccountId: string | null = null;
                    if (rawAkunZoom) {
                        const searchName = rawAkunZoom.toString().toLowerCase().trim();
                        const matchedAcc = zoomAccounts.find(acc => 
                            acc.name.toLowerCase().trim() === searchName
                        );
                        if (matchedAcc) {
                            zoomAccountId = matchedAcc.id;
                        }
                    }

                    // Dynamic Mapping of Operator / Penanggung Jawab
                    let operatorId: string | null = null;
                    let operatorIds: string[] = [];
                    if (rawOperator) {
                        // Split by comma in case multiple operator names are provided
                        const opNames = rawOperator.toString().split(',').map((s: string) => s.trim().toLowerCase());
                        const matchedOps = profiles.filter(p => 
                            opNames.some((name: string) => p.name.toLowerCase().trim() === name)
                        );
                        if (matchedOps.length > 0) {
                            operatorId = matchedOps[0].id;
                            operatorIds = matchedOps.map(op => op.id);
                        }
                    }

                    // Mapping Status Rapat
                    let finalStatus: 'Scheduled' | 'Completed' | 'Cancelled' = 'Scheduled';
                    const rawStatusStr = rawStatus.toString().toLowerCase().trim();
                    if (rawStatusStr === 'selesai' || rawStatusStr === 'completed') {
                        finalStatus = 'Completed';
                    } else if (rawStatusStr === 'batal' || rawStatusStr === 'cancelled') {
                        finalStatus = 'Cancelled';
                    }

                    const meetingData: Partial<ZoomMeeting> = {
                        kegiatan: rawKegiatan.toString().trim(),
                        tanggal: parsedDate || '',
                        waktuMulai: parsedStart || '',
                        waktuSelesai: parsedEnd || '',
                        unitKerja: rawUnitKerja.toString().trim(),
                        jenisRapat: finalJenisRapat,
                        zoomLink: rawZoomLink.toString().trim() || undefined,
                        meetingId: rawMeetingId.toString().trim() || undefined,
                        passcode: rawPasscode.toString().trim() || undefined,
                        lokasi: rawLokasi.toString().trim() || 'Online',
                        status: finalStatus,
                        zoomAccountId,
                        operatorId,
                        operatorIds,
                        undanganText: rawUndanganText.toString().trim() || undefined
                    };

                    return {
                        rowNum,
                        isValid: errors.length === 0,
                        errors,
                        data: meetingData,
                        raw: row
                    };
                });

                setParsedData(parsedRows);
            } catch (error: any) {
                console.error("Error parsing Excel:", error);
                showNotification('Gagal Membaca File', 'Pastikan format file benar sesuai template', 'error');
            } finally {
                setIsProcessing(false);
            }
        };

        reader.onerror = () => {
            showNotification('Gagal Membaca File', 'Terjadi kesalahan sistem membaca berkas', 'error');
            setIsProcessing(false);
        };

        if (file) {
            reader.readAsArrayBuffer(file);
        }
    };

    const handleImport = async () => {
        const validRows = parsedData.filter(d => d.isValid);

        if (validRows.length === 0) {
            showNotification('Tidak Ada Data Valid', 'Semua baris memiliki error. Perbaiki berkas sebelum mengimpor.', 'warning');
            return;
        }

        setIsImporting(true);

        try {
            // Bulk insert in Supabase
            const dbRows = validRows.map(row => ({
                tanggal: row.data.tanggal,
                waktu_mulai: row.data.waktuMulai,
                waktu_selesai: row.data.waktuSelesai,
                kegiatan: row.data.kegiatan,
                lokasi: row.data.lokasi || 'Online',
                unit_kerja: row.data.unitKerja,
                jenis_rapat: row.data.jenisRapat,
                status: row.data.status || 'Scheduled',
                zoom_link: row.data.zoomLink || null,
                meeting_id: row.data.meetingId || null,
                passcode: row.data.passcode || null,
                zoom_account_id: row.data.zoomAccountId || null,
                operator_id: row.data.operatorId || null,
                operator_ids: row.data.operatorIds || null,
                undangan_text: row.data.undanganText || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase.from('zoom_meetings').insert(dbRows);

            if (error) throw error;

            showNotification('Berhasil', `${validRows.length} Rapat Zoom berhasil diimpor`, 'success');
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Error bulk importing meetings:", err);
            showNotification('Gagal Impor', err.message || 'Terjadi kesalahan saat memasukkan data ke database', 'error');
        } finally {
            setIsImporting(false);
        }
    };

    const downloadTemplate = async () => {
        const XLSX = await import('xlsx');
        // EXACT match with the exported Excel headers from exportZoomExcel.ts
        const templateData = [
            {
                'Tanggal': '2026-07-01',
                'Waktu Mulai': '09:00',
                'Waktu Selesai': '11:00',
                'Tema Kegiatan': 'Rapat Pendampingan Penggunaan Aplikasi A',
                'Akun Zoom': zoomAccounts.length > 0 ? zoomAccounts[0].name : 'Akun Utama',
                'Lokasi': 'Online',
                'Unit Kerja / Satker': 'Biro Data dan Informasi',
                'Jenis Rapat': 'Pendampingan Zoom',
                'Operator / Penanggung Jawab': profiles.length > 0 ? profiles[0].name : 'Nama Operator',
                'Status Rapat': 'Terjadwal',
                'Link Zoom': 'https://zoom.us/j/1234567890',
                'Meeting ID': '1234567890',
                'Passcode': '123456',
                'Teks Undangan': 'Topik: Pendampingan Aplikasi\nWaktu: 1 Jul 2026 09:00 AM'
            },
            {
                'Tanggal': '2026-07-02',
                'Waktu Mulai': '13:30',
                'Waktu Selesai': '15:30',
                'Tema Kegiatan': 'Peminjaman Akun Sosialisasi Kepegawaian',
                'Akun Zoom': zoomAccounts.length > 1 ? zoomAccounts[1].name : 'Akun Keuangan',
                'Lokasi': 'Online',
                'Unit Kerja / Satker': 'Bagian Hukum',
                'Jenis Rapat': 'Peminjaman Zoom',
                'Operator / Penanggung Jawab': profiles.length > 0 ? profiles[0].name : 'Nama Operator',
                'Status Rapat': 'Terjadwal',
                'Link Zoom': '',
                'Meeting ID': '',
                'Passcode': '',
                'Teks Undangan': ''
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Rapat Detail');
        
        // Auto sizing columns
        ws['!cols'] = [
            { wch: 15 },  // Tanggal
            { wch: 12 },  // Waktu Mulai
            { wch: 12 },  // Waktu Selesai
            { wch: 35 },  // Tema Kegiatan
            { wch: 20 },  // Akun Zoom
            { wch: 15 },  // Lokasi
            { wch: 25 },  // Unit Kerja / Satker
            { wch: 18 },  // Jenis Rapat
            { wch: 30 },  // Operator
            { wch: 15 },  // Status Rapat
            { wch: 35 },  // Link Zoom
            { wch: 20 },  // Meeting ID
            { wch: 15 },  // Passcode
            { wch: 40 }   // Teks Undangan
        ];

        XLSX.writeFile(wb, 'Template_Import_Pelayanan_Zoom.xlsx');
    };

    const totalRows = parsedData.length;
    const validRows = parsedData.filter(d => d.isValid).length;
    const invalidRows = totalRows - validRows;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-100">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <FileSpreadsheet className="text-gov-600" size={22} />
                            Impor Jadwal Pelayanan Zoom
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">Unggah file Excel/CSV untuk menjadwalkan rapat sekaligus secara massal.</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 text-slate-450 hover:text-slate-700 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Step 1: Upload or Download template */}
                    {!file ? (
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-slate-200 hover:border-gov-400 rounded-2xl p-10 flex flex-col items-center justify-center transition-all bg-slate-50 cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="text-slate-400 mb-3" size={40} />
                                <span className="text-sm font-bold text-slate-700">Pilih atau Seret Berkas Excel / CSV</span>
                                <span className="text-xs text-slate-450 mt-1">Mendukung format .xlsx, .xls, dan .csv</span>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept=".xlsx, .xls, .csv" 
                                    onChange={handleFileChange} 
                                />
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="space-y-1 text-center sm:text-left">
                                    <h4 className="text-sm font-bold text-slate-850">Gunakan Template Impor Standar</h4>
                                    <p className="text-xs text-slate-500">Format kolom disesuaikan persis dengan hasil ekspor sistem untuk kemudahan transfer data.</p>
                                </div>
                                <button 
                                    onClick={downloadTemplate}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-gov-600 hover:bg-gov-750 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all whitespace-nowrap"
                                >
                                    <Download size={14} /> Download Template
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Step 2: Display Summary & Preview list */
                        <div className="space-y-6">
                            {/* File Info Card */}
                            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                    <FileSpreadsheet className="text-gov-600" size={28} />
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-800">{file.name}</h4>
                                        <p className="text-xs text-slate-450 font-medium">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { setFile(null); setParsedData([]); }} 
                                    className="text-xs text-red-650 hover:text-red-800 font-bold hover:underline"
                                    disabled={isImporting}
                                >
                                    Ganti Berkas
                                </button>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                                    <span className="block text-xs font-bold text-slate-450 uppercase tracking-wider">Total Baris</span>
                                    <span className="block text-2xl font-black text-slate-850 mt-1">{totalRows}</span>
                                </div>
                                <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-3.5 text-center">
                                    <span className="block text-xs font-bold text-emerald-600 uppercase tracking-wider">Data Valid</span>
                                    <span className="block text-2xl font-black text-emerald-700 mt-1">{validRows}</span>
                                </div>
                                <div className="bg-red-50/80 border border-red-100 rounded-xl p-3.5 text-center">
                                    <span className="block text-xs font-bold text-red-600 uppercase tracking-wider">Data Error</span>
                                    <span className="block text-2xl font-black text-red-700 mt-1">{invalidRows}</span>
                                </div>
                            </div>

                            {/* Preview Table */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-bold text-slate-800">Preview Data yang Diimpor</h4>
                                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 text-slate-500 uppercase font-bold tracking-wider">
                                            <tr>
                                                <th className="px-3 py-2.5 text-center" style={{ width: '50px' }}>No</th>
                                                <th className="px-3 py-2.5 text-center" style={{ width: '60px' }}>Status</th>
                                                <th className="px-3 py-2.5">Tema Kegiatan</th>
                                                <th className="px-3 py-2.5">Tanggal & Waktu</th>
                                                <th className="px-3 py-2.5">Unit Kerja / Satker</th>
                                                <th className="px-3 py-2.5">Jenis</th>
                                                <th className="px-3 py-2.5">Detail Error</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {parsedData.map((row, index) => (
                                                <tr key={index} className={`hover:bg-slate-50 ${!row.isValid ? 'bg-red-50/20' : ''}`}>
                                                    <td className="px-3 py-3 text-center text-slate-400 font-semibold">{row.rowNum}</td>
                                                    <td className="px-3 py-3 text-center">
                                                        {row.isValid ? (
                                                            <Check className="text-emerald-600 mx-auto" size={16} />
                                                        ) : (
                                                            <AlertCircle className="text-red-600 mx-auto" size={16} />
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3 font-bold text-slate-800 break-all max-w-[200px]">{row.data.kegiatan || '-'}</td>
                                                    <td className="px-3 py-3 whitespace-nowrap">
                                                        <div className="font-bold text-slate-700">{row.data.tanggal || '-'}</div>
                                                        <div className="text-[10px] text-slate-400 mt-0.5">{row.data.waktuMulai} - {row.data.waktuSelesai}</div>
                                                    </td>
                                                    <td className="px-3 py-3 font-semibold text-slate-650">{row.data.unitKerja || '-'}</td>
                                                    <td className="px-3 py-3 whitespace-nowrap">
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            row.data.jenisRapat === 'Pendampingan Zoom' 
                                                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                                                                : 'bg-blue-50 text-blue-700 border border-blue-100'
                                                        }`}>
                                                            {row.data.jenisRapat}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-red-600 text-[10px] font-semibold break-words max-w-[200px]">
                                                        {row.errors.length > 0 ? (
                                                            <ul className="list-disc list-inside space-y-0.5">
                                                                {row.errors.map((err, eIdx) => <li key={eIdx}>{err}</li>)}
                                                            </ul>
                                                        ) : '-'}
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

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div>
                        {file && (
                            <span className="text-xs font-semibold text-slate-500">
                                {validRows} dari {totalRows} baris siap diimpor
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={onClose} 
                            className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all"
                            disabled={isProcessing || isImporting}
                        >
                            Batal
                        </button>
                        {file && (
                            <button
                                onClick={handleImport}
                                disabled={isProcessing || isImporting || validRows === 0}
                                className="flex items-center gap-1.5 px-5 py-2 bg-gov-600 hover:bg-gov-750 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={14} /> Mengimpor...
                                    </>
                                ) : (
                                    <>
                                        <Check size={14} /> Impor Data Valid
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportZoomScheduleModal;
