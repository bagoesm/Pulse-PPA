// src/components/MonitoringCapaian/RankingCapaianView.tsx
import React, { useState, useMemo } from 'react';
import {
  CapaianSatker,
  CapaianUnitKerja,
  StatusCapaian
} from '../../types/monitoringCapaian';
import {
  Trophy,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Building2,
  Filter,
  Medal,
  Award,
  AlertCircle,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface RankingCapaianViewProps {
  satkers: CapaianSatker[];
  unitKerjas: CapaianUnitKerja[];
}

export const RankingCapaianView: React.FC<RankingCapaianViewProps> = ({
  satkers,
  unitKerjas
}) => {
  const [level, setLevel] = useState<'unit' | 'satker'>('unit');
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  const [satkerFilter, setSatkerFilter] = useState<string>('All');

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getStatusBadge = (status: StatusCapaian, pct: number) => {
    if (status === 'Sesuai Target') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={12} className="text-emerald-500" />
          <span>Sesuai Target ({pct}%)</span>
        </span>
      );
    }
    if (status === 'Perlu Perhatian') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle size={12} className="text-amber-500" />
          <span>Perlu Perhatian ({pct}%)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <AlertCircle size={12} className="text-rose-500" />
        <span>Perlu Intervensi ({pct}%)</span>
      </span>
    );
  };

  const getRankBadge = (rank: number) => {
    if (order === 'desc') {
      if (rank === 1) {
        return (
          <span className="inline-flex items-center gap-1 font-mono font-black text-xs px-2.5 py-1 rounded-md bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 border border-amber-400 shadow-2xs">
            <Trophy size={12} className="text-amber-800" />
            <span>#1</span>
          </span>
        );
      }
      if (rank === 2) {
        return (
          <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 text-slate-800 border border-slate-300 shadow-2xs">
            <Medal size={12} className="text-slate-600" />
            <span>#2</span>
          </span>
        );
      }
      if (rank === 3) {
        return (
          <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-gradient-to-r from-orange-200 via-amber-100 to-orange-200 text-orange-950 border border-orange-300 shadow-2xs">
            <Award size={12} className="text-orange-700" />
            <span>#3</span>
          </span>
        );
      }
    }
    return (
      <span className="inline-flex items-center justify-center font-mono font-medium text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
        #{rank}
      </span>
    );
  };

  const rankedData = useMemo(() => {
    if (level === 'satker') {
      const sorted = [...satkers].sort((a, b) => {
        return order === 'desc' ? b.persentase - a.persentase : a.persentase - b.persentase;
      });
      return sorted.map((s, idx) => ({
        rank: idx + 1,
        id: s.id,
        nama: s.nama,
        induk: 'Kementerian Pemberdayaan Perempuan dan Perlindungan Anak',
        pagu: s.pagu,
        realisasi: s.realisasi,
        sisa: s.sisa,
        persentase: s.persentase,
        status: s.status,
        roCount: s.roCount
      }));
    } else {
      let filtered = [...unitKerjas];
      if (satkerFilter !== 'All') {
        filtered = filtered.filter(u => u.satkerNama === satkerFilter);
      }
      const sorted = filtered.sort((a, b) => {
        return order === 'desc' ? b.persentase - a.persentase : a.persentase - b.persentase;
      });
      return sorted.map((u, idx) => ({
        rank: idx + 1,
        id: u.id,
        nama: u.nama,
        induk: u.satkerNama,
        pagu: u.pagu,
        realisasi: u.realisasi,
        sisa: u.sisa,
        persentase: u.persentase,
        status: u.status,
        roCount: u.roCount
      }));
    }
  }, [level, order, satkers, unitKerjas, satkerFilter]);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Control bar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Trophy className="text-amber-500" size={20} />
            Peringkat Realisasi Penyerapan Anggaran
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis urutan capaian realisasi tertinggi dan terendah untuk akselerasi penyerapan anggaran.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Level Toggle: Unit Kerja vs Satker */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
            <button
              onClick={() => setLevel('unit')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                level === 'unit'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unit Kerja
            </button>
            <button
              onClick={() => setLevel('satker')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                level === 'satker'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Satuan Kerja
            </button>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all shadow-2xs ${
              order === 'desc'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            }`}
          >
            {order === 'desc' ? (
              <>
                <TrendingUp size={14} className="text-emerald-600" />
                <span>Tertinggi ke Terendah</span>
              </>
            ) : (
              <>
                <TrendingDown size={14} className="text-rose-600" />
                <span>Terendah ke Tertinggi</span>
              </>
            )}
          </button>

          {/* Satker Filter for Unit Kerja */}
          {level === 'unit' && (
            <select
              value={satkerFilter}
              onChange={(e) => setSatkerFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">Semua Satker Induk</option>
              {satkers.map(s => (
                <option key={s.id} value={s.nama}>{s.nama}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Top 3 Spotlight Cards (Only when order is desc) */}
      {order === 'desc' && rankedData.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rankedData.slice(0, 3).map((item, idx) => {
            const cardStyles = [
              'border-2 border-amber-400/90 bg-gradient-to-br from-amber-100/60 via-amber-50/40 to-white text-amber-950 shadow-md',
              'border-2 border-slate-300/90 bg-gradient-to-br from-slate-100/70 via-slate-50/40 to-white text-slate-900 shadow-md',
              'border-2 border-orange-300/90 bg-gradient-to-br from-orange-100/50 via-orange-50/30 to-white text-orange-950 shadow-md'
            ];
            const rankBadges = [
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-bold text-xs shadow-xs"><Trophy size={13} /> #1 Juara Capaian</span>,
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-600 text-white font-bold text-xs shadow-xs"><Medal size={13} /> #2 Runner Up</span>,
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-600 text-white font-bold text-xs shadow-xs"><Award size={13} /> #3 Peringkat Tiga</span>
            ];

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-xl ${cardStyles[idx]} flex flex-col justify-between transition-all hover:scale-[1.01]`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    {rankBadges[idx]}
                    <span className="text-2xl font-black font-mono tabular-nums text-slate-900">{item.persentase}%</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm line-clamp-2">
                    {item.nama}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                    {item.induk}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-semibold">Realisasi</span>
                    <span className="font-bold font-mono tabular-nums text-emerald-700 text-sm">{formatRupiah(item.realisasi)}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-500 uppercase font-semibold">Pagu</span>
                    <span className="font-medium font-mono tabular-nums text-slate-700">{formatRupiah(item.pagu)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 font-bold text-xs border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 text-center w-16">Peringkat</th>
                <th className="py-3.5 px-4">{level === 'unit' ? 'Unit Kerja' : 'Satuan Kerja'}</th>
                <th className="py-3.5 px-4 text-right">Pagu (Rp)</th>
                <th className="py-3.5 px-4 text-right">Realisasi (Rp)</th>
                <th className="py-3.5 px-4 text-right">Sisa Anggaran (Rp)</th>
                <th className="py-3.5 px-4 w-44">Persentase & Progress</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rankedData.map((item) => {
                const rowClass =
                  order === 'desc' && item.rank === 1
                    ? 'bg-amber-50/30 hover:bg-amber-50/60'
                    : order === 'desc' && item.rank === 2
                    ? 'bg-slate-50/50 hover:bg-slate-100/60'
                    : order === 'desc' && item.rank === 3
                    ? 'bg-orange-50/20 hover:bg-orange-50/50'
                    : 'hover:bg-blue-50/40';

                return (
                  <tr key={item.id} className={`${rowClass} transition-colors border-b border-slate-100`}>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex justify-center">
                        {getRankBadge(item.rank)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{item.nama}</div>
                        {level === 'unit' && (
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <span className="text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100/60">{item.induk}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500 font-medium">{item.roCount} RO</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-right font-semibold text-slate-700">
                      {formatRupiah(item.pagu)}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-right font-bold text-emerald-700">
                      <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200/60">
                        {formatRupiah(item.realisasi)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-right font-medium text-slate-600">
                      {formatRupiah(item.sisa)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold font-mono tabular-nums">
                          <span className="text-slate-900">{item.persentase}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                          <div
                            className={`h-full transition-all duration-500 ${
                              item.status === 'Sesuai Target'
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                : item.status === 'Perlu Perhatian'
                                ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                                : 'bg-gradient-to-r from-rose-500 to-red-600'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, item.persentase))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(item.status, item.persentase)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
