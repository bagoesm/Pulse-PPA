// src/components/UserAttendancePage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  UserCheck, Calendar, Clock, Plus, Download, FileText, FileSpreadsheet, 
  MapPin, CheckCircle, AlertTriangle, FileUp, Image as ImageIcon, X, 
  Search, ShieldAlert, Sparkles, Filter, Info, Eye, Check,
  Pencil, Trash2, Clipboard, Link as LinkIcon
} from 'lucide-react';
import { User, Attendance, Geofence } from '../../types';
import { attendanceService } from '../services/AttendanceService';
import { attendanceExportService } from '../services/AttendanceExportService';
import { CustomDropdown } from './CustomDropdown';
import SimpleToast from './SimpleToast';

interface UserAttendancePageProps {
  currentUser: User;
  showNotification?: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

interface PeriodOption {
  value: string;
  label: string;
  startDate: string;
  endDate: string;
  periodTitle: string;
}

// Generate last 12 period options (16th previous month to 15th current month)
const getPeriodOptions = (): PeriodOption[] => {
  const options: PeriodOption[] = [];
  const now = new Date();
  
  for (let i = 0; i < 12; i++) {
    const refDate = new Date(now.getFullYear(), now.getMonth() - i, 15);
    const endYear = refDate.getFullYear();
    const endMonth = refDate.getMonth();
    
    let startYear = endYear;
    let startMonth = endMonth - 1;
    if (startMonth < 0) {
      startYear--;
      startMonth = 11;
    }

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const sMStr = String(startMonth + 1).padStart(2, '0');
    const eMStr = String(endMonth + 1).padStart(2, '0');

    const startDate = `${startYear}-${sMStr}-16`;
    const endDate = `${endYear}-${eMStr}-15`;

    const label = `${monthNames[endMonth]} ${endYear} (16 ${monthNames[startMonth]} - 15 ${monthNames[endMonth]} ${endYear})`;
    const periodTitle = `Bulan ${monthNames[endMonth]} ${endYear}`;
    const value = `${startDate}_${endDate}`;

    options.push({ value, label, startDate, endDate, periodTitle });
  }

  return options;
};

export const UserAttendancePage: React.FC<UserAttendancePageProps> = ({
  currentUser,
  showNotification: parentShowNotification,
}) => {
  // Period Options
  const periodOptions = useMemo(() => getPeriodOptions(), []);
  const [selectedPeriodValue, setSelectedPeriodValue] = useState<string>(periodOptions[0].value);

  // Mapped options for CustomDropdown
  const periodDropdownOptions = useMemo(() => {
    return periodOptions.map((p) => ({
      value: p.value,
      label: `Periode: ${p.label}`,
    }));
  }, [periodOptions]);

  const statusFilterOptions = [
    { value: 'Semua', label: 'Semua Status' },
    { value: 'Hadir', label: 'Hadir' },
    { value: 'Cuti', label: 'Cuti' },
    { value: 'Sakit', label: 'Sakit' },
    { value: 'Izin', label: 'Izin' },
    { value: 'Penugasan', label: 'Penugasan' },
    { value: 'Belum Absen', label: 'Belum Absen' },
  ];

  const statusFormOptions = [
    { value: 'Hadir', label: 'Hadir' },
    { value: 'Cuti', label: 'Cuti' },
    { value: 'Sakit', label: 'Sakit' },
    { value: 'Izin', label: 'Izin' },
    { value: 'Penugasan', label: 'Penugasan' },
  ];

  // Active period object
  const activePeriod = useMemo(() => {
    return periodOptions.find((p) => p.value === selectedPeriodValue) || periodOptions[0];
  }, [periodOptions, selectedPeriodValue]);

  // --- Global States ---
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [allowManual, setAllowManual] = useState<boolean>(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('Semua');

  // Modals & Edit/Delete States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [deletingAttendance, setDeletingAttendance] = useState<Attendance | null>(null);

  // Toast notification state
  const [toastState, setToastState] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const showNotification = useCallback(
    (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => {
      setToastState({
        isOpen: true,
        message,
        type,
      });
      if (parentShowNotification) {
        parentShowNotification(title, message, type);
      }
    },
    [parentShowNotification]
  );

  // --- Add/Edit Manual Form State ---
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [isMultiDate, setIsMultiDate] = useState<boolean>(false);
  const [status, setStatus] = useState<'Hadir' | 'Cuti' | 'Sakit' | 'Izin' | 'Penugasan'>('Hadir');
  const [checkInTime, setCheckInTime] = useState<string>('07:30');
  const [checkOutTime, setCheckOutTime] = useState<string>('16:00');
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<string>('');
  const [customLocationName, setCustomLocationName] = useState<string>('KemenPPPA');

  // Photos & Surat Keterangan URL Link State
  const [checkInPhotoFile, setCheckInPhotoFile] = useState<File | null>(null);
  const [checkInPhotoPreview, setCheckInPhotoPreview] = useState<string>('');
  const [checkOutPhotoFile, setCheckOutPhotoFile] = useState<File | null>(null);
  const [checkOutPhotoPreview, setCheckOutPhotoPreview] = useState<string>('');
  const [suratKeteranganUrlInput, setSuratKeteranganUrlInput] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [collisionError, setCollisionError] = useState<string>('');

  // Mapped options for Geofence CustomDropdown
  const geofenceDropdownOptions = useMemo(() => {
    const list = geofences.map((g) => ({
      value: g.id,
      label: `${g.name} (${g.latitude.toFixed(4)}, ${g.longitude.toFixed(4)})`,
    }));
    list.push({ value: 'custom', label: 'Lokasi Kustom Lainnya...' });
    return list;
  }, [geofences]);

  // --- Export Modal Form State ---
  const [exportSelectedPeriod, setExportSelectedPeriod] = useState<string>(periodOptions[0].value);
  const [isCustomDate, setIsCustomDate] = useState<boolean>(false);
  const [exportCustomStartDate, setExportCustomStartDate] = useState<string>(periodOptions[0].startDate);
  const [exportCustomEndDate, setExportCustomEndDate] = useState<string>(periodOptions[0].endDate);

  const exportPeriodDropdownOptions = useMemo(() => {
    const list = periodOptions.map((p) => ({
      value: p.value,
      label: p.label,
    }));
    list.push({ value: 'custom', label: '-- Gunakan Tanggal Kustom --' });
    return list;
  }, [periodOptions]);

  // Sync export modal dates when period changes
  const handleExportPeriodChange = (val: string) => {
    if (val === 'custom') {
      setIsCustomDate(true);
      return;
    }
    setIsCustomDate(false);
    setExportSelectedPeriod(val);
    const found = periodOptions.find((p) => p.value === val);
    if (found) {
      setExportCustomStartDate(found.startDate);
      setExportCustomEndDate(found.endDate);
    }
  };

  // --- Clipboard Paste Handler (Ctrl+V / Cmd+V & Button) ---
  const processImageBlob = useCallback(async (blob: Blob, type: 'in' | 'out') => {
    const file = new File([blob], `clipboard_${type}_${Date.now()}.png`, { type: blob.type || 'image/png' });
    try {
      const compressed = await attendanceService.compressImage(file, 50);
      const previewUrl = URL.createObjectURL(compressed);
      if (type === 'in') {
        setCheckInPhotoFile(compressed);
        setCheckInPhotoPreview(previewUrl);
        showNotification('Berhasil', 'Foto Check-In dari Clipboard berhasil ditempel (< 50KB)', 'success');
      } else {
        setCheckOutPhotoFile(compressed);
        setCheckOutPhotoPreview(previewUrl);
        showNotification('Berhasil', 'Foto Check-Out dari Clipboard berhasil ditempel (< 50KB)', 'success');
      }
    } catch (err) {
      console.error('Failed to process pasted image:', err);
      showNotification('Error', 'Gagal memproses gambar dari clipboard', 'error');
    }
  }, [showNotification]);

  // Window paste event listener
  useEffect(() => {
    if (!isAddModalOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            if (!checkInPhotoPreview) {
              await processImageBlob(blob, 'in');
            } else {
              await processImageBlob(blob, 'out');
            }
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isAddModalOpen, checkInPhotoPreview, processImageBlob]);

  // Button paste handler
  const handlePasteFromClipboardButton = async (type: 'in' | 'out') => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        showNotification('Gunakan Pintasan Keyboard', 'Tekan Ctrl+V (atau Cmd+V di Mac) untuk menempelkan gambar dari clipboard', 'info');
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          await processImageBlob(blob, type);
          return;
        }
      }
      showNotification('Tidak Ada Gambar', 'Clipboard kosong atau tidak berisi gambar. Silakan screenshot/copy gambar dahulu lalu tekan Ctrl+V', 'warning');
    } catch (err) {
      console.warn('Clipboard read error, fallback notification:', err);
      showNotification('Gunakan Pintasan Keyboard', 'Tekan Ctrl+V (atau Cmd+V di Mac) untuk menempelkan gambar dari clipboard', 'info');
    }
  };

