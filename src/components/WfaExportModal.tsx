// src/components/WfaExportModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Download, Calendar, Filter, User as UserIcon, Building2, FileSpreadsheet, FileText } from 'lucide-react';
import { User, WfaLaporan } from '../../types';

interface WfaExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  laporanList: WfaLaporan[];
  onExecuteExport: (filteredData: WfaLaporan[], periodLabel: string, format: 'excel' | 'pdf') => void;
}

const getThisWeekRange = () => {
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
};

export const WfaExportModal: React.FC<WfaExportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  laporanList,
  onExecuteExport,
}) => {
  const defaultWeek = getThisWeekRange();

  const [activePreset, setActivePreset] = useState<'thisWeek' | 'thisMonth' | 'last30Days' | 'thisYear' | 'all'>('thisWeek');
  const [startDate, setStartDate] = useState<string>(defaultWeek.startDate);
  const [endDate, setEndDate] = useState<string>(defaultWeek.endDate);
  const [selectedUnit, setSelectedUnit] = useState<string>(
    currentUser.role === 'Atasan' ? currentUser.divisi || 'Semua' : 'Semua'
  );
  const [selectedUserId, setSelectedUserId] = useState<string>('Semua');

  // Extract unique units and users from laporanList or defaults
  const availableUnits = React.useMemo(() => {
    const units = new Set<string>();
    units.add('Semua');
    if (currentUser.divisi) units.add(currentUser.divisi);
    laporanList.forEach((item) => {
      if (item.unitKerja) units.add(item.unitKerja);
    });
    return Array.from(units);
  }, [laporanList, currentUser.divisi]);

  const availableUsers = React.useMemo(() => {
    const userMap = new Map<string, { id: string; name: string; unit: string }>();
    userMap.set('Semua', { id: 'Semua', name: 'Semua Pegawai', unit: 'Semua' });

    laporanList.forEach((item) => {
      if (item.userId && item.nama) {
        if (selectedUnit === 'Semua' || item.unitKerja === selectedUnit) {
          userMap.set(item.userId, { id: item.userId, name: item.nama, unit: item.unitKerja || '' });
        }
      }
    });
    return Array.from(userMap.values());
  }, [laporanList, selectedUnit]);

  useEffect(() => {
    if (isOpen) {
      const week = getThisWeekRange();
      setActivePreset('thisWeek');
      setStartDate(week.startDate);
      setEndDate(week.endDate);
      if (currentUser.role === 'Staff') {
        setSelectedUserId(currentUser.id);
        setSelectedUnit(currentUser.divisi || 'Semua');
      } else if (currentUser.role === 'Atasan') {
        setSelectedUnit(currentUser.divisi || 'Semua');
        setSelectedUserId('Semua');
      } else {
        setSelectedUnit('Semua');
        setSelectedUserId('Semua');
      }
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Preset date helpers
  const handleSetPreset = (type: 'thisWeek' | 'thisMonth' | 'last30Days' | 'thisYear' | 'all') => {
    setActivePreset(type);
    const now = new Date();
    if (type === 'thisWeek') {
      const week = getThisWeekRange();
      setStartDate(week.startDate);
      setEndDate(week.endDate);
    } else if (type === 'thisMonth') {
      setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (type === 'last30Days') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past30.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (type === 'thisYear') {
      setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (type === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const triggerExport = (format: 'excel' | 'pdf') => {
    // Filter data based on modal selections
    const exportFiltered = laporanList.filter((item) => {
      // Date range filter
      if (startDate && item.tanggalWfa < startDate) return false;
      if (endDate && item.tanggalWfa > endDate) return false;

      // Role & Scope filter
      if (currentUser.role === 'Staff') {
        if (item.userId !== currentUser.id) return false;
      } else {
        if (selectedUnit !== 'Semua' && item.unitKerja !== selectedUnit) return false;
        if (selectedUserId !== 'Semua' && item.userId !== selectedUserId) return false;
      }

      return true;
    });

    let periodLabel = 'Semua Periode';
    if (startDate && endDate) {
      periodLabel = `${startDate} s/d ${endDate}`;
    } else if (startDate) {
      periodLabel = `Mulai ${startDate}`;
    } else if (endDate) {
      periodLabel = `Sampai ${endDate}`;
    }

    onExecuteExport(exportFiltered, periodLabel, format);
    onClose();
  };

  const presetsList: { key: 'thisWeek' | 'thisMonth' | 'last30Days' | 'thisYear' | 'all'; label: string }[] = [
    { key: 'thisWeek', label: 'Minggu Ini' },
    { key: 'thisMonth', label: 'Bulan Ini' },
    { key: 'last30Days', label: '30 Hari' },
    { key: 'thisYear', label: 'Tahun Ini' },
    { key: 'all', label: 'Semua' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-gov-600 to-gov-700 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Export Laporan WFA</h3>
              <p className="text-xs text-gov-100 font-medium">Pilih rentang periode & format dokumen (Excel / PDF Landscape)</p>
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
        <div className="p-6 space-y-5">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Pilihan Cepat Periode
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {presetsList.map((p) => {
                const isActive = activePreset === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handleSetPreset(p.key)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      isActive
                        ? 'bg-gov-600 text-white border-gov-600 shadow-xs'
                        : 'bg-slate-100 hover:bg-gov-50 hover:text-gov-700 text-slate-700 border-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-gov-600" />
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 transition-all font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-gov-600" />
                Tanggal Selesai
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 transition-all font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Admin / Atasan Options: Filter Unit Kerja & Specific User */}
          {currentUser.role !== 'Staff' && (
            <div className="space-y-3.5 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Filter size={14} className="text-gov-600" />
                Target Pegawai & Unit Kerja
              </h4>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                  <Building2 size={13} className="text-slate-400" />
                  Unit Kerja
                </label>
                <select
                  value={selectedUnit}
                  onChange={(e) => {
                    setSelectedUnit(e.target.value);
                    setSelectedUserId('Semua');
                  }}
                  disabled={currentUser.role === 'Atasan'}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 transition-all font-medium text-slate-800 disabled:opacity-75"
                >
                  {availableUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit === 'Semua' ? 'Semua Unit Kerja' : unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                  <UserIcon size={13} className="text-slate-400" />
                  Pegawai Spesifik
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600 transition-all font-medium text-slate-800"
                >
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Footer Buttons with Excel and PDF Options */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={() => triggerExport('excel')}
              className="px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
            >
              <Download size={14} />
              Export Excel (.xlsx)
            </button>

            <button
              type="button"
              onClick={() => triggerExport('pdf')}
              className="px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
            >
              <FileText size={14} />
              Export PDF (Landscape)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
