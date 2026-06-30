// src/components/BudgetRealization/BudgetDashboard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { budgetService } from '../../services/BudgetService';
import { BudgetMaster, BudgetTransaction, MasterSumberDana } from '../../../types';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  ComposedChart, 
  Bar, 
  Line,
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  CartesianGrid
} from 'recharts';

interface BudgetDashboardProps {
  selectedDivisi: string;
  sumberDanaList: MasterSumberDana[];
  currentUser: any;
  refreshTrigger: number;
  selectedTahun: number;
}

const BudgetDashboard: React.FC<BudgetDashboardProps> = ({
  selectedDivisi,
  sumberDanaList,
  refreshTrigger,
  selectedTahun
}) => {
  const [masters, setMasters] = useState<BudgetMaster[]>([]);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [selectedSumberDanaId, setSelectedSumberDanaId] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(true);
  const [rekapView, setRekapView] = useState<'chart' | 'table'>('chart');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const mastersData = await budgetService.fetchBudgetMasters(selectedDivisi, undefined, selectedTahun);
      const trxData = await budgetService.fetchTransactions(selectedDivisi, selectedTahun);
      setMasters(mastersData);
      setTransactions(trxData);
    } catch (err) {
      console.error('Error fetching dashboard budget data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDivisi, selectedTahun]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  // Compute metrics based on selected source of funds
  const filteredMasters = useMemo(() => {
    if (selectedSumberDanaId === 'All') return masters;
    return masters.filter(m => m.sumberDanaId === selectedSumberDanaId);
  }, [masters, selectedSumberDanaId]);

  const masterIdsSet = useMemo(() => {
    return new Set(filteredMasters.map(m => m.id));
  }, [filteredMasters]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => masterIdsSet.has(t.masterId));
  }, [transactions, masterIdsSet]);

  const metrics = useMemo(() => {
    let totalPagu = 0;
    let totalRealisasi = 0;
    let totalOutstanding = 0;

    // Calculate realisasi and outstanding per master item
    const masterRealisasiMap = new Map<string, number>();
    const masterOutstandingMap = new Map<string, number>();

    filteredTransactions.forEach(t => {
      if (t.status === 'Outstanding') {
        const current = masterOutstandingMap.get(t.masterId) || 0;
        masterOutstandingMap.set(t.masterId, current + t.nominal);
      } else {
        const current = masterRealisasiMap.get(t.masterId) || 0;
        masterRealisasiMap.set(t.masterId, current + t.nominal);
      }
    });

    filteredMasters.forEach(m => {
      totalPagu += m.pagu;
      totalRealisasi += masterRealisasiMap.get(m.id) || 0;
      totalOutstanding += masterOutstandingMap.get(m.id) || 0;
    });

    const totalSisa = totalPagu - totalRealisasi - totalOutstanding;
    const persen = totalPagu > 0 ? ((totalRealisasi + totalOutstanding) / totalPagu) * 100 : 0;

    return {
      totalPagu,
      totalRealisasi,
      totalOutstanding,
      totalSisa,
      persen,
      masterRealisasiMap,
      masterOutstandingMap
    };
  }, [filteredMasters, filteredTransactions]);

  // Donut chart data
  const absorptionChartData = useMemo(() => {
    return [
      { name: 'Realisasi', value: metrics.totalRealisasi, color: '#10b981' }, // emerald-500
      { name: 'Outstanding', value: metrics.totalOutstanding, color: '#f59e0b' }, // amber-500
      { name: 'Sisa Anggaran', value: Math.max(0, metrics.totalSisa), color: '#3b82f6' } // blue-500
    ];
  }, [metrics]);

  // Monthly trends data
  const monthlyTrendsData = useMemo(() => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
      'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    
    const monthlyRealisasiMap = new Map<number, number>();
    const monthlyOutstandingMap = new Map<number, number>();

    filteredTransactions.forEach(t => {
      if (!t.tanggal) return;
      const date = new Date(t.tanggal);
      const monthIndex = date.getMonth();
      if (t.status === 'Outstanding') {
        const current = monthlyOutstandingMap.get(monthIndex) || 0;
        monthlyOutstandingMap.set(monthIndex, current + t.nominal);
      } else {
        const current = monthlyRealisasiMap.get(monthIndex) || 0;
        monthlyRealisasiMap.set(monthIndex, current + t.nominal);
      }
    });

    let cumulative = 0;
    return months.map((m, index) => {
      const real = monthlyRealisasiMap.get(index) || 0;
      const out = monthlyOutstandingMap.get(index) || 0;
      const total = real + out;
      cumulative += total;
      return {
        name: m,
        fullName: [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ][index],
        Realisasi: real,
        Outstanding: out,
        Total: total,
        Kumulatif: cumulative
      };
    });
  }, [filteredTransactions]);

  // Top KRO Absorption ranking
  const kroRankings = useMemo(() => {
    const kroMap = new Map<string, { name: string; pagu: number; realisasi: number; outstanding: number }>();

    filteredMasters.forEach(m => {
      const current = kroMap.get(m.kro) || { name: m.namaKro || m.kro, pagu: 0, realisasi: 0, outstanding: 0 };
      current.pagu += m.pagu;
      current.realisasi += metrics.masterRealisasiMap.get(m.id) || 0;
      current.outstanding += metrics.masterOutstandingMap.get(m.id) || 0;
      kroMap.set(m.kro, current);
    });

    const list = Array.from(kroMap.entries()).map(([kro, data]) => {
      const sisa = data.pagu - data.realisasi - data.outstanding;
      const totalBelanja = data.realisasi + data.outstanding;
      const persen = data.pagu > 0 ? (totalBelanja / data.pagu) * 100 : 0;
      return {
        kro,
        name: data.name,
        pagu: data.pagu,
        realisasi: data.realisasi,
        outstanding: data.outstanding,
        sisa,
        persen
      };
    });

    return list.sort((a, b) => b.persen - a.persen);
  }, [filteredMasters, metrics]);

  // Over budget items (sisa < 0)
  const alertBudgetItems = useMemo(() => {
    const alerts: Array<{ id: string; detail: string; pagu: number; realisasi: number; outstanding: number; sisa: number; persen: number }> = [];

    filteredMasters.forEach(m => {
      const realisasi = metrics.masterRealisasiMap.get(m.id) || 0;
      const outstanding = metrics.masterOutstandingMap.get(m.id) || 0;
      const sisa = m.pagu - realisasi - outstanding;
      const totalBelanja = realisasi + outstanding;
      const persen = m.pagu > 0 ? (totalBelanja / m.pagu) * 100 : 0;

      if (sisa < 0) {
        alerts.push({
          id: m.id,
          detail: m.detail,
          pagu: m.pagu,
          realisasi,
          outstanding,
          sisa,
          persen
        });
      }
    });

    return alerts.sort((a, b) => b.persen - a.persen);
  }, [filteredMasters, metrics]);

  // Top 5 highest expenditure transactions
  const topExpenditures = useMemo(() => {
    return [...filteredTransactions]
      .sort((a, b) => b.nominal - a.nominal)
      .slice(0, 5);
  }, [filteredTransactions]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-gov-200 border-t-gov-600 rounded-full animate-spin mb-3"></div>
        <span className="text-sm text-slate-500 font-medium">Memuat data dashboard...</span>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Sumber Dana Filter */}
      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200/80 shadow-sm">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sumber Dana:</span>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedSumberDanaId('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedSumberDanaId === 'All' 
                ? 'bg-gov-600 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Sumber
          </button>
          {sumberDanaList.map((sd) => (
            <button
              key={sd.id}
              onClick={() => setSelectedSumberDanaId(sd.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedSumberDanaId === sd.id 
                  ? 'bg-gov-600 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sd.name}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        
        {/* Total Pagu */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-500 group-hover:w-2 transition-all"></div>
          <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider mb-1.5">Total Pagu</p>
          <h3 className="text-lg sm:text-xl font-black text-slate-800 leading-tight">
            {formatCurrency(metrics.totalPagu)}
          </h3>
          <p className="text-xs text-slate-400 mt-2.5 font-semibold">Batas alokasi anggaran</p>
        </div>
 
        {/* Total Realisasi */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500 group-hover:w-2 transition-all"></div>
          <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider mb-1.5">Total Realisasi</p>
          <h3 className="text-lg sm:text-xl font-black text-emerald-600 leading-tight">
            {formatCurrency(metrics.totalRealisasi)}
          </h3>
          <p className="text-xs text-slate-400 mt-2.5 font-semibold flex items-center gap-1">
            <TrendingUp size={12} className="text-emerald-500 animate-pulse" />
            <span>Anggaran terbayar</span>
          </p>
        </div>

        {/* Total Outstanding */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-amber-500 group-hover:w-2 transition-all"></div>
          <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider mb-1.5">Total Outstanding</p>
          <h3 className="text-lg sm:text-xl font-black text-amber-600 leading-tight">
            {formatCurrency(metrics.totalOutstanding)}
          </h3>
          <p className="text-xs text-slate-400 mt-2.5 font-semibold flex items-center gap-1">
            <TrendingDown size={12} className="text-amber-500" />
            <span>Kwitansi belum cair</span>
          </p>
        </div>
 
        {/* Sisa Anggaran */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-orange-500 group-hover:w-2 transition-all"></div>
          <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sisa Anggaran</p>
          <h3 className={`text-lg sm:text-xl font-black leading-tight ${metrics.totalSisa < 0 ? 'text-red-600' : 'text-slate-800'}`}>
            {formatCurrency(metrics.totalSisa)}
          </h3>
          <p className="text-xs text-slate-400 mt-2.5 font-semibold">
            {metrics.totalSisa < 0 ? (
              <span className="text-red-500 font-bold flex items-center gap-1">
                <AlertTriangle size={12} /> Defisit anggaran
              </span>
            ) : (
              <span>Sisa pagu tersedia</span>
            )}
          </p>
        </div>
 
        {/* Persentase Serapan */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-purple-500 group-hover:w-2 transition-all"></div>
          <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider mb-1.5">Persentase Serapan</p>
          <h3 className="text-lg sm:text-xl font-black text-purple-700 leading-none flex items-baseline gap-0.5">
            {metrics.persen.toFixed(2)}
            <span className="text-xs font-bold text-purple-500">%</span>
          </h3>
          {/* Subtle micro progress bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${metrics.persen >= 100 ? 'bg-red-500' : metrics.persen >= 70 ? 'bg-purple-600' : 'bg-gov-500'}`}
              style={{ width: `${Math.min(100, metrics.persen)}%` }}
            ></div>
          </div>
        </div>
 
      </div>

      {/* Recharts Visualizations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Donut Absorption Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col items-center">
          <h4 className="text-sm font-bold text-slate-700 w-full mb-3 text-left">
            Absorpsi Anggaran Belanja
          </h4>
          <div className="w-full h-[220px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={absorptionChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {absorptionChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Nominal']}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Label */}
            <div className="absolute flex flex-col items-center">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Serapan</span>
              <span className="text-xl font-extrabold text-slate-800">{metrics.persen.toFixed(1)}%</span>
            </div>
          </div>
          
          {/* Legend Items */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-2 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
              <span>Realisasi ({((metrics.totalRealisasi / (metrics.totalPagu || 1)) * 100).toFixed(0)}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-amber-500 rounded-sm"></div>
              <span>Outstanding ({((metrics.totalOutstanding / (metrics.totalPagu || 1)) * 100).toFixed(0)}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
              <span>Sisa ({((Math.max(0, metrics.totalSisa) / (metrics.totalPagu || 1)) * 100).toFixed(0)}%)</span>
            </div>
          </div>
        </div>

        {/* Monthly Trend Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
            <h4 className="text-sm font-bold text-slate-700">
              Tren & Rekapitulasi Bulanan
            </h4>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setRekapView('chart')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  rekapView === 'chart' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Grafik
              </button>
              <button
                onClick={() => setRekapView('table')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  rekapView === 'table' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Tabel Data
              </button>
            </div>
          </div>

          <div className="w-full h-[240px]">
            {rekapView === 'chart' ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={monthlyTrendsData}
                  margin={{ top: 10, right: -5, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => `Rp ${(val / 1000000).toLocaleString('id-ID')}jt`}
                  />
                  <Tooltip 
                    formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  <Bar dataKey="Realisasi" fill="#10b981" stackId="a" />
                  <Bar dataKey="Outstanding" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="Kumulatif" name="Kumulatif Belanja" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="overflow-auto h-full scrollbar-thin">
                <table className="w-full border-collapse text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase sticky top-0 text-xs">
                    <tr>
                      <th className="px-3 py-2">Bulan</th>
                      <th className="px-3 py-2 text-right">Realisasi</th>
                      <th className="px-3 py-2 text-right">Outstanding</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-right">Kumulatif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {monthlyTrendsData.map((r) => (
                      <tr key={r.name} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-2 font-bold text-slate-600">{r.fullName}</td>
                        <td className="px-3 py-2 text-right text-emerald-600 font-bold">{formatCurrency(r.Realisasi)}</td>
                        <td className="px-3 py-2 text-right text-amber-600 font-bold">{formatCurrency(r.Outstanding)}</td>
                        <td className="px-3 py-2 text-right text-slate-800 font-extrabold">{formatCurrency(r.Total)}</td>
                        <td className="px-3 py-2 text-right text-slate-400 font-medium">{formatCurrency(r.Kumulatif)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Ranked lists and warnings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* KRO Absorption Ranking */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col h-[380px]">
          <h4 className="text-sm font-bold text-slate-700 mb-3">
            Peringkat Serapan KRO
          </h4>
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
            {kroRankings.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-xs">Belum ada data KRO</div>
            ) : (
              kroRankings.map((k, index) => (
                <div key={k.kro} className="space-y-1">
                  <div className="flex justify-between text-xs sm:text-sm font-bold">
                    <span className="text-slate-700 truncate max-w-[170px]" title={k.name}>
                      {index + 1}. {k.kro} - {k.name}
                    </span>
                    <span className="text-gov-600 font-extrabold">{k.persen.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        k.persen >= 100 ? 'bg-red-500' : k.persen >= 70 ? 'bg-amber-500' : 'bg-gov-500'
                      }`}
                      style={{ width: `${Math.min(100, k.persen)}%` }}
                    ></div>
                  </div>
                  <div className="flex flex-col text-xs text-slate-500 font-medium gap-0.5 mt-0.5">
                    <div className="flex justify-between">
                      <span>Pagu: {formatCurrency(k.pagu)}</span>
                      <span>Sisa: <span className={k.sisa < 0 ? 'text-red-600 font-bold' : ''}>{formatCurrency(k.sisa)}</span></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-emerald-600">Realisasi: {formatCurrency(k.realisasi)}</span>
                      <span className="text-amber-600">Outstanding: {formatCurrency(k.outstanding)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Budget Alert Warnings */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col h-[380px]">
          <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
            <AlertTriangle size={16} className="text-red-500" />
            <span>Peringatan Defisit Pagu</span>
          </h4>
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
            {alertBudgetItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
                <CheckCircle2 size={36} className="text-emerald-500 mb-2" />
                <span className="text-xs font-semibold text-slate-600">Semua Pagu Aman</span>
                <span className="text-xs text-slate-400">Belum ada pagu yang defisit (over budget).</span>
              </div>
            ) : (
              alertBudgetItems.map((item) => {
                return (
                  <div 
                    key={item.id} 
                    className="p-3 rounded-lg border text-xs leading-relaxed relative overflow-hidden bg-red-50/50 border-red-200 text-red-900"
                  >
                    <div className="absolute right-2 top-2">
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-red-200 text-red-800">
                        OVER BUDGET
                      </span>
                    </div>
                    <p className="font-bold pr-20 text-sm truncate" title={item.detail}>
                      {item.detail}
                    </p>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-xs font-medium text-slate-500">
                      <div>Pagu: <span className="font-semibold text-slate-700">{formatCurrency(item.pagu)}</span></div>
                      <div>Sisa: <span className="font-bold text-red-600">{formatCurrency(item.sisa)}</span></div>
                      <div className="text-emerald-700">Realisasi: <span className="font-semibold">{formatCurrency(item.realisasi)}</span></div>
                      <div className="text-amber-700">Outstanding: <span className="font-semibold">{formatCurrency(item.outstanding)}</span></div>
                      <div className="col-span-2">Total Serapan: <span className="font-bold text-slate-700">{item.persen.toFixed(1)}%</span></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Expenditures */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col h-[380px]">
          <h4 className="text-sm font-bold text-slate-700 mb-3">
            Pengeluaran Terbesar
          </h4>
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
            {topExpenditures.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-xs">Belum ada transaksi pengeluaran</div>
            ) : (
              topExpenditures.map((t, idx) => (
                <div key={t.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 flex items-center justify-between gap-3 text-xs sm:text-sm">
                  <div className="overflow-hidden flex-1">
                    <p className="font-bold text-slate-800 truncate text-sm" title={t.master?.detail || t.uraian}>
                      {idx + 1}. {t.master?.detail || t.uraian}
                    </p>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5" title={t.uraian}>
                      {t.uraian}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-medium flex items-center gap-1.5 flex-wrap">
                      <span>{new Date(t.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {t.master && <span>| RO: {t.master.ro}</span>}
                      <span className={`px-1.5 py-0.2 rounded text-xs font-bold ${
                        t.status === 'Outstanding' 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {t.status || 'Realisasi'}
                      </span>
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-black text-sm text-slate-800 block">
                      {formatCurrency(t.nominal)}
                    </span>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      {t.master?.sumberDana?.name || 'APBN'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default BudgetDashboard;
