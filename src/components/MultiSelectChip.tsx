// src/components/MultiSelectChip.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

type Option = {
  value: string;
  label: string;
};

interface MultiSelectChipProps {
  options: Option[];                   // daftar opsi
  value: string[];                     // array nilai yg terpilih
  onChange: (selected: string[]) => void;
  placeholder?: string;
  maxVisibleChips?: number;            // berapa chip langsung terlihat sebelum "...+N"
  className?: string;
  dropdownClassName?: string;
  id?: string;
  searchable?: boolean;                // enable search functionality (default: true)
  searchPlaceholder?: string;          // placeholder for search input
}

const MultiSelectChip: React.FC<MultiSelectChipProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Pilih...',
  maxVisibleChips = 5,
  className = '',
  dropdownClassName = '',
  id,
  searchable = true,
  searchPlaceholder = 'Cari nama...'
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // keyboard: Esc closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearchQuery('');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchable && searchInputRef.current) {
      // Small delay to ensure the dropdown is rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [open, searchable]);

  const isSelected = (val: string) => value.includes(val);

  const toggle = (val: string) => {
    if (isSelected(val)) onChange(value.filter(v => v !== val));
    else onChange([...value, val]);
  };

  const removeChip = (val: string) => {
    onChange(value.filter(v => v !== val));
  };

  // Filter options based on search query
  const filteredOptions = searchable && searchQuery.trim()
    ? options.filter(opt =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opt.value.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : options;

  const visibleChips = value.slice(0, maxVisibleChips);
  const hiddenCount = value.length - visibleChips.length;

  const handleClose = () => {
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`} id={id}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full text-left px-3 py-2 rounded-lg border border-slate-200 bg-white flex items-center gap-2 justify-between hover:shadow-sm focus:shadow-sm focus:outline-none`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {value.length === 0 ? (
            <span className="text-slate-400 text-sm truncate">{placeholder}</span>
          ) : (
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              {visibleChips.map(v => {
                const opt = options.find(o => o.value === v);
                return (
                  <div key={v} className="flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                    <span className="truncate max-w-[8rem]">{opt?.label ?? v}</span>
                    <span
                      onClick={(e) => { e.stopPropagation(); removeChip(v); }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Remove ${opt?.label ?? v}`}
                      className="ml-1 text-slate-400 hover:text-red-500 p-1 rounded-full cursor-pointer select-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          removeChip(v);
                        }
                      }}
                    >
                      ✕
                    </span>
                  </div>
                );
              })}
              {hiddenCount > 0 && (
                <div className="text-slate-400 text-xs px-2 py-0.5 rounded-full">+{hiddenCount}</div>
              )}
            </div>
          )}
        </div>

        <svg className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className={`absolute z-50 mt-2 w-full rounded-lg shadow-lg bg-white border border-slate-200 ${dropdownClassName}`} role="listbox">
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gov-300 focus:border-gov-400"
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
          )}

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto p-2">
            {filteredOptions.map(opt => (
              <label
                key={opt.value}
                className="flex items-center gap-2 px-2 py-2 rounded hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isSelected(opt.value)}
                  onChange={() => toggle(opt.value)}
                  className="w-4 h-4 text-gov-600 rounded focus:ring-gov-500"
                />
                <span className="text-sm text-slate-700">{opt.label}</span>
              </label>
            ))}

            {filteredOptions.length === 0 && searchQuery && (
              <div className="text-xs text-slate-400 p-2 text-center">
                Tidak ditemukan "{searchQuery}"
              </div>
            )}

            {options.length === 0 && (
              <div className="text-xs text-slate-400 p-2">Tidak ada opsi</div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-slate-100 p-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => { onChange([]); handleClose(); }}
              className="text-xs text-slate-500 hover:text-gov-600"
            >
              Clear
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {value.length} dipilih
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-1.5 bg-gov-600 text-white text-xs rounded hover:bg-gov-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectChip;
