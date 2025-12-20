import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';

interface PushNotificationPromptProps {
  onAllow: () => Promise<boolean>;
  onDismiss: () => void;
}

const PushNotificationPrompt: React.FC<PushNotificationPromptProps> = ({
  onAllow,
  onDismiss
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAllow = async () => {
    setIsLoading(true);
    try {
      await onAllow();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-slide-up">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-gov-600 to-gov-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Bell size={18} />
            <span className="font-medium text-sm">Aktifkan Notifikasi</span>
          </div>
          <button
            onClick={onDismiss}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-slate-600 mb-4">
            Dapatkan notifikasi langsung di perangkat Anda untuk:
          </p>
          <ul className="text-xs text-slate-500 space-y-1.5 mb-4">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              Task baru yang ditugaskan ke Anda
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
              Deadline yang mendekat
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Komentar baru pada task Anda
            </li>
          </ul>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onDismiss}
              className="flex-1 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Nanti Saja
            </button>
            <button
              onClick={handleAllow}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-sm bg-gov-600 hover:bg-gov-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Mengaktifkan...</span>
                </>
              ) : (
                <>
                  <Bell size={14} />
                  <span>Izinkan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationPrompt;
