// src/components/MonitoringCapaian/MonitoringRoView.tsx
import React, { useState, useMemo } from 'react';
import {
  CapaianRO,
  StatusCapaian
} from '../../types/monitoringCapaian';
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
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface MonitoringRoViewProps {
  ros: CapaianRO[];
  onEditRO: (ro: CapaianRO) => void;
  onEditJadwal: (ro: CapaianRO) => void;
  onDeleteRO: (roId: string) => void;
  initialUnitFilter?: string;
}

export const MonitoringRoView: React.FC<MonitoringRoViewProps> = ({
  ros,
  onEditRO,
  onEditJadwal,
  onDeleteRO,
  initialUnitFilter
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StatusCapaian>('ALL');
  const [satkerFilter, setSatkerFilter] = useState<string>('All');
  const [unitFilter, setUnitFilter] = useState<string>(initialUnitFilter || 'All');

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

  // Distinct Satker & Unit lists for dropdowns
  const satkerOptions = useMemo(() => {
    return Array.from(new Set(ros.map(r => r.satkerNama))).filter(Boolean);
  }, [ros]);

  const unitOptions = useMemo(() => {
    let filtered = ros;
    if (satkerFilter !== 'All') {
      filtered = filtered.filter(r => r.satkerNama === satkerFilter);
    }
    return Array.from(new Set(filtered.map(r => r.unitKerjaNama))).filter(Boolean);
  }, [ros, satkerFilter]);

  // Counts for status chips
  const counts = useMemo(() => {
    let sesuai = 0;
    let perhatian = 0;
    let intervensi = 0;
    ros.forEach(r => {
      if (r.status === 'Sesuai Target') sesuai++;
      else if (r.status === 'Perlu Perhatian') perhatian++;
      else intervensi++;
    });
    return {
      all: ros.length,
      sesuai,
      perhatian,
      intervensi
    };
  }, [ros]);

  const filteredData = useMemo(() => {
    let result = ros.filter(r => {
      const matchSearch =
        r.kodeRo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.namaRo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.unitKerjaNama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.satkerNama.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchSatker = satkerFilter === 'All' || r.satkerNama === satkerFilter;
      const matchUnit = unitFilter === 'All' || r.unitKerjaNama === unitFilter;

      return matchSearch && matchStatus && matchSatker && matchUnit;
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
  }, [ros, searchTerm, statusFilter, satkerFilter, unitFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

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
      {/* Quick Status Filter Tabs (Traffic Lights) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* ALL */}
        <button
          onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
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
          onClick={() => { setStatusFilter('Sesuai Target'); setCurrentPage(1); }}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'Sesuai Target'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
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
          onClick={() => { setStatusFilter('Perlu Perhatian'); setCurrentPage(1); }}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'Perlu Perhatian'
              ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
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
          onClick={() => { setStatusFilter('Perlu Intervensi'); setCurrentPage(1); }}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'Perlu Intervensi'
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
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

      {/* Search & Filter Bar */}
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
            className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-gov-500 max-w-[180px] truncate"
          >
            <option value="All">Semua Satuan Kerja</option>
            {satkerOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

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
                <th className="py-3.5 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                    Tidak ditemukan data Rincian Output yang sesuai filter.
                  </td>
                </tr>
              ) : (
                paginatedData.map((ro) => {
                  const hasSchedule = ro.jadwal && Object.values(ro.jadwal).some(v => (v || 0) > 0);

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
                    <tr key={ro.id} className={`${rowHoverClass} transition-colors border-b border-slate-100`}>
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
                    </tr>
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
