import React, { useEffect, useState } from 'react';
import { RefreshCw, X, Loader2 } from 'lucide-react';
import { startVersionCheck, forceReload, getCurrentVersion } from '../utils/versionCheck';

export const UpdateNotification: React.FC = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    // Start version checking
    const cleanup = startVersionCheck(() => {
      setShowUpdate(true);
    });

    return cleanup;
  }, []);

  const handleUpdate = () => {
    setIsReloading(true);
    forceReload();
  };

  const handleDismiss = () => {
    setShowUpdate(false);
    // Show again after 5 minutes if user dismisses
    setTimeout(() => setShowUpdate(true), 5 * 60 * 1000);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full p-6 text-center animate-scale-up relative">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-50 min-h-0"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Pulsing Icon */}
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-slow">
          <RefreshCw className="w-8 h-8 animate-spin-slow" />
        </div>

        {/* Text Details */}
        <h3 className="text-base font-bold text-slate-800 mb-2">
          Pembaruan Aplikasi Tersedia
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-6">
          Versi terbaru aplikasi telah dirilis. Silakan muat ulang halaman sekarang untuk menikmati fitur terbaru dan peningkatan performa sistem.
        </p>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleUpdate}
            disabled={isReloading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-h-0"
          >
            {isReloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sedang Memperbarui...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Muat Ulang Sekarang
              </>
            )}
          </button>
          
          <button
            onClick={handleDismiss}
            disabled={isReloading}
            className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-600 font-semibold transition-colors rounded-xl hover:bg-slate-50 min-h-0"
          >
            Nanti Saja
          </button>
        </div>

        {/* Version */}
        <div className="text-[9px] text-slate-400 mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span>Pulse App</span>
          <span>Versi {getCurrentVersion()}</span>
        </div>
      </div>
    </div>
  );
};

// Add animation styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scale-up {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    @keyframes pulse-slow {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.9; }
    }
    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .animate-fade-in {
      animation: fade-in 0.2s ease-out forwards;
    }
    .animate-scale-up {
      animation: scale-up 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    .animate-pulse-slow {
      animation: pulse-slow 2s infinite ease-in-out;
    }
    .animate-spin-slow {
      animation: spin-slow 4s linear infinite;
    }
  `;
  document.head.appendChild(style);
}
