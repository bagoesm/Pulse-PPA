// src/components/ModuleVisibilityManagement.tsx
import React, { useState, useEffect } from 'react';
import { Settings, Shield, RefreshCw, Check, AlertCircle, HelpCircle, Save } from 'lucide-react';
import { moduleVisibilityService, SatkerModuleVisibility } from '../services/ModuleVisibilityService';
import { useAuth } from '../contexts/AuthContext';

const ModuleVisibilityManagement: React.FC = () => {
  const { currentUser } = useAuth();

  // Managed modules list (exactly matching Sidebar names)
  const modules = [
    'Semua Task',
    'Project',
    'Surat & Kegiatan',
    'Realisasi Anggaran',
    'Inventori Data',
    'Inventori BMN',
    'Pelayanan Zoom'
  ];

  // States
  const [matrix, setMatrix] = useState<SatkerModuleVisibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingCell, setSavingCell] = useState<{ divId: string; modName: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    if (currentUser?.role !== 'Super Admin') {
      setError('Akses ditolak. Hanya Super Admin yang dapat mengakses halaman ini.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const settings = await moduleVisibilityService.getVisibilitySettings(modules);
      setMatrix(settings);
    } catch (err) {
      console.error('Error fetching module visibility settings:', err);
      setError('Gagal memuat konfigurasi visibilitas modul. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (divisiId: string, divisiName: string, moduleName: string, currentValue: boolean) => {
    if (currentUser?.role !== 'Super Admin') return;
    
    const newValue = !currentValue;
    
    try {
      setSavingCell({ divId: divisiId, modName: moduleName });
      setError(null);
      setSuccessMessage(null);
      
      // Update in DB
      await moduleVisibilityService.updateModuleVisibility(moduleName, divisiId, newValue);
      
      // Update local state
      setMatrix((prev) =>
        prev.map((row) => {
          if (row.divisiId === divisiId) {
            return {
              ...row,
              visibility: {
                ...row.visibility,
                [moduleName]: newValue
              }
            };
          }
          return row;
        })
      );

      setSuccessMessage(`Berhasil mengubah visibilitas modul "${moduleName}" untuk "${divisiName}".`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error updating module visibility:', err);
      setError('Gagal memperbarui visibilitas modul. Silakan coba lagi.');
    } finally {
      setSavingCell(null);
    }
  };

  if (currentUser?.role !== 'Super Admin') {
    return (
      <div className="p-6 text-center">
        <div className="bg-red-50 text-red-600 border border-red-100 px-6 py-8 rounded-2xl max-w-md mx-auto space-y-3">
          <Shield className="mx-auto text-red-500" size={48} />
          <h4 className="font-bold text-lg">Akses Terbatas</h4>
          <p className="text-sm">Anda tidak memiliki izin untuk mengelola visibilitas modul sistem.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto bg-slate-50">
      
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2.5 sm:gap-3">
            <Settings className="text-gov-600" size={24} />
            Manajemen Visibilitas Modul
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Atur menu/modul mana saja yang ditampilkan di sidebar untuk masing-masing Satuan Kerja (Satker).
          </p>
        </div>
        <button
          onClick={fetchSettings}
          disabled={loading}
          className="flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-100 bg-white text-slate-600 rounded-xl font-semibold text-xs shadow-sm transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Segarkan
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 border border-red-100 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 bg-green-50 text-green-700 border border-green-100 px-4 py-3 rounded-xl text-xs flex items-center gap-2 animate-slideDown">
          <Check size={16} className="text-green-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Matrix Box */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        
        {/* Helper Note */}
        <div className="p-4 bg-slate-50 text-slate-600 text-xs border-b border-slate-150 flex items-start gap-2">
          <HelpCircle size={16} className="text-gov-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Panduan:</span> Hubungkan visibilitas modul Pulse dengan mencentang kotak di bawah ini.
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-slate-500">
              <li>Modul yang tercentang (<span className="text-green-600 font-semibold">Aktif</span>) akan muncul pada menu navigasi Satker terkait.</li>
              <li>Modul yang tidak tercentang (<span className="text-red-500 font-semibold">Non-aktif</span>) akan disembunyikan secara dinamis.</li>
              <li><span className="font-semibold">Pengecualian:</span> Super Admin akan selalu melihat seluruh modul untuk mempermudah pemantauan sistem.</li>
            </ul>
          </div>
        </div>

        {loading && matrix.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw size={24} className="animate-spin mx-auto text-gov-600 mb-2" />
            Memuat konfigurasi...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                  <th className="px-6 py-4 min-w-[200px] sticky left-0 bg-slate-50 z-10 border-r border-slate-150">Satuan Kerja (Satker)</th>
                  {modules.map((modName) => (
                    <th key={modName} className="px-4 py-4 text-center min-w-[140px]">{modName}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {matrix.map((row) => (
                  <tr key={row.divisiId} className="hover:bg-slate-50/50 text-xs">
                    <td className="px-6 py-3.5 font-bold text-slate-800 sticky left-0 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-150">
                      {row.divisiName}
                    </td>
                    {modules.map((modName) => {
                      const isVisible = row.visibility[modName] ?? true;
                      const isSaving = savingCell?.divId === row.divisiId && savingCell?.modName === modName;

                      return (
                        <td key={modName} className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center">
                            {isSaving ? (
                              <div className="w-4 h-4 border-2 border-gov-500/30 border-t-gov-600 rounded-full animate-spin"></div>
                            ) : (
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isVisible}
                                  onChange={() => handleToggle(row.divisiId, row.divisiName, modName, isVisible)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-550"></div>
                              </label>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};

export default ModuleVisibilityManagement;
