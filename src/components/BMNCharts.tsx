// src/components/BMNCharts.tsx
// Data visualizations for BMN Dashboard using recharts library
// Validates: Requirements 2.6, 2.7, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9

import React, { useMemo } from 'react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { Package } from 'lucide-react';
import { BMNItem } from '../../types';

interface BMNChartsProps {
  bmnItems: BMNItem[];
  isLoading?: boolean;
  isSingleSatkerView?: boolean;
  satkerName?: string;
}

/**
 * Format number with thousand separators
 * Validates: Requirements 2.10
 */
const formatNumber = (num: number): string => {
  return num.toLocaleString('id-ID');
};

/**
 * Format currency with thousand separators
 */
const formatCurrency = (value: number): string => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}M`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}Jt`;
  }
  return formatNumber(value);
};

// Color schemes for charts - accessible and consistent
const STATUS_COLORS: Record<string, string> = {
  'Aktif': '#10b981',      // green
  'Tidak Aktif': '#94a3b8', // slate
  'Hilang': '#ef4444',     // red
  'Rusak': '#f59e0b',      // amber
};

const KONDISI_COLORS: Record<string, string> = {
  'Baik': '#10b981',           // green
  'Rusak Ringan': '#f59e0b',   // amber
  'Rusak Berat': '#ef4444',    // red
};

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#14b8a6', '#84cc16', '#f97316', '#ef4444'];

/**
 * Custom label for pie chart
 */
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null; // Don't show for very small slices

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

