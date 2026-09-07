import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Hash } from 'lucide-react';

interface StoryPointsPickerProps {
  currentSp: number | null | undefined;
  onSelect: (points: number | null) => void;
  onClose: () => void;
}

const FIBONACCI_POINTS = [0, 1, 2, 3, 5, 8, 13, 21];

export const StoryPointsPicker: React.FC<StoryPointsPickerProps> = ({
  currentSp,
  onSelect,
  onClose
}) => {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState(currentSp !== null && currentSp !== undefined ? String(currentSp) : '');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customValue.trim(), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onSelect(parsed);
    } else if (customValue.trim() === '') {
      onSelect(null);
    }
    onClose();
  };

  return (
    <div 
      ref={popoverRef}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 w-64 animate-zoomIn"
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
          <Hash className="w-3.5 h-3.5 text-indigo-500" />
          Story Points (Fibonacci)
        </span>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {!isCustomMode ? (
        <div>
          {/* Fibonacci Grid */}
          <div className="grid grid-cols-4 gap-1.5 mb-2.5">
            {FIBONACCI_POINTS.map((pt) => {
              const isSelected = currentSp === pt;
              return (
                <button
                  key={pt}
                  type="button"
                  onClick={() => {
                    onSelect(pt);
                    onClose();
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs scale-105'
                      : 'bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200/80 hover:border-indigo-200'
                  }`}
                >
                  {pt}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-100 gap-1.5">
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                onClose();
              }}
              className="text-[11px] font-bold text-slate-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
            >
              Hapus (None)
            </button>
            <button
              type="button"
              onClick={() => setIsCustomMode(true)}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              Angka Lain...
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCustomSubmit} className="space-y-2">
          <label className="text-[11px] font-semibold text-slate-600">Masukkan nilai manual:</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              max="999"
              autoFocus
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="Contoh: 40"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <button
              type="submit"
              className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors cursor-pointer"
              title="Simpan"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsCustomMode(false)}
            className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer block text-center w-full"
          >
            ← Kembali ke Fibonacci
          </button>
        </form>
      )}
    </div>
  );
};
