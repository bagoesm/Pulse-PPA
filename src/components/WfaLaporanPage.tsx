// src/components/WfaLaporanPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Calendar,
  Filter,
  Search,
  Download,
  ThumbsUp,
  ExternalLink,
  Edit2,
  Trash2,
  Settings,
  CheckCircle2,
  Clock,
  Building2,
  RefreshCw,
  Sparkles,
  Eye,
  Users,
} from 'lucide-react';
import { User, WfaLaporan } from '../../types';
import { wfaService } from '../services/WfaService';
import { WfaFormModal } from './WfaFormModal';
import { WfaScheduleModal } from './WfaScheduleModal';
import { WfaExportModal } from './WfaExportModal';
import { WfaDetailModal } from './WfaDetailModal';
import ConfirmModal from './ConfirmModal';
import SimpleToast from './SimpleToast';
import { formatIndonesianDateWithDay, ensureHttps } from '../utils/formatters';

interface WfaLaporanPageProps {
  currentUser: User;
  showNotification?: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const WfaLaporanPage: React.FC<WfaLaporanPageProps> = ({ currentUser, showNotification }) => {
  const [toastState, setToastState] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToastState({ isOpen: true, message, type });
  };

  const [laporanList, setLaporanList] = useState<WfaLaporan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters - Default to current week range
  const currentWeek = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const daysToMon = day === 0 ? 6 : day - 1;

