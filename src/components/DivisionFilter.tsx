// src/components/DivisionFilter.tsx
// Reusable Satuan Kerja filter component that appears across all pages
import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, X, Check, RotateCcw } from 'lucide-react';
import { useDivision } from '../contexts/DivisionContext';

interface DivisionFilterProps {
    className?: string;
    compact?: boolean; // For use in tight spaces like mobile headers
}

const DivisionFilter: React.FC<DivisionFilterProps> = ({ className = '', compact = false }) => {
    const {
        divisiList,
        currentDivisi,
        selectedDivisi,
        setSelectedDivisi,
        resetToMyDivisi,
        isDivisiFilterActive,
    } = useDivision();

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Don't render if no divisi list available
    if (divisiList.length === 0) return null;

    const displayLabel = selectedDivisi === 'All' 
        ? 'Semua Satuan Kerja' 
        : selectedDivisi;

    const handleSelect = (divisi: string | 'All') => {
        setSelectedDivisi(divisi);
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all ${
                    isDivisiFilterActive 
                        ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                }`}
            >
                <Building2 size={14} className={isDivisiFilterActive ? 'text-amber-600' : 'text-slate-400'} />
                <span className={compact ? 'hidden sm:inline' : ''}>
                    {compact ? (selectedDivisi === 'All' ? 'Satker' : displayLabel) : displayLabel}
                </span>
                <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                {isDivisiFilterActive && (
                    <span className="flex items-center justify-center w-2 h-2 rounded-full bg-amber-500 absolute -top-0.5 -right-0.5"></span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-slate-200 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* Header */}
                    <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Satuan Kerja</span>
                            {isDivisiFilterActive && (
                                <button
                                    onClick={() => {
                                        resetToMyDivisi();
                                        setIsOpen(false);
                                    }}
                                    className="flex items-center gap-1 text-xs text-gov-600 hover:text-gov-700 font-medium"
                                >
                                    <RotateCcw size={10} />
                                    Reset
                                </button>
                            )}
                        </div>
                        {currentDivisi && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                                Satker Anda: <span className="font-medium text-slate-600">{currentDivisi}</span>
                            </p>
                        )}
                    </div>

                    {/* Options */}
                    <div className="max-h-52 overflow-y-auto py-1">
                        {/* "Semua Satuan Kerja" option */}
                        <button
                            onClick={() => handleSelect('All')}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                                selectedDivisi === 'All' 
                                    ? 'bg-gov-50 text-gov-700 font-semibold' 
                                    : 'text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <Building2 size={14} className="text-slate-400" />
                                Semua Satuan Kerja
                            </span>
                            {selectedDivisi === 'All' && <Check size={14} className="text-gov-600" />}
                        </button>

                        <div className="h-px bg-slate-100 my-1" />

                        {/* Satuan Kerja options */}
                        {divisiList.map(divisi => (
                            <button
                                key={divisi}
                                onClick={() => handleSelect(divisi)}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                                    selectedDivisi === divisi 
                                        ? 'bg-gov-50 text-gov-700 font-semibold' 
                                        : 'text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                        divisi === currentDivisi ? 'bg-gov-500' : 'bg-slate-300'
                                    }`} />
                                    <span className="truncate">{divisi}</span>
                                    {divisi === currentDivisi && (
                                        <span className="text-[10px] text-gov-500 font-normal">(Anda)</span>
                                    )}
                                </span>
                                {selectedDivisi === divisi && <Check size={14} className="text-gov-600" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DivisionFilter;
