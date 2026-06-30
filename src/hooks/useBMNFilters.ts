// src/hooks/useBMNFilters.ts
// Hook for managing BMN filters state

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BMNItem, BMNFilters, BMNStatus, BMNKondisi } from '../../types';

export interface UseBMNFiltersResult {
    // Filter state
    filters: BMNFilters;
    
    // Search
    search: string;
    setSearch: (value: string) => void;
    debouncedSearch: string;
    
    // Category filters
    jenisBMN: string | 'All';
    setJenisBMN: (value: string | 'All') => void;
    kodeBarang: string | 'All';
    setKodeBarang: (value: string | 'All') => void;
    statusBMN: BMNStatus | 'All';
    setStatusBMN: (value: BMNStatus | 'All') => void;
    kondisi: BMNKondisi | 'All';
    setKondisi: (value: BMNKondisi | 'All') => void;
    namaSatker: string | 'All';
    setNamaSatker: (value: string | 'All') => void;
    
    // Range filters
    nilaiPerolehanMin: number | undefined;
    setNilaiPerolehanMin: (value: number | undefined) => void;
    nilaiPerolehanMax: number | undefined;
    setNilaiPerolehanMax: (value: number | undefined) => void;
    umurAsetMin: number | undefined;
    setUmurAsetMin: (value: number | undefined) => void;
    umurAsetMax: number | undefined;
    setUmurAsetMax: (value: number | undefined) => void;
    
    // Date filter
    tahunPerolehan: number | undefined;
    setTahunPerolehan: (value: number | undefined) => void;
    
    // Pagination
    currentPage: number;
    setCurrentPage: (value: number | ((prev: number) => number)) => void;
    
    // Actions
    resetFilters: () => void;
    applyFilters: (items: BMNItem[]) => BMNItem[];
    hasActiveFilters: boolean;
    activeFilterCount: number;
}

const DEBOUNCE_MS = 500; // 500ms as per requirement 8.2

