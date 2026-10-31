import React, { useState, useMemo, useEffect } from 'react';
import {
  CapaianRO,
  JadwalMingguan,
  KomponenRO
} from '../../types/monitoringCapaian';
import {
  CalendarDays,
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Edit3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Layers,
  Plus,
  Trash2
} from 'lucide-react';

interface JadwalPenyerapanAjViewProps {
  ros: CapaianRO[];
  onEditJadwal: (ro: CapaianRO) => void;
  onDownloadTemplate: () => void;
  onOpenUpload: () => void;
  onAddKomponen: (ro: CapaianRO) => void;
  onEditKomponen: (ro: CapaianRO, item: KomponenRO, index: number) => void;
  onDeleteKomponen: (ro: CapaianRO, index: number) => void;
  initialUnitFilter?: string;
  readOnly?: boolean;
}

export const JadwalPenyerapanAjView: React.FC<JadwalPenyerapanAjViewProps> = ({
  ros,
  onEditJadwal,
  onDownloadTemplate,
  onOpenUpload,
  onAddKomponen,
  onEditKomponen,
  onDeleteKomponen,
  initialUnitFilter,
  readOnly = false
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [unitFilter, setUnitFilter] = useState<string>(initialUnitFilter || 'All');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    if (initialUnitFilter) {
      setUnitFilter(initialUnitFilter);
    }
  }, [initialUnitFilter]);

  const formatNumber = (val?: number) => {
    if (!val || val === 0) return '-';
    return new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 0
    }).format(val);
  };

  const unitOptions = useMemo(() => {
    return Array.from(new Set(ros.map(r => r.unitKerjaNama))).filter(Boolean);
  }, [ros]);

  const filteredROs = useMemo(() => {
    return ros.filter(r => {
      const matchSearch =
        r.kodeRo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.namaRo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.unitKerjaNama.toLowerCase().includes(searchTerm.toLowerCase());
      const matchUnit = unitFilter === 'All' || r.unitKerjaNama === unitFilter;
      return matchSearch && matchUnit;
    });
  }, [ros, searchTerm, unitFilter]);

  // Calculate totals per week column
  const totals = useMemo(() => {
    const sums: Record<string, number> = {
      pagu: 0,
      realisasi: 0,
      sisa: 0,
      okt2: 0,
      okt3: 0,
      okt4: 0,
      nov1: 0,
      nov2: 0,
      nov3: 0,
      nov4: 0,
      des1: 0,
      des2: 0,
      des3: 0,
      des4: 0,
      totalKeb: 0,
      danaSisa: 0
    };

    filteredROs.forEach(r => {
      sums.pagu += Number(r.pagu || 0);
      sums.realisasi += Number(r.realisasi || 0);
      sums.sisa += Number(r.sisa || 0);
      sums.okt2 += Number(r.jadwal?.okt2 || 0);
      sums.okt3 += Number(r.jadwal?.okt3 || 0);
      sums.okt4 += Number(r.jadwal?.okt4 || 0);
      sums.nov1 += Number(r.jadwal?.nov1 || 0);
      sums.nov2 += Number(r.jadwal?.nov2 || 0);
      sums.nov3 += Number(r.jadwal?.nov3 || 0);
      sums.nov4 += Number(r.jadwal?.nov4 || 0);
      sums.des1 += Number(r.jadwal?.des1 || 0);
      sums.des2 += Number(r.jadwal?.des2 || 0);
      sums.des3 += Number(r.jadwal?.des3 || 0);
      sums.des4 += Number(r.jadwal?.des4 || 0);
      sums.totalKeb += Number(r.totalKebutuhan || 0);
      sums.danaSisa += Number(r.danaTidakTerserap || 0);
    });

    return sums;
  }, [filteredROs]);

  const hasAnyKomponen = useMemo(() => {
    return filteredROs.some(r => r.komponen && r.komponen.length > 0);
  }, [filteredROs]);

  const allExpanded = useMemo(() => {
    const withKomp = filteredROs.filter(r => r.komponen && r.komponen.length > 0);
    return withKomp.length > 0 && withKomp.every(r => expandedRows[r.id]);
  }, [filteredROs, expandedRows]);

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedRows({});
    } else {
      const next: Record<string, boolean> = {};
      filteredROs.forEach(r => {
        if (r.komponen && r.komponen.length > 0) {
          next[r.id] = true;
        }
      });
      setExpandedRows(next);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header Info */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center flex-shrink-0">
            <CalendarDays size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Matriks Agenda, Jadwal, & Rencana Penyerapan (AJK)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Informasi alokasi waktu rencana pelaksanaan kegiatan dan proyeksi penarikan dana mingguan periode Okt - Des.
            </p>
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              onClick={onDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
            >
              <Download size={14} className="text-slate-500" />
              <span>Unduh Format AJK</span>
            </button>
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors shadow-xs"
            >
              <FileSpreadsheet size={14} />
              <span>Upload File AJK</span>
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode RO atau uraian..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasAnyKomponen && (
            <button
              type="button"
              onClick={toggleExpandAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shadow-2xs"
            >
              <Layers size={13} className="text-blue-600" />
              <span>{allExpanded ? 'Tutup Semua Rincian' : 'Buka Semua Rincian Belanja'}</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Unit Kerja:</span>
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 max-w-[240px] truncate"
            >
              <option value="All">Semua Unit Kerja</option>
              {unitOptions.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Multi-column Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              {/* Row 1: Group Headers */}
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 text-center w-12">No</th>
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 w-28">Kode RO</th>
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 min-w-[220px]">Uraian Kegiatan / RO</th>
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 text-right w-24">Pagu (Rp)</th>
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 text-right w-24 bg-emerald-50/70 text-emerald-900">Realisasi (Rp)</th>
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 text-right w-24">Sisa (Rp)</th>
                
                {/* Months with bold rich colored headers */}
                <th colSpan={3} className="py-2 px-2 text-center bg-sky-600 text-white font-bold tracking-wide border-r border-sky-700 shadow-2xs">
                  Oktober 2026
                </th>
                <th colSpan={4} className="py-2 px-2 text-center bg-indigo-600 text-white font-bold tracking-wide border-r border-indigo-700 shadow-2xs">
                  November 2026
                </th>
                <th colSpan={4} className="py-2 px-2 text-center bg-emerald-600 text-white font-bold tracking-wide border-r border-emerald-700 shadow-2xs">
                  Desember 2026
                </th>

                <th rowSpan={2} className="py-2.5 px-3 border-r border-amber-600 text-right w-24 bg-amber-500 text-white font-bold">
                  Total Rencana Okt-Des
                </th>
                <th rowSpan={2} className="py-2.5 px-3 border-r border-rose-700 text-right w-24 text-white bg-rose-600 font-bold">
                  Perkiraan Dana Sisa
                </th>
                <th rowSpan={2} className={`py-2.5 px-3 ${readOnly ? '' : 'border-r border-slate-200'} min-w-[150px]`}>Keterangan</th>
                {!readOnly && <th rowSpan={2} className="py-2.5 px-3 text-center w-16">Aksi</th>}
              </tr>

              {/* Row 2: Week Columns */}
              <tr className="bg-slate-50 text-slate-600 font-semibold text-[10px] border-b border-slate-200 text-center">
                {/* Okt II, III, IV */}
                <th className="py-1.5 px-2 border-r border-sky-200 bg-sky-100 text-sky-950 font-bold w-16">II</th>
                <th className="py-1.5 px-2 border-r border-sky-200 bg-sky-100 text-sky-950 font-bold w-16">III</th>
                <th className="py-1.5 px-2 border-r border-sky-200 bg-sky-100 text-sky-950 font-bold w-16">IV</th>

                {/* Nov I, II, III, IV */}
                <th className="py-1.5 px-2 border-r border-indigo-200 bg-indigo-100 text-indigo-950 font-bold w-16">I</th>
                <th className="py-1.5 px-2 border-r border-indigo-200 bg-indigo-100 text-indigo-950 font-bold w-16">II</th>
                <th className="py-1.5 px-2 border-r border-indigo-200 bg-indigo-100 text-indigo-950 font-bold w-16">III</th>
                <th className="py-1.5 px-2 border-r border-indigo-200 bg-indigo-100 text-indigo-950 font-bold w-16">IV</th>

                {/* Des I, II, III, IV */}
                <th className="py-1.5 px-2 border-r border-emerald-200 bg-emerald-100 text-emerald-950 font-bold w-16">I</th>
                <th className="py-1.5 px-2 border-r border-emerald-200 bg-emerald-100 text-emerald-950 font-bold w-16">II</th>
                <th className="py-1.5 px-2 border-r border-emerald-200 bg-emerald-100 text-emerald-950 font-bold w-16">III</th>
                <th className="py-1.5 px-2 border-r border-emerald-200 bg-emerald-100 text-emerald-950 font-bold w-16">IV</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredROs.map((ro, idx) => {
                const j = ro.jadwal || {};
                const sumOkt = (j.okt2 || 0) + (j.okt3 || 0) + (j.okt4 || 0);
                const sumNov = (j.nov1 || 0) + (j.nov2 || 0) + (j.nov3 || 0) + (j.nov4 || 0);
                const sumDes = (j.des1 || 0) + (j.des2 || 0) + (j.des3 || 0) + (j.des4 || 0);
                const totalJadwal = sumOkt + sumNov + sumDes;
                const hasKomponen = ro.komponen && ro.komponen.length > 0;
                const isExpanded = !!expandedRows[ro.id];

                return (
                  <React.Fragment key={ro.id}>
                    <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? 'bg-blue-50/20' : ''}`}>
                      <td className="py-2.5 px-3 text-center border-r border-slate-100 font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                        <span className="inline-block bg-blue-50 text-blue-800 border border-blue-200/90 font-mono font-bold px-2 py-0.5 rounded-md shadow-2xs">
                          {ro.kodeRo}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100">
                        <div className="font-semibold text-slate-900 line-clamp-1" title={ro.namaRo}>
                          {ro.namaRo}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {ro.unitKerjaNama}
                        </div>
                        {(!readOnly || hasKomponen) && (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => toggleExpand(ro.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200/80 transition-colors shadow-2xs group"
                            >
                              {isExpanded ? <ChevronDown size={11} className="text-blue-600" /> : <ChevronRight size={11} className="text-blue-600 group-hover:translate-x-0.5 transition-transform" />}
                              <span>{isExpanded ? 'Tutup Rincian' : hasKomponen ? `Lihat ${ro.komponen!.length} Rincian Belanja` : '+ Tambah Rincian'}</span>
                            </button>
                            {isExpanded && !readOnly && (
                              <button
                                type="button"
                                onClick={() => onAddKomponen(ro)}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 px-2 py-0.5 rounded transition-colors shadow-2xs"
                                title="Tambah Komponen Baru"
                              >
                                <Plus size={10} />
                                <span>Tambah</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 text-right font-mono tabular-nums font-semibold text-slate-700 whitespace-nowrap">
                        {formatNumber(ro.pagu)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 text-right font-mono tabular-nums font-bold text-emerald-700 whitespace-nowrap">
                        <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200/60">
                          {formatNumber(ro.realisasi)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 text-right font-mono tabular-nums font-medium text-slate-600 whitespace-nowrap">
                        {formatNumber(ro.sisa)}
                      </td>

                      {/* Okt */}
                      <td className="py-2 px-2 border-r border-sky-100 text-right font-mono tabular-nums text-sky-950 bg-sky-50/30 whitespace-nowrap">
                        {formatNumber(j.okt2)}
                      </td>
                      <td className="py-2 px-2 border-r border-sky-100 text-right font-mono tabular-nums text-sky-950 bg-sky-50/30 whitespace-nowrap">
                        {formatNumber(j.okt3)}
                      </td>
                      <td className="py-2 px-2 border-r border-sky-100 text-right font-mono tabular-nums text-sky-950 bg-sky-50/30 whitespace-nowrap">
                        {formatNumber(j.okt4)}
                      </td>

                      {/* Nov */}
                      <td className="py-2 px-2 border-r border-indigo-100 text-right font-mono tabular-nums text-indigo-950 bg-indigo-50/30 whitespace-nowrap">
                        {formatNumber(j.nov1)}
                      </td>
                      <td className="py-2 px-2 border-r border-indigo-100 text-right font-mono tabular-nums text-indigo-950 bg-indigo-50/30 whitespace-nowrap">
                        {formatNumber(j.nov2)}
                      </td>
                      <td className="py-2 px-2 border-r border-indigo-100 text-right font-mono tabular-nums text-indigo-950 bg-indigo-50/30 whitespace-nowrap">
                        {formatNumber(j.nov3)}
                      </td>
                      <td className="py-2 px-2 border-r border-indigo-100 text-right font-mono tabular-nums text-indigo-950 bg-indigo-50/30 whitespace-nowrap">
                        {formatNumber(j.nov4)}
                      </td>

                      {/* Des */}
                      <td className="py-2 px-2 border-r border-emerald-100 text-right font-mono tabular-nums text-emerald-950 bg-emerald-50/30 whitespace-nowrap">
                        {formatNumber(j.des1)}
                      </td>
                      <td className="py-2 px-2 border-r border-emerald-100 text-right font-mono tabular-nums text-emerald-950 bg-emerald-50/30 whitespace-nowrap">
                        {formatNumber(j.des2)}
                      </td>
                      <td className="py-2 px-2 border-r border-emerald-100 text-right font-mono tabular-nums text-emerald-950 bg-emerald-50/30 whitespace-nowrap">
                        {formatNumber(j.des3)}
                      </td>
                      <td className="py-2 px-2 border-r border-emerald-100 text-right font-mono tabular-nums text-emerald-950 bg-emerald-50/30 whitespace-nowrap">
                        {formatNumber(j.des4)}
                      </td>

                      {/* Totals & Notes */}
                      <td className="py-2.5 px-3 border-r border-amber-200/80 text-right font-mono tabular-nums font-bold text-amber-950 bg-amber-50/70 whitespace-nowrap">
                        {formatNumber(ro.totalKebutuhan || totalJadwal)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-rose-200/80 text-right font-mono tabular-nums font-bold text-rose-800 bg-rose-50/70 whitespace-nowrap">
                        {formatNumber(ro.danaTidakTerserap)}
                      </td>
                      <td className={`py-2.5 px-3 ${readOnly ? '' : 'border-r border-slate-100'} text-slate-600 max-w-[200px] truncate`} title={ro.keterangan}>
                        {ro.keterangan || '-'}
                      </td>
                      {!readOnly && (
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => onEditJadwal(ro)}
                            className="px-2 py-1 text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-md transition-colors inline-flex items-center gap-1 font-semibold text-[11px] shadow-2xs"
                            title="Edit Rencana Jadwal"
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>
                        </td>
                      )}
                    </tr>

                    {/* Sub-Komponen Rows */}
                    {isExpanded && hasKomponen && ro.komponen!.map((k, kIdx) => {
                      const kj = k.jadwal || {};
                      const kSumOkt = (kj.okt2 || 0) + (kj.okt3 || 0) + (kj.okt4 || 0);
                      const kSumNov = (kj.nov1 || 0) + (kj.nov2 || 0) + (kj.nov3 || 0) + (kj.nov4 || 0);
                      const kSumDes = (kj.des1 || 0) + (kj.des2 || 0) + (kj.des3 || 0) + (kj.des4 || 0);
                      const kTotalJadwal = kSumOkt + kSumNov + kSumDes;

                      return (
                        <tr key={`${ro.id}-sub-${kIdx}`} className="bg-slate-50/75 hover:bg-blue-50/40 transition-colors text-[11px] border-b border-slate-100">
                          <td className="py-2 px-3 text-center border-r border-slate-100 font-mono text-[10px] text-slate-400">
                            {idx + 1}.{kIdx + 1}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-100 font-mono text-[10px] text-slate-400 text-center">
                            <span className="text-[9px] text-slate-500 bg-slate-200/70 px-1 py-0.5 rounded font-sans font-medium">komp</span>
                          </td>
                          <td className="py-2 px-3 border-r border-slate-100">
                            <div className="flex items-center gap-1.5 pl-2 text-slate-700 font-medium">
                              <span className="text-slate-400">↳</span>
                              <span title={k.nama}>{k.nama}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 border-r border-slate-100 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap text-[10px]">
                            {k.pagu ? formatNumber(k.pagu) : '-'}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-100 text-right font-mono tabular-nums text-slate-400 whitespace-nowrap bg-emerald-50/20 text-[10px]">
                            -
                          </td>
                          <td className="py-2 px-3 border-r border-slate-100 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap text-[10px]">
                            {k.sisa ? formatNumber(k.sisa) : '-'}
                          </td>

                          {/* Okt */}
                          <td className="py-1.5 px-2 border-r border-sky-100 text-right font-mono tabular-nums text-sky-900 bg-sky-50/20 whitespace-nowrap text-[10px]">
                            {formatNumber(kj.okt2)}
                          </td>
                          <td className="py-1.5 px-2 border-r border-sky-100 text-right font-mono tabular-nums text-sky-900 bg-sky-50/20 whitespace-nowrap text-[10px]">
                            {formatNumber(kj.okt3)}
                          </td>
                          <td className="py-1.5 px-2 border-r border-sky-100 text-right font-mono tabular-nums text-sky-900 bg-sky-50/20 whitespace-nowrap text-[10px]">
                            {formatNumber(kj.okt4)}
                          </td>

                          {/* Nov */}
                          <td className="py-1.5 px-2 border-r border-indigo-100 text-right font-mono tabular-nums text-indigo-900 bg-indigo-50/20 whitespace-nowrap text-[10px]">
                            {formatNumber(kj.nov1)}
                          </td>
                          <td className="py-1.5 px-2 border-r border-indigo-100 text-right font-mono tabular-nums text-indigo-900 bg-indigo-50/20 whitespace-nowrap text-[10px]">
                            {formatNumber(kj.nov2)}
                          </td>
                          <td className="py-1.5 px-2 border-r border-indigo-100 text-right font-mono tabular-nums text-indigo-900 bg-indigo-50/20 whitespace-nowrap text-[10px]">
                            {formatNumber(kj.nov3)}
                          </td>
                          <td className="py-1.5 px-2 border-r border-indigo-100 text-right font-mono tabular-nums text-indigo-900 bg-indigo-50/20 whitespace-nowrap text-[10px]">
                            {formatNumber(kj.nov4)}
                          </td>

                          {/* Des */}
                          <td className="py-1.5 px-2 border-r border-emerald-100 text-right font-mono tabular-nums text-emerald-900 bg-emerald-50/20 whitespace-nowrap text-[10px]">
                            {formatNumber(kj.des1)}
                          </td>
                          <td className="py-1.5 px-2 border-r border-emerald-100 text-right font-mono tabular-nums text-emerald-900 bg-emerald-50/20 whitespace-nowrap text-[10px]">
                            {formatNumber(kj.des2)}
                          </td>
                          <td className="py-1.5 px-2 border-r border-emerald-100 text-right font-mono tabular-nums text-emerald-900 bg-emerald-50/20 whitespace-nowrap text-[10px]">
                            {formatNumber(kj.des3)}
                          </td>
                          <td className="py-1.5 px-2 border-r border-emerald-100 text-right font-mono tabular-nums text-emerald-900 bg-emerald-50/20 whitespace-nowrap text-[10px]">
                            {formatNumber(kj.des4)}
                          </td>

                          {/* Totals & Notes */}
                          <td className="py-2 px-3 border-r border-amber-200/50 text-right font-mono tabular-nums font-semibold text-amber-900 bg-amber-50/40 whitespace-nowrap text-[10px]">
                            {formatNumber(kTotalJadwal)}
                          </td>
                          <td className="py-2 px-3 border-r border-rose-200/50 text-right font-mono tabular-nums text-slate-400 bg-rose-50/30 whitespace-nowrap text-[10px]">
                            -
                          </td>
                          <td className={`py-2 px-3 ${readOnly ? '' : 'border-r border-slate-100'} text-slate-500 max-w-[200px] truncate text-[10px]`} title={k.keterangan}>
                            {k.keterangan || '-'}
                          </td>
                          {!readOnly && (
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onEditKomponen(ro, k, kIdx)}
                                  className="p-1 text-amber-700 hover:text-amber-900 hover:bg-amber-100/60 rounded transition-colors"
                                  title="Edit Rincian Komponen"
                                >
                                  <Edit3 size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteKomponen(ro, kIdx)}
                                  className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-100/60 rounded transition-colors"
                                  title="Hapus Rincian Komponen"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* Table Footer Totals */}
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                <td colSpan={3} className="py-3 px-3 text-right uppercase tracking-wider text-[11px] border-r border-slate-200">
                  Total Keseluruhan
                </td>
                <td className="py-3 px-3 border-r border-slate-200 text-right font-mono tabular-nums whitespace-nowrap font-bold">
                  {formatNumber(totals.pagu)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 text-right font-mono tabular-nums text-emerald-800 whitespace-nowrap font-bold bg-emerald-100/60">
                  {formatNumber(totals.realisasi)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 text-right font-mono tabular-nums whitespace-nowrap font-bold">
                  {formatNumber(totals.sisa)}
                </td>
                <td className="py-2 px-2 border-r border-sky-300 text-right font-mono tabular-nums bg-sky-100 text-sky-950 font-bold whitespace-nowrap">
                  {formatNumber(totals.okt2)}
                </td>
                <td className="py-2 px-2 border-r border-sky-300 text-right font-mono tabular-nums bg-sky-100 text-sky-950 font-bold whitespace-nowrap">
                  {formatNumber(totals.okt3)}
                </td>
                <td className="py-2 px-2 border-r border-sky-300 text-right font-mono tabular-nums bg-sky-100 text-sky-950 font-bold whitespace-nowrap">
                  {formatNumber(totals.okt4)}
                </td>
                <td className="py-2 px-2 border-r border-indigo-300 text-right font-mono tabular-nums bg-indigo-100 text-indigo-950 font-bold whitespace-nowrap">
                  {formatNumber(totals.nov1)}
                </td>
                <td className="py-2 px-2 border-r border-indigo-300 text-right font-mono tabular-nums bg-indigo-100 text-indigo-950 font-bold whitespace-nowrap">
                  {formatNumber(totals.nov2)}
                </td>
                <td className="py-2 px-2 border-r border-indigo-300 text-right font-mono tabular-nums bg-indigo-100 text-indigo-950 font-bold whitespace-nowrap">
                  {formatNumber(totals.nov3)}
                </td>
                <td className="py-2 px-2 border-r border-indigo-300 text-right font-mono tabular-nums bg-indigo-100 text-indigo-950 font-bold whitespace-nowrap">
                  {formatNumber(totals.nov4)}
                </td>
                <td className="py-2 px-2 border-r border-emerald-300 text-right font-mono tabular-nums bg-emerald-100 text-emerald-950 font-bold whitespace-nowrap">
                  {formatNumber(totals.des1)}
                </td>
                <td className="py-2 px-2 border-r border-emerald-300 text-right font-mono tabular-nums bg-emerald-100 text-emerald-950 font-bold whitespace-nowrap">
                  {formatNumber(totals.des2)}
                </td>
                <td className="py-2 px-2 border-r border-emerald-300 text-right font-mono tabular-nums bg-emerald-100 text-emerald-950 font-bold whitespace-nowrap">
                  {formatNumber(totals.des3)}
                </td>
                <td className="py-2 px-2 border-r border-emerald-300 text-right font-mono tabular-nums bg-emerald-100 text-emerald-950 font-bold whitespace-nowrap">
                  {formatNumber(totals.des4)}
                </td>
                <td className="py-3 px-3 border-r border-amber-300 text-right font-mono tabular-nums whitespace-nowrap bg-amber-100 text-amber-950 font-bold">
                  {formatNumber(totals.totalKeb)}
                </td>
                <td className="py-3 px-3 border-r border-rose-300 text-right font-mono tabular-nums whitespace-nowrap text-rose-900 bg-rose-100 font-bold">
                  {formatNumber(totals.danaSisa)}
                </td>
                <td colSpan={readOnly ? 1 : 2} className="py-3 px-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
