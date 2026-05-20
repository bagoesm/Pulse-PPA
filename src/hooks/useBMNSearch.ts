// src/hooks/useBMNSearch.ts
// Hook for managing BMN search functionality with debouncing

import { useState, useMemo } from 'react';
import { BMNItem } from '../../types';
import { useDebounce } from './useDebounce';

export interface UseBMNSearchResult {
    // Search state
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    debouncedSearchQuery: string;
    
    // Search results
    searchResults: BMNItem[];
    searchResultCount: number;
    
    // Actions
    performSearch: (items: BMNItem[]) => BMNItem[];
    clearSearch: () => void;
    isSearching: boolean;
}

/**
 * Custom hook for BMN search functionality
 * Implements debounced search across multiple BMN fields
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7**
 * 
 * @returns UseBMNSearchResult object with search state and functions
 */
export function useBMNSearch(): UseBMNSearchResult {
    // Search query state
    const [searchQuery, setSearchQuery] = useState('');
    
    // Debounce search query with 500ms delay (Requirement 8.2)
    const debouncedSearchQuery = useDebounce(searchQuery, 500);
    
    // Track if search is active (query is not empty)
    const isSearching = useMemo(() => {
        return debouncedSearchQuery.trim().length > 0;
    }, [debouncedSearchQuery]);
    
    /**
     * Perform case-insensitive search across multiple BMN fields
     * Searches in: Nama Barang, Kode Barang, Merk, Tipe, Alamat
     * 
     * **Validates: Requirements 8.3, 8.4**
     * 
     * @param items - Array of BMN items to search
     * @returns Filtered array of BMN items matching the search query
     */
    const performSearch = useMemo(() => {
        return (items: BMNItem[]): BMNItem[] => {
            // If no search query, return all items (Requirement 8.7)
            if (!debouncedSearchQuery.trim()) {
                return items;
            }
            
            // Convert search query to lowercase for case-insensitive search (Requirement 8.4)
            const searchLower = debouncedSearchQuery.toLowerCase().trim();
            
            // Search across multiple fields (Requirement 8.3)
            const filtered = items.filter(item => {
                // Search in Nama Barang
                if (item.namaBarang?.toLowerCase().includes(searchLower)) {
                    return true;
                }
                
                // Search in Kode Barang
                if (item.kodeBarang?.toLowerCase().includes(searchLower)) {
                    return true;
                }
                
                // Search in Merk
                if (item.merk?.toLowerCase().includes(searchLower)) {
                    return true;
                }
                
                // Search in Tipe
                if (item.tipe?.toLowerCase().includes(searchLower)) {
                    return true;
                }
                
                // Search in Alamat
                if (item.alamat?.toLowerCase().includes(searchLower)) {
                    return true;
                }
                
                return false;
            });
            
            return filtered;
        };
    }, [debouncedSearchQuery]);
    
    // Memoized search results (initially empty, will be populated by calling performSearch)
    const [searchResults, setSearchResults] = useState<BMNItem[]>([]);
    
    // Search result count (Requirement 8.6)
    const searchResultCount = useMemo(() => {
        return searchResults.length;
    }, [searchResults]);
    
    /**
     * Clear search query and reset results
     */
    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
    };
    
    return {
        // Search state
        searchQuery,
        setSearchQuery,
        debouncedSearchQuery,
        
        // Search results
        searchResults,
        searchResultCount,
        
        // Actions
        performSearch,
        clearSearch,
        isSearching
    };
}

export default useBMNSearch;