export function useBMNFilters(): UseBMNFiltersResult {
    // Search state
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    
    // Category filter states
    const [jenisBMN, setJenisBMN] = useState<string | 'All'>('All');
    const [kodeBarang, setKodeBarang] = useState<string | 'All'>('All');
    const [statusBMN, setStatusBMN] = useState<BMNStatus | 'All'>('All');
    const [kondisi, setKondisi] = useState<BMNKondisi | 'All'>('All');
    const [namaSatker, setNamaSatker] = useState<string | 'All'>('All');
    
    // Range filter states
    const [nilaiPerolehanMin, setNilaiPerolehanMin] = useState<number | undefined>(undefined);
    const [nilaiPerolehanMax, setNilaiPerolehanMax] = useState<number | undefined>(undefined);
    const [umurAsetMin, setUmurAsetMin] = useState<number | undefined>(undefined);
    const [umurAsetMax, setUmurAsetMax] = useState<number | undefined>(undefined);
    
    // Date filter state
    const [tahunPerolehan, setTahunPerolehan] = useState<number | undefined>(undefined);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    
    // Debounce search input (Requirement 8.2)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [search]);
    
    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, jenisBMN, kodeBarang, statusBMN, kondisi, namaSatker, 
        nilaiPerolehanMin, nilaiPerolehanMax, umurAsetMin, umurAsetMax, tahunPerolehan]);
    
    // Combine all filters into BMNFilters object
    const filters: BMNFilters = useMemo(() => ({
        search: debouncedSearch || undefined,
        jenisBMN: jenisBMN !== 'All' ? jenisBMN : undefined,
        kodeBarang: kodeBarang !== 'All' ? kodeBarang : undefined,
        statusBMN: statusBMN !== 'All' ? statusBMN : undefined,
        kondisi: kondisi !== 'All' ? kondisi : undefined,
        namaSatker: namaSatker !== 'All' ? namaSatker : undefined,
        nilaiPerolehanMin,
        nilaiPerolehanMax,
        umurAsetMin,
        umurAsetMax,
        tahunPerolehan
    }), [debouncedSearch, jenisBMN, kodeBarang, statusBMN, kondisi, namaSatker, 
        nilaiPerolehanMin, nilaiPerolehanMax, umurAsetMin, umurAsetMax, tahunPerolehan]);
    
    // Check if any filters are active
    const hasActiveFilters = useMemo(() => {
        return !!(
            debouncedSearch ||
            jenisBMN !== 'All' ||
            kodeBarang !== 'All' ||
            statusBMN !== 'All' ||
            kondisi !== 'All' ||
            namaSatker !== 'All' ||
            nilaiPerolehanMin !== undefined ||
            nilaiPerolehanMax !== undefined ||
            umurAsetMin !== undefined ||
            umurAsetMax !== undefined ||
            tahunPerolehan !== undefined
        );
    }, [debouncedSearch, jenisBMN, kodeBarang, statusBMN, kondisi, namaSatker, 
        nilaiPerolehanMin, nilaiPerolehanMax, umurAsetMin, umurAsetMax, tahunPerolehan]);

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (jenisBMN !== 'All') count++;
        if (kodeBarang !== 'All') count++;
        if (statusBMN !== 'All') count++;
        if (kondisi !== 'All') count++;
        if (namaSatker !== 'All') count++;
        if (nilaiPerolehanMin !== undefined) count++;
        if (nilaiPerolehanMax !== undefined) count++;
        if (umurAsetMin !== undefined) count++;
        if (umurAsetMax !== undefined) count++;
        if (tahunPerolehan !== undefined) count++;
        return count;
    }, [jenisBMN, kodeBarang, statusBMN, kondisi, namaSatker, nilaiPerolehanMin, nilaiPerolehanMax, umurAsetMin, umurAsetMax, tahunPerolehan]);
    
    // Reset all filters (Requirement 7.9)
    const resetFilters = useCallback(() => {
        setSearch('');
        setJenisBMN('All');
        setKodeBarang('All');
        setStatusBMN('All');
        setKondisi('All');
        setNamaSatker('All');
        setNilaiPerolehanMin(undefined);
        setNilaiPerolehanMax(undefined);
        setUmurAsetMin(undefined);
        setUmurAsetMax(undefined);
        setTahunPerolehan(undefined);
        setCurrentPage(1);
    }, []);
    
    // Calculate asset age from acquisition year
    const calculateAssetAge = useCallback((tahunPerolehan?: number): number | undefined => {
        if (!tahunPerolehan) return undefined;
        const currentYear = new Date().getFullYear();
        return currentYear - tahunPerolehan;
    }, []);
    
    // Apply filters to BMN items (Requirement 7.10 - filter combination logic)
    const applyFilters = useCallback((items: BMNItem[]): BMNItem[] => {
        let filtered = [...items];
        
        // Search filter (Requirement 8.3 - search in multiple fields)
        if (debouncedSearch) {
            const searchLower = debouncedSearch.toLowerCase();
            filtered = filtered.filter(item => 
                item.namaBarang?.toLowerCase().includes(searchLower) ||
                item.kodeBarang?.toLowerCase().includes(searchLower) ||
                item.merk?.toLowerCase().includes(searchLower) ||
                item.tipe?.toLowerCase().includes(searchLower) ||
                item.alamat?.toLowerCase().includes(searchLower) ||
                item.nomorRegister?.toLowerCase().includes(searchLower)
            );
        }
        
        // Jenis BMN filter (Requirement 7.1)
        if (jenisBMN !== 'All') {
            filtered = filtered.filter(item => item.jenisBMN === jenisBMN);
        }
        
        // Kode Barang filter
        if (kodeBarang !== 'All') {
            filtered = filtered.filter(item => item.kodeBarang === kodeBarang);
        }
        
        // Status BMN filter (Requirement 7.2)
        if (statusBMN !== 'All') {
            filtered = filtered.filter(item => item.statusBMN === statusBMN);
        }
        
        // Kondisi filter (Requirement 7.3)
        if (kondisi !== 'All') {
            filtered = filtered.filter(item => item.kondisi === kondisi);
        }
        
        // Nama Satker filter (Requirement 7.4)
        if (namaSatker !== 'All') {
            filtered = filtered.filter(item => item.namaSatker === namaSatker);
        }
        
        // Nilai Perolehan range filter (Requirement 7.5)
        if (nilaiPerolehanMin !== undefined) {
            filtered = filtered.filter(item => 
                item.nilaiPerolehan !== undefined && item.nilaiPerolehan >= nilaiPerolehanMin
            );
        }
        if (nilaiPerolehanMax !== undefined) {
            filtered = filtered.filter(item => 
                item.nilaiPerolehan !== undefined && item.nilaiPerolehan <= nilaiPerolehanMax
            );
        }
        
        // Umur Aset range filter (Requirement 7.6)
        if (umurAsetMin !== undefined || umurAsetMax !== undefined) {
            filtered = filtered.filter(item => {
                // Item must have tahunPerolehan to be included when age filter is active
                if (!item.tahunPerolehan) return false;
                
                const assetAge = calculateAssetAge(item.tahunPerolehan);
                if (assetAge === undefined) return false;
                
                // Apply min filter if specified
                if (umurAsetMin !== undefined && assetAge < umurAsetMin) return false;
                
                // Apply max filter if specified
                if (umurAsetMax !== undefined && assetAge > umurAsetMax) return false;
                
                return true;
            });
        }
        
        // Tahun Perolehan filter
        if (tahunPerolehan !== undefined) {
            filtered = filtered.filter(item => item.tahunPerolehan === tahunPerolehan);
        }
        
        return filtered;
    }, [debouncedSearch, jenisBMN, kodeBarang, statusBMN, kondisi, namaSatker, 
        nilaiPerolehanMin, nilaiPerolehanMax, umurAsetMin, umurAsetMax, 
        tahunPerolehan, calculateAssetAge]);
    
    return {
        // Filter state
        filters,
        
        // Search
        search,
        setSearch,
        debouncedSearch,
        
        // Category filters
        jenisBMN,
        setJenisBMN,
        kodeBarang,
        setKodeBarang,
        statusBMN,
        setStatusBMN,
        kondisi,
        setKondisi,
        namaSatker,
        setNamaSatker,
        
        // Range filters
        nilaiPerolehanMin,
        setNilaiPerolehanMin,
        nilaiPerolehanMax,
        setNilaiPerolehanMax,
        umurAsetMin,
        setUmurAsetMin,
        umurAsetMax,
        setUmurAsetMax,
        
        // Date filter
        tahunPerolehan,
        setTahunPerolehan,
        
        // Pagination
        currentPage,
        setCurrentPage,
        
        // Actions
        resetFilters,
        applyFilters,
        hasActiveFilters,
        activeFilterCount
    };
}
