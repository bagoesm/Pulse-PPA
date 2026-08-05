// src/components/WfaFormModal.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Calendar,
  FileText,
  CheckCircle,
  Link as LinkIcon,
  Send,
  Sparkles,
  ChevronDown,
  Check,
  Search,
  AlertCircle,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  Layers,
} from 'lucide-react';
import { User, WfaLaporan } from '../../types';
import { wfaService } from '../services/WfaService';
import { formatIndonesianDateWithDay, ensureHttps, getWfaDeadlineStatus } from '../utils/formatters';

interface WfaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: User;
  editingLaporan?: WfaLaporan | null;
}

interface KegiatanItem {
  id?: string;
  rencanaHasilKinerja: string;
  rencanaKinerja: string;
  outputKinerja: string;
  linkDataDukung: string;
  statusPelaksanaan: string;
}

export const WfaFormModal: React.FC<WfaFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
  editingLaporan,
}) => {
  const [allowedDates, setAllowedDates] = useState<{ date: string; keterangan?: string; isCustom?: boolean }[]>([]);
  const [loadingDates, setLoadingDates] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Live timer tick for real-time countdown
  const [nowTick, setNowTick] = useState<number>(Date.now());

  // Custom Dropdown State for Date Selector
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [dateSearchQuery, setDateSearchQuery] = useState<string>('');
  const [useCustomPicker, setUseCustomPicker] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form states
  const [tanggalWfa, setTanggalWfa] = useState<string>('');
  
  // List of Kegiatan (Multiple Activities Support)
  const [kegiatanList, setKegiatanList] = useState<KegiatanItem[]>([
    {
      rencanaHasilKinerja: '',
      rencanaKinerja: '',
      outputKinerja: '',
      linkDataDukung: '',
      statusPelaksanaan: 'Selesai',
    },
  ]);

  // Interval timer for second-by-second countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute deadline countdown status
  const deadlineInfo = useMemo(() => {
    return getWfaDeadlineStatus(tanggalWfa);
  }, [tanggalWfa, nowTick]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load allowed WFA dates when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setIsDropdownOpen(false);
      setDateSearchQuery('');
      setUseCustomPicker(false);
      loadDates();

      if (editingLaporan) {
        setTanggalWfa(editingLaporan.tanggalWfa);
        setKegiatanList([
          {
            id: editingLaporan.id,
            rencanaHasilKinerja: editingLaporan.rencanaHasilKinerja || '',
            rencanaKinerja: editingLaporan.rencanaKinerja || '',
            outputKinerja: editingLaporan.outputKinerja || '',
            linkDataDukung: editingLaporan.linkDataDukung || '',
            statusPelaksanaan: editingLaporan.statusPelaksanaan || 'Selesai',
          },
        ]);
      } else {
        // Reset form to default 1 empty activity
        setKegiatanList([
          {
            rencanaHasilKinerja: '',
            rencanaKinerja: '',
            outputKinerja: '',
            linkDataDukung: '',
            statusPelaksanaan: 'Selesai',
          },
        ]);
      }
    }
  }, [isOpen, editingLaporan]);

  const loadDates = async () => {
    try {
      setLoadingDates(true);
      const restrictToActiveWindow = currentUser.role === 'Staff' && !editingLaporan;
      const dates = await wfaService.getAllowedWfaDates(restrictToActiveWindow);

      if (editingLaporan && !dates.some((d) => d.date === editingLaporan.tanggalWfa)) {
        dates.unshift({
          date: editingLaporan.tanggalWfa,
          keterangan: 'Tanggal Laporan Ini',
        });
      }

      setAllowedDates(dates);
      if (!editingLaporan && dates.length > 0) {
        setTanggalWfa(dates[0].date);
      }
    } catch (err) {
      console.error('Failed to load allowed WFA dates', err);
    } finally {
      setLoadingDates(false);
    }
  };

  if (!isOpen) return null;

  // Filtered date list in dropdown
  const filteredDates = allowedDates.filter((d) => {
    if (!dateSearchQuery) return true;
    const formatted = formatIndonesianDateWithDay(d.date).toLowerCase();
    const q = dateSearchQuery.toLowerCase();
    return d.date.includes(q) || formatted.includes(q) || (d.keterangan && d.keterangan.toLowerCase().includes(q));
  });

  const selectedDateObj = allowedDates.find((d) => d.date === tanggalWfa);

  // Handlers for dynamic kegiatan items
  const handleAddKegiatan = () => {
    setKegiatanList((prev) => [
      ...prev,
      {
        rencanaHasilKinerja: '',
        rencanaKinerja: '',
        outputKinerja: '',
        linkDataDukung: '',
        statusPelaksanaan: 'Selesai',
      },
    ]);
  };

  const handleRemoveKegiatan = (index: number) => {
    if (kegiatanList.length <= 1) return;
    setKegiatanList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKegiatanChange = (index: number, field: keyof KegiatanItem, value: string) => {
    setKegiatanList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = async (isDraft: boolean) => {
    setErrorMessage('');

    if (!tanggalWfa) {
      setErrorMessage('Silakan pilih Tanggal WFH/WFA.');
      return;
    }

    // Check deadline for staff
    if (deadlineInfo?.isExpired && currentUser.role === 'Staff' && !editingLaporan) {
      setErrorMessage(
        `Penginputan dikunci. Batas waktu penginputan untuk tanggal ini telah berakhir pada ${deadlineInfo.formattedDeadline}.`
      );
      return;
    }

    // Validate fields for each kegiatan
    for (let i = 0; i < kegiatanList.length; i++) {
      const item = kegiatanList[i];
      const numLabel = kegiatanList.length > 1 ? ` (Kegiatan #${i + 1})` : '';

      if (!item.rencanaHasilKinerja.trim()) {
        setErrorMessage(`Silakan isi Rencana Hasil Kinerja${numLabel}.`);
        return;
      }
      if (!item.rencanaKinerja.trim()) {
        setErrorMessage(`Silakan isi Rencana Kinerja${numLabel}.`);
        return;
      }
      if (!item.outputKinerja.trim()) {
        setErrorMessage(`Silakan isi Output Kinerja${numLabel}.`);
        return;
      }
    }

    try {
      setSubmitting(true);

      if (editingLaporan) {
        // Editing single existing report entry
        const singleItem = kegiatanList[0];
        const formattedLink = ensureHttps(singleItem.linkDataDukung.trim());
        await wfaService.updateWfaLaporan(editingLaporan.id, {
          tanggalWfa,
          rencanaHasilKinerja: singleItem.rencanaHasilKinerja.trim(),
          rencanaKinerja: singleItem.rencanaKinerja.trim(),
          outputKinerja: singleItem.outputKinerja.trim(),
          linkDataDukung: formattedLink,
          statusPelaksanaan: isDraft ? 'Draft' : singleItem.statusPelaksanaan,
        });
      } else {
        // Creating new report (supports batch insertion for multiple activities)
        const batchPayload = kegiatanList.map((item) => ({
          userId: currentUser.id,
          nama: currentUser.name,
          nip: currentUser.nip || '-',
          unitKerja: currentUser.divisi || 'Biro Data dan Informasi',
          jabatan: currentUser.jabatan || 'Pegawai',
          tanggalWfa,
          rencanaHasilKinerja: item.rencanaHasilKinerja.trim(),
          rencanaKinerja: item.rencanaKinerja.trim(),
          outputKinerja: item.outputKinerja.trim(),
          linkDataDukung: ensureHttps(item.linkDataDukung.trim()),
          statusPelaksanaan: isDraft ? 'Draft' : item.statusPelaksanaan,
          penilaian: null,
          createdAt: new Date().toISOString(),
        }));

        await wfaService.createBatchWfaLaporan(batchPayload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving WFA report:', err);
      setErrorMessage(err.message || 'Gagal menyimpan laporan WFA. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-3xl w-full my-8 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-gov-800 via-gov-700 to-gov-900 text-white flex items-center justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 translate-x-4 -translate-y-4">
            <Sparkles size={120} />
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl text-amber-300 border border-white/10 shadow-inner">
              <Calendar size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {editingLaporan ? 'Edit Laporan WFA' : 'Input Laporan WFA'}
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-amber-400/20 border border-amber-300/40 text-amber-200 rounded-full tracking-wider">
                  {kegiatanList.length} Kegiatan
                </span>
              </h3>
              <p className="text-xs text-gov-100 font-medium">
                {editingLaporan ? 'Perbarui rincian laporan WFA Anda' : 'Tambah satu atau beberapa kegiatan rencana kerja WFA'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all relative z-10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2 animate-shake">
              <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Tanggal WFH / WFA Custom Elegant Selector */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar size={14} className="text-gov-600" />
              Tanggal WFH / WFA <span className="text-rose-500">*</span>
            </label>

            {useCustomPicker ? (
              <div className="space-y-2">
                <input
                  type="date"
                  value={tanggalWfa}
                  onChange={(e) => setTanggalWfa(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 transition-all font-medium text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setUseCustomPicker(false)}
                  className="text-xs text-gov-600 font-semibold hover:underline flex items-center gap-1"
                >
                  ← Kembali ke pilihan tanggal WFA yang tersedia
                </button>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  disabled={loadingDates}
                  className={`w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/80 border rounded-xl flex items-center justify-between transition-all text-left group ${
                    isDropdownOpen ? 'border-gov-600 ring-2 ring-gov-500/20 bg-white' : 'border-slate-200'
                  }`}
                >
                  {loadingDates ? (
                    <span className="text-xs text-slate-400 animate-pulse">Memuat daftar tanggal WFA...</span>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gov-600 text-white flex flex-col items-center justify-center font-bold text-xs shadow-xs">
                        <span className="text-[9px] uppercase font-medium leading-none opacity-80">
                          {tanggalWfa ? new Date(tanggalWfa).toLocaleDateString('id-ID', { month: 'short' }) : 'WFA'}
                        </span>
                        <span className="text-xs font-black">
                          {tanggalWfa ? tanggalWfa.split('-')[2] : '--'}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 group-hover:text-gov-700 transition-colors">
                          {tanggalWfa ? formatIndonesianDateWithDay(tanggalWfa) : 'Pilih Tanggal WFA'}
                        </div>
                        {selectedDateObj && (
                          <div className="text-[10px] text-slate-500 font-medium">
                            {selectedDateObj.keterangan || 'Tanggal WFA Sesuai Ketentuan'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <ChevronDown
                    size={18}
                    className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-gov-600' : ''}`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-fadeIn">
                    {/* Search bar inside dropdown */}
                    <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={dateSearchQuery}
                          onChange={(e) => setDateSearchQuery(e.target.value)}
                          placeholder="Cari tanggal (misal: 31 Juli / 2026)..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600"
                        />
                      </div>
                    </div>

                    {/* Options list */}
                    <div className="max-h-60 overflow-y-auto p-2 space-y-1 divide-y divide-slate-50">
                      {filteredDates.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400">
                          Tidak ditemukan tanggal WFA yang cocok.
                        </div>
                      ) : (
                        filteredDates.map((item) => {
                          const isSelected = item.date === tanggalWfa;
                          const parts = item.date.split('-');
                          const dayNum = parts[2];
                          const monthName = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(dayNum)).toLocaleDateString('id-ID', { month: 'short' });

                          return (
                            <button
                              key={item.date}
                              type="button"
                              onClick={() => {
                                setTanggalWfa(item.date);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full p-2.5 rounded-xl flex items-center justify-between transition-all text-left ${
                                isSelected
                                  ? 'bg-gov-50 border border-gov-200 text-gov-900 font-semibold'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center font-bold text-xs ${
                                    isSelected
                                      ? 'bg-gov-600 text-white'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  <span className="text-[9px] uppercase font-medium leading-none opacity-80">{monthName}</span>
                                  <span className="text-xs font-black">{dayNum}</span>
                                </div>

                                <div>
                                  <div className="text-xs font-bold text-slate-800">
                                    {formatIndonesianDateWithDay(item.date)}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>
                                    <span
                                      className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
                                        item.isCustom
                                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {item.keterangan || 'Jumat Regular'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {isSelected && (
                                <div className="p-1 bg-gov-600 text-white rounded-full">
                                  <Check size={12} />
                                </div>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Real-time Deadline & Countdown Banner */}
          {deadlineInfo && (
            <div
              className={`p-4 rounded-xl border transition-all ${
                deadlineInfo.isExpired
                  ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                  : 'bg-gradient-to-r from-sky-50 to-indigo-50/60 border-sky-200/80 text-sky-900 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-xl flex-shrink-0 ${
                    deadlineInfo.isExpired ? 'bg-rose-100 text-rose-600' : 'bg-sky-500 text-white shadow-xs'
                  }`}
                >
                  {deadlineInfo.isExpired ? <AlertTriangle size={18} /> : <Clock size={18} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Batas Waktu Penginputan (Tenggat Senin 09.00 WIB)
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                        deadlineInfo.isExpired
                          ? 'bg-rose-200 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300/60'
                      }`}
                    >
                      {deadlineInfo.isExpired ? 'Dikunci' : 'Terbuka'}
                    </span>
                  </div>

                  <div className="text-xs font-medium text-slate-700 mt-0.5">
                    Tenggat: <strong className="font-bold text-slate-900">{deadlineInfo.formattedDeadline}</strong>
                  </div>

                  {deadlineInfo.isExpired ? (
                    <p className="text-xs text-rose-700 font-semibold mt-1.5">
                      {currentUser.role === 'Staff'
                        ? 'Batas waktu penginputan untuk tanggal ini telah berakhir. Tombol simpan dikunci.'
                        : 'Batas waktu telah berakhir (Atasan/Admin tetap dapat melakukan tindakan).'}
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-xs font-semibold text-slate-600">Hitungan Sisa Waktu:</span>
                      <div className="flex items-center gap-1 font-mono font-bold text-xs">
                        <span className="px-2 py-0.5 bg-white border border-sky-200 rounded-md text-sky-800 shadow-2xs">
                          {deadlineInfo.days} Hari
                        </span>
                        <span>:</span>
                        <span className="px-2 py-0.5 bg-white border border-sky-200 rounded-md text-sky-800 shadow-2xs">
                          {String(deadlineInfo.hours).padStart(2, '0')} Jam
                        </span>
                        <span>:</span>
                        <span className="px-2 py-0.5 bg-white border border-sky-200 rounded-md text-sky-800 shadow-2xs">
                          {String(deadlineInfo.minutes).padStart(2, '0')} Mnt
                        </span>
                        <span>:</span>
                        <span className="px-2 py-0.5 bg-white border border-sky-200 rounded-md text-indigo-700 shadow-2xs animate-pulse">
                          {String(deadlineInfo.seconds).padStart(2, '0')} Det
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Kegiatan List Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Layers size={16} className="text-gov-600" />
                Rincian Kegiatan WFA ({kegiatanList.length})
              </h4>
              {!editingLaporan && (
                <button
                  type="button"
                  onClick={handleAddKegiatan}
                  className="px-3 py-1.5 text-xs font-bold text-gov-700 bg-gov-50 hover:bg-gov-100 border border-gov-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus size={14} />
                  Tambah Kegiatan Lain
                </button>
              )}
            </div>

            {kegiatanList.map((kegiatan, index) => (
              <div
                key={index}
                className="p-5 bg-slate-50/60 border border-slate-200/80 rounded-2xl space-y-4 relative transition-all hover:border-slate-300"
              >
                {/* Kegiatan Header */}
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-gov-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                      {index + 1}
                    </span>
                    <span className="text-xs font-extrabold text-slate-800">
                      Kegiatan {kegiatanList.length > 1 ? `#${index + 1}` : ''}
                    </span>
                  </div>

                  {kegiatanList.length > 1 && !editingLaporan && (
                    <button
                      type="button"
                      onClick={() => handleRemoveKegiatan(index)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all flex items-center gap-1 text-xs font-semibold"
                      title="Hapus kegiatan ini"
                    >
                      <Trash2 size={14} />
                      <span className="hidden sm:inline">Hapus</span>
                    </button>
                  )}
                </div>

                {/* Rencana Hasil Kinerja */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-gov-600" />
                    Rencana Hasil Kinerja <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={kegiatan.rencanaHasilKinerja}
                    onChange={(e) => handleKegiatanChange(index, 'rencanaHasilKinerja', e.target.value)}
                    placeholder="Contoh: Tersusunnya draft standar operasional prosedur penanganan data..."
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 transition-all text-slate-800"
                  />
                </div>

                {/* Rencana Kinerja */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileText size={14} className="text-gov-600" />
                    Rencana Kinerja (Detail Kegiatan) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={kegiatan.rencanaKinerja}
                    onChange={(e) => handleKegiatanChange(index, 'rencanaKinerja', e.target.value)}
                    placeholder="Contoh: Mengolah dan melakukan verifikasi data laporan bulanan unit kerja..."
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 transition-all text-slate-800"
                  />
                </div>

                {/* Output Kinerja */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-gov-600" />
                    Output Kinerja <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={kegiatan.outputKinerja}
                    onChange={(e) => handleKegiatanChange(index, 'outputKinerja', e.target.value)}
                    placeholder="Contoh: 1 Dokumen Ringkasan Laporan Verifikasi Data (100% selesai)..."
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 transition-all text-slate-800"
                  />
                </div>

                {/* Link Data Dukung & Status Pelaksanaan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <LinkIcon size={14} className="text-gov-600" />
                      Link Data Dukung
                    </label>
                    <input
                      type="text"
                      value={kegiatan.linkDataDukung}
                      onChange={(e) => handleKegiatanChange(index, 'linkDataDukung', e.target.value)}
                      placeholder="drive.google.com/..."
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 transition-all text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Status Pelaksanaan <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={kegiatan.statusPelaksanaan}
                      onChange={(e) => handleKegiatanChange(index, 'statusPelaksanaan', e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 transition-all font-medium text-slate-800"
                    >
                      <option value="Selesai">Selesai</option>
                      <option value="Dalam Proses">Dalam Proses</option>
                      <option value="Belum Selesai">Belum Selesai</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}

            {!editingLaporan && kegiatanList.length > 1 && (
              <button
                type="button"
                onClick={handleAddKegiatan}
                className="w-full py-3 text-xs font-bold text-gov-700 bg-gov-50 hover:bg-gov-100 border border-dashed border-gov-300 rounded-xl transition-all flex items-center justify-center gap-2 shadow-2xs"
              >
                <Plus size={16} />
                Tambah Kegiatan Lainnya (Total: {kegiatanList.length})
              </button>
            )}
          </div>

          {/* Footer Actions: Draft vs Submit */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              Batal
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Save as Draft Button */}
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={submitting || (deadlineInfo?.isExpired && currentUser.role === 'Staff' && !editingLaporan)}
                className="px-4 py-2.5 text-sm font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                <span>Simpan Draft</span>
              </button>

              {/* Submit Final Button */}
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={submitting || (deadlineInfo?.isExpired && currentUser.role === 'Staff' && !editingLaporan)}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-gov-600 to-gov-700 hover:from-gov-700 hover:to-gov-800 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
                <span>{submitting ? 'Menyimpan...' : editingLaporan ? 'Simpan Perubahan' : 'Kirim Laporan WFA'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
