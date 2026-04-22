import React, { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
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
    <div className="fixed top-4 right-4 z-[9999] animate-slide-in-right">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-2xl p-4 max-w-md border border-blue-400">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">
              Pembaruan Tersedia
            </h3>
            <p className="text-xs text-blue-50 mb-3">
              Versi baru aplikasi telah tersedia. Muat ulang halaman untuk mendapatkan fitur dan perbaikan terbaru.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                disabled={isReloading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-600 rounded text-xs font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReloading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Memuat ulang...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Muat Ulang Sekarang
                  </>
                )}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs text-blue-50 hover:text-white hover:bg-blue-500/50 rounded transition-colors"
              >
                Nanti
              </button>
            </div>
            <p className="text-[10px] text-blue-100 mt-2">
              Versi: {getCurrentVersion()}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-blue-100 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slide-in-right {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  .animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
  }
`;
document.head.appendChild(style);
