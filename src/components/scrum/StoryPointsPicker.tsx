import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Hash } from 'lucide-react';

interface StoryPointsPickerProps {
  currentSp: number | null | undefined;
  onSelect: (points: number | null) => void;
  onClose: () => void;
  anchorEl?: HTMLElement | null;
}

const FIBONACCI_POINTS = [0, 1, 2, 3, 5, 8, 13, 21];

export const StoryPointsPicker: React.FC<StoryPointsPickerProps> = ({
  currentSp,
  onSelect,
  onClose,
  anchorEl
}) => {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState(currentSp !== null && currentSp !== undefined ? String(currentSp) : '');
  const [coords, setCoords] = useState<{ top: number; left: number; openUpwards: boolean } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Calculate coordinates and auto-flip direction based on anchorEl
  useEffect(() => {
    if (!anchorEl) return;

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const popoverHeight = 195;
      const popoverWidth = 256; // 16rem (w-64)
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Auto-flip: open upwards if space below is limited (< 215px) and there's space above
      const openUpwards = spaceBelow < 215 && spaceAbove > 180;

      const top = openUpwards
        ? Math.max(10, rect.top - popoverHeight - 6)
        : Math.min(window.innerHeight - popoverHeight - 10, rect.bottom + 6);

      // Align right edge of popover with right edge of button
      let left = rect.right - popoverWidth;
      if (left < 12) left = 12;
      if (left + popoverWidth > window.innerWidth - 12) {
        left = window.innerWidth - popoverWidth - 12;
      }

      setCoords({ top, left, openUpwards });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorEl]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current && 
        !popoverRef.current.contains(target) &&
        (!anchorEl || !anchorEl.contains(target))
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, anchorEl]);

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

  const popoverContent = (
    <div 
      ref={popoverRef}
      onClick={(e) => e.stopPropagation()}
      style={coords ? {
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        zIndex: 99999
      } : undefined}
      className={`${coords ? 'fixed' : 'absolute right-0 top-full mt-1.5 z-50'} bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 w-64 animate-zoomIn`}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
          <Hash className="w-3.5 h-3.5 text-indigo-500" />
          Story Points (Fibonacci)
        </span>
        <button 
          onClick={onClose}
          type="button"
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

  return anchorEl && coords ? createPortal(popoverContent, document.body) : popoverContent;
};
