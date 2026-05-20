// src/components/BMNFilterPanel.tsx
// Filter panel component for BMN list view
// Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.9, 13.4

import React, { useState, useMemo } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { BMNItem, BMNStatus, BMNKondisi } from '../../types';
import { UseBMNFiltersResult } from '../hooks/useBMNFilters';
import SearchableSelect from './SearchableSelect';

interface BMNFilterPanelProps {
    bmnItems: BMNItem[];
    filterHook: UseBMNFiltersResult;
}

const BMNFilterPanel: React.FC<BMNFilterPanelProps> = ({ bmnItems, filterHook }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const {
        jenisBMN,
        setJenisBMN,
        statusBMN,
        setStatusBMN,
        kondisi,
        setKondisi,
        namaSatker,
        setNamaSatker,
        nilaiPerolehanMin,
        setNilaiPerolehanMin,
        nilaiPerolehanMax,
        setNilaiPerolehanMax,
        umurAsetMin,
        setUmurAsetMin,
        umurAsetMax,
        setUmurAsetMax,
        resetFilters,
        hasActiveFilters
    } = filterHook;

    // Extract unique values from bmnItems for dropdown options
    const uniqueJenisBMN = useMemo(() => {
        const unique = Array.from(new Set(
            bmnItems
                .map(item => item.jenisBMN)
                .filter((value): value is string => !!value)
        )).sort();
        return unique.map(value => ({ value, label: value }));
    }, [bmnItems]);

    const uniqueSatker = useMemo(() => {
        const unique = Array.from(new Set(
            bmnItems
                .map(item => item.namaSatker)
                .filter((value): value is string => !!value)
        )).sort();
        return unique.map(value => ({ value, label: value }));
    }, [bmnItems]);

    // Status BMN options (Requirement 7.2)
    const statusOptions = useMemo(() => [
        { value: 'Aktif', label: 'Aktif' },
        { value: 'Tidak Aktif', label: 'Tidak Aktif' },
        { value: 'Hilang', label: 'Hilang' },
        { value: 'Rusak', label: 'Rusak' }
    ], []);

    // Kondisi options (Requirement 7.3)
    const kondisiOptions = useMemo(() => [
        { value: 'Baik', label: 'Baik' },
        { value: 'Rusak Ringan', label: 'Rusak Ringan' },
        { value: 'Rusak Berat', label: 'Rusak Berat' }
    ], []);

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (jenisBMN !== 'All') count++;
        if (statusBMN !== 'All') count++;
        if (kondisi !== 'All') count++;
        if (namaSatker !== 'All') count++;
        if (nilaiPerolehanMin !== undefined) count++;
        if (nilaiPerolehanMax !== undefined) count++;
        if (umurAsetMin !== undefined) count++;
        if (umurAsetMax !== undefined) count++;
        return count;
    }, [jenisBMN, statusBMN, kondisi, namaSatker, nilaiPerolehanMin, nilaiPerolehanMax, umurAsetMin, umurAsetMax]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
            {/* Header - Always visible (Requirement 13.4) */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-slate-600" />
                    <h3 className="font-semibold text-slate-700">Filter</h3>
                    {activeFilterCount > 0 && (
                        <span className="bg-gov-600 text-white text-xs px-2 py-0.5 rounded-full">
                            {activeFilterCount} filter aktif
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                        <button
                            onClick={resetFilters}
                            className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                        >
                            <X size={14} />
                            <span className="hidden sm:inline">Reset Filter</span>
                        </button>
                    )}
                    {/* Collapse button for mobile (Requirement 13.4) */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="sm:hidden p-1 hover:bg-slate-100 rounded"
                        aria-label={isCollapsed ? 'Expand filters' : 'Collapse filters'}
                    >
                        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </button>
                </div>
            </div>

            {/* Filter Controls - Collapsible on mobile (Requirement 13.4) */}
            {!isCollapsed && (
                <div className="px-4 pb-4 border-t border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                        {/* Jenis BMN Filter (Requirement 7.1) */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                Jenis BMN
                            </label>
                            <SearchableSelect
                                options={uniqueJenisBMN}
                                value={jenisBMN === 'All' ? '' : jenisBMN}
                                onChange={(value) => setJenisBMN(value || 'All')}
                                placeholder="Cari jenis BMN..."
                                emptyOption="Semua"
                            />
                        </div>

                        {/* Status BMN Filter (Requirement 7.2) */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                Status BMN
                            </label>
                            <SearchableSelect
                                options={statusOptions}
                                value={statusBMN === 'All' ? '' : statusBMN}
                                onChange={(value) => setStatusBMN((value as BMNStatus) || 'All')}
                                placeholder="Cari status..."
                                emptyOption="Semua"
                            />
                        </div>

                        {/* Kondisi Filter (Requirement 7.3) */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                Kondisi
                            </label>
                            <SearchableSelect
                                options={kondisiOptions}
                                value={kondisi === 'All' ? '' : kondisi}
                                onChange={(value) => setKondisi((value as BMNKondisi) || 'All')}
                                placeholder="Cari kondisi..."
                                emptyOption="Semua"
                            />
                        </div>

                        {/* Nama Satker Filter (Requirement 7.4) */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                Nama Satker
                            </label>
                            <SearchableSelect
                                options={uniqueSatker}
                                value={namaSatker === 'All' ? '' : namaSatker}
                                onChange={(value) => setNamaSatker(value || 'All')}
                                placeholder="Cari satker..."
                                emptyOption="Semua"
                            />
                        </div>

                        {/* Nilai Perolehan Min (Requirement 7.5) */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                Nilai Perolehan Min (Rp)
                            </label>
                            <input
                                type="number"
                                value={nilaiPerolehanMin ?? ''}
                                onChange={(e) => setNilaiPerolehanMin(e.target.value ? Number(e.target.value) : undefined)}
                                placeholder="Contoh: 1000000"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-400 outline-none"
                                min="0"
                            />
                        </div>

                        {/* Nilai Perolehan Max (Requirement 7.5) */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                Nilai Perolehan Max (Rp)
                            </label>
                            <input
                                type="number"
                                value={nilaiPerolehanMax ?? ''}
                                onChange={(e) => setNilaiPerolehanMax(e.target.value ? Number(e.target.value) : undefined)}
                                placeholder="Contoh: 10000000"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-400 outline-none"
                                min="0"
                            />
                        </div>

                        {/* Umur Aset Min (Requirement 7.6) */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                Umur Aset Min (tahun)
                            </label>
                            <input
                                type="number"
                                value={umurAsetMin ?? ''}
                                onChange={(e) => setUmurAsetMin(e.target.value ? Number(e.target.value) : undefined)}
                                placeholder="Contoh: 0"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-400 outline-none"
                                min="0"
                            />
                        </div>

                        {/* Umur Aset Max (Requirement 7.6) */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                Umur Aset Max (tahun)
                            </label>
                            <input
                                type="number"
                                value={umurAsetMax ?? ''}
                                onChange={(e) => setUmurAsetMax(e.target.value ? Number(e.target.value) : undefined)}
                                placeholder="Contoh: 10"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-400 outline-none"
                                min="0"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BMNFilterPanel;
