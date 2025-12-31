import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, X } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    emptyOption?: string;
    className?: string; // Class for the trigger container
    dropdownClassName?: string; // Class for the dropdown portal content
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Cari...',
    disabled = false,
    emptyOption = '-- Pilih --',
    className = '',
    dropdownClassName = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter options based on search query
    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get selected option label
    const selectedLabel = options.find(opt => opt.value === value)?.label || '';

    // Update coordinates when opening
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY + 4, // 4px gap
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    }, [isOpen]);

    // Update coordinates on scroll/resize
    useEffect(() => {
        if (!isOpen) return;

        const updatePosition = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const scrollX = window.scrollX;
                const scrollY = window.scrollY;

                let left = rect.left + scrollX;
                // Default width matches container
                let width = rect.width;

                // Mobile/Responsive Adjustment
                // If the container is very small (e.g. icon button), give it a min-width
                // But ensure it doesn't overflow viewport
                const minWidth = 200;
                if (width < minWidth) {
                    width = minWidth;
                }

                // Check for right overflow
                if (rect.left + width > viewportWidth) {
                    // Align right edge with container right edge if possible
                    // Or just shift left to fit
                    left = (rect.right + scrollX) - width;

                    // If still overflowing left (screen too narrow), clamp to 0
                    if (left < scrollX) {
                        left = scrollX + 4; // 4px padding
                        // Adjust width to fit screen
                        if (width > viewportWidth - 8) {
                            width = viewportWidth - 8;
                        }
                    }
                }

                setCoords({
                    top: rect.bottom + scrollY + 4,
                    left: left,
                    width: width
                });
            }
        };

        // Initial update
        updatePosition();

        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isClickInsideContainer = containerRef.current?.contains(target);
            const isClickInsideDropdown = dropdownRef.current?.contains(target);

            if (!isClickInsideContainer && !isClickInsideDropdown) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', (e) => handleClickOutside(e as unknown as MouseEvent));
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', (e) => handleClickOutside(e as unknown as MouseEvent));
        };
    }, [isOpen]);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen) {
            // Small timeout to allow render
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [isOpen]);

    const handleSelect = (optValue: string) => {
        onChange(optValue);
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearchQuery('');
    };

    if (disabled) {
        return (
            <div className={`w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 text-sm ${className}`}>
                {selectedLabel || emptyOption}
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm text-slate-700 bg-white flex items-center justify-between gap-2 ${isOpen ? 'ring-2 ring-gov-400' : ''}`}
            >
                <div className="flex-1 truncate text-left">
                    <span className={selectedLabel ? 'text-slate-700' : 'text-slate-400'}>
                        {selectedLabel || emptyOption}
                    </span>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                    {value && (
                        <span
                            role="button"
                            onClick={handleClear}
                            className="p-0.5 hover:bg-slate-100 rounded cursor-pointer"
                        >
                            <X size={14} className="text-slate-400" />
                        </span>
                    )}
                    <ChevronDown
                        size={16}
                        className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {/* Portal Dropdown */}
            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    style={{
                        position: 'absolute',
                        top: coords.top,
                        left: coords.left,
                        width: coords.width,
                        zIndex: 9999
                    }}
                    className={`bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col ${dropdownClassName}`}
                >
                    {/* Search Input */}
                    <div className="p-2 border-b border-slate-100 flex-shrink-0 bg-white z-10">
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={placeholder}
                                className="w-full pl-8 pr-8 py-1.5 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-gov-400 outline-none"
                                onClick={(e) => e.stopPropagation()}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="overflow-y-auto flex-1 p-1">
                        {/* Empty Option */}
                        <button
                            type="button"
                            onClick={() => handleSelect('')}
                            className={`w-full px-3 py-2 text-left text-sm rounded-md hover:bg-slate-50 transition-colors ${value === '' ? 'bg-gov-50 text-gov-700 font-medium' : 'text-slate-500'}`}
                        >
                            {emptyOption}
                        </button>

                        {/* Filtered Options */}
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleSelect(opt.value)}
                                    className={`w-full px-3 py-2 text-left text-sm rounded-md hover:bg-slate-50 transition-colors ${opt.value === value ? 'bg-gov-50 text-gov-700 font-medium' : 'text-slate-700'}`}
                                >
                                    {opt.label}
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-center text-sm text-slate-400">
                                Tidak ditemukan
                            </div>
                        )}
                    </div>

                    {/* Count */}
                    <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 flex-shrink-0">
                        {filteredOptions.length} dari {options.length} opsi
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SearchableSelect;