/**
 * Custom tooltip for charts
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
      <p className="text-sm font-bold text-slate-800 mb-1">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-xs font-medium" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' && entry.name.includes('Nilai') 
            ? `Rp ${formatNumber(entry.value)}`
            : formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
};

const BMNCharts: React.FC<BMNChartsProps> = ({ 
  bmnItems, 
  isLoading = false,
  isSingleSatkerView = false,
  satkerName
}) => {
  // 1. Status BMN Distribution (Pie Chart)
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {
      'Aktif': 0,
      'Tidak Aktif': 0,
      'Hilang': 0,
      'Rusak': 0,
    };

    bmnItems.forEach(item => {
      if (counts[item.statusBMN] !== undefined) {
        counts[item.statusBMN]++;
      }
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0);
  }, [bmnItems]);

  // 2. Kondisi Distribution (Bar Chart)
  const kondisiData = useMemo(() => {
    const counts: Record<string, number> = {
      'Baik': 0,
      'Rusak Ringan': 0,
      'Rusak Berat': 0,
    };

    bmnItems.forEach(item => {
      if (item.kondisi && counts[item.kondisi] !== undefined) {
        counts[item.kondisi]++;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [bmnItems]);

  // 3. Top 10 Jenis BMN by count (Bar Chart)
  const jenisBMNData = useMemo(() => {
    const counts: Record<string, number> = {};

    bmnItems.forEach(item => {
      if (item.jenisBMN) {
        counts[item.jenisBMN] = (counts[item.jenisBMN] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [bmnItems]);

  // 4. Umur Aset Distribution (Line Chart)
  // Use umurAset from Excel data, not calculated
  const umurAsetData = useMemo(() => {
    const ageCounts: Record<string, number> = {};

    bmnItems.forEach(item => {
      // Use umurAset from Excel if available
      if (item.umurAset !== undefined && item.umurAset !== null) {
        const age = item.umurAset;
        const range = Math.floor(age / 5) * 5; // Group by 5-year ranges
        const rangeLabel = `${range}-${range + 4} tahun`;
        ageCounts[rangeLabel] = (ageCounts[rangeLabel] || 0) + 1;
      }
    });

    // Sort by range
    return Object.entries(ageCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        const aStart = parseInt(a.name.split('-')[0]);
        const bStart = parseInt(b.name.split('-')[0]);
        return aStart - bStart;
      });
  }, [bmnItems]);

  // 5. Nilai Perolehan per Satker (Bar Chart)
  const nilaiPerSatkerData = useMemo(() => {
    const satkerValues: Record<string, number> = {};

    bmnItems.forEach(item => {
      if (item.namaSatker) {
        const nilai = item.nilaiPerolehan || 0;
        satkerValues[item.namaSatker] = (satkerValues[item.namaSatker] || 0) + nilai;
      }
    });

    return Object.entries(satkerValues)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 satker
  }, [bmnItems]);

  // 6. Trend Perolehan BMN per Tahun (for single satker view)
  // Use tahunPerolehan from Excel data as-is
  const trendPerolehanData = useMemo(() => {
    if (!isSingleSatkerView) return [];

    const yearCounts: Record<number, { count: number; value: number }> = {};

    bmnItems.forEach(item => {
      // Use tahunPerolehan directly from Excel data
      if (item.tahunPerolehan) {
        const year = item.tahunPerolehan;
        if (!yearCounts[year]) {
          yearCounts[year] = { count: 0, value: 0 };
        }
        yearCounts[year].count++;
        yearCounts[year].value += item.nilaiPerolehan || 0;
      }
    });

    const result = Object.entries(yearCounts)
      .map(([year, data]) => ({ 
        name: year, 
        'Jumlah BMN': data.count,
        'Nilai Perolehan': data.value
      }))
      .sort((a, b) => parseInt(a.name) - parseInt(b.name));
    
    // Debug log
    console.log('Trend Perolehan Data:', result);
    console.log('Sample items with tahunPerolehan:', bmnItems.slice(0, 5).map(item => ({
      namaBarang: item.namaBarang,
      tahunPerolehan: item.tahunPerolehan,
      umurAset: item.umurAset
    })));
    
    return result;
  }, [bmnItems, isSingleSatkerView]);

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-pulse">
            <div className="bg-slate-100 h-6 w-48 mb-4 rounded"></div>
            <div className="bg-slate-100 h-64 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (bmnItems.length === 0) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 mb-8">
        <div className="text-center text-slate-500">
          <Package size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm md:text-base">Tidak ada data untuk ditampilkan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-8">
      {/* Row 1: Status Pie Chart and Kondisi Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status BMN Distribution - Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">
            Distribusi Status BMN
            {isSingleSatkerView && satkerName && (
              <span className="text-sm font-normal text-slate-500 ml-2">({satkerName})</span>
            )}
          </h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderPieLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  wrapperStyle={{ fontSize: '12px', fontWeight: 600 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              Tidak ada data
            </div>
          )}
        </div>

        {/* Kondisi Distribution - Bar Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">
            Distribusi Kondisi
            {isSingleSatkerView && satkerName && (
              <span className="text-sm font-normal text-slate-500 ml-2">({satkerName})</span>
            )}
          </h3>
          {kondisiData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={kondisiData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {kondisiData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={KONDISI_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              Tidak ada data
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Top 10 Jenis BMN - Bar Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          Top 10 Jenis BMN
          {isSingleSatkerView && satkerName && (
            <span className="text-sm font-normal text-slate-500 ml-2">({satkerName})</span>
          )}
        </h3>
        {jenisBMNData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={jenisBMNData} layout="vertical" margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis 
                type="number" 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                width={140}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#6366f1" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
            Tidak ada data
          </div>
        )}
      </div>

      {/* Row 3: Different charts based on view mode */}
      {isSingleSatkerView ? (
        // Single Satker View: Show Trend over Time and Umur Aset
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend Perolehan BMN per Tahun - Dual Axis Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Trend Perolehan BMN per Tahun
              {satkerName && (
                <span className="text-sm font-normal text-slate-500 ml-2">({satkerName})</span>
              )}
            </h3>
            {trendPerolehanData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={trendPerolehanData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                  />
                  <YAxis 
                    yAxisId="left"
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px', fontWeight: 600 }}
                  />
                  <Bar yAxisId="left" dataKey="Jumlah BMN" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="Nilai Perolehan" 
                    stroke="#ec4899" 
                    strokeWidth={3}
                    dot={{ fill: '#ec4899', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                Tidak ada data tahun perolehan
              </div>
            )}
          </div>

          {/* Umur Aset Distribution - Line Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Distribusi Umur Aset
              {satkerName && (
                <span className="text-sm font-normal text-slate-500 ml-2">({satkerName})</span>
              )}
            </h3>
            {umurAsetData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={umurAsetData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                Tidak ada data
              </div>
            )}
          </div>
        </div>
      ) : (
        // All Satkers View: Show Umur Aset and Nilai per Satker
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Umur Aset Distribution - Line Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Distribusi Umur Aset</h3>
            {umurAsetData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={umurAsetData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                Tidak ada data
              </div>
            )}
          </div>

          {/* Nilai Perolehan per Satker - Bar Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Nilai Perolehan per Satker (Top 10)</h3>
            {nilaiPerSatkerData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={nilaiPerSatkerData} margin={{ top: 5, right: 30, left: 0, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#ec4899" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                Tidak ada data nilai perolehan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(BMNCharts);