  // --- Data Fetching ---
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [atts, geos, isAllowed] = await Promise.all([
        attendanceService.fetchUserAttendances(currentUser.id),
        attendanceService.getGeofences(),
        attendanceService.getAllowManualAttendanceSetting(),
      ]);

      setAttendances(atts);
      setGeofences(geos);
      setAllowManual(isAllowed);

      if (geos.length > 0 && !selectedGeofenceId) {
        setSelectedGeofenceId(geos[0].id);
        setCustomLocationName(geos[0].name);
      }
    } catch (err) {
      console.error('Failed to load user attendance data:', err);
      showNotification('Error', 'Gagal memuat data absensi', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, selectedGeofenceId, showNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Geofence Selection
  const handleGeofenceChange = (geoId: string) => {
    setSelectedGeofenceId(geoId);
    const selected = geofences.find((g) => g.id === geoId);
    if (selected) {
      setCustomLocationName(selected.name);
    }
  };

  // Open Edit Modal
  const handleEditClick = (item: Attendance) => {
    setEditingAttendance(item);
    const dStr = item.checkIn ? item.checkIn.substring(0, 10) : new Date().toISOString().substring(0, 10);
    setStartDate(dStr);
    setEndDate(dStr);
    setIsMultiDate(false);
    setStatus(item.status as any || 'Hadir');
    setCheckInTime(item.checkIn ? item.checkIn.substring(11, 16) : '07:30');
    setCheckOutTime(item.checkOut ? item.checkOut.substring(11, 16) : '16:00');
    
    if (item.locationId) {
      setSelectedGeofenceId(item.locationId);
    } else {
      setSelectedGeofenceId('custom');
    }
    setCustomLocationName(item.locationName || 'KemenPPPA');
    setCheckInPhotoPreview(item.checkInPhotoUrl || '');
    setCheckOutPhotoPreview(item.checkOutPhotoUrl || '');
    setSuratKeteranganUrlInput(item.suratKeteranganUrl || '');
    setIsAddModalOpen(true);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingAttendance(null);
    const today = new Date().toISOString().substring(0, 10);
    setStartDate(today);
    setEndDate(today);
    setIsMultiDate(false);
    setStatus('Hadir');
    setCheckInTime('07:30');
    setCheckOutTime('16:00');
    setCheckInPhotoFile(null);
    setCheckInPhotoPreview('');
    setCheckOutPhotoFile(null);
    setCheckOutPhotoPreview('');
    setSuratKeteranganUrlInput('');
    setIsAddModalOpen(true);
  };

  // Image Upload Handler with Canvas Compression (< 50KB)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'in' | 'out') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('Format Salah', 'File foto harus berupa gambar (.jpg, .png, .jpeg)', 'warning');
      return;
    }

    try {
      const compressed = await attendanceService.compressImage(file, 50);
      const previewUrl = URL.createObjectURL(compressed);

      if (type === 'in') {
        setCheckInPhotoFile(compressed);
        setCheckInPhotoPreview(previewUrl);
      } else {
        setCheckOutPhotoFile(compressed);
        setCheckOutPhotoPreview(previewUrl);
      }
      showNotification('Foto Berhasil Diunggah', `Ukuran file: ${(compressed.size / 1024).toFixed(1)} KB (Dibawah 50KB)`, 'success');
    } catch (err) {
      console.error('Image compression failed:', err);
      showNotification('Error', 'Gagal memproses foto', 'error');
    }
  };

  // Validate Date Range Collision against Face Attendances
  const checkDateCollision = useCallback(
    (start: string, end: string): string[] => {
      const datesToTest: string[] = [];
      const s = new Date(start);
      const e = new Date(isMultiDate ? end : start);

      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        datesToTest.push(d.toISOString().substring(0, 10));
      }

      const collidedDates: string[] = [];
      attendances.forEach((att) => {
        if (!att.isManual && att.checkIn) {
          const attDate = att.checkIn.substring(0, 10);
          if (datesToTest.includes(attDate)) {
            collidedDates.push(attDate);
          }
        }
      });

      return collidedDates;
    },
    [attendances, isMultiDate]
  );

  useEffect(() => {
    if (startDate && !editingAttendance) {
      const collisions = checkDateCollision(startDate, endDate);
      if (collisions.length > 0) {
        const formatted = collisions.map((d) => {
          const [y, m, day] = d.split('-');
          return `${day}/${m}/${y}`;
        }).join(', ');
        setCollisionError(`Tanggal (${formatted}) sudah dicatat secara otomatis via Absensi Wajah. Tidak dapat membuat list absen manual untuk tanggal tersebut.`);
      } else {
        setCollisionError('');
      }
    } else {
      setCollisionError('');
    }
  }, [startDate, endDate, isMultiDate, editingAttendance, checkDateCollision]);

  // --- Submit Manual Attendance (Create / Edit) ---
  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allowManual && !editingAttendance) {
      showNotification('Fitur Nonaktif', 'Pengisian list absen manual saat ini dinonaktifkan oleh Admin', 'warning');
      return;
    }

    if (collisionError) {
      showNotification('Tanggal Bentrok', collisionError, 'error');
      return;
    }

    if (status !== 'Hadir' && !suratKeteranganUrlInput.trim()) {
      showNotification('Link Surat Wajib', `Status ${status} wajib mengisi Link Surat Keterangan / Penugasan`, 'warning');
      return;
    }

    try {
      setSubmitting(true);

      let checkInPhotoUrl = editingAttendance?.checkInPhotoUrl || '';
      let checkOutPhotoUrl = editingAttendance?.checkOutPhotoUrl || '';

      if (checkInPhotoFile) {
        checkInPhotoUrl = await attendanceService.uploadAttendanceAttachment(checkInPhotoFile, `photos/${currentUser.id}`);
      }

      if (checkOutPhotoFile) {
        checkOutPhotoUrl = await attendanceService.uploadAttendanceAttachment(checkOutPhotoFile, `photos/${currentUser.id}`);
      }

      const targetGeo = geofences.find((g) => g.id === selectedGeofenceId);
      const lat = targetGeo ? targetGeo.latitude : -6.175392;
      const lng = targetGeo ? targetGeo.longitude : 106.827153;
      const finalSuratUrl = suratKeteranganUrlInput.trim() || undefined;

      if (editingAttendance) {
        // --- Edit Mode ---
        const checkInIso = `${startDate}T${checkInTime}:00`;
        const checkOutIso = checkOutTime ? `${startDate}T${checkOutTime}:00` : undefined;

        await attendanceService.updateManualAttendance(editingAttendance.id, {
          checkIn: checkInIso,
          checkOut: checkOutIso,
          status,
          locationId: selectedGeofenceId,
          locationName: customLocationName,
          latitude: lat,
          longitude: lng,
          suratKeteranganUrl: finalSuratUrl,
          checkInPhotoUrl: checkInPhotoUrl || undefined,
          checkOutPhotoUrl: checkOutPhotoUrl || undefined,
        });

        showNotification('Berhasil', 'Data absensi manual berhasil diperbarui', 'success');
      } else {
        // --- Create Mode ---
        const s = new Date(startDate);
        const eDate = new Date(isMultiDate ? endDate : startDate);

        let createdCount = 0;
        for (let d = new Date(s); d <= eDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().substring(0, 10);
          const checkInIso = `${dateStr}T${checkInTime}:00`;
          const checkOutIso = checkOutTime ? `${dateStr}T${checkOutTime}:00` : undefined;

          await attendanceService.createManualAttendance({
            employeeId: currentUser.id,
            checkIn: checkInIso,
            checkOut: checkOutIso,
            status,
            locationId: selectedGeofenceId,
            locationName: customLocationName,
            latitude: lat,
            longitude: lng,
            suratKeteranganUrl: finalSuratUrl,
            checkInPhotoUrl: checkInPhotoUrl || undefined,
            checkOutPhotoUrl: checkOutPhotoUrl || undefined,
          });
          createdCount++;
        }

        showNotification('Berhasil', `${createdCount} data absensi manual berhasil ditambahkan`, 'success');
      }

      setIsAddModalOpen(false);
      setEditingAttendance(null);
      setCheckInPhotoFile(null);
      setCheckInPhotoPreview('');
      setCheckOutPhotoFile(null);
      setCheckOutPhotoPreview('');
      setSuratKeteranganUrlInput('');

      loadData();
    } catch (err) {
      console.error('Failed to submit manual attendance:', err);
      showNotification('Error', 'Gagal menyimpan absensi manual', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Delete Manual Attendance ---
  const handleDeleteManual = async () => {
    if (!deletingAttendance) return;
    try {
      setDeleting(true);
      const targetId = deletingAttendance.id;
      const targetDate = deletingAttendance.checkIn ? deletingAttendance.checkIn.substring(0, 10) : '';

      await attendanceService.deleteAttendance(targetId);
      
      // Update local state immediately for instant UI feedback (by ID & Date)
      setAttendances((prev) => prev.filter((a) => {
        if (a.id === targetId) return false;
        if (targetDate && a.checkIn && a.checkIn.substring(0, 10) === targetDate) return false;
        return true;
      }));
      
      showNotification('Berhasil', 'Data absensi manual & file lampiran berhasil dihapus', 'success');
      setDeletingAttendance(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete manual attendance:', err);
      showNotification('Error', 'Gagal menghapus absensi manual', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Build Map of attendances by YYYY-MM-DD
  const attendanceMapByDate = useMemo(() => {
    const map = new Map<string, Attendance>();
    attendances.forEach((item) => {
      if (item.checkIn) {
        const dateKey = item.checkIn.substring(0, 10);
        map.set(dateKey, item);
      }
    });
    return map;
  }, [attendances]);

  // Generate ALL dates in the selected period (16th to 15th)
  const fullPeriodDateList = useMemo(() => {
    if (!activePeriod) return [];
    const list: { dateKey: string; attendance?: Attendance }[] = [];

    const cur = new Date(activePeriod.startDate + 'T00:00:00Z');
    const end = new Date(activePeriod.endDate + 'T00:00:00Z');

    while (cur <= end) {
      const dStr = cur.toISOString().substring(0, 10);
      const att = attendanceMapByDate.get(dStr);
      list.push({ dateKey: dStr, attendance: att });
      cur.setDate(cur.getDate() + 1);
    }

    return list;
  }, [activePeriod, attendanceMapByDate]);

  // Filtered List for Table Render
  const filteredDateRows = useMemo(() => {
    return fullPeriodDateList.filter((item) => {
      const att = item.attendance;
      // Status filter
      if (selectedStatusFilter !== 'Semua') {
        if (!att && selectedStatusFilter !== 'Belum Absen') return false;
        if (att && att.status !== selectedStatusFilter) return false;
      }
      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const loc = (att?.locationName || '').toLowerCase();
        const stat = (att?.status || 'belum absen').toLowerCase();
        const date = item.dateKey.toLowerCase();
        if (!loc.includes(term) && !stat.includes(term) && !date.includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [fullPeriodDateList, selectedStatusFilter, searchTerm]);

  // Statistics for active period
  const stats = useMemo(() => {
    let hadir = 0;
    let cuti = 0;
    let sakit = 0;
    let izin = 0;
    let penugasan = 0;
    let belumAbsen = 0;

    fullPeriodDateList.forEach((item) => {
      const att = item.attendance;
      if (!att) {
        belumAbsen++;
      } else if (att.status === 'Hadir' || att.status === 'Terlambat' || att.status === 'WFA') {
        hadir++;
      } else if (att.status === 'Cuti') cuti++;
      else if (att.status === 'Sakit') sakit++;
      else if (att.status === 'Izin') izin++;
      else if (att.status === 'Penugasan') penugasan++;
    });

    return { totalDays: fullPeriodDateList.length, hadir, cuti, sakit, izin, penugasan, belumAbsen };
  }, [fullPeriodDateList]);

  // --- Export Handlers ---
  const triggerExport = async (format: 'docx' | 'pdf') => {
    try {
      let sDate = activePeriod.startDate;
      let eDate = activePeriod.endDate;
      let pTitle = activePeriod.periodTitle;

      if (isCustomDate && exportCustomStartDate && exportCustomEndDate) {
        sDate = exportCustomStartDate;
        eDate = exportCustomEndDate;
        pTitle = `${sDate} s/d ${eDate}`;
      } else if (!isCustomDate && exportSelectedPeriod) {
        const found = periodOptions.find((p) => p.value === exportSelectedPeriod);
        if (found) {
          sDate = found.startDate;
          eDate = found.endDate;
          pTitle = found.periodTitle;
        }
      }

      // Filter attendances that fall within export date range
      const exportFilteredData = attendances.filter((item) => {
        if (!item.checkIn) return false;
        const d = item.checkIn.substring(0, 10);
        return d >= sDate && d <= eDate;
      });

      if (format === 'docx') {
        await attendanceExportService.exportToDocx(currentUser, pTitle, exportFilteredData, sDate, eDate);
        showNotification('Export Berhasil', 'Dokumen Word (.doc) berhasil dibuat', 'success');
      } else {
        await attendanceExportService.exportToPdf(currentUser, pTitle, exportFilteredData, sDate, eDate);
        showNotification('Export Berhasil', 'Dokumen PDF (.pdf) berhasil dibuat', 'success');
      }
      setIsExportModalOpen(false);
    } catch (err) {
      console.error('Export failed:', err);
      showNotification('Export Gagal', 'Terjadi kesalahan saat meng-export dokumen', 'error');
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-50 custom-scrollbar">
      <SimpleToast
        isOpen={toastState.isOpen}
        message={toastState.message}
        type={toastState.type}
        onClose={() => setToastState((prev) => ({ ...prev, isOpen: false }))}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 pb-16 animate-fadeIn">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-gov-700 via-gov-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-gov-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 text-[11px] font-bold bg-white/10 text-gov-200 border border-white/20 rounded-full backdrop-blur-md">
                  Informasi Lainnya
                </span>
                <span className="px-2.5 py-0.5 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                  <UserCheck size={12} />
                  Pegawai: {currentUser.name}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Absensi Saya</h1>
              <p className="text-sm text-gov-100/90 mt-1 max-w-2xl font-medium">
                Pencatatan riwayat absensi resmi pegawai KemenPPPA (Periode 16 s.d. 15 bulan berikutnya).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  setExportSelectedPeriod(selectedPeriodValue);
                  setIsCustomDate(false);
                  setIsExportModalOpen(true);
                }}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-sm"
              >
                <Download size={15} />
                Export Absensi
              </button>

              <button
                onClick={() => {
                  if (!allowManual) {
                    showNotification('Akses Dibatasi', 'Pengisian list absen manual dinonaktifkan oleh Admin', 'warning');
                    return;
                  }
                  handleOpenAddModal();
                }}
                disabled={!allowManual}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-md ${
                  allowManual
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white cursor-pointer'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-75'
                }`}
              >
                <Plus size={16} />
                Buat List Absen
              </button>
            </div>
          </div>
        </div>

        {/* Admin Toggle Banner Warning (If Disabled) */}
        {!allowManual && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800 animate-fadeIn">
            <ShieldAlert size={20} className="text-amber-600 flex-shrink-0" />
            <div className="text-xs">
              <p className="font-bold">Pengisian List Absen Manual Sedang Dinonaktifkan</p>
              <p className="text-amber-700">Fitur pembuatan list absen manual saat ini dimatikan oleh Admin/Pengelola Absensi. Pegawai hanya dapat melihat riwayat absensi.</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Hari Periode</span>
            <span className="text-2xl font-extrabold text-slate-800 mt-1">{stats.totalDays}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Hadir</span>
            <span className="text-2xl font-extrabold text-emerald-700 mt-1">{stats.hadir}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Cuti</span>
            <span className="text-2xl font-extrabold text-blue-700 mt-1">{stats.cuti}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Sakit</span>
            <span className="text-2xl font-extrabold text-rose-700 mt-1">{stats.sakit}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Izin</span>
            <span className="text-2xl font-extrabold text-amber-700 mt-1">{stats.izin}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Penugasan</span>
            <span className="text-2xl font-extrabold text-purple-700 mt-1">{stats.penugasan}</span>
          </div>
        </div>

        {/* Controls & Filters Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* CustomDropdown: Periode Resmi */}
            <div className="w-full sm:w-72">
              <CustomDropdown
                options={periodDropdownOptions}
                value={selectedPeriodValue}
                onChange={setSelectedPeriodValue}
                icon={<Calendar size={14} className="text-gov-600 flex-shrink-0" />}
              />
            </div>

            {/* CustomDropdown: Status Filter */}
            <div className="w-full sm:w-44">
              <CustomDropdown
                options={statusFilterOptions}
                value={selectedStatusFilter}
                onChange={setSelectedStatusFilter}
                icon={<Filter size={14} className="text-slate-500 flex-shrink-0" />}
              />
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari lokasi / tanggal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 transition-all font-medium text-slate-800"
            />
          </div>
        </div>

        {/* Attendance List Table (Full Calendar Dates for Period) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">Status & Metode</th>
                  <th className="py-3.5 px-4">Check-In</th>
                  <th className="py-3.5 px-4">Check-Out</th>
                  <th className="py-3.5 px-4">Lokasi</th>
                  <th className="py-3.5 px-4">Bukti Foto / Surat</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-gov-600 border-t-transparent rounded-full animate-spin" />
                        <span>Memuat data absensi...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredDateRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Calendar size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold">Tidak ada data untuk filter yang dipilih</p>
                    </td>
                  </tr>
                ) : (
                  filteredDateRows.map((rowItem) => {
                    const item = rowItem.attendance;
                    const d = new Date(rowItem.dateKey + 'T00:00:00Z');
                    const formattedDate = d.toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    });

                    if (!item) {
                      // Unrecorded / Missing date in period
                      return (
                        <tr key={rowItem.dateKey} className="hover:bg-slate-50/50 transition-all opacity-60">
                          <td className="py-3 px-4 font-bold text-slate-600">{formattedDate}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              Belum Absen
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">-</td>
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">-</td>
                          <td className="py-3 px-4 text-slate-400">-</td>
                          <td className="py-3 px-4 text-slate-400">-</td>
                          <td className="py-3 px-4 text-center text-slate-400">-</td>
                        </tr>
                      );
                    }

                    const checkInTimeStr = item.checkIn ? item.checkIn.substring(11, 16) : '-';
                    const checkOutTimeStr = item.checkOut ? item.checkOut.substring(11, 16) : '-';

                    return (
                      <tr key={item.id || rowItem.dateKey} className="hover:bg-slate-50/80 transition-all">
                        <td className="py-3.5 px-4 font-bold text-slate-800">{formattedDate}</td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              item.status === 'Hadir' || item.status === 'Terlambat' || item.status === 'WFA'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : item.status === 'Cuti'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : item.status === 'Sakit'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : item.status === 'Izin'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}>
                              {item.status}
                            </span>

                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              item.isManual
                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                : 'bg-gov-50 text-gov-700 border border-gov-200'
                            }`}>
                              {item.isManual ? 'Manual' : 'Wajah Otomatis'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          <div className="flex items-center gap-1">
                            <Clock size={13} className="text-emerald-600" />
                            {checkInTimeStr} WIB
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          <div className="flex items-center gap-1">
                            <Clock size={13} className="text-amber-600" />
                            {checkOutTimeStr} {checkOutTimeStr !== '-' ? 'WIB' : ''}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700">
                          <div className="flex items-center gap-1 font-semibold">
                            <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                            <span>{item.locationName || 'Kantor Pusat KPPPA'}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            {item.checkInPhotoUrl && (
                              <a
                                href={item.checkInPhotoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-gov-600 hover:text-gov-800 bg-gov-50 px-2 py-1 rounded-lg border border-gov-200"
                              >
                                <ImageIcon size={12} />
                                Foto In
                              </a>
                            )}

                            {item.checkOutPhotoUrl && (
                              <a
                                href={item.checkOutPhotoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-gov-600 hover:text-gov-800 bg-gov-50 px-2 py-1 rounded-lg border border-gov-200"
                              >
                                <ImageIcon size={12} />
                                Foto Out
                              </a>
                            )}

                            {item.suratKeteranganUrl && (
                              <a
                                href={item.suratKeteranganUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-800 bg-purple-50 px-2 py-1 rounded-lg border border-purple-200"
                              >
                                <LinkIcon size={12} />
                                Link Surat
                              </a>
                            )}

                            {!item.checkInPhotoUrl && !item.checkOutPhotoUrl && !item.suratKeteranganUrl && (
                              <span className="text-slate-400 text-[11px] font-italic">-</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {item.isManual ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEditClick(item)}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all border border-blue-200 shadow-sm"
                                title="Edit Absensi Manual"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => setDeletingAttendance(item)}
                                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-all border border-rose-200 shadow-sm"
                                title="Hapus Absensi Manual"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-[10px]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL EDIT / BUAT LIST ABSEN MANUAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden transform transition-all my-8">
            <div className="px-6 py-5 bg-gradient-to-r from-gov-700 to-gov-800 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl">
                  {editingAttendance ? <Pencil className="w-6 h-6 text-white" /> : <Plus className="w-6 h-6 text-white" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingAttendance ? 'Edit List Absen Manual' : 'Buat List Absen Manual'}
                  </h3>
                  <p className="text-xs text-gov-100 font-medium">Input absensi resmi pegawai (Bisa Paste Ctrl+V, Foto &lt; 50KB)</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingAttendance(null);
                }}
                className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitManual} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {collisionError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs font-semibold animate-shake">
                  <ShieldAlert size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{collisionError}</span>
                </div>
              )}

              {!editingAttendance && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Metode Tanggal</span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={isMultiDate}
                      onChange={(e) => setIsMultiDate(e.target.checked)}
                      className="rounded text-gov-600 focus:ring-gov-500"
                    />
                    Rentang Banyak Tanggal
                  </label>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tanggal {isMultiDate ? 'Mulai' : ''}
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (!isMultiDate) setEndDate(e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 font-semibold text-slate-800"
                  />
                </div>

                {isMultiDate && !editingAttendance && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Tanggal Selesai
                    </label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 font-semibold text-slate-800"
                    />
                  </div>
                )}
              </div>

              <div>
                <CustomDropdown
                  label="Status Kehadiran"
                  options={statusFormOptions}
                  value={status}
                  onChange={(val) => setStatus(val as any)}
                />
              </div>

              {status !== 'Hadir' && (
                <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center justify-between">
                    <span>Link Surat Keterangan / Penugasan ({status}) *</span>
                    <span className="text-[10px] text-purple-600 font-normal">Wajib Diisi</span>
                  </label>
                  <div className="relative">
                    <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500" />
                    <input
                      type="url"
                      required
                      placeholder="https://drive.google.com/... atau link Surat / Penugasan"
                      value={suratKeteranganUrlInput}
                      onChange={(e) => setSuratKeteranganUrlInput(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 font-medium text-slate-800"
                    />
                  </div>
                  <p className="text-[10px] text-purple-700 font-medium">Masukkan URL link dokumen resmi (Google Drive, Srikandi, atau cloud storage)</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Jam Check-In
                  </label>
                  <input
                    type="time"
                    required
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Jam Check-Out
                  </label>
                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <CustomDropdown
                  label="Lokasi / Geofence"
                  options={geofenceDropdownOptions}
                  value={selectedGeofenceId}
                  onChange={handleGeofenceChange}
                />
              </div>

              {selectedGeofenceId === 'custom' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lokasi Kustom</label>
                  <input
                    type="text"
                    required
                    value={customLocationName}
                    onChange={(e) => setCustomLocationName(e.target.value)}
                    placeholder="Contoh: Perumahan Wahana Babelan"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 font-semibold text-slate-800"
                  />
                </div>
              )}

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Foto Bukti Presensi</span>
                  <span className="text-[10px] text-gov-600 font-bold bg-gov-50 px-2 py-0.5 rounded-full border border-gov-200">Bisa Ctrl+V / Paste Clipboard</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center flex flex-col justify-between">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Foto Check-In</label>
                      {checkInPhotoPreview ? (
                        <div className="relative mb-2">
                          <img src={checkInPhotoPreview} alt="Preview CheckIn" className="w-full h-24 object-cover rounded-lg border border-slate-300" />
                          <button
                            type="button"
                            onClick={() => {
                              setCheckInPhotoFile(null);
                              setCheckInPhotoPreview('');
                            }}
                            className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-md"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : null}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'in')}
                        className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-gov-600 file:text-white hover:file:bg-gov-700 cursor-pointer"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePasteFromClipboardButton('in')}
                      className="w-full mt-2.5 py-1.5 px-3 bg-gov-50 hover:bg-gov-100 text-gov-700 font-bold text-[11px] rounded-xl border border-gov-200 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <Clipboard size={13} />
                      Paste Gambar (Ctrl+V)
                    </button>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center flex flex-col justify-between">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Foto Check-Out</label>
                      {checkOutPhotoPreview ? (
                        <div className="relative mb-2">
                          <img src={checkOutPhotoPreview} alt="Preview CheckOut" className="w-full h-24 object-cover rounded-lg border border-slate-300" />
                          <button
                            type="button"
                            onClick={() => {
                              setCheckOutPhotoFile(null);
                              setCheckOutPhotoPreview('');
                            }}
                            className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-md"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : null}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'out')}
                        className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-gov-600 file:text-white hover:file:bg-gov-700 cursor-pointer"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePasteFromClipboardButton('out')}
                      className="w-full mt-2.5 py-1.5 px-3 bg-gov-50 hover:bg-gov-100 text-gov-700 font-bold text-[11px] rounded-xl border border-gov-200 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <Clipboard size={13} />
                      Paste Gambar (Ctrl+V)
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingAttendance(null);
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !!collisionError}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : editingAttendance ? (
                    'Perbarui Absensi'
                  ) : (
                    'Simpan Absensi'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {deletingAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-sm w-full overflow-hidden transform transition-all p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Hapus Absensi Manual?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus data absensi manual tanggal{' '}
                <span className="font-bold text-slate-800">
                  {deletingAttendance.checkIn ? deletingAttendance.checkIn.substring(0, 10) : ''}
                </span>
                ? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAttendance(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteManual}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXPORT LAPORAN ABSENSI PRESIUM UI */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden transform transition-all">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-gov-700 via-gov-800 to-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white tracking-tight">Export Bukti Presensi</h3>
                  <p className="text-xs text-gov-100/90 font-medium">Format Laporan Resmi KemenPPPA</p>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              {/* Periode Resmi Dropdown */}
              <div>
                <CustomDropdown
                  label="Pilih Periode Resmi (16 - 15)"
                  options={exportPeriodDropdownOptions}
                  value={isCustomDate ? 'custom' : exportSelectedPeriod}
                  onChange={handleExportPeriodChange}
                />
              </div>

              {/* Custom Date Range Section */}
              <div className={`p-4 rounded-2xl border transition-all ${
                isCustomDate ? 'bg-gov-50/50 border-gov-200 shadow-sm' : 'bg-slate-50/50 border-slate-100 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={isCustomDate}
                      onChange={(e) => setIsCustomDate(e.target.checked)}
                      className="rounded text-gov-600 focus:ring-gov-500 w-4 h-4"
                    />
                    Rentang Tanggal Kustom
                  </label>
                  {isCustomDate && (
                    <span className="text-[10px] text-gov-700 font-bold bg-white px-2 py-0.5 rounded-full border border-gov-200">Aktif</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tanggal Mulai</label>
                    <input
                      type="date"
                      disabled={!isCustomDate}
                      value={exportCustomStartDate}
                      onChange={(e) => setExportCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tanggal Selesai</label>
                    <input
                      type="date"
                      disabled={!isCustomDate}
                      value={exportCustomEndDate}
                      onChange={(e) => setExportCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Batal
                </button>
                
                <div className="w-full sm:w-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => triggerExport('docx')}
                    className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <FileSpreadsheet size={15} />
                    Export Word (.doc)
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerExport('pdf')}
                    className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <FileText size={15} />
                    Export PDF (.pdf)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