    const mon = new Date(now);
    mon.setDate(now.getDate() - daysToMon);

    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);

    return {
      startDate: mon.toISOString().slice(0, 10),
      endDate: sun.toISOString().slice(0, 10),
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(currentWeek.startDate);
  const [endDate, setEndDate] = useState<string>(currentWeek.endDate);
  const [selectedUnit, setSelectedUnit] = useState<string>(
    currentUser.role === 'Atasan' ? currentUser.divisi || 'Semua' : 'Semua'
  );
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<string>('Semua');
  const [unitProfiles, setUnitProfiles] = useState<User[]>([]);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const day = now.getDay();
      const daysToNextMon = day === 0 ? 1 : 8 - day;
      const nextMon = new Date(now);
      nextMon.setDate(now.getDate() + daysToNextMon);
      nextMon.setHours(9, 0, 0, 0);

      const diff = nextMon.getTime() - now.getTime();
      if (diff <= 0) {
        return 'Waktu habis';
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      const parts = [];
      if (days > 0) parts.push(`${days} hari`);
      if (hours > 0 || days > 0) parts.push(`${hours} jam`);
      parts.push(`${minutes} menit`);
      parts.push(`${seconds} detik`);

      return parts.join(' ');
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [viewingLaporan, setViewingLaporan] = useState<WfaLaporan | null>(null);
  const [editingLaporan, setEditingLaporan] = useState<WfaLaporan | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Available division / unit options
  const unitOptions = [
    'Semua',
    'Biro Data dan Informasi',
    'Biro Perencanaan',
    'Biro Hukum dan Humas',
    'Biro Umum dan Keuangan',
    'Deputi Bidang Kesetaraan Gender',
    'Deputi Bidang Perlindungan Hak Perempuan',
    'Deputi Bidang Perlindungan Khusus Anak',
    'Inspektorat',
  ];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [data, profiles] = await Promise.all([
        wfaService.getWfaLaporan(
          currentUser,
          startDate || undefined,
          endDate || undefined,
          selectedUnit !== 'Semua' ? selectedUnit : undefined
        ),
        currentUser.role !== 'Staff'
          ? wfaService.getUnitProfiles(selectedUnit !== 'Semua' ? selectedUnit : undefined)
          : Promise.resolve([]),
      ]);
      setLaporanList(data);
      setUnitProfiles(profiles);
    } catch (err) {
      console.error('Failed to load WFA reports', err);
      showToast('Gagal memuat daftar laporan WFA', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser, startDate, endDate, selectedUnit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combine submitted reports and unsubmitted profiles for Atasan & Super Admin
  const displayList = useMemo(() => {
    // For Staff: show all their reports (including their own Drafts)
    if (currentUser.role === 'Staff' || unitProfiles.length === 0) {
      return laporanList.map((item) => ({ 
        ...item, 
        hasSubmitted: true // Real report entry from DB
      }));
    }

    // For Atasan / Super Admin:
    // Exclude Drafts written by other users (leaders only see submitted reports)
    const submittedOrOwnReports = laporanList.filter((item) => {
      if (item.statusPelaksanaan === 'Draft' && item.userId !== currentUser.id) {
        return false; // Hide other staff's drafts from leaders
      }
      return true;
    });

    // Track all users who have created any report (draft or submitted)
    const reportUserIds = new Set(laporanList.map((item) => item.userId));
    const merged: (WfaLaporan & { hasSubmitted: boolean })[] = [
      ...submittedOrOwnReports.map((item) => ({ 
        ...item, 
        hasSubmitted: true // Real report entry from DB
      })),
    ];

    // Only add unsubmitted placeholder for employees who have ZERO reports for this period
    unitProfiles.forEach((profile) => {
      if (!reportUserIds.has(profile.id)) {
        merged.push({
          id: `unsubmitted-${profile.id}`,
          userId: profile.id,
          nama: profile.name,
          nip: profile.nip || '-',
          unitKerja: profile.divisi || selectedUnit,
          jabatan: profile.jabatan || 'Pegawai',
          tanggalWfa: startDate || currentWeek.startDate,
          rencanaHasilKinerja: '-',
          rencanaKinerja: '-',
          outputKinerja: '-',
          linkDataDukung: '',
          statusPelaksanaan: 'Belum Mengirim',
          penilaian: null,
          createdAt: '',
          hasSubmitted: false, // Dummy unsubmitted placeholder
        });
      }
    });

    return merged;
  }, [laporanList, unitProfiles, currentUser.role, currentUser.id, selectedUnit, startDate, currentWeek.startDate]);

  // Filtered List based on search, status, and submission status
  const filteredList = useMemo(() => {
    return displayList.filter((item) => {
      // Submission status filter (Sudah / Belum)
      if (submissionStatusFilter === 'Sudah Mengirim' && !item.hasSubmitted) return false;
      if (submissionStatusFilter === 'Belum Mengirim' && item.hasSubmitted) return false;

      // Search query filter
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        item.nama.toLowerCase().includes(q) ||
        (item.nip && item.nip.toLowerCase().includes(q)) ||
        item.rencanaKinerja.toLowerCase().includes(q) ||
        item.rencanaHasilKinerja.toLowerCase().includes(q) ||
        item.outputKinerja.toLowerCase().includes(q) ||
        (item.unitKerja && item.unitKerja.toLowerCase().includes(q));

      // Status filter
      const matchStatus = statusFilter === 'Semua' || item.statusPelaksanaan === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [displayList, searchQuery, statusFilter, submissionStatusFilter]);

  // Quick stats computation with employee count & evaluation metrics
  const stats = useMemo(() => {
    const totalSubmitted = displayList.filter((i) => i.hasSubmitted).length;
    const totalUnsubmitted = displayList.filter((i) => !i.hasSubmitted).length;
    const totalUnitEmployees = displayList.length;
    const selesai = displayList.filter((i) => i.hasSubmitted && i.statusPelaksanaan === 'Selesai').length;
    const dalamProses = displayList.filter((i) => i.hasSubmitted && i.statusPelaksanaan === 'Dalam Proses').length;
    const disetujui = displayList.filter((i) => i.hasSubmitted && !!i.penilaian && i.penilaian.includes('👍')).length;
    const belumDinilai = totalSubmitted - disetujui;

    return { total: totalSubmitted, totalSubmitted, totalUnsubmitted, totalUnitEmployees, selesai, dalamProses, disetujui, belumDinilai };
  }, [displayList]);

  // Handle Penilaian Thumbs Up Toggle
  const handleTogglePenilaian = async (laporan: WfaLaporan) => {
    if (currentUser.role === 'Staff') {
      showToast('Penilaian hanya dapat diberikan oleh Atasan atau Super Admin', 'warning');
      return;
    }

    const currentRating = laporan.penilaian;
    const newRating = currentRating && currentRating.includes('👍') ? null : '👍';

    try {
      await wfaService.evaluateWfaLaporan(laporan.id, newRating, currentUser);
      showToast(
        newRating ? `Penilaian 👍 diberikan untuk ${laporan.nama}` : `Penilaian untuk ${laporan.nama} dibatalkan`,
        'success'
      );
      loadData();
    } catch (err) {
      console.error('Failed to update evaluation', err);
      showToast('Gagal memperbarui penilaian', 'error');
    }
  };

  // Publish draft handler
  const handlePublishDraft = async (laporan: WfaLaporan) => {
    try {
      await wfaService.updateWfaLaporan(laporan.id, {
        statusPelaksanaan: 'Selesai',
      });
      showToast(`Laporan WFA (${formatIndonesianDateWithDay(laporan.tanggalWfa)}) berhasil dikirim!`, 'success');
      loadData();
    } catch (err) {
      console.error('Failed to publish draft report', err);
      showToast('Gagal mengirim laporan WFA', 'error');
    }
  };

  // Delete handler
  const handleDeleteRequest = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await wfaService.deleteWfaLaporan(deleteTargetId);
      showToast('Laporan WFA berhasil dihapus', 'success');
      loadData();
    } catch (err) {
      console.error('Failed to delete report', err);
      showToast('Gagal menghapus laporan WFA', 'error');
    } finally {
      setDeleteTargetId(null);
    }
  };

  // Export Execution Handler from WfaExportModal (Excel or PDF Landscape)
  const handleExecuteExport = async (dataToExport: WfaLaporan[], periodLabel: string, format: 'excel' | 'pdf') => {
    if (dataToExport.length === 0) {
      showToast('Tidak ada data laporan WFA yang sesuai dengan filter periode untuk diexport.', 'warning');
      return;
    }

    const dateSuffix = new Date().toISOString().slice(0, 10);
    const divisionName = currentUser.divisi ? currentUser.divisi.replace(/\s+/g, '_') : 'PPPA';

    if (format === 'pdf') {
      try {
        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');

        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
        });

        // Header Title
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 118, 110);
        doc.text('LAPORAN KINERJA WORK FROM ANYWHERE (WFA)', 14, 12);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        doc.text('KEMENTERIAN PEMBERDAYAAN PEREMPUAN DAN PERLINDUNGAN ANAK', 14, 17);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Periode: ${periodLabel} | Total Data: ${dataToExport.length} Laporan`, 14, 22);

        const tableRows = dataToExport.map((item, index) => [
          index + 1,
          item.nama || '-',
          item.unitKerja || '-',
          item.rencanaHasilKinerja || '-',
          item.rencanaKinerja || '-',
          item.outputKinerja || '-',
          item.linkDataDukung ? ensureHttps(item.linkDataDukung) : '-',
          item.statusPelaksanaan || '-',
          item.tanggalWfa || '-',
          item.penilaian && item.penilaian.includes('👍') ? 'Disetujui' : '-',
        ]);

        autoTable(doc, {
          startY: 25,
          head: [[
            'NO',
            'NAMA PEGAWAI',
            'UNIT KERJA',
            'RENCANA HASIL KINERJA',
            'RENCANA KINERJA',
            'OUTPUT KINERJA',
            'LINK DATA DUKUNG',
            'STATUS',
            'TANGGAL WFH',
            'PENILAIAN'
          ]],
          body: tableRows,
          theme: 'grid',
          styles: {
            fontSize: 7,
            cellPadding: 2,
            overflow: 'linebreak',
            valign: 'top',
          },
          headStyles: {
            fillColor: [15, 118, 110],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 8 },
            1: { cellWidth: 28 },
            2: { cellWidth: 26 },
            3: { cellWidth: 42 },
            4: { cellWidth: 42 },
            5: { cellWidth: 38 },
            6: { cellWidth: 32 },
            7: { halign: 'center', cellWidth: 18 },
            8: { halign: 'center', cellWidth: 20 },
            9: { halign: 'center', cellWidth: 15 },
          },
          didDrawPage: (data) => {
            const str = `Halaman ${data.pageNumber} dari ${doc.getNumberOfPages()}`;
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text(str, doc.internal.pageSize.width - 28, doc.internal.pageSize.height - 8);
          }
        });

        const filename = `Laporan_WFA_${divisionName}_${dateSuffix}.pdf`;
        doc.save(filename);
        showToast(`Laporan WFA (${dataToExport.length} data) berhasil diexport ke PDF (Landscape).`, 'success');
      } catch (err) {
        console.error('Export PDF failed:', err);
        showToast('Terjadi kesalahan saat meng-export data ke PDF.', 'error');
      }
      return;
    }

    // Default Excel export
    try {
      const XLSX = await import('xlsx');

      const exportRows = dataToExport.map((item, index) => ({
        'NO.': index + 1,
        'NAMA': item.nama,
        'NIP': item.nip || '-',
        'UNIT KERJA': item.unitKerja || '-',
        'RENCANA HASIL KINERJA': item.rencanaHasilKinerja,
        'RENCANA KINERJA': item.rencanaKinerja,
        'OUTPUT KINERJA': item.outputKinerja,
        'LINK DATA DUKUNG': item.linkDataDukung ? ensureHttps(item.linkDataDukung) : '-',
        'STATUS PELAKSANAAN': item.statusPelaksanaan,
        'TANGGAL WFH': item.tanggalWfa,
        'PENILAIAN': item.penilaian && item.penilaian.includes('👍') ? '👍 Disetujui' : '-',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);

      const columnWidths = [
        { wch: 6 },
        { wch: 25 },
        { wch: 20 },
        { wch: 30 },
        { wch: 35 },
        { wch: 35 },
        { wch: 35 },
        { wch: 35 },
        { wch: 20 },
        { wch: 15 },
        { wch: 18 },
      ];
      worksheet['!cols'] = columnWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan WFA');

      const filename = `Laporan_WFA_${divisionName}_${dateSuffix}.xlsx`;

      XLSX.writeFile(workbook, filename);
      showToast(`Laporan WFA (${dataToExport.length} data) berhasil diexport ke Excel.`, 'success');
    } catch (err) {
      console.error('Export Excel failed:', err);
      showToast('Terjadi kesalahan saat meng-export data ke Excel.', 'error');
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-50 custom-scrollbar">
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 pb-16 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-gov-700 via-gov-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-gov-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-white/10 text-gov-200 border border-white/20 rounded-full backdrop-blur-md">
                Informasi Lainnya
              </span>
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                Role: {currentUser.role}
              </span>
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full flex items-center gap-1">
                <Clock size={12} />
                Batas Input: {(() => {
                  const now = new Date();
                  const day = now.getDay();
                  const daysToNextMon = day === 0 ? 1 : 8 - day;
                  const nextMon = new Date(now);
                  nextMon.setDate(now.getDate() + daysToNextMon);
                  const options: Intl.DateTimeFormatOptions = {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  };
                  return `${nextMon.toLocaleDateString('id-ID', options)} 09:00 WIB`;
                })()}
              </span>
              {timeLeft && (
                <span className="px-2.5 py-0.5 text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full flex items-center gap-1 animate-pulse">
                  Sisa Waktu: {timeLeft}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Laporan Work From Anywhere (WFA)</h1>
            <p className="text-sm text-gov-100/90 mt-1 max-w-2xl font-medium">
              Sistem pencatatan dan penilaian pelaksanaan rencana kerja WFA pegawai Kementerian Pemberdayaan Perempuan dan Perlindungan Anak.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {currentUser.role === 'Super Admin' && (
              <button
                onClick={() => setIsScheduleOpen(true)}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Settings size={15} />
                Kelola Jadwal WFA
              </button>
            )}

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Download size={15} />
              Export Excel (.xlsx)
            </button>

            <button
              onClick={() => {
                setEditingLaporan(null);
                setIsFormOpen(true);
              }}
              className="px-4 py-2.5 bg-white text-gov-800 hover:bg-gov-50 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-md"
            >
              <Plus size={16} />
              Input Laporan WFA
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {currentUser.role === 'Atasan' || currentUser.role === 'Super Admin' ? (
          <>
            {/* Card 1: Pegawai Sudah / Belum Input */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:shadow-md transition-all">
              <div className="p-3 bg-gov-50 text-gov-700 rounded-xl flex-shrink-0">
                <Users size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                  Status Penginputan
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-black text-emerald-700">
                    {stats.totalSubmitted} Sudah
                  </span>
                  <span className="text-slate-300 font-bold">|</span>
                  <span className="text-sm font-black text-rose-600">
                    {stats.totalUnsubmitted} Belum
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-semibold block truncate mt-0.5">
                  Total {stats.totalUnitEmployees} Pegawai di Biro
                </span>
              </div>
            </div>

            {/* Card 2: Penilaian Disetujui */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:shadow-md transition-all">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl flex-shrink-0">
                <ThumbsUp size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                  Penilaian 👍
                </span>
                <span className="text-xl font-black text-amber-600 block">
                  {stats.disetujui} <span className="text-xs font-semibold text-slate-500">Disetujui</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium block truncate">
                  {stats.belumDinilai} Belum Dinilai
                </span>
              </div>
            </div>

            {/* Card 3: Status Pekerjaan Selesai */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:shadow-md transition-all">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl flex-shrink-0">
                <CheckCircle2 size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                  Pekerjaan Selesai
                </span>
                <span className="text-xl font-black text-emerald-700 block">
                  {stats.selesai} <span className="text-xs font-semibold text-slate-500">Selesai</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium block truncate">
                  {stats.dalamProses} Dalam Proses
                </span>
              </div>
            </div>

            {/* Card 4: Unit Kerja Filter Scope */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:shadow-md transition-all">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl flex-shrink-0">
                <Building2 size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                  Unit Kerja
                </span>
                <span className="text-sm font-black text-slate-800 block truncate" title={selectedUnit}>
                  {selectedUnit === 'Semua' ? 'Seluruh Unit' : selectedUnit}
                </span>
                <span className="text-[11px] text-indigo-600 font-semibold block truncate">
                  Akses: {currentUser.role}
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-gov-50 rounded-xl text-gov-600">
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-semibold block">Total Laporan Saya</span>
                <span className="text-xl font-black text-slate-800">{stats.total}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-semibold block">Status Selesai</span>
                <span className="text-xl font-black text-emerald-700">{stats.selesai}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                <Clock size={22} />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-semibold block">Dalam Proses</span>
                <span className="text-xl font-black text-amber-700">{stats.dalamProses}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-sky-50 rounded-xl text-sky-600">
                <ThumbsUp size={22} />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-semibold block">Penilaian 👍</span>
                <span className="text-xl font-black text-sky-700">{stats.disetujui}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, NIP, rencana kinerja, atau output..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Date Range */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
              <Calendar size={14} className="text-gov-600" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-0 text-xs p-1 focus:ring-0 text-slate-700 font-semibold"
                title="Tanggal Mulai"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-0 text-xs p-1 focus:ring-0 text-slate-700 font-semibold"
                title="Tanggal Selesai"
              />
            </div>

            {/* Quick Presets */}
            {(() => {
              const isThisWeekActive = startDate === currentWeek.startDate && endDate === currentWeek.endDate;
              const isAllPeriodsActive = !startDate && !endDate;

              return (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(currentWeek.startDate);
                      setEndDate(currentWeek.endDate);
                    }}
                    className={`px-3 py-1.5 font-bold text-xs rounded-xl transition-all border ${
                      isThisWeekActive
                        ? 'bg-gov-600 text-white border-gov-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    Minggu Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className={`px-3 py-1.5 font-bold text-xs rounded-xl transition-all border ${
                      isAllPeriodsActive
                        ? 'bg-gov-600 text-white border-gov-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    Semua Periode
                  </button>
                </div>
              );
            })()}

            {/* Filter Status Pengiriman (Sudah / Belum) - Khusus Admin & Atasan */}
            {(currentUser.role === 'Super Admin' || currentUser.role === 'Atasan') && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                <Users size={14} className="text-gov-600" />
                <select
                  value={submissionStatusFilter}
                  onChange={(e) => setSubmissionStatusFilter(e.target.value)}
                  className="bg-transparent border-0 text-xs focus:ring-0 text-slate-700 font-bold cursor-pointer"
                >
                  <option value="Semua">Semua Pengiriman</option>
                  <option value="Sudah Mengirim">Sudah Mengirim</option>
                  <option value="Belum Mengirim">Belum Mengirim</option>
                </select>
              </div>
            )}

            {/* Filter Unit Kerja */}
            {(currentUser.role === 'Super Admin' || currentUser.role === 'Atasan') && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                <Building2 size={14} className="text-slate-400" />
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="bg-transparent border-0 text-xs focus:ring-0 text-slate-700 font-medium cursor-pointer"
                >
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit === 'Semua' ? 'Semua Unit Kerja' : unit}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter Status */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <Filter size={14} className="text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent border-0 text-xs focus:ring-0 text-slate-700 font-medium cursor-pointer"
              >
                <option value="Semua">Semua Status</option>
                <option value="Selesai">Selesai</option>
                <option value="Dalam Proses">Dalam Proses</option>
                <option value="Belum Selesai">Belum Selesai</option>
              </select>
            </div>

            <button
              onClick={loadData}
              className="p-2 text-slate-500 hover:text-gov-700 hover:bg-slate-100 rounded-xl transition-all"
              title="Refresh Data"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-gov-600" />
            Memuat data Laporan WFA...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <FileSpreadsheet size={40} className="mx-auto text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700">Belum ada Laporan WFA</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tidak ada data laporan WFA yang sesuai dengan filter atau pencarian Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh] relative">
            <table className="w-full min-w-[1300px] text-left border-collapse">
              <thead className="sticky top-0 z-30 shadow-xs">
                <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-[50px] min-w-[50px] text-center sticky top-0 left-0 z-50 bg-slate-100">NO.</th>
                  <th className="py-3.5 px-4 min-w-[180px] sticky top-0 left-[50px] z-50 bg-slate-100 border-r border-slate-200 shadow-xs">NAMA</th>
                  <th className="py-3.5 px-4 min-w-[160px] sticky top-0 z-40 bg-slate-100">UNIT KERJA</th>
                  <th className="py-3.5 px-4 min-w-[200px] sticky top-0 z-40 bg-slate-100">RENCANA HASIL KINERJA</th>
                  <th className="py-3.5 px-4 min-w-[200px] sticky top-0 z-40 bg-slate-100">RENCANA KINERJA</th>
                  <th className="py-3.5 px-4 min-w-[180px] sticky top-0 z-40 bg-slate-100">OUTPUT KINERJA</th>
                  <th className="py-3.5 px-4 min-w-[140px] sticky top-0 z-40 bg-slate-100">DATA DUKUNG</th>
                  <th className="py-3.5 px-4 min-w-[120px] sticky top-0 z-40 bg-slate-100">STATUS</th>
                  <th className="py-3.5 px-4 min-w-[120px] sticky top-0 z-40 bg-slate-100">TANGGAL WFH</th>
                  <th className="py-3.5 px-4 min-w-[120px] text-center sticky top-0 z-40 bg-slate-100">PENILAIAN</th>
                  <th className="py-3.5 px-4 w-20 text-center sticky top-0 z-40 bg-slate-100">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredList.map((item, index) => {
                  const isOwner = item.userId === currentUser.id;
                  const canEdit = isOwner || currentUser.role === 'Super Admin';
                  const canEvaluate = currentUser.role === 'Atasan' || currentUser.role === 'Super Admin';
                  const hasThumbsUp = item.penilaian && item.penilaian.includes('👍');

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setViewingLaporan(item)}
                      className="hover:bg-gov-50/40 cursor-pointer transition-colors group"
                      title="Klik untuk melihat detail laporan"
                    >
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400 sticky left-0 z-20 bg-white group-hover:bg-slate-50 transition-colors">
                        {index + 1}
                      </td>

                      {/* Nama (Frozen Column) */}
                      <td
                        className="py-3.5 px-4 font-bold text-slate-800 max-w-[180px] truncate sticky left-[50px] z-20 bg-white group-hover:bg-slate-50 border-r border-slate-200/80 shadow-xs transition-colors"
                        title={item.nama}
                      >
                        {item.nama}
                      </td>

                      {/* Unit Kerja */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium max-w-[180px] truncate" title={item.unitKerja || '-'}>
                        {item.unitKerja || '-'}
                      </td>

                      {/* Rencana Hasil Kinerja */}
                      <td className="py-3.5 px-4 text-slate-700 max-w-[220px]" title={item.rencanaHasilKinerja}>
                        <div className="line-clamp-2 break-words leading-relaxed">
                          {item.rencanaHasilKinerja}
                        </div>
                      </td>

                      {/* Rencana Kinerja */}
                      <td className="py-3.5 px-4 text-slate-700 max-w-[220px]" title={item.rencanaKinerja}>
                        <div className="line-clamp-2 break-words leading-relaxed">
                          {item.rencanaKinerja}
                        </div>
                      </td>

                      {/* Output Kinerja */}
                      <td className="py-3.5 px-4 text-slate-700 max-w-[200px]" title={item.outputKinerja}>
                        <div className="line-clamp-2 break-words leading-relaxed">
                          {item.outputKinerja}
                        </div>
                      </td>

                      {/* Link Data Dukung */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        {item.linkDataDukung ? (
                          <a
                            href={ensureHttps(item.linkDataDukung)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-gov-700 bg-gov-50 hover:bg-gov-100 rounded-lg transition-all"
                          >
                            <ExternalLink size={12} />
                            Buka Link
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Status Pelaksanaan */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center px-3 py-1 text-[11px] font-bold rounded-full whitespace-nowrap max-w-none ${
                            !item.hasSubmitted
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.statusPelaksanaan === 'Draft'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold shadow-2xs'
                              : item.statusPelaksanaan === 'Selesai'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.statusPelaksanaan === 'Dalam Proses'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {item.statusPelaksanaan}
                        </span>
                      </td>

                      {/* Tanggal WFH */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800 text-xs">{formatIndonesianDateWithDay(item.tanggalWfa)}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.tanggalWfa}</div>
                      </td>

                      {/* Penilaian (Thumbs up 👍) */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {item.hasSubmitted && canEvaluate ? (
                          <button
                            onClick={() => handleTogglePenilaian(item)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 mx-auto shadow-xs ${
                              hasThumbsUp
                                ? 'bg-sky-500 text-white shadow-sky-200 hover:bg-sky-600'
                                : 'bg-slate-100 hover:bg-sky-50 text-slate-500 hover:text-sky-600 border border-slate-200'
                            }`}
                            title={hasThumbsUp ? 'Klik untuk membatalkan penilaian 👍' : 'Klik untuk memberikan penilaian 👍'}
                          >
                            <ThumbsUp size={14} className={hasThumbsUp ? 'fill-white' : ''} />
                            <span>{hasThumbsUp ? '👍 Sesuai' : 'Beri 👍'}</span>
                          </button>
                        ) : item.hasSubmitted ? (
                          <div>
                            {hasThumbsUp ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 font-bold text-[11px]">
                                👍 Disetujui
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Belum dinilai</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {item.hasSubmitted ? (
                          <div className="flex items-center justify-center gap-1">
                            {/* If Draft, show Kirim & Edit Draft action buttons */}
                            {item.statusPelaksanaan === 'Draft' ? (
                              <>
                                <button
                                  onClick={() => handlePublishDraft(item)}
                                  className="px-2.5 py-1 text-xs font-bold text-white bg-gradient-to-r from-gov-600 to-gov-700 hover:from-gov-700 hover:to-gov-800 rounded-lg shadow-2xs transition-all flex items-center gap-1"
                                  title="Kirim Laporan Resmi Sekarang"
                                >
                                  <Send size={12} />
                                  <span>Kirim</span>
                                </button>
                                {canEdit && (
                                  <button
                                    onClick={() => {
                                      setEditingLaporan(item);
                                      setIsFormOpen(true);
                                    }}
                                    className="p-1.5 text-amber-700 hover:bg-amber-100 bg-amber-50 border border-amber-200 rounded-lg transition-all"
                                    title="Lanjutkan / Edit Draft"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                )}
                                {canEdit && (
                                  <button
                                    onClick={() => handleDeleteRequest(item.id)}
                                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                    title="Hapus Draft"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </>
                            ) : (
                              /* Submitted Report Actions */
                              <>
                                <button
                                  onClick={() => setViewingLaporan(item)}
                                  className="p-1.5 text-slate-500 hover:text-gov-700 hover:bg-gov-50 rounded-lg transition-all"
                                  title="Lihat Detail Laporan"
                                >
                                  <Eye size={15} />
                                </button>
                                {canEdit && (
                                  <button
                                    onClick={() => {
                                      setEditingLaporan(item);
                                      setIsFormOpen(true);
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-gov-700 hover:bg-gov-50 rounded-lg transition-all"
                                    title="Edit Laporan"
                                  >
                                    <Edit2 size={15} />
                                  </button>
                                )}
                                {canEdit && (
                                  <button
                                    onClick={() => handleDeleteRequest(item.id)}
                                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                    title="Hapus Laporan"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <WfaFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {
          showToast('Laporan WFA berhasil disimpan', 'success');
          loadData();
        }}
        currentUser={currentUser}
        editingLaporan={editingLaporan}
      />

      {/* Admin Schedule Modal */}
      <WfaScheduleModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onSuccess={() => {
          showToast('Pengaturan jadwal WFA berhasil diperbarui', 'success');
          loadData();
        }}
        currentUser={currentUser}
      />

      {/* Styled Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="Hapus Laporan WFA"
        message="Apakah Anda yakin ingin menghapus laporan WFA ini? Data yang telah dihapus tidak dapat dikembalikan."
        type="error"
        confirmText="Ya, Hapus"
        cancelText="Batal"
      />

      {/* Export Options Modal */}
      <WfaExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        currentUser={currentUser}
        laporanList={laporanList}
        onExecuteExport={handleExecuteExport}
      />

      {/* Detail View Modal */}
      <WfaDetailModal
        isOpen={!!viewingLaporan}
        onClose={() => setViewingLaporan(null)}
        laporan={viewingLaporan}
        currentUser={currentUser}
        onEdit={(laporan) => {
          setViewingLaporan(null);
          setEditingLaporan(laporan);
          setIsFormOpen(true);
        }}
        onDelete={(id) => {
          setViewingLaporan(null);
          handleDeleteRequest(id);
        }}
        onTogglePenilaian={(laporan) => {
          handleTogglePenilaian(laporan);
        }}
      />

      {/* Toast Notification */}
      <SimpleToast
        isOpen={toastState.isOpen}
        message={toastState.message}
        type={toastState.type}
        onClose={() => setToastState((prev) => ({ ...prev, isOpen: false }))}
      />
      </div>
    </div>
  );
};
