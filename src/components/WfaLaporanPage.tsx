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
} from 'lucide-react';
import { User, WfaLaporan } from '../../types';
import { wfaService } from '../services/WfaService';
import { WfaFormModal } from './WfaFormModal';
import { WfaScheduleModal } from './WfaScheduleModal';
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
    if (showNotification) {
      showNotification('Laporan WFA', message, type);
    }
  };

  const [laporanList, setLaporanList] = useState<WfaLaporan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>(
    currentUser.role === 'Atasan' ? currentUser.divisi || 'Semua' : 'Semua'
  );
  const [statusFilter, setStatusFilter] = useState<string>('Semua');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState<boolean>(false);
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
      const data = await wfaService.getWfaLaporan(
        currentUser,
        startDate || undefined,
        endDate || undefined,
        selectedUnit !== 'Semua' ? selectedUnit : undefined
      );
      setLaporanList(data);
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

  // Filtered List
  const filteredList = useMemo(() => {
    return laporanList.filter((item) => {
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
  }, [laporanList, searchQuery, statusFilter]);

  // Quick stats computation
  const stats = useMemo(() => {
    const total = filteredList.length;
    const selesai = filteredList.filter((i) => i.statusPelaksanaan === 'Selesai').length;
    const dalamProses = filteredList.filter((i) => i.statusPelaksanaan === 'Dalam Proses').length;
    const disetujui = filteredList.filter((i) => !!i.penilaian && i.penilaian.includes('👍')).length;

    return { total, selesai, dalamProses, disetujui };
  }, [filteredList]);

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

  // Export to Excel (.xlsx)
  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');

      const exportRows = filteredList.map((item, index) => ({
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
        'PENILAIAN': item.penilaian || 'Belum dinilai',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);

      // Auto width formatting for columns
      const columnWidths = [
        { wch: 6 }, // NO.
        { wch: 25 }, // NAMA
        { wch: 20 }, // NIP
        { wch: 30 }, // UNIT KERJA
        { wch: 35 }, // RENCANA HASIL KINERJA
        { wch: 35 }, // RENCANA KINERJA
        { wch: 35 }, // OUTPUT KINERJA
        { wch: 35 }, // LINK DATA DUKUNG
        { wch: 20 }, // STATUS PELAKSANAAN
        { wch: 15 }, // TANGGAL WFH
        { wch: 18 }, // PENILAIAN
      ];
      worksheet['!cols'] = columnWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan WFA');

      const dateSuffix = new Date().toISOString().slice(0, 10);
      const filename = `Laporan_WFA_${currentUser.divisi ? currentUser.divisi.replace(/\s+/g, '_') : 'PPPA'}_${dateSuffix}.xlsx`;

      XLSX.writeFile(workbook, filename);
      showToast(`File ${filename} berhasil diunduh.`, 'success');
    } catch (err) {
      console.error('Export Excel failed:', err);
      showToast('Terjadi kesalahan saat meng-export data ke Excel.', 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 pb-16 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-gov-700 via-gov-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-gov-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-white/10 text-gov-200 border border-white/20 rounded-full backdrop-blur-md">
                Informasi Lainnya
              </span>
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                Role: {currentUser.role}
              </span>
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
              onClick={handleExportExcel}
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
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-gov-50 rounded-xl text-gov-600">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Total Laporan</span>
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
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-0 text-xs p-1 focus:ring-0 text-slate-700 font-medium"
                title="Tanggal Mulai"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-0 text-xs p-1 focus:ring-0 text-slate-700 font-medium"
                title="Tanggal Selesai"
              />
            </div>

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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">NO.</th>
                  <th className="py-3.5 px-4 min-w-[180px]">NAMA</th>
                  <th className="py-3.5 px-4 min-w-[160px]">UNIT KERJA</th>
                  <th className="py-3.5 px-4 min-w-[200px]">RENCANA HASIL KINERJA</th>
                  <th className="py-3.5 px-4 min-w-[200px]">RENCANA KINERJA</th>
                  <th className="py-3.5 px-4 min-w-[180px]">OUTPUT KINERJA</th>
                  <th className="py-3.5 px-4 min-w-[140px]">DATA DUKUNG</th>
                  <th className="py-3.5 px-4 min-w-[120px]">STATUS</th>
                  <th className="py-3.5 px-4 min-w-[120px]">TANGGAL WFH</th>
                  <th className="py-3.5 px-4 min-w-[120px] text-center">PENILAIAN</th>
                  <th className="py-3.5 px-4 w-20 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredList.map((item, index) => {
                  const isOwner = item.userId === currentUser.id;
                  const canEdit = isOwner || currentUser.role === 'Super Admin';
                  const canEvaluate = currentUser.role === 'Atasan' || currentUser.role === 'Super Admin';
                  const hasThumbsUp = item.penilaian && item.penilaian.includes('👍');

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">{index + 1}</td>

                      {/* Nama */}
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {item.nama}
                      </td>

                      {/* Unit Kerja */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{item.unitKerja || '-'}</td>

                      {/* Rencana Hasil Kinerja */}
                      <td className="py-3.5 px-4 text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {item.rencanaHasilKinerja}
                      </td>

                      {/* Rencana Kinerja */}
                      <td className="py-3.5 px-4 text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {item.rencanaKinerja}
                      </td>

                      {/* Output Kinerja */}
                      <td className="py-3.5 px-4 text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {item.outputKinerja}
                      </td>

                      {/* Link Data Dukung */}
                      <td className="py-3.5 px-4">
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
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 text-[11px] font-bold rounded-full ${
                            item.statusPelaksanaan === 'Selesai'
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
                      <td className="py-3.5 px-4 text-center">
                        {canEvaluate ? (
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
                        ) : (
                          <div>
                            {hasThumbsUp ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 font-bold text-[11px]">
                                👍 Disetujui
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Belum dinilai</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        {canEdit ? (
                          <div className="flex items-center justify-center gap-1">
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
                            <button
                              onClick={() => handleDeleteRequest(item.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="Hapus Laporan"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[11px]">-</span>
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

      {/* Toast Notification */}
      <SimpleToast
        isOpen={toastState.isOpen}
        message={toastState.message}
        type={toastState.type}
        onClose={() => setToastState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
