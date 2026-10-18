// src/components/MonitoringCapaian/DashboardPimpinanView.tsx
import React, { useState, useMemo } from 'react';
import {
  CapaianRO,
  CapaianSatker,
  CapaianUnitKerja,
  CapaianKementerianSummary,
  StatusCapaian
} from '../../types/monitoringCapaian';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  Target,
  ArrowUpRight,
  ShieldAlert,
  Award,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  DollarSign,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell
} from 'recharts';

interface DashboardPimpinanViewProps {
  ros: CapaianRO[];
  satkers: CapaianSatker[];
  unitKerjas: CapaianUnitKerja[];
  summary: CapaianKementerianSummary;
  onNavigateToDetail: (tab: 'ro' | 'jadwal' | 'satker' | 'ranking', filterUnit?: string) => void;
  onSelectRO?: (ro: CapaianRO) => void;
}

export const DashboardPimpinanView: React.FC<DashboardPimpinanViewProps> = ({
  ros,
  satkers,
  unitKerjas,
  summary,
  onNavigateToDetail,
  onSelectRO
}) => {
  const [selectedSatker, setSelectedSatker] = useState<string>('All');

  // Filtered ROs based on satker filter
  const filteredROs = useMemo(() => {
    if (selectedSatker === 'All') return ros;
    return ros.filter(r => r.satkerNama === selectedSatker);
  }, [ros, selectedSatker]);

  // Dynamic summary for selected satker
  const currentSummary = useMemo(() => {
    const totalPagu = filteredROs.reduce((acc, curr) => acc + (curr.pagu || 0), 0);
    const totalRealisasi = filteredROs.reduce((acc, curr) => acc + (curr.realisasi || 0), 0);
    const totalSisa = filteredROs.reduce((acc, curr) => acc + (curr.sisa || 0), 0);
    const totalKebutuhan = filteredROs.reduce((acc, curr) => acc + (curr.totalKebutuhan || 0), 0);
    const totalSilpa = filteredROs.reduce((acc, curr) => acc + (curr.danaTidakTerserap || 0), 0);
    const pct = totalPagu > 0 ? Number(((totalRealisasi / totalPagu) * 100).toFixed(2)) : 0;

    let sesuai = 0;
    let perhatian = 0;
    let intervensi = 0;
    filteredROs.forEach(r => {
      if (r.status === 'Sesuai Target') sesuai++;
      else if (r.status === 'Perlu Perhatian') perhatian++;
      else intervensi++;
    });

    return {
      totalPagu,
      totalRealisasi,
      totalSisa,
      totalKebutuhan,
      totalSilpa,
      persentase: pct,
      totalRO: filteredROs.length,
      sesuai,
      perhatian,
      intervensi
    };
  }, [filteredROs]);

  // Aggregate weekly disbursements from AJK for timeline chart
  const weeklyTimeline = useMemo(() => {
    const weeks = [
      { key: 'okt2', label: 'Okt M-II', shortLabel: 'Okt II', month: 'Oktober' },
      { key: 'okt3', label: 'Okt M-III', shortLabel: 'Okt III', month: 'Oktober' },
      { key: 'okt4', label: 'Okt M-IV', shortLabel: 'Okt IV', month: 'Oktober' },
      { key: 'nov1', label: 'Nov M-I', shortLabel: 'Nov I', month: 'November' },
      { key: 'nov2', label: 'Nov M-II', shortLabel: 'Nov II', month: 'November' },
      { key: 'nov3', label: 'Nov M-III', shortLabel: 'Nov III', month: 'November' },
      { key: 'nov4', label: 'Nov M-IV', shortLabel: 'Nov IV', month: 'November' },
      { key: 'des1', label: 'Des M-I', shortLabel: 'Des I', month: 'Desember' },
      { key: 'des2', label: 'Des M-II', shortLabel: 'Des II', month: 'Desember' },
      { key: 'des3', label: 'Des M-III', shortLabel: 'Des III', month: 'Desember' },
      { key: 'des4', label: 'Des M-IV', shortLabel: 'Des IV', month: 'Desember' }
    ];

    let maxVal = 0;
    let peakWeek = { label: '-', val: 0 };
    let oktTotal = 0;
    let novTotal = 0;
    let desTotal = 0;

    const data = weeks.map(w => {
      const total = filteredROs.reduce((acc, r) => {
        const val = Number((r.jadwal as any)?.[w.key] || 0);
        return acc + val;
      }, 0);

      if (w.month === 'Oktober') oktTotal += total;
      else if (w.month === 'November') novTotal += total;
      else if (w.month === 'Desember') desTotal += total;

      if (total > maxVal) {
        maxVal = total;
        peakWeek = { label: w.label, val: total };
      }

      return {
        ...w,
        total
      };
    });

    const enriched = data.map(d => ({
      ...d,
      isPeak: d.total === maxVal && d.total > 0
    }));

    return {
      data: enriched,
      maxVal,
      peakWeek,
      monthlyTotals: { okt: oktTotal, nov: novTotal, des: desTotal }
    };
  }, [filteredROs]);

  // Top 5 ROs requiring immediate attention (Lowest Realization or Intervention Status)
  const priorityROs = useMemo(() => {
    return [...filteredROs]
      .filter(r => r.pagu > 0)
      .sort((a, b) => {
        // Sort by lowest percentage first, then largest remaining budget
        if (a.persentase !== b.persentase) {
          return a.persentase - b.persentase;
        }
        return (b.sisa || 0) - (a.sisa || 0);
      })
      .slice(0, 5);
  }, [filteredROs]);

  // Top 5 Best Performing Units
  const topUnits = useMemo(() => {
    const unitsMap = new Map<string, { nama: string; satker: string; pagu: number; realisasi: number; roCount: number }>();

    filteredROs.forEach(r => {
      const key = r.unitKerjaNama;
      const exist = unitsMap.get(key) || {
        nama: r.unitKerjaNama,
        satker: r.satkerNama,
        pagu: 0,
        realisasi: 0,
        roCount: 0
      };
      exist.pagu += Number(r.pagu || 0);
      exist.realisasi += Number(r.realisasi || 0);
      exist.roCount += 1;
      unitsMap.set(key, exist);
    });

    const list = Array.from(unitsMap.values()).map(u => ({
      ...u,
      persentase: u.pagu > 0 ? Number(((u.realisasi / u.pagu) * 100).toFixed(2)) : 0
    }));

    return list.sort((a, b) => b.persentase - a.persentase).slice(0, 4);
  }, [filteredROs]);

  // Satker breakdown list with percentage
  const satkerBreakdown = useMemo(() => {
    const list = satkers.map(s => {
      const satkerROs = ros.filter(r => r.satkerNama === s.nama);
      const totalPagu = satkerROs.reduce((a, b) => a + (b.pagu || 0), 0);
      const totalReal = satkerROs.reduce((a, b) => a + (b.realisasi || 0), 0);
      const pct = totalPagu > 0 ? Number(((totalReal / totalPagu) * 100).toFixed(2)) : 0;
      return {
        ...s,
        totalPagu,
        totalReal,
        persentase: pct,
        roCount: satkerROs.length
      };
    });
    return list.sort((a, b) => b.persentase - a.persentase);
  }, [satkers, ros]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const formatShortRupiah = (val: number) => {
    if (val >= 1_000_000_000_000) {
      return `Rp ${(val / 1_000_000_000_000).toFixed(2)} T`;
    }
    if (val >= 1_000_000_000) {
      return `Rp ${(val / 1_000_000_000).toFixed(2)} M`;
    }
    if (val >= 1_000_000) {
      return `Rp ${(val / 1_000_000).toFixed(1)} Jt`;
    }
    return formatRupiah(val);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Executive Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
              <Sparkles size={13} className="text-blue-600" />
              <span>Ringkasan Eksekutif • Pimpinan Kementerian</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Dashboard Capaian Anggaran & Target Rincian Output
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Ikhtisar strategis realisasi pagu nasional, proyeksi likuiditas penyerapan AJK (Okt-Des), dan sistem peringatan dini (early warning) untuk pimpinan Kementerian PPPA.
            </p>
          </div>

          {/* Satker Filter */}
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 self-start lg:self-center">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Filter size={14} className="text-blue-600" />
              <span className="font-medium whitespace-nowrap">Fokus Satker:</span>
            </div>
            <select
              value={selectedSatker}
              onChange={(e) => setSelectedSatker(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-semibold border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[240px] truncate shadow-2xs"
            >
              <option value="All">Seluruh Kementerian (Semua Satker)</option>
              {satkers.map(s => (
                <option key={s.id || s.nama} value={s.nama}>
                  {s.nama}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Hero Bento Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Realisasi vs Pagu */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
              <span>Realisasi Anggaran</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-slate-900">
                {currentSummary.persentase}%
              </span>
              <span className="text-xs font-semibold text-slate-500">terserap</span>
            </div>
            <div className="text-xs text-slate-600 mt-2 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Realisasi:</span>
                <span className="font-semibold text-emerald-700 font-mono tabular-nums">{formatRupiah(currentSummary.totalRealisasi)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Pagu:</span>
                <span className="font-semibold text-slate-800 font-mono tabular-nums">{formatRupiah(currentSummary.totalPagu)}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(0, currentSummary.persentase))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
              <span>Target Tahunan: 95%</span>
              <span className={currentSummary.persentase >= 90 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                {currentSummary.persentase >= 90 ? 'Sesuai Target' : 'Perlu Akselerasi'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Proyeksi AJK & Sisa Dana */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
              <span>Proyeksi Penarikan (AJK)</span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
                <Calendar size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold font-mono tabular-nums text-teal-900 tracking-tight">
                {formatRupiah(currentSummary.totalKebutuhan || currentSummary.totalSisa)}
              </span>
            </div>
            <div className="text-xs text-slate-600 mt-2 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Sisa Anggaran:</span>
                <span className="font-semibold text-slate-700 font-mono tabular-nums">{formatRupiah(currentSummary.totalSisa)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Estimasi SiLPA:</span>
                <span className="font-semibold text-rose-600 font-mono tabular-nums">{formatRupiah(currentSummary.totalSilpa)}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">Proyeksi Serapan Akhir:</span>
            <span className="font-bold font-mono text-teal-700">
              {currentSummary.totalPagu > 0
                ? `${(((currentSummary.totalRealisasi + currentSummary.totalKebutuhan) / currentSummary.totalPagu) * 100).toFixed(1)}%`
                : '100%'}
            </span>
          </div>
        </div>

        {/* Card 3: Kesehatan Portofolio Output (RO) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
              <span>Status Portofolio ({currentSummary.totalRO} RO)</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
                <Target size={16} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-200 text-center">
                <span className="block text-xl font-bold font-mono text-emerald-800">{currentSummary.sesuai}</span>
                <span className="text-[10px] text-emerald-700 font-semibold">Sesuai (≥90%)</span>
              </div>
              <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200 text-center">
                <span className="block text-xl font-bold font-mono text-amber-800">{currentSummary.perhatian}</span>
                <span className="text-[10px] text-amber-700 font-semibold">Perhatian</span>
              </div>
              <div className="p-2 rounded-xl bg-rose-50/80 border border-rose-200 text-center">
                <span className="block text-xl font-bold font-mono text-rose-800">{currentSummary.intervensi}</span>
                <span className="text-[10px] text-rose-700 font-semibold">Intervensi</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Rasio RO Sehat:</span>
            <span className="font-bold text-emerald-700 font-mono">
              {currentSummary.totalRO > 0 ? `${((currentSummary.sesuai / currentSummary.totalRO) * 100).toFixed(0)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Card 4: Puncak Penyerapan Dana */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
              <span>Puncak Penarikan Dana (Peak)</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="mt-1">
              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>{weeklyTimeline.peakWeek.label}</span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-amber-900 mt-1 tracking-tight">
                {formatRupiah(weeklyTimeline.peakWeek.val)}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-snug">
              Alokasi penarikan dana terbesar tercatat pada minggu ini. Disarankan koordinasi cepat dengan PPK/KPPN.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigateToDetail('jadwal')}
              className="w-full text-center text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center justify-center gap-1 group"
            >
              <span>Buka Matriks Jadwal AJK</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Charts & Interactive Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 Cols): Capaian per Eselon I / Satker */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 size={18} className="text-blue-600" />
                <span>Kinerja Realisasi per Satuan Kerja / Eselon I</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Perbandingan penyerapan anggaran terhadap pagu masing-masing unit eselon I
              </p>
            </div>
            <button
              onClick={() => onNavigateToDetail('satker')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 whitespace-nowrap"
            >
              <span>Struktur Detail</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="space-y-3.5 pt-1">
            {satkerBreakdown.map((satker) => {
              const statusColor =
                satker.persentase >= 90
                  ? 'bg-emerald-500'
                  : satker.persentase >= 75
                  ? 'bg-amber-500'
                  : 'bg-rose-500';

              const badgeColor =
                satker.persentase >= 90
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : satker.persentase >= 75
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200';

              return (
                <div
                  key={satker.id || satker.nama}
                  onClick={() => setSelectedSatker(satker.nama)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedSatker === satker.nama
                      ? 'border-blue-500 bg-blue-50/30 shadow-xs'
                      : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {satker.nama}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({satker.roCount} RO)
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 font-mono">
                        {formatShortRupiah(satker.totalReal)} / {formatShortRupiah(satker.totalPagu)}
                      </span>
                      <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md border ${badgeColor}`}>
                        {satker.persentase}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${statusColor} rounded-full transition-all duration-700`}
                      style={{ width: `${Math.min(100, Math.max(0, satker.persentase))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (5 Cols): Proyeksi Arus Kas Mingguan (AJK Forecast) */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar size={18} className="text-teal-600" />
                  <span>Proyeksi Penarikan Kas Mingguan</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribusi rencana kas keluar 11 minggu (Okt–Des 2026)
                </p>
              </div>

              {/* Peak badge */}
              <div className="text-right flex-shrink-0">
                <span className="text-[10px] text-slate-400 font-medium block">Puncak Kas:</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold font-mono text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                  <span>{weeklyTimeline.peakWeek.label}</span>
                  <span>•</span>
                  <span>{formatRupiah(weeklyTimeline.peakWeek.val)}</span>
                </span>
              </div>
            </div>

            {/* Monthly Summary Chips */}
            <div className="grid grid-cols-3 gap-2 pt-3 pb-2">
              <div className="p-2 rounded-xl bg-sky-50/70 border border-sky-100 text-center">
                <span className="text-[10px] font-semibold text-sky-700 block">Oktober (3 Mgg)</span>
                <span className="text-xs font-bold font-mono text-sky-950 mt-0.5 block">
                  {formatShortRupiah(weeklyTimeline.monthlyTotals.okt)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-indigo-50/70 border border-indigo-100 text-center">
                <span className="text-[10px] font-semibold text-indigo-700 block">November (4 Mgg)</span>
                <span className="text-xs font-bold font-mono text-indigo-950 mt-0.5 block">
                  {formatShortRupiah(weeklyTimeline.monthlyTotals.nov)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100 text-center">
                <span className="text-[10px] font-semibold text-emerald-700 block">Desember (4 Mgg)</span>
                <span className="text-xs font-bold font-mono text-emerald-950 mt-0.5 block">
                  {formatShortRupiah(weeklyTimeline.monthlyTotals.des)}
                </span>
              </div>
            </div>

            {/* Recharts Vertical Column Chart */}
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTimeline.data} margin={{ top: 12, right: 6, left: -20, bottom: 2 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fontSize: 9.5, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    tickFormatter={(val) => formatShortRupiah(val)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg border border-slate-700 text-xs space-y-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-slate-200">{item.label}</span>
                              {item.isPeak && (
                                <span className="bg-amber-400 text-slate-950 font-bold px-1.5 py-0.2 rounded text-[10px]">
                                  Puncak Kas
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-bold font-mono text-emerald-400">
                              {formatRupiah(item.total)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Bulan {item.month}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {weeklyTimeline.data.map((entry, index) => {
                      const color = entry.isPeak
                        ? '#f59e0b'
                        : entry.month === 'Oktober'
                        ? '#0284c7'
                        : entry.month === 'November'
                        ? '#6366f1'
                        : '#10b981';
                      return <Cell key={`bar-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#0284c7]"></span>
                <span>Okt</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#6366f1]"></span>
                <span>Nov</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#10b981]"></span>
                <span>Des</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#f59e0b]"></span>
                <span className="font-semibold text-amber-800">Puncak</span>
              </span>
            </div>
            <button
              onClick={() => onNavigateToDetail('jadwal')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1"
            >
              <span>Lihat Matriks Lengkap</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Executive Alerts & Watchlist Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 Cols): 5 RO Perlu Perhatian / Intervensi Khusus Pimpinan */}
        <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-2xl border border-rose-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-rose-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <ShieldAlert size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-950">
                  Radar Intervensi Pimpinan (Early Warning RO Kritis)
                </h3>
                <p className="text-xs text-rose-700/80 mt-0.5">
                  5 Rincian Output dengan realisasi terendah atau sisa anggaran tertahan yang memerlukan percepatan
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateToDetail('ro')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 transition-colors"
            >
              Buka Semua RO
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-50/60 text-slate-700 font-semibold border-b border-rose-100 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Kode & Nama RO</th>
                  <th className="py-2.5 px-3">Unit Kerja</th>
                  <th className="py-2.5 px-3 text-right">Pagu</th>
                  <th className="py-2.5 px-3 text-right">Sisa Anggaran</th>
                  <th className="py-2.5 px-3 text-center">% Capaian</th>
                  <th className="py-2.5 px-3 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priorityROs.map((ro) => (
                  <tr key={ro.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[10px] border">
                          {ro.kodeRo}
                        </span>
                      </div>
                      <div className="text-xs text-slate-800 font-semibold line-clamp-1 mt-0.5" title={ro.namaRo}>
                        {ro.namaRo}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium text-[11px] whitespace-nowrap">
                      {ro.unitKerjaNama}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap font-medium">
                      {formatShortRupiah(ro.pagu)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-rose-700 whitespace-nowrap font-bold">
                      {formatShortRupiah(ro.sisa)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-rose-100 text-rose-800">
                        {ro.persentase}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => onNavigateToDetail('ro', ro.unitKerjaNama)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors shadow-2xs"
                      >
                        Periksa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (4 Cols): Unit Kerja Terbaik (Top Performers) */}
        <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-2xl border border-emerald-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 border-b border-emerald-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Award size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-950">
                  Unit Kerja Berkinerja Terbaik
                </h3>
                <p className="text-xs text-emerald-700/80 mt-0.5">
                  Unit kerja dengan persentase serapan anggaran tertinggi
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-3">
              {topUnits.map((u, idx) => (
                <div key={u.nama} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-900 line-clamp-1" title={u.nama}>
                      {idx + 1}. {u.nama}
                    </span>
                    <span className="font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                      {u.persentase}%
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>Realisasi: {formatShortRupiah(u.realisasi)}</span>
                    <span>Pagu: {formatShortRupiah(u.pagu)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigateToDetail('ranking')}
              className="w-full text-center text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center justify-center gap-1 group"
            >
              <span>Lihat Peringkat Seluruh Unit Kerja</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Quick Jump Action Banner */}
      <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers size={16} className="text-blue-600" />
            <span>Ingin Memeriksa Data Operasional & Sub-Komponen Belanja?</span>
          </h4>
          <p className="text-xs text-slate-600">
            Beralih ke tab <strong>Data & Rincian Operasional</strong> untuk melihat seluruh tabel 44 RO, mengedit rincian komponen (lisensi, ATK, server, konsumsi), dan matriks AJK mingguan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToDetail('ro')}
            className="px-4 py-2 text-xs font-semibold text-white bg-gov-700 hover:bg-gov-800 rounded-xl transition-colors shadow-2xs inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>Buka Rincian RO & Komponen</span>
            <ArrowRight size={13} />
          </button>
          <button
            onClick={() => onNavigateToDetail('jadwal')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors shadow-2xs inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>Matriks AJK Mingguan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
