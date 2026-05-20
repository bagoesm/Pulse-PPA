// src/components/BMNStatsCards.tsx
// Statistics cards for BMN Dashboard displaying key metrics
// Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.10, 2.11, 2.12

import React from 'react';
import { Package, Activity, Wrench, TrendingUp } from 'lucide-react';
import { useCountAnimation } from '../hooks/useCountAnimation';
import { BMNItem } from '../../types';

interface BMNStatsCardsProps {
    bmnItems: BMNItem[];
    isLoading?: boolean;
}

/**
 * Format number with thousand separators
 * Validates: Requirements 2.10
 */
const formatNumber = (num: number): string => {
    return num.toLocaleString('id-ID');
};

/**
 * Calculate statistics from BMN items
 */
const calculateStats = (items: BMNItem[]) => {
    const totalCount = items.length;
    
    // Status distribution
    const statusDistribution = {
        aktif: items.filter(item => item.statusBMN === 'Aktif').length,
        tidakAktif: items.filter(item => item.statusBMN === 'Tidak Aktif').length,
        hilang: items.filter(item => item.statusBMN === 'Hilang').length,
        rusak: items.filter(item => item.statusBMN === 'Rusak').length,
    };
    
    // Condition distribution
    const kondisiDistribution = {
        baik: items.filter(item => item.kondisi === 'Baik').length,
        rusakRingan: items.filter(item => item.kondisi === 'Rusak Ringan').length,
        rusakBerat: items.filter(item => item.kondisi === 'Rusak Berat').length,
    };
    
    // Calculate total value
    const totalValue = items.reduce((sum, item) => sum + (item.nilaiPerolehan || 0), 0);
    
    return {
        totalCount,
        statusDistribution,
        kondisiDistribution,
        totalValue
    };
};

const BMNStatsCards: React.FC<BMNStatsCardsProps> = ({ bmnItems, isLoading = false }) => {
    const stats = calculateStats(bmnItems);
    
    // Animated counts with staggered delays
    const animatedTotalCount = useCountAnimation(stats.totalCount, { duration: 1500, delay: 100 });
    const animatedAktif = useCountAnimation(stats.statusDistribution.aktif, { duration: 1500, delay: 250 });
    const animatedBaik = useCountAnimation(stats.kondisiDistribution.baik, { duration: 1500, delay: 400 });
    const animatedRusakRingan = useCountAnimation(stats.kondisiDistribution.rusakRingan, { duration: 1500, delay: 400 });
    const animatedRusakBerat = useCountAnimation(stats.kondisiDistribution.rusakBerat, { duration: 1500, delay: 400 });
    
    // Calculate percentages for status
    const activePercentage = stats.totalCount > 0 
        ? Math.round((stats.statusDistribution.aktif / stats.totalCount) * 100) 
        : 0;
    const animatedActivePercentage = useCountAnimation(activePercentage, { duration: 1500, delay: 250 });
    
    // Calculate percentages for condition
    const goodConditionPercentage = stats.totalCount > 0 
        ? Math.round((stats.kondisiDistribution.baik / stats.totalCount) * 100) 
        : 0;
    const animatedGoodConditionPercentage = useCountAnimation(goodConditionPercentage, { duration: 1500, delay: 400 });

    // Loading state
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 animate-pulse">
                        <div className="flex items-center justify-between mb-2 md:mb-3">
                            <div className="p-1.5 md:p-2 bg-slate-100 rounded-lg w-10 h-10"></div>
                            <div className="bg-slate-100 px-2 py-1 rounded-full w-12 h-5"></div>
                        </div>
                        <div className="bg-slate-100 h-8 w-16 mb-1 rounded"></div>
                        <div className="bg-slate-100 h-4 w-24 rounded"></div>
                    </div>
                ))}
            </div>
        );
    }

    // Empty state
    if (stats.totalCount === 0) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 md:mb-8">
                <div className="text-center text-slate-500">
                    <Package size={48} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-sm md:text-base">Belum ada data BMN yang diupload</p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            {/* Total BMN Count */}
            <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all transform hover:scale-105">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div className="p-1.5 md:p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <Package size={18} />
                    </div>
                    <span className="text-[10px] md:text-xs font-medium text-slate-500 bg-slate-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">
                        Total
                    </span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-0.5 md:mb-1 tabular-nums">
                    {formatNumber(animatedTotalCount)}
                </h3>
                <p className="text-xs md:text-sm text-slate-500">Total BMN</p>
            </div>

            {/* Active Status */}
            <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all transform hover:scale-105">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div className="p-1.5 md:p-2 bg-green-100 text-green-600 rounded-lg">
                        <Activity size={18} />
                    </div>
                    <span className="text-[10px] md:text-xs font-medium text-green-600 bg-green-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full tabular-nums">
                        {animatedActivePercentage}%
                    </span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-0.5 md:mb-1 tabular-nums">
                    {formatNumber(animatedAktif)}
                </h3>
                <p className="text-xs md:text-sm text-slate-500">BMN Aktif</p>
                <div className="mt-2 text-[10px] md:text-xs text-slate-400">
                    Tidak Aktif: {formatNumber(stats.statusDistribution.tidakAktif)} | 
                    Hilang: {formatNumber(stats.statusDistribution.hilang)} | 
                    Rusak: {formatNumber(stats.statusDistribution.rusak)}
                </div>
            </div>

            {/* Good Condition */}
            <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all transform hover:scale-105">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div className="p-1.5 md:p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <Wrench size={18} />
                    </div>
                    <span className="text-[10px] md:text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full tabular-nums">
                        {animatedGoodConditionPercentage}%
                    </span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-0.5 md:mb-1 tabular-nums">
                    {formatNumber(animatedBaik)}
                </h3>
                <p className="text-xs md:text-sm text-slate-500">Kondisi Baik</p>
                <div className="mt-2 text-[10px] md:text-xs text-slate-400">
                    Rusak Ringan: {formatNumber(animatedRusakRingan)} | 
                    Rusak Berat: {formatNumber(animatedRusakBerat)}
                </div>
            </div>

            {/* Total Value */}
            <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all transform hover:scale-105">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div className="p-1.5 md:p-2 bg-purple-100 text-purple-600 rounded-lg">
                        <TrendingUp size={18} />
                    </div>
                    <span className="text-[10px] md:text-xs font-medium text-purple-600 bg-purple-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">
                        IDR
                    </span>
                </div>
                <h3 className="text-base md:text-lg font-bold text-slate-800 mb-0.5 md:mb-1 tabular-nums">
                    {formatNumber(Math.round(stats.totalValue / 1000000))}M
                </h3>
                <p className="text-xs md:text-sm text-slate-500">Total Nilai Perolehan</p>
                <div className="mt-2 text-[10px] md:text-xs text-slate-400">
                    Rp {formatNumber(stats.totalValue)}
                </div>
            </div>
        </div>
    );
};

export default React.memo(BMNStatsCards);
