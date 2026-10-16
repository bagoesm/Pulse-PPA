// src/components/MonitoringCapaian/RingkasanSatkerView.tsx
import React, { useState } from 'react';
import {
  CapaianSatker,
  CapaianUnitKerja,
  CapaianRO,
  StatusCapaian
} from '../../types/monitoringCapaian';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Target,
  ArrowUpRight,
  Layers,
  PieChart,
  CheckCircle2,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';

interface RingkasanSatkerViewProps {
  satkers: CapaianSatker[];
  unitKerjas: CapaianUnitKerja[];
  ros: CapaianRO[];
  onSelectUnitKerja?: (unitName: string) => void;
  onSelectRO?: (ro: CapaianRO) => void;
}

export const RingkasanSatkerView: React.FC<RingkasanSatkerViewProps> = ({
  satkers,
  unitKerjas,
  ros,
  onSelectUnitKerja,
  onSelectRO
}) => {
  const [expandedSatkers, setExpandedSatkers] = useState<Record<string, boolean>>({});

  const toggleSatker = (satkerName: string) => {
    setExpandedSatkers(prev => ({
      ...prev,
      [satkerName]: !prev[satkerName]
    }));
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getStatusBadge = (status: StatusCapaian) => {
    if (status === 'Sesuai Target') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
          <span>Sesuai Target</span>
        </span>
      );
    }
    if (status === 'Perlu Perhatian') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/70">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
          <span>Perlu Perhatian</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/70">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
        <span>Perlu Intervensi</span>
      </span>
    );
  };

  const getProgressBarColor = (status: StatusCapaian) => {
    if (status === 'Sesuai Target') return 'bg-emerald-500';
    if (status === 'Perlu Perhatian') return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getSatkerBadgeStyle = (kode: string) => {
    if (kode === '01') return 'bg-blue-50 text-blue-700 border-blue-200/80';
    if (kode === '02') return 'bg-purple-50 text-purple-700 border-purple-200/80';
    if (kode === '03') return 'bg-orange-50 text-orange-700 border-orange-200/80';
    if (kode === '04') return 'bg-sky-50 text-sky-700 border-sky-200/80';
    if (kode === '05') return 'bg-teal-50 text-teal-700 border-teal-200/80';
    return 'bg-slate-50 text-slate-700 border-slate-200/80';
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-blue-600" size={20} />
            Hierarki Capaian Satuan Kerja & Unit Kerja
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Menampilkan total pagu, realisasi SP2D, dan persentase penyerapan per unit kerja di bawah masing-masing Satker.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const allOpen: Record<string, boolean> = {};
              satkers.forEach(s => { allOpen[s.nama] = true; });
              setExpandedSatkers(allOpen);
            }}
            className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 shadow-2xs"
          >
            Buka Semua
          </button>
          <button
            onClick={() => setExpandedSatkers({})}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 shadow-2xs"
          >
            Tutup Semua
          </button>
        </div>
      </div>

      {satkers.map(satker => {
        const isExpanded = !!expandedSatkers[satker.nama];
        const unitsUnderSatker = unitKerjas.filter(u => u.satkerNama === satker.nama);

        return (
          <div
            key={satker.id}
            className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300 hover:shadow-sm"
          >
            {/* Header Satker */}
            <div
              onClick={() => toggleSatker(satker.nama)}
              className="px-5 sm:px-6 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 cursor-pointer bg-white hover:bg-slate-50/80 transition-colors select-none"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1 pr-2">
                <button
                  className="mt-0.5 sm:mt-0 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
                  aria-label="Toggle collapse"
                >
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>
                <div className={`w-10 h-10 rounded-xl ${getSatkerBadgeStyle(satker.kode)} border flex items-center justify-center font-bold text-sm font-mono flex-shrink-0 shadow-2xs`}>
                  {satker.kode}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="text-base font-bold text-slate-900 truncate">
                      {satker.nama}
                    </h4>
                    {getStatusBadge(satker.status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2.5">
                    <span className="font-medium text-slate-600">{satker.unitKerjaCount} Unit Kerja</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-medium text-slate-600">{satker.roCount} Rincian Output (RO)</span>
                  </p>
                </div>
              </div>

              {/* Satker Financial Metrics - Strictly Aligned with Unit Kerja Columns */}
              <div className="w-full xl:w-[660px] flex-shrink-0 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-[140px_155px_140px_165px] gap-4 items-center">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pagu Total</span>
                  <span className="text-xs sm:text-[13px] font-bold font-mono tabular-nums text-slate-900 whitespace-nowrap">
                    {formatRupiah(satker.pagu)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Realisasi SP2D</span>
                  <span className="text-xs sm:text-[13px] font-bold font-mono tabular-nums text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 whitespace-nowrap inline-block">
                    {formatRupiah(satker.realisasi)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sisa Anggaran</span>
                  <span className="text-xs sm:text-[13px] font-semibold font-mono tabular-nums text-slate-600 whitespace-nowrap">
                    {formatRupiah(satker.sisa)}
                  </span>
                </div>
                <div className="w-full">
                  <div className="flex justify-between items-center text-[11px] font-medium mb-1">
                    <span className="text-slate-500 font-semibold">Penyerapan</span>
                    <span className="text-slate-900 font-black font-mono tabular-nums">{satker.persentase}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                    <div
                      className={`h-full ${getProgressBarColor(satker.status)} transition-all duration-500`}
                      style={{ width: `${Math.min(100, Math.max(0, satker.persentase))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* List Unit Kerja Under Satker - Single-Line Clean Layout */}
            {isExpanded && (
              <div className="border-t border-slate-200 divide-y divide-slate-100 bg-slate-50/20">
                {unitsUnderSatker.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-400 bg-white">
                    Belum ada data Unit Kerja yang terhubung.
                  </div>
                ) : (
                  unitsUnderSatker.map(unit => {
                    return (
                      <div
                        key={unit.id}
                        className="px-5 sm:px-6 py-2.5 sm:py-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3 xl:gap-4 hover:bg-slate-50/90 transition-colors"
                      >
                        {/* Single-line left info: [Kode] Unit Name [Status] • [X RO ↗] */}
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-2 pl-4 sm:pl-7">
                          {/* Kode Unit Kerja (Clean & Muted) */}
                          <span className="font-mono text-xs font-semibold text-slate-400 bg-slate-100/90 px-1.5 py-0.5 rounded border border-slate-200/70 flex-shrink-0">
                            {unit.kode ? unit.kode.slice(-4) : 'UK'}
                          </span>

                          <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                            <h5
                              className={`text-sm font-semibold text-slate-800 truncate ${onSelectUnitKerja ? 'hover:text-blue-600 cursor-pointer' : ''}`}
                              title={unit.nama}
                              onClick={() => onSelectUnitKerja?.(unit.nama)}
                            >
                              {unit.nama}
                            </h5>

                            {getStatusBadge(unit.status)}

                            <span className="text-slate-300">•</span>

                            {onSelectUnitKerja ? (
                              <button
                                onClick={() => onSelectUnitKerja(unit.nama)}
                                className="text-xs text-slate-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1 group font-medium"
                                title="Lihat daftar Rincian Output untuk unit kerja ini"
                              >
                                <span>{unit.roCount} RO</span>
                                <ArrowUpRight size={12} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                              </button>
                            ) : (
                              <span className="text-xs text-slate-500 font-medium">{unit.roCount} RO</span>
                            )}
                          </div>
                        </div>

                        {/* Unit Kerja Financial Metrics - Exact Same Grid as Satker Header */}
                        <div className="w-full xl:w-[660px] flex-shrink-0 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-[140px_155px_140px_165px] gap-4 items-center">
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pagu</span>
                            <span className="text-xs sm:text-[13px] font-semibold font-mono tabular-nums text-slate-700 whitespace-nowrap">
                              {formatRupiah(unit.pagu)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Realisasi</span>
                            <span className="text-xs sm:text-[13px] font-bold font-mono tabular-nums text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 whitespace-nowrap inline-block">
                              {formatRupiah(unit.realisasi)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sisa Anggaran</span>
                            <span className="text-xs sm:text-[13px] font-semibold font-mono tabular-nums text-slate-600 whitespace-nowrap">
                              {formatRupiah(unit.sisa)}
                            </span>
                          </div>
                          <div className="w-full">
                            <div className="flex justify-between items-center text-[11px] font-medium mb-1">
                              <span className="text-slate-500 font-semibold">Penyerapan</span>
                              <span className="font-bold font-mono tabular-nums text-slate-900">{unit.persentase}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                              <div
                                className={`h-full ${getProgressBarColor(unit.status)} transition-all duration-500`}
                                style={{ width: `${Math.min(100, Math.max(0, unit.persentase))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
