import React, { useState } from 'react';
import { X, Save, Gift, Sparkles } from 'lucide-react';
import { ChristmasDecorationSettings } from '../../types';
import ChristmasDecorations from './ChristmasDecorations';

interface ChristmasSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: ChristmasDecorationSettings;
  onSave: (settings: ChristmasDecorationSettings) => void;
  currentUserName: string;
}

const ChristmasSettingsModal: React.FC<ChristmasSettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSave,
  currentUserName
}) => {
  const [settings, setSettings] = useState<ChristmasDecorationSettings>(currentSettings);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      ...settings,
      enabledBy: currentUserName,
      enabledAt: new Date().toISOString()
    });
    onClose();
  };

  const allEnabled = settings.santaHatEnabled && settings.baubleEnabled && settings.candyEnabled;
  const allDisabled = !settings.santaHatEnabled && !settings.baubleEnabled && !settings.candyEnabled;

  const toggleAll = (enabled: boolean) => {
    setSettings({
      ...settings,
      santaHatEnabled: enabled,
      baubleEnabled: enabled,
      candyEnabled: enabled
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-red-50 to-green-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <Gift size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Pengaturan Dekorasi Natal</h3>
              <p className="text-xs text-slate-500">Aktifkan dekorasi untuk dashboard</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => toggleAll(true)}
              disabled={allEnabled}
              className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Aktifkan Semua
            </button>
            <button
              onClick={() => toggleAll(false)}
              disabled={allDisabled}
              className="flex-1 px-3 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Matikan Semua
            </button>
          </div>

          {/* Individual Settings */}
          <div className="space-y-4">
            {/* Santa Hat */}
            <div className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="w-8 h-8 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <path d="M20 80 Q25 20 50 15 Q75 20 80 80 Q75 85 50 85 Q25 85 20 80" fill="#dc2626"/>
                  <ellipse cx="50" cy="80" rx="30" ry="8" fill="#f8fafc"/>
                  <circle cx="75" cy="25" r="8" fill="#f8fafc"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-700">Topi Santa</p>
                <p className="text-xs text-slate-500">Tampilkan topi santa di ujung kanan avatar pengguna</p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="santaHat"
                  checked={settings.santaHatEnabled}
                  onChange={e => setSettings({...settings, santaHatEnabled: e.target.checked})}
                  className="sr-only"
                />
                <label
                  htmlFor="santaHat"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    settings.santaHatEnabled ? 'bg-red-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      settings.santaHatEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </label>
              </div>
            </div>

            {/* Bauble */}
            <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-8 h-8 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="60" r="35" fill="#dc2626"/>
                  <rect x="42" y="20" width="16" height="12" rx="2" fill="#fbbf24"/>
                  <rect x="48" y="15" width="4" height="8" rx="2" fill="#92400e"/>
                  <ellipse cx="40" cy="45" rx="8" ry="12" fill="#ffffff" opacity="0.4"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-700">Bola Natal</p>
                <p className="text-xs text-slate-500">Tampilkan bola natal menggantung di bagian atas card</p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="bauble"
                  checked={settings.baubleEnabled}
                  onChange={e => setSettings({...settings, baubleEnabled: e.target.checked})}
                  className="sr-only"
                />
                <label
                  htmlFor="bauble"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    settings.baubleEnabled ? 'bg-blue-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      settings.baubleEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </label>
              </div>
            </div>

            {/* Candy */}
            <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-8 h-8 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <path d="M30 20 Q20 20 20 30 Q20 40 30 40 L70 40 Q80 40 80 50 Q80 60 70 60 Q60 60 60 70" 
                        stroke="#dc2626" strokeWidth="8" fill="none" strokeLinecap="round"/>
                  <path d="M30 25 L65 25" stroke="#ffffff" strokeWidth="3"/>
                  <path d="M30 35 L65 35" stroke="#ffffff" strokeWidth="3"/>
                  <path d="M75 45 L75 55" stroke="#ffffff" strokeWidth="3"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-700">Permen Natal</p>
                <p className="text-xs text-slate-500">Tampilkan permen di ujung-ujung bawah card</p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="candy"
                  checked={settings.candyEnabled}
                  onChange={e => setSettings({...settings, candyEnabled: e.target.checked})}
                  className="sr-only"
                />
                <label
                  htmlFor="candy"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    settings.candyEnabled ? 'bg-green-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      settings.candyEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Preview */}
          {(settings.santaHatEnabled || settings.baubleEnabled || settings.candyEnabled) && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Preview Dekorasi</span>
              </div>
              <div className="relative bg-white rounded-lg border border-slate-200 p-4 min-h-[80px]">
                {/* Preview using ChristmasDecorations component */}
                <ChristmasDecorations 
                  santaHatEnabled={false}
                  baubleEnabled={settings.baubleEnabled}
                  candyEnabled={false}
                  position="card-top"
                />
                
                {/* Avatar with Santa Hat Preview */}
                <div className="flex items-center gap-3 mt-4">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gov-500 flex items-center justify-center text-white font-bold">
                      U
                    </div>
                    <ChristmasDecorations 
                      santaHatEnabled={settings.santaHatEnabled}
                      baubleEnabled={false}
                      candyEnabled={false}
                      position="avatar"
                      className="w-6 h-6 -top-1 -right-1"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-slate-700 text-sm">User Name</p>
                    <p className="text-xs text-slate-500">Preview Card</p>
                  </div>
                </div>

                <ChristmasDecorations 
                  santaHatEnabled={false}
                  baubleEnabled={false}
                  candyEnabled={settings.candyEnabled}
                  position="card-bottom"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 text-slate-600 font-medium text-sm hover:bg-slate-100 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={handleSave} 
            className="px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
          >
            <Save size={16} /> 
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChristmasSettingsModal;