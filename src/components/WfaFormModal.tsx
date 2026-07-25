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
  const [rencanaHasilKinerja, setRencanaHasilKinerja] = useState<string>('');
  const [rencanaKinerja, setRencanaKinerja] = useState<string>('');
  const [outputKinerja, setOutputKinerja] = useState<string>('');
  const [linkDataDukung, setLinkDataDukung] = useState<string>('');
  const [statusPelaksanaan, setStatusPelaksanaan] = useState<string>('Selesai');

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
        setRencanaHasilKinerja(editingLaporan.rencanaHasilKinerja);
        setRencanaKinerja(editingLaporan.rencanaKinerja);
        setOutputKinerja(editingLaporan.outputKinerja);
        setLinkDataDukung(editingLaporan.linkDataDukung || '');
        setStatusPelaksanaan(editingLaporan.statusPelaksanaan || 'Selesai');
      } else {
        // Reset form
        setRencanaHasilKinerja('');
        setRencanaKinerja('');
        setOutputKinerja('');
        setLinkDataDukung('');
        setStatusPelaksanaan('Selesai');
      }
    }
  }, [isOpen, editingLaporan]);

  const loadDates = async () => {
    try {
      setLoadingDates(true);
      // For Staff creating new report, restrict ONLY to active WFA date for current week schedule
      const restrictToActiveWindow = currentUser.role === 'Staff' && !editingLaporan;
      const dates = await wfaService.getAllowedWfaDates(restrictToActiveWindow);

      // If editing an existing report and its date isn't in active dates, include it
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    if (!rencanaHasilKinerja.trim()) {
      setErrorMessage('Silakan isi Rencana Hasil Kinerja.');
      return;
    }
    if (!rencanaKinerja.trim()) {
      setErrorMessage('Silakan isi Rencana Kinerja.');
      return;
    }
    if (!outputKinerja.trim()) {
      setErrorMessage('Silakan isi Output Kinerja.');
      return;
    }

    try {
      setSubmitting(true);
      const formattedLink = ensureHttps(linkDataDukung.trim());
      if (editingLaporan) {
        await wfaService.updateWfaLaporan(editingLaporan.id, {
          tanggalWfa,
          rencanaHasilKinerja: rencanaHasilKinerja.trim(),
          rencanaKinerja: rencanaKinerja.trim(),
          outputKinerja: outputKinerja.trim(),
          linkDataDukung: formattedLink,
          statusPelaksanaan,
        });
      } else {
        await wfaService.createWfaLaporan({
          userId: currentUser.id,
          nama: currentUser.name,
          nip: currentUser.nip || '-',
          unitKerja: currentUser.divisi || 'Biro Data dan Informasi',
          jabatan: currentUser.jabatan || 'Pegawai',
          tanggalWfa,
          rencanaHasilKinerja: rencanaHasilKinerja.trim(),
          rencanaKinerja: rencanaKinerja.trim(),
          outputKinerja: outputKinerja.trim(),
          linkDataDukung: formattedLink,
          statusPelaksanaan,
          penilaian: null,
          createdAt: new Date().toISOString(),
        });
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full my-8 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-gov-600 to-gov-700 text-white flex justify-between items-center relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {editingLaporan ? 'Edit Laporan WFA' : 'Input Laporan WFA'}
              </h3>
              <p className="text-xs text-gov-100 font-medium">
                {editingLaporan ? 'Perbarui rincian laporan WFA Anda' : 'Isi formulir laporan kerja WFA pegawai'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span><strong className="font-semibold">Perhatian:</strong> {errorMessage}</span>
            </div>
          )}

          {/* User Meta Info Badge */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-600">
            <div>
              <span className="text-slate-400 block font-medium">Nama Pegawai</span>
              <span className="font-semibold text-slate-800">{currentUser.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">NIP</span>
              <span className="font-semibold text-slate-800">{currentUser.nip || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Unit Kerja</span>
              <span className="font-semibold text-gov-700">{currentUser.divisi || 'Biro Data dan Informasi'}</span>
            </div>
          </div>

          {/* Tanggal WFH / WFA Custom Elegant Selector */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-gov-600" />
                Tanggal WFH / WFA <span className="text-rose-500">*</span>
              </span>
              {(currentUser.role === 'Super Admin' || editingLaporan) && (
                <button
                  type="button"
                  onClick={() => setUseCustomPicker(!useCustomPicker)}
                  className="text-[11px] text-gov-700 hover:text-gov-800 font-semibold underline"
                >
                  {useCustomPicker ? 'Pilih dari Jadwal Resmi' : 'Input Tanggal Lain'}
                </button>
              )}
            </label>

            {loadingDates ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 animate-pulse">
                Memuat daftar tanggal WFA...
              </div>
            ) : useCustomPicker ? (
              <input
                type="date"
                value={tanggalWfa}
                onChange={(e) => setTanggalWfa(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-white border-2 border-gov-500/40 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 transition-all font-semibold text-slate-800 shadow-sm"
              />
            ) : (
              <div>
                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full p-3.5 bg-gradient-to-r from-slate-50 to-gov-50/30 border border-slate-200 hover:border-gov-400 rounded-xl transition-all flex items-center justify-between shadow-xs group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gov-600 text-white flex flex-col items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform">
                      <span className="text-[10px] uppercase font-medium leading-none opacity-80">
                        {tanggalWfa ? new Date(tanggalWfa).toLocaleDateString('id-ID', { month: 'short' }) : 'WFA'}
                      </span>
                      <span className="text-sm font-black leading-tight">
                        {tanggalWfa ? tanggalWfa.split('-')[2] : '--'}
                      </span>
                    </div>

                    <div>
                      <div className="font-bold text-slate-800 text-sm">
                        {tanggalWfa ? formatIndonesianDateWithDay(tanggalWfa) : 'Pilih Tanggal WFA'}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500 font-mono">{tanggalWfa}</span>
                        {selectedDateObj && (
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                              selectedDateObj.isCustom
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gov-100 text-gov-800'
                            }`}
                          >
                            {selectedDateObj.keterangan || 'Jumat Regular'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-2 text-slate-400 group-hover:text-gov-600 rounded-lg transition-all">
                    <ChevronDown size={18} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Dropdown Popover */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn max-h-80 flex flex-col">
                    {/* Search inside dropdown */}
                    <div className="p-3 bg-slate-50 border-b border-slate-100">
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
                    <div className="overflow-y-auto p-2 space-y-1 divide-y divide-slate-50">
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

          {/* Rencana Hasil Kinerja */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles size={14} className="text-gov-600" />
              Rencana Hasil Kinerja <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={rencanaHasilKinerja}
              onChange={(e) => setRencanaHasilKinerja(e.target.value)}
              placeholder="Contoh: Tersusunnya draft standar operasional prosedur penanganan data..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 transition-all text-slate-800"
            />
          </div>

          {/* Rencana Kinerja */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText size={14} className="text-gov-600" />
              Rencana Kinerja <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={rencanaKinerja}
              onChange={(e) => setRencanaKinerja(e.target.value)}
              placeholder="Contoh: Mengolah dan melakukan verifikasi data laporan bulanan unit kerja..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 transition-all text-slate-800"
            />
          </div>

          {/* Output Kinerja */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle size={14} className="text-gov-600" />
              Output Kinerja <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={outputKinerja}
              onChange={(e) => setOutputKinerja(e.target.value)}
              placeholder="Contoh: 1 Dokumen Ringkasan Laporan Verifikasi Data (100% selesai)..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 transition-all text-slate-800"
            />
          </div>

          {/* Link Data Dukung & Status Pelaksanaan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <LinkIcon size={14} className="text-gov-600" />
                Link Data Dukung
              </label>
              <input
                type="url"
                value={linkDataDukung}
                onChange={(e) => setLinkDataDukung(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 transition-all text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Status Pelaksanaan <span className="text-rose-500">*</span>
              </label>
              <select
                value={statusPelaksanaan}
                onChange={(e) => setStatusPelaksanaan(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 transition-all font-medium text-slate-800"
              >
                <option value="Selesai">Selesai</option>
                <option value="Dalam Proses">Dalam Proses</option>
                <option value="Belum Selesai">Belum Selesai</option>
              </select>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || (deadlineInfo?.isExpired && currentUser.role === 'Staff' && !editingLaporan)}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-gov-600 to-gov-700 hover:from-gov-700 hover:to-gov-800 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
              {submitting ? 'Menyimpan...' : editingLaporan ? 'Simpan Perubahan' : 'Kirim Laporan WFA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
