import React, { useState, useMemo, useEffect } from 'react';
import {
  CapaianRO,
  StatusCapaian,
  KomponenRO
} from '../../types/monitoringCapaian';
import { getSatkerOrderIndex } from '../../services/MonitoringCapaianService';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Edit,
  Trash2,
  ArrowUpDown,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Layers,
  Plus,
  ExternalLink
} from 'lucide-react';

interface MonitoringRoViewProps {
  ros: CapaianRO[];
  onEditRO: (ro: CapaianRO) => void;
  onEditJadwal: (ro: CapaianRO) => void;
  onDeleteRO: (roId: string) => void;
  onAddKomponen: (ro: CapaianRO) => void;
  onEditKomponen: (ro: CapaianRO, item: KomponenRO, index: number) => void;
  onDeleteKomponen: (ro: CapaianRO, index: number) => void;
  initialUnitFilter?: string;
  initialStatusFilter?: 'ALL' | StatusCapaian;
  initialSatkerFilter?: string;
  readOnly?: boolean;
}

export const MonitoringRoView: React.FC<MonitoringRoViewProps> = ({
  ros,
  onEditRO,
  onEditJadwal,
  onDeleteRO,
  onAddKomponen,
  onEditKomponen,
  onDeleteKomponen,
  initialUnitFilter,
  initialStatusFilter,
  initialSatkerFilter,
  readOnly = false
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StatusCapaian>(initialStatusFilter || 'ALL');
  const [satkerFilter, setSatkerFilter] = useState<string>(initialSatkerFilter || 'All');
  const [unitFilter, setUnitFilter] = useState<string>(initialUnitFilter || 'All');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Sync with initial filters when navigating from dashboard or hierarchy tab
  useEffect(() => {
    if (initialUnitFilter !== undefined) {
      setUnitFilter(initialUnitFilter);
      if (initialUnitFilter !== 'All') {
        setSatkerFilter('All');
        setSearchTerm('');
      }
    }
    if (initialStatusFilter !== undefined) {
      setStatusFilter(initialStatusFilter);
    }
    if (initialSatkerFilter !== undefined) {
      setSatkerFilter(initialSatkerFilter);
    }
    setCurrentPage(1);
  }, [initialUnitFilter, initialStatusFilter, initialSatkerFilter]);

  // Sorting
  const [sortField, setSortField] = useState<'kodeRo' | 'pagu' | 'realisasi' | 'persentase'>('persentase');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Distinct Satker & Unit lists for dropdowns, sorted in official ministry order
  const satkerOptions = useMemo(() => {
    return Array.from(new Set(ros.map(r => r.satkerNama)))
      .filter(Boolean)
      .sort((a, b) => {
        const idxA = getSatkerOrderIndex(a);
        const idxB = getSatkerOrderIndex(b);
        if (idxA !== idxB) return idxA - idxB;
        return a.localeCompare(b);
      });
  }, [ros]);

  const unitOptions = useMemo(() => {
    let filtered = ros;
    if (satkerFilter !== 'All') {
      filtered = filtered.filter(r => r.satkerNama === satkerFilter);
    }
    return Array.from(new Set(filtered.map(r => r.unitKerjaNama))).filter(Boolean);
  }, [ros, satkerFilter]);

  // Base list filtered by contextual filters (Satker, Unit Kerja, and Search Term)
  // Used for computing dynamic status counts so the chips update whenever user filters by Satker/Unit/Search
  const baseFilteredROs = useMemo(() => {
    return ros.filter(r => {
      const matchSearch =
        !searchTerm.trim() ||
        r.kodeRo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.namaRo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.unitKerjaNama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.satkerNama.toLowerCase().includes(searchTerm.toLowerCase());

      const matchSatker = satkerFilter === 'All' || r.satkerNama === satkerFilter;
      const matchUnit = unitFilter === 'All' || r.unitKerjaNama === unitFilter;

      return matchSearch && matchSatker && matchUnit;
    });
  }, [ros, searchTerm, satkerFilter, unitFilter]);

  // Counts for status chips (now dynamically adjusts to selected Satker, Unit Kerja, and Search query!)
  const counts = useMemo(() => {
    let sesuai = 0;
    let perhatian = 0;
    let intervensi = 0;
    baseFilteredROs.forEach(r => {
      if (r.status === 'Sesuai Target') sesuai++;
      else if (r.status === 'Perlu Perhatian') perhatian++;
      else intervensi++;
    });
    return {
      all: baseFilteredROs.length,
      sesuai,
      perhatian,
      intervensi
    };
  }, [baseFilteredROs]);

  const filteredData = useMemo(() => {
    let result = baseFilteredROs.filter(r => {
      return statusFilter === 'ALL' || r.status === statusFilter;
    });

    result.sort((a, b) => {
      let diff = 0;
      if (sortField === 'kodeRo') {
        diff = a.kodeRo.localeCompare(b.kodeRo);
      } else {
        diff = Number(a[sortField] || 0) - Number(b[sortField] || 0);
      }
      return sortOrder === 'desc' ? -diff : diff;
    });

    return result;
  }, [baseFilteredROs, statusFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const hasAnyKomponen = useMemo(() => {
    return paginatedData.some(r => r.komponen && r.komponen.length > 0);
  }, [paginatedData]);

  const allExpanded = useMemo(() => {
    const withKomp = paginatedData.filter(r => r.komponen && r.komponen.length > 0);
    return withKomp.length > 0 && withKomp.every(r => expandedRows[r.id]);
  }, [paginatedData, expandedRows]);

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedRows({});
    } else {
      const next: Record<string, boolean> = { ...expandedRows };
      paginatedData.forEach(r => {
        if (r.komponen && r.komponen.length > 0) {
          next[r.id] = true;
        }
      });
      setExpandedRows(next);
    }
  };

  const getStatusBadge = (status: StatusCapaian, pct: number) => {
    if (status === 'Sesuai Target') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={13} className="text-emerald-500" />
          <span>Sesuai Target ({pct}%)</span>
        </span>
      );
    }
    if (status === 'Perlu Perhatian') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle size={13} className="text-amber-500" />
          <span>Perlu Perhatian ({pct}%)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <AlertCircle size={13} className="text-rose-500" />
        <span>Perlu Intervensi ({pct}%)</span>
      </span>
    );
  };

  const handleSort = (field: 'kodeRo' | 'pagu' | 'realisasi' | 'persentase') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* 1. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode RO, uraian output, unit kerja..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={satkerFilter}
            onChange={(e) => { setSatkerFilter(e.target.value); setUnitFilter('All'); setCurrentPage(1); }}
            className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-gov-500 max-w-[220px] truncate"
          >
            <option value="All">Kementerian PPPA (semua Satker)</option>
            {satkerOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {hasAnyKomponen && (
            <button
              type="button"
              onClick={toggleExpandAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shadow-2xs"
            >
              <Layers size={13} className="text-blue-600" />
              <span>{allExpanded ? 'Tutup Semua Rincian' : 'Buka Semua Rincian Belanja'}</span>
            </button>
          )}

          <select
            value={unitFilter}
            onChange={(e) => { setUnitFilter(e.target.value); setCurrentPage(1); }}
            className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-gov-500 max-w-[200px] truncate"
          >
            <option value="All">Semua Unit Kerja</option>
            {unitOptions.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>

          {(searchTerm || statusFilter !== 'ALL' || satkerFilter !== 'All' || unitFilter !== 'All') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setSatkerFilter('All');
                setUnitFilter('All');
                setCurrentPage(1);
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* 2. Quick Status Filter Tabs (Traffic Lights) - Positioned BELOW filter bar & dynamically synced */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* ALL */}
        <button
          type="button"
          onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/20'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-wider font-bold opacity-80">Semua RO</span>
            <span className={`w-2 h-2 rounded-full ${statusFilter === 'ALL' ? 'bg-blue-400' : 'bg-slate-400'}`} />
          </div>
          <span className="text-2xl font-black font-mono tabular-nums">{counts.all}</span>
        </button>

        {/* HIJAU (>= 90%) */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter(prev => prev === 'Sesuai Target' ? 'ALL' : 'Sesuai Target');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'Sesuai Target'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-600/30'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100/70 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-wider font-bold">
              Sesuai Target (≥90%)
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${statusFilter === 'Sesuai Target' ? 'bg-white shadow-2xs' : 'bg-emerald-500'}`} />
          </div>
          <span className="text-2xl font-black font-mono tabular-nums">{counts.sesuai}</span>
        </button>

        {/* KUNING (> 75% & < 90%) */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter(prev => prev === 'Perlu Perhatian' ? 'ALL' : 'Perlu Perhatian');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'Perlu Perhatian'
              ? 'bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-500/30'
              : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/70 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-wider font-bold">
              Perlu Perhatian (75-90%)
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${statusFilter === 'Perlu Perhatian' ? 'bg-white shadow-2xs' : 'bg-amber-500'}`} />
          </div>
          <span className="text-2xl font-black font-mono tabular-nums">{counts.perhatian}</span>
        </button>

        {/* MERAH (<= 75%) */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter(prev => prev === 'Perlu Intervensi' ? 'ALL' : 'Perlu Intervensi');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'Perlu Intervensi'
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-600/30'
              : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100/70 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-wider font-bold">
              Perlu Intervensi (≤75%)
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${statusFilter === 'Perlu Intervensi' ? 'bg-white shadow-2xs' : 'bg-rose-500'}`} />
          </div>
          <span className="text-2xl font-black font-mono tabular-nums">{counts.intervensi}</span>
        </button>
      </div>

      {/* RO Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th
                  onClick={() => handleSort('kodeRo')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors w-32"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Kode RO</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 min-w-[240px]">Uraian Rincian Output & Unit</th>
                <th
                  onClick={() => handleSort('pagu')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Pagu (Rp)</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('realisasi')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Realisasi (Rp)</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Sisa (Rp)</th>
                <th
                  onClick={() => handleSort('persentase')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors w-36"
                >
                  <div className="flex items-center gap-1.5">
                    <span>% Capaian</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">Status</th>
                {!readOnly && <th className="py-3.5 px-4 text-center w-28">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={readOnly ? 7 : 8} className="py-12 text-center text-slate-400 text-sm">
                    Tidak ditemukan data Rincian Output yang sesuai filter.
                  </td>
                </tr>
              ) : (
                paginatedData.map((ro) => {
                  const hasKomponen = ro.komponen && ro.komponen.length > 0;
                  const isExpanded = !!expandedRows[ro.id];

                  const rowHoverClass =
                    ro.status === 'Sesuai Target'
                      ? 'hover:bg-emerald-50/30'
                      : ro.status === 'Perlu Perhatian'
                      ? 'hover:bg-amber-50/30'
                      : 'hover:bg-rose-50/30';

                  const progressGradient =
                    ro.status === 'Sesuai Target'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      : ro.status === 'Perlu Perhatian'
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                      : 'bg-gradient-to-r from-rose-500 to-red-600';

                  return (
                    <React.Fragment key={ro.id}>
                      <tr className={`${rowHoverClass} transition-colors border-b border-slate-100 ${isExpanded ? 'bg-blue-50/20' : ''}`}>
                        <td className="py-3 px-4 font-mono font-bold text-xs text-slate-800 whitespace-nowrap">
                          <span className="inline-block bg-blue-50 text-blue-800 border border-blue-200/90 font-mono font-bold px-2 py-0.5 rounded-md shadow-2xs">
                            {ro.kodeRo}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 text-sm line-clamp-2">
                            {ro.namaRo}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">{ro.unitKerjaNama}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500 text-[11px]">{ro.satkerNama}</span>
                          </div>
                          {ro.keterangan && (
                            <div className="text-[11px] text-amber-800 bg-amber-50/80 p-1 rounded border border-amber-200/60 line-clamp-1 mt-1">
                              Ket: {ro.keterangan}
                            </div>
                          )}

                          {/* Expand button */}
                          {(!readOnly || hasKomponen) && (
                            <div className="mt-2">
                              <button
                                type="button"
                                onClick={() => toggleExpand(ro.id)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200/80 transition-colors shadow-2xs group"
                              >
                                {isExpanded ? <ChevronDown size={13} className="text-blue-600" /> : <ChevronRight size={13} className="text-blue-600 group-hover:translate-x-0.5 transition-transform" />}
                                <span>{isExpanded ? 'Tutup Rincian' : hasKomponen ? `Buka ${ro.komponen!.length} Rincian Belanja / Komponen` : '+ Tambah Rincian Komponen'}</span>
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-700 whitespace-nowrap">
                          {formatRupiah(ro.pagu)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700 whitespace-nowrap">
                          <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200/60">
                            {formatRupiah(ro.realisasi)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-600 whitespace-nowrap">
                          {formatRupiah(ro.sisa)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold font-mono tabular-nums">
                              <span className="text-slate-900">{ro.persentase}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                              <div
                                className={`h-full ${progressGradient} transition-all duration-500`}
                                style={{ width: `${Math.min(100, Math.max(0, ro.persentase))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {getStatusBadge(ro.status, ro.persentase)}
                        </td>
                        {!readOnly && (
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => onEditJadwal(ro)}
                                className="p-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg shadow-2xs transition-colors"
                                title="Atur Rencana / Jadwal AJK"
                              >
                                <Calendar size={15} />
                              </button>
                              <button
                                onClick={() => onEditRO(ro)}
                                className="p-1.5 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg shadow-2xs transition-colors"
                                title="Edit Data Pagu/Realisasi"
                              >
                                <Edit size={15} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Hapus RO "${ro.kodeRo} - ${ro.namaRo}"?`)) {
                                    onDeleteRO(ro.id);
                                  }
                                }}
                                className="p-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-lg shadow-2xs transition-colors"
                                title="Hapus RO"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>

                      {/* Expandable Sub-Components Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200/90">
                          <td colSpan={readOnly ? 7 : 8} className="p-3 sm:p-4 pl-8 sm:pl-12">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                              <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                  Rincian Komponen / Sub-Kegiatan Belanja ({ro.komponen?.length || 0} item)
                                </span>
                                <div className="flex items-center gap-3">
                                  {!readOnly && (
                                    <button
                                      type="button"
                                      onClick={() => onAddKomponen(ro)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs"
                                    >
                                      <Plus size={12} />
                                      <span>Tambah Komponen</span>
                                    </button>
                                  )}
                                  <span className="font-mono text-[11px] text-slate-500 font-normal">
                                    RO: {ro.kodeRo} • {ro.unitKerjaNama}
                                  </span>
                                </div>
                              </div>
                              <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/70 uppercase text-[10px] tracking-wider">
                                  <tr>
                                    <th className="py-2.5 px-3 w-8 text-center">No</th>
                                    <th className="py-2.5 px-3">Uraian Komponen / Sub-Kegiatan</th>
                                    <th className="py-2.5 px-3 text-right w-32">Pagu (Rp)</th>
                                    <th className="py-2.5 px-3 text-right w-32">Realisasi (Rp)</th>
                                    <th className="py-2.5 px-3 text-right w-32">Sisa Anggaran (Rp)</th>
                                    <th className="py-2.5 px-3 min-w-[220px]">Rencana Penarikan Jadwal Mingguan</th>
                                    <th className="py-2.5 px-3">Keterangan</th>
                                    {!readOnly && <th className="py-2.5 px-3 text-center w-20">Aksi</th>}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {(!ro.komponen || ro.komponen.length === 0) ? (
                                    <tr>
                                      <td colSpan={readOnly ? 7 : 8} className="py-6 text-center text-slate-400 text-xs">
                                        {readOnly
                                          ? 'Belum ada rincian belanja operasional untuk RO ini.'
                                          : <>Belum ada rincian belanja operasional untuk RO ini. Silakan klik tombol <strong>Tambah Komponen</strong> di atas.</>}
                                      </td>
                                    </tr>
                                  ) : (
                                    ro.komponen.map((k, kIdx) => {
                                      const activeJadwalEntries = Object.entries(k.jadwal || {}).filter(([, val]) => Number(val) > 0);
                                      const formatWeekKey = (key: string) => {
                                        const map: Record<string, string> = {
                                          okt2: 'Okt Mg 2', okt3: 'Okt Mg 3', okt4: 'Okt Mg 4',
                                          nov1: 'Nov Mg 1', nov2: 'Nov Mg 2', nov3: 'Nov Mg 3', nov4: 'Nov Mg 4',
                                          des1: 'Des Mg 1', des2: 'Des Mg 2', des3: 'Des Mg 3', des4: 'Des Mg 4'
                                        };
                                        return map[key] || key.toUpperCase();
                                      };
                                      return (
                                        <tr key={kIdx} className="hover:bg-blue-50/20 transition-colors">
                                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{kIdx + 1}</td>
                                          <td className="py-2.5 px-3 font-semibold text-slate-800">{k.nama}</td>
                                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                                            {k.pagu ? formatRupiah(k.pagu) : '-'}
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-mono text-emerald-700 tabular-nums">
                                            {k.realisasi !== undefined ? formatRupiah(k.realisasi) : '-'}
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                                            {k.sisa !== undefined ? formatRupiah(k.sisa) : '-'}
                                          </td>
                                          <td className="py-2.5 px-3">
                                            {activeJadwalEntries.length > 0 ? (
                                              <div className="flex flex-wrap gap-1">
                                                {activeJadwalEntries.map(([minggu, val]) => (
                                                  <span key={minggu} className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded border border-blue-200/60 font-mono">
                                                    {formatWeekKey(minggu)}: {formatRupiah(val)}
                                                  </span>
                                                ))}
                                              </div>
                                            ) : (
                                              <span className="text-slate-400 italic text-[11px]">-</span>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">{k.keterangan || '-'}</td>
                                          {!readOnly && (
                                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                              <div className="flex items-center justify-center gap-1">
                                                <button
                                                  type="button"
                                                  onClick={() => onEditKomponen(ro, k, kIdx)}
                                                  className="p-1 text-amber-700 hover:text-amber-900 hover:bg-amber-100/60 rounded transition-colors"
                                                  title="Edit Rincian Komponen"
                                                >
                                                  <Edit size={13} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => onDeleteKomponen(ro, kIdx)}
                                                  className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-100/60 rounded transition-colors"
                                                  title="Hapus Rincian Komponen"
                                                >
                                                  <Trash2 size={13} />
                                                </button>
                                              </div>
                                            </td>
                                          )}
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Menampilkan {Math.min(filteredData.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredData.length, currentPage * itemsPerPage)} dari {filteredData.length} RO
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 font-semibold">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
